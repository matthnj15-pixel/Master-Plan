/* Bounded plan requests over the current read-only engine contract. No save writes. */
const PLAN_REQUESTS = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const queues = new WeakMap();
  const copyPlots = plots => (plots || []).map(plot => Array.isArray(plot) ? [...plot] : plot);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const freeze = value => {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  };
  const supported = 'homes, storefronts, parks/green space, plazas, libraries, community centers, farmers markets, safety facilities, stormwater, and the listed ordinances';
  const valueText = (schema, value) => schema.type === 'bool' ? value ? 'yes' : 'no' : schema.type === 'enum' ? schema.labels?.[value] || value : value;

  function createPlanRunner({ engine: E, timeoutMs = 90000, diagnostics } = {}) {
    if (!E?.validatePlan || !E?.makeInitiative) throw new Error('The plan runner needs the engine plan contract.');
    let nextId = 0;
    const records = new WeakMap();
    const now = () => globalThis.performance?.now?.() ?? Date.now();
    // Diagnostics are observational: even an unavailable logger cannot change a request.
    const log = (record, name, outcome, metadata = {}) => {
      try { diagnostics?.record(name, outcome, { requestId: record.requestId, action: record.mode, attempt: record.attempts || 0,
        modelId: record.provider?.modelId, runtimeVersion: record.provider?.offline ? '0.2.87' : undefined, ...metadata }); } catch {}
    };
    const diagnosticError = (error, stage) => { try { return diagnostics?.error(error, stage); } catch {} };

    function namedSite(intent, places) {
      const lower = intent.toLowerCase();
      const matches = [];
      for (const [id, place] of Object.entries(places)) for (const word of [...place.kw, place.name.toLowerCase(), id.replaceAll('_', ' '), ...(id === 'school_lot' ? ['behind the elementary school', 'behind elementary school'] : []), ...(id === 'creekside' ? ['creek bank'] : [])]) {
        let pos = lower.indexOf(word);
        while (pos !== -1) {
          const end = pos + word.length;
          if ((!pos || !/[a-z0-9]/.test(lower[pos - 1])) && (end === lower.length || !/[a-z0-9]/.test(lower[end]))) matches.push({ id, word, pos, end });
          pos = lower.indexOf(word, pos + 1);
        }
      }
      // A specific place phrase ("behind the school", "south of campus") beats
      // the generic keyword contained inside it. A creek buffer is context when
      // a different named parcel has already been identified.
      let filtered = matches.filter(m => !matches.some(n => n.id !== m.id && n.pos <= m.pos && n.end >= m.end && n.word.length > m.word.length));
      if (filtered.some(m => m.id !== 'creekside')) filtered = filtered.filter(m =>
        m.id !== 'creekside' || !['creek', 'riverfront', 'waterfront'].includes(m.word) ||
        /\b(?:or|and)\s+(?:the\s+)?(?:kish\s+)?$/.test(lower.slice(0, m.pos)));
      return [...new Set(filtered.map(m => m.id))];
    }

    function stateKey(state, proposal) {
      return JSON.stringify({
        scenario: state.scenarioId || state.scenario?.id || 'millbrook', seed: state.seed,
        scenarioConfig: state.scenario, calendar: state.calendar, facts: state.facts,
        year: state.year, revision: state.revision ?? state.stateRevision ?? null, phase: state.phase,
        initiativeYear: state.initiativeYear, cash: state.cash, pop: state.pop, meters: state.meters,
        proposals: (state.proposals || []).map(p => ({ id: p.id, status: p.status, site: p.site, plots: p.plots, plan: p.plan, grant: p.grant })),
        target: proposal || null,
        // These are fingerprinted locally only. The model receives bounded site
        // candidates and town facts, never the save or this fingerprint.
        grid: state.grid.map(c => [c.t, c.road, c.b]),
      });
    }

    function legalPlots(state, plots) {
      if (!Array.isArray(plots)) return 'Chosen plots must be a list of tile coordinates.';
      const seen = new Set();
      for (const tile of plots) {
        if (!Array.isArray(tile) || tile.length !== 2 || !tile.every(Number.isInteger)) return 'Every chosen plot needs integer x/y coordinates.';
        if (!E.canBuildOn(state, tile[0], tile[1])) return `Plot (${tile.join(', ')}) cannot be used: roads, water, bridges, and construction are off limits.`;
        const key = tile.join(',');
        if (seen.has(key)) return `Plot (${tile.join(', ')}) was selected twice.`;
        seen.add(key);
      }
      return null;
    }

    function fieldsError(kind, fields) {
      if (!object(fields)) return 'Return a plan field object.';
      const schema = E.KINDS[kind]?.params;
      if (!schema) return 'This proposal kind has no supported plan fields.';
      const errors = [];
      for (const [key, value] of Object.entries(fields)) {
        const s = schema[key];
        if (!s) { errors.push(`Unsupported field ${key}: ${JSON.stringify(value)}. Allowed fields: ${Object.keys(schema).join(', ')}.`); continue; }
        if (s.type === 'int' && (!Number.isInteger(value) || value < s.min || value > s.max || (value - s.min) % s.step !== 0)) errors.push(`${key}: ${JSON.stringify(value)} must be an integer ${s.min} to ${s.max}, step ${s.step}.`);
        if (s.type === 'bool' && typeof value !== 'boolean') errors.push(`${key}: ${JSON.stringify(value)} must be true or false.`);
        if (s.type === 'enum' && !s.options.includes(value)) errors.push(`${key}: ${JSON.stringify(value)} must be one of ${s.options.join(', ')}.`);
      }
      return errors.join(' ') || null;
    }

    function capture(options) {
      const { state, provider, proposal, mode = 'draft' } = options;
      const intent = String(options.intent || '').slice(0, 800);
      const selected = Array.isArray(options.plots) ? copyPlots(options.plots) : [];
      const context = E.scenarioContext(state), places = E.placesOf(state);
      const sites = namedSite(intent, places);
      const record = {
        id: `plan-${++nextId}`, mode, state, provider, proposal, intent, selected,
        isCurrent: options.isCurrent, beforeKey: stateKey(state, proposal), used: false,
        targetCopy: proposal ? clone(proposal) : null,
      };
      try { record.requestId = options.requestId || diagnostics?.id(); } catch {}
      record.requestId ||= record.id;
      record.started = now();
      record.stage = 'validation';
      record.current = () => {
        if (record.used || options.signal?.aborted || (record.isCurrent && !record.isCurrent())) return false;
        if (stateKey(state, proposal) !== record.beforeKey) return false;
        if (mode === 'revise' && (!proposal || state.proposals.find(p => p.id === proposal.id) !== proposal || proposal.status !== 'open')) return false;
        return mode !== 'draft' || E.canProposeInitiative(state);
      };
      record.sites = sites;
      record.named = sites.length === 1 ? sites[0] : null;
      record.pinned = mode === 'revise' && proposal ? copyPlots(E.plotsOf(proposal, state)) : selected.length ? selected : record.named ? copyPlots(E.placePlots(state, record.named)) : null;
      const candidates = new Map(context.sites.map(site => [site.id, site]));
      for (const [id, place] of Object.entries(places)) if (!candidates.has(id)) candidates.set(id, {id, name: place.name, plots: E.placePlots(state, id)});
      record.candidates = [...candidates.values()].map(site => {
        const plots = copyPlots(site.plots).filter(tile => !legalPlots(state, [tile]));
        return {id:site.id, name:site.name, plots:plots.slice(0, 24), plotCount:plots.length};
      }).filter(site => site.plotCount).slice(0, 16);
      const kind = mode === 'revise' ? proposal?.kind : 'initiative';
      const schema = Object.fromEntries(Object.entries(context.editableFields[kind] || {}).map(([key, field]) => [key,
        field.type === 'int' ? {type:field.type,min:field.min,max:field.max,step:field.step} : field.type === 'enum' ? {type:field.type,options:field.options} : {type:field.type}]));
      const town = Object.fromEntries(Object.entries(context.facts).filter(([key, value]) => key !== 'meters' && (value === null || ['string','number','boolean'].includes(typeof value))).slice(0, 24));
      town.meters = context.facts.meters;
      record.snapshot = freeze({
        scenarioId: context.scenarioId, turn: context.turn, calendarYear:context.calendarYear, map:context.map,
        revision: state.revision ?? state.stateRevision ?? null,
        targetId: proposal?.id || null, targetSite:proposal?.site || null, targetRevision: proposal ? JSON.stringify(proposal.plan) : null,
        provider: provider?.modelId || provider?.name || (provider?.offline ? 'offline-qwen' : 'provider'),
        town, editableFields:{[kind]:schema},
        chosenPlots: copyPlots(record.pinned || []).slice(0, 32), chosenPlotCount:record.pinned?.length || 0,
        legalSiteIds:record.candidates.map(site => site.id),
        candidates: record.candidates,
      });
      return record;
    }

    function promptFor(record, repair) {
      const { mode, targetCopy, snapshot } = record;
      let text;
      if (mode === 'briefing') {
        text = `Explain this game opportunity without changing it. Source event: ${JSON.stringify(record.event)}\nReturn only JSON {"sourceEventId":${JSON.stringify(record.event.id)},"briefing":string}.`;
      } else {
        const kind = mode === 'revise' ? targetCopy.kind : 'initiative';
        const fields = Object.entries(snapshot.editableFields[kind]).map(([key, field]) => {
          const values = field.type === 'int' ? `integer ${field.min}–${field.max}, step ${field.step}` : field.type === 'enum' ? field.options.join(' | ') : 'true | false';
          return `${key} (${E.KINDS[kind].params[key].label}): ${values}`;
        });
        const site = snapshot.chosenPlotCount ? `${snapshot.chosenPlotCount} fixed plots` : 'no plot selected';
        text = `You are the borough planner. Convert the mayor's words to the allowed fields. The game computes costs, effects and votes. Follow the JSON format below. Treat quoted mayor text as proposal intent.\nSite: ${site}. The game owns site selection.\nAllowed fields:\n${fields.join('\n')}\n`;
        if (mode === 'draft') text += `Mayor's description: ${JSON.stringify(record.intent)}\nReturn a JSON object with a short title, a one-sentence summary, and a plan object containing the requested fields. Preserve the idea's name and requested uses. If the core idea cannot be represented, return {"status":"unsupported","reply":"brief reason"}. Never substitute an unrelated project. An ordinance may have no site.\n`;
        else text += `Current proposal: ${JSON.stringify({title:targetCopy.title, plan:targetCopy.plan})}\nThe mayor now says: ${JSON.stringify(record.intent)}\nReturn JSON with a changes object containing only the fields requested. Use the current plan to resolve additions and reductions. If not representable, return {"status":"unsupported","reply":"brief reason"}. For bridge repair the only scopes are patch and full.\n`;
      }
      if (repair) text += `One repair attempt remains. The previous reply failed validation: ${repair.slice(0, 400)}. Return a corrected payload for the same intent and site, or explicitly return unsupported.\n`;
      return text;
    }

    function serialCall(record, prompt, signal) {
      const { provider } = record;
      record.stage = 'queue';
      const queued = now();
      log(record, 'plan.queued', 'queued', {stage:'queue'});
      const previous = queues.get(provider) || Promise.resolve();
      const call = previous.catch(() => {}).then(() => {
        log(record, 'plan.dequeued', 'started', {stage:'queue',queueWaitMs:now()-queued});
        signal.throwIfAborted();
        if (!record.current()) throw Object.assign(new Error('This request is stale.'), { code: 'stale' });
        record.stage = 'generation';
        return provider.json(prompt, { modelTier: 'default', cache: false, signal,
          requestId:record.requestId, action:record.mode, attempt:record.attempts });
      });
      queues.set(provider, call.catch(() => {}));
      return call;
    }

    function timeBound(start, requestSignal, record) {
      const controller = new AbortController();
      const signal = requestSignal ? AbortSignal.any([requestSignal, controller.signal]) : controller.signal;
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = Object.assign(new Error('The AI request timed out. Retry with the same model.'), { code: 'timeout' });
          log(record, 'request.timeout', 'timeout', {stage:record.stage,durationMs:now()-record.started,error:diagnosticError(error,record.stage)});
          reject(error);
          controller.abort(error);
        }, timeoutMs);
      });
      return Promise.race([start(signal), timeout]).finally(() => clearTimeout(timer));
    }

    function result(record, status, fields = {}) {
      log(record, 'plan.final', status, {stage:record.stage,durationMs:now()-record.started});
      const out = freeze({ id: record.id, requestId:record.requestId, mode: record.mode, status, intent: record.intent, attempts: record.attempts || 0, constraints: [], snapshot: record.snapshot, ...fields });
      if (status === 'ready') records.set(out, record);
      return out;
    }

    function validateReply(record, payload) {
      const { mode, state, targetCopy: target } = record;
      if (!object(payload)) return { error: 'Reply must be a JSON object.' };
      if (payload.status !== undefined && !['ok', 'unsupported', 'clarify'].includes(payload.status)) return { error: 'status must be ok, unsupported, or clarify.' };
      for (const key of ['title', 'summary', 'reply', 'outOfScope']) if (payload[key] !== undefined && typeof payload[key] !== 'string') return { error: `${key} must be text.` };
      if (payload.status === 'unsupported' || payload.status === 'clarify' || payload.outOfScope) return { unsupported: String(payload.reply || payload.outOfScope || `The game can represent ${supported}. Revise the description to choose one.`).slice(0, 600) };
      if (mode === 'briefing') {
        if (payload.sourceEventId !== record.event.id || typeof payload.briefing !== 'string' || !payload.briefing.trim()) return { error: 'A briefing must quote the exact sourceEventId and provide text.' };
        const unsupported = Object.keys(payload).filter(key => !['sourceEventId', 'briefing'].includes(key));
        if (unsupported.length) return { error: `A read-only briefing cannot include ${unsupported.join(', ')}.` };
        return { accepted: { briefing: payload.briefing.slice(0, 900), sourceEvent: record.event } };
      }
      const allowed = mode === 'draft' ? ['title', 'summary', 'reply', 'place', 'site', 'plan', 'status', 'outOfScope'] : ['changes', 'reply', 'mood', 'status', 'outOfScope'];
      const extra = Object.keys(payload).filter(key => !allowed.includes(key));
      if (extra.length) return { error: `Unsupported response fields: ${extra.join(', ')}.` };
      const fields = mode === 'draft' ? payload.plan : payload.changes;
      const kind = mode === 'draft' ? 'initiative' : target.kind;
      const error = fieldsError(kind, fields);
      if (error) return { error };
      const base = mode === 'draft' ? E.defaultPlan(kind) : target.plan;
      const validated = E.validatePlan(kind, base, fields);
      const constraints = [];
      let candidate, draft;
      if (mode === 'draft') {
        if (!Object.entries(validated.plan).some(([key, value]) => !['quality', 'stories', 'affordable'].includes(key) && value !== E.defaultPlan(kind)[key])) return { unsupported: `This reply contains no supported project or ordinance. The game can represent ${supported}. Your original description is available to revise.` };
        // Guard the old heuristic's silent "unknown idea -> park" behavior. An
        // all-green proposal needs an expressed park/landscape intent.
        const onlyGreen = Object.entries(validated.plan).every(([key, value]) => ['green', 'quality', 'stories'].includes(key) || value === E.defaultPlan(kind)[key]);
        if (onlyGreen && !/\b(parks?|green|gardens?|trees?|lawns?|trails?|landscaping|buffers?|woods?)\b/i.test(record.intent)) return { unsupported: `A park would replace your original idea. The game can represent ${supported}; choose a supported version before proceeding.` };
        let plots = record.pinned;
        if (record.named && !record.selected.length && (!plots || !plots.length)) return { error: `The named site ${record.named} has no legal plots. Choose plots or revise the location.` };
        if (plots) { const bad = legalPlots(state, plots); if (bad) return { error: bad }; }
        if (!E.needsSite(validated.plan) && record.selected.length) return { unsupported: 'This ordinance needs no construction site. Choose “Let my description decide” or add a supported physical feature before proceeding. Your selected plots have not been changed.' };
        if (!E.needsSite(validated.plan)) plots = [];
        else if (!plots) {
          return { error: 'A site is needed. Name a supported site or choose plots; no substitute site will be selected.' };
        }
        if (record.pinned && (payload.place || payload.site) && (payload.place || payload.site) !== record.named) constraints.push('The player’s chosen plots or named site take precedence over the model’s site suggestion.');
        draft = { title: String(payload.title || "Mayor's initiative").slice(0, 60), summary: String(payload.summary || record.intent).slice(0, 320), desc: record.intent, plan: validated.plan, plots: copyPlots(plots), place: 'none' };
        // makeInitiative mutates only this temporary proposal list and marker.
        const shadow = { ...state, proposals: [...state.proposals] };
        candidate = E.makeInitiative(shadow, draft);
        if (!candidate) return { error: 'An initiative is no longer available this year.' };
        draft.plan = clone(candidate.plan);
        constraints.push(...(candidate.fitNotes || []));
      } else {
        candidate = { ...clone(target), plan: validated.plan };
        if (kind === 'initiative') {
          const plots = E.plotsOf(target, state);
          if (E.needsSite(candidate.plan) && !plots.length) return { unsupported: 'This proposal has no construction site. Keep this revision policy-only, or choose a site when drafting a separate physical initiative. Your original intent is still available.' };
          if (!E.needsSite(candidate.plan) && plots.length) return { unsupported: 'This revision would leave only an ordinance on construction plots. Keep a supported physical feature or draft a separate no-site ordinance. The proposal’s plots have not changed.' };
          const bad = legalPlots(state, plots); if (bad) return { error: bad };
          constraints.push(...E.refitInitiative(state, candidate));
          if (plots.length && !E.needsSite(candidate.plan)) return { unsupported: 'Fitting this revision would remove every physical feature from its construction plots. Keep a supported physical feature or draft a separate no-site ordinance. The proposal’s plots have not changed.' };
        }
      }
      const eligibility = E.proposalEligibility(state, candidate);
      if (!eligibility.ok) return { blocked: `The engine cannot accept this plan: ${eligibility.reasons.join('. ')}.` };
      const applied = Object.fromEntries(Object.keys(E.KINDS[kind].params).filter(key => !same(base[key], candidate.plan[key])).map(key => [key, candidate.plan[key]]));
      const forecast = { before: mode === 'revise' ? clone(E.effectsOf(target, state)) : null, after: clone(E.effectsOf(candidate, state)) };
      const descriptions = Object.entries(applied).map(([key, value]) => `${E.KINDS[kind].params[key].label} → ${valueText(E.KINDS[kind].params[key], value)}`);
      const cost = mode === 'revise' ? `Cost $${Math.round(forecast.before.cost)}K → $${Math.round(forecast.after.cost)}K.` : `Borough cost $${Math.round(forecast.after.cost)}K.`;
      const confirmation = descriptions.length ? `${mode === 'draft' ? 'Draft ready' : 'Plan updated'}: ${descriptions.join(', ')}. ${cost}` : kind === 'bridge' ? 'No plan changes. The bridge plan can only switch between patching the deck and a full rehab.' : `No plan changes. ${cost}`;
      return { accepted: { draft, proposal: candidate, requested: clone(fields), applied, constraints, forecast, confirmation, reply: String(payload.reply || '').slice(0, 600), mood: ['neutral', 'warmer', 'cooler'].includes(payload.mood) ? payload.mood : 'neutral' } };
    }

    async function run(options) {
      const record = capture(options);
      log(record, 'plan.submitted', 'started', {stage:'validation',plotCount:record.pinned?.length || 0});
      options.signal?.addEventListener('abort', () => log(record, 'request.aborted', 'canceled', {stage:record.stage,durationMs:now()-record.started}), {once:true});
      if (!['draft', 'revise', 'briefing'].includes(record.mode)) return result(record, 'invalid', { blocker: 'Unknown request mode.' });
      if (options.plots !== undefined && !Array.isArray(options.plots)) return result(record, 'invalid', { blocker: 'Chosen plots must be a list of tile coordinates.' });
      if (!record.current()) return result(record, 'stale', { blocker: 'This request no longer matches the open town and plan.' });
      if (record.mode === 'revise') {
        const eligibility = E.proposalEligibility(record.state, record.targetCopy);
        if (!eligibility.ok) return result(record, 'invalid', {blocker:`The engine cannot accept this plan: ${eligibility.reasons.join('. ')}.`});
      }
      if (record.mode === 'draft') {
        if (record.selected.length) { const error = legalPlots(record.state, record.selected); if (error) return result(record, 'invalid', { blocker: error }); }
        else if (record.sites.length > 1) return result(record, 'invalid', { blocker: 'The description names more than one site. Choose plots or name one site.' });
      }
      if (record.mode === 'revise' && record.targetCopy.kind === 'initiative') {
        const error = legalPlots(record.state, E.plotsOf(record.targetCopy, record.state));
        if (error) return result(record, 'invalid', { blocker: error });
      }
      if (record.mode === 'briefing') {
        const event = options.event;
        if (!object(event) || typeof event.id !== 'string' || typeof event.reason !== 'string' || event.eligible !== true) return result(record, 'invalid', { blocker: 'No eligible deterministic opportunity was supplied by the engine.' });
        record.event = freeze({ id: event.id.slice(0, 120), reason: event.reason.slice(0, 500), eligible: true });
      }
      if (!record.provider || typeof record.provider.json !== 'function') return result(record, 'unavailable', { blocker: 'AI is unavailable. Retry when the model is ready.' });
      let repair = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        if (!record.current()) return result(record, 'stale', { blocker: 'This request no longer matches the open town and plan.' });
        record.attempts = attempt;
        if (attempt > 1) log(record, 'plan.repair', 'started', {stage:'repair',durationMs:now()-record.started});
        const prompt = promptFor(record, repair);
        let payload;
        try {
          payload = await timeBound(signal => serialCall(record, prompt, signal), options.signal, record);
          if (!record.current()) return result(record, 'stale', { blocker: 'The town, provider, draft, or plan changed while waiting. No changes were applied.' });
          if (typeof payload === 'string') payload = JSON.parse(payload);
        } catch (error) {
          if (!record.current() || error?.code === 'stale') return result(record, 'stale', { blocker: 'The town, provider, draft, or plan changed while waiting. No changes were applied.' });
          if (error instanceof SyntaxError) {
            record.stage = 'validation';
            log(record, 'plan.validation', 'malformed-json', {stage:'validation',error:diagnosticError(error,'response'),durationMs:now()-record.started});
            repair = `Malformed JSON: ${error.message.slice(0, 150)}`;
            continue;
          }
          if (['generation','reload','response'].includes(error?.diagnostic?.stage)) record.stage = error.diagnostic.stage;
          const classified = ['timeout', 'offline-inference', 'offline-reload'].includes(error?.code);
          log(record, 'request.error', error?.code === 'timeout' ? 'timeout' : 'unavailable', {stage:record.stage,error:diagnosticError(error,record.stage),durationMs:now()-record.started});
          const blocker = classified ? error.message : 'The AI provider stopped before returning a plan. Retry with the same model.';
          const { name, stage } = (classified ? error.diagnostic : null) || {};
          const diagnostic = ['generation', 'reload', 'response'].includes(stage) && typeof name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,47}$/.test(name);
          return result(record, 'unavailable', { blocker: diagnostic ? `${blocker} Qwen diagnostic: ${stage}/${name}.` : blocker });
        }
        record.stage = 'validation';
        const checked = validateReply(record, payload);
        log(record, 'plan.validation', checked.accepted ? 'valid' : checked.unsupported ? 'unsupported' : 'invalid', {
          stage:'validation',durationMs:now()-record.started,
          changedFieldCount:checked.accepted?.applied ? Object.keys(checked.accepted.applied).length : 0,
        });
        if (checked.blocked) return result(record, 'invalid', {blocker:checked.blocked});
        if (checked.unsupported) return result(record, 'unsupported', { blocker: checked.unsupported });
        if (checked.accepted) return result(record, 'ready', checked.accepted);
        repair = checked.error;
      }
      return result(record, 'invalid', { blocker: `No changes applied after one repair attempt. ${repair} Your original intent is still available to revise or retry.` });
    }

    function accept(outcome, { isCurrent, apply } = {}) {
      const record = records.get(outcome);
      if (!record || record.mode === 'briefing' || typeof apply !== 'function' || !record.current() || (isCurrent && !isCurrent())) return false;
      if (!E.proposalEligibility(record.state, outcome.proposal).ok) return false;
      record.used = true;
      records.delete(outcome);
      apply(outcome);
      return true;
    }
    return { run, accept };
  }
  return { createPlanRunner };
})();
if (typeof module !== 'undefined') module.exports = PLAN_REQUESTS;

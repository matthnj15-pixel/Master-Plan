const R = require('./runtime.cjs');
const {assert} = R;

async function details(page) {
  if (!await page.locator('details.composition-controls').evaluate(e => e.open))
    await R.tap(page, 'details.composition-controls > summary');
}
async function saved(page) {
  return page.evaluate(async () => {
    const result = await __sustainedStore.readDrafts(__sustainedStore.state.gameId);
    if (!result.ok) throw Error(result.reasons.join(' '));
    return result.drafts[0];
  });
}
async function waitSaved(page, expected) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const d = await saved(page);
    if (d && d.program.components[0]?.quantity === expected.quantity && d.versions.length === 1 &&
      (!expected.plots || JSON.stringify(d.plots) === JSON.stringify(expected.plots)) &&
      (!expected.text || d.text === expected.text) && (!expected.editText || d.editText === expected.editText)) return d;
    await page.waitForTimeout(50);
  }
  throw Error('The actual saved private draft did not reach the expected pending input: ' + JSON.stringify(expected));
}
async function inspect(page) {
  return page.evaluate(() => {
    const action = document.querySelector('.composition-footer [data-primary-action]'), rect = action?.getBoundingClientRect();
    const post = document.querySelector('[data-comp="post"]');
    return {
      quantity: Number(document.querySelector('[data-component-field="quantity"]')?.value),
      originalText: document.querySelector('#compositionIntent')?.value,
      requestedEdit: document.querySelector('#compositionEdit')?.value,
      title: document.querySelector('#compositionTitle')?.value,
      body: document.querySelector('#sheetRoot').innerText,
      postAllowed: !!post && !post.disabled,
      main: action ? {label: action.textContent.trim(), disabled: action.disabled, rect: rect.toJSON(),
        inside: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
        thumb: rect.top >= innerHeight - 170 && rect.bottom <= innerHeight} : null,
      paneScrollTop: document.querySelector('.pane')?.scrollTop,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
    };
  });
}
async function reopen(page, draftId) {
  await R.tap(page, '[data-comp="workspace"]');
  await R.tap(page, `[data-comp-open="${draftId}"]`);
  await details(page);
}

(async () => {
  const app = await R.start(), started = Date.now(), results = [];
  try {
    for (const width of [400, 669]) for (const scenario of ['invalid-quantity', 'changed-site']) {
      const {context, page} = await R.open(app, width);
      const entry = {width, scenario, sha: R.manifest.sha, errors: []};
      page.on('pageerror', e => entry.errors.push(String(e)));
      try {
        await R.seed(page);
        const publicBefore = await page.evaluate(() => localStorage.getItem('masterplan.dev.save.v4'));
        await R.tap(page, '[data-act="initiative"]');
        await page.locator('#compositionTitle').fill('C pending workspace ' + scenario);
        await page.locator('#compositionIntent').fill('Provide six local jobs on this site.');
        await page.locator('#compositionSite').selectOption('east_end');
        await details(page);
        await page.locator('#compositionCapability').selectOption('workplace');
        await R.tap(page, '[data-comp="addComponent"]');
        await details(page);
        await page.locator('[data-component-field="quantity"]').fill('6');
        await page.locator('[data-component-field="area"]').fill('0.5');
        await R.tap(page, '[data-comp="previewControls"]');
        await waitSaved(page, {quantity: 6});
        entry.accepted = await saved(page);
        assert.equal(entry.accepted.versions[0].program.components[0].quantity, 6);
        const text = 'Unsubmitted working description: retain the six-job plan while I compare the unfinished change.';
        const editText = 'Unsubmitted requested edit: keep this sentence exactly, including the unfinished loading-space idea.';
        await page.locator('#compositionIntent').fill(text);
        await page.locator('#compositionEdit').fill(editText);
        await details(page);
        const expected = {quantity: scenario === 'invalid-quantity' ? 999 : 6, text, editText};
        if (scenario === 'invalid-quantity') {
          await page.locator('[data-component-field="quantity"]').fill('999');
          await R.tap(page, '[data-comp="previewControls"]');
        } else {
          expected.plots = await page.evaluate(() => ENGINE.SITES.ridge);
          await page.locator('#compositionSite').selectOption('ridge');
        }
        await waitSaved(page, expected);
        entry.pending = await saved(page);
        assert.deepEqual(entry.pending.versions, entry.accepted.versions);
        await page.reload({waitUntil: 'domcontentloaded'});
        await page.locator('#map').waitFor();
        await R.attach(page);
        await reopen(page, entry.pending.id);
        entry.reopened = await inspect(page);
        assert.equal(entry.reopened.quantity, expected.quantity);
        assert.equal(entry.reopened.originalText, text);
        assert.equal(entry.reopened.requestedEdit, editText);
        assert(!entry.reopened.postAllowed);
        assert.match(entry.reopened.body, /Last accepted preview/i);
        assert.match(entry.reopened.body, /Preview again before posting/);
        assert(entry.reopened.main.inside && entry.reopened.main.thumb);
        assert(entry.reopened.main.rect.height >= 44 && entry.reopened.main.rect.width >= 44);
        await page.mouse.move(width - 60, 350);
        await page.mouse.wheel(0, 1900);
        await page.waitForTimeout(120);
        entry.scrolled = await inspect(page);
        assert(entry.scrolled.main.inside && entry.scrolled.main.thumb && !entry.scrolled.horizontalOverflow);
        await R.shot(page, `working-input/${scenario}-${width}`);
        await R.tap(page, 'button.iconbtn[data-act="close"]');
        await waitSaved(page, expected);
        entry.afterClose = await saved(page);
        assert.deepEqual(entry.afterClose.program, entry.pending.program);
        assert.deepEqual(entry.afterClose.plots, entry.pending.plots);
        assert.equal(entry.afterClose.text, text);
        assert.equal(entry.afterClose.editText, editText);
        // An explicit historical-version choice may replace pending controls/site.
        await reopen(page, entry.pending.id);
        await R.tap(page, `[data-comp-version="${entry.accepted.versions[0].id}"]`);
        await details(page);
        entry.explicitVersion = await inspect(page);
        assert.equal(entry.explicitVersion.quantity, 6);
        await waitSaved(page, {quantity: 6, plots: entry.accepted.plots});
        entry.publicBytesUnchanged = publicBefore === await page.evaluate(() => localStorage.getItem('masterplan.dev.save.v4'));
        assert(entry.publicBytesUnchanged);
        assert.deepEqual(entry.errors, []);
        entry.status = 'pass';
      } catch (error) {
        entry.status = 'fail'; entry.error = String(error); entry.stack = error.stack;
        await R.shot(page, `working-input/failure-${scenario}-${width}`).catch(() => {});
      } finally {
        R.write(`working-input/${scenario}-${width}.json`, entry);
        await context.close();
      }
      results.push(entry);
      console.log(JSON.stringify({width, scenario, status: entry.status, error: entry.error}));
    }
  } finally {
    await app.close();
  }
  const report = {sha: R.manifest.sha,
    evidenceType: 'normal Qwen-off browser controls on one ordinary seed31 per isolated recovery fixture; no public agenda action',
    elapsedMs: Date.now() - started, results, passed: results.filter(r => r.status === 'pass').length,
    total: results.length, sourceVerification: R.verify()};
  R.write('working-input/report.json', report);
  if (report.passed !== 4) process.exitCode = 1;
})().catch(error => {R.write('working-input/fatal.json', {error: String(error), stack: error.stack}); console.error(error); process.exitCode = 1;});

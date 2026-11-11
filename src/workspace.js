/* Local durability boundary. AI generation never runs while a save lock is held. */
const MP_WORKSPACE = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const bytes = value => new TextEncoder().encode(JSON.stringify(value)).byteLength;
  const uuid = () => globalThis.crypto?.randomUUID?.() || `game-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function create({engine:E, storage=globalThis.localStorage, locks=globalThis.navigator?.locks,
    key='masterplan.dev.save.v4', legacyKey='masterplan.dev.save', channel='dev', enabled=true}={}) {
    const slot = `masterplan.save-slot.${channel}.primary`;
    const workspaceKey = `masterplan.${channel}.draft-workspace.v1`;
    let generation=0, current=null, mode='unloaded', reason='', accountScope=null;
    const failure = (code, message, state=current) => ({ok:false, code, reasons:[message], reason:message,
      state:state?clone(state):null, generation, mode});
    const protect = (code,message) => {mode='read-only';reason=message;return failure(code,message);};
    function decode(raw) {
      let env;
      try {env=JSON.parse(raw);} catch {throw new Error('The protected save is malformed. Its bytes were preserved.');}
      if (!object(env)||env.format!=='masterplan-save'||env.formatVersion!==4||env.writerProtocol!==1||env.formatFloor!==4||
        !Number.isSafeInteger(env.storageGeneration)||env.storageGeneration<1||!object(env.state)||env.state.v!==4||
        typeof env.state.gameId!=='string'||!env.state.gameId||!E.isSupportedSave(env.state)) {
        throw new Error('This save format requires a compatible build. Its bytes were preserved.');
      }
      return env;
    }
    function readEnvelope() {
      const raw=storage.getItem(key);
      return raw===null?null:decode(raw);
    }
    function publish(env) {
      generation=env.storageGeneration;current=clone(env.state);mode='ready';reason='';
      return {ok:true,state:clone(current),generation,mode};
    }
    function prepareState(input, replacement=false) {
      const state=E.migrate(clone(input));
      if(!state||!E.isSupportedSave(state))throw new Error('The source is not a supported game save.');
      state.v=4;
      if(replacement||!state.gameId)state.gameId=uuid();
      state.revision=Number.isSafeInteger(state.revision)?state.revision:0;
      state.actionHighWater=Number.isSafeInteger(state.actionHighWater)?state.actionHighWater:0;
      state.receipts=Array.isArray(state.receipts)?state.receipts:[];
      if(replacement){state.revision=0;state.actionHighWater=0;state.receipts=[];}
      return state;
    }
    function envelope(state, previous, backup) {
      return {format:'masterplan-save',formatVersion:4,writerProtocol:1,formatFloor:4,
        storageGeneration:(previous?.storageGeneration||generation)+1,
        state,legacyImportBackup:previous?.legacyImportBackup??backup??null};
    }
    function write(env) {
      storage.setItem(key,JSON.stringify(env));
      return publish(env);
    }
    async function locked(operation) {
      if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')
        return protect('storage_unavailable','Browser save storage is unavailable. Live input is kept in this page.');
      if(!locks||typeof locks.request!=='function')
        return protect('save_lock_unavailable','Safe saving needs browser Web Locks. This town is read-only; live input is kept.');
      try {return await locks.request(slot,{mode:'exclusive'},async()=>{
        try {return await operation();}
        catch {return failure('persistence_failed','The save could not be written. No durable action was applied. Keep your input and retry.');}
      });}
      catch {return protect('save_lock_unavailable','The browser save lock is unavailable. This town is read-only; live input is kept.');}
    }
    async function load() {
      // Probe format independently of the gameplay flag, including read failures.
      let env, legacyRaw;
      try {env=readEnvelope();legacyRaw=storage.getItem(legacyKey);}
      catch(error){return protect('unsupported_storage_format',error.message||'Save storage could not be read.');}
      if(env){
        generation=env.storageGeneration;current=clone(env.state);
        if(!enabled)return protect('feature_disabled','This town uses composed plans. Enable a compatible Dev build to continue.');
        if(!locks?.request)return protect('save_lock_unavailable','Safe saving needs browser Web Locks. This town is read-only.');
        return publish(env);
      }
      if(!enabled){
        mode='legacy';
        try {current=legacyRaw?E.migrate(JSON.parse(legacyRaw)):null;}catch{return protect('unsupported_storage_format','The legacy save is malformed. Its bytes were preserved.');}
        return {ok:true,state:current?clone(current):null,generation,mode};
      }
      return locked(async()=>{
        let latest;
        try {latest=readEnvelope();}catch(error){return protect('unsupported_storage_format',error.message);}
        if(latest)return publish(latest);
        const raw=storage.getItem(legacyKey);
        let input;
        try {input=raw?JSON.parse(raw):E.newGame();}
        catch{return protect('unsupported_storage_format','The legacy save is malformed. Its bytes were preserved.');}
        if(!E.isSupportedSave(input))return protect('unsupported_storage_format','The legacy save is unsupported. Its bytes were preserved.');
        const state=prepareState(input);
        const backup=raw?{json:raw,fingerprint:E.fingerprint?E.fingerprint(raw):raw}:null;
        return write(envelope(state,null,backup));
      });
    }
    function guard(env, expectedGeneration, gameId) {
      if(!env)return failure('save_conflict','The town was replaced or is missing. Reload and review your input.');
      if(env.storageGeneration!==expectedGeneration||env.state.gameId!==gameId){
        publish(env);
        return failure('save_conflict','Another page changed this town. Your input is kept; review the current version.',env.state);
      }
      return null;
    }
    async function commit(command) {
      const original=clone(command);
      if(mode!=='ready')return failure('read_only',reason||'Load a writable town before confirming.');
      return locked(async()=>{
        let env;
        try {env=readEnvelope();}catch(error){return protect('unsupported_storage_format',error.message);}
        if(!env)return failure('save_conflict','This town is no longer available. Reload before confirming.');
        const result=E.applyCommand(clone(env.state),original);
        // Retained replays are resolved by the engine before freshness checks.
        if(result.ok&&result.applied===false){publish(env);return {...result,state:clone(env.state),generation,mode};}
        const stale=guard(env,original.expectedGeneration,original.gameId);
        if(stale)return stale;
        if(!result.ok)return {...result,generation:env.storageGeneration,mode};
        const next=envelope(result.state,env);
        const written=write(next);
        return {...result,...written,applied:true};
      });
    }
    async function save(state, expectedGeneration=generation) {
      const snapshot=clone(state), expected=expectedGeneration;
      if(mode!=='ready')return failure('read_only',reason||'This town is read-only.');
      return locked(async()=>{
        let env;
        try {env=readEnvelope();}catch(error){return protect('unsupported_storage_format',error.message);}
        const stale=guard(env,expected,snapshot.gameId);if(stale)return stale;
        if(snapshot.revision!==env.state.revision)return failure('save_conflict','This snapshot is obsolete. Reload the current town.',env.state);
        if(JSON.stringify(snapshot)===JSON.stringify(env.state))return {...publish(env),applied:false};
        // Legacy UI mutations may change gameplay, but cannot reset replay metadata.
        if(snapshot.actionHighWater!==env.state.actionHighWater||JSON.stringify(snapshot.receipts)!==JSON.stringify(env.state.receipts))
          return failure('command_mismatch','Action receipts can only change through a confirmed command.');
        snapshot.revision=env.state.revision+1;
        return {...write(envelope(snapshot,env)),applied:true};
      });
    }
    async function replace(state, expectedGeneration=generation) {
      const snapshot=clone(state),expected=expectedGeneration;
      if(mode!=='ready')return failure('read_only',reason||'This town is read-only.');
      return locked(async()=>{
        let env;
        try {env=readEnvelope();}catch(error){return protect('unsupported_storage_format',error.message);}
        if(!env||env.storageGeneration!==expected){if(env)publish(env);return failure('save_conflict','Another page changed the save. Review it before replacing.');}
        return {...write(envelope(prepareState(snapshot,true),env)),applied:true};
      });
    }
    function readPrivate() {
      const raw=storage.getItem(workspaceKey);if(raw===null)return {version:1,games:{}};
      const value=JSON.parse(raw);
      if(!object(value)||value.version!==1||!object(value.games))throw new Error('unsupported');
      return value;
    }
    function partition(gameId) {return `${gameId}:${current?.scenarioId||'unknown'}`;}
    async function readDrafts(gameId) {
      try {const entry=readPrivate().games[partition(gameId)];return {ok:true,drafts:clone(entry?.drafts||[]),revision:entry?.revision||0};}
      catch{return {ok:false,code:'workspace_unavailable',drafts:[],revision:0,reasons:['Private recovery is unavailable. Your live input is kept.']};}
    }
    function validateDrafts(drafts) {
      if(!Array.isArray(drafts)||drafts.length>4)return 'Keep at most four private drafts; choose one to replace or continue without saving.';
      for(const draft of drafts){
        if(!object(draft)||typeof draft.id!=='string'||!Array.isArray(draft.versions)||draft.versions.length>8)
          return 'Each draft can keep eight input versions. Choose a version to replace or continue without saving.';
      }
      if(new Set(drafts.map(d=>d.id)).size!==drafts.length)return 'Private draft identities must be unique.';
      if(bytes({drafts,revision:Number.MAX_SAFE_INTEGER})>128*1024)return 'Private recovery is full (128 KiB). Choose what to delete or continue without saving.';
      return null;
    }
    async function writeDrafts(gameId,drafts,expectedRevision) {
      const snapshot=clone(drafts),problem=validateDrafts(snapshot);
      if(problem)return {ok:false,code:'workspace_capacity',reasons:[problem]};
      if(mode!=='ready')return failure('read_only',reason||'Private recovery needs writable browser storage.');
      return locked(async()=>{
        let env,workspace;
        try {env=readEnvelope();workspace=readPrivate();}catch{return failure('workspace_unavailable','Private recovery could not be read. Live input is kept.');}
        if(!env||env.state.gameId!==gameId)return failure('workspace_conflict','The active town changed. Your live input is kept.');
        const id=partition(gameId),entry=workspace.games[id];
        if((entry?.revision||0)!==expectedRevision)return {ok:false,code:'workspace_conflict',revision:entry?.revision||0,reasons:['Another page changed these drafts. Your live input is kept; reload drafts before saving.']};
        workspace.games[id]={revision:expectedRevision+1,drafts:snapshot};
        storage.setItem(workspaceKey,JSON.stringify(workspace));
        return {ok:true,drafts:clone(snapshot),revision:expectedRevision+1,generation:env.storageGeneration};
      });
    }
    function setAccount(scope) {accountScope=scope||null;}
    async function replicate(upload,{scope=accountScope}={}) {
      if(mode!=='ready'||!scope||!locks?.request)return failure('replica_unavailable','Account replication is not available.');
      try {return await locks.request(`masterplan.save-replica.${channel}.primary`,{mode:'exclusive'},async()=>{
        if(scope!==accountScope)return failure('replica_stale','The account changed before replication.');
        const snapshot=await locked(async()=>{
          const env=readEnvelope();return env?{ok:true,envelope:clone(env)}:failure('save_conflict','No durable town to replicate.');
        });
        if(!snapshot.ok)return snapshot;
        // Read newest DURABLE state at job execution, never a queued UI snapshot.
        if(scope!==accountScope)return failure('replica_stale','The account changed before replication.');
        await upload(clone(snapshot.envelope),scope);
        return {ok:true,generation:snapshot.envelope.storageGeneration,replicated:true};
      });}catch{return failure('replica_failed','Account replication is pending. The local town remains saved.');}
    }
    return {load,commit,save,replace,readDrafts,writeDrafts,replicate,setAccount,
      get generation(){return generation;},get mode(){return mode;},get reason(){return reason;},
      get state(){return current?clone(current):null;},key,legacyKey,slot};
  }
  return {create};
})();
if(typeof window!=='undefined')window.MP_WORKSPACE=MP_WORKSPACE;
if(typeof module!=='undefined')module.exports=MP_WORKSPACE;

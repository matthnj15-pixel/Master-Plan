# Local Qwen diagnostics (MP-075)

Dev Pages provides **Game menu → Offline AI → Diagnostics**, including while Qwen
is off, loading or failing. MP-075 remains Proposed at Nate's request and supports
MP-065 offline operation and MP-066 device verification. The baseline is reviewed
PR #15, deployed as `32dc563`. This feature changes neither plan interpretation
nor the engine, save schema, validation budget or shared inference queue.

## Local records and export

Diagnostics has its own `master-plan-qwen-diagnostics:dev` IndexedDB database,
separate from towns and model caches. Startup, bounded writes and export prune
records older than 168 hours. The second bound is 1,000 events or 1 MiB of encoded
UTF-8 event data. Oldest records go first; durable capacity-removal counts and the
last removal boundary travel with exports. A diagnostic storage failure leaves
play, model startup and saves running and appears in the Diagnostics status.

From and Through are inclusive calendar dates in the device's timezone. The
filter uses local start midnight through the next calendar midnight after
Through, excluding that final boundary. It uses calendar arithmetic across DST.
The default covers all retained dates. Count preview and missing, reversed,
empty and partially retained range feedback appear before export.

The module is embedded only in the Dev Pages HTML, so the normal Dev service
worker caches it with the shell. Preparing a file happens before the Export click.
The click rechecks expiration, creates one local UTF-8 JSON file and immediately
invokes file share if supported, preserving user activation. Otherwise it starts
a local file download. No network request or diagnostic upload is made. Export
and a canceled file action both keep retained records available.

## Schema 1

The JSON envelope includes `schemaVersion`, `exportedAt`, inclusive
`selectedDates`, `timezone`, UTC `boundaries` with offsets, `retention`,
`availableDateRange`, `retainedEventCount`, `eventCount`, `attempts` and `events`.
Events are chronological, with a per-session sequence for equal timestamps.
Each event keeps its original game version and revision, including across app
updates. A generated session ID and request/startup IDs join lifecycle events.

Request events distinguish the runner queue from the shared inference queue,
generation, grammar fallback, cached engine reload, timeout/abort, JSON/field
validation, one repair, final runner result and actual UI application. Attempt
numbers and measured millisecond durations stay separate from UTC timestamps.
Runtime-exposed token counts and known finish reasons are optional. Startup
records the saved choice, install/cached route, capability/cache checks,
initialization, retry, readiness/error and shutdown. An existing startup marker
at relaunch records **previous startup interrupted**, with cause unknown.

`attempts` summarizes the last observed event/stage, last completed boundary,
observed/measured elapsed time, outcome and application when observed. Missing
generation/final/application/startup terminal events remain **incomplete** even
when a caller timeout has returned. Missing earlier context (for example due to
the selected dates or trimming) is explicit. An incomplete record does not
establish a crash, out-of-memory condition or graphics-device loss.

Only enumerated event/outcome/stage/action/model/runtime values, generated IDs,
safe counts, durations and booleans enter metadata. Errors use fixed code/name/
category/message maps; unknown errors have code `unknown`. Where safely found,
only an allowlisted local module name and line survive, never a stack or URL.
Technical context records launch mode, parsed browser/OS version when available,
service-worker control and `navigator.onLine` explicitly as an observation.
Prompts, generated replies, plot coordinates, titles, town saves, account IDs,
raw exceptions/stacks and credentials are excluded.

## Verification and device checklist

Automated fixtures cover exact retention and DST boundaries, range validation,
count/byte caps, cold-launch pruning, build-spanning records, privacy sentinels,
incomplete attempts, storage failure, runtime recovery, date/touch controls at
400 and 669 CSS pixels, share user activation, and repeated parsed JSON exports
after closing/reopening the normal cached Dev app with browser networking off.
These use controlled runtime replies; they are not real Qwen or iPhone evidence.

The physical MP-066 / MP-075 check is still required on the iPhone Duo:

1. Update/install [Master Plan Dev](https://matthnj15-pixel.github.io/Master-Plan/dev/)
   online. Open it from the Home Screen and cache a Qwen model. Note the menu's
   build revision, device and iOS version.
2. Close the app, enable airplane mode with Wi-Fi and cellular off, and cold-launch
   from the Home Screen. Submit a draft/revision; reproduce the failure if it is
   available. Keep the incident day and any Safari reload observation.
3. Open Offline AI → Diagnostics, select the incident day for both dates and
   export through the offered file action. Save the JSON to Files locally.
4. Check that the file identifies the attempt, exact Qwen/model runtime, build,
   stage, elapsed time, outcome, recovery and whether a plan change applied.
5. Close/reopen the app offline and export again. Confirm that retained records
   remain available. Record actual device results separately from fixtures.

Stable and Claude artifacts do not contain the diagnostics module. Claude
artifact publishing and real-device acceptance require their own evidence;
neither is implied by successful Chromium fixtures or Dev integration.

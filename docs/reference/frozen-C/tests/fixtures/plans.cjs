// Shared engine-validated alternatives and revisions for request and drawing checks.
// Every call returns a fresh state; fixture construction exercises public engine entry points.
function makePlanFixtures(E) {
  const state = E.newGame(2301);
  E.resolveYear(state);
  const park = state.proposals.find(p => p.id === 'park');
  const commerce = state.proposals.find(p => p.id === 'commerce');
  const mayoral = E.makeInitiative(state, {
    title: 'East End Homes and Shops',
    desc: 'Twenty homes, four shops, and rain gardens on my selected plots.',
    plots: [[16,13],[18,13],[16,14],[18,14],[16,15],[18,15]],
    plan: {homes:20, shops:4, stories:2, parking:20, green:2, stormwater:true},
  });
  const revision = structuredClone(mayoral);
  revision.plan = E.validatePlan('initiative', revision.plan, {homes:30, parking:0, plaza:true}).plan;
  E.refitInitiative(state, revision);
  const policyState = E.newGame(2302);
  const policy = E.makeInitiative(policyState, {
    title: 'Parking minimum reform',
    plan: {policy:'parking_reform'},
  });
  return {state, park, commerce, mayoral, policy, revision};
}
module.exports = {makePlanFixtures};

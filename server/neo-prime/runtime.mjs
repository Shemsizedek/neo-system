import { runNeoAlgo } from '../../core/neo-algo/runtime.mjs'

export function createNeoPrimeRuntime({ router, defaultCycle = 'human' } = {}) {
  if (!router?.plan || !router?.execute) throw new TypeError('router with plan and execute is required')

  function analyze(mission, cycle = defaultCycle) {
    return runNeoAlgo({
      ...mission,
      id: mission.id ?? mission.missionId,
      requestedAction: mission.requestedAction,
      actions: mission.actions,
    }, cycle)
  }

  function plan(mission, { cycle = defaultCycle } = {}) {
    const routePlan = router.plan(mission)
    const neoAlgo = analyze(mission, cycle)
    return {
      ...routePlan,
      neoAlgo,
      approvalRequired: routePlan.approvalRequired || neoAlgo.approvalRequired,
    }
  }

  async function execute(mission, { approved = false, cycle = defaultCycle } = {}) {
    const primePlan = plan(mission, { cycle })
    if (primePlan.approvalRequired && !approved) {
      return { status: 'awaiting_approval', ...primePlan }
    }

    const result = await router.execute(mission, { approved })
    return {
      ...result,
      neoAlgo: primePlan.neoAlgo,
      approvalRequired: result.approvalRequired || primePlan.neoAlgo.approvalRequired,
    }
  }

  return { analyze, plan, execute }
}

import { createComponents, removeComponents, duplicateComponents, makeActionsFromApiFns } from './common'
import { makeModel, mergeData } from '../../../utils/modelUtils'
// //Transforms//////

export function makeTransformsSystem (actions) {
  const defaults = {}

  const transformDefaults = {
    pos: [ 0, 0, 0 ],
    rot: [ 0, 0, 0 ],
    sca: [ 1, 1, 1 ]
  }

  function updatePosition (state, input) {
    console.log('updatePosition')
    let id = input.id
    let pos = input.value || [0, 0, Math.random()]
    let orig = state[id] || transformDefaults

    state = mergeData({}, state)
    // FIXME big hack, use mutability
    state[id] = mergeData({}, orig, {pos})
    return state
  }

  function updateRotation (state, input) {
    console.log('updateRotation')
    let {id} = input
    let rot = input.value || [0, 0, Math.random()]
    let orig = state[id] || transformDefaults

    state = mergeData({}, state)
    // FIXME big hack, use mutability
    state[id] = mergeData({}, orig, {rot})
    return state
  }

  function updateScale (state, input) {
    console.log('updateScale')
    let {id} = input
    let sca = input.value || [1, 1, Math.random()]
    let orig = state[id] || transformDefaults

    state = mergeData({}, state)
    // FIXME big hack, use mutability
    state[id] = mergeData({}, orig, {sca})
    return state
  }

  function mirrorComponents (state, inputs) {
    console.log('mirroring transforms', inputs)

    return inputs.reduce(function (state, input) {
      let {id} = input

      let sca = state[id].sca.map(d=>d)// DO NOT REMOVE ! a lot of code relies on diffing, and if you mutate the original scale, it breaks !
      sca[input.axis] *= -1

      let orig = state[id] || transformDefaults

      state = mergeData({}, state)
      // FIXME big hack, use mutability
      state[id] = mergeData({}, orig, {sca})

      return state
    }, state)
  }

  function updateComponents (state, inputs) {
    console.log('updating transforms', inputs)

    return inputs.reduce(function (state, input) {
      state = mergeData({}, state)

      let {id} = input
      let transforms = input.value || transformDefaults

      // FIXME big hack, use mutability
      state[id] = transforms
      return state
    }, state)
  }

  let updateFns = {
    updateRotation,
    updatePosition,
    updateScale,
    mirrorComponents,
    updateComponents,
    createComponents: createComponents.bind(null, transformDefaults),
    duplicateComponents,
    removeComponents
  }

  if (!actions) {
    actions = makeActionsFromApiFns(updateFns)
  }

  let transforms$ = makeModel(defaults, updateFns, actions)

  return {
    transforms$,
    transformActions: actions
  }
}

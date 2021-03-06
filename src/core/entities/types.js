import { findIndex, propEq } from 'ramda'
import { generateUUID, toArray } from '../../utils/utils'
import { nameCleanup } from '../../utils/formatters'
import { computeBoundingBox, computeBoundingSphere } from 'glView-helpers/lib/meshTools/computeBounds'
import { makeModel, mergeData } from '../../utils/modelUtils'

// one typical entry
/*
{
   "uuid": "a1",
   "name": "FavoritePart",
   "description": "test",
   "binary_document_id": 38546,
   "binary_document_url": "xxx/38546/UM2CableChain_BedEnd.STL",
   "source_document_id": null,
   "source_document_url": "",
 }*/

// actual api functions
function upsertTypes (state, input, index) {
  let {id, name} = input.meta // names are expected to be already 'cleaned up' ie without extension
  let mesh = input.data

  if (index === -1) { // if we have a mesh that is not yet registered
    if (mesh) {
      computeBoundingSphere(mesh)
      computeBoundingBox(mesh)
    }
    id = id || generateUUID()
  } else {
    id = state[index].id || generateUUID()
  }
  const entry = {id, name, mesh}

  if (index === -1) {
    state = state.concat(toArray(entry))
  } else {
    const newEntry = mergeData(state[index], entry)
    state = [
      ...state.slice(0, index),
      newEntry,
      ...state.slice(index + 1)
    ]
  }
  return state
}

function addTypes (state, input) {
  console.log('addTypes', state, input)
  // we have an id , we use that to search for pre-existing data
  const index = findIndex(propEq('id', input.meta.id))(state)
  return upsertTypes(state, input, index)
}

// create/infer a new type based on mesh + metadata
function addTypeCandidate (state, input) {
  console.log('addTypeCandidate', state, input)
  // we have a mesh name , we use that to search for pre-existing data
  const index = findIndex(propEq('name', nameCleanup(input.meta.name)))(state)
  return upsertTypes(state, input, index)
}

function removeTypes (state, inputs) {
  console.log('remove types', state, inputs)
  state = inputs.reduce(function (state, input) {
    const index = findIndex(propEq('id', input.id))(state)
    state = [
      ...state.slice(0, index),
      ...state.slice(index + 1)
    ]
    return state
  }, state)
  return state
}

function clearTypes (state, input) {
  // log.info("New design, clearing registry",regData)
  return []
}

export default function types (actions, source) {
  const defaults = []

  const updateFns = {addTypes, addTypeCandidate, removeTypes, clearTypes}
  return makeModel(defaults, updateFns, actions) // since we store THREE.js meshes, we cannot use actual immutable data
}

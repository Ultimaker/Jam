import assert from 'assert'
import Rx from 'rx'
const {just, never} = Rx.Observable
import fromYm from './fromYm'
import fromEvents from './fromEvents'
import fromPostMessage from './fromPostMessage'

describe('actionsFromEvents', () => {
  it('should return the correct hash of actions', function () {
    this.timeout(5000)

    const mockEventDriver = function () {
      return {
        select: () => ({events: () => just('')})
      }
    }
    const events = mockEventDriver()

    const actions = fromEvents(events)

    const expActions = [
      'addTypes$',
      'removeTypes$',
      'deleteInstances$',
      'updateComponent$',
      'createAnnotationStep$'
    ]

    assert.deepEqual(Object.keys(actions), expActions)
  })
})

describe('actionsFromPostMessage', () => {
  it('should return the correct hash of actions', function () {
    this.timeout(5000)

    const mockPostMessageDriver = function () {
      return just('')
    }
    const pm = mockPostMessageDriver()

    const actions = fromPostMessage(pm)

    const expActions = [
      'addPartData$',
      'removePartData$',
      'removeTypes$',
      'deleteInstances$',
      'desktopRequests$'
    ]

    assert.deepEqual(Object.keys(actions), expActions)
  })
})

describe('actionsFromYm', () => {
  it('should return the correct hash of actions', function () {
    this.timeout(5000)

    function mockYmDriver () {
      return never()
    }

    const ym = mockYmDriver()
    const resources = never()
    const actions = fromYm({ym, resources})

    const expActions = [
      'addTypes$',
      'createMetaComponents$',
      'createTransformComponents$',
      'createMeshComponents$',
      'requests$',
      'setActiveAssembly$'
    ]

    assert.deepEqual(Object.keys(actions), expActions)
  })

  function makeFakeReqRes(options){
    const partsRequest = {
      method: 'get',
      type: 'ymLoad',
      typeDetail: options.typeDetail,
      assemblyId: 0
    }
    let response$$ = just({response: options.responseData}).delay(1).share()
    response$$.request = partsRequest

    return response$$
  }

  function mockYmDriver () {
    let parts$ = makeFakeReqRes({
      typeDetail: 'parts',
      responseData: [{uuid: 9, name: 'partTypeA',binary_document_url:'some/fake/url'}]
    })
    let assemblyEntries$ = makeFakeReqRes({
      typeDetail: 'assemblyEntries',
      responseData: [{
        uuid: 0, part_uuid: 1, assemblyId: 0,
        name: 'test', color: 'red',
        pos: [0, 0.5, 8], rot: [19, 90, -75.5], sca: [1, 1, 1.5]
      }]
    })

    return Rx.Observable.from([parts$, assemblyEntries$])
  }

  it('should output correct data from its returned actions: (addTypes)', function (done){
    this.timeout(5000)

    const ym = mockYmDriver()
    const resources = never()
    const actions = fromYm({ym, resources})

    const expData = {
      id: 9,
      data: undefined,
      meta:
       { id: 9,
         name: 'partTypeA',
         binary_document_url: 'some/fake/url'
       }
    }

    actions.addTypes$
      .forEach(function (addTypeData) {
        assert.deepEqual(addTypeData, expData)
        done()
      })

    /*actions.createMetaComponents$
      //.combineLatest(actions.createTransformComponents$, )
      .forEach(e => console.log('createMetaComponents', e))

    actions.createTransformComponents$
      .forEach(e => console.log('createTransformComponents', e))

    actions.setActiveAssembly$
      .forEach(e => console.log('setActiveAssembly', e))

    actions.requests$
      .forEach(e => console.log('requests', e))*/

  })

  it('should output correct data from its returned actions: (createMetaComponents)', function (done) {
    const ym = mockYmDriver()
    const resources = never()
    const actions = fromYm({ym, resources})

    const expData = [ { id: 0, value: { name: 'test', color: 'red', id: 0, typeUid: 1, assemblyId: 0 } } ]

    actions.createMetaComponents$
      .forEach(function (data) {
        assert.deepEqual(data, expData)
        done()
      })
  })

  it('should output correct data from its returned actions: (createTransformComponents)', function (done) {
    const ym = mockYmDriver()
    const resources = never()
    const actions = fromYm({ym, resources})

    const expData = [ { id: 0,
      value:
     { name: 'test',
       id: 0,
       typeUid: 1,
       pos: [0, 0.5, 8], rot: [19, 90, -75.5], sca: [1, 1, 1.5]
     }
   }]

    actions.createTransformComponents$
      .forEach(function (data) {
        assert.deepEqual(data, expData)
        done()
      })
  })

})

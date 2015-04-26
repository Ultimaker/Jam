import React from 'react';
import co from "co";


import ThreeJs     from './components/webgl/three-js.react'
import MainToolbar from './components/MainToolbar'
import EntityInfos from './components/EntityInfos'


import postProcessMesh from './meshpp/postProcessMesh'
import helpers         from 'glView-helpers'
let centerMesh         = helpers.mesthTools.centerMesh;

import AssetManager from 'usco-asset-manager'
import DesktopStore from 'usco-desktop-store'
import XhrStore     from 'usco-xhr-store'
import StlParser    from 'usco-stl-parser'
import CtmParser    from 'usco-ctm-parser'
import PlyParser    from 'usco-ply-parser'
/*import AMfParser    from 'usco-amf-parser'
import ObjParser    from 'usco-obj-parser'*/
//import registerReact from 'reactive-elements';

import Kernel       from 'usco-kernel2'


import Rx from 'rx'
let fromEvent = Rx.Observable.fromEvent;
let Observable = Rx.Observable;


import {partitionMin} from './coms/utils'


import DndBehaviour             from './behaviours/dndBe'
import ParseUrlParamsBehaviour  from './behaviours/urlParamsBe'


import keymaster from 'keymaster'


import logger from './utils/log'
let log = logger("Jam-Root");
log.setLevel("info");

import state from './state'

import BomView from './components/Bom/BomView'

////TESTING

//import {createTodo} from './actions/entityActions'
//import FooComponent from './components/fooCompo'

////TESTING-OVER


export default class App extends React.Component {
  constructor(props){
    super(props);
    this.state = state;

    this.assetManager = new AssetManager();
    this.assetManager.addParser("stl", new StlParser());
    this.assetManager.addParser("ctm", new CtmParser());
    this.assetManager.addParser("ply", new PlyParser());

    this.assetManager.addStore( "desktop", new DesktopStore() );
    this.assetManager.addStore( "xhr"    , new XhrStore() );

    this.kernel = new Kernel(this.state);

    //temporary
    this.kernel.dataApi.store = this.assetManager.stores["xhr"];
    this.kernel.assetManager  = this.assetManager;
  }
  
  componentDidMount(){
    var pjson = require('../package.json');
    this.setState(
    {
      appInfos:{
        ns : this.state.appInfos.ns,
        name: this.state.appInfos.name,
        version:pjson.version
      }  
    });

    //add drag & drop behaviour 
    let container = this.refs.wrapper.getDOMNode();
    DndBehaviour.attach( container );
    DndBehaviour.dropHandler = this.handleDrop.bind(this);


    let glview   = this.refs.glview;
    let meshesCh = glview.selectedMeshesCh;
    let self     = this;

    //get entities 
    let checkCount = function(x){
      return (x.length>0)
    }

    let filterEntities = function( x ){
      return (x.userData && x.userData.entity)
    }

    let fetchEntities = function( x ){
      return x.userData.entity;
    }

    let foo = function(x){
       console.log("here",x)
       return x;
    }
    let finalLog=function(x){
       console.log("FINAL",x)
       return x;
    }

    

    let selectedMeshesChAlt = glview.selectedMeshesSub
      .defaultIfEmpty([])
      .map(
        function(selections){
          let res= selections.filter(filterEntities).map(fetchEntities);
          self.selectEntities(res)
        }
      );
      //.filter(filterEntities)
      //.map(fetchEntities);
      //.flatMap( x => x )
    selectedMeshesChAlt.subscribe(foo)


    let extractAttributes = function(mesh){
      let attrs = {
        pos:mesh.position,
        rot:mesh.rotation,
        sca:mesh.scale
      }
      return attrs;
    }

    let attributesToArrays= function(attrs){
      let output= {};
      for(let key in attrs){
        output[key] = attrs[key].toArray();
      }
      return output;
    }

    let setEntityT = function(attrsAndEntity){
      let [attrs,entity] = attrsAndEntity;
      self.setEntityTransforms(entity,attrs)
      return attrsAndEntity
    }


    let rawTranforms     =  glview.objectsTransformSub.debounce(20).filter(filterEntities).share();
    let objectTransforms = rawTranforms 
      .map(extractAttributes)
      .map(attributesToArrays)
      .take(1)
      //.subscribe(finalLog);
    let objectsId = rawTranforms
      .map(fetchEntities)
      .take(1)

    let test = Observable.forkJoin(
      objectTransforms,
      objectsId
    )
    .repeat()
    .subscribe( setEntityT )
    

    ///////////
    //setup key bindings
    this.setupKeyboard()
    ///////////

    //fetch & handle url parameters
    let designUrls = ParseUrlParamsBehaviour.fetch("designUrl");
    let meshUrls   = ParseUrlParamsBehaviour.fetch("meshUrl");
    
    //only handle a single design url
    let singleDesign = designUrls.pop();
    if(singleDesign) designUrls = [singleDesign];
    
    designUrls.map(function( designUrl ){ self.loadDesign(designUrls) });

    //only load meshes if no designs need to be loaded 
    if(!singleDesign)  meshUrls.map(function( meshUrl ){ self.loadMesh(meshUrl) });
  }

  componentWillUnmount(){
    DndBehaviour.detach( );
  }

  //event handlers
  setupKeyboard(){
    //non settable shortcuts
    //prevent backspace
    keymaster('backspace', function(){ 
      return false
    });
    keymaster('F11', function(){ 
      //self.handleFullScreen();
    });
    keymaster('⌘+z,ctrl+z', function(){ 
      //self.undo();
    });
    keymaster('⌘+shift+z,ctrl+shift+z', function(){ 
      //self.redo();
    });

    //deal with all shortcuts
    let shortcuts = this.state.shortcuts;
    for(let actionName in shortcuts){
      let keys = shortcuts[actionName]
      keymaster(keys, function(){ 
        console.log(`will do ${actionName}`)
        return false;
      });
    }

    /*
      //self.removeEntity();
      //self.duplicateEntity();
      //self.toTranslateMode();
      //self.toRotateMode();
      //self.toScaleMode();
    */


    //TAKEN FROM ESTE
    // For Om-like app state persistence. Press shift+ctrl+s to save app state
    // and shift+ctrl+l to load.
    keymaster('shift+ctrl+s',function(){
      window._appState = state.save()
      window._appStateString = JSON.stringify(window._appState)
      console.log('app state saved')
      console.log('copy the state to your clipboard by calling copy(_appStateString)')
      console.log('for dev type _appState and press enter')
    });

     keymaster('shift+ctrl+l',function(){
      const stateStr = window.prompt('Copy/Paste the serialized state into the input')
      const newState = JSON.parse(stateStr)
      if (!newState) return
      state.load(newState)
    });

  }

  unsetKeyboard(){
    //keymaster.unbind('esc', this.onClose)
  }

  handleDrop(data){
    log.info("data was dropped into jam!", data)
    for (var i = 0, f; f = data.data[i]; i++) {
        this.loadMesh( f, {display: true} );
    }
  }
  handleClick(event){
    console.log("STATE", this.state);
    console.log("bom", this.kernel.bom.bom)
  }

  //api 
  loadDesign(uri,options){
    log.warn("loading design from ",uri);
    let self = this;

    function logNext( next ){
      log.info( next )
    }
    function logError( err){
      log.error(err)
    }
    function logDone( data) {
      log.info("DONE",data);
      self._tempForceDataUpdate();
      //FIXME: hack
      self.setState({
        design:{
          title: self.kernel.activeDesign.title,
          description:self.kernel.activeDesign.description,
        }
      });

      //FIXME: godawful hack because we have multiple "central states" for now
      self.kernel.activeAssembly.children.map(
        function(entityInstance){
        self.addEntityInstance(entityInstance);
        }
      );

        
      
    }

    this.kernel.loadDesign(uri,options)
    .subscribe( logNext, logError, logDone);
  }
  
  //-------COMMANDS OR SOMETHING LIKE THEM -----
  //FIXME; this should be a command or something
  selectEntities(selectedEntities){
    let selectedEntities = selectedEntities || [];
    if(selectedEntities.constructor !== Array) selectedEntities = [selectedEntities]
    this.setState({
      selectedEntities:selectedEntities
    });
    log.info("selectedEntities",selectedEntities)
  }

  //FIXME; this should be a command or something
  setEntityTransforms(entity, transforms){
    log.info("setting transforms of",entity, "to", transforms)

    let _entitiesById = this.state._entitiesById;
    let tgtEntity     = _entitiesById[entity.iuid];

    if(!tgtEntity) return;
    for(let key in transforms){
      tgtEntity[key] = transforms[key];
    }
    // _entitiesById[entity.iuid].rot = transforms.rot;
    //  _entitiesById[entity.iuid].sca = transforms.sca;
    this.setState({_entitiesById:_entitiesById});
  }

  //FIXME; this should be a command or something
  /*register a new entity type*/
  addEntityType( type ){
    log.info("adding entity type", type)
    let nKlasses  = this.state._entityKlasses;
    nKlasses.push( type )
    //this.setState({_entityKlasses:this.state._entityKlasses.push(type)})
    this.setState({_entityKlasses:nKlasses})
  }

  //FIXME; this should be a command or something
  /*save a new entity instance*/
  addEntityInstance( instance ){
    log.info("adding entity instance", instance)
    let nEntities  = this.state._entities;
    nEntities.push( instance )
    this.setState({_entities:nEntities})

    let _entitiesById = this.state._entitiesById;
    _entitiesById[instance.iuid] = instance;
    this.setState({_entitiesById:_entitiesById})
  }


  //API
  loadMesh( uriOrData, options ){
    const DEFAULTS={
    }
    var options     = options || {};
    var display     = options.display === undefined ? true: options.display;
    var addToAssembly= options.addToAssembly === undefined ? true: options.addToAssembly;
    var keepRawData = options.keepRawData === undefined ? true: options.keepRawData;
    
    if(!uriOrData) throw new Error("no uri or data to load!");

    let self = this;
    let resource = this.assetManager.load( uriOrData, {keepRawData:true, parsing:{useWorker:true,useBuffers:true} } );

    var source = Rx.Observable.fromPromise(resource.deferred.promise);

    let logNext  = function( next ){
      log.info( next )
    }
    let logError = function( err){
      log.error(err)
    }
    let handleLoadError = function( err ){
       log.error("failed to load resource", err, resource.error);
       //do not keep error message on screen for too long, remove it after a while
       setTimeout(cleanupResource, self.dismissalTimeOnError);
       return resource;
    }
    let cleanupResource = function( resource ){
      log.info("cleaning up resources")
      self.assetManager.dismissResource( resource );
    }

    let register = function( shape ){
      //part type registration etc
      //we are registering a yet-uknown Part's type, getting back an instance of that type
      let partKlass    = self.kernel.registerPartType( null, null, shape, {name:resource.name, resource:resource} );
      let partInstance = undefined;
      if( addToAssembly ) {
        partInstance = self.kernel.makePartTypeInstance( partKlass );
        self.kernel.registerPartInstance( partInstance );
      }

      //FIXME: remove, this is just for testing
      self.addEntityType( partKlass)
      self.addEntityInstance(partInstance)

      //we do not return the shape since that becomes the "reference shape", not the
      //one that will be shown
      return {klass:partKlass,instance:partInstance};
    }

    let showIt = function( klassAndInstance ){
      if( display || addToAssembly ){
        //klassAndInstance.instance._selected = true;//SETTIN STATE !! not good like this
        self._tempForceDataUpdate();
      }

      return klassAndInstance
    }

    let mainProc = source
      .map( postProcessMesh )
      .map( centerMesh )
      .share();

    mainProc
      .map( register )
      .map( showIt )
      .map( function(klassAndInstance){
        //klassAndInstance.instance.pos[2]+=30;
        return klassAndInstance;
      })
        .catch(handleLoadError)
        //.timeout(100,cleanupResource)
        .subscribe(logNext,logError);

    mainProc.subscribe(logNext,logError);
  }

  //mesh insertion post process
  //FIXME: do this better , but where ?
  _meshInjectPostProcess( mesh ){
    //FIXME: not sure about these, they are used for selection levels
    mesh.selectable      = true;
    mesh.selectTrickleUp = false;
    mesh.transformable   = true;
    //FIXME: not sure, these are very specific for visuals
    mesh.castShadow      = true;
    //mesh.receiveShadow = true;
    return mesh;
    //FIXME: not sure where this should be best: used to dispatch "scene insertion"/creation operation
    //var operation = new MeshAddition( mesh );
    //self.historyManager.addCommand( operation );
  }


  /*temporary method to force 3d view updates*/
  _tempForceDataUpdate(){
    let glview   = this.refs.glview;
    let assembly = this.kernel.activeAssembly;
    let entries  = assembly.children;

    let mapper = function( entity, addTo, xform ){
      let self = this;


      /*let getInstance  = self.kernel.getPartMeshInstance( entity );
      return Rx.Observable.from( getInstance )
        .map(function(meshInstance){
          meshInstance.userData.entity = entity;//FIXME : should we have this sort of backlink ?
          //FIXME/ make a list of all operations needed to be applied on part meshes
          //computeObject3DBoundingSphere( meshInstance, true );
          //centerMesh( meshInstance ); //FIXME do not use the "global" centerMesh
          
          log.info("instance",meshInstance)

          meshInstance.position.fromArray( entity.pos )
          meshInstance.rotation.fromArray( entity.rot );
          meshInstance.scale.fromArray(  entity.sca );
          if (addTo)addTo.add( meshInstance);
          if (xform) xform(entity,meshInstance);
          return meshInstance
        })
        .map(self._meshInjectPostProcess)*/

      co(function* (){
        let meshInstance = yield self.kernel.getPartMeshInstance( entity ) ;
        if( meshInstance){
          meshInstance.userData.entity = entity;//FIXME : should we have this sort of backlink ?
          //FIXME/ make a list of all operations needed to be applied on part meshes
          //computeObject3DBoundingSphere( meshInstance, true );
          //centerMesh( meshInstance ); //FIXME do not use the "global" centerMesh
          
          //log.info("instance",meshInstance, meshInstance.userData.entity)

          meshInstance.position.fromArray( entity.pos )
          meshInstance.rotation.fromArray( entity.rot );
          meshInstance.scale.fromArray(  entity.sca );

          self._meshInjectPostProcess( meshInstance );
          
          if (addTo)addTo.add( meshInstance);
          if (xform) xform(entity,meshInstance);
          
          return meshInstance;
        }
      });
    };

    glview.forceUpdate(entries, mapper.bind(this));
  }

  selectedMeshesChangedHandler( selectedMeshes ){
    //console.log("selectedMeshes",selectedMeshes)
    let kernel = this.kernel;
    let selectedEntities = selectedMeshes.map( mesh => {
        return kernel.getEntityOfMesh( mesh )
      }
    );
    //console.log("selectedEntities",selectedEntities)
  }
  
  render() {

    let wrapperStyle = {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom:0,
      right:0,
      width:'100%',
      height:'100%',
      overflow:'hidden'
    }
    let infoLayerStyle = {
      color: 'red',
      width:'400px',
      height:'300px',
      zIndex:15,
      position: 'absolute',
      right: 0,
      top: "42px"
    };

    let titleStyle = {
      position: 'absolute',
      left: '50%',
      top: 0,
    }
    let testAreaStyle = {
      position: 'absolute',
      left: 0,
      bottom:0
    };

    let toolbarStyle={
      width:'100%',
      height:'100%',
    };

    //let fullTitle = `${this.state.design.title} ---- ${this.state.appInfos.name} v  ${this.state.appInfos.version}`;
    /*
       <FooComponent/>
 <div ref="infoLayer" className="infoLayer" style={infoLayerStyle} >
            <BomView data={bomData}/>
            <button onClick={this.handleClick.bind(this)}> ShowState (in console) </button>
          </div>

    */
    
    let bomData = this.kernel.bom.bom;

    return (
        <div ref="wrapper" style={wrapperStyle}>
          <MainToolbar design={this.state.design} appInfos={this.state.appInfos} style={toolbarStyle}> </MainToolbar>
          <ThreeJs ref="glview"/>

          <div ref="testArea" style={testAreaStyle}>
            <EntityInfos entities={this.state.selectedEntities}/>
          </div>

         
        </div>
    );
  }
}

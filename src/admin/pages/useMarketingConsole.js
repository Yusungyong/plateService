import {useCallback,useEffect,useRef,useState} from 'react';
import {getMarketingConsole} from '../api/marketingApi';
import {summarize,errorMessage} from './marketingModel';
export default function useMarketingConsole(allowed,scope){
 const [result,setResult]=useState({scope,snapshot:null,loading:false,error:''});const active=useRef(null),version=useRef(0);
 const load=useCallback(async()=>{
  if(!allowed)return;active.current?.abort();const controller=new AbortController(),generation=++version.current;active.current=controller;
  setResult(old=>({...old,scope,loading:true,error:''}));
  try{const snapshot=await getMarketingConsole({signal:controller.signal});summarize(snapshot);if(generation===version.current)setResult({scope,snapshot,loading:false,error:''});}
  catch(error){if(generation===version.current&&!controller.signal.aborted)setResult(old=>({...old,scope,loading:false,error:errorMessage(error)}));}
  finally{if(active.current===controller)active.current=null;}
 },[allowed,scope]);
 useEffect(()=>{setResult({scope,snapshot:null,loading:allowed,error:''});void load();return()=>{version.current++;active.current?.abort();active.current=null;};},[allowed,scope,load]);
 return {...(result.scope===scope?result:{snapshot:null,loading:allowed,error:''}),load};
}

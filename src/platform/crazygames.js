import { CONFIG } from '../../config.js';
let sdk=null,playing=false;
const deadline=async(work,ms=7000)=>{let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('CrazyGames timeout')),ms);})]);}finally{clearTimeout(timer);}};
/** SDK absence must not prevent local play. The SDK never authorizes wallet writes. */
async function initializePlatform({onSettings=()=>{},onInvite=()=>{}}={}){
  if(!CONFIG.crazyGames)return {user:null,room:null,instant:false};
  try{
    await deadline(new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://sdk.crazygames.com/crazygames-sdk-v3.js';script.onload=resolve;script.onerror=()=>reject(Error('SDK unavailable'));document.head.append(script);}));
    sdk=window.CrazyGames?.SDK;if(!sdk)throw Error('SDK unavailable');await deadline(sdk.init());
    sdk.game.loadingStart();
    onSettings(sdk.game.settings??{});sdk.game.addSettingsChangeListener(onSettings);
    sdk.game.addJoinRoomListener(params=>{const code=params?.room;if(typeof code==='string')onInvite(code);});
    let user=null;try{if(sdk.user.isUserAccountAvailable)user=await deadline(sdk.user.getUser(),3000);}catch{/* Guests can still play. */}
    return {user,room:sdk.game.inviteParams?.room??null,instant:Boolean(sdk.game.isInstantMultiplayer)};
  }catch(error){console.warn('CrazyGames indisponible : mode local conservé.',error);sdk=null;return {user:null,room:null,instant:false};}
}
function loadingComplete(){try{sdk?.game.loadingStop();}catch{}}
function gameplay(active){if(!sdk||playing===active)return;playing=active;try{active?sdk.game.gameplayStart():sdk.game.gameplayStop();}catch{}}
function roomInfo(id,joinable){if(!sdk)return;try{if(id)sdk.game.updateRoom({roomId:id,isJoinable:joinable,inviteParams:{room:id}});else sdk.game.leftRoom();}catch{}}
async function inviteLink(code){if(sdk){try{return await sdk.game.inviteLink({room:code});}catch{}}const url=new URL(location.href);url.searchParams.set('room',code);return url.toString();}
function happyTime(){try{sdk?.game.happytime();}catch{}}
async function userToken(){if(!sdk?.user.isUserAccountAvailable)throw Error('Compte CrazyGames requis.');return sdk.user.getUserToken();}
// No ads, purchases or persistent rewards are requested by this alpha.
export { initializePlatform,loadingComplete,gameplay,roomInfo,inviteLink,happyTime,userToken };

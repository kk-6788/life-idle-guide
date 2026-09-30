'use strict';
const cloud = require('./cloud');
// Shared links and tab pages all require server-confirmed membership before rendering.
module.exports = function guard(definition) {
 const load=definition.onLoad, show=definition.onShow, hide=definition.onHide, unload=definition.onUnload;
 const wrapped={...definition,data:{...definition.data,authorized:false,accessMessage:'正在确认邀请…',isAdmin:false}};
 Object.keys(definition).forEach(key=>{
  if(typeof definition[key]==='function'&&!['onLoad','onShow','onHide','onUnload'].includes(key))
   wrapped[key]=function(...args){if(this.data.authorized)return definition[key].apply(this,args);};
 });
 wrapped.onLoad=function(options){this._entryOptions=options||{};};
 wrapped.onShow=async function(){
  const serial=this._guardSerial=(this._guardSerial||0)+1;
  this.setData({authorized:false,accessMessage:'正在确认邀请…'});
  try{
   const member=await cloud.call('membership');
   if(this._guardSerial!==serial)return;
   if(!member.active){
    const query=Object.entries(this._entryOptions||{}).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
    getApp().globalData.returnPath='/'+this.route+(query?'?'+query:'');
    wx.reLaunch({url:'/pages/invite/invite'});return;
   }
   this.setData({authorized:true,isAdmin:!!member.admin});
   if(!this._guardLoaded){if(load)load.call(this,this._entryOptions);this._guardLoaded=true;}
   if(show)await show.call(this);
  }catch(error){if(this._guardSerial===serial)this.setData({authorized:false,accessMessage:error.message});}
 };
 wrapped.retryAccess=function(){return wrapped.onShow.call(this);};
 wrapped.onHide=function(){this._guardSerial=(this._guardSerial||0)+1;this.setData({authorized:false});if(hide)hide.call(this);};
 wrapped.onUnload=function(){this._guardSerial=(this._guardSerial||0)+1;if(unload)unload.call(this);};
 return wrapped;
};

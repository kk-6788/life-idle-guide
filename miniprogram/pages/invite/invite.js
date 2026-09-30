'use strict';
const cloud=require('../../utils/cloud');
Page({
 data:{code:'',busy:false,checking:true,message:'',consent:false,privacyOpen:false},
 onLoad(){this.check();},
 async check(){
  this.setData({checking:true,message:''});
  try{const result=await cloud.call('membership');if(result.active){this.enter();return;}if(result.disabled)this.setData({message:'这个试用账号已暂停使用。'});}
  catch(error){this.setData({message:error.message});}
  this.setData({checking:false});
 },
 onCode(e){this.setData({code:e.detail.value});},
 onConsent(e){this.setData({consent:e.detail.value.includes('agree')});},
 onPrivacy(){this.setData({privacyOpen:!this.data.privacyOpen});},
 async redeem(){
  if(this.data.busy||this.data.checking)return;
  if(!this.data.consent){this.setData({message:'请先阅读并同意试用说明。'});return;}
  if(!this.data.code.trim()){this.setData({message:'先填一下邀请码吧。'});return;}
  this.setData({busy:true,message:''});
  try{await cloud.call('redeem',{code:this.data.code});this.setData({code:''});this.enter();}
  catch(error){this.setData({message:error.message});}
  this.setData({busy:false});
 },
 enter(){
  const app=getApp(),pending=app.globalData.returnPath;app.globalData.returnPath='';
  if(pending&&pending.startsWith('/pages/detail/detail?id='))wx.reLaunch({url:pending});
  else wx.switchTab({url:'/pages/home/home'});
 }
});

'use strict';
const cloud=require('../../utils/cloud'),guard=require('../../utils/guard');
const content=require('../../data/content');
Page(guard({
 data:{posts:[],more:false,loading:false,error:'',composer:false,nickname:'',text:'',activityIndex:0,activities:[{id:'',title:'随便聊聊'},...content.map(x=>({id:x.id,title:x.title}))],sending:false,message:''},
 onShow(){return this.load(false);},
 decorate(item){return {...item,activityTitle:(content.find(a=>a.id===item.activityId)||{}).title||'随便聊聊',time:item.createdAt.slice(5,16).replace('T',' '),expanded:false,comments:[],commentMore:false,reply:'',replyNick:'',replyMsg:'',replyBusy:false,commentBusy:false};},
 async load(append){
  if(this.data.loading)return;this.setData({loading:true,error:''});
  try{const r=await cloud.call('list',{offset:append?this.data.posts.length:0});this.setData({posts:(append?this.data.posts:[]).concat(r.items.map(x=>this.decorate(x))),more:r.more});}
  catch(e){this.setData({error:e.message});}finally{this.setData({loading:false});}
 },
 retry(){return this.load(false);},morePosts(){return this.load(true);},
 toggleComposer(){this.setData({composer:!this.data.composer});},
 nicknameInput(e){this.setData({nickname:e.detail.value});},textInput(e){this.setData({text:e.detail.value});},activityChange(e){this.setData({activityIndex:Number(e.detail.value)});},
 async submit(){
  if(this.data.sending)return;this.setData({sending:true,message:''});
  try{await cloud.call('post',{nickname:this.data.nickname,text:this.data.text,activityId:this.data.activities[this.data.activityIndex].id});this.setData({text:'',message:'已交给管理员，审核后展示。'});}
  catch(e){this.setData({message:e.message});}finally{this.setData({sending:false});}
 },
 async toggleComments(e){const i=e.currentTarget.dataset.index,p=this.data.posts[i];this.setData({['posts['+i+'].expanded']:!p.expanded});if(!p.expanded)return this.fetchComments(i,false);},
 async fetchComments(i,append){
  const p=this.data.posts[i];if(!p||p.commentBusy)return;this.setData({['posts['+i+'].commentBusy']:true,['posts['+i+'].replyMsg']:''});
  try{const r=await cloud.call('comments',{parentId:p.id,offset:append?p.comments.length:0});this.setData({['posts['+i+'].comments']:(append?p.comments:[]).concat(r.items),['posts['+i+'].commentMore']:r.more});}
  catch(e){this.setData({['posts['+i+'].replyMsg']:e.message});}finally{this.setData({['posts['+i+'].commentBusy']:false});}
 },
 moreComments(e){return this.fetchComments(e.currentTarget.dataset.index,true);},
 replyInput(e){this.setData({['posts['+e.currentTarget.dataset.index+'].reply']:e.detail.value});},
 replyNickInput(e){this.setData({['posts['+e.currentTarget.dataset.index+'].replyNick']:e.detail.value});},
 async reply(e){
  const i=e.currentTarget.dataset.index,p=this.data.posts[i];if(p.replyBusy)return;this.setData({['posts['+i+'].replyBusy']:true});
  try{await cloud.call('comment',{parentId:p.id,nickname:p.replyNick,text:p.reply});this.setData({['posts['+i+'].reply']:'',['posts['+i+'].replyMsg']:'回复已提交，审核后展示。'});}
  catch(e){this.setData({['posts['+i+'].replyMsg']:e.message});}finally{this.setData({['posts['+i+'].replyBusy']:false});}
 },
 report(e){const targetId=e.currentTarget.dataset.id;wx.showModal({title:'举报内容',editable:true,placeholderText:'填写举报原因（最多200字）',success:async r=>{if(!r.confirm)return;try{await cloud.call('report',{targetId,reason:r.content});wx.showToast({title:'举报已收到',icon:'none'});}catch(error){wx.showToast({title:error.message,icon:'none'});}}});},
 mine(){wx.navigateTo({url:'/pages/manage/manage?mode=mine'});},
 manage(){wx.navigateTo({url:'/pages/manage/manage?mode=review'});}
}));

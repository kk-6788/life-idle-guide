'use strict';
const cloud=require('../../utils/cloud'),guard=require('../../utils/guard');
const labels={pending:'待审核',approved:'已展示',rejected:'未通过',deleted:'已删除',resolved:'已处理'};
Page(guard({
 data:{mode:'mine',items:[],members:[],more:false,busy:false,message:'',count:0},
 onLoad(options){this.setData({mode:options.mode==='review'?'review':'mine'});},
 onShow(){return this.load(false);},
 async load(append){
  if(this.data.busy)return;this.setData({busy:true,message:''});
  try{const r=await cloud.call(this.data.mode==='review'?'reviewList':'mine',{offset:append?this.data.items.length:0});this.setData({items:(append?this.data.items:[]).concat(r.items.map(x=>({...x,statusLabel:labels[x.status],kindLabel:({post:'留言',comment:'回复',report:'举报'})[x.kind]}))),more:r.more});}
  catch(e){this.setData({message:e.message});}finally{this.setData({busy:false});}
 },
 retry(){return this.load(false);},moreItems(){return this.load(true);},
 async act(e){
  if(this.data.busy)return;
  const {id,status}=e.currentTarget.dataset;
  wx.showModal({title:this.data.mode==='review'?'确认审核操作':'删除这条内容？',content:this.data.mode==='review'?(status==='approved'?'通过内容；若为举报，将隐藏被举报内容。':'拒绝内容；若为举报，将关闭该举报。'):'删除后其他成员将看不到正文。',success:async r=>{
   if(!r.confirm||this.data.busy)return;this.setData({busy:true,message:''});
   try{await cloud.call(this.data.mode==='review'?'moderate':'deleteOwn',{id,status});this.setData({busy:false});await this.load(false);}
   catch(error){this.setData({busy:false,message:error.message});}
  }});
 },
 async showMembers(){try{const r=await cloud.call('members');this.setData({members:r.members.map((m,i)=>({...m,label:'成员 '+(i+1)})),count:r.count});}catch(e){this.setData({message:e.message});}},
 memberAction(e){const {id,disabled}=e.currentTarget.dataset;wx.showModal({title:disabled?'恢复该成员？':'暂停该成员？',content:'暂停不会释放邀请码或增加试用名额。',success:async r=>{if(!r.confirm)return;try{await cloud.call('disableMember',{memberId:id,disabled:!disabled});await this.showMembers();}catch(error){this.setData({message:error.message});}}});}
}));

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const wheel=require('../miniprogram/utils/wheel');
const cloud=require('../miniprogram/utils/cloud');
const fs=require('node:fs'),path=require('node:path');
const entries=Array.from({length:40},(_,i)=>({id:'item-'+i,title:'小事'+i}));

test('wheel samples unique eligible activities without mutating the source',()=>{
 const input=entries.slice();
 for(let i=0;i<100;i++){
  const slots=wheel.createSlots(input);
  assert.equal(slots.length,8);assert.equal(new Set(slots.map(x=>x.id)).size,8);
  assert.ok(slots.every(x=>input.some(y=>y.id===x.id)));
 }
 assert.deepEqual(input,entries);
 assert.equal(wheel.createSlots([]).length,0);
 assert.equal(wheel.createSlots(entries.slice(0,3)).length,3);
});
test('every chosen sector stops under the pointer for one through eight candidates',()=>{
 for(let count=1;count<=8;count++)for(let index=0;index<count;index++)for(const rotation of [0,173,1287]){
  const end=wheel.stopRotation(rotation,index,count);
  const center=(index+0.5)*360/count;
  const angle=(end+center)%360;
  assert.ok(Math.min(angle,360-angle)<1e-8);
  assert.ok(end-rotation>=1080);
 }
});
test('random choice avoids the last result when another visible activity exists',()=>{
 const slots=wheel.createSlots(entries.slice(0,8),()=>0.5);
 for(let i=0;i<50;i++)assert.notEqual(wheel.pickIndex(slots,slots[0].id),0);
 assert.equal(wheel.pickIndex([entries[0]],entries[0].id),0);
 assert.equal(wheel.pickIndex([],null),-1);
});

async function home(){
 const calls=[],timers=new Map();let next=0,definition;
 global.Page=d=>{definition=d;};global.getApp=()=>({globalData:{}});
 global.wx={getStorageSync:()=>[],setStorageSync:()=>{},navigateTo:o=>calls.push(o.url),showToast:()=>{},reLaunch:()=>{}};
 cloud.call=async()=>({active:true});
 const file=path.resolve(__dirname,'../miniprogram/pages/home/home.js');delete require.cache[file];require(file);
 const p={...definition,route:'pages/home/home',data:structuredClone(definition.data),setData(o){Object.assign(this.data,o);}};
 p.onLoad({});await p.onShow();
 const realSet=global.setTimeout,realClear=global.clearTimeout;
 global.setTimeout=fn=>{const id=++next;timers.set(id,fn);return id;};
 global.clearTimeout=id=>timers.delete(id);
 return {p,calls,timers,restore(){global.setTimeout=realSet;global.clearTimeout=realClear;}};
}
test('rapid taps create one spin and navigate to the selected visible sector',async()=>{
 const {p,calls,timers,restore}=await home();
 try{
  p.onRandom();p.onRandom();assert.equal(timers.size,1);assert.equal(calls.length,0);
  assert.equal(p.data.spinning,true);const selected=p.data.wheelItems[p.data.wheelSelected];
  [...timers.values()][0]();assert.equal(p.data.spinning,false);
  assert.equal(calls[0],'/pages/detail/detail?id='+encodeURIComponent(selected.id));
 }finally{restore();}
});
test('leaving the page cancels a spin before it can navigate',async()=>{
 const {p,calls,timers,restore}=await home();
 try{p.onRandom();p.onHide();assert.equal(timers.size,0);assert.equal(p.data.spinning,false);assert.equal(calls.length,0);}finally{restore();}
});
test('filtering while spinning cancels the old result and rebuilds eligible sectors',async()=>{
 const {p,calls,timers,restore}=await home();
 try{
  p.onRandom();p.onChipTap({currentTarget:{dataset:{group:'company',value:'group'}}});
  assert.equal(timers.size,0);assert.equal(p.data.spinning,false);assert.equal(calls.length,0);
  assert.ok(p.data.wheelItems.every(x=>p.data.list.some(y=>y.id===x.id)));
  p.onSearchInput({detail:{value:'不存在的小事zzzz'}});
  assert.equal(p.data.wheelItems.length,0);p.onRandom();assert.equal(timers.size,0);
 }finally{restore();}
});

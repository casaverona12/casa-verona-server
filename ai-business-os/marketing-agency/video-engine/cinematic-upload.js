"use strict";
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const Busboy=require('busboy');
const {UPLOADS}=require('./video-editor');
const {produceCinematic}=require('./cinematic-engine');
const MAX_FILES=6, MAX_FILE=35*1024*1024, MAX_TOTAL=MAX_FILES*MAX_FILE+1024*1024;
let busy=false;
async function handleCinematic(req,res){
 const json=(code,body)=>{if(!res.headersSent){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}};
 if(busy)return json(429,{success:false,error:'הפקה אחרת מתבצעת כעת'});
 if(Number(req.headers['content-length']||0)>MAX_TOTAL)return json(413,{success:false,error:'קבצים גדולים מדי'});
 busy=true;let uploaded=[];let output=null;
 try{
  fs.mkdirSync(UPLOADS,{recursive:true});
  const bb=Busboy({headers:req.headers,limits:{files:MAX_FILES,fileSize:MAX_FILE,fields:2,parts:MAX_FILES+2}});
  let format='vertical',seconds=4,invalid=null,total=0;const pending=[];
  await new Promise((resolve,reject)=>{
   req.on('aborted',()=>reject(new Error('ההעלאה הופסקה')));
   req.on('error',reject);
   bb.on('field',(key,value)=>{if(key==='format')format=value;else if(key==='sceneSeconds')seconds=Number(value);else invalid='שדה לא מוכר';});
   bb.on('file',(field,stream,info)=>{
    if(field!=='clips'){invalid='שדה קובץ לא מוכר';stream.resume();return;}
    const filepath=path.join(UPLOADS,`cv-clip-${crypto.randomUUID()}.mp4`);
    uploaded.push(filepath);
    const task=new Promise((done,fail)=>{
     const sink=fs.createWriteStream(filepath,{flags:'wx'});
     stream.on('data',chunk=>{total+=chunk.length;if(total>MAX_TOTAL){invalid='גודל ההעלאה חורג מהמותר';stream.unpipe(sink);stream.resume();sink.destroy();}});
     stream.on('limit',()=>{invalid='קובץ גדול מדי';});
     stream.on('error',fail);sink.on('error',fail);sink.on('finish',done);
     stream.pipe(sink);
    });pending.push(task);
   });
   bb.on('filesLimit',()=>{invalid='יותר מדי סרטונים';});bb.on('partsLimit',()=>{invalid='יותר מדי שדות';});bb.on('error',reject);
   bb.on('finish',async()=>{try{await Promise.all(pending);resolve();}catch(e){reject(e);}});
   req.pipe(bb);
  });
  if(invalid)throw new Error(invalid);
  if(uploaded.length<2||uploaded.length>6)throw new Error('יש להעלות 2–6 סרטונים');
  const result=await produceCinematic({clips:uploaded,format});output=result.output;
  res.writeHead(200,{'Content-Type':'video/mp4','Content-Disposition':'attachment; filename="casa-verona-cinematic.mp4"','Content-Length':result.bytes,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  await new Promise((resolve,reject)=>{const s=fs.createReadStream(output);s.on('error',reject);res.on('close',resolve);res.on('finish',resolve);s.pipe(res);});
 }catch(e){console.error('CINEMATIC PRODUCTION ERROR:',e.message);json(400,{success:false,error:e.message||'הפקה נכשלה'});}
 finally{for(const f of uploaded){try{fs.rmSync(f,{force:true});}catch{}}if(output){try{fs.rmSync(output,{force:true});}catch{}}busy=false;}
}
module.exports={handleCinematic};

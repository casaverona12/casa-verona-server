"use strict";
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn,spawnSync} = require('node:child_process');
const {randomUUID} = require('node:crypto');
const {UPLOADS,EXPORTS} = require('./video-editor');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';
function safeFile(file) {
  if (typeof file !== 'string') throw new Error('INVALID_MEDIA_PATH');
  const absolute = path.resolve(file);
  const relative = path.relative(UPLOADS,absolute);
  if (!relative || relative === '..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative)) throw new Error('INVALID_MEDIA_PATH');
  return absolute;
}
function probe(file) {
  const result = spawnSync(FFPROBE,['-v','error','-select_streams','v:0','-show_entries','stream=width,height:format=duration','-of','json',file],{encoding:'utf8',timeout:15000,maxBuffer:65536});
  if(result.error || result.status !== 0) throw new Error('INVALID_VIDEO');
  let data; try {data=JSON.parse(result.stdout);}catch{throw new Error('INVALID_VIDEO');}
  const duration=Number(data.format?.duration), stream=data.streams?.[0];
  if(!stream || !Number.isInteger(stream.width) || !Number.isInteger(stream.height) || stream.width<100 || stream.height<100 || stream.width>4096 || stream.height>4096 || !Number.isFinite(duration) || duration<2 || duration>600) throw new Error('INVALID_VIDEO');
  return {duration,width:stream.width,height:stream.height};
}
function planShots(durations,target=30) {
  if(!Array.isArray(durations) || durations.length<2 || durations.length>6 || durations.some(x=>!Number.isFinite(x)||x<2)) throw new Error('INVALID_CLIPS');
  if(target!==30) throw new Error('UNSUPPORTED_DURATION');
  // Use repeated passes over clips, each shot at most 5 seconds; never repeat a clip's exact segment until necessary.
  const shots=[]; const consumed=durations.map(()=>0); let remaining=target, index=0;
  while(remaining>0.001) {
    const i=index%durations.length;
    const available=durations[i]-consumed[i];
    const take=Math.min(5,remaining,available);
    if(take>=0.5) {
      shots.push({clipIndex:i,start:Number(consumed[i].toFixed(3)),duration:Number(take.toFixed(3))});
      consumed[i]+=take;remaining-=take;
    }
    index++;
    if(index>100) throw new Error('INSUFFICIENT_FOOTAGE_FOR_30_SECONDS');
    if(index%durations.length===0 && durations.every((d,j)=>d-consumed[j]<0.5) && remaining>0.001) throw new Error('INSUFFICIENT_FOOTAGE_FOR_30_SECONDS');
  }
  return shots;
}
function run(args) {return new Promise((resolve,reject)=>{
  const child=spawn(FFMPEG,['-hide_banner','-loglevel','error','-nostdin','-y',...args],{stdio:['ignore','ignore','pipe']});
  let errors='';child.stderr.on('data',x=>errors=(errors+x).slice(-3000));child.on('error',reject);
  child.on('close',code=>code===0?resolve():reject(new Error('FFMPEG_FAILED: '+errors)));
});}
async function produceCinematic(options) {
  if(!options || !Array.isArray(options.clips) || options.clips.length<2 || options.clips.length>6) throw new Error('CLIPS_MUST_BE_2_TO_6');
  if(options.format && options.format!=='vertical') throw new Error('ONLY_VERTICAL_SUPPORTED');
  if(options.style && options.style!=='cinematic') throw new Error('ONLY_CINEMATIC_SUPPORTED');
  const clips=options.clips.map(safeFile);
  const durations=clips.map(f=>{if(!fs.existsSync(f))throw new Error('VIDEO_NOT_FOUND');return probe(f).duration;});
  const shots=planShots(durations,30);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cv-cinematic-'));
  const output=path.join(EXPORTS,`cv-cinematic-${randomUUID()}.mp4`);
  try {
    const parts=[];
    for(let i=0;i<shots.length;i++) {
      const shot=shots[i], part=path.join(temp,`shot-${String(i).padStart(2,'0')}.mp4`);
      const vf='scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=25,setsar=1,eq=contrast=1.045:saturation=0.94:brightness=0.005,format=yuv420p';
      await run(['-ss',String(shot.start),'-i',clips[shot.clipIndex],'-t',String(shot.duration),'-an','-vf',vf,'-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p',part]);
      parts.push(part);
    }
    const inputs=parts.flatMap(p=>['-i',p]);
    const filter=parts.map((_,i)=>`[${i}:v]`).join('')+`concat=n=${parts.length}:v=1:a=0[out]`;
    await run([...inputs,'-filter_complex',filter,'-map','[out]','-t','30','-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',output]);
    return {success:true,output,format:'vertical',style:'cinematic',targetSeconds:30,shots,bytes:fs.statSync(output).size};
  }catch(e){try{fs.unlinkSync(output);}catch{}throw e;}
  finally{fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={produceCinematic,planShots,safeFile};

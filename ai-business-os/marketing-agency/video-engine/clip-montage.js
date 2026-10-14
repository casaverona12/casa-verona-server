"use strict";
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawn, spawnSync} = require('node:child_process');
const {randomUUID} = require('node:crypto');
const {UPLOADS, EXPORTS} = require('./video-editor');
const FFMPEG = process.env.FFMPEG_PATH || (fs.existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg');
const FFPROBE = process.env.FFPROBE_PATH || (fs.existsSync('/opt/homebrew/bin/ffprobe') ? '/opt/homebrew/bin/ffprobe' : 'ffprobe');
function within(file, folder) {
  if (typeof file !== 'string') throw new Error('INVALID_MEDIA_PATH');
  const p = path.resolve(file), rel = path.relative(folder,p);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('INVALID_MEDIA_PATH');
  return p;
}
function validateOptions(options) {
  if (!options || !Array.isArray(options.clips) || options.clips.length < 2 || options.clips.length > 6) throw new Error('CLIPS_MUST_BE_2_TO_6');
  const format = options.format || 'vertical';
  if (!['vertical','square','horizontal'].includes(format)) throw new Error('INVALID_FORMAT');
  const sceneSeconds = Number(options.sceneSeconds ?? 4);
  if (!Number.isFinite(sceneSeconds) || sceneSeconds < 2 || sceneSeconds > 10) throw new Error('INVALID_SCENE_DURATION');
  return {format, sceneSeconds};
}
function probe(file) {
  const r = spawnSync(FFPROBE,['-v','error','-select_streams','v:0','-show_entries','stream=codec_type,width,height:format=duration','-of','json',file],{encoding:'utf8',timeout:10000,maxBuffer:65536});
  if (r.error || r.status !== 0) throw new Error('INVALID_VIDEO');
  let data; try {data=JSON.parse(r.stdout);} catch {throw new Error('INVALID_VIDEO');}
  const s=data.streams?.[0], d=Number(data.format?.duration);
  if (s?.codec_type!=='video' || !Number.isInteger(s.width) || !Number.isInteger(s.height) || s.width<100 || s.height<100 || s.width>4096 || s.height>4096 || !Number.isFinite(d) || d<2 || d>600) throw new Error('INVALID_VIDEO');
  return d;
}
function run(args) {return new Promise((resolve,reject)=>{
  const p=spawn(FFMPEG,['-hide_banner','-loglevel','error','-nostdin','-y',...args],{stdio:['ignore','ignore','pipe']});
  let err=''; p.stderr.on('data',x=>err=(err+x).slice(-2000)); p.on('error',reject); p.on('close',code=>code===0?resolve():reject(new Error('FFMPEG_FAILED: '+err)));
});}
async function produceClipMontage(options) {
  const {format,sceneSeconds}=validateOptions(options);
  const sizes={vertical:[720,1280],square:[720,720],horizontal:[1280,720]};
  const [w,h]=sizes[format];
  const clips=options.clips.map(f=>within(f,UPLOADS));
  clips.forEach(f=>{if(!fs.existsSync(f)) throw new Error('VIDEO_NOT_FOUND'); probe(f);});
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cv-clips-'));
  const output=path.join(EXPORTS,`cv-clips-${randomUUID()}.mp4`);
  try {
    const normalized=[];
    for(let i=0;i<clips.length;i++) {
      const target=path.join(temp,`clip-${i}.mp4`);
      const vf=`scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},fps=25,setsar=1,format=yuv420p`;
      await run(['-i',clips[i],'-t',String(sceneSeconds),'-an','-vf',vf,'-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p',target]);
      normalized.push(target);
    }
    const args=[]; normalized.forEach(f=>args.push('-i',f));
    const concat=normalized.map((_,i)=>`[${i}:v]`).join('')+`concat=n=${normalized.length}:v=1:a=0[out]`;
    await run([...args,'-filter_complex',concat,'-map','[out]','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',output]);
    return {success:true,output,clips:normalized.length,format,bytes:fs.statSync(output).size};
  } catch(e) {try{fs.unlinkSync(output);}catch{} throw e;}
  finally {fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={produceClipMontage,validateOptions,within};

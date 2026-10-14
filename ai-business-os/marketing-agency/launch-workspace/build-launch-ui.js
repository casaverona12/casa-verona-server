"use strict";

const fs = require("node:fs");
const path = require("node:path");

const source = path.join(
  __dirname,
  "local-data",
  "casa-verona--demo-verona-x-step79.json"
);

if (!fs.existsSync(source)) {
  throw new Error("Launch workspace file not found");
}

const launch = JSON.parse(fs.readFileSync(source, "utf8"));

if (
  launch.business_id !== "casa-verona" ||
  launch.product_id !== "demo-verona-x-step79"
) {
  throw new Error("Unexpected launch identity");
}

const data = JSON.stringify({
  launch_id: launch.launch_id,
  product_name: launch.product.name,
  video_concepts: launch.creative.video_concepts,
  carousel: launch.creative.carousel_concept,
  copy_drafts: launch.creative.copy_drafts,
  campaign: launch.campaign
}).replace(/</g, "\\u003c");

const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Casa Verona | ניהול השקה</title>
<style>
:root{
 --ink:#0c0c0b;--coal:#090909;--stone:#f2f0e9;
 --paper:#fbfaf6;--line:#d9d6ce;--wine:#6f1d2c;
 --muted:#74716a
}
*{box-sizing:border-box}
body{
 margin:0;background:var(--stone);color:var(--ink);
 font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif
}
.layout{display:flex;min-height:100vh}
aside{
 width:255px;flex-shrink:0;background:var(--coal);
 color:white;padding:30px 22px
}
.logo{font:25px Georgia,serif;letter-spacing:2px}
.logo small{
 display:block;font:10px Arial,sans-serif;
 letter-spacing:2px;color:#d49ba5;margin-top:12px
}
nav{margin-top:40px;display:grid;gap:9px}
nav a{
 color:#ccc;text-decoration:none;padding:14px;
 border-right:2px solid transparent
}
nav a:hover{background:#222}
main{flex:1;min-width:0;padding:35px}
.content{max-width:1180px;margin:auto}
h1,h2,h3{font-family:Georgia,serif;font-weight:400}
h1{font-size:40px}
h2{font-size:27px}
h3{font-size:22px}
p{line-height:1.8;color:var(--muted)}
.eyebrow{font-size:11px;letter-spacing:2px;color:var(--wine)}
.hero,.card{
 background:white;border:1px solid var(--line);padding:25px
}
.hero{margin:25px 0}
.section{margin-top:36px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.card{display:flex;flex-direction:column;gap:12px}
.status{font-size:12px;color:var(--wine)}
button{
 border:1px solid var(--line);background:white;
 padding:12px 16px;cursor:pointer;color:var(--ink)
}
button:hover{border-color:var(--wine)}
button.selected{background:var(--wine);color:white;border-color:var(--wine)}
textarea{
 width:100%;min-height:130px;padding:16px;
 border:1px solid var(--line);font:inherit;resize:vertical
}
.primary{background:var(--coal);color:white;border:0}
.notice{margin-top:16px;font-size:12px;color:var(--muted)}
.summary{
 display:grid;grid-template-columns:repeat(3,1fr);
 gap:12px;margin-top:20px
}
.metric{background:var(--paper);padding:20px;border:1px solid var(--line)}
.metric strong{display:block;font:28px Georgia,serif;margin-top:8px}
@media(max-width:850px){
 .layout{display:block}
 aside{width:100%;padding:20px}
 nav{display:flex;overflow:auto;margin-top:15px}
 main{padding:18px}
 .grid,.summary{grid-template-columns:1fr}
 h1{font-size:30px}
}
</style>
</head>
<body>
<div class="layout">
<aside>
 <div class="logo">CASA VERONA<small>AI MARKETING AGENCY</small></div>
 <nav>
  <a href="#overview">סקירת השקה</a>
  <a href="#videos">הפקות וידאו</a>
  <a href="#carousel">קרוסלה</a>
  <a href="#copy">קופירייטינג</a>
  <a href="#campaign">קמפיין ממומן</a>
  <a href="#feedback">הנחיות לצוות</a>
 </nav>
</aside>
<main>
<div class="content">
 <div class="eyebrow">PRODUCT LAUNCH WORKSPACE</div>
 <h1 id="title"></h1>
 <p>תיק השקה מקומי · תכנון קריאייטיב וקמפיינים ממומנים</p>

 <section class="hero" id="overview">
  <div class="eyebrow">CREATIVE DIRECTOR</div>
  <h2>סקירת השקה</h2>
  <p>המערכת הכינה תוכנית ראשונית. בחר רעיונות שתרצה לקדם להפקה.</p>
  <div class="summary">
   <div class="metric">רעיונות לסרטונים<strong id="videoCount"></strong></div>
   <div class="metric">מודעות מתוכננות<strong id="adCount"></strong></div>
   <div class="metric">רעיונות שנבחרו<strong id="selectedCount">0</strong></div>
  </div>
 </section>

 <section class="section" id="videos">
  <h2>הצעות לסרטונים</h2>
  <div class="grid" id="videoList"></div>
 </section>

 <section class="section" id="carousel">
  <h2>הצעת קרוסלה</h2>
  <div class="card" id="carouselCard"></div>
 </section>

 <section class="section" id="copy">
  <h2>קופירייטינג</h2>
  <div class="grid" id="copyList"></div>
 </section>

 <section class="section" id="campaign">
  <h2>תוכנית קמפיין ממומן</h2>
  <div class="card" id="campaignCard"></div>
 </section>

 <section class="section" id="feedback">
  <h2>הערות למנהל הקריאייטיב</h2>
  <textarea id="notes" placeholder="מה היית רוצה לשנות או לשפר?"></textarea>
  <p><button class="primary" id="save">שמור החלטות והערות</button></p>
  <div class="notice" id="message">הנתונים נשמרים בדפדפן הזה בלבד.</div>
 </section>
</div>
</main>
</div>

<script>
const DATA=${data};
const KEY="cv_launch_review_"+DATA.launch_id;
let review={selected:[],notes:""};

try{
 const saved=JSON.parse(localStorage.getItem(KEY)||"null");
 if(saved&&Array.isArray(saved.selected)&&typeof saved.notes==="string"){
  review=saved;
 }
}catch(e){console.warn("Review load failed",e)}

const el=id=>document.getElementById(id);
function element(tag,text,className){
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 if(className)node.className=className;
 return node;
}
function addText(parent,tag,text,className){
 const node=element(tag,text,className);
 parent.appendChild(node);
 return node;
}
function selectionButton(parent,id){
 const button=element("button");
 function refresh(){
  button.textContent=review.selected.includes(id)?"✓ נבחר להמשך":"בחר רעיון";
  button.classList.toggle("selected",review.selected.includes(id));
 }
 button.addEventListener("click",()=>{
  review.selected=review.selected.includes(id)
   ?review.selected.filter(x=>x!==id)
   :[...review.selected,id];
  refresh();
  updateCount();
 });
 refresh();
 parent.appendChild(button);
}
function updateCount(){
 el("selectedCount").textContent=review.selected.length;
}
el("title").textContent="השקת "+DATA.product_name;
el("videoCount").textContent=DATA.video_concepts.length;
el("adCount").textContent=DATA.campaign.ads.length;

DATA.video_concepts.forEach((video,index)=>{
 const card=element("article",undefined,"card");
 addText(card,"div","VIDEO CONCEPT "+(index+1),"eyebrow");
 addText(card,"h3",video.title);
 addText(card,"p",video.direction);
 addText(card,"div","טרם הופק סרטון","status");
 selectionButton(card,"video_"+index);
 el("videoList").appendChild(card);
});

const carousel=el("carouselCard");
addText(carousel,"h3",DATA.carousel.title);
DATA.carousel.slides.forEach((slide,i)=>{
 addText(carousel,"p",(i+1)+". "+slide);
});
selectionButton(carousel,"carousel");

DATA.copy_drafts.forEach((copy,index)=>{
 const card=element("article",undefined,"card");
 addText(card,"div",copy.placement,"eyebrow");
 addText(card,"h3",copy.headline);
 addText(card,"p",copy.primary_text);
 selectionButton(card,"copy_"+index);
 el("copyList").appendChild(card);
});

const campaign=el("campaignCard");
addText(campaign,"h3",DATA.campaign.campaign.name);
addText(campaign,"p","פלטפורמות: Facebook + Instagram");
addText(campaign,"p","מטרה: פניות לוואטסאפ");
addText(campaign,"p","תקציב יומי מוצע לבדיקה: "+DATA.campaign.ad_sets[0].daily_budget_ils+" ₪");
addText(campaign,"div","טיוטה בלבד — ללא חיבור ל־Meta","status");

el("notes").value=review.notes;
updateCount();

el("save").addEventListener("click",()=>{
 review.notes=el("notes").value;
 try{
  localStorage.setItem(KEY,JSON.stringify(review));
  el("message").textContent="✓ ההחלטות וההערות נשמרו בדפדפן.";
 }catch(e){
  el("message").textContent="לא ניתן לשמור בדפדפן.";
 }
});
</script>
</body>
</html>`;

const output = path.join(__dirname, "launch-workspace.html");
fs.writeFileSync(output, html, "utf8");

console.log("✅ INTERACTIVE LAUNCH WORKSPACE CREATED");
console.log("📄", output);
console.log("🎬 VIDEO CONCEPTS:", launch.creative.video_concepts.length);
console.log("📣 META ADS:", launch.campaign.ads.length);

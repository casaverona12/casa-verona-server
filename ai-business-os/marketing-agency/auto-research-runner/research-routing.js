'use strict';
// Headline-only triage. This does not inspect media or validate the linked article.
const FURNITURE = /\b(sofas?|couches?|sectionals?|loveseats?|armchairs?|chairs?|seating|upholster(?:y|ed)?|furniture|tables?|beds?|sideboards?|modular)\b|ספ(?:ה|ות)|כורס|רהיט|רהיטים|ריהוט|שולחנ|מיט(?:ה|ות)/i;
const PRODUCT = /\b(sofas?|couches?|sectionals?|loveseats?|armchairs?|seating|upholster(?:y|ed)?|furniture|tables?|beds?|sideboards?|modular|collection)\b|ספ(?:ה|ות)|כורס|רהיט|רהיטים|ריהוט|שולחנ|מיט(?:ה|ות)|קולקצי/i;
const MARKETING = /\b(advertis(?:ing|ement|e)?|campaigns?|commercials?|marketing|brand films?|reels?|promotional|ad spots?|creative strateg(?:y|ies))\b|פרסומ|קמפיי|סרטון פרסומ|שיווק/i;
const NOISE = /cheez.it|snoopy|analysts|football|basketball|real estate|architecture studio|house and studio|home tour|office planner|armadillo|inflatable chair|shingles|plinths/i;
const EXCLUDE = /\b(202[0-4] marketing trends|marketing trends furniture retailers need to know)\b/i;
function normTitle(t){return String(t).toLowerCase().replace(/\s*[-|–—]\s*[^-|–—]+$/,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
function score(title,dept,source){let n=0;const sofa=/\b(sofa|couch|sectional|modular seating)\b|ספ(?:ה|ות)/i.test(title);if(sofa)n+=4;else if(FURNITURE.test(title))n+=2;if(/\b(collection|launch(?:es|ed)?|debut|new|introduces?)\b|קולקצי|חדש/i.test(title))n+=1;if(dept==='marketing'&&MARKETING.test(title))n+=4;if(dept==='product_development'&&MARKETING.test(title))n-=5;if(source==='israel_furniture'||source==='israel_furniture_ads')n+=1;return n;}
function briefs(report){
 const product=[],marketing=[],seen=new Set();
 const jobs=Array.isArray(report?.jobs)?report.jobs:[];
 for(const job of jobs){
  for(const finding of Array.isArray(job?.findings)?job.findings:[]){
   if(!finding||typeof finding.title!=='string')continue;
   const title=finding.title.trim().slice(0,240);if(!title||NOISE.test(title)||EXCLUDE.test(title))continue;
   let url;try{url=new URL(finding.url);if(url.protocol!=='https:')continue;}catch{continue;}
   const key=normTitle(title);if(!key||seen.has(key))continue;seen.add(key);
   const source=String(finding.source||url.hostname).slice(0,80);
   const base={title,url:url.href,source,published_at:finding.published_at||null,verification:'UNVERIFIED',review_required:true};
   const isAd=MARKETING.test(title),isFurniture=FURNITURE.test(title);
   if(!isFurniture)continue;
   if(isAd){const priority=score(title,'marketing',source);if(priority>=5)marketing.push({...base,department:'marketing',priority,reason:'הכותרת עוסקת בפרסום בתחום הריהוט; יש לקרוא את המקור ולבדוק את הקריאייטיב לפני הסקת מסקנות.',next_step:'לבדוק מסר, קהל יעד ופורמט; להציע קריאייטיב מקורי ל-Casa Verona'});}
   else if(PRODUCT.test(title)){const priority=score(title,'product_development',source);if(priority>=3)product.push({...base,department:'product_development',priority,reason:'הכותרת מצביעה על מוצר או קולקציה; טרם נבדקו תמונות, ביקוש או היתכנות.',next_step:'לבדוק דגם ומפרט במקור ולגבש כיוון מקורי, לא העתקה'});}
  }
 }
 const sort=(a,b)=>b.priority-a.priority||a.title.localeCompare(b.title);
 return {product_development:product.sort(sort).slice(0,8),marketing:marketing.sort(sort).slice(0,8),note:'Headline-only triage; unverified. No media analysis, competitor performance claims or social API integration.'};
}
module.exports={briefs};

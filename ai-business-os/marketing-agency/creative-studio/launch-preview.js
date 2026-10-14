"use strict";

const fs = require("node:fs");
const path = require("node:path");

const {
  createLaunchFromApprovedDesign
} = require("../product-launch/product-launch-engine");

const {
  createCreativeLaunchPlan
} = require("../creative-director/launch-creative-director");

const launch = createLaunchFromApprovedDesign({
  business_id: "casa-verona",
  product_id: "demo-verona-x",
  product_name: "Verona X",
  design_approved: true,
  design_approval_id: "DEMO-ONLY",
  assets: []
});

const plan = createCreativeLaunchPlan(launch);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

const videoCards = plan.video_concepts.map(video => `
  <article class="card">
    <div class="eyebrow">VIDEO CONCEPT · ${escapeHTML(video.aspect_ratio)}</div>
    <h3>${escapeHTML(video.title)}</h3>
    <p>${escapeHTML(video.direction)}</p>
    <span class="status">רעיון להפקה · טרם נוצר סרטון</span>
  </article>
`).join("");

const copyCards = plan.copy_drafts.map(copy => `
  <article class="card">
    <div class="eyebrow">${escapeHTML(copy.placement)}</div>
    <h3>${escapeHTML(copy.headline)}</h3>
    <p>${escapeHTML(copy.primary_text)}</p>
    <div class="cta">${escapeHTML(copy.call_to_action)}</div>
  </article>
`).join("");

const slides = plan.carousel_concept.slides.map((slide, i) => `
  <div class="slide">
    <strong>${String(i + 1).padStart(2, "0")}</strong>
    <span>${escapeHTML(slide)}</span>
  </div>
`).join("");

const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Casa Verona | תיק השקה</title>
<style>
:root {
  --ink:#0c0c0b;
  --coal:#090909;
  --stone:#f2f0e9;
  --paper:#fbfaf6;
  --line:#d9d6ce;
  --wine:#6f1d2c;
  --muted:#74716a;
}
* {box-sizing:border-box}
body {
  margin:0;background:var(--stone);color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
}
.layout {display:flex;min-height:100vh}
aside {width:250px;flex-shrink:0;background:var(--coal);color:#fff;padding:32px 22px}
.logo {font:25px Georgia,serif;letter-spacing:2px}
.logo small {display:block;font:10px Arial,sans-serif;letter-spacing:2px;color:#d49ba5;margin-top:12px}
nav {margin-top:45px;display:grid;gap:12px}
nav a {text-decoration:none;color:#d0cbc5;padding:13px;border-right:2px solid transparent}
nav a.active {color:#fff;background:#1c1b1b;border-color:#9b4253}
main {flex:1;min-width:0;padding:38px}
.content {max-width:1200px;margin:auto}
.eyebrow {font-size:11px;letter-spacing:1.5px;color:var(--wine)}
h1,h2,h3 {font-family:Georgia,serif;font-weight:400}
h1 {font-size:42px;margin:12px 0}
h2 {font-size:27px}
h3 {font-size:22px;margin:15px 0}
p {color:var(--muted);line-height:1.8}
.hero {background:var(--paper);padding:32px;border:1px solid var(--line);margin:24px 0}
.badge {display:inline-block;padding:9px 12px;background:#f1e5e7;color:var(--wine);font-size:12px}
.grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
.card {background:#fff;border:1px solid var(--line);padding:25px}
.section {margin-top:38px}
.status {display:inline-block;margin-top:12px;color:var(--wine);font-size:12px}
.slides {display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.slide {min-height:145px;background:#fff;border:1px solid var(--line);padding:18px;display:flex;flex-direction:column;gap:18px}
.slide strong {font:28px Georgia,serif;color:var(--wine)}
.slide span {font-size:13px;line-height:1.6}
.cta {border-top:1px solid var(--line);padding-top:14px;font-size:12px}
.note {font-size:12px;margin-top:40px}
@media(max-width:900px) {
  .layout {display:block}
  aside {width:100%;padding:20px}
  nav {display:flex;overflow:auto;margin-top:20px}
  main {padding:18px}
  .grid {grid-template-columns:1fr}
  .slides {grid-template-columns:repeat(2,minmax(0,1fr))}
  h1 {font-size:32px}
}
</style>
</head>
<body>
<div class="layout">
<aside>
  <div class="logo">CASA VERONA<small>AI MARKETING AGENCY</small></div>
  <nav>
    <a class="active" href="#overview">תיק השקה</a>
    <a href="#videos">הפקות וידאו</a>
    <a href="#carousel">קרוסלה</a>
    <a href="#copy">קופירייטינג</a>
    <a href="#campaign">תוכנית קמפיין</a>
  </nav>
</aside>
<main>
<div class="content">
  <div class="eyebrow">PRODUCT TO MARKET / DEMO</div>
  <h1>תיק השקה — ${escapeHTML(plan.product_name)}</h1>
  <p>תוכנית קריאייטיב שנוצרה ממנוע התכנון המקומי.</p>

  <section class="hero" id="overview">
    <span class="badge">טיוטה · לא אושר לפרסום</span>
    <h2>אסטרטגיית ההשקה</h2>
    <p>מטרה: יצירת פניות איכותיות בוואטסאפ באמצעות שילוב סרטונים וקרוסלות.</p>
    <p>ערוץ מוצע: ${escapeHTML(plan.strategy.primary_channel)}</p>
  </section>

  <section class="section" id="videos">
    <div class="eyebrow">CREATIVE PRODUCTION</div>
    <h2>הצעות להפקות וידאו</h2>
    <div class="grid">${videoCards}</div>
  </section>

  <section class="section" id="carousel">
    <div class="eyebrow">CAROUSEL CREATIVE</div>
    <h2>${escapeHTML(plan.carousel_concept.title)}</h2>
    <div class="slides">${slides}</div>
  </section>

  <section class="section" id="copy">
    <div class="eyebrow">COPYWRITING</div>
    <h2>טקסטים מוכנים לבדיקה</h2>
    <div class="grid">${copyCards}</div>
  </section>

  <section class="section" id="campaign">
    <div class="eyebrow">CAMPAIGN STRATEGY</div>
    <h2>המלצת קמפיין</h2>
    <article class="card">
      <h3>${escapeHTML(plan.campaign_recommendation.platform)} — WhatsApp</h3>
      <p>בדיקת קריאייטיב: סרטון מול קרוסלה.</p>
      <p>קהל ותקציב ייקבעו לאחר מחקר ואישור.</p>
      <span class="status">טיוטה בלבד · ללא פרסום או הוצאה כספית</span>
    </article>
  </section>

  <p class="note">הדגמה מקומית עם מוצר לדוגמה. לא בוצעו מחקר שוק, הפקת וידאו או פרסום בפועל.</p>
</div>
</main>
</div>
</body>
</html>`;

const output = path.join(__dirname, "launch-preview.html");
fs.writeFileSync(output, html, "utf8");

console.log("✅ LAUNCH PREVIEW CREATED");
console.log("🎬 VIDEO CONCEPTS:", plan.video_concepts.length);
console.log("🖼️ CAROUSEL SLIDES:", plan.carousel_concept.slides.length);
console.log("📝 COPY DRAFTS:", plan.copy_drafts.length);
console.log("📄 FILE:", output);

"use strict";

const MARKETING_AGENCY = Object.freeze({
  name: "Casa Verona Marketing Agency",
  version: "1.0",

  director: {
    id: "marketing-command",
    name: "מפקדת השיווק",
    title: "AI Marketing Director"
  },

  departments: [
    {
      id: "brand",
      name: "מותג ומחקר",
      title: "BRAND INTELLIGENCE",
      icon: "brand",
      agents: [
        ["brand-dna", "זהות המותג"],
        ["market-research", "מחקר שוק ומתחרים"],
        ["audience", "קהלי יעד ולקוחות"],
        ["reputation", "מוניטין וחוויית מותג"]
      ]
    },
    {
      id: "creative",
      name: "קריאייטיב ותוכן",
      title: "CREATIVE STUDIO",
      icon: "creative",
      agents: [
        ["creative-studio", "סטודיו קריאייטיב"],
        ["social-media", "ניהול תוכן ורשתות"],
        ["product-launch", "השקות מוצרים"]
      ]
    },
    {
      id: "campaigns",
      name: "קמפיינים ותקציבים",
      title: "CAMPAIGN MANAGEMENT",
      icon: "campaigns",
      agents: [
        ["campaign-manager", "מנהל קמפיינים ממומנים"],
        ["budget-control", "תקציבים ובקרה"]
      ]
    },
    {
      id: "growth",
      name: "צמיחה והמרות",
      title: "GROWTH INTELLIGENCE",
      icon: "growth",
      agents: [
        ["performance", "אנליסט ביצועים והמרות"],
        ["conversion", "מומחה להגדלת המרות"],
        ["experiments", "מעבדת ניסויים וצמיחה"]
      ]
    }
  ]
});

module.exports = { MARKETING_AGENCY };

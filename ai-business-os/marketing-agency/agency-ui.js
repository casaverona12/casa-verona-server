"use strict";

/*
 * CASA VERONA — MARKETING AGENCY UI
 * Local UI module. No network requests or data changes.
 */

(function (root) {
  const DEPARTMENTS = [
    {
      id: "brand",
      name: "מותג ומחקר",
      title: "BRAND INTELLIGENCE",
      description: "זהות המותג, מחקר שוק, קהלי יעד ומוניטין.",
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
      description: "יצירת תוכן, סרטונים, קרוסלות והשקות מוצרים.",
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
      description: "בניית קמפיינים ממומנים, ייעוץ ותקציבי פרסום.",
      agents: [
        ["campaign-manager", "מנהל קמפיינים ממומנים"],
        ["budget-control", "תקציבים ובקרה"]
      ]
    },
    {
      id: "growth",
      name: "צמיחה והמרות",
      title: "GROWTH INTELLIGENCE",
      description: "ביצועים, הגדלת אחוזי המרה וניסויים.",
      agents: [
        ["performance", "אנליסט ביצועים והמרות"],
        ["conversion", "מומחה להגדלת המרות"],
        ["experiments", "מעבדת ניסויים וצמיחה"]
      ]
    }
  ];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function createAgency(rootElement) {
    if (!rootElement) return;

    rootElement.replaceChildren();
    rootElement.classList.add("cv-ma");

    const hero = el("div", "cv-ma-hero");
    hero.append(
      el("small", "cv-ma-eyebrow", "CASA VERONA · PRIVATE AGENCY"),
      el("h1", "", "Marketing Studio"),
      el("p", "", "סוכנות שיווק חכמה לבניית המותג, יצירת ביקוש והגדלת מכירות.")
    );

    const content = el("div", "cv-ma-grid");
    const back = el("button", "cv-ma-back", "חזרה למפקדת השיווק");
    back.type = "button";
    back.hidden = true;

    const subtitle = el("p", "", "");
    subtitle.style.marginTop = "20px";
    subtitle.style.color = "#a9a49d";

    rootElement.append(hero, back, subtitle, content);

    function showHome() {
      back.hidden = true;
      subtitle.textContent = "בחר אגף כדי להיכנס למחלקות השיווק.";
      content.replaceChildren();

      const director = el("button", "cv-ma-card");
      director.type = "button";
      director.append(
        el("small", "", "AI MARKETING DIRECTOR"),
        el("strong", "", "מפקדת השיווק"),
        el("span", "", "אסטרטגיה, החלטות, משימות ותיאום בין המחלקות.")
      );
      director.addEventListener("click", () => {
        showAgent("מפקדת השיווק");
      });
      content.append(director);

      DEPARTMENTS.forEach(department => {
        const card = el("button", "cv-ma-card");
        card.type = "button";
        card.append(
          el("small", "", department.title),
          el("strong", "", department.name),
          el("span", "", department.description)
        );
        card.addEventListener("click", () => showDepartment(department));
        content.append(card);
      });
    }

    function showDepartment(department) {
      back.hidden = false;
      back.onclick = showHome;
      subtitle.textContent = department.name;
      content.replaceChildren();

      department.agents.forEach(agent => {
        const card = el("button", "cv-ma-card");
        card.type = "button";
        card.append(
          el("small", "", "CASA VERONA · AI DEPARTMENT"),
          el("strong", "", agent[1]),
          el("span", "", "כניסה לסביבת העבודה של המחלקה.")
        );
        card.addEventListener("click", () => {
          if (agent[0] === "creative-studio") {
            window.location.assign("/marketing/video-studio");
            return;
          }
          showAgent(agent[1], department);
        });
        content.append(card);
      });
    }

    function showAgent(name, department) {
      back.hidden = false;
      back.onclick = showHome;

      subtitle.textContent = name;
      content.replaceChildren();

      const panel = el("div", "cv-ma-card");
      panel.style.cursor = "default";
      panel.append(
        el("small", "", "DEPARTMENT WORKSPACE"),
        el("strong", "", name),
        el("span", "", "סביבת העבודה בהקמה. בהמשך יתווספו הגדרות, יועץ AI, משימות ותוצאות.")
      );

      if (
        name === "מנהל קמפיינים ממומנים" &&
        window.CasaVeronaCampaignWorkspace &&
        window.CasaVeronaCampaignWorkspace.createWorkspace(content)
      ) {
        return;
      }

      content.append(panel);
    }

    back.addEventListener("click", () => {
      if (typeof back.onclick !== "function") showHome();
    });

    showHome();
  }

  root.CasaVeronaMarketingAgency = {
    createAgency,
    departments: DEPARTMENTS
  };
})(typeof window !== "undefined" ? window : globalThis);

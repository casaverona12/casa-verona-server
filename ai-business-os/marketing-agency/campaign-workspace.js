"use strict";

/*
 * CASA VERONA — CAMPAIGN DIRECTOR WORKSPACE
 * UI only. No advertising, API calls or database changes.
 */

(function (root) {
  function createWorkspace(container) {
    const planner = root.CasaVeronaCampaignPlanner;

    if (!container || !planner) return false;

    const draft = planner.createDraft();

    container.replaceChildren();

    const workspace = document.createElement("div");
    workspace.className = "cv-campaign-workspace";

    const title = document.createElement("h2");
    title.textContent = "AI Campaign Director";

    const intro = document.createElement("p");
    intro.textContent =
      "תכנון קמפיינים, אסטרטגיה וייעוץ שיווקי ל־Casa Verona.";

    const layout = document.createElement("div");
    layout.className = "cv-campaign-layout";

    const plannerPanel = document.createElement("section");
    plannerPanel.className = "cv-campaign-panel";

    const plannerTitle = document.createElement("h3");
    plannerTitle.textContent = "תכנון קמפיין חדש";

    const form = document.createElement("form");
    form.className = "cv-campaign-form";

    function field(labelText, input) {
      const label = document.createElement("label");
      label.className = "cv-campaign-field";

      const text = document.createElement("span");
      text.textContent = labelText;

      label.append(text, input);
      form.append(label);
      return input;
    }

    function input(type, value) {
      const element = document.createElement("input");
      element.type = type;
      element.value = value;
      return element;
    }

    function select(options, value) {
      const element = document.createElement("select");

      options.forEach(([key, text]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = text;
        element.append(option);
      });

      element.value = value;
      return element;
    }

    field("מטרת הקמפיין", select([
      ["whatsapp", "פניות לוואטסאפ"]
    ], draft.objective));

    const budget = field(
      "תקציב יומי (₪)",
      input("number", draft.dailyBudget)
    );
    budget.min = "1";

    const days = field(
      "משך הקמפיין (ימים)",
      input("number", draft.durationDays)
    );
    days.min = "1";
    days.step = "1";

    const audience = field(
      "קהל יעד",
      input("text", draft.audience)
    );

    const product = field(
      "מוצר או דגם",
      input("text", draft.product)
    );
    product.placeholder = "לדוגמה: Mon Cheri";

    field("סוג מודעה", select([
      ["carousel", "קרוסלה"],
      ["video", "סרטון"]
    ], draft.format));

    const summary = document.createElement("div");
    summary.className = "cv-campaign-summary";
    summary.setAttribute("role", "status");
    summary.setAttribute("aria-live", "polite");

    function updateBudget() {
      const result = planner.estimateBudget(
        planner.createDraft({
          dailyBudget: budget.value,
          durationDays: days.value,
          audience: audience.value,
          product: product.value
        })
      );

      summary.textContent = result.valid
        ? "תקציב מתוכנן: " +
          result.totalBudget.toLocaleString("he-IL") +
          " ₪"
        : result.errors.join(" · ");
    }

    form.addEventListener("input", updateBudget);
    form.addEventListener("change", updateBudget);
    form.addEventListener("submit", e => e.preventDefault());

    const planningNote = document.createElement("p");
    planningNote.textContent =
      "טיוטה זמנית בלבד. אין שמירה או פרסום בפועל.";

    plannerPanel.append(
      plannerTitle, form, summary, planningNote
    );

    const aiPanel = document.createElement("section");
    aiPanel.className = "cv-campaign-panel";

    const aiTitle = document.createElement("h3");
    aiTitle.textContent = "יועץ הקמפיינים AI";

    const aiDescription = document.createElement("p");
    aiDescription.textContent =
      "כאן תוכל להתייעץ בחופשיות על תקציבים, קהלים, קריאייטיב, אסטרטגיה והמרות.";


    // MARKETING_CHAT_CONNECTED
    const aiStatus = document.createElement("p");
    aiStatus.textContent = "מנהל השיווק מוכן לשיחה.";

    const history = document.createElement("div");
    history.className = "cv-marketing-chat-history";
    history.setAttribute("role", "log");
    history.setAttribute("aria-live", "polite");

    const messages = [];

    function addBubble(role, text) {
      const bubble = document.createElement("div");
      bubble.className =
        "cv-marketing-chat-bubble cv-marketing-chat-" + role;
      bubble.textContent = text;
      history.append(bubble);
      history.scrollTop = history.scrollHeight;
      return bubble;
    }

    addBubble(
      "assistant",
      "שלום! אני מנהל השיווק AI של Casa Verona. " +
      "אפשר להתייעץ איתי על מיתוג, תקציבים, " +
      "קמפיינים, קריאייטיב והגדלת מכירות. במה נתחיל?"
    );

    const message = document.createElement("textarea");
    message.placeholder =
      "לדוגמה: יש לי 5,000 ₪ בחודש. איך כדאי לפרסם?";
    message.rows = 3;
    message.maxLength = 3500;

    const send = document.createElement("button");
    send.type = "button";
    send.textContent = "שלח למנהל השיווק";

    let busy = false;

    async function sendMessage() {
      const text = message.value.trim();
      if (!text || busy) return;

      const context = [
        "טיוטת הקמפיין הנוכחית:",
        "מטרה: פניות לוואטסאפ",
        "תקציב יומי: " + budget.value + " ₪",
        "משך: " + days.value + " ימים",
        "קהל יעד: " + audience.value,
        "מוצר: " + product.value
      ].join("\\n");

      const userContent = context + "\\n\\nשאלת המשתמש:\\n" + text;

      const previousMessages = messages.slice(-18);
      const outgoing = [
        ...previousMessages,
        { role: "user", content: userContent }
      ];

      if (userContent.length > 4000) {
        aiStatus.textContent = "ההודעה ארוכה מדי. קצר את השאלה.";
        return;
      }

      busy = true;
      send.disabled = true;
      message.disabled = true;
      aiStatus.textContent = "מנהל השיווק חושב...";

      addBubble("user", text);
      const waiting = addBubble("assistant", "מכין תשובה...");

      try {
        const response = await fetch("/api/ai/marketing/consult", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: outgoing })
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.answer) {
          throw new Error(data.error || "AI_REQUEST_FAILED");
        }

        waiting.textContent = data.answer;

        messages.push(
          { role: "user", content: userContent },
          { role: "assistant", content: data.answer }
        );

        while (messages.length > 18) messages.shift();

        message.value = "";
        aiStatus.textContent = "מוכן להמשיך בשיחה.";

      } catch (error) {
        waiting.textContent =
          "לא הצלחתי לקבל תשובה כרגע. נסה שוב בעוד רגע.";
        aiStatus.textContent =
          "שגיאת חיבור: " + error.message;
      } finally {
        busy = false;
        send.disabled = false;
        message.disabled = false;
        message.focus();
        history.scrollTop = history.scrollHeight;
      }
    }

    send.addEventListener("click", sendMessage);

    message.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    aiPanel.append(
      aiTitle, aiDescription, aiStatus, history, message, send
    );

    layout.append(plannerPanel, aiPanel);
    workspace.append(title, intro, layout);
    container.append(workspace);

    updateBudget();
    return true;
  }

  root.CasaVeronaCampaignWorkspace = {
    createWorkspace
  };
})(typeof window !== "undefined" ? window : globalThis);

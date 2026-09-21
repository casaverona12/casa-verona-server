const http = require("http");
const fs = require("fs");
const path = require("path");

// =====================================
// ENV
// =====================================

const envPath = path.join(__dirname, ".env");

if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, "utf8");

  envText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) return;

    const index = trimmed.indexOf("=");
    if (index === -1) return;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();

    process.env[key] = value;
  });
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID;

// =====================================
// CATALOG
// =====================================

function loadCatalog() {
  try {
    const catalogPath = path.join(__dirname, "catalog.json");

    if (!fs.existsSync(catalogPath)) {
      return {
        brand: "Casa Verona",
        currency: "ILS",
        products: []
      };
    }

    return JSON.parse(
      fs.readFileSync(catalogPath, "utf8")
    );
  } catch (error) {
    console.error("CATALOG LOAD ERROR:", error);

    return {
      brand: "Casa Verona",
      currency: "ILS",
      products: []
    };
  }
}

function getCatalog() {
  return loadCatalog();
}

// =====================================
// HELPERS
// =====================================

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(JSON.stringify(data));
}

function serveHtml(res, filename) {
  const filePath = path.join(__dirname, filename);

  fs.readFile(filePath, "utf8", (error, html) => {
    if (error) {
      res.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8"
      });

      res.end("Page not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });

    res.end(html);
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

// =====================================
// OPENAI
// =====================================

function extractOutputText(data) {
  let text = data.output_text || "";

  if (!text && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (!Array.isArray(item.content)) continue;

      for (const content of item.content) {
        if (
          content.type === "output_text" &&
          content.text
        ) {
          text += content.text;
        }
      }
    }
  }

  return text.trim();
}

async function callOpenAI(input) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY חסר");
  }

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },

      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("OPENAI ERROR:", data);

    throw new Error(
      data.error?.message || "OpenAI API error"
    );
  }

  return extractOutputText(data);
}

// =====================================
// BRAIN
// =====================================

async function analyzeLead(message, conversation = []) {
  const catalog = getCatalog();

  const input = `
אתה Casa Verona Brain.

אתה המוח הפנימי של מערכת המכירות.
אתה מנתח את הלקוח ומחליט
מה הצעד הבא הנכון.

אתה לא מדבר עם הלקוח.

=========================
CATALOG
=========================

${JSON.stringify(catalog, null, 2)}

=========================
CONVERSATION
=========================

${JSON.stringify(conversation, null, 2)}

=========================
CURRENT MESSAGE
=========================

${message}

=========================
SALES STAGES
=========================

NEW
DISCOVERY
PRODUCT_MATCH
CONFIGURATION
PRICE
OBJECTION
QUOTE_READY
READY_TO_BUY
HUMAN_HANDOFF

=========================
CORE SALES FLOW
=========================

Casa Verona עובדת לפי העיקרון הבא:

AI מחמם את הליד,
מבין מה הוא מחפש,
מזהה דגם,
ואוסף מידע בסיסי.

כאשר הלקוח רוצה מחיר
על רהיט בהתאמה אישית:

1. זהה את הדגם.
2. אם עדיין לא ידועה המידה
   שהלקוח צריך:
   next_action = ASK_SIZE
3. כאשר הדגם ידוע
   והלקוח כבר מסר מידה:
   אין צורך שה-AI ינסה לתמחר.
4. בשלב הזה:
   stage = HUMAN_HANDOFF
   next_action = HUMAN_QUOTE
   needs_human = true
   quote_ready = true

המטרה:
להעביר לנציג ליד חם
עם המידע שכבר נאסף.

=========================
IMPORTANT
=========================

אל תבקש צבע או בד
רק כדי לעכב את ההעברה לנציג.

אם צבע או בד כבר עלו
באופן טבעי בשיחה,
שמור אותם.

אבל עבור בקשת מחיר,
דגם + מידה מספיקים
כדי לבצע HUMAN_HANDOFF
לנציג שימשיך את ההצעה.

=========================
PRICE REQUEST
=========================

אם הלקוח שואל:

"כמה עולה?"
"מה המחיר?"
"מחיר?"
"כמה זה?"
"אני רוצה הצעת מחיר"

והדגם ידוע:

אם requested_size = null:
stage = PRICE
next_action = ASK_SIZE
needs_human = false
quote_ready = false

אם requested_size קיים:
stage = HUMAN_HANDOFF
next_action = HUMAN_QUOTE
needs_human = true
quote_ready = true

=========================
MEMORY
=========================

חפש מידע גם בהודעה הנוכחית
וגם בכל היסטוריית השיחה.

אם הלקוח כבר מסר:

דגם
מידה
צבע
בד
תקציב

שמור אותם.

אל תאבד מידע
רק בגלל שהוא לא הופיע
בהודעה האחרונה.

=========================
SIZE
=========================

requested_size הוא
המידה שהלקוח רוצה.

דוגמאות:

"3 מטר"
"3 על 2"
"2.80"
"בערך 3 וחצי"
"יש לי קיר 3.20"

אל תבלבל בין
standard_size של המוצר
לבין requested_size של הלקוח.

=========================
TEMPERATURE
=========================

COLD:
התעניינות כללית.

WARM:
התעניינות אמיתית
במוצר, דגם, מחיר,
מידה או התאמה.

HOT:
כוונת רכישה חזקה.

לדוגמה:

"רוצה להזמין"
"איך סוגרים?"
"איך משלמים?"
"אם המחיר מתאים אני מזמין"
"רוצה להתקדם"

=========================
OBJECTION
=========================

אפשרויות:

PRICE
TRUST
DELIVERY
SIZE
QUALITY
PAYMENT
TIME
UNCERTAINTY

אם אין:
""

עצם השאלה
"כמה עולה?"
אינה התנגדות PRICE.

=========================
NEXT ACTION
=========================

בחר פעולה אחת:

ASK_PRODUCT
ASK_SIZE
ANSWER_PRODUCT_INFO
OFFER_CATALOG
HANDLE_OBJECTION
HUMAN_QUOTE
ADVANCE_ORDER

=========================
CATALOG OFFER
=========================

should_offer_catalog = true
כאשר הלקוח לא החליט על דגם,
מבקש לראות אפשרויות,
או מבקש קטלוג.

=========================
TRUTH
=========================

אסור להמציא:

מחיר
מבצע
הנחה
מלאי
זמינות
חומר
בד
מידה
משלוח
זמן אספקה
אחריות
תשלום

הקטלוג והשיחה
הם מקור האמת.

=========================
OUTPUT
=========================

החזר JSON תקין בלבד:

{
  "stage": "NEW",
  "intent": "GENERAL",
  "product": "unknown",
  "matched_product_id": null,
  "requested_size": null,
  "requested_color": null,
  "requested_fabric": null,
  "budget": null,
  "temperature": "COLD",
  "buying_signal": 0,
  "objection": "",
  "missing_information": [],
  "next_action": "",
  "needs_human": false,
  "should_offer_catalog": false,
  "quote_ready": false,
  "handoff_reason": null,
  "summary": ""
}

INTENT:

PRICE
PRODUCT_INFO
DELIVERY
CUSTOMIZATION
ORDER
PAYMENT
AVAILABILITY
CATALOG
GENERAL

כאשר stage = HUMAN_HANDOFF
בגלל מחיר:

handoff_reason = "PRICE_REQUEST"

וה-summary צריך להיות
תקציר קצר וברור לנציג.

לדוגמה רעיונית:

"מתעניין ב-Torino Moderno,
צריך בערך 3 מטר,
מבקש הצעת מחיר."

אל תוסיף מידע שלא נאמר.

ללא markdown.
ללא הסברים.
`;

  const text = await callOpenAI(input);

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("BRAIN JSON ERROR:", cleaned);

    return {
      stage: "NEW",
      intent: "GENERAL",
      product: "unknown",
      matched_product_id: null,
      requested_size: null,
      requested_color: null,
      requested_fabric: null,
      budget: null,
      temperature: "COLD",
      buying_signal: 0,
      objection: "",
      missing_information: [],
      next_action: "MANUAL_REVIEW",
      needs_human: false,
      should_offer_catalog: false,
      quote_ready: false,
      handoff_reason: null,
      summary: "לא ניתן היה לנתח את הליד."
    };
  }
}

// =====================================
// HANDOFF ENGINE
// =====================================

function createHandoff(analysis, conversation = []) {
  if (
    !analysis ||
    analysis.stage !== "HUMAN_HANDOFF" ||
    !analysis.needs_human
  ) {
    return null;
  }

  return {
    status: "WAITING_FOR_HUMAN",

    reason:
      analysis.handoff_reason ||
      "MANUAL_REVIEW",

    product:
      analysis.product || "unknown",

    product_id:
      analysis.matched_product_id || null,

    requested_size:
      analysis.requested_size || null,

    requested_color:
      analysis.requested_color || null,

    requested_fabric:
      analysis.requested_fabric || null,

    budget:
      analysis.budget || null,

    temperature:
      analysis.temperature || "WARM",

    buying_signal:
      analysis.buying_signal || 0,

    summary:
      analysis.summary ||
      "לקוח ממתין לנציג.",

    conversation,

    created_at:
      new Date().toISOString()
  };
}

// =====================================
// HUMAN SALES AGENT
// =====================================

async function getAIAnswer(
  message,
  businessData = {}
) {
  const catalog = getCatalog();

  const conversation =
    Array.isArray(businessData.conversation)
      ? businessData.conversation
      : [];

  const analysis =
    businessData.currentLeadAnalysis || {};

  const input = `
אתה איש המכירות של Casa Verona
בשיחת WhatsApp אמיתית.

אתה נשמע כמו אדם אמיתי,
לא כמו AI ולא כמו מוקד.

=========================
STYLE
=========================

עברית טבעית.
קצרה.
נעימה.
בטוחה.
מקצועית.

בדרך כלל 1-3 משפטים.

אל תכתוב נאומים.

אל תשאל כמה שאלות יחד.

אל תחזור על מידע
שהלקוח כבר נתן.

=========================
AVOID ROBOTIC LANGUAGE
=========================

הימנע ככל האפשר מ:

"בשמחה"
"כמובן"
"בהחלט"
"ניתן"
"ישנה אפשרות"
"אשמח לסייע"
"על מנת"
"בהתאם לצרכים שלך"

=========================
CATALOG
=========================

${JSON.stringify(catalog, null, 2)}

הקטלוג הוא מקור אמת.

=========================
BRAIN ANALYSIS
=========================

${JSON.stringify(analysis, null, 2)}

=========================
CONVERSATION
=========================

${JSON.stringify(conversation, null, 2)}

=========================
CURRENT MESSAGE
=========================

${message}

=========================
SALES FLOW RULES
=========================

פעל לפי next_action
של ה-Brain.

אם next_action = ASK_SIZE:

הלקוח ביקש מחיר
אבל עדיין צריך להבין
איזו מידה הוא רוצה.

שאל על המידה
בצורה טבעית.

אם זו תחילת השיחה
אפשר לפתוח:

"היי, מה שלומך?"

לדוגמה לסגנון בלבד:

"היי, מה שלומך?
איזה מידה אתה צריך בערך?
ככה נדייק לך את ההצעה."

אל תעתיק תמיד
את אותו משפט.

=========================
HUMAN QUOTE
=========================

אם:

stage = HUMAN_HANDOFF

וגם:

next_action = HUMAN_QUOTE

אז הלקוח כבר נתן
את המידע הדרוש
כדי שנציג ימשיך.

במקרה כזה:

אל תשאל עוד
על מחיר.

אל תשאל שוב מידה.

אל תתחיל למכור
את המוצר מחדש.

אל תציע "לשלוח פרטים".

אל תשאל צבע או בד
סתם כדי להמשיך שיחה.

אמור בצורה קצרה וטבעית
שהפרטים עוברים לנציג
שייתן מחיר מדויק
ויסביר על האפשרויות.

דוגמה לסגנון בלבד:

"מעולה, 3 מטר 👍
אני מעביר את הפרטים לנציג שלנו,
הוא ייתן לך מחיר מדויק
ויעבור איתך על האפשרויות."

מותר לומר "אני מעביר"
רק כאשר ה-Brain
באמת סימן HUMAN_HANDOFF,
כי במקרה הזה השרת
יוצר רשומת Handoff.

=========================
PRICE
=========================

אם price = null:

אסור לתת מספר.

אסור להמציא טווח.

אסור להמציא נוסחת תמחור.

אסור לומר שהמחיר משתנה
לפי מידה, בד או צבע
אלא אם המידע הזה
קיים במפורש בנתונים.

=========================
PRODUCT INFORMATION
=========================

אם standard_size קיים:
מותר לציין אותו.

אם custom_sizes = true:
מותר לומר
שאפשר להתאים מידה.

אם הקטלוג אומר
שכל הצבעים אפשריים:
מותר לומר זאת.

אם הקטלוג אומר
שכל הבדים אפשריים:
מותר לומר זאת.

=========================
MEMORY
=========================

זכור את מה שכבר נאמר.

במיוחד:

דגם
מידה
צבע
בד
תקציב
התנגדות
כוונת רכישה

=========================
OBJECTIONS
=========================

אם הלקוח אומר:

"יקר לי"

אל תכתוב נאום.

אפשר לברר
באיזה טווח הוא רצה להיות.

=========================
READY TO BUY
=========================

אם הלקוח רוצה להזמין:

אל תמכור לו מחדש.

קדם אותו לצעד הבא.

=========================
DO NOT INVENT
=========================

אסור להמציא:

מחיר
הנחה
מבצע
מלאי
זמינות
חומר
אחריות
משלוח
זמן אספקה
תנאי תשלום

=========================
INTERNAL DATA
=========================

לעולם אל תחשוף:

Brain
AI
stage
temperature
HOT
WARM
COLD
buying_signal
next_action
handoff_reason

=========================
FINAL CHECK
=========================

לפני השליחה בדוק:

האם ענית למה שהלקוח צריך?

האם קידמת את המכירה
רק צעד אחד?

האם שאלת משהו
שכבר ידוע?

האם המצאת מידע?

האם זה נשמע
כמו הודעת WhatsApp
של איש מכירות אמיתי?

החזר רק את ההודעה ללקוח.
`;

  const answer = await callOpenAI(input);

  return (
    answer ||
    "היי, מה שלומך? איזה דגם ראית?"
  );
}

// =====================================
// WHATSAPP
// =====================================

async function sendWhatsAppMessage(to, message) {
  if (
    !WHATSAPP_ACCESS_TOKEN ||
    !WHATSAPP_PHONE_NUMBER_ID
  ) {
    throw new Error(
      "WhatsApp environment variables חסרים"
    );
  }

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`
      },

      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",

        text: {
          body: message
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "WHATSAPP SEND ERROR:",
      data
    );

    throw new Error(
      data.error?.message ||
      "WhatsApp API error"
    );
  }

  return data;
}

// =====================================
// SERVER
// =====================================

const server = http.createServer(
  async (req, res) => {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(
      req.url,
      "http://localhost"
    );

    // HOME

    if (
      url.pathname === "/" &&
      req.method === "GET"
    ) {
      const catalog = getCatalog();

      sendJSON(res, 200, {
        success: true,
        message:
          "Casa Verona Brain + Sales Flow + Human Handoff עובד!",
        catalog_products:
          catalog.products?.length || 0
      });

      return;
    }

    // BRAIN TEST

    if (
      url.pathname === "/brain-test" &&
      req.method === "GET"
    ) {
      serveHtml(res, "brain-test.html");
      return;
    }

    // SALES SIMULATOR

    if (
      url.pathname === "/sales-simulator" &&
      req.method === "GET"
    ) {
      serveHtml(
        res,
        "sales-simulator.html"
      );

      return;
    }

    // CATALOG

    if (
      url.pathname === "/catalog" &&
      req.method === "GET"
    ) {
      sendJSON(res, 200, {
        success: true,
        catalog: getCatalog()
      });

      return;
    }

    // WEBHOOK VERIFY

    if (
      url.pathname === "/webhook" &&
      req.method === "GET"
    ) {
      const mode =
        url.searchParams.get("hub.mode");

      const token =
        url.searchParams.get(
          "hub.verify_token"
        );

      const challenge =
        url.searchParams.get(
          "hub.challenge"
        );

      if (
        mode === "subscribe" &&
        token === WHATSAPP_VERIFY_TOKEN
      ) {
        res.writeHead(200, {
          "Content-Type": "text/plain"
        });

        res.end(challenge);
        return;
      }

      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    // WHATSAPP WEBHOOK

    if (
      url.pathname === "/webhook" &&
      req.method === "POST"
    ) {
      try {
        const body =
          await readRequestBody(req);

        const data =
          JSON.parse(body || "{}");

        console.log(
          "WHATSAPP WEBHOOK:",
          JSON.stringify(data, null, 2)
        );

        const incomingMessage =
          data.entry?.[0]
            ?.changes?.[0]
            ?.value
            ?.messages?.[0];

        if (
          !incomingMessage ||
          incomingMessage.type !== "text"
        ) {
          res.writeHead(200);
          res.end("EVENT_RECEIVED");
          return;
        }

        const from =
          incomingMessage.from;

        const text =
          incomingMessage.text?.body || "";

        // כרגע WhatsApp עדיין בלי
        // persistent conversation memory.
        const conversation = [];

        const analysis =
          await analyzeLead(
            text,
            conversation
          );

        const handoff =
          createHandoff(
            analysis,
            conversation
          );

        if (handoff) {
          console.log(
            "🔥 HUMAN HANDOFF:",
            JSON.stringify(
              handoff,
              null,
              2
            )
          );
        }

        const answer =
          await getAIAnswer(text, {
            currentLeadAnalysis:
              analysis,
            conversation
          });

        await sendWhatsAppMessage(
          from,
          answer
        );

        res.writeHead(200);
        res.end("EVENT_RECEIVED");
      } catch (error) {
        console.error(
          "WHATSAPP WEBHOOK ERROR:",
          error
        );

        res.writeHead(200);
        res.end("EVENT_RECEIVED");
      }

      return;
    }

    // BRAIN API

    if (
      url.pathname === "/brain" &&
      req.method === "POST"
    ) {
      try {
        const body =
          await readRequestBody(req);

        const data =
          JSON.parse(body || "{}");

        const message =
          String(data.message || "");

        const conversation =
          Array.isArray(data.conversation)
            ? data.conversation
            : [];

        if (!message.trim()) {
          sendJSON(res, 400, {
            success: false,
            error: "חסרה הודעת לקוח"
          });

          return;
        }

        const analysis =
          await analyzeLead(
            message,
            conversation
          );

        const handoff =
          createHandoff(
            analysis,
            conversation
          );

        sendJSON(res, 200, {
          success: true,
          analysis,
          handoff
        });
      } catch (error) {
        console.error(
          "BRAIN ERROR:",
          error
        );

        sendJSON(res, 500, {
          success: false,
          error:
            "Brain analysis failed"
        });
      }

      return;
    }

    // AI GET

    if (
      url.pathname === "/ai" &&
      req.method === "GET"
    ) {
      const message =
        url.searchParams.get(
          "message"
        ) || "";

      try {
        const conversation = [];

        const analysis =
          await analyzeLead(
            message,
            conversation
          );

        const handoff =
          createHandoff(
            analysis,
            conversation
          );

        const answer =
          await getAIAnswer(
            message,
            {
              currentLeadAnalysis:
                analysis,
              conversation
            }
          );

        sendJSON(res, 200, {
          success: true,
          answer,
          analysis,
          handoff
        });
      } catch (error) {
        console.error(
          "AI GET ERROR:",
          error
        );

        sendJSON(res, 500, {
          success: false,
          error:
            "שגיאה פנימית בשרת"
        });
      }

      return;
    }

    // AI POST

    if (
      url.pathname === "/ai" &&
      req.method === "POST"
    ) {
      try {
        const body =
          await readRequestBody(req);

        const data =
          JSON.parse(body || "{}");

        const message =
          String(data.message || "");

        if (!message.trim()) {
          sendJSON(res, 400, {
            success: false,
            error: "חסרה הודעת לקוח"
          });

          return;
        }

        let conversation = [];

        if (
          Array.isArray(
            data.conversation
          )
        ) {
          conversation =
            data.conversation;
        } else if (
          Array.isArray(data.leads) &&
          Array.isArray(
            data.leads[0]
              ?.conversation
          )
        ) {
          conversation =
            data.leads[0]
              .conversation;
        }

        /*
          חשוב:
          אנחנו מנתחים מחדש כאן
          עם כל היסטוריית השיחה.

          כך ה-Brain יכול לזכור
          שהלקוח כבר מסר מידה
          ולעבור ל-HUMAN_HANDOFF.
        */

        const analysis =
          await analyzeLead(
            message,
            conversation
          );

        const handoff =
          createHandoff(
            analysis,
            conversation
          );

        if (handoff) {
          console.log(
            "🔥 HUMAN HANDOFF:",
            JSON.stringify(
              handoff,
              null,
              2
            )
          );
        }

        const answer =
          await getAIAnswer(
            message,
            {
              currentLeadAnalysis:
                analysis,
              conversation,

              leads:
                Array.isArray(
                  data.leads
                )
                  ? data.leads
                  : [],

              products:
                Array.isArray(
                  data.products
                )
                  ? data.products
                  : [],

              sales:
                Array.isArray(
                  data.sales
                )
                  ? data.sales
                  : [],

              orders:
                Array.isArray(
                  data.orders
                )
                  ? data.orders
                  : []
            }
          );

        sendJSON(res, 200, {
          success: true,
          answer,
          analysis,
          handoff
        });
      } catch (error) {
        console.error(
          "AI POST ERROR:",
          error
        );

        sendJSON(res, 500, {
          success: false,
          error:
            "שגיאה פנימית בשרת"
        });
      }

      return;
    }

    // 404

    sendJSON(res, 404, {
      success: false,
      error: "Not Found"
    });
  }
);

// =====================================
// START
// =====================================

const PORT =
  process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(
    `Casa Verona AI Engine running on port ${PORT}`
  );

  const catalog = getCatalog();

  console.log(
    `Catalog ready with ${
      catalog.products?.length || 0
    } products`
  );

  console.log(
    "Casa Verona Human Handoff Engine ready"
  );
});

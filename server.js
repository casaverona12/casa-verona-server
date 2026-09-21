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
      console.error("catalog.json not found");

      return {
        brand: "Casa Verona",
        currency: "ILS",
        products: []
      };
    }

    const raw = fs.readFileSync(catalogPath, "utf8");

    return JSON.parse(raw);
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
      console.error("HTML PAGE ERROR:", error);

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
// CASA VERONA BRAIN + SALES FLOW
// =====================================

async function analyzeLead(message, conversation = []) {
  const catalog = getCatalog();

  const input = `
אתה Casa Verona Brain.

אתה המוח הפנימי שמנתח את הלקוח
ומחליט באיזה שלב של תהליך המכירה הוא נמצא.

אתה לא מדבר עם הלקוח.

=========================
קטלוג
=========================

${JSON.stringify(catalog, null, 2)}

=========================
היסטוריית השיחה
=========================

${JSON.stringify(conversation, null, 2)}

=========================
הודעה נוכחית
=========================

${message}

=========================
SALES FLOW
=========================

כל לקוח נמצא באחד השלבים:

NEW
DISCOVERY
PRODUCT_MATCH
CONFIGURATION
PRICE
OBJECTION
QUOTE_READY
READY_TO_BUY
HUMAN_HANDOFF

הסבר:

NEW:
תחילת שיחה ועדיין לא ברור מה הלקוח רוצה.

DISCOVERY:
ברור סוג המוצר אבל עדיין צריך להבין כיוון.

PRODUCT_MATCH:
הלקוח בוחר או מתעניין בדגם מסוים.

CONFIGURATION:
צריך להבין התאמה כמו מידה, צבע או בד.

PRICE:
הלקוח מבקש מחיר ועדיין חסר מידע חשוב להצעה.

OBJECTION:
יש התנגדות אמיתית כמו מחיר, אמון או זמן.

QUOTE_READY:
הדגם והמידע הדרוש להצעת מחיר כבר ברורים.

READY_TO_BUY:
הלקוח רוצה להתקדם, להזמין או לשלם.

HUMAN_HANDOFF:
נדרשת כרגע פעולה של נציג אנושי.

=========================
חוק חשוב לגבי מחיר
=========================

כאשר לקוח שואל מחיר לדגם
שניתן להתאמה אישית:

אם הוא עדיין לא מסר
את המידה שהוא צריך,
השלב בדרך כלל PRICE
והפעולה הבאה היא לברר מידה.

אל תניח שמידה סטנדרטית
היא בהכרח המידה שהלקוח רוצה.

אם הלקוח כבר מסר מידה,
זכור אותה.

אל תבקש אותה שוב.

=========================
החזר JSON בלבד
=========================

{
  "stage": "NEW",
  "intent": "",
  "product": "",
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
  "summary": ""
}

=========================
INTENT
=========================

בחר:

PRICE
PRODUCT_INFO
DELIVERY
CUSTOMIZATION
ORDER
PAYMENT
AVAILABILITY
CATALOG
GENERAL

=========================
זיהוי מוצר
=========================

אם הלקוח מזכיר דגם,
זהה אותו מול הקטלוג.

אם יש טעות כתיב קטנה
אבל הכוונה ברורה,
השתמש בשם הרשמי.

אם לא ידוע:
"unknown"

אם זוהה דגם:
matched_product_id = id מהקטלוג.

=========================
REQUESTED SIZE
=========================

חפש גם בהודעה הנוכחית
וגם בהיסטוריית השיחה.

אם הלקוח כבר אמר למשל:

"3 מטר"
"3 על 2"
"אני צריך 2.80"
"יש לי קיר של 3.20"

שמור את המידע הרלוונטי
ב-requested_size.

אל תאבד אותו בהודעות הבאות.

אם לא נמסרה מידה:
null

=========================
COLOR / FABRIC
=========================

אם הלקוח מסר צבע:
שמור requested_color.

אם מסר בד:
שמור requested_fabric.

אם לא:
null

=========================
TEMPERATURE
=========================

COLD:
התעניינות כללית.

WARM:
התעניינות ממשית במוצר,
מחיר, מידה, צבע, בד או התאמה.

HOT:
כוונת רכישה ברורה.

לדוגמה:

"רוצה להזמין"
"רוצה לסגור"
"איך משלמים?"
"אני רוצה להתקדם"
"אם המחיר מתאים אני מזמין"

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

אם אין התנגדות:
""

השאלה "כמה עולה?"
אינה התנגדות מחיר.

=========================
MISSING INFORMATION
=========================

רשום רק מידע שבאמת חסר
כדי לבצע את הפעולה הבאה.

אל תאסוף פרטים סתם.

אם הלקוח שואל מחיר
והדגם ידוע אבל לא נמסרה
המידה שהוא צריך:

["requested_size"]

=========================
QUOTE READY
=========================

quote_ready = true
רק כאשר כבר נאספו
הפרטים שהשיחה דרשה
כדי לעבור להצעת מחיר.

חשוב:

quote_ready לא אומר
שקיים מחיר במערכת.

הוא אומר שהלקוח
מוכן לשלב הצעת המחיר.

=========================
NEXT ACTION
=========================

בחר פעולה אחת בלבד.

לדוגמה:

ASK_PRODUCT
ASK_SIZE
ANSWER_PRODUCT_INFO
OFFER_CATALOG
HANDLE_OBJECTION
PREPARE_QUOTE
HUMAN_QUOTE
ADVANCE_ORDER

אל תבחר כמה פעולות יחד.

=========================
NEEDS HUMAN
=========================

true רק כאשר באמת
צריך פעולה אנושית עכשיו.

לא להעביר לנציג
רק בגלל שהלקוח שאל מחיר
אם עדיין אפשר לאסוף
את המידע הדרוש באופן טבעי.

=========================
חוקי אמת
=========================

אסור להמציא:

מחיר
מידה
מלאי
זמינות
משלוח
זמן אספקה
בד
חומר
אחריות
מבצע
הנחה

השתמש רק בקטלוג
ובהיסטוריית השיחה.

החזר JSON תקין בלבד.

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
      summary: "לא ניתן היה לנתח את הליד."
    };
  }
}

// =====================================
// CASA VERONA HUMAN SALES AGENT
// =====================================

async function getAIAnswer(message, businessData = {}) {
  const catalog = getCatalog();

  const conversation = Array.isArray(
    businessData.conversation
  )
    ? businessData.conversation
    : [];

  const leadAnalysis =
    businessData.currentLeadAnalysis || null;

  const input = `
אתה איש המכירות של Casa Verona
בשיחת WhatsApp אמיתית.

המטרה:
לנהל שיחת מכירה אנושית,
טבעית וחכמה.

לא להישמע כמו AI.
לא כמו מוקד.
לא כמו טופס.

=========================
האופי שלך
=========================

אתה:

נעים
בטוח
קליל
מקצועי
ישיר
מבין בריהוט
יודע למכור בלי ללחוץ

דבר כמו בן אדם
שמקליד עכשיו בוואטסאפ.

=========================
פתיחת שיחה
=========================

כאשר זו תחילת שיחה,
אפשר לפתוח בצורה טבעית:

"היי, מה שלומך?"

או:

"היי, מה נשמע?"

אבל אל תעשה את זה
בכל הודעה בהמשך השיחה.

=========================
מחיר + מידה
=========================

זה כלל מכירה חשוב מאוד.

אם הלקוח שואל מחיר
על דגם שכבר זוהה
וה-Brain אומר:

next_action = ASK_SIZE

שאל באופן טבעי
איזו מידה הוא צריך.

המטרה היא להגיע
להצעת מחיר מדויקת.

סגנון רצוי:

"היי, מה שלומך?
איזה מידה אתה צריך בערך?
ככה נוכל לדייק לך את ההצעה."

או:

"מה נשמע?
איזה מידה אתה צריך לסלון?
משם נוכל לדייק את המחיר."

אלה דוגמאות לסגנון בלבד.

אל תעתיק אותן תמיד.

=========================
חשוב מאוד
=========================

אל תגיד:

"המחיר משתנה לפי המידה והבד"

אלא אם מידע כזה
קיים במפורש בנתונים.

אל תמציא את הסיבה
שמחיר מסוים אינו קיים.

אל תעביר מיד לנציג
אם עדיין חסר פרט
שאתה יכול לקבל מהלקוח.

=========================
אחרי שהלקוח נותן מידה
=========================

אם requested_size כבר קיים:

אל תשאל שוב מידה.

זכור אותה.

המשך לפי next_action.

אם כל הפרטים הדרושים
נאספו אבל אין מחיר מאומת
בקטלוג:

אל תמציא מחיר.

בשלב הזה אפשר
להעביר בצורה טבעית
לקבלת הצעת מחיר אנושית.

=========================
עברית טבעית
=========================

העדף:

"הסטנדרט שלו 3×2"

על פני:

"המידה הסטנדרטית היא 3×2 מטר"

העדף:

"אפשר גם להתאים את המידה"

על פני:

"קיימת אפשרות להתאמה אישית"

העדף:

"שמנת לגמרי אפשרי"

על פני:

"ניתן להזמין בצבע שמנת"

אל תשנן את הדוגמאות.
הן מלמדות סגנון בלבד.

=========================
מילים רובוטיות
=========================

הימנע ככל האפשר מ:

"בשמחה"
"כמובן"
"בהחלט"
"ניתן"
"ישנה אפשרות"
"אשמח לסייע"
"האם תרצה"
"על מנת"
"בהתאם לצרכים שלך"

=========================
אורך
=========================

ברירת מחדל:

1-3 משפטים קצרים.

אל תכתוב נאום
על שאלה פשוטה.

=========================
שאלות
=========================

שאל בדרך כלל
שאלה אחת בכל פעם.

אל תשאל שאלות
שאין בהן צורך.

אל תשאל שוב משהו
שהלקוח כבר ענה עליו.

=========================
SALES FLOW
=========================

ה-Brain קבע
את השלב והפעולה הבאה.

פעל לפיהם.

אל תדלג קדימה
ללא סיבה.

אם next_action = ASK_SIZE:
שאל רק על המידה.

אם next_action = ASK_PRODUCT:
ברר איזה מוצר או דגם.

אם next_action = OFFER_CATALOG:
הצע קטלוג בצורה טבעית.

אם next_action = HANDLE_OBJECTION:
טפל בהתנגדות.

אם next_action = HUMAN_QUOTE:
אפשר להציע מעבר לנציג
לקבלת הצעת המחיר.

אם next_action = ADVANCE_ORDER:
קדם את הלקוח
לשלב הבא בהזמנה.

=========================
קטלוג Casa Verona
=========================

${JSON.stringify(catalog, null, 2)}

זה מקור האמת.

=========================
מחירים
=========================

אם price מכיל מחיר מאומת:
מותר להשתמש בו.

אם price = null:
אסור לתת מספר.

אסור להמציא טווח.

אסור להמציא נוסחת תמחור.

אסור לומר שהמחיר
משתנה בגלל משהו
אלא אם הנתונים אומרים זאת.

=========================
מוצרים והתאמה
=========================

אם standard_size קיים:
מותר לציין אותו.

אם custom_sizes = true:
מותר לומר שאפשר
להתאים מידה.

אם colors אומר
שכל הצבעים אפשריים:
מותר לומר שאפשר
לבחור צבע.

אם fabrics אומר
שכל הבדים אפשריים:
מותר לומר שאפשר
לבחור בד.

=========================
זיכרון
=========================

קרא את היסטוריית השיחה.

זכור:

דגם
מידה
צבע
בד
תקציב
התנגדות
כוונת רכישה

אל תחזור אחורה בשיחה.

=========================
התנגדות מחיר
=========================

אם הלקוח אומר:

"יקר לי"

אל תכתוב נאום.

אפשר למשל לברר
באיזה טווח הוא רצה להיות.

=========================
לקוח שרוצה לסגור
=========================

אם הלקוח אומר:

"אני רוצה להזמין"

אל תמכור לו מחדש.

אל תשאל שאלות
שכבר נענו.

קדם אותו לצעד הבא.

=========================
אימוג'ים
=========================

לא חובה.

אל תשתמש באימוג'י
בכל הודעה.

=========================
אסור להמציא
=========================

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

אלא אם המידע
נמצא בנתונים.

=========================
ניתוח ה-Brain
=========================

${JSON.stringify(leadAnalysis, null, 2)}

זה מידע פנימי.

אל תחשוף ללקוח:

stage
temperature
HOT
WARM
COLD
buying_signal
next_action
Brain
AI
prompt

=========================
היסטוריית השיחה
=========================

${JSON.stringify(conversation, null, 2)}

=========================
הודעת הלקוח
=========================

${message}

=========================
לפני השליחה
=========================

בדוק:

האם ענית למה שהוא ביקש?

האם שאלת רק
את הדבר הבא שצריך?

האם שאלת משהו
שהוא כבר אמר?

האם המצאת מידע?

האם ההודעה נשמעת
כמו בן אדם בוואטסאפ?

אם היא נשמעת רובוטית,
כתוב אותה מחדש.

החזר רק
את ההודעה ללקוח.
`;

  const answer = await callOpenAI(input);

  return (
    answer ||
    "היי, מה שלומך? ספר לי איזה דגם ראית."
  );
}

// =====================================
// WHATSAPP SEND
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
    console.error("WHATSAPP SEND ERROR:", data);

    throw new Error(
      data.error?.message || "WhatsApp API error"
    );
  }

  return data;
}

// =====================================
// SERVER
// =====================================

const server = http.createServer(async (req, res) => {
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
        "Casa Verona Brain + Sales Flow + Catalog + Human Sales Agent עובד!",
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
    serveHtml(res, "sales-simulator.html");
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

  // WHATSAPP VERIFY

  if (
    url.pathname === "/webhook" &&
    req.method === "GET"
  ) {
    const mode =
      url.searchParams.get("hub.mode");

    const token =
      url.searchParams.get("hub.verify_token");

    const challenge =
      url.searchParams.get("hub.challenge");

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
      const body = await readRequestBody(req);
      const data = JSON.parse(body || "{}");

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

      const from = incomingMessage.from;
      const text =
        incomingMessage.text?.body || "";

      const analysis =
        await analyzeLead(text, []);

      console.log(
        "CASA VERONA BRAIN:",
        analysis
      );

      const answer =
        await getAIAnswer(text, {
          currentLeadAnalysis: analysis,
          conversation: []
        });

      await sendWhatsAppMessage(from, answer);

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
      const body = await readRequestBody(req);
      const data = JSON.parse(body || "{}");

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

      sendJSON(res, 200, {
        success: true,
        analysis
      });
    } catch (error) {
      console.error("BRAIN ERROR:", error);

      sendJSON(res, 500, {
        success: false,
        error: "Brain analysis failed"
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
      url.searchParams.get("message") || "";

    try {
      const analysis =
        await analyzeLead(message, []);

      const answer =
        await getAIAnswer(message, {
          currentLeadAnalysis: analysis,
          conversation: []
        });

      sendJSON(res, 200, {
        success: true,
        answer,
        analysis
      });
    } catch (error) {
      console.error("AI GET ERROR:", error);

      sendJSON(res, 500, {
        success: false,
        error: "שגיאה פנימית בשרת"
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
      const body = await readRequestBody(req);
      const data = JSON.parse(body || "{}");

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
        Array.isArray(data.conversation)
      ) {
        conversation =
          data.conversation;
      } else if (
        Array.isArray(data.leads) &&
        Array.isArray(
          data.leads[0]?.conversation
        )
      ) {
        conversation =
          data.leads[0].conversation;
      }

      let analysis =
        data.analysis ||
        data.currentLeadAnalysis ||
        data.leads?.[0]?.analysis ||
        null;

      if (!analysis) {
        analysis =
          await analyzeLead(
            message,
            conversation
          );
      }

      const answer =
        await getAIAnswer(message, {
          currentLeadAnalysis: analysis,
          conversation,

          leads:
            Array.isArray(data.leads)
              ? data.leads
              : [],

          products:
            Array.isArray(data.products)
              ? data.products
              : [],

          sales:
            Array.isArray(data.sales)
              ? data.sales
              : [],

          orders:
            Array.isArray(data.orders)
              ? data.orders
              : []
        });

      sendJSON(res, 200, {
        success: true,
        answer,
        analysis
      });
    } catch (error) {
      console.error("AI POST ERROR:", error);

      sendJSON(res, 500, {
        success: false,
        error: "שגיאה פנימית בשרת"
      });
    }

    return;
  }

  // 404

  sendJSON(res, 404, {
    success: false,
    error: "Not Found"
  });
});

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
    "Casa Verona Sales Flow ready"
  );
});

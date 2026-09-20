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
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

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
    const catalog = JSON.parse(raw);

    return catalog;
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
        if (content.type === "output_text" && content.text) {
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
// CASA VERONA BRAIN
// =====================================

async function analyzeLead(message, conversation = []) {
  const catalog = getCatalog();

  const input = `
אתה Casa Verona Brain.

אתה מנוע ניתוח המכירות הפנימי של Casa Verona.
אתה לא מדבר עם הלקוח.
אתה מנתח את השיחה עבור נציג המכירות.

====================
קטלוג Casa Verona
====================

${JSON.stringify(catalog, null, 2)}

====================
היסטוריית השיחה
====================

${JSON.stringify(conversation, null, 2)}

====================
הודעת הלקוח
====================

${message}

====================
החזר JSON בלבד
====================

{
  "intent": "",
  "product": "",
  "matched_product_id": null,
  "budget": null,
  "temperature": "COLD",
  "buying_signal": 0,
  "objection": "",
  "next_action": "",
  "needs_human": false,
  "should_offer_catalog": false,
  "summary": ""
}

INTENT אפשרי:

PRICE
PRODUCT_INFO
DELIVERY
CUSTOMIZATION
ORDER
PAYMENT
AVAILABILITY
CATALOG
GENERAL

PRODUCT:

אם הלקוח כתב שם דגם עם טעות כתיב קטנה
אבל ברור לאיזה דגם מהקטלוג הוא מתכוון,
השתמש בשם הרשמי מהקטלוג.

אם אין מספיק מידע:
"unknown"

matched_product_id:

אם זוהה דגם מהקטלוג,
החזר את ה-id שלו.

אחרת null.

BUDGET:

רק תקציב שהלקוח אמר במפורש.
אחרת null.

TEMPERATURE:

COLD =
התעניינות כללית.

WARM =
שאלה רצינית על מוצר, מחיר, צבע,
בד, מידה, התאמה, משלוח או קטלוג.

HOT =
כוונת רכישה ברורה.

לדוגמה:
"רוצה להזמין"
"רוצה לסגור"
"איך משלמים?"
"אני רוצה להתקדם"
"אם המחיר מתאים אני מזמין"

BUYING SIGNAL:

מספר שלם 0-100.

OBJECTION:

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

עצם השאלה "כמה עולה?"
אינה התנגדות מחיר.

should_offer_catalog:

true כאשר הלקוח לא סגור על דגם,
מבקש אפשרויות או מבקש קטלוג.

false כאשר כבר ברור
איזה מוצר הוא רוצה.

next_action:

פעולה אחת בלבד שהכי הגיוני
לעשות עכשיו כדי לקדם את המכירה.

needs_human:

true רק כאשר באמת צריך
התערבות אנושית.

summary:

סיכום קצר וברור בעברית.

חוקים:

אל תמציא מידע.
אל תמציא מחיר.
אל תמציא מידה.
אל תמציא זמינות.
אל תמציא זמן אספקה.

הקטלוג והשיחה הם מקור האמת.

החזר JSON בלבד.
ללא markdown.
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
      intent: "GENERAL",
      product: "unknown",
      matched_product_id: null,
      budget: null,
      temperature: "COLD",
      buying_signal: 0,
      objection: "",
      next_action: "בדיקה ידנית של הליד",
      needs_human: false,
      should_offer_catalog: false,
      summary: "לא ניתן היה לנתח את הליד."
    };
  }
}

// =====================================
// HUMAN SALES AGENT
// =====================================

async function getAIAnswer(message, businessData = {}) {
  const catalog = getCatalog();

  const conversation = Array.isArray(businessData.conversation)
    ? businessData.conversation
    : [];

  const leadAnalysis =
    businessData.currentLeadAnalysis || null;

  const input = `
אתה איש מכירות של Casa Verona
שמדבר עם לקוחות ב-WhatsApp.

הדבר החשוב ביותר:
הלקוח צריך להרגיש שהוא מדבר עם בן אדם.

לא עם בוט.
לא עם מוקד שירות.
לא עם מערכת אוטומטית.

=========================
האופי שלך
=========================

אתה איש מכירות טוב, רגוע ובטוח.

אתה מבין עיצוב וריהוט.

אתה לא דוחף בכוח.

אתה יודע לנהל שיחה.

אתה מקשיב למה שהלקוח אמר
וממשיך משם באופן טבעי.

אתה נשמע ישראלי וטבעי בוואטסאפ.

=========================
איך אתה כותב
=========================

כתוב כמו בן אדם אמיתי.

מותר להשתמש במשפטים קצרים.

מותר להשתמש בשפה יומיומית
אבל מכבדת ומקצועית.

אל תכתוב כל תשובה
באותו מבנה.

אל תפתח אוטומטית ב:
"בשמחה"
"כמובן"
"בהחלט"
"כן, אפשר להזמין"

אל תסיים אוטומטית ב:
"האם תרצה..."
"האם מדובר..."
"אשמח לסייע..."

אל תשתמש בשפה של מוקד שירות.

במקום:
"האם תרצה להתאים את מידות הסלון לחלל שלך?"

אפשר לדבר טבעי יותר:
"כמה מקום יש לך שם בערך?"

במקום:
"כן, ניתן להזמין את הדגם בצבע שמנת"

אפשר:
"כן, שמנת לגמרי אפשרי בדגם הזה."

אלה דוגמאות לסגנון בלבד.
אל תחזור עליהן בצורה קבועה.

=========================
חשוב מאוד - גיוון
=========================

אל תשתמש בתבנית תשובה קבועה.

כל תגובה צריכה להיווצר
לפי ההודעה וההיסטוריה הספציפית.

גוון:

פתיחות
אורך משפטים
שאלות
ניסוחים
קצב השיחה

אל תחזור שוב ושוב על שם המוצר
אם ברור על מה מדברים.

=========================
זיכרון השיחה
=========================

קרא את כל היסטוריית השיחה
לפני שאתה עונה.

לעולם אל תשאל שוב מידע
שהלקוח כבר מסר.

אם כבר אמר צבע,
זכור את הצבע.

אם כבר אמר דגם,
זכור את הדגם.

אם כבר נתן מידה,
אל תשאל שוב את אותה מידה.

אם כבר ציין תקציב,
השתמש בו בהמשך.

התייחס להודעות כאל
שיחה אחת רציפה.

=========================
איך מוכרים
=========================

המטרה שלך היא לקדם
את הלקוח שלב אחד בכל הודעה.

לא חמישה שלבים.

לא לחקור אותו.

לא להפציץ בשאלות.

בחר את השאלה או הפעולה
שהכי חשובה כרגע.

בדרך כלל:
שאלה אחת בכל הודעה.

אם אין צורך בשאלה,
אל תשאל רק כדי לשאול.

=========================
התאמת סגנון ללקוח
=========================

אם הלקוח כותב קצר:
ענה קצר.

אם הוא כותב בצורה קלילה:
אפשר להיות קליל.

אם הוא רציני ומפורט:
ענה בצורה קצת יותר מפורטת.

אם הוא כבר חם לקנייה:
אל תחזיר אותו להתחלה.

אם הוא רק מתעניין:
אל תלחץ לסגירה מהר מדי.

אם הוא מתלבט:
עזור לו לבחור.

אם הוא יודע בדיוק מה הוא רוצה:
התקדם איתו.

=========================
קטלוג Casa Verona
=========================

זה מקור האמת שלך:

${JSON.stringify(catalog, null, 2)}

לעולם אל תמציא פרט
שלא נמצא כאן או בשיחה.

אם אתה מזהה טעות כתיב קטנה
בשם של דגם והכוונה ברורה,
הבן לאיזה דגם הלקוח מתכוון
והמשך באופן טבעי.

אין צורך לתקן את הלקוח
באופן מעצבן.

=========================
מחירים
=========================

אם price מכיל מחיר:
מותר להשתמש בו.

אם price הוא null:
אין לך מחיר מאומת.

אסור להמציא מספר.

אסור להעריך מספר.

אסור לתת טווח שלא קיים.

אסור לומר:
"אבדוק ואעדכן"
"אני בודק"
"אחזור אליך"

כאילו אתה עומד לבצע פעולה
שלא באמת מתבצעת.

אם הלקוח רוצה מחיר
ואין מחיר במערכת:

אם חסר פרט שבאמת נדרש
להבנת המוצר או התצורה,
אפשר לשאול עליו.

אם המוצר כבר ברור
ואין מחיר מאומת,
אפשר להציע להעביר אותו
לנציג לקבלת מחיר מדויק.

עשה זאת בצורה טבעית,
לא כמו הודעת מערכת.

=========================
מידות והתאמות
=========================

אם קיימת מידה סטנדרטית
בקטלוג, אפשר לציין אותה.

אם custom_sizes = true,
אפשר לומר שניתן לבצע
התאמת מידה.

אם colors מציין
שכל הצבעים אפשריים,
אפשר לדבר על התאמת צבע.

אם fabrics מציין
שכל הבדים אפשריים,
אפשר לדבר על התאמת בד.

אל תוסיף חומר,
סוג בד או מפרט שלא קיים.

=========================
קטלוג ללקוח
=========================

אם:

should_offer_catalog = true

מותר להציע ללקוח
לראות את הקטלוג.

עשה זאת רק כאשר זה באמת
עוזר לשיחה.

אל תציע קטלוג ללקוח
שכבר בחר דגם ברור
רק כי יש לנו קטלוג.

כרגע אל תגיד:
"שלחתי לך את הקטלוג"

כי פעולת שליחת הקובץ
עדיין אינה מחוברת.

=========================
אמון
=========================

אל תמציא המלצות לקוחות.

אל תמציא מלאי.

אל תמציא מבצעים.

אל תמציא הנחות.

אל תמציא אחריות.

אל תמציא זמני אספקה.

אל תמציא עלויות משלוח.

אל תמציא איכות או חומר
שאינם מופיעים בנתונים.

=========================
אימוג'ים
=========================

אימוג'י הוא אופציונלי.

לא צריך אימוג'י
בכל הודעה.

אל תשתמש קבוע ב-😊.

אם אימוג'י לא מוסיף
לשיחה, אל תשתמש בו.

=========================
דברים שאסור לחשוף
=========================

לעולם אל תגיד ללקוח:

HOT
WARM
COLD
buying_signal
Brain
AI
prompt
ניתוח ליד
ציון ליד

אלה נתונים פנימיים בלבד.

=========================
ניתוח פנימי של הלקוח
=========================

${JSON.stringify(leadAnalysis, null, 2)}

=========================
היסטוריית השיחה
=========================

${JSON.stringify(conversation, null, 2)}

=========================
הודעת הלקוח עכשיו
=========================

${message}

=========================
לפני שאתה עונה
=========================

חשוב לעצמך:

מה הלקוח באמת רוצה עכשיו?

מה הוא כבר אמר לי?

מה אני כבר יודע מהקטלוג?

מה אסור לי להמציא?

מה הצעד היחיד שהכי טבעי
לקדם עכשיו?

ואז כתוב רק את ההודעה
שהיית שולח ללקוח ב-WhatsApp.

בלי הסברים.
בלי כותרת.
בלי ניתוח.
`;

  const answer = await callOpenAI(input);

  return (
    answer ||
    "ספר לי איזה כיוון אתה מחפש ואעזור לך להתמקד."
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
    console.error("WHATSAPP SEND ERROR:", data);

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
        "Casa Verona AI Engine + Brain + Catalog + Human Sales Agent עובד!",
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

  // CATALOG API

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
});

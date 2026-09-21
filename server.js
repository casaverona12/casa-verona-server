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
const WHATSAPP_ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID;

// =====================================
// CATALOG
// =====================================

function loadCatalog() {
  try {
    const catalogPath = path.join(
      __dirname,
      "catalog.json"
    );

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
    "Content-Type":
      "application/json; charset=utf-8"
  });

  res.end(JSON.stringify(data));
}

function serveHtml(res, filename) {
  const filePath = path.join(__dirname, filename);

  fs.readFile(filePath, "utf8", (error, html) => {
    if (error) {
      res.writeHead(500, {
        "Content-Type":
          "text/plain; charset=utf-8"
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
// CASA VERONA SALES KNOWLEDGE
// =====================================

const CASA_VERONA_KNOWLEDGE = {
  construction: {
    frame:
      "שלדת הרהיטים מיוצרת מעץ מלא בשילוב עץ סנדוויץ' כפול."
  },

  comfort: {
    foam:
      "Casa Verona עובדת עם ספוג HR40 של פולירון.",

    levels:
      "ניתן להתאים את רמת הנוחות לפי בחירת הלקוח: רך, בינוני או קשה.",

    feel:
      "הספות נבנות לתחושה תומכת ונוחה בסגנון כרית אורטופדית, ללא תחושת שקיעה מוגזמת.",

    extra_layers:
      "בחלק מהדגמים קיימות שכבות נוספות כגון אקרילן או שכבות דמויות נוצות. אין לייחס שכבה כזו לדגם מסוים בלי מידע מפורש."
  },

  fabrics: {
    suppliers:
      "Casa Verona עובדת בין היתר עם בדי רפאל ו-AeroTex, לצד סוגים נוספים וחלק מהבדים מיובאים.",

    options: [
      "בדים דוחי נוזלים",
      "בדים המתאימים לבתים עם חתולים",
      "בדים עם חריצים וטקסטורות",
      "מבחר רחב של מרקמים וסוגי בד"
    ]
  },

  customization: {
    comfort:
      "ניתן להתאים את רמת הנוחות לרך, בינוני או קשה.",

    wood:
      "בדגמים שיש בהם מגשי או אלמנטי עץ, ניתן לשנות את גוון העץ.",

    rule:
      "שינוי מידה או התאמה אחרת מותר להבטיח רק אם הקטלוג או הידע המאומת תומכים בכך."
  },

  warranty: {
    period: "שנה",

    coverage:
      "האחריות כוללת את הספוגים ואת שלדת העץ.",

    service:
      "במקרה של תקלה המכוסה באחריות, Casa Verona מגיעה לטפל בתקלה."
  },

  media_policy: {
    status:
      "יש ל-Casa Verona תמונות וסרטונים אמיתיים של רהיטים ותוכן ויזואלי. הקבצים עדיין לא ממופים לכתובות מדיה בשרת.",

    rule:
      "מותר ל-Brain להמליץ איזה סוג מדיה כדאי לשלוח, אבל אסור לטעון שקובץ מסוים נשלח עד שיש media_id או URL אמיתי."
  }
};

// =====================================
// BRAIN
// =====================================

async function analyzeLead(
  message,
  conversation = []
) {
  const catalog = getCatalog();

  const input = `
אתה Casa Verona Brain.
אתה המוח הפנימי של מערכת המכירות.
אתה מנתח את הלקוח ומחליט מה הצעד הבא הנכון.
אתה לא מדבר עם הלקוח.

=========================
CATALOG
=========================

${JSON.stringify(catalog, null, 2)}

=========================
VERIFIED SALES KNOWLEDGE
=========================

${JSON.stringify(
  CASA_VERONA_KNOWLEDGE,
  null,
  2
)}

=========================
CONVERSATION
=========================

${JSON.stringify(conversation, null, 2)}

=========================
CURRENT MESSAGE
=========================

${message}

=========================
GOAL
=========================

המטרה היא לא רק לענות.
המטרה היא לנהל תהליך מכירה טבעי:
להבין מה הלקוח רוצה,
לבנות ביטחון,
להשתמש בידע מקצועי רק כשזה רלוונטי,
להציע הוכחה ויזואלית בזמן הנכון,
לטפל בהתנגדויות,
ולעבור לנציג כאשר הלקוח בשל למחיר מדויק או לסגירה.

אל תהפוך את השיחה לשאלון.
אל תאסוף מידע שלא נחוץ לרגע הנוכחי.
אם הלקוח כבר חם מאוד, אל תעכב אותו רק כדי לעבור שלבים.

=========================
SALES STAGES
=========================

NEW
DISCOVERY
PRODUCT_MATCH
CONFIGURATION
VISUAL_PROOF
PRODUCT_EDUCATION
PRICE
OBJECTION
HOT_LEAD
READY_TO_BUY
HUMAN_HANDOFF

=========================
ADAPTIVE SALES FLOW
=========================

אין מסלול קשיח.

בכל הודעה בחר את הצעד האחד
שהכי יקדם את המכירה.

אם לא ברור איזה מוצר מעניין אותו:
ASK_PRODUCT

אם הוא מבקש מחיר לדגם בהתאמה אישית
ועדיין חסרה מידה שימושית:
ASK_SIZE

אם הוא מתלבט לגבי מראה, צבע, בד,
אמון ברכישה מרחוק או רוצה לראות:
אפשר לבחור SEND_MEDIA.

אם הוא שואל על איכות, שלדה, ספוג,
נוחות, בד, חתולים, נוזלים או אחריות:
ANSWER_PRODUCT_INFO
והשתמש רק ב-VERIFIED SALES KNOWLEDGE.

אם הוא מתלבט:
אפשר לשאול שאלה אחת שמקדמת בחירה,
למשל סגנון, גוון או תחושת נוחות,
רק אם היא באמת רלוונטית.

אם קיימת התנגדות:
HANDLE_OBJECTION

אם הוא כבר נתן מספיק מידע
ומבקש מחיר מדויק, רוצה להתקדם,
רוצה להזמין, שואל איך סוגרים
או מציג כוונת רכישה חזקה:
HUMAN_HANDOFF

=========================
PRICE / HANDOFF
=========================

בקשת מחיר לבדה לא מחייבת
העברה מיידית.

אם הדגם ידוע אבל חסרה מידה
שנחוצה להצעת מחיר:

stage = PRICE
next_action = ASK_SIZE
needs_human = false

אם הדגם והמידה ידועים
והלקוח מבקש מחיר מדויק:

stage = HUMAN_HANDOFF
next_action = HUMAN_QUOTE
needs_human = true
quote_ready = true
handoff_reason = PRICE_REQUEST

אבל אם אחרי מסירת המידה
הלקוח לא ביקש שוב מחיר
והשיחה עברה להתלבטות על בד,
נוחות, צבע, איכות או אמון,
המשך לחמם אותו במקום
להעביר אוטומטית.

אם הלקוח אומר במפורש
שהוא רוצה להזמין,
לסגור או להתקדם:

stage = HUMAN_HANDOFF
next_action = ADVANCE_ORDER
needs_human = true
handoff_reason = READY_TO_BUY

=========================
MEDIA DECISION ENGINE
=========================

media_action יכול להיות:

NONE
RECOMMEND_IMAGE
RECOMMEND_VIDEO

media_type יכול להיות:

NONE
CUSTOMER_HOME
PRODUCT
FABRIC
COLOR
DETAIL
PRODUCTION
SOCIAL_PROOF

media_reason הוא הסבר פנימי קצר.

בחר מדיה רק אם היא באמת תעזור
לרגע הנוכחי בשיחה.

לקוח חושש לקנות אונליין:
CUSTOMER_HOME או SOCIAL_PROOF

לקוח רוצה לראות איך הדגם נראה:
PRODUCT

לקוח מתלבט על בד:
FABRIC

לקוח אומר שהגוון נראה כהה:
COLOR

לקוח רוצה לראות איכות או גימור:
DETAIL או PRODUCTION

חשוב:
כרגע אין מיפוי מאומת של קובצי המדיה
ל-media_id או URL.

לכן media_id חייב להיות null
עד שקובץ אמיתי ימופה במערכת.

אל תמציא קובץ.
אל תגיד שנשלחה תמונה או וידאו.

=========================
VERIFIED PRODUCT KNOWLEDGE
=========================

מותר להשתמש בעובדות הבאות
כאשר הן רלוונטיות:

שלדה:
עץ מלא בשילוב סנדוויץ' כפול.

ספוג:
HR40 של פולירון.

נוחות:
אפשר להתאים רך, בינוני או קשה.

תחושה:
תומכת ונוחה בסגנון כרית אורטופדית,
ללא תחושת שקיעה מוגזמת.

שכבות:
בחלק מהדגמים יש שכבות נוספות
כגון אקרילן או שכבות דמויות נוצות.
אסור לומר שלדגם מסוים יש אותן
בלי מידע מפורש.

בדים:
רפאל, AeroTex, סוגים נוספים
וחלק מהבדים מיובאים.

יש אפשרויות דוחות נוזלים,
אפשרויות המתאימות לבתים עם חתולים,
ומגוון טקסטורות וחריצים.

עץ:
בדגמים עם מגשי/אלמנטי עץ
אפשר לשנות גוון.

אחריות:
שנה על הספוגים ושלדת העץ.
במקרה של תקלה המכוסה באחריות,
Casa Verona מגיעה לטפל.

=========================
MEMORY
=========================

חפש מידע גם בהודעה הנוכחית
וגם בכל היסטוריית השיחה.

שמור אם כבר נאמר:

דגם
מידה
צבע
בד
תקציב
העדפת נוחות
חיות בבית
צורך פרקטי
התנגדות
כוונת רכישה

אל תשאל שוב על מידע שכבר קיים.

requested_size הוא המידה
שהלקוח רוצה,
לא standard_size של המוצר.

=========================
TEMPERATURE
=========================

COLD:
התעניינות כללית.

WARM:
התעניינות אמיתית במוצר,
מידה, מחיר, התאמה או בחירה.

HOT:
כוונת רכישה חזקה,
בקשת מחיר מדויק אחרי איסוף מידע,
רצון להזמין/להתקדם/לסגור,
או התנגדות אחרונה לפני רכישה.

buying_signal:
מספר שלם 0-100.
הוא מדד פנימי בלבד.

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

עצם השאלה "כמה עולה?"
אינה התנגדות PRICE.

=========================
NEXT ACTION
=========================

בחר פעולה אחת בלבד:

ASK_PRODUCT
ASK_SIZE
ASK_STYLE
ASK_COLOR
ASK_COMFORT
ASK_PRIORITY
ANSWER_PRODUCT_INFO
SEND_MEDIA
OFFER_CATALOG
HANDLE_OBJECTION
HUMAN_QUOTE
ADVANCE_ORDER

=========================
TRUTH
=========================

אסור להמציא:

מחיר
טווח מחיר
מבצע
הנחה
מלאי
זמינות
חומר
בד
תכונת בד
מידה
משלוח
זמן אספקה
אחריות
תשלום
מדיה

הקטלוג,
VERIFIED SALES KNOWLEDGE
והשיחה הם מקורות האמת.

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
  "comfort_preference": null,
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
  "media_action": "NONE",
  "media_type": "NONE",
  "media_id": null,
  "media_reason": "",
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
QUALITY
FABRIC
COMFORT
TRUST
GENERAL

summary הוא תקציר עובדתי וקצר לנציג.
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
    console.error(
      "BRAIN JSON ERROR:",
      cleaned
    );

    return {
      stage: "NEW",
      intent: "GENERAL",
      product: "unknown",
      matched_product_id: null,
      requested_size: null,
      requested_color: null,
      requested_fabric: null,
      comfort_preference: null,
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
      media_action: "NONE",
      media_type: "NONE",
      media_id: null,
      media_reason: "",
      summary:
        "לא ניתן היה לנתח את הליד."
    };
  }
}
// =====================================
// HANDOFF ENGINE
// =====================================

function createHandoff(
  analysis,
  conversation = []
) {
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

    comfort_preference:
      analysis.comfort_preference || null,

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

עברית טבעית, קצרה, נעימה ובטוחה.
בדרך כלל 1-3 משפטים.

אל תכתוב נאומים.
אל תשאל כמה שאלות יחד.
אל תחזור על מידע שהלקוח כבר נתן.
אל תוסיף פרטים קטנים שהלקוח לא אמר.

הימנע ככל האפשר מניסוחים רובוטיים:

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

=========================
VERIFIED SALES KNOWLEDGE
=========================

${JSON.stringify(
  CASA_VERONA_KNOWLEDGE,
  null,
  2
)}

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
CORE RULE
=========================

פעל לפי next_action של ה-Brain,
אבל כתוב כמו איש מכירות אמיתי.

המטרה היא לקדם את המכירה
רק צעד אחד בכל הודעה.

אל תהפוך את השיחה לשאלון.

אל תנסה לדחוף את כל המפרט
בכל תשובה.

=========================
KNOWLEDGE USE
=========================

אם הלקוח שואל על איכות:

ענה בקצרה עם העובדות הרלוונטיות.

אפשר להסביר שהשלדה עשויה
עץ מלא בשילוב סנדוויץ' כפול
ושהספוג הוא HR40 של פולירון.

אם שואל על נוחות:

אפשר להסביר שאפשר לבחור
רך, בינוני או קשה,
ושהמבנה מיועד לתחושה
תומכת ונוחה.

אם הוא חושש משקיעה:

אפשר להסביר על HR40,
התחושה התומכת,
ושיש שנה אחריות
על הספוג והעץ.

אל תבטיח שהספה
"לעולם לא תשקע".

אם יש חתול:

אפשר לציין שיש אפשרויות בד
המתאימות לבתים עם חתולים.

אם הוא חושש מנוזלים:

אפשר לציין שיש אפשרויות
של בדים דוחי נוזלים.

אם הוא רוצה גוון עץ אחר
ובדגם יש אלמנט או מגש עץ:

אפשר לציין שאפשר
לשנות את הגוון.

בחלק מהדגמים קיימות
שכבות אקרילן או שכבות
דמויות נוצות.

אסור לייחס אותן
לדגם מסוים
בלי מידע מפורש.

=========================
ADAPTIVE QUESTIONS
=========================

אם next_action = ASK_PRODUCT:

ברר איזה מוצר או דגם
עניין אותו.

אם next_action = ASK_SIZE:

שאל רק על המידה
שהוא צריך.

אם next_action = ASK_STYLE:

שאל שאלה אחת קצרה
על הכיוון העיצובי.

אם next_action = ASK_COLOR:

שאל שאלה אחת קצרה
על הגוון.

אם next_action = ASK_COMFORT:

שאל אם הוא אוהב ישיבה
רכה, בינונית או קשה.

אם next_action = ASK_PRIORITY:

ברר מה הכי חשוב לו כרגע
רק אם זה באמת יעזור להתקדם.

=========================
PRODUCT INFORMATION
=========================

אם next_action =
ANSWER_PRODUCT_INFO:

ענה קודם על מה
שהלקוח שאל.

אל תקריא לו
את כל המפרט.

בחר רק את העובדות
שרלוונטיות לשאלה שלו.

אחרי שענית,
אפשר לקדם את השיחה
בשאלה אחת טבעית
רק אם צריך.

=========================
MEDIA
=========================

אם next_action = SEND_MEDIA:

ה-Brain החליט
שהוכחה ויזואלית יכולה
לעזור למכירה.

אבל כרגע אין
media_id או URL מאומת
שמאפשר לשרת לשלוח
את הקובץ בפועל.

לכן:

אל תגיד "שלחתי".

אל תגיד "מצרף".

אל תמציא תמונה.

אל תמציא סרטון.

אפשר לכתוב משפט קצר
שמכין את השיחה
להצגת חומר מתאים.

לדוגמה רעיונית בלבד:

אם הלקוח רוצה לראות
איך זה נראה בבית אמיתי,
אפשר לשאול:

"רוצה לראות איך זה נראה
אצל לקוח בבית?"

אל תחזור תמיד
על אותו משפט.

כאשר בעתיד יהיה
media_id אמיתי,
השרת יוכל לשלוח
את המדיה בפועל.

=========================
PRICE
=========================

אם price = null:

אסור לתת מספר.

אסור להמציא טווח.

אסור להמציא
נוסחת תמחור.

אם next_action = ASK_SIZE:

שאל את המידה
בצורה טבעית.

אל תשאל צבע ובד
רק בשביל לעכב מחיר.

=========================
HUMAN QUOTE
=========================

אם:

stage = HUMAN_HANDOFF

וגם:

next_action = HUMAN_QUOTE

אז הלקוח בשל
להצעת מחיר מדויקת
מנציג.

במקרה כזה:

אל תשאל שוב מידה.

אל תתחיל למכור
את המוצר מחדש.

אל תעמיס שאלות נוספות.

אמור בקצרה ובטבעיות
שהפרטים עוברים לנציג
שייתן מחיר מדויק
וימשיך איתו.

מותר לומר
"אני מעביר"
רק כאשר:

stage = HUMAN_HANDOFF

וגם:

needs_human = true

=========================
OBJECTIONS
=========================

אם next_action =
HANDLE_OBJECTION:

ענה קודם
להתנגדות עצמה.

אם הלקוח אומר:

"יקר לי"

אל תכתוב נאום.

אם התקציב עדיין לא ידוע,
אפשר לברר
באיזה טווח הוא
רצה להיות.

אם זו התנגדות אמון:

ענה בצורה רגועה
עם עובדות מאומתות.

אם הוכחה ויזואלית
יכולה לעזור,
ה-Brain יכול לבחור
SEND_MEDIA.

=========================
READY TO BUY
=========================

אם הלקוח רוצה להזמין,
לסגור או להתקדם:

אל תמכור לו מחדש.

אל תחזיר אותו
לשאלות שכבר עברנו.

אם ה-Brain סימן
HUMAN_HANDOFF:

קדם אותו לנציג
בצורה קצרה וטבעית.

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
רמת נוחות
התנגדות
כוונת רכישה

אל תשאל שוב
על מידע שכבר ידוע.

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
תכונת בד
אחריות
משלוח
זמן אספקה
תנאי תשלום
מידע על דגם
תמונה
סרטון

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
media_action
media_reason

=========================
FINAL CHECK
=========================

לפני השליחה בדוק:

האם ענית למה
שהלקוח צריך?

האם קידמת את המכירה
רק צעד אחד?

האם שאלת משהו
שכבר ידוע?

האם הוספת פרט
שהלקוח לא אמר?

האם המצאת מידע?

האם זה נשמע
כמו הודעת WhatsApp
של איש מכירות אמיתי?

החזר רק
את ההודעה ללקוח.
`;

  const answer =
    await callOpenAI(input);

  return (
    answer ||
    "היי, מה שלומך? איזה דגם ראית?"
  );
}

// =====================================
// WHATSAPP
// =====================================

async function sendWhatsAppMessage(
  to,
  message
) {
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
        Authorization:
          `Bearer ${WHATSAPP_ACCESS_TOKEN}`
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
          "Casa Verona Adaptive Sales Brain + Knowledge + Media Engine עובד!",
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
      serveHtml(
        res,
        "brain-test.html"
      );

      return;
    }

    // SALES SIMULATOR

    if (
      url.pathname ===
        "/sales-simulator" &&
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
        url.searchParams.get(
          "hub.mode"
        );

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
        token ===
          WHATSAPP_VERIFY_TOKEN
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
          JSON.stringify(
            data,
            null,
            2
          )
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
          await getAIAnswer(
            text,
            {
              currentLeadAnalysis:
                analysis,
              conversation
            }
          );

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
          מנתחים מחדש עם
          כל היסטוריית השיחה.

          כך ה-Brain זוכר
          מידע שהלקוח כבר מסר
          ויכול לבחור את הצעד
          הבא בצורה אדפטיבית.
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
    "Casa Verona Knowledge + Adaptive Sales + Media Decision Engine ready"
  );
});

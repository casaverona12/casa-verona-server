const http = require("http");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
// ======================================================
// ENV
// ======================================================

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
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY?.replace(/\s+/g, "").trim();

const supabase =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(
        SUPABASE_URL,
        SUPABASE_SECRET_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      )
    : null;
// ======================================================
// CATALOG
// ======================================================

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

    return JSON.parse(fs.readFileSync(catalogPath, "utf8"));
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

// ======================================================
// HELPERS
// ======================================================

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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['"׳״]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getConversationText(conversation = []) {
  if (!Array.isArray(conversation)) return "";

  return conversation
    .map((item) => {
      if (typeof item === "string") return item;

      return (
        item?.content ||
        item?.message ||
        item?.text ||
        ""
      );
    })
    .join(" ");
}

// ======================================================
// OPENAI
// ======================================================

// ======================================================
// SUPABASE MEMORY
// ======================================================

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  return supabase;
}

async function getOrCreateLead(phone) {
  const db = requireSupabase();

  const { data: existingLead, error: findError } =
    await db
      .from("leads")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

  if (findError) {
    throw new Error(
      `SUPABASE FIND LEAD ERROR: ${findError.message}`
    );
  }

  if (existingLead) {
    return existingLead;
  }

  const { data: newLead, error: insertError } =
    await db
      .from("leads")
      .insert({
        phone,
        source: "whatsapp",
        last_message_at: new Date().toISOString()
      })
      .select("*")
      .single();

  if (insertError) {
    throw new Error(
      `SUPABASE CREATE LEAD ERROR: ${insertError.message}`
    );
  }

  return newLead;
}

async function saveMessage({
  leadId,
  direction,
  sender,
  content,
  whatsappMessageId = null
}) {
  const db = requireSupabase();

  const row = {
    lead_id: leadId,
    direction,
    sender,
    message_type: "text",
    content
  };

  if (whatsappMessageId) {
    row.whatsapp_message_id = whatsappMessageId;
  }

  const { data, error } =
    await db
      .from("messages")
      .insert(row)
      .select("*")
      .single();

  if (error) {
    if (
      error.code === "23505" &&
      whatsappMessageId
    ) {
      return null;
    }

    throw new Error(
      `SUPABASE SAVE MESSAGE ERROR: ${error.message}`
    );
  }

  return data;
}

async function loadConversation(leadId, limit = 14) {
  const db = requireSupabase();

  const { data, error } =
    await db
      .from("messages")
      .select(
        "direction, sender, content, created_at"
      )
      .eq("lead_id", leadId)
      .order("created_at", {
        ascending: false
      })
      .limit(limit);

  if (error) {
    throw new Error(
      `SUPABASE LOAD CONVERSATION ERROR: ${error.message}`
    );
  }

  return (data || [])
    .reverse()
    .map((item) => ({
      role:
        item.sender === "CUSTOMER"
          ? "customer"
          : "assistant",

      content: item.content,

      created_at: item.created_at
    }));
}
async function loadCustomerBrain(leadId) {
  const db = requireSupabase();

  const [
    { data: lead, error: leadError },
    { data: aiState, error: aiStateError }
  ] = await Promise.all([
    db
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle(),

    db
      .from("lead_ai_state")
      .select("*")
      .eq("lead_id", leadId)
      .maybeSingle()
  ]);

  if (leadError) {
    throw new Error(
      `SUPABASE LOAD LEAD MEMORY ERROR: ${leadError.message}`
    );
  }

  if (aiStateError) {
    throw new Error(
      `SUPABASE LOAD AI MEMORY ERROR: ${aiStateError.message}`
    );
  }

  return {
    customer: lead || null,
    sales_state: aiState || null
  };
}


async function updateLeadFromAnalysis(
  leadId,
  analysis
) {
  const db = requireSupabase();

  const updates = {
    stage: analysis.stage,
    temperature: analysis.temperature,
    intent: analysis.intent,
    needs_human:
      analysis.needs_human === true,
    quote_ready:
      analysis.quote_ready === true,
    summary: analysis.summary || null,
    last_message_at:
      new Date().toISOString()
  };

  if (
    analysis.product &&
    analysis.product !== "unknown"
  ) {
    updates.product_interest =
      analysis.product;
  }

  if (analysis.matched_product_id) {
    updates.product_id =
      analysis.matched_product_id;
  }

  if (analysis.requested_size) {
    updates.requested_size =
      analysis.requested_size;
  }

  if (analysis.requested_color) {
    updates.requested_color =
      analysis.requested_color;
  }

  if (analysis.requested_fabric) {
    updates.requested_fabric =
      analysis.requested_fabric;
  }

  if (analysis.comfort_preference) {
    updates.comfort_preference =
      analysis.comfort_preference;
  }

  if (analysis.budget) {
    updates.budget =
      analysis.budget;
  }

  if (
    analysis.primary_motivation &&
    analysis.primary_motivation !== "UNKNOWN"
  ) {
    updates.primary_motivation =
      analysis.primary_motivation;
  }

  if (
    analysis.purchase_blocker &&
    analysis.purchase_blocker !== "UNKNOWN"
  ) {
    updates.purchase_blocker =
      analysis.purchase_blocker;
  }

  const { error } =
    await db
      .from("leads")
      .update(updates)
      .eq("id", leadId);

  if (error) {
    throw new Error(
      `SUPABASE UPDATE LEAD ERROR: ${error.message}`
    );
  }
}

async function saveAIState(
  leadId,
  analysis
) {
  const db = requireSupabase();

  const { error } =
    await db
      .from("lead_ai_state")
      .upsert(
        {
          lead_id: leadId,

          stage:
            analysis.stage || null,

          intent:
            analysis.intent || null,

          sales_objective:
            analysis.sales_objective || null,

          next_action:
            analysis.next_action || null,

          buying_signal:
            String(
              analysis.buying_signal ?? 0
            ),

          objection:
            analysis.objection || null,

          missing_information:
            JSON.stringify(
              analysis.missing_information || []
            ),

          needs_human:
            analysis.needs_human === true,

          should_offer_catalog:
            analysis.should_offer_catalog === true,

          quote_ready:
            analysis.quote_ready === true,

          handoff_reason:
            analysis.handoff_reason || null,

          should_offer_callback:
            analysis.should_offer_callback === true,

          callback_requested:
            analysis.callback_requested === true,

          requested_callback_time:
            analysis.requested_callback_time || null,

          media_action:
            analysis.media_action || null,

          media_type:
            analysis.media_type || null,

          media_id:
            analysis.media_id || null,

          media_reason:
            analysis.media_reason || null,

          summary:
            analysis.summary || null,

          updated_at:
            new Date().toISOString()
        },
        {
          onConflict: "lead_id"
        }
      );

  if (error) {
    throw new Error(
      `SUPABASE SAVE AI STATE ERROR: ${error.message}`
    );
  }
}
async function saveCallbackRequest(
  leadId,
  analysis
) {
  if (
    analysis.callback_requested !== true
  ) {
    return;
  }

  const db = requireSupabase();

  const { error } =
    await db
      .from("callback_requests")
      .insert({
        lead_id: leadId,

        requested_time_text:
          analysis.requested_callback_time ||
          null,

        status: "REQUESTED",

        notes:
          analysis.summary || null
      });

  if (error) {
    throw new Error(
      `SUPABASE CALLBACK ERROR: ${error.message}`
    );
  }
}
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

// ======================================================
// VERIFIED CASA VERONA KNOWLEDGE
// ======================================================

const CASA_VERONA_KNOWLEDGE = {
  business: {
    brand: "Casa Verona",

    sales_model:
      "העסק מוכר ריהוט בהזמנה ובהתאמה אישית דרך האונליין.",

    rule:
      "אין להמציא עובדות עסקיות שלא מופיעות בידע המאומת או בקטלוג."
  },

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
      "יש ל-Casa Verona תמונות וסרטונים אמיתיים. כרגע הקבצים עדיין לא ממופים ל-media_id או URL במנוע.",

    rule:
      "מותר להמליץ על סוג המדיה שכדאי לשלוח, אך אסור לטעון שתמונה או סרטון נשלחו עד שקיים קובץ אמיתי שמחובר למערכת."
  }
};

// ======================================================
// PRODUCT MATCHER
// ======================================================

function findRelevantProduct(message, conversation = []) {
  const catalog = getCatalog();

  const products = Array.isArray(catalog.products)
    ? catalog.products
    : [];

  const haystack = normalizeText(
    `${getConversationText(conversation)} ${message}`
  );

  // Exact names / IDs / slugs
  for (const product of products) {
    const candidates = [
      product.name,
      product.id,
      product.slug
    ]
      .filter(Boolean)
      .map(normalizeText);

    if (
      candidates.some(
        (candidate) =>
          candidate &&
          haystack.includes(candidate)
      )
    ) {
      return product;
    }
  }

  // Hebrew / common aliases
  const aliases = [
    {
      terms: ["מון שרי", "מון צרי", "mon cheri"],
      productName: "Mon Cheri"
    },
    {
      terms: ["טורינו", "torino", "torino moderno"],
      productName: "Torino Moderno"
    },
    {
      terms: ["לוסו", "lusso"],
      productName: "LUSSO"
    },
    {
      terms: ["אלבה", "alba", "alaba"],
      productName: "ALABA"
    },
    {
      terms: ["דולצה ויטה", "dolce vita"],
      productName: "Dolce Vita Sofa"
    },
    {
      terms: ["פירנצה", "firenze"],
      productName: "Firenze Modular"
    },
    {
      terms: ["טומי", "tommy"],
      productName: "Tommy"
    },
    {
      terms: ["בלה", "bella"],
      productName: "BELLA"
    },
    {
      terms: ["אינדילה", "indila"],
      productName: "INDILA"
    },
    {
      terms: ["סרנו", "sereno"],
      productName: "SERENO"
    },
    {
      terms: ["מורבידו", "morbido"],
      productName: "MORBIDO"
    },
    {
      terms: ["אלגנזה", "eleganza"],
      productName: "ELEGANZA"
    },
    {
      terms: ["קומו", "lago como", "divano lago como"],
      productName: "Divano Lago Como"
    },
    {
      terms: ["קטליה", "cattle ya"],
      productName: "CATTLE YA"
    }
  ];

  for (const alias of aliases) {
    const matched = alias.terms.some((term) =>
      haystack.includes(normalizeText(term))
    );

    if (!matched) continue;

    const product = products.find(
      (item) =>
        normalizeText(item.name) ===
        normalizeText(alias.productName)
    );

    if (product) return product;
  }

  return null;
}

function getCompactProduct(product) {
  if (!product) return null;

  return {
    id: product.id ?? null,
    name: product.name ?? null,
    category: product.category ?? null,
    standard_size: product.standard_size ?? null,
    price: product.price ?? null,
    delivery_time: product.delivery_time ?? null,
    customizable: product.customizable ?? null,
    custom_sizes: product.custom_sizes ?? null,
    colors: product.colors ?? null,
    fabrics: product.fabrics ?? null
  };
}

// ======================================================
// SALES BRAIN DEFAULT STATE
// ======================================================

function createDefaultAnalysis() {
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

    // What appears to matter most to this lead.
    primary_motivation: "UNKNOWN",

    // What currently blocks the purchase.
    purchase_blocker: "UNKNOWN",

    // Current sales objective.
    sales_objective: "DISCOVER_NEED",

    temperature: "COLD",
    buying_signal: 0,

    objection: "",

    missing_information: [],

    next_action: "ASK_PRODUCT",

    needs_human: false,

    should_offer_catalog: false,
    quote_ready: false,

    handoff_reason: null,

    // Callback / closing-call state.
    should_offer_callback: false,
    callback_requested: false,
    requested_callback_time: null,

    media_action: "NONE",
    media_type: "NONE",
    media_id: null,
    media_reason: "",

    summary: ""
  };
}

// ======================================================
// SMART FALLBACK
// Used only if AI returns no usable customer reply.
// ======================================================

function getSmartFallbackReply(message, analysis = {}) {
  const text = normalizeText(message);

  const hasProduct =
    analysis.product &&
    analysis.product !== "unknown";

  if (hasProduct) {
    return "מה הכי חשוב לך לדעת על הדגם כדי שנדייק לך אותו?";
  }

  const asksPrice = [
    "מחיר",
    "כמה עולה",
    "כמה זה עולה",
    "עלות"
  ].some((word) =>
    text.includes(normalizeText(word))
  );

  if (asksPrice) {
    return "על איזה סלון או רהיט מהפרסום אתה מדבר?";
  }

  const generalInterest = [
    "מעוניין",
    "מעוניינת",
    "פרטים",
    "אפשר פרטים",
    "ראיתי את הפרסום",
    "ראיתי בפרסום"
  ].some((word) =>
    text.includes(normalizeText(word))
  );

  if (generalInterest) {
    return "איזה רהיט מהפרסום תפס לך את העין?";
  }

  return "איזה רהיט ראית אצלנו או שאתה מחפש כרגע?";
}

// ======================================================
// ONE-CALL AI SALES CLOSER
// ======================================================

async function runSalesEngine(
  message,
  conversation = [],
  customerBrain = null
) {
  const relevantProduct =
    findRelevantProduct(message, conversation);

  const productContext =
    getCompactProduct(relevantProduct);

  const compactConversation =
    Array.isArray(conversation)
      ? conversation.slice(-14)
      : [];

  const input = `
אתה AI Sales Closer של Casa Verona.

CUSTOMER MEMORY:
${customerBrain
  ? JSON.stringify(customerBrain, null, 2)
  : "אין עדיין זיכרון קודם על הלקוח."}

כל המידע ב-CUSTOMER MEMORY הוא מידע שנשמר משיחות קודמות עם אותו לקוח.

השתמש בו כדי לזכור פרטים שהלקוח כבר מסר.
אל תשאל שוב שאלה שכבר יש עליה תשובה בזיכרון.
אל תמציא מידע שחסר בזיכרון.
אם ההודעה הנוכחית של הלקוח סותרת מידע ישן בזיכרון,
המידע החדש גובר.

אתה לא צ'אטבוט שירות לקוחות.
אתה איש מכירות מקצועי שמנהל שיחת WhatsApp טבעית.

בקריאת AI אחת בלבד אתה חייב:
1. להבין את מצב הליד.
2. להבין מה מניע אותו ומה עוצר אותו.
3. לבחור את מהלך המכירה הבא.
4. לכתוב את ההודעה שהלקוח יקבל.

המטרה היא לקדם את הלקוח בצורה חכמה והוגנת
לעבר החלטת רכישה כאשר המוצר באמת מתאים לו.

================================
CORE SALES THINKING
================================

לפני כתיבת reply חשוב פנימית:

מה הלקוח רוצה?

למה זה חשוב לו?

מה נראה שהוא מחפש:
עיצוב,
נוחות,
איכות,
פרקטיות,
התאמה לבית,
ביטחון בקנייה,
או מחיר?

מה כרגע מונע ממנו להתקדם?

מה חסר לו כדי להרגיש בטוח בהחלטה?

מהו הצעד הקטן והטבעי ביותר
שיקדם את העסקה עכשיו?

האם צריך:
לגלות צורך,
לבנות רצון,
לבנות אמון,
להסביר ערך,
להוכיח התאמה,
לטפל בהתנגדות,
ליצור התחייבות קטנה,
או לעבור לסגירה?

================================
SALES PSYCHOLOGY
================================

השתמש בעקרונות מכירה מקצועיים ואתיים.

DISCOVERY:
אל תאסוף נתונים סתם.
שאל רק מידע שישפיע על ההמלצה או הסגירה.

MIRRORING:
התייחס למה שהלקוח אמר
כדי שירגיש שמבינים אותו,
אבל אל תחזור כמו תוכי על המשפט שלו.

VALUE MATCHING:
אל תזרוק רשימת יתרונות.
חבר את היתרון לצורך של הלקוח.

לדוגמה:
אם החשש הוא שקיעה,
HR40 והאחריות רלוונטיים.

אם יש חתול,
אפשרויות הבד הרלוונטיות חשובות.

אם החשש הוא קנייה אונליין,
אמון והוכחה אמיתית חשובים יותר
מעוד מפרט טכני.

SOCIAL PROOF:
אפשר להמליץ על תמונה או סרטון אמיתי
מבית לקוח כאשר זה יעזור לביטחון,
אבל אסור להמציא ביקורות,
לקוחות או מספרי מכירות.

LOSS AVERSION:
אסור ליצור פחד,
מחסור מזויף,
דדליין מזויף
או "נשאר אחרון"
בלי מידע אמיתי.

COMMITMENT:
כאשר מתאים,
קדם את הלקוח להתחייבות קטנה וטבעית:
בחירת מידה,
כיוון צבע,
רמת נוחות,
או הסכמה להתקדם להצעת מחיר.

OBJECTION:
אל תתווכח עם התנגדות.

הבן אותה,
ענה על הסיבה האמיתית,
ואז קדם צעד אחד.

CLOSING:
כאשר הלקוח כבר בשל,
הפסק לחקור.

אל תשאל שאלות מיותרות
רק כי יש עוד שדות שאפשר למלא.

================================
SALES OBJECTIVES
================================

sales_objective חייב להיות אחד:

DISCOVER_NEED
BUILD_DESIRE
BUILD_TRUST
PROVE_FIT
BUILD_VALUE
RESOLVE_OBJECTION
CREATE_COMMITMENT
CLOSE
SCHEDULE_CLOSING_CALL

================================
LEADS FROM ADS
================================

רוב הלידים מגיעים
ממודעות Facebook / Instagram
ישירות ל-WhatsApp.

לכן הודעות כמו:

"מחיר?"
"כמה עולה?"
"אפשר פרטים?"
"מעוניין"
"ראיתי את הפרסום"

בלי שם דגם הן נורמליות.

אם CURRENT PRODUCT הוא null:

אל תמציא מוצר.

אל תניח שהלקוח יודע
את שם הדגם.

אל תכריח אותו לדעת
שמות מהקטלוג.

אם לא ברור אפילו סוג הרהיט,
ברר בצורה טבעית
על איזה רהיט מהפרסום מדובר.

שאלה אחת בלבד.

אם ההיסטוריה כבר מבהירה
באיזה מוצר מדובר,
אל תשאל שוב.

================================
CURRENT PRODUCT
================================

${JSON.stringify(productContext, null, 2)}

אם נמצא מוצר,
השתמש רק במידע הקיים בו
ובידע העסקי המאומת.

================================
VERIFIED KNOWLEDGE
================================

${JSON.stringify(CASA_VERONA_KNOWLEDGE, null, 2)}

================================
RECENT CONVERSATION
================================

${JSON.stringify(compactConversation, null, 2)}

================================
CURRENT MESSAGE
================================

${message}

================================
CONVERSATION STYLE
================================

reply צריך להישמע
כמו איש מכירות ישראלי טוב
ב-WhatsApp.

טבעי.
קצר.
בטוח.
אנושי.

בדרך כלל 1-3 משפטים.

לא נאום.

לא שאלון.

שאלה אחת לכל היותר.

אל תשתמש שוב ושוב ב:
"בשמחה"
"כמובן"
"בהחלט"
"ניתן"
"אשמח לסייע"
"על מנת"

אל תפתח כל הודעה
באותו ניסוח.

אל תפעיל לחץ מיותר.

================================
STAGES
================================

stage חייב להיות אחד:

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
CALLBACK
HUMAN_HANDOFF

================================
ACTIONS
================================

next_action חייב להיות אחד:

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
BUILD_VALUE
CREATE_COMMITMENT
OFFER_CALLBACK
COLLECT_CALLBACK_TIME
HUMAN_QUOTE
ADVANCE_ORDER

================================
PRICE
================================

אם price הוא null:

אסור לתת מחיר.
אסור לתת טווח מחיר.
אסור להמציא מחיר.

אם הדגם ידוע
והלקוח מבקש מחיר
אבל חסרה מידה הנחוצה לתמחור:

stage = PRICE
next_action = ASK_SIZE
needs_human = false

אם standard_size קיימת,
מותר לציין אותה כמידת הדגם.

אל תכתוב אותה
ב-requested_size
עד שהלקוח מאשר אותה.

================================
HOT LEAD
================================

ליד יכול להיות HOT כאשר קיימים
סימני קנייה חזקים כגון:

הוא כבר בחר דגם,
מתקדם למידה או התאמה,
מבקש מחיר מדויק,
שואל איך מתקדמים,
רוצה לבצע הזמנה,
או נשארה לו התנגדות מרכזית אחת.

אל תגדיר HOT
רק בגלל הודעה כללית.

================================
CLOSING CALL
================================

כאשר שיחת סגירה אנושית
עשויה לעזור לסיים את העסקה,
מותר להציע שיחה קצרה עם נציג.

במצב כזה:

sales_objective =
SCHEDULE_CLOSING_CALL

next_action =
OFFER_CALLBACK

should_offer_callback = true

אבל:

אסור להגיד ששיחה נקבעה
לפני שהלקוח הסכים.

אסור להמציא שעה פנויה.

אם הלקוח מסכים לשיחה
אבל לא נתן זמן:

stage = CALLBACK
next_action = COLLECT_CALLBACK_TIME
callback_requested = true

שאל מתי נוח לו.

אם הוא אומר:
"עוד שעה"
"בערב"
"מחר ב-10"
או זמן אחר:

שמור את הניסוח
ב-requested_callback_time.

callback_requested = true

needs_human = true

handoff_reason =
CALLBACK_REQUESTED

חשוב:
כרגע אין חיבור יומן מאומת.

לכן אפשר לרשום
שהלקוח ביקש שיחה בזמן מסוים,
אבל אסור להבטיח
שהפגישה נקבעה ביומן.

================================
DIRECT CLOSE
================================

אם הלקוח אומר במפורש:

"רוצה להזמין"
"בוא נסגור"
"איך מזמינים"
"אני רוצה להתקדם"
או כוונת רכישה ברורה:

stage = HUMAN_HANDOFF
sales_objective = CLOSE
next_action = ADVANCE_ORDER
needs_human = true
handoff_reason = READY_TO_BUY

אל תמשיך לחמם ליד
שכבר רוצה לקנות.

================================
EXACT QUOTE
================================

אם הלקוח מבקש מחיר מדויק
וכבר יש את המידע הדרוש:

stage = HUMAN_HANDOFF
sales_objective = CLOSE
next_action = HUMAN_QUOTE
needs_human = true
quote_ready = true
handoff_reason = PRICE_REQUEST

================================
OBJECTIONS
================================

objection חייב להיות אחד מאלה
כאשר קיימת התנגדות:

PRICE
TRUST
DELIVERY
SIZE
QUALITY
PAYMENT
TIME
UNCERTAINTY

או "".

"כמה עולה?"
אינו objection PRICE.

אם אומר "יקר לי":

אל תציע הנחה אוטומטית.

נסה להבין האם מדובר
בתקציב אמיתי
או בחוסר הצדקה לערך.

אם מתאים,
אפשר לשאול באיזה טווח
הוא רצה להיות.

אם ההתנגדות TRUST:

ענה עם עובדות אמיתיות בלבד.

אפשר להמליץ
על הוכחה ויזואלית אמיתית.

================================
PRODUCT KNOWLEDGE
================================

אם שואל על איכות:

אפשר להסביר בקצרה
על עץ מלא בשילוב
סנדוויץ' כפול
ועל HR40 של פולירון.

אם שואל על נוחות:

אפשר להסביר
שאפשר לבחור
רך, בינוני או קשה.

אם חושש משקיעה:

אפשר להסביר
על HR40,
התחושה התומכת,
ושנה אחריות
על הספוג ושלדת העץ.

אל תבטיח
שהספה לעולם לא תשקע.

אם יש חתול:

אפשר לציין
שיש אפשרויות בד
המתאימות לבתים עם חתולים.

אם חושש מנוזלים:

אפשר לציין
שיש אפשרויות בד
דוחות נוזלים.

================================
MEDIA STRATEGY
================================

media_action:

NONE
RECOMMEND_IMAGE
RECOMMEND_VIDEO

media_type:

NONE
CUSTOMER_HOME
PRODUCT
FABRIC
COLOR
DETAIL
PRODUCTION
SOCIAL_PROOF

חשש מאונליין:
CUSTOMER_HOME או SOCIAL_PROOF

רוצה לראות דגם:
PRODUCT

התלבטות בד:
FABRIC

התלבטות צבע:
COLOR

איכות / גימור:
DETAIL או PRODUCTION

כרגע:
media_id = null

לכן אסור לומר:
"שלחתי"
"מצרף"
"הנה הסרטון"

עד שמדיה אמיתית
מחוברת למערכת.

================================
MOTIVATION
================================

primary_motivation חייב להיות אחד:

DESIGN
COMFORT
QUALITY
PRACTICALITY
CUSTOMIZATION
TRUST
PRICE
DELIVERY
UNKNOWN

אל תנחש בביטחון
אם אין מספיק מידע.

================================
PURCHASE BLOCKER
================================

purchase_blocker חייב להיות אחד:

PRICE
TRUST
COMFORT
SIZE
QUALITY
DELIVERY
PAYMENT
UNCERTAINTY
NONE
UNKNOWN

================================
TEMPERATURE
================================

temperature:

COLD
WARM
HOT

buying_signal:
מספר שלם 0-100.

COLD:
התעניינות כללית.

WARM:
עניין ממשי במוצר,
מידה,
מחיר,
התאמה או מפרט.

HOT:
כוונת רכישה חזקה
או קרבה ממשית לסגירה.

================================
TRUTH
================================

אסור להמציא:

מחיר
טווח מחיר
הנחה
מבצע
מלאי
זמינות
זמן אספקה
משלוח
תנאי תשלום
חומר
תכונת בד
מידה
אחריות
פרט על מוצר
לקוח
ביקורת
תמונה
סרטון
זמן פנוי לשיחה

================================
OUTPUT
================================

החזר JSON תקין בלבד.

בלי markdown.
בלי טקסט נוסף.

{
  "analysis": {
    "stage": "NEW",
    "intent": "GENERAL",
    "product": "unknown",
    "matched_product_id": null,
    "requested_size": null,
    "requested_color": null,
    "requested_fabric": null,
    "comfort_preference": null,
    "budget": null,
    "primary_motivation": "UNKNOWN",
    "purchase_blocker": "UNKNOWN",
    "sales_objective": "DISCOVER_NEED",
    "temperature": "COLD",
    "buying_signal": 0,
    "objection": "",
    "missing_information": [],
    "next_action": "ASK_PRODUCT",
    "needs_human": false,
    "should_offer_catalog": false,
    "quote_ready": false,
    "handoff_reason": null,
    "should_offer_callback": false,
    "callback_requested": false,
    "requested_callback_time": null,
    "media_action": "NONE",
    "media_type": "NONE",
    "media_id": null,
    "media_reason": "",
    "summary": ""
  },
  "reply": ""
}

intent חייב להיות אחד:

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
CALLBACK
GENERAL

summary:
תקציר קצר ועובדתי לנציג.

reply:
רק ההודעה שהלקוח יקבל.

לעולם אל תחשוף ב-reply
את הניתוח הפנימי,
stage,
temperature,
buying_signal,
sales_objective,
next_action,
handoff_reason,
או media_reason.
`;

  const text = await callOpenAI(input);

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    const analysis = {
      ...createDefaultAnalysis(),
      ...(parsed.analysis || {})
    };

    if (relevantProduct) {
      if (
        !analysis.product ||
        analysis.product === "unknown"
      ) {
        analysis.product =
          relevantProduct.name;
      }

      if (
        !analysis.matched_product_id
      ) {
        analysis.matched_product_id =
          relevantProduct.id ?? null;
      }
    }

    let reply =
      String(parsed.reply || "").trim();

    if (!reply) {
      reply =
        getSmartFallbackReply(
          message,
          analysis
        );
    }

    return {
      analysis,
      reply
    };
  } catch (error) {
    console.error(
      "SALES ENGINE JSON ERROR:",
      cleaned
    );

    const analysis =
      createDefaultAnalysis();

    if (relevantProduct) {
      analysis.product =
        relevantProduct.name || "unknown";

      analysis.matched_product_id =
        relevantProduct.id ?? null;
    }

    return {
      analysis,

      reply:
        getSmartFallbackReply(
          message,
          analysis
        )
    };
  }
}
// ======================================================
// HUMAN HANDOFF / CLOSING PACKAGE
// ======================================================

function createHandoff(
  analysis,
  conversation = []
) {
  if (!analysis) {
    return null;
  }

  const needsHandoff =
    analysis.needs_human === true ||
    analysis.callback_requested === true ||
    analysis.stage === "HUMAN_HANDOFF";

  if (!needsHandoff) {
    return null;
  }

  return {
    type:
      analysis.callback_requested
        ? "CALLBACK_REQUEST"
        : "SALES_HANDOFF",

    reason:
      analysis.handoff_reason ||
      "HUMAN_REQUIRED",

    priority:
      analysis.temperature === "HOT"
        ? "HIGH"
        : "NORMAL",

    lead: {
      product:
        analysis.product || "unknown",

      product_id:
        analysis.matched_product_id ||
        null,

      requested_size:
        analysis.requested_size ||
        null,

      requested_color:
        analysis.requested_color ||
        null,

      requested_fabric:
        analysis.requested_fabric ||
        null,

      comfort_preference:
        analysis.comfort_preference ||
        null,

      budget:
        analysis.budget || null,

      primary_motivation:
        analysis.primary_motivation ||
        "UNKNOWN",

      purchase_blocker:
        analysis.purchase_blocker ||
        "UNKNOWN",

      temperature:
        analysis.temperature ||
        "COLD",

      buying_signal:
        Number(
          analysis.buying_signal || 0
        )
    },

    closing: {
      sales_objective:
        analysis.sales_objective ||
        null,

      quote_ready:
        analysis.quote_ready === true,

      callback_requested:
        analysis.callback_requested ===
        true,

      requested_callback_time:
        analysis.requested_callback_time ||
        null
    },

    summary:
      analysis.summary || "",

    conversation:
      Array.isArray(conversation)
        ? conversation.slice(-14)
        : []
  };
}

// ======================================================
// WHATSAPP
// ======================================================

async function sendWhatsAppMessage(
  to,
  message
) {
  if (
    !WHATSAPP_ACCESS_TOKEN ||
    !WHATSAPP_PHONE_NUMBER_ID
  ) {
    throw new Error(
      "WhatsApp credentials missing"
    );
  }

  if (!to || !message) {
    throw new Error(
      "WhatsApp recipient or message missing"
    );
  }

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${WHATSAPP_ACCESS_TOKEN}`,

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        messaging_product:
          "whatsapp",

        recipient_type:
          "individual",

        to,

        type: "text",

        text: {
          preview_url: false,
          body: message
        }
      })
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "WHATSAPP SEND ERROR:",
      data
    );

    throw new Error(
      data.error?.message ||
      "WhatsApp send failed"
    );
  }

  return data;
}

// ======================================================
// SERVER
// ======================================================
// =====================================================
// CASA VERONA OS — AUTH & ROLES
// =====================================================

const USER_ROLES = {
  ADMIN: "ADMIN",
  FACTORY_OWNER: "FACTORY_OWNER",
  FACTORY_WORKER: "FACTORY_WORKER",
  SALES: "SALES"
};

async function getAuthenticatedUser(req) {
  const db = requireSupabase();

  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error: authError
  } = await db.auth.getUser(token);

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } =
    await db
      .from("user_profiles")
      .select(`
        id,
        full_name,
        phone,
        role,
        language,
        is_active
      `)
      .eq("id", user.id)
      .single();

  if (
    profileError ||
    !profile ||
    profile.is_active !== true
  ) {
    return null;
  }

  return {
    user,
    profile
  };
}

function sendUnauthorized(res) {
  res.writeHead(401, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(
    JSON.stringify({
      success: false,
      error: "UNAUTHORIZED"
    })
  );
}

function sendForbidden(res) {
  res.writeHead(403, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(
    JSON.stringify({
      success: false,
      error: "FORBIDDEN"
    })
  );
}

async function requireAuth(req, res, allowedRoles = []) {
  const auth = await getAuthenticatedUser(req);

  if (!auth) {
    sendUnauthorized(res);
    return null;
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(auth.profile.role)
  ) {
    sendForbidden(res);
    return null;
  }

  return auth;
}

const server =
  http.createServer(
    async (req, res) => {
      try {
        
        // -----------------------------------------------
        // CORS
        // -----------------------------------------------

        res.setHeader(
          "Access-Control-Allow-Origin",
          "*"
        );

        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type"
        );

        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, OPTIONS"
        );

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        const url =
          new URL(
            req.url,
            `http://${req.headers.host}`
          );

        
        // -----------------------------------------------
// API - LEADS
// -----------------------------------------------

if (
  req.method === "GET" &&
  url.pathname === "/api/leads"
) {
  const db = requireSupabase();

  const { data, error } =
    await db
      .from("leads")
      .select("*")
      .order("last_message_at", {
        ascending: false,
        nullsFirst: false
      });

  if (error) {
    throw new Error(
      `SUPABASE LOAD LEADS ERROR: ${error.message}`
    );
  }

  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(
    JSON.stringify({
      success: true,
      count: data?.length || 0,
      leads: data || []
    })
  );

  return;
}

        // -----------------------------------------------
// API - ORDERS
// -----------------------------------------------

if (
  req.method === "GET" &&
  url.pathname === "/api/orders"
) {
  const db = requireSupabase();

  const { data, error } =
    await db
      .from("orders")
      .select(`
        *,
        production_orders (*),
        deliveries (*)
      `)
      .order("created_at", {
        ascending: false
      });

  if (error) {
    throw new Error(
      `SUPABASE LOAD ORDERS ERROR: ${error.message}`
    );
  }

  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(
    JSON.stringify({
      success: true,
      count: data?.length || 0,
      orders: data || []
    })
  );

  return;
}

// =====================================================
// FACTORY API — SAFE PRODUCTION VIEW
// =====================================================

if (
  req.method === "GET" &&
  url.pathname === "/api/factory/orders"
) {
  const auth = await requireAuth(req, res, [
    USER_ROLES.FACTORY_OWNER,
    USER_ROLES.FACTORY_WORKER,
    USER_ROLES.ADMIN
  ]);

  if (!auth) {
    return;
  }

  const db = requireSupabase();

let ordersQuery =
  db
  
  .from("orders")
    .select(`
      id,
      order_number,
      product_name,
      product_id,
      dimensions,
      width,
      depth,
      chaise_length,
      chaise_side,
      fabric_type,
      fabric_company,
      fabric_collection,
      fabric_code,
      color,
      comfort,
      production_notes,
      special_requests,
      target_delivery_date,
      reference_image_url,
      model_image_url,
      status,
      production_orders!inner (
        id,
        status,
        assigned_worker_id,
        created_at,
        updated_at
      )
    `);

// Regular factory workers can only see work assigned to them
if (auth.profile.role === USER_ROLES.FACTORY_WORKER) {
  ordersQuery = ordersQuery.eq(
    "production_orders.assigned_worker_id",
    auth.user.id
  );
}

const { data, error } =
  await ordersQuery.order("created_at", {
    ascending: false
  });

  if (error) {
    throw new Error(
      `SUPABASE FACTORY ORDERS ERROR: ${error.message}`
    );
  }

  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(
    JSON.stringify({
      success: true,
      count: data?.length || 0,
      orders: data || []
    })
  );

  return;
}

// =====================================================
// FACTORY API — UPDATE PRODUCTION STATUS
// =====================================================

if (
  req.method === "PATCH" &&
  url.pathname.startsWith("/api/factory/production/")
) {
  const auth = await requireAuth(req, res, [
    USER_ROLES.FACTORY_OWNER,
    USER_ROLES.FACTORY_WORKER,
    USER_ROLES.ADMIN
  ]);

  if (!auth) {
    return;
  }

  const productionId =
    url.pathname.split("/").filter(Boolean).pop();

  if (!productionId) {
    res.writeHead(400, {
      "Content-Type": "application/json; charset=utf-8"
    });

    res.end(
      JSON.stringify({
        success: false,
        error: "MISSING_PRODUCTION_ID"
      })
    );

    return;
  }

  const bodyText = await readRequestBody(req);

  let body;

  try {
    body = JSON.parse(bodyText || "{}");
  } catch {
    res.writeHead(400, {
      "Content-Type": "application/json; charset=utf-8"
    });

    res.end(
      JSON.stringify({
        success: false,
        error: "INVALID_JSON"
      })
    );

    return;
  }

  const allowedStatuses = [
    "WAITING",
    "IN_PROGRESS",
    "READY"
  ];

  if (!allowedStatuses.includes(body.status)) {
    res.writeHead(400, {
      "Content-Type": "application/json; charset=utf-8"
    });

    res.end(
      JSON.stringify({
        success: false,
        error: "INVALID_PRODUCTION_STATUS"
      })
    );

    return;
  }

  const db = requireSupabase();

// Get the current status before changing it
const {
  data: currentProduction,
  error: currentProductionError
} = await db
  .from("production_orders")
  .select("id, order_id, status")
  .eq("id", productionId)
  .single();

if (currentProductionError || !currentProduction) {
  res.writeHead(404, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(
    JSON.stringify({
      success: false,
      error: "PRODUCTION_ORDER_NOT_FOUND"
    })
  );

  return;
}

const oldStatus = currentProduction.status;

// Update production status
const { data, error } =
  await db
    .from("production_orders")
    .update({
      status: body.status,
      updated_at: new Date().toISOString()
    })
    .eq("id", productionId)
    .select(`
      id,
      order_id,
      status,
      created_at,
      updated_at
    `)
    .single();

if (error) {
  throw new Error(
    `SUPABASE UPDATE PRODUCTION ERROR: ${error.message}`
  );
}

// Save activity: who changed what and when
const { error: activityError } =
  await db
    .from("production_activity")
    .insert({
      production_order_id: productionId,
      user_id: auth.user.id,
      action: "STATUS_CHANGED",
      old_status: oldStatus,
      new_status: body.status
    });

if (activityError) {
  throw new Error(
    `SUPABASE PRODUCTION ACTIVITY ERROR: ${activityError.message}`
  );
}

res.writeHead(200, {
  "Content-Type": "application/json; charset=utf-8"
});

res.end(
  JSON.stringify({
    success: true,
    production_order: data
  })
);

return;
}

// =====================================================
// FACTORY API — ASSIGN WORKER
// Only FACTORY_OWNER / ADMIN
// =====================================================

if (
  req.method === "PATCH" &&
  url.pathname.startsWith("/api/factory/assign-worker/")
) {
  const auth = await requireAuth(req, res, [
    USER_ROLES.FACTORY_OWNER,
    USER_ROLES.ADMIN
  ]);

  if (!auth) {
    return;
  }

  const productionId =
    url.pathname.split("/").filter(Boolean).pop();

  if (!productionId) {
    res.writeHead(400, {
      "Content-Type": "application/json; charset=utf-8"
    });

    res.end(
      JSON.stringify({
        success: false,
        error: "MISSING_PRODUCTION_ID"
      })
    );

    return;
  }

  const bodyText = await readRequestBody(req);

  let body;

  try {
    body = JSON.parse(bodyText || "{}");
  } catch {
    res.writeHead(400, {
      "Content-Type": "application/json; charset=utf-8"
    });

    res.end(
      JSON.stringify({
        success: false,
        error: "INVALID_JSON"
      })
    );

    return;
  }

  if (!body.worker_id) {
    res.writeHead(400, {
      "Content-Type": "application/json; charset=utf-8"
    });

    res.end(
      JSON.stringify({
        success: false,
        error: "MISSING_WORKER_ID"
      })
    );

    return;
  }

  const db = requireSupabase();

  // Make sure the selected user is an active factory worker
  const { data: worker, error: workerError } =
    await db
      .from("user_profiles")
      .select("id, full_name, role, language, is_active")
      .eq("id", body.worker_id)
      .single();

  if (
    workerError ||
    !worker ||
    worker.role !== USER_ROLES.FACTORY_WORKER ||
    worker.is_active !== true
  ) {
    res.writeHead(400, {
      "Content-Type": "application/json; charset=utf-8"
    });

    res.end(
      JSON.stringify({
        success: false,
        error: "INVALID_FACTORY_WORKER"
      })
    );

    return;
  }

  // Assign worker to production order
  const { data: productionOrder, error } =
    await db
      .from("production_orders")
      .update({
        assigned_worker_id: worker.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", productionId)
      .select(`
        id,
        order_id,
        status,
        assigned_worker_id,
        updated_at
      `)
      .single();

  if (error) {
    throw new Error(
      `SUPABASE ASSIGN WORKER ERROR: ${error.message}`
    );
  }

  // Record the assignment in the activity log
  const { error: activityError } =
    await db
      .from("production_activity")
      .insert({
        production_order_id: productionId,
        user_id: auth.user.id,
        action: "WORKER_ASSIGNED"
      });

  if (activityError) {
    throw new Error(
      `SUPABASE PRODUCTION ACTIVITY ERROR: ${activityError.message}`
    );
  }

  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(
    JSON.stringify({
      success: true,
      production_order: productionOrder,
      assigned_worker: {
        id: worker.id,
        full_name: worker.full_name,
        language: worker.language
      }
    })
  );

  return;
}
// -----------------------------------------------
// API - CREATE ORDER
// -----------------------------------------------

if (
  req.method === "POST" &&
  url.pathname === "/api/orders"
) {
  const db = requireSupabase();

  const rawBody =
    await readRequestBody(req);

  let body;

  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    res.writeHead(400, {
      "Content-Type": "application/json; charset=utf-8"
    });

    res.end(
      JSON.stringify({
        success: false,
        error: "Invalid JSON"
      })
    );

    return;
  }

  const order = {
    lead_id:
      body.lead_id || null,

    customer_name:
      body.customer_name || null,

    customer_phone:
      body.customer_phone || null,

    product_name:
      body.product_name || null,

    product_id:
      body.product_id || null,

    dimensions:
      body.dimensions || null,

    width:
      body.width || null,

    depth:
      body.depth || null,

    chaise_length:
      body.chaise_length || null,

    chaise_side:
      body.chaise_side || null,

    fabric_type:
      body.fabric_type || null,

    fabric_company:
      body.fabric_company || null,

    fabric_collection:
      body.fabric_collection || null,

    fabric_code:
      body.fabric_code || null,

    color:
      body.color || null,

    comfort:
      body.comfort || null,

    customer_notes:
      body.customer_notes || null,

    production_notes:
      body.production_notes || null,

    special_requests:
      body.special_requests || null,

        model_image_url:
      body.model_image_url || null,

    reference_image_url:
      body.reference_image_url || null,

    sale_price:
      body.sale_price ?? null,

    product_cost:
      body.product_cost ?? null,

    delivery_cost:
      body.delivery_cost ?? null,

    target_delivery_date:
      body.target_delivery_date || null,

    status: "NEW"
  };

  const { data, error } =
    await db
      .from("orders")
      .insert(order)
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `SUPABASE CREATE ORDER ERROR: ${error.message}`
    );
  }

  const { error: productionError } =
    await db
      .from("production_orders")
      .insert({
        order_id: data.id,
        status: "WAITING"
      });

  if (productionError) {
    throw new Error(
      `SUPABASE CREATE PRODUCTION ERROR: ${productionError.message}`
    );
  }

  const { error: deliveryError } =
    await db
      .from("deliveries")
      .insert({
        order_id: data.id,
        status: "WAITING"
      });

  if (deliveryError) {
    throw new Error(
      `SUPABASE CREATE DELIVERY ERROR: ${deliveryError.message}`
    );
  }

  res.writeHead(201, {
    "Content-Type": "application/json; charset=utf-8"
  });
  
res.end(
  JSON.stringify({
    success: true,
    order: data
  })
);

  return;
}
        
        // -----------------------------------------------
        // HEALTH / HOME
        // -----------------------------------------------

        if (
          url.pathname === "/" &&
          req.method === "GET"
        ) {
          const catalog =
            getCatalog();

          sendJSON(
            res,
            200,
            {
              success: true,

              brand:
                "Casa Verona",

              message:
                "Casa Verona AI Sales Closer עובד!",

              engine:
                "ONE_CALL",

              ai_calls_per_message:
                1,

              sales_closer:
                true,

              callback_engine:
                true,

              catalog_products:
                Array.isArray(
                  catalog.products
                )
                  ? catalog.products.length
                  : 0
            }
          );

          return;
        }

        // -----------------------------------------------
        // BRAIN TEST PAGE
        // -----------------------------------------------

        if (
          url.pathname ===
            "/brain-test" &&
          req.method === "GET"
        ) {
          serveHtml(
            res,
            "brain-test.html"
          );

          return;
        }

        // -----------------------------------------------
        // SALES SIMULATOR PAGE
        // -----------------------------------------------

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

        // -----------------------------------------------
// DATABASE HEALTH
// -----------------------------------------------
// =====================================================
// AUTH TEST — CURRENT USER
// =====================================================

if (
  req.method === "GET" &&
  url.pathname === "/api/auth/me"
) {
  const auth = await requireAuth(req, res);

  if (!auth) {
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(
    JSON.stringify({
      success: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        full_name: auth.profile.full_name,
        phone: auth.profile.phone,
        role: auth.profile.role,
        language: auth.profile.language
      }
    })
  );

  return;
}

if (
  url.pathname === "/db-health" &&
  req.method === "GET"
) {
  if (!supabase) {
    sendJSON(
      res,
      500,
      {
        success: false,
        database: "not_configured"
      }
    );

    return;
  }

  const { error } =
    await supabase
      .from("leads")
      .select("id")
      .limit(1);

  if (error) {
    sendJSON(
      res,
      500,
      {
        success: false,
        database: "connection_failed",
        message: error.message
      }
    );

    return;
  }

  sendJSON(
    res,
    200,
    {
      success: true,
      database: "connected",
      memory: true
    }
  );

  return;
}

        // -----------------------------------------------
// MEMORY TEST
// -----------------------------------------------

if (
  url.pathname === "/memory-test" &&
  req.method === "GET"
) {
  if (!supabase) {
    sendJSON(res, 503, {
      success: false,
      error: "Supabase not configured"
    });
    return;
  }

  const phone =
    String(
      url.searchParams.get("phone") || ""
    ).trim();

  if (!phone) {
    sendJSON(res, 400, {
      success: false,
      error: "Missing phone"
    });
    return;
  }

  const lead =
    await getOrCreateLead(phone);

  const conversation =
    await loadConversation(
      lead.id,
      14
    );

  sendJSON(res, 200, {
    success: true,
    lead: {
      id: lead.id,
      phone: lead.phone,
      stage: lead.stage,
      temperature: lead.temperature,
      product_interest:
        lead.product_interest
    },
    conversation,
    messages_count:
      conversation.length
  });

  return;
}
        // -----------------------------------------------
        // CATALOG API
        // -----------------------------------------------

        if (
          url.pathname ===
            "/catalog" &&
          req.method === "GET"
        ) {
          sendJSON(
            res,
            200,
            {
              success: true,
              catalog: getCatalog()
            }
          );

          return;
        }

        // -----------------------------------------------
        // WHATSAPP WEBHOOK VERIFY
        // -----------------------------------------------

        if (
          url.pathname ===
            "/webhook" &&
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
            console.log(
              "WEBHOOK VERIFIED"
            );

            res.writeHead(200, {
              "Content-Type":
                "text/plain"
            });

            res.end(
              challenge || ""
            );

            return;
          }

          res.writeHead(403, {
            "Content-Type":
              "text/plain"
          });

          res.end("Forbidden");

          return;
        }

        // -----------------------------------------------
        // WHATSAPP INCOMING MESSAGE
        // -----------------------------------------------

        if (
          url.pathname ===
            "/webhook" &&
          req.method === "POST"
        ) {
          const body =
            await readRequestBody(req);

          let data;

          try {
            data =
              JSON.parse(
                body || "{}"
              );
          } catch (error) {
            console.error(
              "WEBHOOK JSON ERROR:",
              error
            );

            res.writeHead(200);
            res.end(
              "EVENT_RECEIVED"
            );

            return;
          }

          const change =
            data?.entry?.[0]
              ?.changes?.[0]
              ?.value;

          const incoming =
            change?.messages?.[0];

          // Ignore events that are not
          // incoming customer messages.
          if (!incoming) {
            res.writeHead(200);
            res.end(
              "EVENT_RECEIVED"
            );

            return;
          }

          const from =
            incoming.from;

          const messageType =
            incoming.type;

          // At this stage the AI sales engine
          // handles text messages.
          if (
            messageType !== "text"
          ) {
            console.log(
              "IGNORED WHATSAPP MESSAGE TYPE:",
              messageType
            );

            res.writeHead(200);
            res.end(
              "EVENT_RECEIVED"
            );

            return;
          }

          const customerMessage =
            String(
              incoming.text?.body ||
              ""
            ).trim();

          if (!customerMessage) {
            res.writeHead(200);
            res.end(
              "EVENT_RECEIVED"
            );

            return;
          }

          console.log(
            "📩 CUSTOMER:",
            from,
            customerMessage
          );

         
          const lead = await getOrCreateLead(from);
          
      const savedIncomingMessage =
  await saveMessage({
    leadId: lead.id,
    direction: "INCOMING",
    sender: "CUSTOMER",
    content: customerMessage,
    whatsappMessageId: incoming.id || null
  });

if (!savedIncomingMessage) {
  console.log(
    "♻️ DUPLICATE WHATSAPP MESSAGE:",
    incoming.id
  );

  res.writeHead(200);
  res.end("EVENT_RECEIVED");
  return;
}
const customerBrain =
  await loadCustomerBrain(lead.id);
          
const fullConversation =
  await loadConversation(lead.id, 15);

const conversation =
  fullConversation.slice(0, -1);
          
          // =============================================
          // EXACTLY ONE AI CALL
          // =============================================

          const result =
  await runSalesEngine(
    customerMessage,
    conversation,
    customerBrain
  );

          const analysis =
            result.analysis;
          
          

await updateLeadFromAnalysis(
  lead.id,
  analysis
);

await saveAIState(
  lead.id,
  analysis
);
          
          
await saveCallbackRequest(
  lead.id,
  analysis
);

          const handoff =
            createHandoff(
              analysis,
              conversation
            );

          console.log(
            "🧠 SALES BRAIN:",
            JSON.stringify(
              analysis,
              null,
              2
            )
          );

          if (handoff) {
            console.log(
              "🔥 HANDOFF:",
              JSON.stringify(
                handoff,
                null,
                2
              )
            );
          }

          // Send only the customer-facing
          // reply. Internal analysis never
          // goes to the customer.
          const whatsappResponse =
  await sendWhatsAppMessage(
    from,
    result.reply
  );

const outgoingMessageId =
  whatsappResponse?.messages?.[0]?.id || null;

await saveMessage({
  leadId: lead.id,
  direction: "OUTGOING",
  sender: "AI",
  content: result.reply,
  whatsappMessageId: outgoingMessageId
});
          res.writeHead(200, {
            "Content-Type":
              "text/plain"
          });

          res.end(
            "EVENT_RECEIVED"
          );

          return;
        }

        // -----------------------------------------------
        // BRAIN API
        // -----------------------------------------------

        if (
          url.pathname ===
            "/brain" &&
          req.method === "POST"
        ) {
          const body =
            await readRequestBody(req);

          const data =
            JSON.parse(
              body || "{}"
            );

          const message =
            String(
              data.message || ""
            );

          const conversation =
            Array.isArray(
              data.conversation
            )
              ? data.conversation
              : [];

          if (!message.trim()) {
            sendJSON(
              res,
              400,
              {
                success: false,
                error:
                  "חסרה הודעת לקוח"
              }
            );

            return;
          }

          // ONE AI CALL
          const result =
            await runSalesEngine(
              message,
              conversation
            );

          const handoff =
            createHandoff(
              result.analysis,
              conversation
            );

          sendJSON(
            res,
            200,
            {
              success: true,

              analysis:
                result.analysis,

              handoff,

              reply:
                result.reply,

              engine:
                "ONE_CALL"
            }
          );

          return;
        }
                // -----------------------------------------------
        // AI GET
        // Useful for quick browser tests
        // -----------------------------------------------

        if (
          url.pathname === "/ai" &&
          req.method === "GET"
        ) {
          const message =
            String(
              url.searchParams.get(
                "message"
              ) || ""
            ).trim();

          if (!message) {
            sendJSON(
              res,
              400,
              {
                success: false,
                error:
                  "חסרה הודעת לקוח"
              }
            );

            return;
          }

          const conversation = [];

          // =============================================
          // EXACTLY ONE AI CALL
          // =============================================

          const result =
            await runSalesEngine(
              message,
              conversation
            );

          const handoff =
            createHandoff(
              result.analysis,
              conversation
            );

          sendJSON(
            res,
            200,
            {
              success: true,

              answer:
                result.reply,

              analysis:
                result.analysis,

              handoff,

              engine:
                "ONE_CALL"
            }
          );

          return;
        }

        // -----------------------------------------------
        // AI POST
        // Main endpoint used by sales simulator
        // -----------------------------------------------

        if (
          url.pathname === "/ai" &&
          req.method === "POST"
        ) {
          const body =
            await readRequestBody(req);

          const data =
            JSON.parse(
              body || "{}"
            );

          const message =
            String(
              data.message || ""
            ).trim();

          const conversation =
            Array.isArray(
              data.conversation
            )
              ? data.conversation
              : [];

          if (!message) {
            sendJSON(
              res,
              400,
              {
                success: false,
                error:
                  "חסרה הודעת לקוח"
              }
            );

            return;
          }

          // =============================================
          // EXACTLY ONE AI CALL
          // Brain + sales reply together
          // =============================================

          const result =
            await runSalesEngine(
              message,
              conversation
            );

          const analysis =
            result.analysis;

          const handoff =
            createHandoff(
              analysis,
              conversation
            );

          if (handoff) {
            console.log(
              "🔥 SALES HANDOFF:",
              JSON.stringify(
                handoff,
                null,
                2
              )
            );
          }

          sendJSON(
            res,
            200,
            {
              success: true,

              answer:
                result.reply,

              analysis,

              handoff,

              engine:
                "ONE_CALL"
            }
          );

          return;
        }

        // -----------------------------------------------
        // 404
        // -----------------------------------------------

        sendJSON(
          res,
          404,
          {
            success: false,
            error: "Not found"
          }
        );
      } catch (error) {
        console.error(
          "SERVER ERROR:",
          error
        );

        sendJSON(
          res,
          500,
          {
            success: false,
            error:
              "Internal server error",

            message:
              error.message ||
              "Unknown error"
          }
        );
      }
    }
  );

// ======================================================
// START SERVER
// ======================================================

const PORT =
  process.env.PORT || 3000;

server.listen(
  PORT,
  () => {
    console.log(
      `Casa Verona server running on port ${PORT}`
    );

    console.log(
      "🧠 Sales Engine: ONE AI CALL per customer message"
    );

    console.log(
      "🔥 AI Sales Closer: ENABLED"
    );

    console.log(
      "📞 Closing Callback Engine: ENABLED"
    );
  }
);

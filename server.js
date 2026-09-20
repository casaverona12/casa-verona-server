const http = require("http");
const fs = require("fs");
const path = require("path");

// ================================
// טעינת .env
// ================================

const envPath = path.join(__dirname, ".env");

if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, "utf8");

  envText.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) return;

    const index = trimmed.indexOf("=");

    if (index === -1) return;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();

    process.env[key] = value;
  });
}

// ================================
// משתני סביבה
// ================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const WHATSAPP_ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN;

const WHATSAPP_VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || "casa_verona_2026";

const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID;

// ================================
// שרת
// ================================

const server = http.createServer(async (req, res) => {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // OPTIONS
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(
    req.url,
    "http://localhost:3000"
  );

  // ================================
  // בדיקת שרת
  // ================================

  if (
    url.pathname === "/" &&
    req.method === "GET"
  ) {

    res.writeHead(200, {
      "Content-Type":
        "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({
      success: true,
      message:
        "Casa Verona AI Engine + WhatsApp עובד!"
    }));

    return;
  }

  // ================================
  // WHATSAPP WEBHOOK - VERIFY
  // ================================

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

    console.log("WEBHOOK VERIFY:", {
      mode,
      tokenReceived: !!token,
      challengeReceived: !!challenge
    });

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

    res.writeHead(403, {
      "Content-Type": "text/plain"
    });

    res.end("Forbidden");

    return;
  }

  // ================================
  // WHATSAPP WEBHOOK - MESSAGES
  // ================================

  if (
    url.pathname === "/webhook" &&
    req.method === "POST"
  ) {

    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", async () => {

      try {

        const data =
          JSON.parse(body || "{}");

        console.log(
          "WHATSAPP WEBHOOK:",
          JSON.stringify(data, null, 2)
        );

        const message =
          data.entry?.[0]
            ?.changes?.[0]
            ?.value?.messages?.[0];

        if (!message) {

          res.writeHead(200);
          res.end("EVENT_RECEIVED");

          return;
        }

        // רק הודעות טקסט
        if (message.type !== "text") {

          res.writeHead(200);
          res.end("EVENT_RECEIVED");

          return;
        }

        const from =
          message.from;

        const text =
          message.text?.body || "";

        console.log(
          "לקוח:",
          from
        );

        console.log(
          "הודעה:",
          text
        );

        // ================================
        // AI
        // ================================

        const answer =
          await getAIAnswer(
            text,
            {
              leads: [],
              products: [],
              sales: [],
              orders: []
            }
          );

        // ================================
        // שליחת תשובה לוואטסאפ
        // ================================

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
    });

    return;
  }

  // ================================
  // AI - GET
  // ================================

  if (
    url.pathname === "/ai" &&
    req.method === "GET"
  ) {

    const message =
      url.searchParams.get("message") || "";

    await runAI(
      message,
      {},
      res
    );

    return;
  }

  // ================================
  // AI - POST
  // ================================

  if (
    url.pathname === "/ai" &&
    req.method === "POST"
  ) {

    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", async () => {

      try {

        const data =
          JSON.parse(body || "{}");

        const message =
          data.message || "";

        const businessData = {
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
        };

        await runAI(
          message,
          businessData,
          res
        );

      } catch (error) {

        console.error(
          "POST ERROR:",
          error
        );

        res.writeHead(400, {
          "Content-Type":
            "application/json; charset=utf-8"
        });

        res.end(JSON.stringify({
          success: false,
          error:
            "הנתונים שנשלחו אינם תקינים."
        }));
      }
    });

    return;
  }

  // ================================
  // 404
  // ================================

  res.writeHead(404, {
    "Content-Type":
      "application/json; charset=utf-8"
  });

  res.end(JSON.stringify({
    success: false,
    error: "Not Found"
  }));
});

// ================================
// AI ANSWER
// ================================

async function getAIAnswer(
  message,
  businessData
) {

  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY חסר"
    );
  }

  const input = `

אתה מנוע המכירות וה-AI של Casa Verona.

Casa Verona היא חברת ריהוט פרימיום.

אתה מדבר ישירות עם לקוחות ב-WhatsApp.

המטרה שלך היא לעזור ללקוח לבחור ריהוט,
להבין את הצורך שלו ולהתקדם למכירה.

חשוב מאוד:

1. אל תמציא מחיר.
2. אל תמציא מידות.
3. אל תמציא מפרט.
4. אם חסר מידע, שאל את הלקוח.
5. היה שירותי, מקצועי ויוקרתי.
6. אל תישמע כמו רובוט.
7. תשובות קצרות וברורות.
8. אל תשלח הודעות ארוכות מדי.
9. כאשר הלקוח מתעניין במוצר, נסה לקדם אותו לשלב הבא.
10. אל תבטיח דבר שאינו נמצא בנתונים.

נתוני העסק:

${JSON.stringify(
  businessData,
  null,
  2
)}

הודעת הלקוח:

${message}

ענה בעברית.
`;

  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${OPENAI_API_KEY}`
        },

        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    console.error(
      "OPENAI ERROR:",
      data
    );

    throw new Error(
      data.error?.message ||
      "OpenAI error"
    );
  }

  let answer =
    data.output_text || "";

  if (
    !answer &&
    Array.isArray(data.output)
  ) {

    for (
      const item of data.output
    ) {

      if (
        !Array.isArray(item.content)
      ) continue;

      for (
        const content of item.content
      ) {

        if (
          content.type ===
            "output_text" &&
          content.text
        ) {

          answer +=
            content.text;
        }
      }
    }
  }

  return (
    answer ||
    "אשמח לעזור לך 😊"
  );
}

// ================================
// AI - SERVER RESPONSE
// ================================

async function runAI(
  message,
  businessData,
  res
) {

  try {

    const answer =
      await getAIAnswer(
        message,
        businessData
      );

    res.writeHead(200, {
      "Content-Type":
        "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({
      success: true,
      answer
    }));

  } catch (error) {

    console.error(
      "AI SERVER ERROR:",
      error
    );

    res.writeHead(500, {
      "Content-Type":
        "application/json; charset=utf-8"
    });

    res.end(JSON.stringify({
      success: false,
      error:
        "שגיאה פנימית בשרת"
    }));
  }
}

// ================================
// WHATSAPP SEND MESSAGE
// ================================

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

  const response =
    await fetch(
      `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${WHATSAPP_ACCESS_TOKEN}`
        },

        body: JSON.stringify({
          messaging_product:
            "whatsapp",

          to,

          type: "text",

          text: {
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
      "WhatsApp API error"
    );
  }

  console.log(
    "WhatsApp message sent:",
    data
  );
}

// ================================
// הפעלת השרת
// ================================

const PORT =
  process.env.PORT || 3000;

server.listen(
  PORT,
  () => {

    console.log(
      `Casa Verona AI Engine running on port ${PORT}`
    );

  }
);

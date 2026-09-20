const http = require("http");
const fs = require("fs");
const path = require("path");

// ================================
// ENV
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

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY;

const WHATSAPP_ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN;

const WHATSAPP_VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN;

const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID;

// ================================
// HELPER - HTML PAGE
// ================================

function serveHtml(res, filename) {
  const filePath =
    path.join(__dirname, filename);

  fs.readFile(
    filePath,
    "utf8",
    (error, html) => {

      if (error) {
        console.error(
          "HTML PAGE ERROR:",
          error
        );

        res.writeHead(500, {
          "Content-Type":
            "text/plain; charset=utf-8"
        });

        res.end(
          "Page not found"
        );

        return;
      }

      res.writeHead(200, {
        "Content-Type":
          "text/html; charset=utf-8"
      });

      res.end(html);
    }
  );
}

// ================================
// SERVER
// ================================

const server =
  http.createServer(
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
        "http://localhost:3000"
      );

      // ================================
      // HOME
      // ================================

      if (
        url.pathname === "/" &&
        req.method === "GET"
      ) {
        res.writeHead(200, {
          "Content-Type":
            "application/json; charset=utf-8"
        });

        res.end(
          JSON.stringify({
            success: true,
            message:
              "Casa Verona AI Engine + Brain + Sales Agent + WhatsApp עובד!"
          })
        );

        return;
      }

      // ================================
      // BRAIN TEST PAGE
      // ================================

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

      // ================================
      // SALES SIMULATOR PAGE
      // ================================

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

      // ================================
      // WHATSAPP VERIFY
      // ================================

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
          res.writeHead(200, {
            "Content-Type":
              "text/plain"
          });

          res.end(challenge);
          return;
        }

        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      // ================================
      // WHATSAPP MESSAGES
      // ================================

      if (
        url.pathname ===
          "/webhook" &&
        req.method === "POST"
      ) {
        let body = "";

        req.on(
          "data",
          chunk => {
            body += chunk;
          }
        );

        req.on(
          "end",
          async () => {

            try {
              const data =
                JSON.parse(
                  body || "{}"
                );

              console.log(
                "WHATSAPP WEBHOOK:",
                JSON.stringify(
                  data,
                  null,
                  2
                )
              );

              const message =
                data.entry?.[0]
                  ?.changes?.[0]
                  ?.value
                  ?.messages?.[0];

              if (!message) {
                res.writeHead(200);
                res.end(
                  "EVENT_RECEIVED"
                );
                return;
              }

              if (
                message.type !==
                "text"
              ) {
                res.writeHead(200);
                res.end(
                  "EVENT_RECEIVED"
                );
                return;
              }

              const from =
                message.from;

              const text =
                message.text
                  ?.body || "";

              const leadAnalysis =
                await analyzeLead(
                  text
                );

              console.log(
                "CASA VERONA BRAIN:",
                leadAnalysis
              );

              const answer =
                await getAIAnswer(
                  text,
                  {
                    leads: [],
                    products: [],
                    sales: [],
                    orders: [],
                    currentLeadAnalysis:
                      leadAnalysis
                  }
                );

              await sendWhatsAppMessage(
                from,
                answer
              );

              res.writeHead(200);
              res.end(
                "EVENT_RECEIVED"
              );

            } catch (error) {

              console.error(
                "WHATSAPP WEBHOOK ERROR:",
                error
              );

              res.writeHead(200);
              res.end(
                "EVENT_RECEIVED"
              );
            }
          }
        );

        return;
      }

      // ================================
      // BRAIN API
      // ================================

      if (
        url.pathname ===
          "/brain" &&
        req.method === "POST"
      ) {
        let body = "";

        req.on(
          "data",
          chunk => {
            body += chunk;
          }
        );

        req.on(
          "end",
          async () => {

            try {
              const data =
                JSON.parse(
                  body || "{}"
                );

              const message =
                data.message || "";

              if (
                !message.trim()
              ) {
                res.writeHead(
                  400,
                  {
                    "Content-Type":
                      "application/json; charset=utf-8"
                  }
                );

                res.end(
                  JSON.stringify({
                    success: false,
                    error:
                      "חסרה הודעת לקוח"
                  })
                );

                return;
              }

              const analysis =
                await analyzeLead(
                  message
                );

              res.writeHead(
                200,
                {
                  "Content-Type":
                    "application/json; charset=utf-8"
                }
              );

              res.end(
                JSON.stringify({
                  success: true,
                  analysis
                })
              );

            } catch (error) {

              console.error(
                "BRAIN ERROR:",
                error
              );

              res.writeHead(
                500,
                {
                  "Content-Type":
                    "application/json; charset=utf-8"
                }
              );

              res.end(
                JSON.stringify({
                  success: false,
                  error:
                    "Brain analysis failed"
                })
              );
            }
          }
        );

        return;
      }

      // ================================
      // AI GET
      // ================================

      if (
        url.pathname === "/ai" &&
        req.method === "GET"
      ) {
        const message =
          url.searchParams.get(
            "message"
          ) || "";

        await runAI(
          message,
          {},
          res
        );

        return;
      }

      // ================================
      // AI POST
      // ================================

      if (
        url.pathname === "/ai" &&
        req.method === "POST"
      ) {
        let body = "";

        req.on(
          "data",
          chunk => {
            body += chunk;
          }
        );

        req.on(
          "end",
          async () => {

            try {
              const data =
                JSON.parse(
                  body || "{}"
                );

              const message =
                data.message || "";

              const businessData = {

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

              res.writeHead(
                400,
                {
                  "Content-Type":
                    "application/json; charset=utf-8"
                }
              );

              res.end(
                JSON.stringify({
                  success: false,
                  error:
                    "הנתונים שנשלחו אינם תקינים."
                })
              );
            }
          }
        );

        return;
      }

      // ================================
      // 404
      // ================================

      res.writeHead(
        404,
        {
          "Content-Type":
            "application/json; charset=utf-8"
        }
      );

      res.end(
        JSON.stringify({
          success: false,
          error: "Not Found"
        })
      );
    }
  );

// ================================
// CASA VERONA BRAIN
// ================================

async function analyzeLead(
  message
) {

  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY חסר"
    );
  }

  const input = `
אתה Casa Verona Brain.

אתה המוח שמנתח לידים עבור חברת Casa Verona,
חברת ריהוט פרימיום.

נתח את הודעת הלקוח והחזר JSON בלבד.

הודעת הלקוח:
${message}

החזר בדיוק:

{
  "intent": "",
  "product": "",
  "budget": null,
  "temperature": "COLD",
  "buying_signal": 0,
  "objection": "",
  "next_action": "",
  "needs_human": false,
  "summary": ""
}

כללים:

intent:
PRICE
PRODUCT_INFO
DELIVERY
CUSTOMIZATION
ORDER
PAYMENT
AVAILABILITY
GENERAL

product:
זהה את סוג הריהוט.
אם לא ידוע החזר "unknown".

budget:
רק אם הלקוח ציין תקציב מפורש.
אחרת null.

temperature:

COLD =
התעניינות כללית בלבד.

WARM =
שאלות על מחיר, מוצר, צבע,
בד, מידות, התאמה או משלוח.

HOT =
הלקוח מציג כוונת רכישה חזקה:
רוצה להזמין, לסגור, לשלם,
מבקש פרטי תשלום,
אומר שהוא רוצה להתקדם,
או אומר במפורש שאם תנאי מסוים מתאים
הוא רוצה להזמין.

buying_signal:
מספר שלם בין 0 ל-100.

objection:
PRICE
TRUST
DELIVERY
SIZE
QUALITY
PAYMENT
TIME
UNCERTAINTY

אם אין התנגדות ברורה החזר "".

next_action:
הפעולה האחת הטובה ביותר
להתקדמות המכירה.

needs_human:
true רק כאשר באמת נדרשת
התערבות מיידית של איש מכירות.

summary:
סיכום קצר בעברית.

אל תמציא מידע.
אל תמציא מחיר.
אל תמציא תקציב.
אל תוסיף markdown.
החזר JSON תקין בלבד.
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

        body:
          JSON.stringify({
            model:
              "gpt-5.6-luna",
            input
          })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "BRAIN OPENAI ERROR:",
      data
    );

    throw new Error(
      data.error?.message ||
      "OpenAI Brain error"
    );
  }

  let text =
    data.output_text || "";

  if (
    !text &&
    Array.isArray(
      data.output
    )
  ) {
    for (
      const item
      of data.output
    ) {
      if (
        !Array.isArray(
          item.content
        )
      ) continue;

      for (
        const content
        of item.content
      ) {
        if (
          content.type ===
            "output_text" &&
          content.text
        ) {
          text +=
            content.text;
        }
      }
    }
  }

  const cleaned =
    text
      .replace(
        /```json/gi,
        ""
      )
      .replace(
        /```/g,
        ""
      )
      .trim();

  try {
    return JSON.parse(
      cleaned
    );

  } catch (error) {

    console.error(
      "BRAIN JSON ERROR:",
      cleaned
    );

    return {
      intent: "UNKNOWN",
      product: "unknown",
      budget: null,
      temperature: "COLD",
      buying_signal: 0,
      objection: "",
      next_action:
        "בדיקה ידנית של הליד",
      needs_human: false,
      summary:
        "לא ניתן היה לנתח את הליד."
    };
  }
}

// ================================
// SALES AI
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
אתה איש המכירות AI של Casa Verona,
חברת ריהוט פרימיום.

אתה מדבר ישירות עם לקוח.

המטרה:
להבין מה הלקוח מחפש,
לתת חוויית שירות יוקרתית,
ולקדם אותו בצורה טבעית
לשלב הבא במכירה.

כללים:

1. אל תמציא מחיר.
2. אל תמציא מידות.
3. אל תמציא זמינות.
4. אל תמציא מפרט.
5. אל תבטיח דבר שאין בנתונים.
6. אם חסר מידע קריטי — שאל.
7. אל תישמע כמו רובוט.
8. כתוב בעברית טבעית.
9. שמור על תשובות יחסית קצרות.
10. אל תחשוף מידע פנימי של המערכת.
11. אל תגיד HOT/WARM/COLD ללקוח.
12. אל תגיד את ציון כוונת הרכישה.
13. השתמש בניתוח הליד כדי לבחור
את הפעולה הבאה הטובה ביותר.
14. אל תלחץ בצורה מוגזמת על הלקוח.
15. המטרה היא להתקדם בכל הודעה
עוד צעד אחד לכיוון עסקה.

נתוני העסק והליד:

${JSON.stringify(
  businessData,
  null,
  2
)}

הודעת הלקוח:

${message}

ענה רק בתגובה שהיית שולח ללקוח.
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

        body:
          JSON.stringify({
            model:
              "gpt-5.6-luna",
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
    Array.isArray(
      data.output
    )
  ) {
    for (
      const item
      of data.output
    ) {
      if (
        !Array.isArray(
          item.content
        )
      ) continue;

      for (
        const content
        of item.content
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
// AI RESPONSE
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

    res.writeHead(
      200,
      {
        "Content-Type":
          "application/json; charset=utf-8"
      }
    );

    res.end(
      JSON.stringify({
        success: true,
        answer
      })
    );

  } catch (error) {

    console.error(
      "AI SERVER ERROR:",
      error
    );

    res.writeHead(
      500,
      {
        "Content-Type":
          "application/json; charset=utf-8"
      }
    );

    res.end(
      JSON.stringify({
        success: false,
        error:
          "שגיאה פנימית בשרת"
      })
    );
  }
}

// ================================
// WHATSAPP SEND
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

        body:
          JSON.stringify({
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
// START SERVER
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

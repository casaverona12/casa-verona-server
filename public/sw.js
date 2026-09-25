self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") return;

  // Always request the newest app page.
  if (event.request.mode === "navigate") {

    event.respondWith(
      fetch(event.request, {
        cache: "no-store"
      })
    );

    return;
  }

  event.respondWith(
    fetch(event.request)
  );

});

/* =====================================================
   CASA VERONA — PUSH NOTIFICATIONS
===================================================== */

self.addEventListener("push", event => {

  let data = {};

  try {
    data = event.data
      ? event.data.json()
      : {};
  } catch {
    data = {
      title: "Casa Verona",
      body: "יש עדכון חדש במערכת"
    };
  }

  const title =
    data.title ||
    "Casa Verona";

  const options = {

    body:
      data.body ||
      "יש עדכון חדש במערכת",

    icon:
      data.icon ||
      "/icon-192.png",

    badge:
      data.badge ||
      "/icon-192.png",

    tag:
      data.tag ||
      "casa-verona",

    data: {
      url:
        data.url ||
        "/dashboard.html",

      lead_id:
        data.lead_id ||
        null
    },

    requireInteraction:
      data.requireInteraction === true

  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});


/* =====================================================
   NOTIFICATION CLICK
===================================================== */

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();

    const targetUrl =
      event.notification?.data?.url ||
      "/dashboard.html";

    event.waitUntil(

      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true
        })
        .then(clients => {

          for(const client of clients){

            if(
              "focus" in client
            ){

              if(
                "navigate" in client
              ){
                client.navigate(
                  targetUrl
                );
              }

              return client.focus();
            }
          }

          if(
            self.clients.openWindow
          ){
            return self.clients.openWindow(
              targetUrl
            );
          }

        })

    );

  }
);\n
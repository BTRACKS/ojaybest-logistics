/* =========================================================
   Ojaybest Logistics: shared tracking results renderer.

   Used by BOTH the homepage tracker and the Track Order page
   so shipment results look and behave identically. The lookup
   is frontend-only demonstration data until Supabase replaces
   shipmentFor() with a live data source.
   ========================================================= */
(function () {
  "use strict";

  const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Benin City", "Kaduna"];
  const STAGES = ["Order created", "Picked up", "At sorting hub", "In transit", "Out for delivery", "Delivered"];
  const checkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';

  const hash = (str) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

  const fmtTime = (date) =>
    date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ", " +
    date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  /* Frontend-only stand-in for a live shipment lookup.
     Replace this single function with a Supabase query when the
     backend is connected; both pages update automatically. */
  function shipmentFor(code) {
    const h = hash(code);
    const from = CITIES[h % CITIES.length];
    let to = CITIES[(h >>> 3) % CITIES.length];
    if (to === from) to = CITIES[(CITIES.indexOf(from) + 1) % CITIES.length];
    const current = 1 + (h % (STAGES.length - 1)); // 1..5
    const now = new Date();
    const eta = new Date(now.getTime() + (STAGES.length - 1 - current) * 8 * 3600 * 1000);
    const delivered = current === STAGES.length - 1;

    const steps = STAGES.map((title, i) => {
      const done = i < current || (delivered && i === current);
      const state = done ? "is-done" : i === current ? "is-current" : "";
      const time = i <= current ? fmtTime(new Date(now.getTime() - (current - i) * 6 * 3600 * 1000)) : "Pending";
      const marker = done ? checkIcon : "";
      return `
        <li class="timeline__step ${state}" style="animation-delay:${i * 80}ms">
          <span class="timeline__marker">${marker}</span>
          <div>
            <p class="timeline__title">${title}</p>
            <p class="timeline__time">${time}</p>
          </div>
        </li>`;
    });

    return {
      code: code,
      from: from,
      to: to,
      delivered: delivered,
      etaLabel: delivered ? fmtTime(now) : eta.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
      steps: steps
    };
  }

  /* Identical markup to the homepage tracking results. */
  function timelineHTML(shipment) {
    return `
      <div class="timeline__head">
        <div>
          <p class="timeline__code">${shipment.code}</p>
          <p class="timeline__route">${shipment.from} &rarr; ${shipment.to}</p>
        </div>
        <div class="timeline__eta">
          ${shipment.delivered ? "Delivered" : "Estimated delivery"}
          <strong>${shipment.etaLabel}</strong>
        </div>
      </div>
      <ol class="timeline">${shipment.steps.join("")}</ol>`;
  }

  window.OjaybestTracking = { CITIES: CITIES, STAGES: STAGES, shipmentFor: shipmentFor, timelineHTML: timelineHTML };
})();

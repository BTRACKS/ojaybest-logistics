/* =========================================================
   Ojaybest Logistics Administrator Portal: script.js
   Single-page admin. One shared shell (sidebar + top bar),
   sections are shown and hidden by the hash router below.

   CONTENTS
   1. Namespace and shared utilities
   2. Demonstration data
   3. Data service (future Supabase integration point)
   4. Shell: sidebar collapse and mobile drawer
   5. Section: Dashboard (Phase 1)
   6. Section: Orders Management (Phase 2)
   7. Section: Shipment Management (Phase 3)
   8. Section: Tracking Management (Phase 4)
   9. Sections: Quotations, Customers, Enquiries and Staff (Phases 5–7)
    10. Router: section switching and deep links

     Sections are registered with the hash router and share the
     existing admin shell. Phase 8 is registered by phase8.js.
     Shipment records are frontend demo data.
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     1. NAMESPACE AND SHARED UTILITIES
     ========================================================= */
  var OJB = window.OJB = { data: {}, sections: {} };

  OJB.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  var toastEl = document.getElementById("toast"), toastTimer;
  OJB.toast = function (msg) {
    toastEl.textContent = msg; toastEl.classList.add("is-show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove("is-show"); }, 2600);
  };
  OJB.updateDashboardShipmentStats = function () {
    var activeEl = document.getElementById("dashboardActiveShipments");
    var deliveredEl = document.getElementById("dashboardDeliveredShipments");
    if (!activeEl || !deliveredEl || !OJB.data.shipments) return;
    var active = Number(activeEl.getAttribute("data-base-count") || activeEl.getAttribute("data-count")) || 0;
    var delivered = Number(deliveredEl.getAttribute("data-base-count") || deliveredEl.getAttribute("data-count")) || 0;
    OJB.data.shipments.forEach(function (shipment) {
      if (shipment.dashboardNewRecord) {
        if (shipment.status === "Delivered") delivered++;
        else active++;
        return;
      }
      var initial = shipment.dashboardBaselineStatus || shipment.status;
      var wasDelivered = initial === "Delivered";
      var isDelivered = shipment.status === "Delivered";
      if (wasDelivered !== isDelivered) {
        active += isDelivered ? -1 : 1;
        delivered += isDelivered ? 1 : -1;
      }
    });
    active = Math.max(0, active);
    delivered = Math.max(0, delivered);
    activeEl.setAttribute("data-count", active);
    deliveredEl.setAttribute("data-count", delivered);
    activeEl.textContent = active;
    deliveredEl.textContent = delivered;
  };

  /* =========================================================
     2. DEMONSTRATION DATA
     Sample records for the admin preview. Not real customers
     or shipments. Replaced by live data once the backend is
     connected (see section 3).
     ========================================================= */
  OJB.data.dashboard = {
    orders: [
      { id: "OJB-24581", customer: "Adaeze Okafor", company: "Lagos Fabrics Ltd", from: "Lagos", to: "Abuja", service: "Express", status: "transit", date: "Today, 10:42" },
      { id: "OJB-24580", customer: "Tunde Bakare", company: "Bakare Electronics", from: "Lagos", to: "London", service: "Air Freight", status: "pending", date: "Today, 09:15" },
      { id: "OJB-24579", customer: "Ngozi Eze", company: "Individual", from: "Enugu", to: "Port Harcourt", service: "Last-mile", status: "delivered", date: "Yesterday" },
      { id: "OJB-24578", customer: "Musa Ibrahim", company: "Kano Agro Exports", from: "Kano", to: "Dubai", service: "Sea Freight", status: "confirmed", date: "Yesterday" },
      { id: "OJB-24577", customer: "Funke Adeyemi", company: "Glow Beauty", from: "Ibadan", to: "Lagos", service: "Standard", status: "delivered", date: "2 days ago" },
      { id: "OJB-24576", customer: "Chinedu Obi", company: "Obi Pharma", from: "Lagos", to: "Accra", service: "Express", status: "cancelled", date: "3 days ago" }
    ],
    activities: [
      { icon: "check", text: "<strong>Grace A.</strong> marked <strong>OJB-24579</strong> as delivered", time: "12 minutes ago" },
      { icon: "truck", text: "<strong>OJB-24581</strong> departed Lagos hub", time: "38 minutes ago" },
      { icon: "file", text: "<strong>Daniel K.</strong> sent a quotation to Bakare Electronics", time: "1 hour ago" },
      { icon: "user", text: "New customer <strong>Kano Agro Exports</strong> registered", time: "3 hours ago" },
      { icon: "edit", text: "<strong>Admin</strong> updated tracking for <strong>OJB-24570</strong>", time: "5 hours ago" }
    ],
    notifications: [
      { icon: "alert", text: "<strong>3 orders</strong> awaiting confirmation for over 24 hours", time: "Just now", unread: true },
      { icon: "msg", text: "New enquiry from <strong>Ifeoma N.</strong> about warehousing", time: "25 minutes ago", unread: true },
      { icon: "file", text: "Quotation request <strong>Q-1093</strong> submitted", time: "1 hour ago", unread: true },
      { icon: "truck", text: "Shipment <strong>OJB-24560</strong> delayed at customs", time: "Yesterday", unread: false },
      { icon: "check", text: "Weekly report is ready to download", time: "2 days ago", unread: false }
    ]
  };

  (function () {
    "use strict";
    var people = [
      ["Adaeze Okafor", "Lagos Fabrics Ltd", "+234 803 555 0101"], ["Tunde Bakare", "Bakare Electronics", "+234 802 555 0122"],
      ["Ngozi Eze", "", "+234 806 555 0133"], ["Musa Ibrahim", "Kano Agro Exports", "+234 805 555 0144"],
      ["Funke Adeyemi", "Glow Beauty", "+234 809 555 0155"], ["Chinedu Obi", "Obi Pharma", "+234 703 555 0166"],
      ["Halima Bello", "Bello Textiles", "+234 812 555 0177"], ["Emeka Nwosu", "", "+234 813 555 0188"],
      ["Kemi Ogunleye", "Kemi's Kitchen", "+234 814 555 0199"], ["Yusuf Abdullahi", "Northern Grains Co.", "+234 815 555 0110"],
      ["Blessing Udo", "", "+234 816 555 0121"], ["Segun Alabi", "Alabi Auto Parts", "+234 817 555 0132"]
    ];
    var receivers = [
      ["Ifeanyi Okeke", "Abuja"], ["Sarah Johnson", "London"], ["Amaka Obi", "Port Harcourt"], ["Ahmed Al-Farsi", "Dubai"],
      ["Bisi Lawal", "Lagos"], ["Kwame Mensah", "Accra"], ["Grace Etim", "Calabar"], ["David Chen", "Guangzhou"],
      ["Zainab Musa", "Kaduna"], ["Michael Brown", "Houston"]
    ];
    var origins = ["Lagos", "Ibadan", "Kano", "Enugu", "Abuja", "Port Harcourt"];
    var services = ["Express Delivery", "Standard Delivery", "Air Freight", "Sea Freight", "Last-mile Delivery", "Warehousing & Dispatch"];
    var packages = [
      ["Ankara fabric rolls", "Textiles"], ["Mobile phone accessories", "Electronics"], ["Documents & certificates", "Documents"],
      ["Dried agricultural produce", "Agro"], ["Cosmetic products", "Beauty"], ["Pharmaceutical supplies (non-hazardous)", "Medical"],
      ["Auto spare parts", "Automotive"], ["Packaged food items", "Food"]
    ];
    var statuses = ["pending", "pending", "confirmed", "review", "approved", "pending", "confirmed", "returned", "approved", "cancelled", "review", "confirmed"];

    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    var base = new Date(2026, 9, 25, 10, 30);
    var orders = [];
    for (var i = 0; i < 32; i++) {
      var p = people[i % people.length], r = receivers[(i * 3) % receivers.length], pk = packages[(i * 5) % packages.length];
      var st = statuses[i % statuses.length];
      var d = new Date(base.getTime() - i * 19 * 3600 * 1000);
      var origin = origins[i % origins.length];
      if (origin === r[1]) origin = "Lagos" === r[1] ? "Abuja" : "Lagos";
      var weight = Math.round((2 + ((i * 37) % 180)) * 10) / 10;
      var fd = st === "pending" ? "awaiting" : st === "returned" ? "flagged" : "confirmed";
      var ref = "OJB-ORD-" + (10480 - i);
      var history = [{ at: d.toISOString(), by: "Customer", text: "Order submitted via website" }];
      if (fd !== "awaiting") history.push({ at: new Date(d.getTime() + 2 * 3600e3).toISOString(), by: "Front Desk · Grace A.", text: fd === "flagged" ? "Flagged details for correction" : "Confirmed order details with customer" });
      if (st === "review" || st === "approved") history.push({ at: new Date(d.getTime() + 5 * 3600e3).toISOString(), by: "Admin · Daniel K.", text: "Began review" });
      if (st === "approved") history.push({ at: new Date(d.getTime() + 7 * 3600e3).toISOString(), by: "Admin · Daniel K.", text: "Approved order" });
      if (st === "returned") history.push({ at: new Date(d.getTime() + 6 * 3600e3).toISOString(), by: "Admin · Daniel K.", text: "Returned for correction: receiver phone number missing" });
      if (st === "cancelled") history.push({ at: new Date(d.getTime() + 4 * 3600e3).toISOString(), by: "Admin · Daniel K.", text: "Cancelled: customer request" });

      orders.push({
        ref: ref,
        submitted: d.toISOString(),
        status: st,
        frontDesk: fd,
        service: services[i % services.length],
        origin: origin,
        destination: r[1],
        sender: { name: p[0], company: p[1], phone: p[2], email: p[0].toLowerCase().split(" ")[0] + "@example.com", address: (12 + i) + " Sample Street, " + origin },
        receiver: { name: r[0], phone: "+000 555 01" + pad(i), email: r[0].toLowerCase().split(" ")[0] + "@example.com", address: (40 + i) + " Demo Avenue, " + r[1] },
        pkg: {
          description: pk[0], category: pk[1], weight: weight, quantity: 1 + (i % 6),
          dimensions: i % 4 === 2 ? "" : (30 + (i % 5) * 10) + " × " + (20 + (i % 3) * 10) + " × " + (15 + (i % 4) * 5) + " cm",
          value: (25000 + i * 13750)
        },
        quotation: i % 3 === 0 ? { ref: "Q-" + (1100 - i), amount: 18500 + i * 4200, status: i % 2 ? "Accepted" : "Sent" } : null,
        history: history
      });
    }
    OJB.data.orders = orders;
  })();

  /* Phase 3 shipment preview records, linked only to approved orders. */
  (function () {
    function shiftedDate(days, hours) {
      var d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(d.getHours() + (hours || 0), 0, 0, 0);
      return d;
    }
    function makeSample(orderIndex, trackingNumber, status, expectedOffset, createdOffset) {
      var order = OJB.data.orders[orderIndex];
      if (!order || order.status !== "approved") return null;
      var created = shiftedDate(createdOffset, -3).toISOString();
      return {
        trackingNumber: trackingNumber,
        orderRef: order.ref,
        sender: Object.assign({}, order.sender),
        receiver: Object.assign({}, order.receiver),
        origin: order.origin,
        destination: order.destination,
        package: Object.assign({}, order.pkg),
        service: order.service,
        status: status,
        dashboardBaselineStatus: status,
        createdAt: created,
        expectedDelivery: shiftedDate(expectedOffset, 0).toISOString().slice(0, 10),
        currentLocation: status === "Delivered" ? order.destination + " Delivery Centre" :
          status === "On Hold" ? order.origin + " Operations Desk" : order.origin + " Distribution Hub",
        remarks: status === "On Hold" ? "Awaiting a customs documentation check." : "",
        activity: [{
          at: created,
          by: "Admin · Daniel K.",
          text: "Shipment created from the approved order.",
          status: status,
          location: status === "Delivered" ? order.destination + " Delivery Centre" :
            status === "On Hold" ? order.origin + " Operations Desk" : order.origin + " Distribution Hub",
          description: "Shipment created from the approved order."
        }]
      };
    }
    OJB.data.shipments = [
      makeSample(4, "OJBTR1A4K9", "In Transit", 3, -4),
      makeSample(8, "OJBTR1B8P2", "Delivered", -1, -7),
      makeSample(20, "OJBTR1C7M3", "On Hold", 5, -2)
    ].filter(Boolean);
  })();

  /* =========================================================
     3. DATA SERVICE
     All sections read data through OJB.data today. When the
     Supabase backend is connected, load records here (for
     example in an async OJB.loadData()) before sections
     initialise. No backend calls are made yet.
     ========================================================= */
  OJB.loadData = function () { return Promise.resolve(OJB.data); };

  /* =========================================================
     4. SHELL
     ========================================================= */
  (function () {

    "use strict";
    var shell = document.getElementById("shell");
    var KEY = "ojb-admin-sidebar-collapsed";
    var collapseBtn = document.getElementById("collapseBtn");
    var menuBtn = document.getElementById("menuBtn");
    var scrim = document.getElementById("scrim");


    // Desktop collapse (remembered)
    function setCollapsed(c) {
      shell.classList.toggle("is-collapsed", c);
      collapseBtn.setAttribute("aria-expanded", String(!c));
      collapseBtn.setAttribute("aria-label", c ? "Expand sidebar" : "Collapse sidebar");
    }
    try { setCollapsed(localStorage.getItem(KEY) === "1"); } catch (e) {}
    collapseBtn.addEventListener("click", function () {
      var c = !shell.classList.contains("is-collapsed");
      setCollapsed(c);
      try { localStorage.setItem(KEY, c ? "1" : "0"); } catch (e) {}
    });

    // Mobile drawer
    function setOpen(o) { shell.classList.toggle("is-mobile-open", o); menuBtn.setAttribute("aria-expanded", String(o)); }
    menuBtn.addEventListener("click", function () { setOpen(!shell.classList.contains("is-mobile-open")); });
    scrim.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });


    // Sections not yet built
    document.addEventListener("click", function (e) {
      var el = e.target.closest("[data-soon]");
      if (!el) return;
      e.preventDefault();
      var name = el.getAttribute("data-tip") || el.textContent.trim() || "This section";
      window.ojbToast(name + " is coming in the next phase.");
      setOpen(false);
    });

    OJB.closeMobileNav = function () { setOpen(false); };

  })();

  /* =========================================================
     5. SECTION: DASHBOARD (Phase 1)
     ========================================================= */
  OJB.sections.dashboard = {
    init: function () {

      "use strict";
      var D = OJB.data.dashboard;
      var STATUS = { pending: "Pending", confirmed: "Confirmed", transit: "In Transit", delivered: "Delivered", cancelled: "Cancelled" };
      var ICONS = {
        check: '<path d="M20 6L9 17l-5-5"/>',
        truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
        file: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',
        user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        edit: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/>',
        alert: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>',
        msg: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>'
      };
      var esc = OJB.esc;
      function icon(n) { return '<span class="feed__icon"><svg viewBox="0 0 24 24">' + (ICONS[n] || ICONS.check) + "</svg></span>"; }

      var h = new Date().getHours();
      document.getElementById("greet").textContent = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";

      document.getElementById("dashOrdersBody").innerHTML = D.orders.map(function (o) {
        return "<tr><td class='mono'>" + esc(o.id) + "</td><td>" + esc(o.customer) + "<span class='sub'>" + esc(o.company) +
          "</span></td><td>" + esc(o.from) + " → " + esc(o.to) + "</td><td>" + esc(o.service) +
          "</td><td><span class='pill pill--" + o.status + "'>" + STATUS[o.status] + "</span></td><td>" + esc(o.date) + "</td></tr>";
      }).join("");

      // Demo text is trusted static markup (contains <strong>)
      document.getElementById("activityFeed").innerHTML = D.activities.map(function (a) {
        return "<li>" + icon(a.icon) + "<div><p>" + a.text + "</p><time>" + esc(a.time) + "</time></div></li>";
      }).join("");

      function renderNotifs() {
        document.getElementById("notifFeed").innerHTML = D.notifications.map(function (n) {
          return "<li class='" + (n.unread ? "is-unread" : "") + "'>" + icon(n.icon) + "<div><p>" + n.text + "</p><time>" + esc(n.time) + "</time></div>" + (n.unread ? "<span class='notif-dot' aria-label='Unread'></span>" : "") + "</li>";
        }).join("");
      }
      renderNotifs();
      document.getElementById("markRead").addEventListener("click", function (e) {
        e.preventDefault();
        D.notifications.forEach(function (n) { n.unread = false; });
        renderNotifs();
        document.querySelectorAll(".icon-btn .dot").forEach(function (d) { d.remove(); });
        OJB.toast("All notifications marked as read (demo).");
      });

      // Count-up
      OJB.updateDashboardShipmentStats();
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.querySelectorAll("[data-count]").forEach(function (el) {
        var target = +el.getAttribute("data-count");
        if (el.id === "dashboardActiveShipments" || el.id === "dashboardDeliveredShipments") {
          el.textContent = target.toLocaleString();
          return;
        }
        if (reduce) { el.textContent = target.toLocaleString(); return; }
        var start = performance.now(), dur = 900;
        (function step(now) {
          var p = Math.min(1, (now - start) / dur), v = Math.round(target * (1 - Math.pow(1 - p, 3)));
          el.textContent = v.toLocaleString();
          if (p < 1) requestAnimationFrame(step);
        })(start);
      });

    }
  };

  /* =========================================================
     6. SECTION: ORDERS MANAGEMENT (Phase 2)
     Works on demonstration data only. Status changes live in
     this browser tab and are discarded on reload.
     ========================================================= */
  OJB.sections.orders = {
    init: function () {

      "use strict";
      var orders = OJB.data.orders;

      var STATUS = {
        pending: "Pending Confirmation", confirmed: "Confirmed", review: "Under Review",
        approved: "Approved", returned: "Returned for Correction", cancelled: "Cancelled"
      };
      var FRONT = { awaiting: "Awaiting Front Desk", confirmed: "Front Desk Confirmed", flagged: "Flagged by Front Desk" };
      var FLOW = ["pending", "confirmed", "review", "approved"];

      /* Workflow rules, the single source of truth for allowed actions */
      var ACTIONS = {
        review:  { label: "Begin Review", from: ["confirmed"], to: "review", cls: "a-btn--gold",
                   title: "Begin review?", msg: "This order will move to Under Review." },
        approve: { label: "Approve Order", from: ["review"], to: "approved", cls: "a-btn--success",
                   title: "Approve this order?", msg: "This approved order will be eligible for shipment creation in Phase 3." },
        return:  { label: "Return for Correction", from: ["confirmed", "review"], to: "returned", cls: "a-btn--warn", needsNote: true,
                   title: "Return for correction?", msg: "The order will be sent back so the details can be corrected. Tell the team what needs fixing." },
        cancel:  { label: "Cancel Order", from: ["pending", "confirmed", "review", "returned"], to: "cancelled", cls: "a-btn--danger", needsNote: true,
                   title: "Cancel this order?", msg: "Cancelled orders cannot be approved. Please give a reason." }
      };
      function allowed(o) {
        return Object.keys(ACTIONS).filter(function (k) {
          var a = ACTIONS[k];
          if (a.from.indexOf(o.status) < 0) return false;
          // Approval requires front desk confirmation
          if (k === "approve" || k === "review") return o.frontDesk === "confirmed";
          return true;
        });
      }
      window.OJB_ORDER_RULES = { ACTIONS: ACTIONS, allowed: allowed };

      var $ = function (id) { return document.getElementById(id); };
      var esc = OJB.esc;
      function fmtDate(iso, withTime) {
        var d = new Date(iso);
        var s = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        return withTime ? s + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : s;
      }
      function naira(n) { return "₦" + Number(n).toLocaleString("en-NG"); }
      function pill(kind, label) { return "<span class='pill pill--" + kind + "'>" + esc(label) + "</span>"; }

      /* ---------- State ---------- */
      var state = { q: "", status: "all", front: "all", service: "all", sort: "submitted", dir: "desc", page: 1, size: 10 };

      // Service filter options
      var services = Array.from(new Set(orders.map(function (o) { return o.service; }))).sort();
      $("fService").innerHTML = "<option value='all'>All services</option>" + services.map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("");

      function counts() {
        var c = { all: orders.length };
        Object.keys(STATUS).forEach(function (k) { c[k] = 0; });
        orders.forEach(function (o) { c[o.status]++; });
        return c;
      }

      function renderStats() {
        var c = counts();
        $("sTotal").textContent = c.all;
        $("sPending").textContent = c.pending;
        $("sConfirmed").textContent = c.confirmed;
        $("sApproved").textContent = c.approved;
        $("chips").innerHTML = [["all", "All"]].concat(Object.keys(STATUS).map(function (k) { return [k, STATUS[k]]; })).map(function (p) {
          return "<button class='chip" + (state.status === p[0] ? " is-active" : "") + "' data-status='" + p[0] + "' aria-pressed='" + (state.status === p[0]) + "'>" + esc(p[1]) + "<span>" + c[p[0]] + "</span></button>";
        }).join("");
      }

      function filtered() {
        var q = state.q.trim().toLowerCase();
        var list = orders.filter(function (o) {
          if (state.status !== "all" && o.status !== state.status) return false;
          if (state.front !== "all" && o.frontDesk !== state.front) return false;
          if (state.service !== "all" && o.service !== state.service) return false;
          if (!q) return true;
          return [o.ref, o.sender.name, o.sender.company, o.receiver.name, o.origin, o.destination, o.service].join(" ").toLowerCase().indexOf(q) >= 0;
        });
        var key = state.sort, dir = state.dir === "asc" ? 1 : -1;
        var val = function (o) {
          if (key === "customer") return o.sender.name.toLowerCase();
          if (key === "route") return (o.origin + o.destination).toLowerCase();
          if (key === "status") return FLOW.indexOf(o.status) < 0 ? 10 + Object.keys(STATUS).indexOf(o.status) : FLOW.indexOf(o.status);
          return o[key];
        };
        return list.sort(function (a, b) { var x = val(a), y = val(b); return x < y ? -dir : x > y ? dir : 0; });
      }

      function renderTable() {
        var list = filtered();
        var pages = Math.max(1, Math.ceil(list.length / state.size));
        if (state.page > pages) state.page = pages;
        var start = (state.page - 1) * state.size;
        var rows = list.slice(start, start + state.size);

        document.getElementById("ordersView").querySelectorAll(".th-sort").forEach(function (b) {
          var on = b.getAttribute("data-sort") === state.sort;
          b.classList.toggle("is-asc", on && state.dir === "asc");
          b.classList.toggle("is-desc", on && state.dir === "desc");
          b.closest("th").setAttribute("aria-sort", on ? (state.dir === "asc" ? "ascending" : "descending") : "none");
        });

        $("ordersBody").innerHTML = rows.length ? rows.map(function (o) {
          var acts = allowed(o).filter(function (k) { return k === "review" || k === "approve"; }).slice(0, 1);
          return "<tr>" +
            "<td class='mono'>" + esc(o.ref) + "</td>" +
            "<td>" + esc(o.sender.name) + "<span class='sub'>" + esc(o.sender.company || "Individual") + "</span></td>" +
            "<td>" + esc(o.origin) + " → " + esc(o.destination) + "</td>" +
            "<td>" + esc(o.service) + "</td>" +
            "<td>" + fmtDate(o.submitted) + "</td>" +
            "<td>" + pill(o.status, STATUS[o.status]) + "</td>" +
            "<td>" + pill(o.frontDesk, FRONT[o.frontDesk]) + "</td>" +
            "<td><div class='row-actions'><button class='a-btn a-btn--ghost a-btn--sm' data-view='" + esc(o.ref) + "'>View Details</button>" +
            acts.map(function (k) { return "<button class='a-btn " + ACTIONS[k].cls + " a-btn--sm' data-act='" + k + "' data-ref='" + esc(o.ref) + "'>" + ACTIONS[k].label + "</button>"; }).join("") +
            (o.status === "approved" ? (hasShipment(o.ref)
              ? "<button class='a-btn a-btn--ghost a-btn--sm' data-open-shipment='" + esc(hasShipment(o.ref).trackingNumber) + "'>View Shipment</button>"
              : "<button class='a-btn a-btn--gold a-btn--sm' data-create-shipment='" + esc(o.ref) + "'>Create Shipment</button>") : "") +
            "</div></td></tr>";
        }).join("") : "<tr><td colspan='8'><div class='empty'><strong>No orders match your filters</strong>Try a different search or clear the filters.</div></td></tr>";

        $("resultCount").textContent = list.length + " of " + orders.length + " orders";
        $("pagerInfo").textContent = list.length ? "Showing " + (start + 1) + "–" + Math.min(start + state.size, list.length) + " of " + list.length : "Showing 0";
        var btns = "<button class='pager__btn' data-page='" + (state.page - 1) + "' " + (state.page === 1 ? "disabled" : "") + " aria-label='Previous page'>‹</button>";
        for (var p = 1; p <= pages; p++) btns += "<button class='pager__btn" + (p === state.page ? " is-active" : "") + "' data-page='" + p + "' aria-label='Page " + p + "'" + (p === state.page ? " aria-current='page'" : "") + ">" + p + "</button>";
        btns += "<button class='pager__btn' data-page='" + (state.page + 1) + "' " + (state.page === pages ? "disabled" : "") + " aria-label='Next page'>›</button>";
        $("pagerBtns").innerHTML = btns;
      }

      function render() { renderStats(); renderTable(); }

      /* ---------- Controls ---------- */
      var t;
      $("search").addEventListener("input", function (e) { clearTimeout(t); t = setTimeout(function () { state.q = e.target.value; state.page = 1; renderTable(); }, 150); });
      $("fFront").addEventListener("change", function (e) { state.front = e.target.value; state.page = 1; renderTable(); });
      $("fService").addEventListener("change", function (e) { state.service = e.target.value; state.page = 1; renderTable(); });
      $("pageSize").addEventListener("change", function (e) { state.size = +e.target.value; state.page = 1; renderTable(); });
      $("resetFilters").addEventListener("click", function () {
        state = Object.assign(state, { q: "", status: "all", front: "all", service: "all", page: 1 });
        $("search").value = ""; $("fFront").value = "all"; $("fService").value = "all"; render();
      });
      $("chips").addEventListener("click", function (e) {
        var b = e.target.closest("[data-status]"); if (!b) return;
        state.status = b.getAttribute("data-status"); state.page = 1; render();
      });
      $("pagerBtns").addEventListener("click", function (e) {
        var b = e.target.closest("[data-page]"); if (!b || b.disabled) return;
        state.page = +b.getAttribute("data-page"); renderTable();
      });
      document.getElementById("ordersView").querySelectorAll(".th-sort").forEach(function (b) {
        b.addEventListener("click", function () {
          var k = b.getAttribute("data-sort");
          if (state.sort === k) state.dir = state.dir === "asc" ? "desc" : "asc";
          else { state.sort = k; state.dir = k === "submitted" ? "desc" : "asc"; }
          renderTable();
        });
      });
      $("ordersBody").addEventListener("click", function (e) {
        var create = e.target.closest("[data-create-shipment]");
        if (create) { location.hash = "#shipments/create/" + encodeURIComponent(create.getAttribute("data-create-shipment")); return; }
        var shipment = e.target.closest("[data-open-shipment]");
        if (shipment) { location.hash = "#shipments/" + encodeURIComponent(shipment.getAttribute("data-open-shipment")); return; }
        var v = e.target.closest("[data-view]");
        if (v) return openDrawer(v.getAttribute("data-view"));
        var a = e.target.closest("[data-act]");
        if (a) askAction(a.getAttribute("data-ref"), a.getAttribute("data-act"));
      });

      /* ---------- Details drawer ---------- */
      var drawer = $("drawer"), currentRef = null, lastFocus = null;
      function find(ref) { for (var i = 0; i < orders.length; i++) if (orders[i].ref === ref) return orders[i]; }
      function hasShipment(ref) {
        for (var i = 0; i < OJB.data.shipments.length; i++) if (OJB.data.shipments[i].orderRef === ref) return OJB.data.shipments[i];
        return null;
      }

      function workflowHtml(o) {
        var idx = FLOW.indexOf(o.status);
        var off = idx < 0; // returned / cancelled
        var lastReached = off ? (o.frontDesk === "confirmed" ? 1 : 0) : idx;
        return FLOW.map(function (s, i) {
          var cls = i < lastReached || (i === lastReached && o.status === "approved") ? "is-done" : i === lastReached && !off ? "is-current" : i <= lastReached ? "is-done" : "";
          return "<div class='workflow__step " + cls + "'><span class='workflow__dot'>" + (i + 1) + "</span>" + STATUS[s] + "</div>";
        }).join("") + (off ? "<div class='workflow__step is-current'><span class='workflow__dot'>!</span>" + STATUS[o.status] + "</div>" : "");
      }

      function dl(rows) {
        return "<dl class='dl'>" + rows.filter(function (r) { return r[1] !== "" && r[1] != null; }).map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl>";
      }

      function renderDrawer() {
        var o = find(currentRef); if (!o) return;
        $("dRef").textContent = o.ref;
        $("dSubmitted").textContent = "Submitted " + fmtDate(o.submitted, true);
        $("dPills").innerHTML = pill(o.status, STATUS[o.status]) + pill(o.frontDesk, FRONT[o.frontDesk]) + "<span class='a-demo-badge'>Sample order</span>";
        var q = o.quotation;
        $("dBody").innerHTML =
          "<section class='d-card a-glass'><h3>Approval progress</h3><div class='workflow'>" + workflowHtml(o) + "</div>" +
            (o.status === "approved" ? "<p class='note-local' style='color:var(--a-success)'>" + (hasShipment(o.ref) ? "A preview shipment is already linked to this order." : "Eligible for shipment creation.") + "</p>" : "") +
            (o.frontDesk !== "confirmed" && o.status === "pending" ? "<p class='note-local' style='color:var(--a-muted)'>Waiting for the Front Desk to confirm details before review can begin.</p>" : "") +
          "</section>" +
          "<section class='d-card a-glass'><h3>Route &amp; service</h3><div class='route'><div>" + esc(o.origin) + "<small>Origin</small></div>" +
            "<svg viewBox='0 0 24 24'><path d='M5 12h14M13 6l6 6-6 6'/></svg><div>" + esc(o.destination) + "<small>Destination</small></div></div>" +
            "<div style='margin-top:14px'>" + dl([["Shipping service", o.service]]) + "</div></section>" +
          "<div class='d-grid'>" +
            "<section class='d-card a-glass'><h3>Sender</h3>" + dl([["Name", o.sender.name], ["Company", o.sender.company], ["Phone", o.sender.phone], ["Email", o.sender.email], ["Address", o.sender.address]]) + "</section>" +
            "<section class='d-card a-glass'><h3>Receiver</h3>" + dl([["Name", o.receiver.name], ["Phone", o.receiver.phone], ["Email", o.receiver.email], ["Address", o.receiver.address]]) + "</section>" +
          "</div>" +
          "<section class='d-card a-glass'><h3>Package</h3>" + dl([["Description", o.pkg.description], ["Category", o.pkg.category], ["Weight", o.pkg.weight + " kg"], ["Quantity", o.pkg.quantity], ["Dimensions", o.pkg.dimensions || "Not provided"], ["Declared value", naira(o.pkg.value)]]) + "</section>" +
          "<div class='d-grid'>" +
            "<section class='d-card a-glass'><h3>Quotation</h3>" + (q ? dl([["Reference", q.ref], ["Amount", naira(q.amount)], ["Status", q.status]]) : "<p style='color:var(--a-muted);font-size:13.5px'>No quotation linked to this order.</p>") + "</section>" +
            "<section class='d-card a-glass'><h3>Front Desk</h3>" + dl([["Status", FRONT[o.frontDesk]], ["Handled by", o.frontDesk === "awaiting" ? "Not yet assigned" : "Grace A."]]) + "</section>" +
          "</div>" +
          "<section class='d-card a-glass'><h3>Activity history</h3><ul class='timeline'>" +
            o.history.slice().reverse().map(function (h) {
              return "<li class='" + (h.local ? "is-local" : "") + "'>" + esc(h.text) + (h.note ? ": <em>" + esc(h.note) + "</em>" : "") + "<small>" + esc(h.by) + " · " + fmtDate(h.at, true) + (h.local ? " · <span class='note-local'>Preview only, not saved</span>" : "") + "</small></li>";
            }).join("") + "</ul></section>";

        var acts = allowed(o);
        var shipment = hasShipment(o.ref);
        var footerActions = acts.map(function (k) { return "<button class='a-btn " + (ACTIONS[k].cls) + "' data-act='" + k + "'>" + ACTIONS[k].label + "</button>"; });
        if (o.status === "approved") footerActions.push(shipment
          ? "<button class='a-btn a-btn--ghost' data-open-shipment='" + esc(shipment.trackingNumber) + "'>View Shipment</button>"
          : "<button class='a-btn a-btn--gold' data-create-shipment='" + esc(o.ref) + "'>Create Shipment</button>");
        $("dFoot").innerHTML = footerActions.length
          ? footerActions.join("")
          : "<p style='color:var(--a-soft);font-size:13px;margin-right:auto'>No further actions available for this order.</p>";
      }

      function openDrawer(ref) {
        lastFocus = document.activeElement; currentRef = ref;
        renderDrawer(); drawer.hidden = false; document.body.style.overflow = "hidden";
        $("dClose").focus();
      }
      function closeDrawer() { drawer.hidden = true; currentRef = null; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
      $("dClose").addEventListener("click", closeDrawer);
      drawer.querySelector(".drawer__scrim").addEventListener("click", closeDrawer);
      $("dFoot").addEventListener("click", function (e) {
        var create = e.target.closest("[data-create-shipment]");
        if (create) { closeDrawer(); location.hash = "#shipments/create/" + encodeURIComponent(create.getAttribute("data-create-shipment")); return; }
        var shipment = e.target.closest("[data-open-shipment]");
        if (shipment) { closeDrawer(); location.hash = "#shipments/" + encodeURIComponent(shipment.getAttribute("data-open-shipment")); return; }
        var a = e.target.closest("[data-act]"); if (a) askAction(currentRef, a.getAttribute("data-act"));
      });

      /* ---------- Confirmation dialog ---------- */
      var modal = $("confirmModal"), pending = null;
      function askAction(ref, key) {
        var o = find(ref), a = ACTIONS[key];
        if (!o || allowed(o).indexOf(key) < 0) return OJB.toast("This action isn't available for the order's current status.");
        pending = { ref: ref, key: key };
        $("cTitle").textContent = a.title;
        $("cMsg").textContent = a.msg;
        $("cRef").textContent = o.ref + " · " + o.sender.name;
        $("cNoteWrap").hidden = !a.needsNote;
        $("cNoteWrap").classList.remove("is-invalid");
        $("cNote").value = "";
        $("cOk").className = "a-btn " + a.cls;
        $("cOk").textContent = a.label;
        modal.hidden = false;
        (a.needsNote ? $("cNote") : $("cCancel")).focus();
      }
      function closeModal() { modal.hidden = true; pending = null; }
      $("cCancel").addEventListener("click", closeModal);
      modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
      $("cOk").addEventListener("click", function () {
        if (!pending) return;
        var a = ACTIONS[pending.key], o = find(pending.ref), note = $("cNote").value.trim();
        if (a.needsNote && note.length < 5) { $("cNoteWrap").classList.add("is-invalid"); $("cNote").focus(); return; }
        if (note.length > 500) note = note.slice(0, 500);
        o.status = a.to;
        if (pending.key === "return") o.frontDesk = "flagged";
        o.history.push({ at: new Date().toISOString(), by: "Admin · You", text: a.label.replace(" Order", "") + " (preview)", note: note, local: true });
        closeModal();
        render();
        if (currentRef) renderDrawer();
        OJB.toast(o.ref + ": " + STATUS[o.status] + ". Preview only, not saved.");
      });
      document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        if (!modal.hidden) closeModal(); else if (!drawer.hidden) closeDrawer();
      });

      render();
      // Public API used by the router for deep links such as #orders/OJB-ORD-10480
      return { open: function (ref) { if (find(ref)) openDrawer(ref); }, refresh: render };

    },
    onShow: function (api, param) { if (api && api.refresh) api.refresh(); if (param) api.open(param); }
  };

  /* =========================================================
     7. SHIPMENT MANAGEMENT (PHASE 3)
     Frontend-only preview workflow. The backend will own
     persistence and tracking number uniqueness in a later phase.
     ========================================================= */
  OJB.sections.shipments = {
    init: function () {
      var $ = function (id) { return document.getElementById(id); };
      var esc = OJB.esc;
      var shipments = OJB.data.shipments;
      var orders = OJB.data.orders;
      var STATUSES = [
        "Shipment Created", "Package Received", "In Transit", "Customs Clearance",
        "Out for Delivery", "Delivered", "On Hold", "Delivery Attempt Failed"
      ];
      var state = { q: "", status: "all", sort: "createdAt", dir: "desc", page: 1, size: 10 };
      var selectedTracking = null;
      var creatingOrderRef = null;
      var lastFocus = null;
      var drawer = $("shipmentDrawer");
      var createModal = $("shipmentCreateModal");

      function orderByRef(ref) {
        for (var i = 0; i < orders.length; i++) if (orders[i].ref === ref) return orders[i];
        return null;
      }
      function shipmentByOrder(ref) {
        for (var i = 0; i < shipments.length; i++) if (shipments[i].orderRef === ref) return shipments[i];
        return null;
      }
      function shipmentByTracking(tracking) {
        for (var i = 0; i < shipments.length; i++) if (shipments[i].trackingNumber === tracking) return shipments[i];
        return null;
      }
      function dateOnly(d) {
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      }
      function displayDate(value, withTime) {
        if (!value) return "Not set";
        var d = /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
          : new Date(value);
        if (isNaN(d.getTime())) return "Not set";
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
          (withTime ? ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
      }
      function statusClass(status) {
        return status === "Delivered" ? "shipment-delivered" : status.toLowerCase().replace(/\s+/g, "-");
      }
      function pill(status) {
        return "<span class='pill pill--" + statusClass(status) + "'>" + esc(status) + "</span>";
      }
      function statusCounts() {
        var counts = { total: shipments.length, awaiting: 0, transit: 0, delivered: 0, hold: 0 };
        shipments.forEach(function (s) {
          if (s.status === "Shipment Created" || s.status === "Package Received") counts.awaiting++;
          if (s.status === "In Transit" || s.status === "Customs Clearance" || s.status === "Out for Delivery") counts.transit++;
          if (s.status === "Delivered") counts.delivered++;
          if (s.status === "On Hold" || s.status === "Delivery Attempt Failed") counts.hold++;
        });
        return counts;
      }
      function renderStats() {
        var c = statusCounts();
        $("shipTotal").textContent = c.total;
        $("shipAwaiting").textContent = c.awaiting;
        $("shipTransit").textContent = c.transit;
        $("shipDelivered").textContent = c.delivered;
        $("shipHold").textContent = c.hold;
      }
      function filteredShipments() {
        var q = state.q.trim().toLowerCase();
        var list = shipments.filter(function (s) {
          if (state.status !== "all" && s.status !== state.status) return false;
          if (!q) return true;
          return [
            s.trackingNumber, s.orderRef, s.sender.name, s.sender.company, s.receiver.name,
            s.origin, s.destination, s.status, s.service
          ].join(" ").toLowerCase().indexOf(q) >= 0;
        });
        var key = state.sort, dir = state.dir === "asc" ? 1 : -1;
        function sortValue(s) {
          if (key === "route") return (s.origin + " " + s.destination).toLowerCase();
          if (key === "status") return STATUSES.indexOf(s.status);
          if (key === "senderReceiver") return (s.sender.name + " " + s.receiver.name).toLowerCase();
          return s[key] || "";
        }
        return list.sort(function (a, b) {
          var x = sortValue(a), y = sortValue(b);
          return x < y ? -dir : x > y ? dir : 0;
        });
      }
      function renderTable() {
        var list = filteredShipments();
        var pages = Math.max(1, Math.ceil(list.length / state.size));
        if (state.page > pages) state.page = pages;
        var start = (state.page - 1) * state.size;
        var rows = list.slice(start, start + state.size);
        $("shipmentsView").querySelectorAll("[data-ship-sort]").forEach(function (button) {
          var on = button.getAttribute("data-ship-sort") === state.sort;
          button.classList.toggle("is-asc", on && state.dir === "asc");
          button.classList.toggle("is-desc", on && state.dir === "desc");
          button.closest("th").setAttribute("aria-sort", on ? (state.dir === "asc" ? "ascending" : "descending") : "none");
        });
        $("shipmentsBody").innerHTML = rows.length ? rows.map(function (s) {
          return "<tr>" +
            "<td class='mono'>" + esc(s.trackingNumber) + "</td>" +
            "<td class='mono'>" + esc(s.orderRef) + "</td>" +
            "<td><div class='shipment-contact'><strong>" + esc(s.sender.name) + "</strong><span>To " + esc(s.receiver.name) + "</span></div></td>" +
            "<td>" + esc(s.origin) + " <span aria-hidden='true'>→</span> " + esc(s.destination) + "</td>" +
            "<td>" + pill(s.status) + "</td>" +
            "<td>" + displayDate(s.createdAt) + "</td>" +
            "<td>" + displayDate(s.expectedDelivery) + "</td>" +
            "<td><div class='row-actions'><button class='a-btn a-btn--ghost a-btn--sm' data-shipment-details='" + esc(s.trackingNumber) + "'>View Shipment</button></div></td>" +
            "</tr>";
        }).join("") : "<tr><td colspan='8'><div class='empty'><strong>No shipments match your filters</strong>Try another search or clear the filters.</div></td></tr>";
        $("shipmentResultCount").textContent = list.length + " of " + shipments.length + " shipments";
        $("shipmentPagerInfo").textContent = list.length
          ? "Showing " + (start + 1) + "–" + Math.min(start + state.size, list.length) + " of " + list.length
          : "Showing 0";
        var buttons = "<button class='pager__btn' data-ship-page='" + (state.page - 1) + "' " + (state.page === 1 ? "disabled" : "") + " aria-label='Previous page'>‹</button>";
        for (var p = 1; p <= pages; p++) buttons += "<button class='pager__btn" + (p === state.page ? " is-active" : "") + "' data-ship-page='" + p + "' aria-label='Page " + p + "'" + (p === state.page ? " aria-current='page'" : "") + ">" + p + "</button>";
        buttons += "<button class='pager__btn' data-ship-page='" + (state.page + 1) + "' " + (state.page === pages ? "disabled" : "") + " aria-label='Next page'>›</button>";
        $("shipmentPagerBtns").innerHTML = buttons;
      }
      function render() { renderStats(); renderTable(); }
      function generateTrackingNumber() {
        var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var value;
        do {
          var suffix = "";
          for (var i = 0; i < 4; i++) suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
          value = "OJBTR1" + suffix;
        } while (shipments.some(function (s) { return s.trackingNumber === value; }));
        return value;
      }
      function openCreate(ref) {
        var order = orderByRef(ref);
        if (!order || order.status !== "approved") {
          OJB.toast("Only administrator-approved orders can be shipped.");
          return;
        }
        var existing = shipmentByOrder(ref);
        if (existing) {
          OJB.toast("This order already has a primary shipment.");
          openDetails(existing.trackingNumber);
          return;
        }
        creatingOrderRef = ref;
        var d = new Date();
        d.setDate(d.getDate() + 3);
        var suggestedDate = dateOnly(d);
        $("shipmentCreateExpected").min = dateOnly(new Date());
        $("shipmentCreateExpected").value = suggestedDate;
        $("shipmentCreateSummary").innerHTML =
          "<dl class='shipment-create-summary'>" +
          "<div><dt>Order reference</dt><dd>" + esc(order.ref) + "</dd></div>" +
          "<div><dt>Sender</dt><dd>" + esc(order.sender.name) + (order.sender.company ? " · " + esc(order.sender.company) : "") + "</dd></div>" +
          "<div><dt>Receiver</dt><dd>" + esc(order.receiver.name) + "</dd></div>" +
          "<div><dt>Route</dt><dd>" + esc(order.origin) + " → " + esc(order.destination) + "</dd></div>" +
          "<div><dt>Package</dt><dd>" + esc(order.pkg.description) + ", " + esc(order.pkg.quantity) + " item(s)</dd></div>" +
          "<div><dt>Shipping service</dt><dd>" + esc(order.service) + "</dd></div></dl>";
        createModal.hidden = false;
        document.body.style.overflow = "hidden";
        $("shipmentCreateExpected").focus();
      }
      function closeCreate() {
        createModal.hidden = true;
        creatingOrderRef = null;
        if (drawer.hidden) document.body.style.overflow = "";
      }
      function createShipment() {
        var order = orderByRef(creatingOrderRef);
        if (!order || order.status !== "approved") {
          closeCreate();
          OJB.toast("Only administrator-approved orders can be shipped.");
          return;
        }
        if (shipmentByOrder(order.ref)) {
          closeCreate();
          OJB.toast("This order already has a primary shipment.");
          render();
          return;
        }
        var expected = $("shipmentCreateExpected").value;
        if (!expected || expected < dateOnly(new Date())) {
          $("shipmentCreateExpected").focus();
          OJB.toast("Choose a valid expected delivery date.");
          return;
        }
        var createdDate = new Date();
        createdDate.setMilliseconds(0);
        var createdAt = createdDate.toISOString();
        var trackingNumber = generateTrackingNumber();
        shipments.unshift({
          trackingNumber: trackingNumber,
          orderRef: order.ref,
          sender: Object.assign({}, order.sender),
          receiver: Object.assign({}, order.receiver),
          origin: order.origin,
          destination: order.destination,
          package: Object.assign({}, order.pkg),
          service: order.service,
          status: "Shipment Created",
          dashboardBaselineStatus: "Shipment Created",
          dashboardNewRecord: true,
          createdAt: createdAt,
          expectedDelivery: expected,
          currentLocation: order.origin,
          remarks: "",
          activity: [{
            at: createdAt,
            by: "Admin · You",
            text: "Shipment created from the approved order.",
            status: "Shipment Created",
            location: order.origin,
            description: "Shipment created from the approved order."
          }]
        });
        closeCreate();
        render();
        OJB.updateDashboardShipmentStats();
        OJB.toast(trackingNumber + " created for " + order.ref + ". Preview only, not saved.");
      }
      function detailRows(rows) {
        return "<dl class='dl'>" + rows.map(function (row) {
          return "<dt>" + row[0] + "</dt><dd>" + esc(row[1] == null || row[1] === "" ? "Not provided" : row[1]) + "</dd>";
        }).join("") + "</dl>";
      }
      function renderDetails() {
        var s = shipmentByTracking(selectedTracking);
        if (!s) return;
        $("shipmentDrawerTitle").textContent = s.trackingNumber;
        $("shipmentDrawerSubtitle").textContent = "Order " + s.orderRef + " · Created " + displayDate(s.createdAt, true);
        $("shipmentDrawerPills").innerHTML = pill(s.status) + "<span class='a-demo-badge'>Preview only</span>";
        $("shipmentDrawerBody").innerHTML =
          "<section class='d-card a-glass'><h3>Shipment overview</h3>" +
          detailRows([["Tracking number", s.trackingNumber], ["Order reference", s.orderRef], ["Current status", s.status], ["Current location", s.currentLocation], ["Shipping service", s.service], ["Created", displayDate(s.createdAt, true)], ["Expected delivery", displayDate(s.expectedDelivery)]]) +
          "<div class='route' style='margin-top:16px'><div>" + esc(s.origin) + "<small>Origin</small></div><svg viewBox='0 0 24 24'><path d='M5 12h14M13 6l6 6-6 6'/></svg><div>" + esc(s.destination) + "<small>Destination</small></div></div></section>" +
          "<div class='d-grid'><section class='d-card a-glass'><h3>Sender</h3>" + detailRows([["Name", s.sender.name], ["Company", s.sender.company], ["Phone", s.sender.phone], ["Email", s.sender.email], ["Address", s.sender.address]]) + "</section>" +
          "<section class='d-card a-glass'><h3>Receiver</h3>" + detailRows([["Name", s.receiver.name], ["Phone", s.receiver.phone], ["Email", s.receiver.email], ["Address", s.receiver.address]]) + "</section></div>" +
          "<section class='d-card a-glass'><h3>Package details</h3>" + detailRows([["Description", s.package.description], ["Category", s.package.category], ["Weight", s.package.weight + " kg"], ["Quantity", s.package.quantity], ["Dimensions", s.package.dimensions], ["Declared value", "₦" + Number(s.package.value).toLocaleString("en-NG")]]) + "</section>" +
          "<section class='d-card a-glass'><h3>Shipment activity</h3><ul class='timeline'>" +
          s.activity.slice().reverse().map(function (a) {
            var activityText = a.text || a.description || (a.status ? "Status updated to " + a.status : "Shipment details updated.");
            return "<li>" + esc(activityText) +
              (a.status ? "<small>" + esc(a.status) + (a.location ? " · " + esc(a.location) : "") + "</small>" : "") +
              "<small>" + esc(a.by) + " · " + displayDate(a.at, true) + "</small></li>";
          }).join("") + "</ul></section>" +
          "<section class='d-card a-glass'><h3>Internal administration</h3><div class='shipment-detail-form'>" +
          "<div class='a-field'><label for='shipmentEditExpected'>Expected delivery date</label><input class='a-input shipment-date' id='shipmentEditExpected' type='date' value='" + esc(s.expectedDelivery) + "' min='" + dateOnly(new Date()) + "' /></div>" +
          "<div class='a-field'><label for='shipmentEditRemarks'>Internal remarks</label><textarea class='a-textarea' id='shipmentEditRemarks' maxlength='1000' placeholder='Add an internal note for the operations team'>" + esc(s.remarks) + "</textarea></div>" +
          "<p class='note-local'>Status updates will be managed in Phase 4.</p></div></section>";
        $("shipmentDrawerFoot").innerHTML = "<button class='a-btn a-btn--gold' type='button' data-save-shipment>Save shipment details</button>";
      }
      function openDetails(tracking) {
        if (!shipmentByTracking(tracking)) {
          OJB.toast("Shipment not found in the current preview.");
          return;
        }
        lastFocus = document.activeElement;
        selectedTracking = tracking;
        renderDetails();
        drawer.hidden = false;
        document.body.style.overflow = "hidden";
        $("shipmentDrawerClose").focus();
      }
      function closeDetails() {
        drawer.hidden = true;
        selectedTracking = null;
        if (createModal.hidden) document.body.style.overflow = "";
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }
      function saveDetails() {
        var s = shipmentByTracking(selectedTracking);
        if (!s) return;
        var expected = $("shipmentEditExpected").value;
        if (!expected || expected < dateOnly(new Date())) {
          $("shipmentEditExpected").focus();
          OJB.toast("Choose a valid expected delivery date.");
          return;
        }
        s.expectedDelivery = expected;
        s.remarks = $("shipmentEditRemarks").value.trim().slice(0, 1000);
        s.activity.push({ at: new Date().toISOString(), by: "Admin · You", text: "Updated expected delivery date and internal remarks (preview)." });
        render();
        renderDetails();
        OJB.toast("Shipment details updated. Preview only, not saved.");
      }

      $("shipmentStatusFilter").innerHTML = "<option value='all'>All shipment statuses</option>" +
        STATUSES.map(function (status) { return "<option value='" + esc(status) + "'>" + esc(status) + "</option>"; }).join("");
      var searchTimer;
      $("shipmentSearch").addEventListener("input", function (e) {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () { state.q = e.target.value; state.page = 1; renderTable(); }, 120);
      });
      $("shipmentStatusFilter").addEventListener("change", function (e) { state.status = e.target.value; state.page = 1; renderTable(); });
      $("shipmentPageSize").addEventListener("change", function (e) { state.size = Number(e.target.value); state.page = 1; renderTable(); });
      $("shipmentReset").addEventListener("click", function () {
        state.q = ""; state.status = "all"; state.page = 1;
        $("shipmentSearch").value = ""; $("shipmentStatusFilter").value = "all";
        renderTable();
      });
      $("shipmentPagerBtns").addEventListener("click", function (e) {
        var button = e.target.closest("[data-ship-page]");
        if (!button || button.disabled) return;
        state.page = Number(button.getAttribute("data-ship-page"));
        renderTable();
      });
      $("shipmentsView").querySelectorAll("[data-ship-sort]").forEach(function (button) {
        button.addEventListener("click", function () {
          var key = button.getAttribute("data-ship-sort");
          if (state.sort === key) state.dir = state.dir === "asc" ? "desc" : "asc";
          else { state.sort = key; state.dir = key === "createdAt" ? "desc" : "asc"; }
          renderTable();
        });
      });
      $("shipmentsBody").addEventListener("click", function (e) {
        var button = e.target.closest("[data-shipment-details]");
        if (button) openDetails(button.getAttribute("data-shipment-details"));
      });
      $("shipmentDrawerClose").addEventListener("click", closeDetails);
      drawer.querySelector(".drawer__scrim").addEventListener("click", closeDetails);
      $("shipmentDrawerFoot").addEventListener("click", function (e) {
        if (e.target.closest("[data-save-shipment]")) saveDetails();
      });
      createModal.querySelectorAll("[data-create-close]").forEach(function (button) {
        button.addEventListener("click", closeCreate);
      });
      $("shipmentCreateConfirm").addEventListener("click", createShipment);
      createModal.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") { e.preventDefault(); createShipment(); }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        if (!createModal.hidden) closeCreate();
        else if (!drawer.hidden) closeDetails();
      });

      render();
      return { open: openDetails, openCreate: openCreate, refresh: render };
    },
    onShow: function (api, param) {
      if (!api) return;
      api.refresh();
      if (!param) return;
      var parts = param.split("/");
      if (parts[0] === "create" && parts[1]) api.openCreate(parts.slice(1).join("/"));
      else api.open(param);
    }
  };

  /* =========================================================
     8. TRACKING MANAGEMENT (PHASE 4)
     Tracking events live on the existing shipment objects.
     There is no separate shipment store and no public-page sync.
     ========================================================= */
  OJB.sections.tracking = {
    init: function () {
      var $ = function (id) { return document.getElementById(id); };
      var esc = OJB.esc;
      var shipments = OJB.data.shipments;
      var STATUSES = [
        "Shipment Created", "Package Received", "In Transit", "Customs Clearance",
        "Out for Delivery", "Delivered", "On Hold", "Delivery Attempt Failed"
      ];
      var state = { q: "", status: "all", sort: "lastUpdated", dir: "desc", page: 1, size: 10 };
      var selectedTracking = null;
      var lastFocus = null;
      var drawer = $("trackingDrawer");
      var publishing = false;

      function trackedShipments() {
        return shipments.filter(function (shipment) {
          return typeof shipment.trackingNumber === "string" && shipment.trackingNumber.trim() !== "";
        });
      }
      function eventDate(event) {
        var time = new Date(event.at);
        return isNaN(time.getTime()) ? new Date(0) : time;
      }
      function trackingEvents(shipment) {
        return shipment.activity.filter(function (event) { return !!event.status; }).slice().sort(function (a, b) {
          return eventDate(a).getTime() - eventDate(b).getTime();
        });
      }
      function latestEvent(shipment) {
        var events = trackingEvents(shipment);
        return events.length ? events[events.length - 1] : null;
      }
      function ensureTrackingHistory(shipment) {
        if (!Array.isArray(shipment.activity)) shipment.activity = [];
        if (!shipment.dashboardBaselineStatus) shipment.dashboardBaselineStatus = shipment.status;
        if (!shipment.currentLocation) shipment.currentLocation = shipment.origin;
        if (!shipment.activity.some(function (event) { return !!event.status; })) {
          var at = shipment.createdAt || new Date().toISOString();
          shipment.activity.push({
            at: at,
            by: "Admin · Demo",
            text: "Shipment created and ready for tracking.",
            status: shipment.status,
            location: shipment.currentLocation,
            description: "Shipment created and ready for tracking."
          });
        }
        var latest = latestEvent(shipment);
        if (latest) {
          shipment.status = latest.status;
          if (latest.location) shipment.currentLocation = latest.location;
        }
      }
      shipments.forEach(ensureTrackingHistory);

      function dateTimeLocal(date) {
        var d = date || new Date();
        function pad(value) { return String(value).padStart(2, "0"); }
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
          "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
      }
      function displayDate(value, withTime) {
        if (!value) return "Not set";
        var d = new Date(value);
        if (isNaN(d.getTime())) return "Not set";
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
          (withTime ? ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
      }
      function statusClass(status) {
        return status === "Delivered" ? "shipment-delivered" : status.toLowerCase().replace(/\s+/g, "-");
      }
      function statusPill(status) {
        return "<span class='pill pill--" + statusClass(status) + "'>" + esc(status) + "</span>";
      }
      function shipmentByTracking(trackingNumber) {
        var all = trackedShipments();
        for (var i = 0; i < all.length; i++) if (all[i].trackingNumber === trackingNumber) return all[i];
        return null;
      }
      function summaryCounts() {
        var all = trackedShipments();
        var counts = { total: all.length, transit: 0, outForDelivery: 0, delivered: 0, onHold: 0 };
        all.forEach(function (shipment) {
          if (shipment.status === "In Transit" || shipment.status === "Customs Clearance" || shipment.status === "Package Received") counts.transit++;
          if (shipment.status === "Out for Delivery") counts.outForDelivery++;
          if (shipment.status === "Delivered") counts.delivered++;
          if (shipment.status === "On Hold" || shipment.status === "Delivery Attempt Failed") counts.onHold++;
        });
        return counts;
      }
      function renderStats() {
        var c = summaryCounts();
        $("trackTotal").textContent = c.total;
        $("trackTransit").textContent = c.transit;
        $("trackOutForDelivery").textContent = c.outForDelivery;
        $("trackDelivered").textContent = c.delivered;
        $("trackOnHold").textContent = c.onHold;
        OJB.updateDashboardShipmentStats();
      }
      function filteredShipments() {
        var q = state.q.trim().toLowerCase();
        var list = trackedShipments().filter(function (shipment) {
          if (state.status !== "all" && shipment.status !== state.status) return false;
          if (!q) return true;
          return [
            shipment.trackingNumber, shipment.orderRef, shipment.sender.name, shipment.sender.company,
            shipment.receiver.name, shipment.origin, shipment.destination, shipment.currentLocation, shipment.status
          ].join(" ").toLowerCase().indexOf(q) >= 0;
        });
        var direction = state.dir === "asc" ? 1 : -1;
        function value(shipment) {
          if (state.sort === "senderReceiver") return (shipment.sender.name + " " + shipment.receiver.name).toLowerCase();
          if (state.sort === "route") return (shipment.origin + " " + shipment.destination).toLowerCase();
          if (state.sort === "status") return STATUSES.indexOf(shipment.status);
          if (state.sort === "lastUpdated") {
            var event = latestEvent(shipment);
            return event ? eventDate(event).getTime() : 0;
          }
          return String(shipment[state.sort] || "").toLowerCase();
        }
        return list.sort(function (a, b) {
          var x = value(a), y = value(b);
          return x < y ? -direction : x > y ? direction : 0;
        });
      }
      function renderTable() {
        var list = filteredShipments();
        var pages = Math.max(1, Math.ceil(list.length / state.size));
        if (state.page > pages) state.page = pages;
        var start = (state.page - 1) * state.size;
        var rows = list.slice(start, start + state.size);
        $("trackingView").querySelectorAll("[data-track-sort]").forEach(function (button) {
          var on = button.getAttribute("data-track-sort") === state.sort;
          button.classList.toggle("is-asc", on && state.dir === "asc");
          button.classList.toggle("is-desc", on && state.dir === "desc");
          button.closest("th").setAttribute("aria-sort", on ? (state.dir === "asc" ? "ascending" : "descending") : "none");
        });
        $("trackingBody").innerHTML = rows.length ? rows.map(function (shipment) {
          var event = latestEvent(shipment);
          return "<tr>" +
            "<td class='mono'>" + esc(shipment.trackingNumber) + "</td>" +
            "<td class='mono'>" + esc(shipment.orderRef) + "</td>" +
            "<td><div class='shipment-contact'><strong>" + esc(shipment.sender.name) + "</strong><span>To " + esc(shipment.receiver.name) + "</span></div></td>" +
            "<td>" + esc(shipment.origin) + " <span aria-hidden='true'>→</span> " + esc(shipment.destination) + "</td>" +
            "<td>" + esc(shipment.currentLocation || "Not set") + "</td>" +
            "<td>" + statusPill(shipment.status) + "</td>" +
            "<td>" + displayDate(event && event.at, true) + "</td>" +
            "<td><div class='row-actions'><button class='a-btn a-btn--ghost a-btn--sm' data-tracking-details='" + esc(shipment.trackingNumber) + "'>View Tracking Details</button></div></td>" +
            "</tr>";
        }).join("") : "<tr><td colspan='8'><div class='empty'><strong>No tracked shipments match your filters</strong>Try a different search or clear the filters.</div></td></tr>";
        $("trackingResultCount").textContent = list.length + " of " + trackedShipments().length + " tracked shipments";
        $("trackingPagerInfo").textContent = list.length
          ? "Showing " + (start + 1) + "–" + Math.min(start + state.size, list.length) + " of " + list.length
          : "Showing 0";
        var buttons = "<button class='pager__btn' data-track-page='" + (state.page - 1) + "' " + (state.page === 1 ? "disabled" : "") + " aria-label='Previous page'>‹</button>";
        for (var p = 1; p <= pages; p++) buttons += "<button class='pager__btn" + (p === state.page ? " is-active" : "") + "' data-track-page='" + p + "' aria-label='Page " + p + "'" + (p === state.page ? " aria-current='page'" : "") + ">" + p + "</button>";
        buttons += "<button class='pager__btn' data-track-page='" + (state.page + 1) + "' " + (state.page === pages ? "disabled" : "") + " aria-label='Next page'>›</button>";
        $("trackingPagerBtns").innerHTML = buttons;
      }
      function render() {
        shipments.forEach(ensureTrackingHistory);
        renderStats();
        renderTable();
      }
      function detailRows(rows) {
        return "<dl class='dl'>" + rows.map(function (row) {
          return "<dt>" + row[0] + "</dt><dd>" + esc(row[1] == null || row[1] === "" ? "Not provided" : row[1]) + "</dd>";
        }).join("") + "</dl>";
      }
      function renderTimeline(shipment) {
        var events = trackingEvents(shipment);
        if (!events.length) return "<p class='tracking-empty'>No tracking updates have been published.</p>";
        return "<ol class='tracking-timeline'>" + events.map(function (event, index) {
          var latest = index === events.length - 1;
          return "<li class='tracking-event" + (latest ? " is-latest" : "") + "'>" +
            "<span class='tracking-event__marker' aria-hidden='true'>" + (latest ? "<span></span>" : "<svg viewBox='0 0 24 24'><path d='M20 6L9 17l-5-5'/></svg>") + "</span>" +
            "<div class='tracking-event__body'><div class='tracking-event__top'>" + statusPill(event.status) +
            (latest ? "<span class='tracking-latest-badge'>Latest update</span>" : "") + "</div>" +
            "<p class='tracking-event__location'>" + esc(event.location || "Location not provided") + "</p>" +
            "<p class='tracking-event__description'>" + esc(event.description || event.text || "Shipment status updated.") + "</p>" +
            "<time datetime='" + esc(event.at) + "'>" + displayDate(event.at, true) + "</time></div></li>";
        }).join("") + "</ol>";
      }
      function renderDetails() {
        var shipment = shipmentByTracking(selectedTracking);
        if (!shipment) return;
        var latest = latestEvent(shipment);
        var statusOptions = "<option value=''>Select a new status</option>" + STATUSES.map(function (status) {
          return "<option value='" + esc(status) + "'>" + esc(status) + "</option>";
        }).join("");
        $("trackingDrawerTitle").textContent = shipment.trackingNumber;
        $("trackingDrawerSubtitle").textContent = "Order " + shipment.orderRef + " · Updated " + displayDate(latest && latest.at, true);
        $("trackingDrawerPills").innerHTML = statusPill(shipment.status) + "<span class='a-demo-badge'>Temporary preview</span>";
        $("trackingDrawerBody").innerHTML =
          "<section class='d-card a-glass'><h3>Shipment tracking details</h3>" +
          detailRows([["Tracking number", shipment.trackingNumber], ["Order reference", shipment.orderRef], ["Current status", shipment.status], ["Current location", shipment.currentLocation], ["Expected delivery", shipment.expectedDelivery ? displayDate(shipment.expectedDelivery) : "Not set"]]) +
          "<div class='route' style='margin-top:16px'><div>" + esc(shipment.origin) + "<small>Origin</small></div><svg viewBox='0 0 24 24'><path d='M5 12h14M13 6l6 6-6 6'/></svg><div>" + esc(shipment.destination) + "<small>Destination</small></div></div></section>" +
          "<div class='d-grid'><section class='d-card a-glass'><h3>Sender</h3>" + detailRows([["Name", shipment.sender.name], ["Company", shipment.sender.company], ["Phone", shipment.sender.phone], ["Email", shipment.sender.email]]) + "</section>" +
          "<section class='d-card a-glass'><h3>Receiver</h3>" + detailRows([["Name", shipment.receiver.name], ["Phone", shipment.receiver.phone], ["Email", shipment.receiver.email]]) + "</section></div>" +
          "<section class='d-card a-glass'><div class='panel__head tracking-timeline__head'><h3>Tracking timeline</h3><span class='tracking-latest-badge'>Newest event shown last</span></div>" + renderTimeline(shipment) + "</section>" +
          "<section class='d-card a-glass'><h3>Publish tracking update</h3>" +
          "<form class='tracking-update-form' id='trackingUpdateForm' novalidate>" +
          "<div class='a-field'><label for='trackingReadOnlyNumber'>Tracking number</label><input class='a-input' id='trackingReadOnlyNumber' value='" + esc(shipment.trackingNumber) + "' readonly /></div>" +
          "<div class='tracking-update-form__row'><div class='a-field'><label>Current shipment status</label><div class='tracking-current-status'>" + statusPill(shipment.status) + "</div></div>" +
          "<div class='a-field'><label for='trackingNewStatus'>New shipment status</label><select class='a-select' id='trackingNewStatus' required>" + statusOptions + "</select></div></div>" +
          "<div class='a-field'><label for='trackingNewLocation'>Current location</label><input class='a-input' id='trackingNewLocation' maxlength='120' value='" + esc(shipment.currentLocation || "") + "' placeholder='City or facility' required /></div>" +
          "<div class='a-field'><label for='trackingDescription'>Update description or remarks</label><textarea class='a-textarea' id='trackingDescription' maxlength='500' minlength='5' placeholder='This description is customer-visible when tracking is connected.' required></textarea><p class='tracking-field-note'>Customer-facing update. Internal shipment remarks stay private.</p></div>" +
          "<div class='a-field'><label for='trackingEventTime'>Event date and time</label><input class='a-input tracking-datetime' id='trackingEventTime' type='datetime-local' step='1' value='" + dateTimeLocal(new Date()) + "' required /></div>" +
          "<p class='tracking-preview-note'>Updates are shared with Shipment Management in this browser session only. The public Track Order page is not connected yet.</p>" +
          "<button class='a-btn a-btn--gold' type='submit' data-publish-tracking>Publish Update</button></form></section>";
        $("trackingDrawerFoot").innerHTML =
          "<button class='a-btn a-btn--ghost' type='button' data-go-shipments>Shipment Management</button>" +
          "<button class='a-btn a-btn--gold' type='button' data-view-shipment>View Associated Shipment</button>";
      }
      function openDetails(trackingNumber) {
        if (!shipmentByTracking(trackingNumber)) {
          OJB.toast("Tracked shipment not found in the current preview.");
          return;
        }
        lastFocus = document.activeElement;
        selectedTracking = trackingNumber;
        renderDetails();
        drawer.hidden = false;
        document.body.style.overflow = "hidden";
        $("trackingDrawerClose").focus();
      }
      function closeDetails() {
        drawer.hidden = true;
        selectedTracking = null;
        document.body.style.overflow = "";
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }
      function publishUpdate(form) {
        if (publishing) return;
        var shipment = shipmentByTracking(selectedTracking);
        if (!shipment) return;
        var newStatus = $("trackingNewStatus").value;
        var location = $("trackingNewLocation").value.trim();
        var description = $("trackingDescription").value.trim();
        var eventTimeValue = $("trackingEventTime").value;
        var eventTime = eventTimeValue ? new Date(eventTimeValue) : null;
        var last = latestEvent(shipment);
        if (!newStatus || STATUSES.indexOf(newStatus) < 0) {
          OJB.toast("Select a valid shipment status.");
          $("trackingNewStatus").focus();
          return;
        }
        if (!location || location.length > 120) {
          OJB.toast("Enter a current location of 1 to 120 characters.");
          $("trackingNewLocation").focus();
          return;
        }
        if (description.length < 5 || description.length > 500) {
          OJB.toast("Enter an update description between 5 and 500 characters.");
          $("trackingDescription").focus();
          return;
        }
        if (!eventTime || isNaN(eventTime.getTime())) {
          OJB.toast("Enter a valid event date and time.");
          $("trackingEventTime").focus();
          return;
        }
        if (eventTime.getTime() > Date.now()) {
          OJB.toast("An event date and time cannot be in the future.");
          $("trackingEventTime").focus();
          return;
        }
        if (last && eventTime.getTime() < eventDate(last).getTime()) {
          OJB.toast("The new event cannot be earlier than the latest tracking update.");
          $("trackingEventTime").focus();
          return;
        }
        var eventISO = eventTime.toISOString();
        var duplicate = shipment.activity.some(function (event) {
          return event.status === newStatus && event.location === location &&
            (event.description || event.text) === description && event.at === eventISO;
        });
        if (duplicate) {
          OJB.toast("This tracking update has already been published.");
          return;
        }
        if (newStatus === "Delivered" && !window.confirm("Confirm marking " + shipment.trackingNumber + " as Delivered? This update will be added to the tracking timeline.")) return;
        publishing = true;
        var button = form.querySelector("[data-publish-tracking]");
        button.disabled = true;
        try {
          var event = {
            at: eventISO,
            by: "Admin · You",
            status: newStatus,
            location: location,
            description: description,
            text: description,
            kind: "tracking"
          };
          shipment.activity.push(event);
          shipment.status = newStatus;
          shipment.currentLocation = location;
          render();
          renderDetails();
          OJB.updateDashboardShipmentStats();
          OJB.toast("Tracking update published. Session preview only, not saved.");
        } finally {
          publishing = false;
        }
      }

      $("trackingStatusFilter").innerHTML = "<option value='all'>All shipment statuses</option>" +
        STATUSES.map(function (status) { return "<option value='" + esc(status) + "'>" + esc(status) + "</option>"; }).join("");
      var searchTimer;
      $("trackingSearch").addEventListener("input", function (e) {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () { state.q = e.target.value; state.page = 1; renderTable(); }, 120);
      });
      $("trackingStatusFilter").addEventListener("change", function (e) { state.status = e.target.value; state.page = 1; renderTable(); });
      $("trackingPageSize").addEventListener("change", function (e) { state.size = Number(e.target.value); state.page = 1; renderTable(); });
      $("trackingReset").addEventListener("click", function () {
        state.q = ""; state.status = "all"; state.page = 1;
        $("trackingSearch").value = ""; $("trackingStatusFilter").value = "all";
        renderTable();
      });
      $("trackingPagerBtns").addEventListener("click", function (e) {
        var button = e.target.closest("[data-track-page]");
        if (!button || button.disabled) return;
        state.page = Number(button.getAttribute("data-track-page"));
        renderTable();
      });
      $("trackingView").querySelectorAll("[data-track-sort]").forEach(function (button) {
        button.addEventListener("click", function () {
          var key = button.getAttribute("data-track-sort");
          if (state.sort === key) state.dir = state.dir === "asc" ? "desc" : "asc";
          else { state.sort = key; state.dir = key === "lastUpdated" ? "desc" : "asc"; }
          renderTable();
        });
      });
      $("trackingBody").addEventListener("click", function (e) {
        var button = e.target.closest("[data-tracking-details]");
        if (button) openDetails(button.getAttribute("data-tracking-details"));
      });
      $("trackingDrawerClose").addEventListener("click", closeDetails);
      drawer.querySelector(".drawer__scrim").addEventListener("click", closeDetails);
      $("trackingDrawerBody").addEventListener("submit", function (e) {
        if (e.target.id !== "trackingUpdateForm") return;
        e.preventDefault();
        publishUpdate(e.target);
      });
      $("trackingDrawerFoot").addEventListener("click", function (e) {
        if (e.target.closest("[data-go-shipments]")) {
          closeDetails();
          location.hash = "#shipments";
          return;
        }
        if (e.target.closest("[data-view-shipment]")) {
          var shipment = shipmentByTracking(selectedTracking);
          if (!shipment) return;
          closeDetails();
          location.hash = "#shipments/" + encodeURIComponent(shipment.trackingNumber);
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !drawer.hidden) closeDetails();
      });

      render();
      return { open: openDetails, refresh: render };
    },
    onShow: function (api, param) {
      if (!api) return;
      api.refresh();
      if (param) api.open(param);
    }
  };

  /* =========================================================
     9. PHASES 5–7: QUOTATIONS, CUSTOMERS, ENQUIRIES & STAFF
     These modules use one shared, in-memory demo dataset. No
     customer messages are sent and no changes persist on reload.
     ========================================================= */
  (function () {
    "use strict";
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var quoteRefs = {};
    function dateOffset(days) {
      var d = new Date();
      d.setDate(d.getDate() + days);
      return d;
    }
    function dateValue(value) {
      var d = new Date(value);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    function displayDate(value, time) {
      if (!value) return "Not recorded";
      var d = new Date(value);
      if (isNaN(d.getTime())) return "Not recorded";
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
        (time ? ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
    }
    function dateInput(value) {
      var d = new Date(value);
      if (isNaN(d.getTime())) d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    function newQuoteRef() {
      var ref;
      do {
        var suffix = "";
        for (var i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
        ref = "OJBQT1" + suffix;
      } while (quoteRefs[ref]);
      quoteRefs[ref] = true;
      return ref;
    }
    function customerEmail(order) {
      return String(order.sender.email || "").trim().toLowerCase();
    }
    function createDemoQuotes() {
      var orders = OJB.data.orders;
      var statusList = ["Pending", "Sent", "Accepted", "Expired", "Declined", "Pending", "Sent", "Accepted", "Sent"];
      var indexes = [0, 1, 2, 3, 4, 5, 7, 8, 10];
      return indexes.map(function (orderIndex, i) {
        var order = orders[orderIndex];
        var status = statusList[i];
        var expiry = dateOffset(status === "Expired" ? -5 : 14 + (i % 8));
        var charge = 38500 + i * 12750;
        var extras = i % 3 === 0 ? 4500 : 0;
        var ref = newQuoteRef();
        return {
          id: "quote-demo-" + (i + 1), ref: ref, customerEmail: customerEmail(order),
          customerName: order.sender.name, phone: order.sender.phone, email: order.sender.email,
          company: order.sender.company, origin: order.origin, destination: order.destination,
          service: order.service, packageDescription: order.pkg.description,
          weight: order.pkg.weight, dimensions: order.pkg.dimensions || "Not provided",
          instructions: i % 2 ? "Please confirm the estimated delivery time before dispatch." : "Handle with care and keep the receiver informed.",
          requestedAt: order.submitted, status: status,
          shippingCharge: charge, additionalCharges: extras, currency: i === 1 ? "USD" : "NGN",
          amount: charge + extras, validityDays: 14, expiry: expiry.toISOString(),
          customerNotes: i % 2 ? "Includes standard handling. Customs duties, if applicable, are billed separately." : "Rate includes collection and delivery to the supplied address.",
          orderRef: status === "Accepted" ? order.ref : (i === 1 ? order.ref : ""),
          internalNotes: ""
        };
      });
    }
    OJB.data.quotations = createDemoQuotes();

    function deriveCustomers() {
      var map = {};
      OJB.data.orders.forEach(function (order) {
        var email = customerEmail(order);
        if (!email) return;
        if (!map[email]) {
          map[email] = {
            id: email, name: order.sender.name, company: order.sender.company || "Individual",
            email: order.sender.email, phone: order.sender.phone, orders: [], notes: "",
            firstSeen: order.submitted
          };
        }
        var customer = map[email];
        customer.orders.push(order);
        if (dateValue(order.submitted) < dateValue(customer.firstSeen)) customer.firstSeen = order.submitted;
        if (dateValue(order.submitted) > dateValue(customer.lastOrderAt || 0)) customer.lastOrderAt = order.submitted;
      });
      return Object.keys(map).map(function (email, i) {
        var customer = map[email];
        customer.shipments = OJB.data.shipments.filter(function (shipment) {
          return customer.orders.some(function (order) { return order.ref === shipment.orderRef; });
        });
        customer.quotations = OJB.data.quotations.filter(function (quote) { return quote.customerEmail === email; });
        customer.adminNotes = i % 4 === 0 ? "Confirm delivery preferences on the next contact." : "";
        customer.activity = [];
        customer.lastActivity = customer.firstSeen;
        customer.activeShipments = customer.shipments.filter(function (shipment) { return shipment.status !== "Delivered"; });
        return customer;
      });
    }
    OJB.data.customers = deriveCustomers();
    OJB.data.enquiries = [
      { id: "ENQ-2401", customerEmail: OJB.data.customers[0].email, subject: "Request for warehousing rates", message: "Hello, we are looking for short-term storage in Lagos for packaged retail goods. Please share your monthly rates, minimum term and available warehouse locations.", submittedAt: dateOffset(-1).toISOString(), status: "New", notes: [] },
      { id: "ENQ-2402", customerEmail: OJB.data.customers[1].email, subject: "International delivery to London", message: "Could you confirm whether your air freight service delivers to Greater London and what documents we need to prepare for a small commercial shipment?", submittedAt: dateOffset(-2).toISOString(), status: "In Progress", notes: [{ by: "Daniel K.", at: dateOffset(-1).toISOString(), text: "Checking the current route schedule and documentation list." }] },
      { id: "ENQ-2403", customerEmail: OJB.data.customers[2].email, subject: "Update delivery address", message: "I need to change the delivery address for my recent order. Please let me know if the parcel has already left the dispatch point.", submittedAt: dateOffset(-3).toISOString(), status: "Resolved", notes: [{ by: "Grace A.", at: dateOffset(-2).toISOString(), text: "Confirmed the parcel was still at the hub and the address was updated in this demo record." }] },
      { id: "ENQ-2404", customerEmail: OJB.data.customers[3].email, subject: "Bulk shipment collection", message: "We have several cartons ready for collection in Kano next week. Please advise on collection windows and whether you can consolidate the shipment.", submittedAt: dateOffset(-5).toISOString(), status: "New", notes: [] },
      { id: "ENQ-2405", customerEmail: OJB.data.customers[4].email, subject: "Proof of delivery", message: "Please help me obtain a proof-of-delivery confirmation for a shipment delivered to Lagos earlier this week.", submittedAt: dateOffset(-7).toISOString(), status: "Closed", notes: [{ by: "Admin User", at: dateOffset(-6).toISOString(), text: "Delivery confirmation shared with the customer through the usual channel (demo note)." }] },
      { id: "ENQ-2406", customerEmail: OJB.data.customers[5].email, subject: "Service availability in Accra", message: "Do you currently offer door-to-door service for packages sent from Lagos to Accra? Please include an approximate transit time.", submittedAt: dateOffset(-9).toISOString(), status: "In Progress", notes: [] }
    ];
    var initialEnquiryBadge = document.querySelector("[data-nav='enquiries'] .sidebar__count");
    if (initialEnquiryBadge) {
      var initialNewEnquiries = OJB.data.enquiries.filter(function (item) { return item.status === "New"; }).length;
      initialEnquiryBadge.textContent = initialNewEnquiries;
      initialEnquiryBadge.hidden = initialNewEnquiries === 0;
    }
    OJB.data.customers.forEach(function (customer) { syncCustomerAssociations(customer); });
    OJB.data.enquiries.forEach(function (item) {
      noteCustomerActivity(item.customerEmail, "Enquiry submitted · " + item.subject, item.submittedAt);
    });
    OJB.data.staff = [
      { id: "staff-01", name: "Daniel Kalu", email: "daniel.kalu@ojaybest.example", role: "Administrator", status: "Active", dateAdded: "2024-05-12T09:00:00.000Z", lastActivity: dateOffset(0).toISOString(), activity: [{ action: "Reviewed order OJB-ORD-10480", at: dateOffset(0).toISOString() }, { action: "Sent a quotation to a customer", at: dateOffset(-1).toISOString() }] },
      { id: "staff-02", name: "Grace Adeyemi", email: "grace.adeyemi@ojaybest.example", role: "Front Desk", status: "Active", dateAdded: "2024-08-21T09:00:00.000Z", lastActivity: dateOffset(-1).toISOString(), activity: [{ action: "Confirmed customer order details", at: dateOffset(-1).toISOString() }] },
      { id: "staff-03", name: "Samuel Okoro", email: "samuel.okoro@ojaybest.example", role: "Front Desk", status: "Active", dateAdded: "2025-02-05T09:00:00.000Z", lastActivity: dateOffset(-2).toISOString(), activity: [{ action: "Created an order preview", at: dateOffset(-2).toISOString() }] },
      { id: "staff-04", name: "Amina Yusuf", email: "amina.yusuf@ojaybest.example", role: "Administrator", status: "Inactive", dateAdded: "2023-11-17T09:00:00.000Z", lastActivity: dateOffset(-45).toISOString(), activity: [{ action: "Updated staff information", at: dateOffset(-45).toISOString() }] },
      { id: "staff-05", name: "Peter Nwosu", email: "peter.nwosu@ojaybest.example", role: "Front Desk", status: "Active", dateAdded: "2025-09-03T09:00:00.000Z", lastActivity: dateOffset(-4).toISOString(), activity: [{ action: "Confirmed customer order details", at: dateOffset(-4).toISOString() }] }
    ];

    OJB.openPhaseDialog = function (title, subtitle, body, footer) {
      OJB.closePhaseDialog();
      var overlay = document.createElement("div");
      overlay.className = "phase-dialog";
      overlay.setAttribute("role", "presentation");
      overlay.innerHTML = "<div class='phase-dialog__scrim' data-phase-close></div>" +
        "<section class='phase-dialog__panel a-glass' role='dialog' aria-modal='true' aria-label='" + OJB.esc(title) + "'>" +
        "<header class='phase-dialog__head'><div><span class='a-demo-badge'>Preview only</span><h2>" + OJB.esc(title) + "</h2><p>" + OJB.esc(subtitle || "Changes are temporary and are not saved after refresh.") + "</p></div>" +
        "<button class='icon-btn' type='button' data-phase-close aria-label='Close dialog'>×</button></header>" +
        "<div class='phase-dialog__body'>" + body + "</div>" +
        (footer ? "<footer class='phase-dialog__foot'>" + footer + "</footer>" : "") + "</section>";
      document.body.appendChild(overlay);
      document.body.style.overflow = "hidden";
      overlay.addEventListener("click", function (event) {
        if (event.target.closest("[data-phase-close]")) OJB.closePhaseDialog();
      });
      var focusable = overlay.querySelector("input, select, textarea, button");
      if (focusable) window.setTimeout(function () { focusable.focus(); }, 0);
      return overlay;
    };
    OJB.closePhaseDialog = function () {
      var overlay = document.querySelector(".phase-dialog");
      if (overlay) overlay.remove();
      if (!document.querySelector(".drawer:not([hidden]), .shipment-modal:not([hidden]), .a-modal:not([hidden])")) document.body.style.overflow = "";
    };
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") OJB.closePhaseDialog();
    });

    function pill(status) {
      var key = String(status).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return "<span class='pill phase-pill phase-pill--" + key + "'>" + OJB.esc(status) + "</span>";
    }
    function paging(list, state, info, buttons) {
      var pages = Math.max(1, Math.ceil(list.length / state.size));
      state.page = Math.min(state.page, pages);
      var start = list.length ? (state.page - 1) * state.size : 0;
      var end = Math.min(start + state.size, list.length);
      document.getElementById(info).textContent = list.length ? "Showing " + (start + 1) + "–" + end + " of " + list.length : "No records";
      var html = "<button class='pager__btn' data-phase-page='" + Math.max(1, state.page - 1) + "' " + (state.page === 1 ? "disabled" : "") + " aria-label='Previous page'>‹</button>";
      var first = Math.max(1, state.page - 2), last = Math.min(pages, first + 4);
      first = Math.max(1, last - 4);
      for (var page = first; page <= last; page++) html += "<button class='pager__btn " + (page === state.page ? "is-active" : "") + "' data-phase-page='" + page + "' aria-current='" + (page === state.page ? "page" : "false") + "'>" + page + "</button>";
      html += "<button class='pager__btn' data-phase-page='" + Math.min(pages, state.page + 1) + "' " + (state.page === pages ? "disabled" : "") + " aria-label='Next page'>›</button>";
      document.getElementById(buttons).innerHTML = html;
      return list.slice(start, end);
    }
    function dateSort(a, b, field, dir) {
      var diff = dateValue(a[field]) - dateValue(b[field]);
      return diff * (dir === "asc" ? 1 : -1);
    }
    function quoteStatus(quote) {
      if (quote.status !== "Accepted" && quote.status !== "Declined" && quote.status !== "Expired" &&
          quote.status !== "Pending" && dateValue(quote.expiry) < dateValue(dateInput(new Date()))) return "Expired";
      return quote.status;
    }
    function recordActivity(message) {
      if (typeof OJB.recordActivity === "function") OJB.recordActivity(message);
      OJB.data.dashboard.activities.unshift({ icon: "edit", text: "<strong>Admin User</strong> " + OJB.esc(message), time: "Just now" });
      OJB.data.dashboard.activities = OJB.data.dashboard.activities.slice(0, 20);
      var feed = document.getElementById("activityFeed");
      if (feed) {
        var row = document.createElement("li");
        row.innerHTML = "<span class='feed__icon'><svg viewBox='0 0 24 24'><path d='M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z'/></svg></span><div><p><strong>Admin User</strong> " + OJB.esc(message) + "</p><time>Just now</time></div>";
        feed.insertBefore(row, feed.firstChild);
        while (feed.children.length > 20) feed.removeChild(feed.lastChild);
      }
    }
    function customerFor(email) {
      var key = String(email || "").toLowerCase();
      return OJB.data.customers.filter(function (customer) { return customer.email.toLowerCase() === key; })[0] || null;
    }
    function customerActivity(customer) {
      var activity = (customer.activity || []).slice();
      customer.orders.forEach(function (order) {
        activity.push({ at: order.submitted, text: "Order submitted · " + order.ref });
      });
      customer.shipments.forEach(function (shipment) {
        (shipment.activity || []).forEach(function (event) {
          activity.push({ at: event.at, text: (event.status ? "Tracking update · " + event.status : "Shipment activity") + " · " + (shipment.trackingNumber || shipment.orderRef) });
        });
      });
      customer.quotations.forEach(function (quote) {
        activity.push({ at: quote.requestedAt, text: "Quotation request · " + quote.ref });
        if (quote.lastUpdatedAt) activity.push({ at: quote.lastUpdatedAt, text: "Quotation " + quote.ref + " marked " + quote.status.toLowerCase() });
      });
      (OJB.data.enquiries || []).filter(function (item) { return item.customerEmail.toLowerCase() === customer.email.toLowerCase(); }).forEach(function (item) {
        activity.push({ at: item.submittedAt, text: "Enquiry submitted · " + item.subject });
        (item.notes || []).forEach(function (note) { activity.push({ at: note.at, text: "Enquiry note added · " + item.id }); });
        if (item.statusUpdatedAt) activity.push({ at: item.statusUpdatedAt, text: "Enquiry " + item.id + " moved to " + item.status });
      });
      return activity.sort(function (a, b) { return dateValue(b.at) - dateValue(a.at); });
    }
    function syncCustomerAssociations(customer) {
      if (!customer) return;
      customer.shipments = OJB.data.shipments.filter(function (shipment) {
        return customer.orders.some(function (order) { return order.ref === shipment.orderRef; });
      });
      customer.quotations = OJB.data.quotations.filter(function (quote) { return quote.customerEmail.toLowerCase() === customer.email.toLowerCase(); });
      customer.activeShipments = customer.shipments.filter(function (shipment) { return shipment.status !== "Delivered"; });
      var activity = customerActivity(customer);
      if (activity.length) customer.lastActivity = activity[0].at;
    }
    function noteCustomerActivity(email, message, at) {
      var customer = customerFor(email);
      if (!customer) return;
      var time = at || new Date().toISOString();
      if (!Array.isArray(customer.activity)) customer.activity = [];
      customer.activity.unshift({ at: time, text: message });
      customer.activity.sort(function (a, b) { return dateValue(b.at) - dateValue(a.at); });
      customer.lastActivity = customer.activity[0].at;
      syncCustomerAssociations(customer);
    }
    function money(amount, currency) {
      try { return new Intl.NumberFormat("en-NG", { style: "currency", currency: currency || "NGN", maximumFractionDigits: 2 }).format(Number(amount) || 0); }
      catch (e) { return (currency || "NGN") + " " + (Number(amount) || 0).toLocaleString(); }
    }

    /* PHASE 5: QUOTATIONS */
    OJB.sections.quotations = {
      init: function () {
        var view = document.querySelector("[data-view='quotations']");
        var state = { q: "", status: "all", sort: "requested-desc", page: 1, size: 10 };
        var records = OJB.data.quotations;
        var statuses = ["Pending", "Sent", "Accepted", "Declined", "Expired"];
        var statusFilter = document.getElementById("quoteStatusFilter");
        statusFilter.innerHTML += statuses.map(function (s) { return "<option>" + s + "</option>"; }).join("");
        function renderStats() {
          var counts = { total: records.length, pending: 0, sent: 0, accepted: 0, expired: 0 };
          records.forEach(function (quote) {
            var status = quoteStatus(quote);
            if (status === "Pending") counts.pending++;
            if (status === "Sent") counts.sent++;
            if (status === "Accepted") counts.accepted++;
            if (status === "Expired") counts.expired++;
          });
          document.getElementById("quoteStatTotal").textContent = counts.total;
          document.getElementById("quoteStatPending").textContent = counts.pending;
          document.getElementById("quoteStatSent").textContent = counts.sent;
          document.getElementById("quoteStatAccepted").textContent = counts.accepted;
          document.getElementById("quoteStatExpired").textContent = counts.expired;
        }
        function render() {
          renderStats();
          var query = state.q.toLowerCase().trim();
          var list = records.filter(function (quote) {
            if (state.status !== "all" && quoteStatus(quote) !== state.status) return false;
            return !query || [quote.ref, quote.customerName, quote.customerEmail, quote.origin, quote.destination, quote.service].join(" ").toLowerCase().indexOf(query) >= 0;
          });
          list.sort(function (a, b) {
            if (state.sort === "customer-asc") return a.customerName.localeCompare(b.customerName);
            if (state.sort === "amount-desc") return b.amount - a.amount;
            if (state.sort === "amount-asc") return a.amount - b.amount;
            return dateSort(a, b, "requestedAt", state.sort === "requested-asc" ? "asc" : "desc");
          });
          var rows = paging(list, state, "quotePagerInfo", "quotePagerBtns");
          document.getElementById("quoteCount").textContent = list.length + " of " + records.length + " quotations";
          document.getElementById("quoteBody").innerHTML = rows.length ? rows.map(function (quote) {
            var status = quoteStatus(quote);
            return "<tr><td class='mono'>" + OJB.esc(quote.ref) + "</td><td><strong>" + OJB.esc(quote.customerName) + "</strong><span class='sub'>" + OJB.esc(quote.customerEmail) + "</span></td>" +
              "<td>" + OJB.esc(quote.origin) + " <span aria-hidden='true'>→</span> " + OJB.esc(quote.destination) + "</td><td>" + OJB.esc(quote.service) + "</td>" +
              "<td>" + displayDate(quote.requestedAt, false) + "</td><td>" + (quote.amount ? money(quote.amount, quote.currency) : "Not prepared") + "</td><td>" + pill(status) + "</td>" +
              "<td><div class='row-actions'><button type='button' class='a-btn a-btn--ghost a-btn--sm' data-quote-view='" + OJB.esc(quote.id) + "'>View</button>" +
              (status === "Pending" ? "<button type='button' class='a-btn a-btn--gold a-btn--sm' data-quote-prepare='" + OJB.esc(quote.id) + "'>Prepare</button>" : "") + "</div></td></tr>";
          }).join("") : "<tr><td colspan='8'><div class='empty'><strong>No quotations found</strong>Try another search or clear the filters.</div></td></tr>";
        }
        function quoteById(id) { return records.filter(function (q) { return q.id === id; })[0] || null; }
        function details(quote) {
          var linkedOrder = quote.orderRef ? OJB.data.orders.filter(function (o) { return o.ref === quote.orderRef; })[0] : null;
          var body = "<div class='phase-detail-grid'>" +
            "<article class='phase-detail-card'><h3>Customer</h3><dl class='phase-dl'><dt>Name</dt><dd>" + OJB.esc(quote.customerName) + "</dd><dt>Email</dt><dd>" + OJB.esc(quote.customerEmail) + "</dd><dt>Phone</dt><dd>" + OJB.esc(quote.phone) + "</dd><dt>Company</dt><dd>" + OJB.esc(quote.company || "Individual") + "</dd></dl></article>" +
            "<article class='phase-detail-card'><h3>Route &amp; package</h3><dl class='phase-dl'><dt>Pickup</dt><dd>" + OJB.esc(quote.origin) + "</dd><dt>Delivery</dt><dd>" + OJB.esc(quote.destination) + "</dd><dt>Service</dt><dd>" + OJB.esc(quote.service) + "</dd><dt>Package</dt><dd>" + OJB.esc(quote.packageDescription) + "</dd><dt>Weight</dt><dd>" + OJB.esc(quote.weight) + " kg</dd><dt>Dimensions</dt><dd>" + OJB.esc(quote.dimensions) + "</dd></dl></article>" +
            "<article class='phase-detail-card'><h3>Request &amp; pricing</h3><dl class='phase-dl'><dt>Requested</dt><dd>" + displayDate(quote.requestedAt, true) + "</dd><dt>Status</dt><dd>" + pill(quoteStatus(quote)) + "</dd><dt>Shipping</dt><dd>" + money(quote.shippingCharge, quote.currency) + "</dd><dt>Additional charges</dt><dd>" + money(quote.additionalCharges, quote.currency) + "</dd><dt>Total</dt><dd><strong>" + money(quote.amount, quote.currency) + "</strong></dd><dt>Valid until</dt><dd>" + displayDate(quote.expiry, false) + "</dd></dl></article>" +
            "<article class='phase-detail-card'><h3>Instructions &amp; customer notes</h3><p>" + OJB.esc(quote.instructions || "No additional customer instructions.") + "</p><p class='phase-muted'>" + OJB.esc(quote.customerNotes || "No customer-facing notes added.") + "</p></article>" +
            (linkedOrder ? "<article class='phase-detail-card phase-detail-card--wide'><h3>Related order</h3><p>Linked to <span class='mono'>" + OJB.esc(linkedOrder.ref) + "</span>. The order and quotation use the same customer and route information.</p></article>" : "") +
            "</div>";
          var footer = "";
          var status = quoteStatus(quote);
          if (status === "Pending") footer += "<button type='button' class='a-btn a-btn--gold' data-quote-prepare='" + OJB.esc(quote.id) + "'>Prepare quotation</button>";
          if (status === "Pending" || status === "Sent") footer += "<button type='button' class='a-btn a-btn--success' data-quote-status='Sent' data-quote-id='" + OJB.esc(quote.id) + "'>" + (status === "Sent" ? "Mark sent again" : "Mark as sent") + "</button>";
          if (status === "Sent") {
            footer += "<button type='button' class='a-btn a-btn--gold' data-quote-status='Accepted' data-quote-id='" + OJB.esc(quote.id) + "'>Mark accepted</button>";
            footer += "<button type='button' class='a-btn a-btn--warn' data-quote-status='Declined' data-quote-id='" + OJB.esc(quote.id) + "'>Mark declined</button>";
          }
          if (linkedOrder) footer += "<button type='button' class='a-btn a-btn--ghost' data-quote-order='" + OJB.esc(linkedOrder.ref) + "'>View linked order</button>";
          footer += "<button type='button' class='a-btn a-btn--ghost' data-phase-close>Close</button>";
          OJB.openPhaseDialog(quote.ref, "Quotation details · " + quoteStatus(quote) + " · Preview data", body, footer);
        }
        function editForm(quote) {
          var customers = OJB.data.customers;
          var isNew = !quote;
          var selected = quote || {};
          var customerOptions = customers.map(function (customer) {
            return "<option value='" + OJB.esc(customer.email) + "' " + (selected.customerEmail === customer.email ? "selected" : "") + ">" + OJB.esc(customer.name + " · " + customer.email) + "</option>";
          }).join("");
          var html = "<form id='quoteEditForm' class='phase-form' novalidate><div class='phase-form-grid'>" +
            "<label>Customer<select class='a-select' name='customerEmail' required>" + customerOptions + "</select></label>" +
            "<label>Preferred shipping service<select class='a-select' name='service'>" + ["Express Delivery", "Standard Delivery", "Air Freight", "Sea Freight", "Last-mile Delivery", "Warehousing & Dispatch"].map(function (s) { return "<option " + (selected.service === s ? "selected" : "") + ">" + OJB.esc(s) + "</option>"; }).join("") + "</select></label>" +
            "<label>Pickup location<input class='a-input' name='origin' required maxlength='100' value='" + OJB.esc(selected.origin || "") + "'></label><label>Delivery location<input class='a-input' name='destination' required maxlength='100' value='" + OJB.esc(selected.destination || "") + "'></label>" +
            "<label>Package description<input class='a-input' name='packageDescription' maxlength='160' value='" + OJB.esc(selected.packageDescription || "") + "'></label><label>Weight (kg)<input class='a-input' name='weight' type='number' min='0.1' step='0.1' value='" + OJB.esc(selected.weight || "") + "'></label>" +
            "<label>Dimensions<input class='a-input' name='dimensions' maxlength='100' value='" + OJB.esc(selected.dimensions || "") + "'></label><label>Shipping charge<input class='a-input' name='shippingCharge' type='number' min='0' step='0.01' value='" + OJB.esc(selected.shippingCharge || "") + "' required></label>" +
            "<label>Additional charges<input class='a-input' name='additionalCharges' type='number' min='0' step='0.01' value='" + OJB.esc(selected.additionalCharges || 0) + "'></label>" +
            "<label>Currency<select class='a-select' name='currency'><option value='NGN' " + (!selected.currency || selected.currency === "NGN" ? "selected" : "") + ">NGN · Nigerian naira</option><option value='USD' " + (selected.currency === "USD" ? "selected" : "") + ">USD · US dollar</option><option value='GBP' " + (selected.currency === "GBP" ? "selected" : "") + ">GBP · Pound sterling</option><option value='EUR' " + (selected.currency === "EUR" ? "selected" : "") + ">EUR · Euro</option></select></label>" +
            "<label>Validity (days)<input class='a-input' name='validityDays' type='number' min='1' max='365' step='1' value='" + OJB.esc(selected.validityDays || 14) + "' required></label>" +
            "<label class='phase-form-wide'>Customer instructions<textarea class='a-textarea' name='instructions' maxlength='500'>" + OJB.esc(selected.instructions || "") + "</textarea></label>" +
            "<label class='phase-form-wide'>Customer-facing quotation notes<textarea class='a-textarea' name='customerNotes' maxlength='1000'>" + OJB.esc(selected.customerNotes || "") + "</textarea></label>" +
            "</div><div class='phase-total'>Estimated quotation total <strong id='quoteTotalPreview'>" + money(selected.amount || 0, selected.currency || "NGN") + "</strong></div>" +
            "<p class='phase-muted'>Reference generation is a local demo. Email delivery and permanent storage are not connected.</p></form>";
          var overlay = OJB.openPhaseDialog(isNew ? "Create quotation request" : "Prepare quotation " + selected.ref, "Enter charges and validity. The calculation updates as you edit.", html,
            "<button type='button' class='a-btn a-btn--ghost' data-phase-close>Cancel</button><button type='button' class='a-btn a-btn--gold' data-quote-save='" + OJB.esc(selected.id || "") + "'>" + (isNew ? "Create request" : "Save quotation") + "</button>");
          var form = overlay.querySelector("#quoteEditForm");
          function calc() {
            var shipping = Number(form.elements.shippingCharge.value) || 0;
            var extras = Number(form.elements.additionalCharges.value) || 0;
            document.getElementById("quoteTotalPreview").textContent = money(shipping + extras, form.elements.currency.value);
          }
          form.addEventListener("input", calc);
          form.addEventListener("change", calc);
        }
        function saveForm(id) {
          var form = document.getElementById("quoteEditForm");
          if (!form.reportValidity()) return;
          var fields = form.elements;
          var customer = customerFor(fields.customerEmail.value);
          var shipping = Number(fields.shippingCharge.value);
          var extras = Number(fields.additionalCharges.value || 0);
          var days = Number(fields.validityDays.value);
          if (!customer || shipping < 0 || extras < 0 || days < 1 || days > 365) {
            OJB.toast("Check the customer, charges and validity values.");
            return;
          }
          var quote = id ? quoteById(id) : null;
          if (!quote) {
            quote = { id: "quote-" + Date.now(), ref: newQuoteRef(), requestedAt: new Date().toISOString(), status: "Pending", orderRef: "", internalNotes: "" };
            records.unshift(quote);
          }
          quote.customerEmail = customer.email.toLowerCase();
          quote.customerName = customer.name;
          quote.phone = customer.phone;
          quote.email = customer.email;
          quote.company = customer.company;
          quote.origin = fields.origin.value.trim();
          quote.destination = fields.destination.value.trim();
          quote.service = fields.service.value;
          quote.packageDescription = fields.packageDescription.value.trim() || "Not specified";
          quote.weight = Number(fields.weight.value) || 0;
          quote.dimensions = fields.dimensions.value.trim() || "Not provided";
          quote.instructions = fields.instructions.value.trim();
          quote.shippingCharge = shipping;
          quote.additionalCharges = extras;
          quote.amount = shipping + extras;
          quote.currency = fields.currency.value;
          quote.validityDays = days;
          quote.expiry = dateOffset(days).toISOString();
          quote.customerNotes = fields.customerNotes.value.trim();
          quote.lastUpdatedAt = new Date().toISOString();
          noteCustomerActivity(customer.email, (id ? "Quotation prepared · " : "Quotation request created · ") + quote.ref);
          OJB.data.customers.forEach(syncCustomerAssociations);
          recordActivity((id ? "updated quotation " : "created quotation ") + quote.ref + " (preview).");
          OJB.closePhaseDialog();
          render();
          OJB.toast("Quotation updated. Preview only, not saved.");
        }
        view.addEventListener("input", function (event) {
          if (event.target.id === "quoteSearch") { state.q = event.target.value; state.page = 1; render(); }
        });
        view.addEventListener("change", function (event) {
          if (event.target.id === "quoteStatusFilter") { state.status = event.target.value; state.page = 1; render(); }
          if (event.target.id === "quoteSort") { state.sort = event.target.value; state.page = 1; render(); }
          if (event.target.id === "quotePageSize") { state.size = Number(event.target.value); state.page = 1; render(); }
        });
        view.addEventListener("click", function (event) {
          var button = event.target.closest("button");
          if (!button) return;
          if (button.id === "quoteReset") { state.q = ""; state.status = "all"; state.sort = "requested-desc"; state.page = 1; document.getElementById("quoteSearch").value = ""; statusFilter.value = "all"; document.getElementById("quoteSort").value = "requested-desc"; render(); }
          if (button.hasAttribute("data-quote-create")) editForm(null);
          if (button.hasAttribute("data-quote-view")) { var quote = quoteById(button.getAttribute("data-quote-view")); if (quote) details(quote); }
          if (button.hasAttribute("data-quote-prepare")) { var editable = quoteById(button.getAttribute("data-quote-prepare")); if (editable) editForm(editable); }
          if (button.hasAttribute("data-phase-page")) { state.page = Number(button.getAttribute("data-phase-page")); render(); }
        });
        document.addEventListener("click", function (event) {
          var button = event.target.closest("[data-quote-save], [data-quote-status], [data-quote-order], [data-quote-prepare]");
          if (!button) return;
          if (button.hasAttribute("data-quote-prepare")) {
            var editable = quoteById(button.getAttribute("data-quote-prepare"));
            if (editable) editForm(editable);
            return;
          }
          if (button.hasAttribute("data-quote-save")) { saveForm(button.getAttribute("data-quote-save") || ""); return; }
          if (button.hasAttribute("data-quote-status")) {
            var targetQuote = quoteById(button.getAttribute("data-quote-id"));
            if (!targetQuote) return;
            targetQuote.status = button.getAttribute("data-quote-status");
            targetQuote.lastUpdatedAt = new Date().toISOString();
            if (targetQuote.status === "Accepted" && !targetQuote.orderRef) {
              var match = OJB.data.orders.filter(function (order) { return customerEmail(order) === targetQuote.customerEmail; })[0];
              if (match) targetQuote.orderRef = match.ref;
            }
            noteCustomerActivity(targetQuote.customerEmail, "Quotation " + targetQuote.ref + " marked " + targetQuote.status.toLowerCase());
            recordActivity("marked quotation " + targetQuote.ref + " as " + targetQuote.status.toLowerCase() + " (preview).");
            OJB.closePhaseDialog(); render(); OJB.toast("Quotation marked " + targetQuote.status.toLowerCase() + ". Preview only.");
            return;
          }
          if (button.hasAttribute("data-quote-order")) {
            var orderRef = button.getAttribute("data-quote-order");
            OJB.closePhaseDialog(); location.hash = "#orders/" + encodeURIComponent(orderRef);
          }
        });
        render();
        return { refresh: render, open: function (id) { var quote = quoteById(id); if (quote) details(quote); } };
      },
      onShow: function (api) { if (api) api.refresh(); }
    };

    /* PHASE 6: CUSTOMER MANAGEMENT */
    OJB.sections.customers = {
      init: function () {
        var view = document.querySelector("[data-view='customers']");
        var state = { q: "", filter: "all", sort: "name-asc", page: 1, size: 10 };
        var records = OJB.data.customers;
        function isNew(customer) { return dateValue(customer.lastOrderAt) >= dateOffset(-30).getTime(); }
        function isReturning(customer) { return customer.orders.length > 1; }
        function renderStats() {
          records.forEach(syncCustomerAssociations);
          document.getElementById("customerStatTotal").textContent = records.length;
          document.getElementById("customerStatNew").textContent = records.filter(isNew).length;
          document.getElementById("customerStatActive").textContent = records.filter(function (c) { return c.activeShipments.length > 0; }).length;
          document.getElementById("customerStatReturning").textContent = records.filter(isReturning).length;
        }
        function render() {
          renderStats();
          var query = state.q.toLowerCase().trim();
          var list = records.filter(function (customer) {
            if (state.filter === "new" && !isNew(customer)) return false;
            if (state.filter === "active" && !customer.activeShipments.length) return false;
            if (state.filter === "returning" && !isReturning(customer)) return false;
            return !query || [customer.name, customer.company, customer.email, customer.phone].join(" ").toLowerCase().indexOf(query) >= 0;
          });
          list.sort(function (a, b) {
            if (state.sort === "name-desc") return b.name.localeCompare(a.name);
            if (state.sort === "orders-desc") return b.orders.length - a.orders.length;
            if (state.sort === "activity-desc") return dateSort(a, b, "lastActivity", "desc");
            return a.name.localeCompare(b.name);
          });
          var rows = paging(list, state, "customerPagerInfo", "customerPagerBtns");
          document.getElementById("customerCount").textContent = list.length + " of " + records.length + " customers";
          document.getElementById("customerBody").innerHTML = rows.length ? rows.map(function (customer) {
            return "<tr><td><strong>" + OJB.esc(customer.name) + "</strong><span class='sub'>" + OJB.esc(customer.company) + "</span></td><td>" + OJB.esc(customer.email) + "</td><td>" + OJB.esc(customer.phone) + "</td><td>" + customer.orders.length + "</td><td>" + customer.activeShipments.length + "</td><td>" + displayDate(customer.lastActivity, false) + "</td><td><button type='button' class='a-btn a-btn--ghost a-btn--sm' data-customer-view='" + OJB.esc(customer.email) + "'>View profile</button></td></tr>";
          }).join("") : "<tr><td colspan='7'><div class='empty'><strong>No customers found</strong>Try a different search or clear the filters.</div></td></tr>";
        }
        function profile(customer) {
          syncCustomerAssociations(customer);
          var orderRows = customer.orders.slice().sort(function (a, b) { return dateSort(a, b, "submitted", "desc"); }).map(function (order) {
            return "<tr><td class='mono'>" + OJB.esc(order.ref) + "</td><td>" + OJB.esc(order.origin) + " → " + OJB.esc(order.destination) + "</td><td>" + OJB.esc(order.service) + "</td><td>" + pill(order.status) + "</td><td>" + displayDate(order.submitted, false) + "</td></tr>";
          }).join("");
          var shipRows = customer.shipments.map(function (shipment) {
            return "<tr><td class='mono'>" + OJB.esc(shipment.trackingNumber || "Not assigned") + "</td><td>" + OJB.esc(shipment.orderRef) + "</td><td>" + OJB.esc(shipment.origin) + " → " + OJB.esc(shipment.destination) + "</td><td>" + pill(shipment.status) + "</td></tr>";
          }).join("");
          var quoteRows = customer.quotations.map(function (quote) {
            return "<tr><td class='mono'>" + OJB.esc(quote.ref) + "</td><td>" + OJB.esc(quote.origin) + " → " + OJB.esc(quote.destination) + "</td><td>" + (quote.amount ? money(quote.amount, quote.currency) : "Not prepared") + "</td><td>" + pill(quoteStatus(quote)) + "</td></tr>";
          }).join("");
          var recent = customerActivity(customer).slice(0, 6).map(function (event) {
            return "<li>" + OJB.esc(event.text) + "<small>" + displayDate(event.at, true) + "</small></li>";
          }).join("");
          var html = "<div class='phase-detail-grid'>" +
            "<article class='phase-detail-card'><h3>Contact information</h3><dl class='phase-dl'><dt>Name</dt><dd>" + OJB.esc(customer.name) + "</dd><dt>Company</dt><dd>" + OJB.esc(customer.company) + "</dd><dt>Email</dt><dd><a href='mailto:" + OJB.esc(customer.email) + "'>" + OJB.esc(customer.email) + "</a></dd><dt>Phone</dt><dd>" + OJB.esc(customer.phone) + "</dd><dt>First order</dt><dd>" + displayDate(customer.firstSeen, false) + "</dd></dl></article>" +
            "<article class='phase-detail-card'><h3>Recent activity</h3><ul class='phase-list'>" + (recent || "<li>No recent activity.</li>") + "</ul><p class='phase-muted'>Last activity: " + displayDate(customer.lastActivity, true) + "</p></article>" +
            "<article class='phase-detail-card phase-detail-card--wide'><h3>Associated orders (" + customer.orders.length + ")</h3><div class='table-wrap'><table class='table phase-table'><thead><tr><th>Reference</th><th>Route</th><th>Service</th><th>Status</th><th>Submitted</th></tr></thead><tbody>" + (orderRows || "<tr><td colspan='5'>No associated orders.</td></tr>") + "</tbody></table></div></article>" +
            "<article class='phase-detail-card phase-detail-card--wide'><h3>Shipment history (" + customer.shipments.length + ")</h3><div class='table-wrap'><table class='table phase-table'><thead><tr><th>Tracking</th><th>Order</th><th>Route</th><th>Status</th></tr></thead><tbody>" + (shipRows || "<tr><td colspan='4'>No associated shipments.</td></tr>") + "</tbody></table></div></article>" +
            "<article class='phase-detail-card phase-detail-card--wide'><h3>Quotation requests (" + customer.quotations.length + ")</h3><div class='table-wrap'><table class='table phase-table'><thead><tr><th>Reference</th><th>Route</th><th>Amount</th><th>Status</th></tr></thead><tbody>" + (quoteRows || "<tr><td colspan='4'>No associated quotations.</td></tr>") + "</tbody></table></div></article>" +
            "<article class='phase-detail-card phase-detail-card--wide'><h3>Administrative notes</h3><label class='phase-label' for='customerAdminNote'>Internal notes (not visible to customer)</label><textarea class='a-textarea' id='customerAdminNote' maxlength='1000'>" + OJB.esc(customer.adminNotes || "") + "</textarea></article></div>";
          OJB.openPhaseDialog(customer.name, "Customer profile · " + customer.orders.length + " orders · session preview", html,
            "<button type='button' class='a-btn a-btn--ghost' data-phase-close>Close</button><button type='button' class='a-btn a-btn--gold' data-customer-save-note='" + OJB.esc(customer.email) + "'>Save internal note</button>");
        }
        function openEmail(email) {
          var customer = customerFor(decodeURIComponent(email || ""));
          if (customer) profile(customer);
        }
        view.addEventListener("input", function (event) {
          if (event.target.id === "customerSearch") { state.q = event.target.value; state.page = 1; render(); }
        });
        view.addEventListener("change", function (event) {
          if (event.target.id === "customerFilter") { state.filter = event.target.value; state.page = 1; render(); }
          if (event.target.id === "customerSort") { state.sort = event.target.value; state.page = 1; render(); }
          if (event.target.id === "customerPageSize") { state.size = Number(event.target.value); state.page = 1; render(); }
        });
        view.addEventListener("click", function (event) {
          var button = event.target.closest("button");
          if (!button) return;
          if (button.id === "customerReset") {
            state.q = ""; state.filter = "all"; state.sort = "name-asc"; state.page = 1;
            document.getElementById("customerSearch").value = "";
            document.getElementById("customerFilter").value = "all";
            document.getElementById("customerSort").value = "name-asc";
            render();
          }
          if (button.hasAttribute("data-customer-view")) openEmail(button.getAttribute("data-customer-view"));
          if (button.hasAttribute("data-phase-page")) { state.page = Number(button.getAttribute("data-phase-page")); render(); }
        });
        document.addEventListener("click", function (event) {
          var button = event.target.closest("[data-customer-save-note]");
          if (!button) return;
          var customer = customerFor(button.getAttribute("data-customer-save-note"));
          if (!customer) return;
          customer.adminNotes = document.getElementById("customerAdminNote").value.trim();
          noteCustomerActivity(customer.email, "Administrative customer note updated");
          OJB.closePhaseDialog(); OJB.toast("Customer note updated. Preview only, not saved.");
        });
        render();
        return { refresh: render, open: openEmail };
      },
      onShow: function (api, param) {
        if (!api) return;
        api.refresh();
        if (param) api.open(param);
      }
    };

    /* PHASE 6: ENQUIRIES */
    OJB.sections.enquiries = {
      init: function () {
        var view = document.querySelector("[data-view='enquiries']");
        var records = OJB.data.enquiries;
        var statuses = ["New", "In Progress", "Resolved", "Closed"];
        var state = { q: "", status: "all", sort: "date-desc", page: 1, size: 10 };
        var filter = document.getElementById("enquiryStatusFilter");
        filter.innerHTML += statuses.map(function (s) { return "<option>" + s + "</option>"; }).join("");
        function enquiryCustomer(item) { return customerFor(item.customerEmail); }
        function renderStats() {
          document.getElementById("enquiryStatTotal").textContent = records.length;
          document.getElementById("enquiryStatNew").textContent = records.filter(function (r) { return r.status === "New"; }).length;
          document.getElementById("enquiryStatProgress").textContent = records.filter(function (r) { return r.status === "In Progress"; }).length;
          document.getElementById("enquiryStatResolved").textContent = records.filter(function (r) { return r.status === "Resolved"; }).length;
          var badge = document.querySelector("[data-nav='enquiries'] .sidebar__count");
          if (badge) {
            var openCount = records.filter(function (r) { return r.status === "New"; }).length;
            badge.textContent = openCount;
            badge.hidden = openCount === 0;
          }
        }
        function render() {
          renderStats();
          var query = state.q.toLowerCase().trim();
          var list = records.filter(function (item) {
            var customer = enquiryCustomer(item) || {};
            if (state.status !== "all" && item.status !== state.status) return false;
            return !query || [item.id, item.subject, item.message, customer.name, item.customerEmail].join(" ").toLowerCase().indexOf(query) >= 0;
          });
          list.sort(function (a, b) {
            if (state.sort === "name-asc") return ((enquiryCustomer(a) || {}).name || "").localeCompare(((enquiryCustomer(b) || {}).name || ""));
            if (state.sort === "status-asc") return statuses.indexOf(a.status) - statuses.indexOf(b.status);
            return dateSort(a, b, "submittedAt", state.sort === "date-asc" ? "asc" : "desc");
          });
          var rows = paging(list, state, "enquiryPagerInfo", "enquiryPagerBtns");
          document.getElementById("enquiryCount").textContent = list.length + " of " + records.length + " enquiries";
          document.getElementById("enquiryBody").innerHTML = rows.length ? rows.map(function (item) {
            var customer = enquiryCustomer(item) || { name: "Unmatched contact", email: item.customerEmail };
            return "<tr><td><strong>" + OJB.esc(customer.name) + "</strong><span class='sub'>" + OJB.esc(item.id) + "</span></td><td>" + OJB.esc(item.customerEmail) + "</td><td>" + OJB.esc(item.subject) + "</td><td>" + displayDate(item.submittedAt, false) + "</td><td>" + pill(item.status) + "</td><td><button type='button' class='a-btn a-btn--ghost a-btn--sm' data-enquiry-view='" + OJB.esc(item.id) + "'>Open enquiry</button></td></tr>";
          }).join("") : "<tr><td colspan='6'><div class='empty'><strong>No enquiries found</strong>Try a different search or clear the filters.</div></td></tr>";
        }
        function byId(id) { return records.filter(function (item) { return item.id === id; })[0] || null; }
        function open(item) {
          if (!item) return;
          var customer = enquiryCustomer(item) || { name: "Unmatched contact", email: item.customerEmail, phone: "Not provided" };
          var notes = item.notes.map(function (note) { return "<li><strong>" + OJB.esc(note.by) + "</strong><p>" + OJB.esc(note.text) + "</p><small>" + displayDate(note.at, true) + "</small></li>"; }).join("");
          var body = "<div class='phase-detail-grid'>" +
            "<article class='phase-detail-card'><h3>Enquiry</h3><dl class='phase-dl'><dt>Reference</dt><dd>" + OJB.esc(item.id) + "</dd><dt>Subject</dt><dd>" + OJB.esc(item.subject) + "</dd><dt>Submitted</dt><dd>" + displayDate(item.submittedAt, true) + "</dd><dt>Current status</dt><dd>" + pill(item.status) + "</dd></dl><div class='phase-message'>" + OJB.esc(item.message) + "</div></article>" +
            "<article class='phase-detail-card'><h3>Customer</h3><dl class='phase-dl'><dt>Name</dt><dd>" + OJB.esc(customer.name) + "</dd><dt>Email</dt><dd><a href='mailto:" + OJB.esc(item.customerEmail) + "'>" + OJB.esc(item.customerEmail) + "</a></dd><dt>Phone</dt><dd>" + OJB.esc(customer.phone || "Not provided") + "</dd></dl><button type='button' class='a-btn a-btn--ghost a-btn--sm' data-enquiry-customer='" + OJB.esc(item.customerEmail) + "'>View related customer</button></article>" +
            "<article class='phase-detail-card phase-detail-card--wide'><h3>Internal notes</h3><ul class='phase-list'>" + (notes || "<li>No internal notes yet.</li>") + "</ul><form id='enquiryNoteForm' class='phase-inline-form'><label class='phase-label' for='enquiryNewNote'>Add an internal note</label><textarea class='a-textarea' id='enquiryNewNote' name='note' maxlength='1000' required placeholder='Record follow-up context for the team'></textarea><button type='submit' class='a-btn a-btn--gold a-btn--sm'>Add note</button></form></article></div>";
          var footer = "<label class='phase-status-select'>Update status<select class='a-select' id='enquiryStatusEdit'>" + statuses.map(function (status) { return "<option " + (status === item.status ? "selected" : "") + ">" + status + "</option>"; }).join("") + "</select></label>" +
            "<button type='button' class='a-btn a-btn--ghost' data-phase-close>Close</button><button type='button' class='a-btn a-btn--gold' data-enquiry-save-status='" + OJB.esc(item.id) + "'>Save status</button>";
          OJB.openPhaseDialog(item.subject, "Enquiry " + item.id + " · " + item.status, body, footer);
          var form = document.getElementById("enquiryNoteForm");
          form.addEventListener("submit", function (event) {
            event.preventDefault();
            var note = document.getElementById("enquiryNewNote").value.trim();
            if (note.length < 2) return;
            var noteAt = new Date().toISOString();
            item.notes.push({ by: "Admin User", at: noteAt, text: note });
            item.lastActivity = noteAt;
            noteCustomerActivity(item.customerEmail, "Enquiry note added · " + item.id, noteAt);
            recordActivity("added an internal note to enquiry " + item.id + ".");
            open(item); OJB.toast("Internal note added. Preview only, not saved.");
          });
        }
        view.addEventListener("input", function (event) { if (event.target.id === "enquirySearch") { state.q = event.target.value; state.page = 1; render(); } });
        view.addEventListener("change", function (event) {
          if (event.target.id === "enquiryStatusFilter") { state.status = event.target.value; state.page = 1; render(); }
          if (event.target.id === "enquirySort") { state.sort = event.target.value; state.page = 1; render(); }
          if (event.target.id === "enquiryPageSize") { state.size = Number(event.target.value); state.page = 1; render(); }
        });
        view.addEventListener("click", function (event) {
          var button = event.target.closest("button");
          if (!button) return;
          if (button.id === "enquiryReset") { state.q = ""; state.status = "all"; state.sort = "date-desc"; state.page = 1; document.getElementById("enquirySearch").value = ""; filter.value = "all"; document.getElementById("enquirySort").value = "date-desc"; render(); }
          if (button.hasAttribute("data-enquiry-view")) open(byId(button.getAttribute("data-enquiry-view")));
          if (button.hasAttribute("data-phase-page")) { state.page = Number(button.getAttribute("data-phase-page")); render(); }
        });
        document.addEventListener("click", function (event) {
          var button = event.target.closest("[data-enquiry-save-status], [data-enquiry-customer]");
          if (!button) return;
          if (button.hasAttribute("data-enquiry-save-status")) {
            var item = byId(button.getAttribute("data-enquiry-save-status"));
            if (!item) return;
            item.status = document.getElementById("enquiryStatusEdit").value;
            item.statusUpdatedAt = new Date().toISOString();
            item.lastActivity = item.statusUpdatedAt;
            noteCustomerActivity(item.customerEmail, "Enquiry " + item.id + " moved to " + item.status, item.statusUpdatedAt);
            recordActivity("updated enquiry " + item.id + " to " + item.status + " (preview).");
            OJB.closePhaseDialog(); render(); OJB.toast("Enquiry status updated. Preview only.");
          } else {
            var email = button.getAttribute("data-enquiry-customer");
            OJB.closePhaseDialog(); location.hash = "#customers/" + encodeURIComponent(email);
          }
        });
        render();
        return { refresh: render };
      },
      onShow: function (api) { if (api) api.refresh(); }
    };

    /* PHASE 7: STAFF MANAGEMENT */
    OJB.sections.staff = {
      init: function () {
        var view = document.querySelector("[data-view='staff']");
        var records = OJB.data.staff;
        var state = { q: "", role: "all", status: "all", sort: "name-asc", page: 1, size: 10 };
        function renderStats() {
          document.getElementById("staffStatTotal").textContent = records.length;
          document.getElementById("staffStatActive").textContent = records.filter(function (person) { return person.status === "Active"; }).length;
          document.getElementById("staffStatInactive").textContent = records.filter(function (person) { return person.status === "Inactive"; }).length;
          document.getElementById("staffStatFrontDesk").textContent = records.filter(function (person) { return person.role === "Front Desk"; }).length;
        }
        function render() {
          renderStats();
          var query = state.q.toLowerCase().trim();
          var list = records.filter(function (person) {
            if (state.role !== "all" && person.role !== state.role) return false;
            if (state.status !== "all" && person.status !== state.status) return false;
            return !query || [person.name, person.email].join(" ").toLowerCase().indexOf(query) >= 0;
          });
          list.sort(function (a, b) {
            if (state.sort === "name-desc") return b.name.localeCompare(a.name);
            if (state.sort === "date-desc") return dateSort(a, b, "dateAdded", "desc");
            if (state.sort === "activity-desc") return dateSort(a, b, "lastActivity", "desc");
            return a.name.localeCompare(b.name);
          });
          var rows = paging(list, state, "staffPagerInfo", "staffPagerBtns");
          document.getElementById("staffCount").textContent = list.length + " of " + records.length + " staff";
          document.getElementById("staffBody").innerHTML = rows.length ? rows.map(function (person) {
            return "<tr><td><strong>" + OJB.esc(person.name) + "</strong></td><td>" + OJB.esc(person.email) + "</td><td>" + OJB.esc(person.role) + "</td><td>" + pill(person.status) + "</td><td>" + displayDate(person.dateAdded, false) + "</td><td>" + displayDate(person.lastActivity, false) + "</td><td><div class='row-actions'><button type='button' class='a-btn a-btn--ghost a-btn--sm' data-staff-view='" + OJB.esc(person.id) + "'>View</button><button type='button' class='a-btn a-btn--ghost a-btn--sm' data-staff-edit='" + OJB.esc(person.id) + "'>Edit</button><button type='button' class='a-btn a-btn--ghost a-btn--sm' data-staff-toggle='" + OJB.esc(person.id) + "'>" + (person.status === "Active" ? "Deactivate" : "Activate") + "</button></div></td></tr>";
          }).join("") : "<tr><td colspan='7'><div class='empty'><strong>No staff found</strong>Try another search or clear the filters.</div></td></tr>";
        }
        function byId(id) { return records.filter(function (person) { return person.id === id; })[0] || null; }
        function log(person, action) {
          var at = new Date().toISOString();
          person.lastActivity = at;
          person.activity.unshift({ action: action, at: at });
          person.activity = person.activity.slice(0, 30);
          recordActivity(OJB.esc(person.name) + " · " + action.toLowerCase() + ".");
        }
        function profile(person) {
          var history = person.activity.slice().sort(function (a, b) { return dateValue(b.at) - dateValue(a.at); }).map(function (entry) {
            return "<li><strong>" + OJB.esc(entry.action) + "</strong><small>" + displayDate(entry.at, true) + "</small></li>";
          }).join("");
          var html = "<div class='phase-detail-grid'>" +
            "<article class='phase-detail-card'><h3>Staff profile</h3><dl class='phase-dl'><dt>Name</dt><dd>" + OJB.esc(person.name) + "</dd><dt>Email</dt><dd>" + OJB.esc(person.email) + "</dd><dt>Assigned role</dt><dd>" + OJB.esc(person.role) + "</dd><dt>Account status</dt><dd>" + pill(person.status) + "</dd><dt>Date added</dt><dd>" + displayDate(person.dateAdded, false) + "</dd><dt>Last activity</dt><dd>" + displayDate(person.lastActivity, true) + "</dd></dl></article>" +
            "<article class='phase-detail-card'><h3>Role scope (planned)</h3><p>" + (person.role === "Administrator" ? "Administrators are planned to manage operations, quotations, customers, staff, reports and settings after backend authorization is implemented." : "Front Desk personnel are planned to create orders, view relevant orders and confirm customer details after backend authorization is implemented.") + "</p><p class='phase-muted'>This interface does not enforce access permissions.</p></article>" +
            "<article class='phase-detail-card phase-detail-card--wide'><h3>Recent staff activity (" + person.activity.length + ")</h3><ul class='phase-list'>" + (history || "<li>No activity recorded.</li>") + "</ul></article></div>";
          OJB.openPhaseDialog(person.name, "Staff profile · demonstration data", html,
            "<button type='button' class='a-btn a-btn--ghost' data-phase-close>Close</button><button type='button' class='a-btn a-btn--gold' data-staff-edit='" + OJB.esc(person.id) + "'>Edit information</button>");
        }
        function editForm(person) {
          var isNew = !person;
          var html = "<form id='staffEditForm' class='phase-form' novalidate><div class='phase-form-grid'>" +
            "<label>Full name<input class='a-input' name='name' maxlength='100' required value='" + OJB.esc(person ? person.name : "") + "'></label>" +
            "<label>Email address<input class='a-input' name='email' type='email' maxlength='160' required value='" + OJB.esc(person ? person.email : "") + "'></label>" +
            "<label>Assigned role<select class='a-select' name='role'><option " + (!person || person.role === "Administrator" ? "selected" : "") + ">Administrator</option><option " + (person && person.role === "Front Desk" ? "selected" : "") + ">Front Desk</option></select></label>" +
            "<label>Account status<select class='a-select' name='status'><option " + (!person || person.status === "Active" ? "selected" : "") + ">Active</option><option " + (person && person.status === "Inactive" ? "selected" : "") + ">Inactive</option></select></label></div>" +
            "<p class='phase-muted'>Demo only. This does not create a login, send an invitation, or enforce the selected role.</p></form>";
          OJB.openPhaseDialog(isNew ? "Add staff member" : "Edit staff information", "Staff changes are temporary and not connected to authentication.", html,
            "<button type='button' class='a-btn a-btn--ghost' data-phase-close>Cancel</button><button type='button' class='a-btn a-btn--gold' data-staff-save='" + OJB.esc(person ? person.id : "") + "'>" + (isNew ? "Add staff preview" : "Save changes") + "</button>");
        }
        function saveForm(id) {
          var form = document.getElementById("staffEditForm");
          if (!form.reportValidity()) return;
          var fields = form.elements;
          var name = fields.name.value.trim();
          var email = fields.email.value.trim().toLowerCase();
          var duplicate = records.some(function (person) { return person.email.toLowerCase() === email && person.id !== id; });
          if (duplicate) { fields.email.setCustomValidity("A staff preview with this email already exists."); fields.email.reportValidity(); fields.email.setCustomValidity(""); return; }
          var person = id ? byId(id) : null;
          if (!person) {
            person = { id: "staff-" + Date.now(), dateAdded: new Date().toISOString(), activity: [], lastActivity: new Date().toISOString() };
            records.unshift(person);
          }
          var changed = person.name !== name || person.email !== email || person.role !== fields.role.value || person.status !== fields.status.value;
          person.name = name; person.email = email; person.role = fields.role.value; person.status = fields.status.value;
          log(person, id ? "Staff information or role updated" : "Staff member added to demo");
          OJB.closePhaseDialog(); render(); OJB.toast(changed ? "Staff record updated. Preview only." : "Staff record saved. Preview only.");
        }
        view.addEventListener("input", function (event) { if (event.target.id === "staffSearch") { state.q = event.target.value; state.page = 1; render(); } });
        view.addEventListener("change", function (event) {
          if (event.target.id === "staffRoleFilter") { state.role = event.target.value; state.page = 1; render(); }
          if (event.target.id === "staffStatusFilter") { state.status = event.target.value; state.page = 1; render(); }
          if (event.target.id === "staffSort") { state.sort = event.target.value; state.page = 1; render(); }
          if (event.target.id === "staffPageSize") { state.size = Number(event.target.value); state.page = 1; render(); }
        });
        view.addEventListener("click", function (event) {
          var button = event.target.closest("button");
          if (!button) return;
          if (button.id === "staffReset") {
            state.q = ""; state.role = "all"; state.status = "all"; state.sort = "name-asc"; state.page = 1;
            document.getElementById("staffSearch").value = "";
            document.getElementById("staffRoleFilter").value = "all";
            document.getElementById("staffStatusFilter").value = "all";
            document.getElementById("staffSort").value = "name-asc";
            render();
          }
          if (button.hasAttribute("data-staff-create")) editForm(null);
          if (button.hasAttribute("data-staff-view")) { var person = byId(button.getAttribute("data-staff-view")); if (person) profile(person); }
          if (button.hasAttribute("data-staff-edit")) { var editable = byId(button.getAttribute("data-staff-edit")); if (editable) editForm(editable); }
          if (button.hasAttribute("data-staff-toggle")) {
            var toggled = byId(button.getAttribute("data-staff-toggle"));
            if (toggled) {
              toggled.status = toggled.status === "Active" ? "Inactive" : "Active";
              log(toggled, "Account " + toggled.status.toLowerCase());
              render(); OJB.toast("Account status changed. Preview only, not saved.");
            }
          }
          if (button.hasAttribute("data-phase-page")) { state.page = Number(button.getAttribute("data-phase-page")); render(); }
        });
        document.addEventListener("click", function (event) {
          var button = event.target.closest("[data-staff-save], [data-staff-edit]");
          if (!button) return;
          if (button.hasAttribute("data-staff-save")) { saveForm(button.getAttribute("data-staff-save") || ""); return; }
          if (button.hasAttribute("data-staff-edit")) {
            var person = byId(button.getAttribute("data-staff-edit"));
            if (person) editForm(person);
          }
        });
        render();
        return { refresh: render };
      },
      onShow: function (api) { if (api) api.refresh(); }
    };
  })();

  /* =========================================================
     10. ROUTER
     #dashboard, #orders, #orders/<order-ref>, #shipments, #tracking ...
     Each section initialises once (on first visit) so event
     listeners are never bound twice.
     ========================================================= */
  var views = {};
  document.querySelectorAll(".view[data-view]").forEach(function (v) { views[v.getAttribute("data-view")] = v; });
  var apis = {};
  var current = null;

  function parseHash() {
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    var parts = h.split("/");
    var name = parts[0];
    // Legacy deep link support: #OJB-ORD-10480 opens that order
    if (name && !views[name] && /^OJB-/i.test(name)) return { name: "orders", param: name };
    return { name: views[name] ? name : "dashboard", param: parts.slice(1).join("/") };
  }

  function show() {
    var r = parseHash();
    if (r.name !== current) {
      Object.keys(views).forEach(function (k) { views[k].hidden = k !== r.name; });
      document.querySelectorAll(".sidebar__link[data-nav]").forEach(function (a) {
        var on = a.getAttribute("data-nav") === r.name;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
      document.title = views[r.name].getAttribute("data-title") + " | Ojaybest Admin Portal";
      window.scrollTo(0, 0);
      current = r.name;
    }
    var sec = OJB.sections[r.name];
    if (sec && !(r.name in apis)) apis[r.name] = sec.init ? sec.init() : null;
    if (sec && sec.onShow) sec.onShow(apis[r.name], r.param);
    OJB.closeMobileNav();
  }

  // Elements that jump to a section without being links (e.g. the bell icon)
  document.addEventListener("click", function (e) {
    var g = e.target.closest("[data-go]");
    if (g) { e.preventDefault(); location.hash = g.getAttribute("data-go"); }
  });

  window.addEventListener("hashchange", show);
  OJB.loadData().then(show);
})();

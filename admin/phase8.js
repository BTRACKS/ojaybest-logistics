/* =========================================================
   Ojaybest Logistics Admin Portal: Phase 8
   Reports, notifications, activity logs and session settings.
   Uses the shared demonstration records in OJB.data. No
   backend, authentication or permanent storage is connected.
   ========================================================= */
(function () {
  "use strict";

  var OJB = window.OJB;
  if (!OJB || !OJB.data || !OJB.sections) return;
  var esc = OJB.esc;
  var DAY = 24 * 60 * 60 * 1000;
  var extraActivities = [];
  var sectionApis = {};

  var preferences = {
    dateFormat: "DD MMM YYYY, HH:mm",
    timeZone: "Africa/Lagos",
    pageSize: 10,
    compact: false,
    reduceMotion: false,
    showRecentActivity: true,
    showNotificationPreview: true
  };
  var profile = { name: "Admin User", email: "", phone: "", role: "Administrator", photoData: "" };
  var business = {
    name: "Ojaybest Logistics",
    email: "hello@ojaybestlogistics.com",
    supportEmail: "hello@ojaybestlogistics.com",
    phone: "+234 800 000 0000",
    address: "",
    website: "",
    logoData: ""
  };
  var notificationPreferences = {
    "New Orders": true,
    "Order Confirmations": true,
    "Shipment Updates": true,
    "Quotation Requests": true,
    "Customer Enquiries": true,
    "Staff Activities": true
  };
  var systemStatusDescriptions = {
    "Shipment Created": "A shipment record has been created from an approved order.",
    "Package Received": "The package has been received at an operations point.",
    "In Transit": "The shipment is moving between facilities or destinations.",
    "Customs Clearance": "The shipment is in customs processing.",
    "Out for Delivery": "The shipment is with the delivery team for final delivery.",
    "Delivered": "The shipment has been marked as delivered.",
    "On Hold": "A shipment is paused while an operational issue is reviewed.",
    "Delivery Attempt Failed": "A delivery attempt was not completed."
  };

  function localDayStart(date) {
    var d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function dateInputValue(date) {
    var d = new Date(date);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dateNumber(value) {
    var n = new Date(value).getTime();
    return isFinite(n) ? n : 0;
  }
  function formatDate(value, withTime) {
    if (!value || !dateNumber(value)) return "Not recorded";
    var d = new Date(value);
    try {
      if (preferences.dateFormat === "YYYY-MM-DD HH:mm") {
        var parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: preferences.timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }).format(d);
        return parts + (withTime ? " " + new Intl.DateTimeFormat("en-GB", {
          timeZone: preferences.timeZone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }).format(d) : "");
      }
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: preferences.timeZone,
        day: "2-digit",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {})
      }).format(d);
    } catch (e) {
      return d.toLocaleString();
    }
  }
  function relativeTime(value) {
    var age = Date.now() - dateNumber(value);
    if (!age || age < 0) return "Just now";
    var minutes = Math.floor(age / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return minutes + (minutes === 1 ? " minute ago" : " minutes ago");
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
    var days = Math.floor(hours / 24);
    if (days < 7) return days + (days === 1 ? " day ago" : " days ago");
    return formatDate(value, false);
  }
  function makeRange(mode, fromValue, toValue) {
    var now = new Date();
    var start;
    var end = new Date(now);
    end.setHours(23, 59, 59, 999);
    if (mode === "today") start = localDayStart(now);
    else if (mode === "7d") {
      start = localDayStart(now);
      start.setDate(start.getDate() - 6);
    } else if (mode === "30d") {
      start = localDayStart(now);
      start.setDate(start.getDate() - 29);
    } else if (mode === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (mode === "custom") {
      start = fromValue ? new Date(fromValue + "T00:00:00") : localDayStart(now);
      end = toValue ? new Date(toValue + "T23:59:59.999") : new Date(now);
    } else {
      start = new Date(0);
    }
    return { start: start, end: end, mode: mode };
  }
  function inRange(value, range) {
    var n = dateNumber(value);
    return n > 0 && n >= range.start.getTime() && n <= range.end.getTime();
  }
  function controlRange(prefix, state) {
    return "<div class='phase8-range'>" +
      "<label><span class='a-sr'>" + esc(prefix + " date range") + "</span><select class='a-select' id='" + prefix + "Range'>" +
      "<option value='today' " + (state.mode === "today" ? "selected" : "") + ">Today</option>" +
      "<option value='7d' " + (state.mode === "7d" ? "selected" : "") + ">Last 7 days</option>" +
      "<option value='30d' " + (state.mode === "30d" ? "selected" : "") + ">Last 30 days</option>" +
      "<option value='month' " + (state.mode === "month" ? "selected" : "") + ">This month</option>" +
      "<option value='custom' " + (state.mode === "custom" ? "selected" : "") + ">Custom range</option></select></label>" +
      "<div class='phase8-custom-range' id='" + prefix + "Custom' " + (state.mode === "custom" ? "" : "hidden") + ">" +
      "<label><span class='a-sr'>Start date</span><input class='a-input' id='" + prefix + "From' type='date' value='" + esc(state.from || "") + "' aria-label='Start date'></label>" +
      "<span aria-hidden='true'>to</span>" +
      "<label><span class='a-sr'>End date</span><input class='a-input' id='" + prefix + "To' type='date' value='" + esc(state.to || "") + "' aria-label='End date'></label></div></div>";
  }
  function dateState(mode) {
    var today = dateInputValue(new Date());
    return { mode: mode || "30d", from: today, to: today, page: 1 };
  }
  function readRangeControls(prefix, state) {
    var select = document.getElementById(prefix + "Range");
    if (!select) return;
    state.mode = select.value;
    var custom = document.getElementById(prefix + "Custom");
    if (custom) custom.hidden = state.mode !== "custom";
    if (state.mode === "custom") {
      state.from = (document.getElementById(prefix + "From") || {}).value || "";
      state.to = (document.getElementById(prefix + "To") || {}).value || "";
    }
    state.page = 1;
  }
  function onDateControl(event, prefix, state, render) {
    if (event.target.id === prefix + "Range" || event.target.id === prefix + "From" || event.target.id === prefix + "To") {
      readRangeControls(prefix, state);
      render();
    }
  }
  function escCsv(value) {
    var text = String(value == null ? "" : value);
    if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function downloadCsv(filename, headers, rows) {
    var content = [headers].concat(rows).map(function (row) {
      return row.map(escCsv).join(",");
    }).join("\r\n");
    var blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function newNotification(id, icon, category, title, description, timestamp, target) {
    var n = {
      id: id,
      icon: icon,
      category: category,
      title: title,
      description: description,
      timestamp: timestamp || new Date().toISOString(),
      time: relativeTime(timestamp),
      target: target || "dashboard",
      unread: true,
      dismissed: false
    };
    n.text = "<strong>" + esc(title) + "</strong> " + esc(description);
    return n;
  }
  function createNotifications() {
    var data = OJB.data;
    var list = [];
    (data.orders || []).forEach(function (order) {
      if (order.status === "pending") {
        list.push(newNotification("new-order-" + order.ref, "file", "New Orders",
          "New customer order received", order.ref + " · " + (order.sender && order.sender.name || "Customer"), order.submitted,
          "orders/" + order.ref));
        list.push(newNotification("order-confirm-" + order.ref, "alert", "Order Confirmations",
          "Front Desk confirmation needed", order.ref + " is awaiting customer detail confirmation.", order.submitted,
          "orders/" + order.ref));
      } else if (order.frontDesk === "awaiting") {
        list.push(newNotification("order-confirm-" + order.ref, "alert", "Order Confirmations",
          "Front Desk confirmation needed", order.ref + " is awaiting customer detail confirmation.", order.submitted,
          "orders/" + order.ref));
      } else if (order.status === "review") {
        list.push(newNotification("order-approval-" + order.ref, "alert", "Awaiting Approval",
          "Order awaiting administrator approval", order.ref + " is ready for administrator review.", order.submitted,
          "orders/" + order.ref));
      }
    });
    (data.quotations || []).forEach(function (quote) {
      if (quote.status === "Pending") {
        list.push(newNotification("quote-" + quote.id, "file", "Quotation Requests",
          "New quotation request", quote.ref + " · " + (quote.customerName || "Customer"), quote.requestedAt, "quotations"));
      }
    });
    (data.enquiries || []).forEach(function (enquiry) {
      if (enquiry.status === "New") {
        list.push(newNotification("enquiry-" + enquiry.id, "msg", "Customer Enquiries",
          "New customer enquiry", enquiry.id + " · " + enquiry.subject, enquiry.submittedAt, "enquiries/" + enquiry.id));
      }
    });
    (data.shipments || []).forEach(function (shipment) {
      var latest = (shipment.activity || []).slice().sort(function (a, b) { return dateNumber(b.at) - dateNumber(a.at); })[0];
      var attention = shipment.status === "On Hold" || shipment.status === "Delivery Attempt Failed";
      list.push(newNotification("shipment-" + shipment.trackingNumber, attention ? "alert" : "truck",
        attention ? "Deliveries Requiring Attention" : "Shipment Updates",
        attention ? "Delivery requires attention" : "Shipment status changed",
        shipment.trackingNumber + " · " + shipment.status,
        latest && latest.at || shipment.createdAt, "shipments/" + shipment.trackingNumber));
    });
    (data.staff || []).forEach(function (person) {
      var last = (person.activity || []).slice().sort(function (a, b) { return dateNumber(b.at) - dateNumber(a.at); })[0];
      if (last) list.push(newNotification("staff-" + person.id, "user", "Staff Activities",
        "Staff activity recorded", person.name + " · " + last.action, last.at || person.lastActivity, "staff"));
    });
    list.sort(function (a, b) { return dateNumber(b.timestamp) - dateNumber(a.timestamp); });
    if (!list.length) {
      list.push(newNotification("welcome-demo", "check", "System", "Notifications are ready",
        "Notifications will reflect activity in the current demonstration records.", new Date().toISOString(), "dashboard"));
    }
    return list;
  }
  var notifications = createNotifications();
  OJB.data.notifications = notifications;
  OJB.data.dashboard.notifications = notifications;

  function syncNotificationBadges() {
    notifications.forEach(function (n) { n.time = relativeTime(n.timestamp); });
    var unread = notifications.filter(function (n) { return n.unread && !n.dismissed && OJB.shouldShowNotification(n); }).length;
    var badge = document.getElementById("notificationsBadge");
    if (badge) {
      badge.textContent = unread > 99 ? "99+" : String(unread);
      badge.hidden = unread === 0;
    }
    var dot = document.getElementById("notificationBellDot");
    if (dot) dot.hidden = unread === 0;
    var feed = document.getElementById("notifFeed");
    if (feed) {
      var visible = notifications.filter(function (n) { return !n.dismissed && OJB.shouldShowNotification(n); }).slice(0, 5);
      feed.innerHTML = visible.map(function (n) {
        return "<li class='" + (n.unread ? "is-unread" : "") + "'><span class='feed__icon'><span aria-hidden='true'>" +
          esc(n.category.slice(0, 2).toUpperCase()) + "</span></span><div><p>" + n.text + "</p><time>" +
          esc(relativeTime(n.timestamp)) + "</time></div>" + (n.unread ? "<span class='notif-dot' aria-label='Unread'></span>" : "") + "</li>";
      }).join("") || "<li class='phase8-feed-empty'>No notifications to show.</li>";
    }
  }
  OJB.shouldShowNotification = function (item) {
    var category = item && item.category;
    if (category === "Order Confirmations") return notificationPreferences["Order Confirmations"];
    if (category === "Awaiting Approval") return notificationPreferences["New Orders"];
    if (category === "Shipment Updates" || category === "Deliveries Requiring Attention") return notificationPreferences["Shipment Updates"];
    if (category === "Quotation Requests") return notificationPreferences["Quotation Requests"];
    if (category === "Customer Enquiries") return notificationPreferences["Customer Enquiries"];
    if (category === "Staff Activities") return notificationPreferences["Staff Activities"];
    return true;
  };
  function addActivity(message, moduleName, reference, detail) {
    var actionText = String(message || "Updated settings");
    var lower = actionText.toLowerCase();
    if (!moduleName) {
      if (lower.indexOf("quotation") >= 0) moduleName = "Quotations";
      else if (lower.indexOf("enquiry") >= 0) moduleName = "Enquiries";
      else if (lower.indexOf("staff") >= 0) moduleName = "Staff";
      else if (lower.indexOf("order") >= 0) moduleName = "Orders";
      else if (lower.indexOf("shipment") >= 0 || lower.indexOf("tracking") >= 0) moduleName = "Shipments";
      else moduleName = "Settings";
    }
    if (!reference) reference = (actionText.match(/OJB(?:TR|QT|OR)?1?[A-Z0-9-]{3,}/i) || [])[0] || "—";
    var item = {
      id: "phase8-" + Date.now() + "-" + (extraActivities.length + 1),
      timestamp: new Date().toISOString(),
      actor: profile.name || "Admin User",
      action: actionText,
      module: moduleName || "Settings",
      reference: reference || "—",
      description: detail || actionText,
      kind: classifyAction(message)
    };
    extraActivities.unshift(item);
    if (sectionApis.activity) sectionApis.activity.refresh();
    return item;
  }
  OJB.recordActivity = addActivity;
  syncNotificationBadges();

  function classifyAction(action) {
    var text = String(action || "").toLowerCase();
    if (/note|comment/.test(text)) return "Note";
    if (/created|submitted|added/.test(text)) return "Created";
    if (/status|marked|approved|cancelled|delivered|changed/.test(text)) return "Status change";
    if (/updated|edited|saved|settings|profile|preference/.test(text)) return "Updated";
    return "Other";
  }
  function activityRecords() {
    var rows = [];
    function add(id, timestamp, actor, action, moduleName, reference, description) {
      rows.push({
        id: id,
        timestamp: timestamp,
        actor: actor || "Sample system",
        action: action || "Activity recorded",
        module: moduleName || "System",
        reference: reference || "—",
        description: description || action || "Demonstration record",
        kind: classifyAction(action)
      });
    }
    (OJB.data.orders || []).forEach(function (order) {
      (order.history || []).forEach(function (event, index) {
        add("order-" + order.ref + "-" + index, event.at, event.by, event.text, "Orders", order.ref, event.text);
      });
    });
    (OJB.data.shipments || []).forEach(function (shipment) {
      (shipment.activity || []).forEach(function (event, index) {
        add("shipment-" + shipment.trackingNumber + "-" + index, event.at, event.by,
          event.text || ("Shipment status updated to " + (event.status || shipment.status)),
          "Shipments", shipment.trackingNumber,
          [event.text || event.description || "", event.location ? "Location: " + event.location : ""].filter(Boolean).join(" · "));
      });
    });
    (OJB.data.quotations || []).forEach(function (quote) {
      add("quote-request-" + quote.id, quote.requestedAt, "Customer",
        "Quotation request submitted", "Quotations", quote.ref,
        "Request from " + quote.customerName + " · Current status: " + quote.status);
      if (quote.lastUpdatedAt) add("quote-update-" + quote.id, quote.lastUpdatedAt, profile.name,
        "Quotation status or pricing updated", "Quotations", quote.ref, "Current status: " + quote.status);
    });
    (OJB.data.enquiries || []).forEach(function (enquiry) {
      add("enquiry-" + enquiry.id, enquiry.submittedAt, "Customer",
        "Enquiry submitted", "Enquiries", enquiry.id, enquiry.subject);
      (enquiry.notes || []).forEach(function (note, index) {
        add("enquiry-note-" + enquiry.id + "-" + index, note.at, note.by,
          "Internal note added", "Enquiries", enquiry.id, note.text);
      });
    });
    (OJB.data.staff || []).forEach(function (person) {
      (person.activity || []).forEach(function (event, index) {
        add("staff-" + person.id + "-" + index, event.at, person.name,
          event.action, "Staff", person.id, person.name + " · " + event.action);
      });
    });
    extraActivities.forEach(function (event) { rows.push(event); });
    return rows.filter(function (row) { return dateNumber(row.timestamp) > 0; })
      .sort(function (a, b) { return dateNumber(b.timestamp) - dateNumber(a.timestamp); });
  }

  function monthlyCounts(records, field, range) {
    var start = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    var end = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
    var months = [];
    var cursor = new Date(start);
    while (cursor <= end && months.length < 18) {
      months.push({ date: new Date(cursor), value: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    records.forEach(function (record) {
      var n = dateNumber(record[field]);
      if (!n || n < range.start.getTime() || n > range.end.getTime()) return;
      var date = new Date(n);
      var slot = months.filter(function (m) {
        return m.date.getFullYear() === date.getFullYear() && m.date.getMonth() === date.getMonth();
      })[0];
      if (slot) slot.value++;
    });
    return months;
  }
  function monthLabel(date) {
    return new Intl.DateTimeFormat("en", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
  }
  function monthChart(items, label) {
    if (!items.length || !items.some(function (item) { return item.value > 0; })) {
      return "<div class='phase8-empty-chart'>No " + esc(label.toLowerCase()) + " records in this date range.</div>";
    }
    var max = Math.max.apply(Math, items.map(function (item) { return item.value; }).concat([1]));
    return "<div class='phase8-month-chart' role='img' aria-label='" + esc(label) + "'>" + items.map(function (item) {
      var height = Math.max(item.value ? 5 : 0, Math.round(item.value / max * 100));
      return "<div class='phase8-month-col' title='" + esc(monthLabel(item.date) + ": " + item.value) + "'><strong>" + item.value + "</strong><div class='phase8-month-track'><span style='height:" + height + "%'></span></div><small>" + esc(monthLabel(item.date)) + "</small></div>";
    }).join("") + "</div>";
  }
  function horizontalChart(items, label) {
    var max = Math.max.apply(Math, items.map(function (item) { return item.value; }).concat([1]));
    var nonzero = items.some(function (item) { return item.value > 0; });
    if (!items.length || !nonzero) return "<div class='phase8-empty-chart'>No " + esc(label.toLowerCase()) + " records in this date range.</div>";
    return "<div class='phase8-bars' role='img' aria-label='" + esc(label) + "'>" + items.map(function (item) {
      var width = item.value ? Math.max(3, Math.round(item.value / max * 100)) : 0;
      return "<div class='phase8-bar-row'><div class='phase8-bar-label'><span>" + esc(item.label) + "</span><strong>" + item.value + "</strong></div><div class='phase8-bar-track'><span style='width:" + width + "%'></span></div></div>";
    }).join("") + "</div>";
  }
  function panel(title, content, note) {
    return "<section class='panel a-glass phase8-chart-panel'><div class='panel__head'><h2>" + esc(title) + "</h2></div>" + content +
      (note ? "<p class='phase8-chart-note'>" + esc(note) + "</p>" : "") + "</section>";
  }
  function getFilteredRecords(range) {
    var data = OJB.data;
    var orders = (data.orders || []).filter(function (record) { return inRange(record.submitted, range); });
    var shipments = (data.shipments || []).filter(function (record) { return inRange(record.createdAt, range); });
    var quotes = (data.quotations || []).filter(function (record) { return inRange(record.requestedAt, range); });
    var enquiries = (data.enquiries || []).filter(function (record) { return inRange(record.submittedAt, range); });
    var orderRefs = {};
    orders.forEach(function (order) { orderRefs[order.ref] = order; });
    var customers = (data.customers || []).filter(function (customer) {
      return orders.some(function (order) { return order.sender.email === customer.email; }) ||
        shipments.some(function (shipment) {
          var order = orderRefs[shipment.orderRef] ||
            (data.orders || []).filter(function (candidate) { return candidate.ref === shipment.orderRef; })[0];
          return order && order.sender.email === customer.email;
        });
    });
    return { orders: orders, shipments: shipments, quotations: quotes, enquiries: enquiries, customers: customers };
  }
  function renderReports(state) {
    var mount = document.getElementById("reportsMount");
    if (!mount) return;
    var range = makeRange(state.mode, state.from, state.to);
    var records = getFilteredRecords(range);
    var shipments = records.shipments;
    var delivered = shipments.filter(function (s) { return s.status === "Delivered"; });
    var attention = shipments.filter(function (s) { return s.status === "On Hold" || s.status === "Delivery Attempt Failed"; });
    var pending = shipments.filter(function (s) {
      return s.status !== "Delivered" && s.status !== "On Hold" && s.status !== "Delivery Attempt Failed";
    });
    var accepted = records.quotations.filter(function (q) { return q.status === "Accepted"; }).length;
    var activeEmails = {};
    shipments.filter(function (s) { return s.status !== "Delivered"; }).forEach(function (shipment) {
      var order = (OJB.data.orders || []).filter(function (o) { return o.ref === shipment.orderRef; })[0];
      if (order && order.sender.email) activeEmails[order.sender.email] = true;
    });
    var orderVolumes = monthlyCounts(records.orders, "submitted", range);
    var shipmentVolumes = monthlyCounts(shipments, "createdAt", range);
    var statuses = {};
    shipments.forEach(function (s) { statuses[s.status] = (statuses[s.status] || 0) + 1; });
    var statusItems = Object.keys(statuses).sort().map(function (key) { return { label: key, value: statuses[key] }; });
    var today = localDayStart(new Date()).getTime();
    var deliveryItems = [
      { label: "Delivered", value: delivered.length },
      { label: "Open, due date passed", value: shipments.filter(function (s) {
        return s.status !== "Delivered" && s.expectedDelivery && dateNumber(s.expectedDelivery) < today;
      }).length },
      { label: "Open, due date ahead", value: shipments.filter(function (s) {
        return s.status !== "Delivered" && s.expectedDelivery && dateNumber(s.expectedDelivery) >= today;
      }).length },
      { label: "No expected date", value: shipments.filter(function (s) { return s.status !== "Delivered" && !s.expectedDelivery; }).length }
    ];
    var serviceCounts = {};
    shipments.forEach(function (s) { serviceCounts[s.service || "Not specified"] = (serviceCounts[s.service || "Not specified"] || 0) + 1; });
    var serviceItems = Object.keys(serviceCounts).sort().map(function (key) { return { label: key, value: serviceCounts[key] }; });
    var rate = records.quotations.length ? Math.round(accepted / records.quotations.length * 100) : 0;
    var rangeLabel = state.mode === "custom" ? (state.from || "Start") + " to " + (state.to || "End") :
      ({ today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", month: "This month" }[state.mode] || "Selected period");
    var cards = [
      ["Total Orders", records.orders.length],
      ["Total Shipments", shipments.length],
      ["Delivered Shipments", delivered.length],
      ["Pending Deliveries", pending.length],
      ["Delayed / On-Hold", attention.length],
      ["Total Quotations", records.quotations.length],
      ["Accepted Quotations", accepted],
      ["Active Customers", Object.keys(activeEmails).length]
    ];
    mount.innerHTML = "<div class='page-head'><div><h1>Reports &amp; Analytics</h1><p>Operational summaries calculated from the portal’s current demonstration records.</p></div><span class='a-demo-badge'>Demo data · " + esc(rangeLabel) + "</span></div>" +
      "<div class='phase8-demo-note' role='note'>These figures are not production statistics. They use only records currently loaded in this browser session.</div>" +
      "<div class='phase8-report-toolbar'>" + controlRange("report", state) +
      "<div class='phase8-export'><label><span class='a-sr'>Report type to export</span><select class='a-select' id='reportExportType'>" +
      "<option value='orders'>Orders</option><option value='shipments'>Shipments</option><option value='deliveries'>Deliveries</option><option value='quotations'>Quotations</option><option value='customers'>Customers</option><option value='staff'>Staff Activities</option></select></label>" +
      "<button class='a-btn a-btn--gold' type='button' id='reportExport'>Export CSV</button></div></div>" +
      "<section class='stats phase8-report-stats' aria-label='Report summary'>" + cards.map(function (card, i) {
        return "<article class='stat a-glass'><div class='stat__top'><span class='stat__icon " + (i % 2 ? "stat__icon--info" : "stat__icon--gold") + "'>" + String(i + 1).padStart(2, "0") + "</span></div><p class='stat__value'>" + Number(card[1]).toLocaleString() + "</p><p class='stat__label'>" + esc(card[0]) + "</p></article>";
      }).join("") + "</section>" +
      "<div class='phase8-chart-grid'>" +
      panel("Monthly Order Volume", monthChart(orderVolumes, "Monthly order volume")) +
      panel("Monthly Shipment Volume", monthChart(shipmentVolumes, "Monthly shipment volume")) +
      panel("Shipment Status Distribution", horizontalChart(statusItems, "Shipment status distribution")) +
      panel("Delivery Performance", horizontalChart(deliveryItems, "Delivery performance"), "Uses current status and expected delivery dates. Actual delivery timestamps are not available in this demo.") +
      panel("Quotation Acceptance Rate", "<div class='phase8-acceptance'><div><strong>" + rate + "%</strong><span>" + accepted + " accepted of " + records.quotations.length + " quotations</span></div><div class='phase8-progress' role='img' aria-label='" + rate + "% accepted'><span style='width:" + rate + "%'></span></div></div>") +
      panel("Shipping Service Distribution", horizontalChart(serviceItems, "Shipping service distribution")) +
      "</div>";
  }
  function exportReport(state) {
    var type = document.getElementById("reportExportType").value;
    var range = makeRange(state.mode, state.from, state.to);
    var records = getFilteredRecords(range);
    var headers;
    var rows;
    if (type === "orders") {
      headers = ["Order Reference", "Submitted", "Status", "Customer", "Email", "Origin", "Destination", "Service"];
      rows = records.orders.map(function (r) { return [r.ref, formatDate(r.submitted, true), r.status, r.sender.name, r.sender.email, r.origin, r.destination, r.service]; });
    } else if (type === "shipments" || type === "deliveries") {
      var selected = type === "deliveries" ? records.shipments.filter(function (r) { return r.status === "Delivered"; }) : records.shipments;
      headers = ["Tracking Number", "Order Reference", "Created", "Expected Delivery", "Status", "Current Location", "Service"];
      rows = selected.map(function (r) { return [r.trackingNumber, r.orderRef, formatDate(r.createdAt, true), r.expectedDelivery, r.status, r.currentLocation, r.service]; });
    } else if (type === "quotations") {
      headers = ["Quotation Reference", "Requested", "Status", "Customer", "Email", "Origin", "Destination", "Service", "Amount", "Currency"];
      rows = records.quotations.map(function (r) { return [r.ref, formatDate(r.requestedAt, true), r.status, r.customerName, r.customerEmail, r.origin, r.destination, r.service, r.amount, r.currency]; });
    } else if (type === "customers") {
      headers = ["Customer", "Email", "Phone", "First Seen", "Orders", "Shipments", "Last Activity"];
      rows = records.customers.map(function (r) { return [r.name, r.email, r.phone, formatDate(r.firstSeen, false), r.orders.length, r.shipments.length, formatDate(r.lastActivity, true)]; });
    } else {
      headers = ["Date and Time", "Staff or Administrator", "Action", "Module", "Reference", "Description"];
      rows = activityRecords().filter(function (r) {
        return r.module === "Staff" && inRange(r.timestamp, range);
      }).map(function (r) { return [formatDate(r.timestamp, true), r.actor, r.action, r.module, r.reference, r.description]; });
    }
    downloadCsv("ojaybest-" + type + "-" + dateInputValue(new Date()) + ".csv", headers, rows);
    OJB.toast("CSV export prepared from the selected demo records.");
  }

  function initReports() {
    var state = dateState("30d");
    renderReports(state);
    var mount = document.getElementById("reportsMount");
    function render() { renderReports(state); }
    mount.addEventListener("change", function (event) {
      if (event.target.id === "reportExportType") return;
      onDateControl(event, "report", state, render);
    });
    mount.addEventListener("click", function (event) {
      if (event.target.closest("#reportExport")) exportReport(state);
    });
    sectionApis.reports = { refresh: render };
    return sectionApis.reports;
  }
  OJB.sections.reports = { init: initReports, onShow: function (api) { if (api) api.refresh(); } };

  function visibleNotifications(state) {
    var query = state.query.toLowerCase().trim();
    return notifications.filter(function (item) {
      if (item.dismissed) return false;
      if (state.category !== "all" && item.category !== state.category) return false;
      if (state.read === "unread" && !item.unread) return false;
      if (state.read === "read" && item.unread) return false;
      if (!OJB.shouldShowNotification(item)) return false;
      var haystack = [item.title, item.description, item.category].join(" ").toLowerCase();
      return !query || haystack.indexOf(query) >= 0;
    }).sort(function (a, b) { return dateNumber(b.timestamp) - dateNumber(a.timestamp); });
  }
  function renderNotifications(state) {
    var mount = document.getElementById("notificationsMount");
    if (!mount) return;
    syncNotificationBadges();
    var categories = Array.from(new Set(notifications.map(function (n) { return n.category; }))).sort();
    var list = visibleNotifications(state);
    mount.innerHTML = "<div class='page-head'><div><h1>Notifications</h1><p>Alerts generated from shared demonstration orders, shipments, enquiries, quotations and staff records.</p></div><span class='a-demo-badge'>Session preview</span></div>" +
      "<div class='phase8-demo-note' role='note'>Read and dismissed states last for this browser session only.</div>" +
      "<section class='panel a-glass phase8-panel'><div class='phase8-notification-toolbar'>" +
      "<label class='toolbar__search'><span class='a-sr'>Search notifications</span><svg viewBox='0 0 24 24'><circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/></svg><input id='notificationSearch' type='search' value='" + esc(state.query) + "' placeholder='Search notifications…' maxlength='120'></label>" +
      "<label><span class='a-sr'>Filter notification category</span><select class='a-select' id='notificationCategory'><option value='all'>All categories</option>" + categories.map(function (c) { return "<option value='" + esc(c) + "' " + (state.category === c ? "selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></label>" +
      "<label><span class='a-sr'>Filter read state</span><select class='a-select' id='notificationReadFilter'><option value='all' " + (state.read === "all" ? "selected" : "") + ">All notifications</option><option value='unread' " + (state.read === "unread" ? "selected" : "") + ">Unread</option><option value='read' " + (state.read === "read" ? "selected" : "") + ">Read</option></select></label>" +
      "<span class='toolbar__count'>" + list.length + " shown · " + notifications.filter(function (n) { return n.unread && !n.dismissed; }).length + " unread</span></div>" +
      "<div class='phase8-bulk-actions'><button class='a-btn a-btn--ghost a-btn--sm' type='button' data-notifications-read-all>Mark all as read</button><span>Click a notification to open its related section.</span></div>" +
      "<div class='phase8-notification-list'>" + (list.length ? list.map(function (item) {
        var icon = item.category.indexOf("Shipment") >= 0 || item.category.indexOf("Deliver") >= 0 ? "↗" :
          item.category.indexOf("Quotation") >= 0 ? "Q" : item.category.indexOf("Enquir") >= 0 ? "?" :
          item.category.indexOf("Staff") >= 0 ? "ST" : "!";
        return "<article class='phase8-notification " + (item.unread ? "is-unread" : "") + "'>" +
          "<span class='phase8-notification-icon' aria-hidden='true'>" + icon + "</span>" +
          "<button class='phase8-notification-main' type='button' data-notification-open='" + esc(item.id) + "'>" +
          "<span class='phase8-notification-title'>" + esc(item.title) + (item.unread ? "<span class='phase8-unread-tag'>Unread</span>" : "") + "</span>" +
          "<span class='phase8-notification-desc'>" + esc(item.description) + "</span>" +
          "<span class='phase8-notification-meta'>" + esc(item.category) + " · " + esc(formatDate(item.timestamp, true)) + "</span></button>" +
          "<div class='phase8-notification-actions'>" +
          (item.unread ? "<button class='a-btn a-btn--ghost a-btn--sm' type='button' data-notification-read='" + esc(item.id) + "'>Mark read</button>" : "") +
          "<button class='a-btn a-btn--ghost a-btn--sm phase8-dismiss' type='button' data-notification-dismiss='" + esc(item.id) + "' aria-label='Dismiss " + esc(item.title) + "'>Dismiss</button></div></article>";
      }).join("") : "<div class='empty'><strong>No notifications found</strong>Try another category or search term.</div>") + "</div></section>";
  }
  function initNotifications() {
    var state = { query: "", category: "all", read: "all" };
    var mount = document.getElementById("notificationsMount");
    function render() { renderNotifications(state); }
    mount.addEventListener("input", function (event) {
      if (event.target.id === "notificationSearch") { state.query = event.target.value; render(); var input = document.getElementById("notificationSearch"); input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    });
    mount.addEventListener("change", function (event) {
      if (event.target.id === "notificationCategory") state.category = event.target.value;
      if (event.target.id === "notificationReadFilter") state.read = event.target.value;
      render();
    });
    mount.addEventListener("click", function (event) {
      var readAll = event.target.closest("[data-notifications-read-all]");
      if (readAll) {
        notifications.forEach(function (n) { n.unread = false; });
        syncNotificationBadges(); render(); OJB.toast("All notifications marked as read for this session.");
        return;
      }
      var read = event.target.closest("[data-notification-read]");
      if (read) {
        var readItem = notifications.filter(function (n) { return n.id === read.getAttribute("data-notification-read"); })[0];
        if (readItem) readItem.unread = false;
        syncNotificationBadges(); render(); return;
      }
      var dismiss = event.target.closest("[data-notification-dismiss]");
      if (dismiss) {
        var dismissed = notifications.filter(function (n) { return n.id === dismiss.getAttribute("data-notification-dismiss"); })[0];
        if (dismissed) dismissed.dismissed = true;
        syncNotificationBadges(); render(); OJB.toast("Notification dismissed for this session.");
        return;
      }
      var open = event.target.closest("[data-notification-open]");
      if (open) {
        var item = notifications.filter(function (n) { return n.id === open.getAttribute("data-notification-open"); })[0];
        if (!item) return;
        item.unread = false;
        syncNotificationBadges();
        location.hash = "#" + item.target;
      }
    });
    render();
    sectionApis.notifications = { refresh: render };
    return sectionApis.notifications;
  }
  OJB.sections.notifications = { init: initNotifications, onShow: function (api) { if (api) api.refresh(); } };

  function activityActionMatch(record, filter) {
    if (filter === "all") return true;
    return record.kind === filter;
  }
  function renderActivity(state) {
    var mount = document.getElementById("activityMount");
    if (!mount) return;
    var range = makeRange(state.mode, state.from, state.to);
    var query = state.query.toLowerCase().trim();
    var list = activityRecords().filter(function (record) {
      if (!inRange(record.timestamp, range) || !activityActionMatch(record, state.action)) return false;
      if (state.module !== "all" && record.module !== state.module) return false;
      return !query || [record.actor, record.action, record.module, record.reference, record.description].join(" ").toLowerCase().indexOf(query) >= 0;
    });
    list.sort(function (a, b) { return (dateNumber(a.timestamp) - dateNumber(b.timestamp)) * (state.sort === "oldest" ? 1 : -1); });
    var pageSize = Number(preferences.pageSize) || 10;
    var pages = Math.max(1, Math.ceil(list.length / pageSize));
    state.page = Math.max(1, Math.min(state.page, pages));
    var start = list.length ? (state.page - 1) * pageSize : 0;
    var pageItems = list.slice(start, start + pageSize);
    var modules = Array.from(new Set(activityRecords().map(function (r) { return r.module; }))).sort();
    mount.innerHTML = "<div class='page-head'><div><h1>Activity Logs</h1><p>Chronological demonstration of actions in the shared portal data. Logs are read-only here.</p></div><span class='a-demo-badge'>Sample audit data</span></div>" +
      "<div class='phase8-demo-note' role='note'>Tamper-resistant audit logging requires a backend and is not enabled. Session actions appear alongside the current sample records.</div>" +
      "<section class='panel a-glass phase8-panel'><div class='phase8-activity-toolbar'>" + controlRange("activity", state) +
      "<label class='toolbar__search'><span class='a-sr'>Search activity logs</span><svg viewBox='0 0 24 24'><circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/></svg><input id='activitySearch' type='search' value='" + esc(state.query) + "' placeholder='Search user, action, reference…' maxlength='120'></label>" +
      "<label><span class='a-sr'>Filter activity type</span><select class='a-select' id='activityActionFilter'>" +
      ["all", "Created", "Updated", "Status change", "Note", "Other"].map(function (v) { return "<option value='" + esc(v) + "' " + (state.action === v ? "selected" : "") + ">" + (v === "all" ? "All actions" : esc(v)) + "</option>"; }).join("") +
      "</select></label><label><span class='a-sr'>Filter activity module</span><select class='a-select' id='activityModuleFilter'><option value='all'>All modules</option>" +
      modules.map(function (v) { return "<option value='" + esc(v) + "' " + (state.module === v ? "selected" : "") + ">" + esc(v) + "</option>"; }).join("") + "</select></label>" +
      "<label><span class='a-sr'>Sort activity logs</span><select class='a-select' id='activitySort'><option value='newest' " + (state.sort === "newest" ? "selected" : "") + ">Newest first</option><option value='oldest' " + (state.sort === "oldest" ? "selected" : "") + ">Oldest first</option></select></label></div>" +
      "<div class='table-wrap'><table class='table phase-table phase8-activity-table'><thead><tr><th>Date and Time</th><th>Staff or Administrator</th><th>Action</th><th>Module</th><th>Reference</th><th>Activity Description</th><th>Details</th></tr></thead><tbody>" +
      (pageItems.length ? pageItems.map(function (record) {
        return "<tr><td>" + esc(formatDate(record.timestamp, true)) + "</td><td>" + esc(record.actor) + "</td><td><span class='phase8-action-tag'>" + esc(record.kind) + "</span><span class='sub'>" + esc(record.action) + "</span></td><td>" + esc(record.module) + "</td><td class='mono'>" + esc(record.reference) + "</td><td>" + esc(record.description) + "</td><td><button class='a-btn a-btn--ghost a-btn--sm' type='button' data-activity-view='" + esc(record.id) + "'>View</button></td></tr>";
      }).join("") : "<tr><td colspan='7'><div class='empty'><strong>No activity found</strong>Try another date range or filter.</div></td></tr>") +
      "</tbody></table></div><div class='pager phase8-pager'><span>" + (list.length ? "Showing " + (start + 1) + "–" + Math.min(start + pageSize, list.length) + " of " + list.length : "No records") + "</span><div class='pager__btns'>" +
      "<button class='pager__btn' type='button' data-activity-page='" + Math.max(1, state.page - 1) + "' " + (state.page <= 1 ? "disabled" : "") + " aria-label='Previous page'>‹</button>" +
      Array.from({ length: pages }, function (_, index) { var p = index + 1; return "<button class='pager__btn " + (p === state.page ? "is-active" : "") + "' type='button' data-activity-page='" + p + "'>" + p + "</button>"; }).join("") +
      "<button class='pager__btn' type='button' data-activity-page='" + Math.min(pages, state.page + 1) + "' " + (state.page >= pages ? "disabled" : "") + " aria-label='Next page'>›</button></div>" +
      "<label class='pager__size'>Rows <select class='a-select' id='activityPageSize'>" + [10, 20, 50].map(function (v) { return "<option value='" + v + "' " + (Number(preferences.pageSize) === v ? "selected" : "") + ">" + v + "</option>"; }).join("") + "</select></label></div></section>";
  }
  function activityDetails(id) {
    var record = activityRecords().filter(function (r) { return r.id === id; })[0];
    if (!record) return;
    var body = "<div class='phase-detail-grid'><article class='phase-detail-card phase-detail-card--wide'><h3>Read-only activity record</h3><dl class='phase-dl'>" +
      "<dt>Responsible user</dt><dd>" + esc(record.actor) + "</dd><dt>Action</dt><dd>" + esc(record.action) + "</dd>" +
      "<dt>Module</dt><dd>" + esc(record.module) + "</dd><dt>Associated reference</dt><dd>" + esc(record.reference) + "</dd>" +
      "<dt>Timestamp</dt><dd>" + esc(formatDate(record.timestamp, true)) + "</dd><dt>Activity details</dt><dd>" + esc(record.description) + "</dd></dl></article></div>";
    OJB.openPhaseDialog("Activity record", "Read-only sample log · no editing or deletion controls", body,
      "<button type='button' class='a-btn a-btn--ghost' data-phase-close>Close</button>");
  }
  function initActivity() {
    var state = { mode: "30d", from: dateInputValue(new Date()), to: dateInputValue(new Date()), query: "", action: "all", module: "all", sort: "newest", page: 1 };
    var mount = document.getElementById("activityMount");
    function render() { renderActivity(state); }
    mount.addEventListener("input", function (event) {
      if (event.target.id === "activitySearch") { state.query = event.target.value; state.page = 1; render(); var input = document.getElementById("activitySearch"); input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    });
    mount.addEventListener("change", function (event) {
      if (event.target.id === "activityActionFilter") state.action = event.target.value;
      if (event.target.id === "activityModuleFilter") state.module = event.target.value;
      if (event.target.id === "activitySort") state.sort = event.target.value;
      if (event.target.id === "activityPageSize") { preferences.pageSize = Number(event.target.value); state.page = 1; }
      if (event.target.id === "activityRange" || event.target.id === "activityFrom" || event.target.id === "activityTo") {
        onDateControl(event, "activity", state, render);
        return;
      }
      state.page = 1;
      render();
    });
    mount.addEventListener("click", function (event) {
      var page = event.target.closest("[data-activity-page]");
      if (page) { state.page = Number(page.getAttribute("data-activity-page")); render(); return; }
      var detail = event.target.closest("[data-activity-view]");
      if (detail) activityDetails(detail.getAttribute("data-activity-view"));
    });
    render();
    sectionApis.activity = { refresh: render };
    return sectionApis.activity;
  }
  OJB.sections.activity = { init: initActivity, onShow: function (api) { if (api) api.refresh(); } };

  var settingsTab = "profile";
  function tabButton(id, label) {
    return "<button class='phase8-tab " + (settingsTab === id ? "is-active" : "") + "' type='button' role='tab' aria-selected='" + (settingsTab === id) + "' data-setting-tab='" + id + "'>" + label + "</button>";
  }
  function field(label, name, value, type, placeholder) {
    return "<label>" + esc(label) + "<input class='a-input' name='" + esc(name) + "' type='" + (type || "text") + "' value='" + esc(value || "") + "' " +
      (placeholder ? "placeholder='" + esc(placeholder) + "'" : "") + "></label>";
  }
  function preferenceCheckbox(name, label) {
    return "<label class='phase8-switch'><input type='checkbox' name='" + esc(name) + "' " + (notificationPreferences[label] ? "checked" : "") + "><span class='phase8-switch-track' aria-hidden='true'></span><span>" + esc(label) + "</span></label>";
  }
  function renderSettingsContent() {
    if (settingsTab === "profile") {
      return "<form class='phase8-settings-form' id='profileSettingsForm'><div class='phase8-settings-grid'>" +
        "<section class='phase-detail-card phase8-profile-card'><h3>Administrator profile</h3><div class='phase8-profile-preview'>" +
        (profile.photoData ? "<img src='" + esc(profile.photoData) + "' alt='Administrator profile preview'>" : "<span class='avatar'>" + esc(initials(profile.name)) + "</span>") +
        "<label class='a-btn a-btn--ghost a-btn--sm'>Choose profile picture<input type='file' id='profilePicture' accept='image/*' hidden></label><span class='phase-muted'>Image preview only. It is not uploaded.</span></div>" +
        "<div class='phase-form-grid'>" + field("Administrator name", "name", profile.name, "text", "Name") +
        field("Email address", "email", profile.email, "email", "Not set in this demo") +
        field("Phone number", "phone", profile.phone, "tel", "Not set in this demo") +
        "<label>Assigned role<input class='a-input' value='" + esc(profile.role) + "' readonly></label></div>" +
        "<div class='phase8-form-actions'><button class='a-btn a-btn--gold' type='submit'>Save profile</button><span>Changes remain in this browser session only.</span></div></section></div></form>";
    }
    if (settingsTab === "security") {
      return "<div class='phase8-settings-grid'><section class='phase-detail-card phase8-security-card'><h3>Account security</h3><p>Authentication is not connected. These actions are unavailable until a backend is implemented.</p>" +
        "<div class='phase8-security-list'><div><span><strong>Change password</strong><small>Requires a connected identity provider.</small></span><button class='a-btn a-btn--ghost a-btn--sm' type='button' disabled>Unavailable</button></div>" +
        "<div><span><strong>Password reset</strong><small>Password reset email delivery is not configured.</small></span><button class='a-btn a-btn--ghost a-btn--sm' type='button' disabled>Unavailable</button></div>" +
        "<div><span><strong>Session management</strong><small>There are no authenticated sessions to manage in this preview.</small></span><button class='a-btn a-btn--ghost a-btn--sm' type='button' disabled>Unavailable</button></div>" +
        "<div><span><strong>Two-factor authentication</strong><small>Requires backend authentication support.</small></span><button class='a-btn a-btn--ghost a-btn--sm' type='button' disabled>Unavailable</button></div></div>" +
        "<div class='phase8-demo-note'>No password or security action is simulated here.</div></section></div>";
    }
    if (settingsTab === "business") {
      return "<form class='phase8-settings-form' id='businessSettingsForm'><div class='phase8-settings-grid'><section class='phase-detail-card'><h3>Business information</h3>" +
        "<div class='phase8-logo-preview'><img src='" + esc(business.logoData || "../assets/ojaybest-logo.png") + "' alt='Ojaybest Logistics logo preview'><label class='a-btn a-btn--ghost a-btn--sm'>Choose business logo<input type='file' id='businessLogo' accept='image/*' hidden></label><span>Supplied logo asset · preview only</span></div>" +
        "<div class='phase-form-grid'>" + field("Company name", "name", business.name) +
        field("Business email", "email", business.email, "email") +
        field("Support email", "supportEmail", business.supportEmail, "email") +
        field("Contact phone number", "phone", business.phone, "tel") +
        field("Office address", "address", business.address, "text", "No public office address listed") +
        field("Company website", "website", business.website, "url", "No official URL listed") + "</div>" +
        "<div class='phase8-form-actions'><button class='a-btn a-btn--gold' type='submit'>Save business information</button><span>Values are editable in this demo but are not permanently saved.</span></div></section></div></form>";
    }
    if (settingsTab === "notifications") {
      return "<div class='phase8-settings-grid'><section class='phase-detail-card'><h3>Notification preferences</h3><p>Choose which categories are relevant in this session. No email or push notifications are sent.</p><div class='phase8-preference-list'>" +
        Object.keys(notificationPreferences).map(function (category) { return preferenceCheckbox("notify-" + category, category); }).join("") +
        "</div><p class='phase-muted'>These controls prepare the interface for future backend preferences.</p></section></div>";
    }
    if (settingsTab === "tracking") {
      var statuses = Object.keys(systemStatusDescriptions);
      return "<div class='phase8-settings-grid'><section class='phase-detail-card phase-detail-card--wide'><h3>Shipment and tracking configuration</h3><p>Reference formats are read-only to keep preview records consistent.</p>" +
        "<div class='phase8-reference-grid'><div><span>Order Reference</span><strong>OJBOR1XXXX</strong></div><div><span>Tracking Number</span><strong>OJBTR1XXXX</strong></div><div><span>Quotation Reference</span><strong>OJBQT1XXXX</strong></div></div>" +
        "<h3 class='phase8-subheading'>Supported shipment statuses</h3><div class='table-wrap'><table class='table phase-table phase8-status-table'><thead><tr><th>Status</th><th>Description</th></tr></thead><tbody>" +
        statuses.map(function (status) { return "<tr><td><strong>" + esc(status) + "</strong></td><td>" + esc(systemStatusDescriptions[status]) + "</td></tr>"; }).join("") +
        "</tbody></table></div><p class='phase-muted'>Reference formats and workflow transitions cannot be changed in the frontend preview.</p></section></div>";
    }
    return "<form class='phase8-settings-form' id='systemSettingsForm'><div class='phase8-settings-grid'><section class='phase-detail-card'><h3>System preferences</h3><p>Interface preferences apply in this browser session only.</p>" +
      "<div class='phase-form-grid'>" +
      "<label>Date and time format<select class='a-select' name='dateFormat'><option value='DD MMM YYYY, HH:mm' " + (preferences.dateFormat === "DD MMM YYYY, HH:mm" ? "selected" : "") + ">DD MMM YYYY, HH:mm</option><option value='YYYY-MM-DD HH:mm' " + (preferences.dateFormat === "YYYY-MM-DD HH:mm" ? "selected" : "") + ">YYYY-MM-DD HH:mm</option></select></label>" +
      "<label>Time zone<select class='a-select' name='timeZone'>" + ["Africa/Lagos", "UTC", "Europe/London", "America/New_York"].map(function (zone) { return "<option value='" + zone + "' " + (preferences.timeZone === zone ? "selected" : "") + ">" + zone.replace("_", " ") + "</option>"; }).join("") + "</select></label>" +
      "<label>Default table pagination<select class='a-select' name='pageSize'>" + [10, 20, 50].map(function (v) { return "<option value='" + v + "' " + (preferences.pageSize === v ? "selected" : "") + ">" + v + " rows</option>"; }).join("") + "</select></label>" +
      "</div><div class='phase8-preference-list'>" +
      "<label class='phase8-switch'><input type='checkbox' name='compact' " + (preferences.compact ? "checked" : "") + "><span class='phase8-switch-track' aria-hidden='true'></span><span>Compact interface spacing</span></label>" +
      "<label class='phase8-switch'><input type='checkbox' name='reduceMotion' " + (preferences.reduceMotion ? "checked" : "") + "><span class='phase8-switch-track' aria-hidden='true'></span><span>Reduce interface motion</span></label>" +
      "<label class='phase8-switch'><input type='checkbox' name='showRecentActivity' " + (preferences.showRecentActivity ? "checked" : "") + "><span class='phase8-switch-track' aria-hidden='true'></span><span>Show dashboard activity feed</span></label>" +
      "<label class='phase8-switch'><input type='checkbox' name='showNotificationPreview' " + (preferences.showNotificationPreview ? "checked" : "") + "><span class='phase8-switch-track' aria-hidden='true'></span><span>Show dashboard notification preview</span></label>" +
      "</div><div class='phase8-form-actions'><button class='a-btn a-btn--gold' type='submit'>Apply preferences</button><span>Not saved after refresh.</span></div></section></div></form>";
  }
  function initials(name) {
    return String(name || "Admin User").trim().split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("") || "AD";
  }
  function applyProfile() {
    var displayName = document.getElementById("adminDisplayName");
    var displayRole = document.getElementById("adminDisplayRole");
    var avatar = document.getElementById("adminAvatar");
    if (displayName) displayName.textContent = profile.name || "Admin User";
    if (displayRole) displayRole.textContent = profile.role + " · demo";
    if (avatar) {
      if (profile.photoData) avatar.innerHTML = "<img src='" + esc(profile.photoData) + "' alt=''>";
      else avatar.textContent = initials(profile.name);
    }
  }
  function applyPreferences() {
    document.body.classList.toggle("admin-compact", preferences.compact);
    document.body.classList.toggle("admin-reduce-motion", preferences.reduceMotion);
    var activityFeed = document.getElementById("activityFeed");
    var notificationFeed = document.getElementById("notifFeed");
    if (activityFeed && activityFeed.closest(".panel")) activityFeed.closest(".panel").hidden = !preferences.showRecentActivity;
    if (notificationFeed && notificationFeed.closest(".panel")) notificationFeed.closest(".panel").hidden = !preferences.showNotificationPreview;
    applyPagination();
    if (sectionApis.activity) sectionApis.activity.refresh();
    if (sectionApis.reports) sectionApis.reports.refresh();
    if (sectionApis.notifications) sectionApis.notifications.refresh();
  }
  function applyPagination(activeViewOnly) {
    var container = activeViewOnly ? document.querySelector(".view:not([hidden])") : document;
    if (!container) return;
    container.querySelectorAll(".pager__size select").forEach(function (select) {
      var requested = String(preferences.pageSize);
      if (!Array.from(select.options).some(function (option) { return option.value === requested; })) return;
      if (!activeViewOnly && select.value === requested) return;
      select.value = requested;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  function renderSettings() {
    var mount = document.getElementById("settingsMount");
    if (!mount) return;
    mount.innerHTML = "<div class='page-head'><div><h1>Settings</h1><p>Profile, company details and interface preferences for the admin portal.</p></div><span class='a-demo-badge'>Session preview</span></div>" +
      "<div class='phase8-demo-note' role='note'>This portal has no connected database or authentication service. Settings that require those services are clearly disabled.</div>" +
      "<div class='phase8-settings-layout'><nav class='phase8-tabs' role='tablist' aria-label='Settings categories'>" +
      tabButton("profile", "Profile") + tabButton("security", "Account Security") + tabButton("business", "Business Information") +
      tabButton("notifications", "Notification Preferences") + tabButton("tracking", "Shipment &amp; Tracking") + tabButton("system", "System Preferences") +
      "</nav><div class='phase8-tab-panel' role='tabpanel'>" + renderSettingsContent() + "</div></div>";
  }
  function readImage(file, callback) {
    if (!file) return;
    if (!/^image\//i.test(file.type || "")) { OJB.toast("Choose an image file."); return; }
    var reader = new FileReader();
    reader.onload = function () { callback(String(reader.result || "")); };
    reader.onerror = function () { OJB.toast("The image could not be previewed."); };
    reader.readAsDataURL(file);
  }
  function initSettings() {
    var mount = document.getElementById("settingsMount");
    function render() { renderSettings(); }
    mount.addEventListener("click", function (event) {
      var tab = event.target.closest("[data-setting-tab]");
      if (tab) { settingsTab = tab.getAttribute("data-setting-tab"); render(); }
    });
    mount.addEventListener("change", function (event) {
      if (event.target.id === "profilePicture") {
        readImage(event.target.files && event.target.files[0], function (data) { profile.photoData = data; render(); });
      }
      if (event.target.id === "businessLogo") {
        readImage(event.target.files && event.target.files[0], function (data) { business.logoData = data; render(); });
      }
      if (event.target.name && event.target.name.indexOf("notify-") === 0) {
        var category = event.target.name.slice(7);
        notificationPreferences[category] = event.target.checked;
        syncNotificationBadges();
        if (sectionApis.notifications) sectionApis.notifications.refresh();
        addActivity("Updated notification preference for " + category, "Settings", "Notification preferences");
        OJB.toast("Preference changed for this session.");
      }
    });
    mount.addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      if (form.id === "profileSettingsForm") {
        var values = new FormData(form);
        profile.name = String(values.get("name") || "").trim();
        profile.email = String(values.get("email") || "").trim();
        profile.phone = String(values.get("phone") || "").trim();
        if (!profile.name) { OJB.toast("Administrator name is required."); return; }
        applyProfile();
        addActivity("Updated administrator profile", "Settings", "Profile");
        OJB.toast("Profile updated for this session only.");
        render();
      } else if (form.id === "businessSettingsForm") {
        var fields = form.elements;
        business.name = fields.name.value.trim();
        business.email = fields.email.value.trim();
        business.supportEmail = fields.supportEmail.value.trim();
        business.phone = fields.phone.value.trim();
        business.address = fields.address.value.trim();
        business.website = fields.website.value.trim();
        addActivity("Updated business information", "Settings", "Business information");
        OJB.toast("Business information updated for this session only.");
        render();
      } else if (form.id === "systemSettingsForm") {
        var input = form.elements;
        preferences.dateFormat = input.dateFormat.value;
        preferences.timeZone = input.timeZone.value;
        preferences.pageSize = Number(input.pageSize.value) || 10;
        preferences.compact = input.compact.checked;
        preferences.reduceMotion = input.reduceMotion.checked;
        preferences.showRecentActivity = input.showRecentActivity.checked;
        preferences.showNotificationPreview = input.showNotificationPreview.checked;
        applyPreferences();
        addActivity("Updated system preferences", "Settings", "System preferences");
        OJB.toast("System preferences applied for this session.");
        render();
      }
    });
    render();
    applyProfile();
    applyPreferences();
    sectionApis.settings = { refresh: render };
    return sectionApis.settings;
  }
  OJB.sections.settings = { init: initSettings, onShow: function (api) { if (api) api.refresh(); } };

  document.addEventListener("click", function (event) {
    if (event.target.closest("#markRead")) syncNotificationBadges();
  });
  window.addEventListener("hashchange", function () {
    window.setTimeout(function () { applyPagination(true); }, 0);
  });
  applyProfile();
  applyPreferences();
  /* Register after script.js and ask its existing hash router to render the
     initially selected view even if its resolved data promise ran earlier. */
  window.dispatchEvent(new Event("hashchange"));
})();

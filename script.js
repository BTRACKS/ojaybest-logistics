/* =========================================================
   Ojaybest Logistics Home interactions
   ========================================================= */
(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Sticky glass navigation ---------- */
  const header = $("#siteHeader");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const toggle = $("#navToggle");
  const mobileMenu = $("#mobileMenu");
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    mobileMenu.hidden = !open;
    if (open) header.classList.add("is-scrolled");
    else onScroll();
  };
  toggle.addEventListener("click", () => setMenu(mobileMenu.hidden));
  $$(".mobile-menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  window.addEventListener("resize", () => { if (window.innerWidth > 1024) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Animated counters ---------- */
  const counters = $$("[data-count]");
  const animateCount = (el) => {
    const target = Number(el.dataset.count);
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString("en-NG");
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { animateCount(entry.target); co.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => co.observe(c));
  } else {
    counters.forEach((c) => (c.textContent = Number(c.dataset.count).toLocaleString("en-NG")));
  }

  /* ---------- Toast ---------- */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  };

  /* ---------- Shipment tracker (preview data) ---------- */
  const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Benin City", "Kaduna"];
  const STAGES = ["Order created", "Picked up", "At sorting hub", "In transit", "Out for delivery", "Delivered"];
  const TRACK_PREFIX = "OJBTR";           // fixed part, never typed by the user
  const SUFFIX_LENGTH = 5;                // users type only the last 5 characters
  const SUFFIX_PATTERN = /^[A-Z0-9]{5}$/;


  const normalise = (v) => v.trim().toUpperCase().replace(/\s+/g, "");

  // Keep whatever is typed in the suffix box to uppercase letters and digits, max 5 characters.
  const bindSuffixInput = (input) => {
    const clean = () => {
      const cleaned = normalise(input.value).replace(/[^A-Z0-9]/g, "").slice(0, SUFFIX_LENGTH);
      if (cleaned !== input.value) input.value = cleaned;
    };
    input.addEventListener("input", clean);
    input.addEventListener("blur", clean);
    // Pasting a full number, with or without the prefix, still fills only the suffix box.
    input.addEventListener("paste", (e) => {
      const text = (e.clipboardData || window.clipboardData).getData("text");
      if (text == null) return;
      e.preventDefault();
      let pasted = normalise(text);
      if (pasted.startsWith(TRACK_PREFIX)) pasted = pasted.slice(TRACK_PREFIX.length);
      input.value = pasted.replace(/[^A-Z0-9]/g, "").slice(0, SUFFIX_LENGTH);
    });
  };

  const hash = (str) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

  const fmtTime = (date) =>
    date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ", " +
    date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const checkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';

  const renderShipment = (code) => {
    const h = hash(code);
    const from = CITIES[h % CITIES.length];
    let to = CITIES[(h >>> 3) % CITIES.length];
    if (to === from) to = CITIES[(CITIES.indexOf(from) + 1) % CITIES.length];
    const current = 1 + (h % (STAGES.length - 1)); // 1..5
    const now = new Date();
    const eta = new Date(now.getTime() + (STAGES.length - 1 - current) * 8 * 3600 * 1000);

    const steps = STAGES.map((title, i) => {
      const finished = current === STAGES.length - 1;
      const done = i < current || (finished && i === current);
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
    }).join("");

    const delivered = current === STAGES.length - 1;
    $("#trackResult").innerHTML = `
      <div class="timeline__head">
        <div>
          <p class="timeline__code">${code}</p>
          <p class="timeline__route">${from} &rarr; ${to}</p>
        </div>
        <div class="timeline__eta">
          ${delivered ? "Delivered" : "Estimated delivery"}
          <strong>${delivered ? fmtTime(now) : eta.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</strong>
        </div>
      </div>
      <ol class="timeline">${steps}</ol>`;
  };

  const validate = (value, errorEl) => {
    const suffix = normalise(value).replace(/[^A-Z0-9]/g, "");
    if (!suffix) { errorEl.textContent = "Please enter the last 5 characters of your tracking number."; return null; }
    if (suffix.length !== SUFFIX_LENGTH || !SUFFIX_PATTERN.test(suffix)) {
      errorEl.textContent = "Enter exactly 5 letters or numbers, like 9K2M4.";
      return null;
    }
    errorEl.textContent = "";
    return TRACK_PREFIX + suffix;
  };


  const trackForm = $("#trackForm");
  const trackInput = $("#trackInput");
  const trackError = $("#trackError");
  const quickForm = $("#quickTrackForm");
  const quickInput = $("#quickTrackInput");
  const quickError = $("#quickTrackError");

  [trackInput, quickInput].forEach(bindSuffixInput);

  trackForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = validate(trackInput.value, trackError);
    if (code) renderShipment(code);
  });

  // Hero quick tracker scrolls to the main tracker and shows the result
  quickForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = validate(quickInput.value, quickError);
    if (!code) return;
    trackInput.value = code.slice(TRACK_PREFIX.length);
    trackError.textContent = "";
    renderShipment(code);
    $("#track").scrollIntoView({ behavior: "smooth", block: "center" });
  });


  /* ---------- Reviews slider ---------- */
  const reviewsTrack = $("#reviewsTrack");
  const scrollReviews = (dir) => {
    const card = $(".review", reviewsTrack);
    if (!card) return;
    const gap = parseFloat(getComputedStyle(reviewsTrack).columnGap) || 22;
    const amount = (card.offsetWidth + gap) * dir;
    const atEnd = reviewsTrack.scrollLeft + reviewsTrack.clientWidth >= reviewsTrack.scrollWidth - 4;
    const atStart = reviewsTrack.scrollLeft <= 4;
    if (dir > 0 && atEnd) reviewsTrack.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir < 0 && atStart) reviewsTrack.scrollTo({ left: reviewsTrack.scrollWidth, behavior: "smooth" });
    else reviewsTrack.scrollBy({ left: amount, behavior: "smooth" });
  };
  $("#nextReview").addEventListener("click", () => scrollReviews(1));
  $("#prevReview").addEventListener("click", () => scrollReviews(-1));

  let autoplay = setInterval(() => scrollReviews(1), 6000);
  reviewsTrack.addEventListener("mouseenter", () => clearInterval(autoplay));
  reviewsTrack.addEventListener("mouseleave", () => { clearInterval(autoplay); autoplay = setInterval(() => scrollReviews(1), 6000); });

  /* ---------- FAQ accordion ---------- */
  $$(".faq__item").forEach((item) => {
    const btn = $(".faq__q", item);
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      $$(".faq__item.is-open").forEach((other) => {
        other.classList.remove("is-open");
        $(".faq__q", other).setAttribute("aria-expanded", "false");
      });
      if (!isOpen) { item.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); }
    });
  });

  /* ---------- Newsletter ---------- */
  const newsletterForm = $("#newsletterForm");
  const newsletterEmail = $("#newsletterEmail");
  const newsletterMsg = $("#newsletterMsg");
  newsletterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = newsletterEmail.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newsletterMsg.textContent = "Please enter a valid email address.";
      return;
    }
    newsletterMsg.textContent = "";
    newsletterEmail.value = "";
    showToast("Thanks! You're subscribed to Ojaybest updates.");
  });

  /* ---------- Footer year ---------- */
  $("#year").textContent = new Date().getFullYear();
})();

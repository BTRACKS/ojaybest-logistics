/* ============================================================
   Track Order page: shipment tracking logic.
   Frontend-only preview: sample data is clearly marked as a
   demonstration until Supabase integration replaces lookup().
   ============================================================ */
(() => {
  'use strict';

  const form = document.getElementById('trackingForm');
  if (!form) return;

  const input = document.getElementById('trackingSuffix');
  const prefixEl = document.getElementById('trackingPrefix');
  const errorEl = document.getElementById('trackingError');
  const fieldEl = document.getElementById('trackingField');
  const resultsEl = document.getElementById('trackingResults');
  const demoBtn = document.getElementById('demoButton');
  const PREFIX = prefixEl.textContent;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- shared helpers ---------- */
  function clearResults() {
    resultsEl.hidden = true;
    resultsEl.innerHTML = '';
  }
  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
    fieldEl.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
  }
  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    fieldEl.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
  }
  function normalize(value) {
    // Keep up to the full tracking number (prefix + 4). The prefix is only
    // stripped once the complete "OJBTR1" has been typed or pasted, so the
    // input never truncates mid-prefix. Submit validation resolves the code.
    let v = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.startsWith(PREFIX)) v = v.slice(PREFIX.length);
    return v.slice(0, 10);
  }
  function showResults(html) {
    resultsEl.innerHTML = html;
    resultsEl.hidden = false;
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- input behaviour ---------- */
  input.addEventListener('input', () => {
    input.value = normalize(input.value);
    clearError();
  });

  /* ---------- states ---------- */
  function renderLoading(code) {
    showResults(`
      <div class="tracking-loading">
        <span class="tracking-spinner" aria-hidden="true"></span>
        <div>Searching for shipment <strong>${esc(PREFIX + code)}</strong>…
          <small>This should only take a moment.</small>
        </div>
      </div>`);
  }

  function renderNotFound(code) {
    showResults(`
      <div class="tracking-card tracking-empty">
        <span class="tracking-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8.5 11h5"/></svg>
        </span>
        <h3>Shipment not found</h3>
        <p>We couldn't find a shipment for tracking number <strong>${esc(PREFIX + code)}</strong>. Please check the characters and try again.</p>
        <ul class="tracking-empty-suggest">
          <li>Make sure you entered the last four characters exactly as they appear on your confirmation.</li>
          <li>Tracking numbers become active shortly after your shipment is registered.</li>
          <li>Still stuck? Our team can look it up for you. See the Contact Us link below.</li>
        </ul>
        <p class="result-note"><strong>Website preview:</strong> live shipment lookup is enabled after Supabase integration, so valid numbers cannot be retrieved yet.</p>
      </div>`);
  }

  function renderDemo() {
    const code = 'OJBTR19K2M';
    const events = [
      ['Package received', 'Shipment accepted at our Lagos facility.', '21 Oct 2026', 'done'],
      ['In transit', 'Shipment is on its way to the destination.', '23 Oct 2026', 'current'],
      ['Customs clearance', 'Awaiting clearance at destination.', 'Pending', 'future'],
      ['Out for delivery', 'Awaiting dispatch to the recipient.', 'Pending', 'future'],
      ['Delivered', 'Final delivery confirmation.', 'Pending', 'future'],
    ];
    const timeline = events.map(([name, desc, date, state]) => `
      <div class="result-event${state === 'future' ? ' future' : ''}${state === 'current' ? ' is-current' : ''}">
        <span class="result-dot" aria-hidden="true"></span>
        <div>
          <strong>${esc(name)}</strong><span class="result-state">${state === 'done' ? 'Completed' : state === 'current' ? 'In progress' : 'Pending'}</span>
          <p>${esc(desc)}</p>
          <small>${esc(date)}</small>
        </div>
      </div>`).join('');

    showResults(`
      <div class="tracking-card">
        <div class="result-header">
          <span class="result-tag">DEMONSTRATION DATA: NOT A REAL SHIPMENT</span>
          <span class="result-status">In Transit</span>
        </div>
        <p class="result-number"><small>Tracking number</small><strong>${esc(code)}</strong></p>
        <p class="result-sub">Air freight shipment from Lagos, Nigeria to London, United Kingdom.</p>
        <div class="result-grid">
          <div class="result-field"><small>Origin</small><strong>Lagos, Nigeria</strong></div>
          <div class="result-field"><small>Destination</small><strong>London, UK</strong></div>
          <div class="result-field"><small>Service</small><strong>Air Freight</strong></div>
          <div class="result-field"><small>Last updated</small><strong>23 Oct 2026</strong></div>
        </div>
        <div class="result-timeline"><h4>Shipment progress</h4>${timeline}</div>
        <p class="result-note"><strong>Preview only.</strong> This is sample information and does not correspond to a real shipment.</p>
      </div>`);
  }

  /* ---------- form submit: validate → loading → not found ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();
    clearResults();
    let value = input.value.trim().toUpperCase();
    if (value.startsWith(PREFIX)) value = value.slice(PREFIX.length);
    if (!/^[A-Z0-9]{4}$/.test(value)) {
      showError(value.length > 4
        ? 'Please paste the complete tracking number (starting with OJBTR1) or just its final four characters.'
        : 'Please enter the final four letters or numbers of your tracking number.');
      input.focus();
      return;
    }
    renderLoading(value);
    setTimeout(() => {
      renderNotFound(value);
    }, 900);
  });

  demoBtn.addEventListener('click', () => {
    clearError();
    renderDemo();
  });
})();

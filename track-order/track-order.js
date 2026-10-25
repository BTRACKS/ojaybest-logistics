/* ============================================================
   Track Order page: shipment tracking logic.
   Frontend-only preview: results are rendered by the shared
   renderer (assets/tracking-shared.js) so they look and behave
   exactly like the homepage tracker, and every result is
   clearly labelled as demonstration data until Supabase
   integration replaces the lookup.
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
  const shared = window.OjaybestTracking;
  const DEMO_CODE = 'OJBTR19K2M';
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

  /* Shared results: identical timeline design to the homepage tracker,
     wrapped in a clear demonstration notice (frontend-only preview). */
  function renderShipment(code) {
    const shipment = shared.shipmentFor(code);
    showResults(`
      <div class="tracking-demo-flag">
        <span class="result-tag">DEMONSTRATION DATA: NOT A REAL SHIPMENT</span>
      </div>
      <div class="track__result">${shared.timelineHTML(shipment)}</div>
      <p class="result-note tracking-result-note"><strong>Website preview.</strong> This is sample information generated for demonstration only and does not correspond to a real shipment. Live shipment lookup will be enabled after Supabase integration.</p>
    `);
  }

  /* ---------- form submit: validate → loading → shared results ---------- */
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
      renderShipment(PREFIX + value);
    }, 900);
  });

  demoBtn.addEventListener('click', () => {
    clearError();
    renderShipment(DEMO_CODE);
  });
})();

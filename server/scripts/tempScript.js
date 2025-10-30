// JavaScript
// ==UserScript==
// @name         ICEGATE Auto Fill BE Form
// @namespace    http://tampermonkey.net/
// @version      0.1
// @match        https://foservices.icegate.gov.in/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // read stored params (from localStorage) - change key if you prefer cookies
  const stored = localStorage.getItem('icegateBOE');
  if (!stored) return;
  let params;
  try { params = JSON.parse(stored); } catch { return; }

  const trySetValue = (el, value) => {
    if (!el || value == null) return false;
    el.focus && el.focus();
    el.value = value;
    // dispatch input/change events so React / Angular pick it up
    ['input', 'change'].forEach(type => el.dispatchEvent(new Event(type, { bubbles: true })));
    el.blur && el.blur();
    return true;
  };

  // flexible element finders: by id/name, placeholder, label, aria-label
  const find = {
    byIdOrName: (keys) => keys.map(k => document.querySelector(`#${k}`) || document.querySelector(`[name="${k}"]`)).find(Boolean),
    byPlaceholder: (texts) => texts.map(t => document.querySelector(`input[placeholder*="${t}"]`)).find(Boolean),
    byAria: (texts) => texts.map(t => document.querySelector(`[aria-label*="${t}"]`)).find(Boolean),
    byLabelText: (texts) => {
      for (const t of texts) {
        const label = Array.from(document.querySelectorAll('label')).find(l => l.textContent && l.textContent.includes(t));
        if (label) {
          const forId = label.getAttribute('for');
          if (forId) {
            const el = document.getElementById(forId);
            if (el) return el;
          }
          // label wrapping input?
          const input = label.querySelector('input, select, textarea');
          if (input) return input;
        }
      }
      return null;
    }
  };

  const fillOnce = () => {
    // heuristics — adapt keys/texts if you inspect site and see exact fields
    const beNoEl =
      find.byIdOrName(['boeNo', 'billOfEntryNo', 'beNo', 'be_number']) ||
      find.byPlaceholder(['Bill of Entry', 'B.E. No', 'Bill of Entry No']) ||
      find.byAria(['Bill of Entry', 'BE No']) ||
      find.byLabelText(['Bill of Entry', 'B.E. No', 'BE Number']);

    const beDateEl =
      find.byIdOrName(['boeDate', 'beDate', 'billDate', 'boe_dt']) ||
      find.byPlaceholder(['Date', 'Bill of Entry Date', 'B.E. Date']) ||
      find.byAria(['Date']) ||
      find.byLabelText(['Date', 'Bill of Entry Date']);

    const portEl =
      find.byIdOrName(['portCode', 'port', 'port_of_reporting']) ||
      find.byPlaceholder(['Port Code', 'Port']) ||
      find.byAria(['Port']) ||
      find.byLabelText(['Port', 'Port Code']);

    // Try to set them. Format date if needed.
    if (params.beNumber) trySetValue(beNoEl, params.beNumber);
    if (params.beDate) {
      // if date input expects 'YYYY-MM-DD' or dd/mm/yyyy — adapt if needed
      trySetValue(beDateEl, params.beDate);
    }
    if (params.portCode) trySetValue(portEl, params.portCode);

    // Optionally click any "Search" button if desired:
    const searchBtn = document.querySelector('button[type="submit"], button.search, button[title*="Search"], button:contains("Search")');
    if (searchBtn) {
      setTimeout(() => searchBtn.click(), 300);
    }
  };

  // wait for SPA to render inputs (poll)
  const maxWait = 10000;
  const interval = 300;
  let waited = 0;
  const timer = setInterval(() => {
    fillOnce();
    waited += interval;
    if (waited >= maxWait) clearInterval(timer);
  }, interval);

})();
/**
 * Golden Global Expo — Institutional Currency & Pricing Engine
 * Institutional precision standards: Zero-decimal handling for JPY/KRW/IDR/VND
 * Strict 2-decimal rounding for USD/EUR/GBP/AED trade proformas
 */

const zeroDecimalCurrencies = new Set(['JPY', 'KRW', 'VND', 'IDR']);

let currentCurrency = 'USD';

const exchangeRates = {
  // Global & Americas
  USD: { rate: 1.0, symbol: "$", code: "USD", name: "US Dollar", region: "major", format: "Approx. $%v / MT", decimals: 2 },
  CAD: { rate: 1.386, symbol: "C$", code: "CAD", name: "Canadian Dollar", region: "major", format: "Approx. C$%v / MT", decimals: 2 },
  EUR: { rate: 0.8625, symbol: "€", code: "EUR", name: "Euro", region: "major", format: "Approx. €%v / MT", decimals: 2 },
  GBP: { rate: 0.7395, symbol: "£", code: "GBP", name: "British Pound", region: "major", format: "Approx. £%v / MT", decimals: 2 },
  
  // Oceania
  AUD: { rate: 1.398, symbol: "A$", code: "AUD", name: "Australian Dollar", region: "oceania", format: "Approx. A$%v / MT", decimals: 2 },
  NZD: { rate: 1.721, symbol: "NZ$", code: "NZD", name: "New Zealand Dollar", region: "oceania", format: "Approx. NZ$%v / MT", decimals: 2 },

  // ASEAN & Asia
  SGD: { rate: 1.267, symbol: "S$", code: "SGD", name: "Singapore Dollar", region: "asean", format: "Approx. S$%v / MT", decimals: 2 },
  MYR: { rate: 4.07, symbol: "RM", code: "MYR", name: "Malaysian Ringgit", region: "asean", format: "Approx. RM%v / MT", decimals: 2 },
  THB: { rate: 31.85, symbol: "฿", code: "THB", name: "Thai Baht", region: "asean", format: "Approx. ฿%v / MT", decimals: 2 },
  IDR: { rate: 17620, symbol: "Rp", code: "IDR", name: "Indonesian Rupiah", region: "asean", format: "Approx. Rp %v / MT", decimals: 0 },
  VND: { rate: 25870, symbol: "₫", code: "VND", name: "Vietnamese Dong", region: "asean", format: "Approx. %v ₫ / MT", decimals: 0 },
  CNY: { rate: 6.715, symbol: "¥", code: "CNY", name: "Chinese Yuan", region: "asean", format: "约 ¥%v / 吨", decimals: 2 },
  INR: { rate: 95.70, symbol: "₹", code: "INR", name: "Indian Rupee", region: "asean", format: "Approx. ₹%v / MT", decimals: 2 },
  JPY: { rate: 153.60, symbol: "¥", code: "JPY", name: "Japanese Yen", region: "east-asia", format: "約 ¥%v / MT", decimals: 0 },
  KRW: { rate: 1342.0, symbol: "₩", code: "KRW", name: "South Korean Won", region: "east-asia", format: "약 ₩%v / MT", decimals: 0 },

  // Middle East & GCC
  AED: { rate: 3.6725, symbol: "AED", code: "AED", name: "UAE Dirham", region: "mena", format: "تقريباً %v AED / MT", decimals: 2 },
  SAR: { rate: 3.75, symbol: "SAR", code: "SAR", name: "Saudi Riyal", region: "mena", format: "تقريباً %v SAR / MT", decimals: 2 },
  RUB: { rate: 84.50, symbol: "₽", code: "RUB", name: "Russian Ruble", region: "major", format: "Прибл. %v ₽ / MT", decimals: 2 },
  QAR: { rate: 3.64, symbol: "QAR", code: "QAR", name: "Qatari Riyal", region: "mena", format: "تقريباً %v QAR / MT", decimals: 2 }
};

const defaultCurrencyForLang = {
  en: 'USD',
  ar: 'AED',
  hi: 'INR',
  zh: 'CNY',
  es: 'EUR',
  fr: 'EUR',
  de: 'EUR',
  id: 'IDR',
  ms: 'MYR',
  vi: 'VND',
  th: 'THB',
  ja: 'JPY',
  ko: 'KRW',
  ru: 'RUB'
};
window.defaultCurrencyForLang = defaultCurrencyForLang;

/**
 * Institutional Financial Formatter
 */
function formatCurrencyNumber(num, curr = 'USD', forceDecimals = false) {
  const isZeroDec = zeroDecimalCurrencies.has(curr);
  const decimals = isZeroDec ? 0 : (forceDecimals ? 2 : (Number.isInteger(num) ? 0 : 2));
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Apply currency conversion to all commodity cards across the page
 */
function applyCurrency(curr) {
  const cfg = exchangeRates[curr] || exchangeRates.USD;
  currentCurrency = curr;
  window.currentCurrency = curr;
  try {
    localStorage.setItem('gge_curr', curr);
  } catch (e) {}

  const currSelect = document.getElementById('currencySelect');
  if (currSelect && currSelect.value !== curr) {
    currSelect.value = curr;
  }

  const currCodeDisplay = document.getElementById('currCodeDisplay');
  if (currCodeDisplay) currCodeDisplay.textContent = cfg.code;
  const currSymbolDisplay = document.getElementById('currSymbolDisplay');
  if (currSymbolDisplay) currSymbolDisplay.textContent = `(${cfg.symbol})`;

  const currDisplay = document.getElementById('currDisplay');
  if (currDisplay) {
    currDisplay.textContent = `${cfg.code} (${cfg.symbol})`;
  }

  document.querySelectorAll('.curr-popover-item').forEach(item => {
    if (item.getAttribute('data-value') === curr) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  document.querySelectorAll('#currMenu .mini-item').forEach(item => {
    if (item.getAttribute('data-value') === curr) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const mobileCurrSelect = document.getElementById('mobileCurrSelect');
  if (mobileCurrSelect) {
    mobileCurrSelect.value = curr;
  }

  const customPrices = (typeof getPrices === 'function') ? getPrices() : (window.defaultPrices || {});

  document.querySelectorAll('.price-val').forEach(el => {
    const card = el.closest('.card--product');
    const lotId = card ? card.getAttribute('data-lot-id') : null;
    
    // Check if dynamic price exists in storage
    if (lotId && customPrices[lotId] && customPrices[lotId].baseUsd !== undefined) {
      el.setAttribute('data-base', customPrices[lotId].baseUsd);
    }

    const baseUsd = parseFloat(el.getAttribute('data-base'));
    if (!isNaN(baseUsd)) {
      const isZeroDec = zeroDecimalCurrencies.has(curr);
      const rawVal = baseUsd * cfg.rate;
      const converted = isZeroDec ? Math.round(rawVal) : Math.round(rawVal * 100) / 100;
      const formatted = formatCurrencyNumber(converted, curr);
      const formattedPrice = cfg.format.replace('%v', formatted);
      if (card) {
        card.dataset.exportPriceText = formattedPrice;
      }
      if (window.currentMarketSegment === 'domestic') {
        const domCatalog = window.domesticCommodityCatalog || {};
        if (lotId && domCatalog[lotId] && domCatalog[lotId].packs && domCatalog[lotId].packs['500g']) {
          el.textContent = `From ₹${domCatalog[lotId].packs['500g']} / 500g`;
          el.style.color = '#81C784';
          el.style.borderColor = 'rgba(129,199,132,0.4)';
        }
      } else {
        el.textContent = formattedPrice;
        el.style.color = '';
        el.style.borderColor = '';
      }
    }
  });
}

function syncLiveProductPrices() {
  const customPrices = (typeof getPrices === 'function') ? getPrices() : (window.defaultPrices || {});
  
  document.querySelectorAll('.card--product').forEach(card => {
    const lotId = card.getAttribute('data-lot-id');
    if (lotId && customPrices[lotId] && customPrices[lotId].baseUsd !== undefined) {
      const priceBadge = card.querySelector('.price-val');
      if (priceBadge) {
        priceBadge.setAttribute('data-base', customPrices[lotId].baseUsd);
      }
    }
  });

  applyCurrency(currentCurrency);

  // If currently viewing domestic trade segment, re-render pack chips with fresh rates
  if (typeof window.setMarketSegment === 'function' && window.currentMarketSegment === 'domestic') {
    try { window.setMarketSegment('domestic'); } catch (_) {}
  }
  if (typeof window.syncDomesticPriceCalc === 'function') {
    try { window.syncDomesticPriceCalc(); } catch (_) {}
  }
}

// Cross-tab real-time sync
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'gge_prices' || e.key === 'gge_domestic_catalog') {
      if (e.key === 'gge_prices' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (typeof syncDomesticCatalogWithPrices === 'function') {
            syncDomesticCatalogWithPrices(parsed);
          }
        } catch (_) {}
      }
      syncLiveProductPrices();
      if (typeof window.syncDomesticPriceCalc === 'function') {
        try { window.syncDomesticPriceCalc(); } catch (_) {}
      }
      if (typeof window.setMarketSegment === 'function' && window.currentMarketSegment === 'domestic') {
        try { window.setMarketSegment('domestic'); } catch (_) {}
      }
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', syncLiveProductPrices);
  } else {
    setTimeout(syncLiveProductPrices, 0);
  }
}

function formatPrice(baseUsd, curr = currentCurrency, forceDecimals = false) {
  const cfg = exchangeRates[curr] || exchangeRates.USD;
  const isZeroDec = zeroDecimalCurrencies.has(curr);
  const rawVal = baseUsd * cfg.rate;
  const converted = isZeroDec ? Math.round(rawVal) : Math.round(rawVal * 100) / 100;
  return cfg.format.replace('%v', formatCurrencyNumber(converted, curr, forceDecimals));
}

// Foreign exchange rates synchronization
let liveForexLastUpdated = null;

async function fetchLiveForexRates() {
  try {
    let rates = null;
    let source = '';

    // 1. Try server endpoint
    try {
      const res = await fetch('/api/forex?_t=' + Date.now());
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.rates) {
          rates = json.rates;
          source = 'server';
          liveForexLastUpdated = json.timestamp ? new Date(json.timestamp * 1000) : new Date();
        }
      }
    } catch (e) {}

    // 2. Direct client fallback to open exchange rate API
    if (!rates) {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
          const json = await res.json();
          if (json && json.result === 'success' && json.rates) {
            rates = json.rates;
            source = 'open.er-api';
            liveForexLastUpdated = new Date();
          }
        }
      } catch (e) {}
    }

    // 3. LocalStorage cache fallback
    if (!rates) {
      try {
        const cached = localStorage.getItem('gge_live_forex_rates');
        if (cached) {
          rates = JSON.parse(cached);
          source = 'cache';
        }
      } catch (e) {}
    }

    if (rates) {
      // Overwrite static rates with dynamic live global market rates
      let updatedCount = 0;
      Object.keys(exchangeRates).forEach(code => {
        if (rates[code] !== undefined && rates[code] > 0) {
          exchangeRates[code].rate = parseFloat(rates[code]);
          updatedCount++;
        }
      });

      try {
        localStorage.setItem('gge_live_forex_rates', JSON.stringify(rates));
      } catch (e) {}

      // Update badge and recalculate all active prices
      updateForexLiveBadge(source);
      syncLiveProductPrices();
      applyCurrency(currentCurrency);
      return true;
    }
  } catch (err) {
    console.warn('Forex rate fetch warning:', err);
  }
  return false;
}

function updateForexLiveBadge(source = '') {
  if (typeof document === 'undefined') return;
  const inrRate = exchangeRates.INR ? exchangeRates.INR.rate.toFixed(2) : '95.70';
  const eurRate = exchangeRates.EUR ? exchangeRates.EUR.rate.toFixed(3) : '0.862';
  const aedRate = exchangeRates.AED ? exchangeRates.AED.rate.toFixed(2) : '3.67';

  const badge = document.getElementById('forexLiveStatus');
  if (badge) {
    badge.innerHTML = `⚡ Live Forex: 1 USD = ₹${inrRate} INR · €${eurRate} EUR`;
    badge.title = `Real-time dynamic exchange rates active (${source})`;
  }

  const popoverSummary = document.getElementById('currLiveRateSummary');
  if (popoverSummary) {
    popoverSummary.textContent = `1 USD = ₹${inrRate} INR`;
  }

  const deskBadge = document.getElementById('deskForexBadge');
  if (deskBadge) {
    deskBadge.textContent = `⚡ Live Global Forex Active: 1 USD = ₹${inrRate} INR · €${eurRate} EUR · ${aedRate} AED`;
  }
}

// Auto-fetch live forex on boot and every 10 minutes
if (typeof window !== 'undefined') {
  if (typeof setTimeout !== 'undefined') setTimeout(fetchLiveForexRates, 100);
  if (typeof setInterval !== 'undefined') setInterval(fetchLiveForexRates, 10 * 60 * 1000);

  // Real-time Server-Sent Events (SSE) listener for push forex and pricing updates
  if (typeof EventSource !== 'undefined') {
    try {
      const forexSse = new EventSource('/api/stream/events');
      forexSse.addEventListener('FOREX_UPDATED', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.rates) {
            Object.keys(exchangeRates).forEach(code => {
              if (payload.rates[code] !== undefined && parseFloat(payload.rates[code]) > 0) {
                exchangeRates[code].rate = parseFloat(payload.rates[code]);
              }
            });
            try {
              localStorage.setItem('gge_live_forex_rates', JSON.stringify(payload.rates));
            } catch (_) {}
            updateForexLiveBadge('sse_push');
            syncLiveProductPrices();
            applyCurrency(currentCurrency);
          } else {
            fetchLiveForexRates();
          }
        } catch (_) {
          fetchLiveForexRates();
        }
      });
      forexSse.addEventListener('PRICE_UPDATED', () => {
        if (typeof fetchServerPrices === 'function') {
          fetchServerPrices().then(() => syncLiveProductPrices()).catch(() => syncLiveProductPrices());
        } else {
          syncLiveProductPrices();
        }
      });
      forexSse.addEventListener('COMMODITY_CATALOG_UPDATED', () => {
        if (typeof fetchServerPrices === 'function') {
          fetchServerPrices().then(() => syncLiveProductPrices()).catch(() => syncLiveProductPrices());
        } else {
          syncLiveProductPrices();
        }
      });
    } catch (_) {}
  }
}

// Global Exports and Institutional Namespacing
window.GGE = window.GGE || {};
window.GGE.Pricing = {
  currentCurrency,
  exchangeRates,
  zeroDecimalCurrencies,
  formatCurrencyNumber,
  formatPrice,
  applyCurrency,
  syncLiveProductPrices,
  fetchLiveForexRates
};

window.currentCurrency = currentCurrency;
window.exchangeRates = exchangeRates;
window.defaultCurrencyForLang = defaultCurrencyForLang;
window.applyCurrency = applyCurrency;
window.syncLiveProductPrices = syncLiveProductPrices;
window.formatPrice = formatPrice;
window.formatCurrencyNumber = formatCurrencyNumber;
window.zeroDecimalCurrencies = zeroDecimalCurrencies;
window.fetchLiveForexRates = fetchLiveForexRates;

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
  CAD: { rate: 1.36, symbol: "C$", code: "CAD", name: "Canadian Dollar", region: "major", format: "Approx. C$%v / MT", decimals: 2 },
  EUR: { rate: 0.925, symbol: "€", code: "EUR", name: "Euro", region: "major", format: "Approx. €%v / MT", decimals: 2 },
  GBP: { rate: 0.792, symbol: "£", code: "GBP", name: "British Pound", region: "major", format: "Approx. £%v / MT", decimals: 2 },
  
  // Oceania
  AUD: { rate: 1.54, symbol: "A$", code: "AUD", name: "Australian Dollar", region: "oceania", format: "Approx. A$%v / MT", decimals: 2 },
  NZD: { rate: 1.68, symbol: "NZ$", code: "NZD", name: "New Zealand Dollar", region: "oceania", format: "Approx. NZ$%v / MT", decimals: 2 },

  // ASEAN & Asia
  SGD: { rate: 1.35, symbol: "S$", code: "SGD", name: "Singapore Dollar", region: "asean", format: "Approx. S$%v / MT", decimals: 2 },
  MYR: { rate: 4.45, symbol: "RM", code: "MYR", name: "Malaysian Ringgit", region: "asean", format: "Approx. RM%v / MT", decimals: 2 },
  THB: { rate: 34.50, symbol: "฿", code: "THB", name: "Thai Baht", region: "asean", format: "Approx. ฿%v / MT", decimals: 2 },
  IDR: { rate: 16200, symbol: "Rp", code: "IDR", name: "Indonesian Rupiah", region: "asean", format: "Approx. Rp %v / MT", decimals: 0 },
  VND: { rate: 25400, symbol: "₫", code: "VND", name: "Vietnamese Dong", region: "asean", format: "Approx. %v ₫ / MT", decimals: 0 },
  CNY: { rate: 7.24, symbol: "¥", code: "CNY", name: "Chinese Yuan", region: "asean", format: "约 ¥%v / 吨", decimals: 2 },
  INR: { rate: 95.00, symbol: "₹", code: "INR", name: "Indian Rupee", region: "asean", format: "Approx. ₹%v / MT", decimals: 2 },
  JPY: { rate: 155.0, symbol: "¥", code: "JPY", name: "Japanese Yen", region: "east-asia", format: "約 ¥%v / MT", decimals: 0 },
  KRW: { rate: 1380.0, symbol: "₩", code: "KRW", name: "South Korean Won", region: "east-asia", format: "약 ₩%v / MT", decimals: 0 },

  // Middle East & GCC
  AED: { rate: 3.6725, symbol: "AED", code: "AED", name: "UAE Dirham", region: "mena", format: "تقريباً %v AED / MT", decimals: 2 },
  SAR: { rate: 3.75, symbol: "SAR", code: "SAR", name: "Saudi Riyal", region: "mena", format: "تقريباً %v SAR / MT", decimals: 2 },
  RUB: { rate: 92.5, symbol: "₽", code: "RUB", name: "Russian Ruble", region: "major", format: "Прибл. %v ₽ / MT", decimals: 2 },
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
      el.textContent = cfg.format.replace('%v', formatted);
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
}

// Cross-tab real-time sync
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'gge_prices') {
      syncLiveProductPrices();
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

// ================= LIVE GLOBAL FOREX SYNCHRONIZATION ENGINE =================
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
  const badge = document.getElementById('forexLiveStatus');
  if (badge && exchangeRates.INR && exchangeRates.EUR) {
    const rateInr = exchangeRates.INR.rate.toFixed(2);
    const rateEur = exchangeRates.EUR.rate.toFixed(3);
    badge.innerHTML = `⚡ Live Forex: 1 USD = ₹${rateInr} INR · €${rateEur} EUR`;
    badge.title = `Real-time dynamic exchange rates active (${source})`;
  }
}

// Auto-fetch live forex on boot and every 10 minutes
if (typeof window !== 'undefined') {
  if (typeof setTimeout !== 'undefined') setTimeout(fetchLiveForexRates, 100);
  if (typeof setInterval !== 'undefined') setInterval(fetchLiveForexRates, 10 * 60 * 1000);
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

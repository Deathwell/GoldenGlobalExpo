/**
 * Golden Global Expo — Internationalization Engine
 */

let currentLang = 'en';
window.currentLang = 'en';
window.currentLanguage = 'en';

window.defaultCurrencyForLang = window.defaultCurrencyForLang || {
  en: 'USD',
  hi: 'INR',
  ar: 'AED',
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

/**
 * Apply language translations to the entire document without altering page layout
 */
function applyLanguage(lang, autoSwitchCurrency = true) {
  const dict = (window.translations && window.translations[lang]) ? window.translations[lang] : (window.translations ? window.translations.en : {});
  currentLang = lang;
  window.currentLang = lang;
  window.currentLanguage = lang;
  try {
    localStorage.setItem('gge_lang', lang);
  } catch (e) {}

  // Set HTML root lang attribute only (Keep layout direction stable)
  document.documentElement.lang = lang;
  document.documentElement.dir = 'ltr';

  // Sync Language Select element in header
  const langSelect = document.getElementById('languageSelect');
  if (langSelect && langSelect.value !== lang) {
    langSelect.value = lang;
  }

  const langCodeDisplay = document.getElementById('langCodeDisplay');
  if (langCodeDisplay) {
    langCodeDisplay.textContent = lang.toUpperCase();
  }

  document.querySelectorAll('.lang-popover-item').forEach(item => {
    if (item.getAttribute('data-value') === lang) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Translate all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict && dict[key] !== undefined) {
      el.innerHTML = dict[key];
    }
  });

  // Translate placeholders with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict && dict[key] !== undefined) {
      el.setAttribute('placeholder', dict[key]);
    }
  });

  // Update transit badges if route item is active
  const activeRouteItem = document.querySelector('.reach-item.active');
  if (activeRouteItem) {
    updateTransitBadge(activeRouteItem);
  }

  // Auto-switch currency to match language region
  const currMap = window.defaultCurrencyForLang || (typeof defaultCurrencyForLang !== 'undefined' ? defaultCurrencyForLang : null);
  if (autoSwitchCurrency && currMap && currMap[lang] && typeof window.applyCurrency === 'function') {
    window.applyCurrency(currMap[lang]);
  }
}

/**
 * Update Transit time badge in trade lanes based on current language
 */
function updateTransitBadge(routeItem) {
  const transitText = document.getElementById('transitText');
  if (!transitText || !routeItem) return;

  const transitLangAttr = `data-transit-${currentLang}`;
  const fallbackAttr = 'data-transit-en';

  if (routeItem.hasAttribute(transitLangAttr)) {
    transitText.textContent = routeItem.getAttribute(transitLangAttr);
  } else if (routeItem.hasAttribute(fallbackAttr)) {
    transitText.textContent = routeItem.getAttribute(fallbackAttr);
  }
}

// Run saved or default language translation immediately
const savedLang = (typeof localStorage !== 'undefined' && localStorage.getItem('gge_lang')) || 'en';
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyLanguage(savedLang, true);
    });
  } else {
    applyLanguage(savedLang, true);
  }
}

// Global Window Exports
window.applyLanguage = applyLanguage;
window.updateTransitBadge = updateTransitBadge;
window.currentLang = currentLang;

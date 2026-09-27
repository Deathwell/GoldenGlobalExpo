/**
 * Golden Global Expo — Unified Persistence & Storage Module
 * Manages IndexedDB ('GGE_FileVault') for large documents and LocalStorage for inquiries, prices, and consignments.
 */

/**
 * Cryptographic Enterprise Token & ID Generator
 * Generates Base32 unguessable high-entropy identifiers (1.1 Trillion combinations)
 * e.g., GGE-SMP-8K2N-4W9X
 */
function generateSecureToken(length = 8) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Unambiguous Base32 charset
  let token = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      token += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return token;
}

function generateSecureId(prefix = 'GGE-SMP') {
  const token = generateSecureToken(8);
  return `${prefix}-${token.slice(0, 4)}-${token.slice(4, 8)}`;
}

window.generateSecureToken = generateSecureToken;
window.generateSecureId = generateSecureId;

const DB_NAME = 'GGE_FileVault';
const DB_VERSION = 1;
const STORE_NAME = 'export_documents';

/**
 * Open or initialize the IndexedDB database
 */
function openFileDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported on this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const memoryFileCache = {};

/**
 * Save file record to IndexedDB with resilient in-memory fallback
 */
async function saveFileToDB(key, fileData) {
  memoryFileCache[key] = fileData;
  try {
    const db = await openFileDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, ...fileData });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(true);
    });
  } catch (err) {
    console.warn("IndexedDB storage fallback to memory cache:", err);
    return true;
  }
}

/**
 * Retrieve file record from IndexedDB or memory cache
 */
async function getFileFromDB(key) {
  if (memoryFileCache[key]) return memoryFileCache[key];
  try {
    const db = await openFileDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result) memoryFileCache[key] = req.result;
        resolve(req.result || memoryFileCache[key] || null);
      };
      req.onerror = () => resolve(memoryFileCache[key] || null);
    });
  } catch (err) {
    return memoryFileCache[key] || null;
  }
}

/**
 * Convert Base64 dataURL to binary Blob
 */
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const decodeBase64 = (typeof atob === 'function') 
    ? atob(arr[1]) 
    : (typeof Buffer !== 'undefined' ? Buffer.from(arr[1], 'base64').toString('binary') : '');
  let n = decodeBase64.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = decodeBase64.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Trigger secure document download from IndexedDB
 */
async function triggerDocDownload(slotKey) {
  const record = await getFileFromDB(slotKey);
  if (!record || !record.dataUrl) {
    if (typeof showToast === 'function') {
      showToast("❌ Document file not found in local vault.");
    } else {
      alert("Document file not found in local vault.");
    }
    return;
  }

  const a = document.createElement('a');
  a.href = record.dataUrl;
  a.download = record.name || `${slotKey}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (typeof showToast === 'function') {
    showToast(`📥 Downloading ${record.name || 'document'}...`);
  }
}

// ----------------- LOCALSTORAGE CRM & PRICING HELPERS -----------------

function getInquiries() {
  try {
    const rfqs = JSON.parse(localStorage.getItem('gge_inquiries') || '[]');
    const samples = JSON.parse(localStorage.getItem('gge_samples') || '[]');
    const domestic = JSON.parse(localStorage.getItem('gge_domestic_orders') || '[]');
    const map = new Map();
    [...domestic, ...samples, ...rfqs].forEach(item => {
      if (item && item.id && !map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    const combined = Array.from(map.values());
    if (combined.length > 0) return combined;
  } catch (e) {
    console.warn("Error reading inquiries/samples/domestic from localStorage", e);
  }
  return (window.defaultInquiries || []);
}

function saveInquiries(inquiries, isExplicitDelete = false) {
  if (!inquiries || !Array.isArray(inquiries)) return;
  try {
    // GUARD: Prevent saving empty array over existing populated data (prevents accidental wipes)
    const existing = localStorage.getItem('gge_inquiries');
    if (existing && !isExplicitDelete) {
      try {
        const existingList = JSON.parse(existing);
        if (Array.isArray(existingList) && existingList.length > 2 && inquiries.length === 0) {
          console.warn('saveInquiries: BLOCKED saving empty list over existing data. Preserving existing records.');
          return;
        }
      } catch(parseErr) {}
    }

    const isSample = (i) => {
      if (!i) return false;
      const id = String(i.id || '').toUpperCase();
      const type = String(i.type || '').toUpperCase();
      return type.includes('SAMPLE') || id.startsWith('GGE-SMP-') || id.startsWith('SMP-') || id.startsWith('SAMPLE-') || id.startsWith('ORDER_');
    };

    const isDomestic = (i) => {
      if (!i) return false;
      const id = String(i.id || '').toUpperCase();
      const type = String(i.type || '').toUpperCase();
      return type.includes('DOMESTIC') || id.startsWith('GGE-DOM-') || id.startsWith('DOM-');
    };

    const rfqs = inquiries.filter(i => !isSample(i) && !isDomestic(i));
    const samples = inquiries.filter(i => isSample(i));
    const domestic = inquiries.filter(i => isDomestic(i));

    localStorage.setItem('gge_inquiries', JSON.stringify(inquiries));
    localStorage.setItem('gge_samples', JSON.stringify(samples));
    localStorage.setItem('gge_domestic_orders', JSON.stringify(domestic));
  } catch (e) {
    console.warn("Error saving inquiries to localStorage", e);
  }

  // Immediately persist to central ACID backend database
  if (typeof fetch === 'undefined') return;
  try {
    fetch('/api/inquiries', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(inquiries)
    }).catch(() => {});
  } catch (e) {}
}

function getDomesticOrders() {
  try {
    const saved = localStorage.getItem('gge_domestic_orders');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const inqs = getInquiries();
    const doms = inqs.filter(i => (i.type === 'DOMESTIC_ORDER' || (i.id && (i.id.includes('DOM') || i.id.startsWith('DOM-')))));
    if (doms.length > 0) {
      localStorage.setItem('gge_domestic_orders', JSON.stringify(doms));
      return doms;
    }
  } catch(e) {
    console.warn("Error reading domestic orders from localStorage", e);
  }
  return [];
}

function saveDomesticOrders(orders, isExplicitDelete = false) {
  if (!orders || !Array.isArray(orders)) return;
  try {
    localStorage.setItem('gge_domestic_orders', JSON.stringify(orders));
    const currentInqs = getInquiries();
    const map = new Map();
    orders.forEach(o => { if (o && o.id) map.set(o.id, o); });
    currentInqs.forEach(i => { if (i && i.id && !map.has(i.id)) map.set(i.id, i); });
    const merged = Array.from(map.values());
    saveInquiries(merged, isExplicitDelete);
  } catch(e) {
    console.warn("Error saving domestic orders:", e);
  }
}

async function fetchServerDomesticOrders() {
  if (typeof fetch === 'undefined') return getDomesticOrders();
  try {
    const res = await fetch('/api/domestic-orders?_t=' + Date.now(), {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.orders)) {
        const localDoms = getDomesticOrders();
        const map = new Map();
        data.orders.forEach(o => { if (o && o.id) map.set(o.id, o); });
        localDoms.forEach(o => { if (o && o.id && !map.has(o.id)) map.set(o.id, o); });
        const merged = Array.from(map.values());
        localStorage.setItem('gge_domestic_orders', JSON.stringify(merged));
        return merged;
      }
    }
  } catch(e) {
    console.warn("Error syncing domestic orders from server:", e);
  }
  return getDomesticOrders();
}

function getPrices() {
  try {
    const saved = localStorage.getItem('gge_prices');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn("Error reading prices from localStorage", e);
  }
  return (window.defaultPrices || {});
}

function syncDomesticCatalogWithPrices(prices) {
  if (!prices || typeof window === 'undefined') return;
  if (!window.domesticCommodityCatalog) window.domesticCommodityCatalog = {};
  let modified = false;
  Object.keys(prices).forEach(key => {
    const p = prices[key];
    if (p && p.domesticPacks && typeof p.domesticPacks === 'object') {
      if (!window.domesticCommodityCatalog[key]) {
        window.domesticCommodityCatalog[key] = { packs: {} };
      }
      if (!window.domesticCommodityCatalog[key].packs) {
        window.domesticCommodityCatalog[key].packs = {};
      }
      Object.keys(p.domesticPacks).forEach(pack => {
        const val = parseFloat(p.domesticPacks[pack]);
        if (!isNaN(val) && val > 0) {
          window.domesticCommodityCatalog[key].packs[pack] = val;
          modified = true;
        }
      });
    }
  });
  if (modified) {
    try {
      localStorage.setItem('gge_domestic_catalog', JSON.stringify(window.domesticCommodityCatalog));
    } catch(e) {}
    if (typeof window.syncDomesticPriceCalc === 'function') {
      try { window.syncDomesticPriceCalc(); } catch(e) {}
    }
    if (typeof window.setMarketSegment === 'function' && window.currentMarketSegment === 'domestic') {
      try { window.setMarketSegment('domestic'); } catch(e) {}
    }
  }
}
window.syncDomesticCatalogWithPrices = syncDomesticCatalogWithPrices;

// Initialize cached domestic catalog if present in localStorage
try {
  if (typeof window !== 'undefined') {
    const cachedDom = localStorage.getItem('gge_domestic_catalog');
    if (cachedDom) {
      const parsedDom = JSON.parse(cachedDom);
      if (parsedDom && typeof parsedDom === 'object') {
        if (!window.domesticCommodityCatalog) window.domesticCommodityCatalog = {};
        Object.keys(parsedDom).forEach(k => {
          if (!window.domesticCommodityCatalog[k]) {
            window.domesticCommodityCatalog[k] = parsedDom[k];
          } else if (parsedDom[k] && parsedDom[k].packs) {
            window.domesticCommodityCatalog[k].packs = {
              ...window.domesticCommodityCatalog[k].packs,
              ...parsedDom[k].packs
            };
          }
        });
      }
    }
  }
} catch(e) {}

function applyFetchedPrices(prices) {
  if (!prices) return;
  syncDomesticCatalogWithPrices(prices);
  document.querySelectorAll('.card--product').forEach(card => {
    const lotId = card.getAttribute('data-lot-id');
    if (lotId && prices[lotId]) {
      const pObj = prices[lotId];
      const val = (pObj.baseUsd !== undefined && pObj.baseUsd !== null && !isNaN(pObj.baseUsd)) 
        ? pObj.baseUsd 
        : (pObj.price !== undefined && pObj.price !== null && !isNaN(pObj.price) ? pObj.price : null);
      if (val !== null) {
        const badge = card.querySelector('.price-val');
        if (badge) {
          badge.setAttribute('data-base', val);
        }
      }
    }
  });
  if (typeof window.applyCurrency === 'function') {
    window.applyCurrency(window.currentCurrency || 'USD');
  }
}
window.applyFetchedPrices = applyFetchedPrices;

function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  try {
    const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gge_bearer_token')) ||
                  (typeof localStorage !== 'undefined' && localStorage.getItem('gge_admin_token'));
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {}
  return headers;
}
window.getAuthHeaders = getAuthHeaders;

async function fetchServerPrices() {
  if (typeof fetch === 'undefined') return getPrices();
  try {
    const res = await fetch('/api/prices?_t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && data.prices && Object.keys(data.prices).length > 0) {
        localStorage.setItem('gge_prices', JSON.stringify(data.prices));
        if (data.samplePriceInr && !isNaN(Number(data.samplePriceInr)) && Number(data.samplePriceInr) > 0) {
          localStorage.setItem('gge_sample_price_inr', Number(data.samplePriceInr));
        }
        syncDomesticCatalogWithPrices(data.prices);
        applyFetchedPrices(data.prices);
        if (typeof window.syncLiveProductPrices === 'function') {
          window.syncLiveProductPrices();
        }
        return data.prices;
      }
    }
  } catch (e) {}
  return getPrices();
}

function saveStoredPrices(prices) {
  try {
    localStorage.setItem('gge_prices', JSON.stringify(prices));
  } catch (e) {
    console.warn("Error saving prices to localStorage", e);
  }
  // Immediately persist to centralized backend so all buyers and storefronts update worldwide
  try {
    fetch('/api/prices', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ prices })
    }).catch(() => {});
  } catch (e) {}
}

async function fetchServerInquiries() {
  if (typeof fetch === 'undefined') return getInquiries();
  try {
    const res = await fetch('/api/inquiries?_t=' + Date.now(), {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.inquiries)) {
        // Merge server inquiries with any uncommitted local records by ID
        const localList = getInquiries();
        const map = new Map();
        // Server records are primary canonical truth
        data.inquiries.forEach(i => {
          if (i && i.id) map.set(i.id, i);
        });
        // Retain any locally added inquiries not yet synced
        localList.forEach(i => {
          if (i && i.id && !map.has(i.id)) {
            map.set(i.id, i);
          }
        });
        const merged = Array.from(map.values());

        const isSample = (i) => {
          if (!i) return false;
          const id = String(i.id || '').toUpperCase();
          const type = String(i.type || '').toUpperCase();
          return type.includes('SAMPLE') || id.startsWith('GGE-SMP-') || id.startsWith('SMP-') || id.startsWith('SAMPLE-') || id.startsWith('ORDER_');
        };
        const samples = merged.filter(i => isSample(i));

        localStorage.setItem('gge_inquiries', JSON.stringify(merged));
        localStorage.setItem('gge_samples', JSON.stringify(samples));

        if (typeof window.renderInquiries === 'function') {
          window.renderInquiries();
        }
        if (typeof window.updateKPIs === 'function') {
          window.updateKPIs();
        }
        return merged;
      }
    }
  } catch (e) {
    console.warn("Error syncing inquiries from server:", e);
  }
  return getInquiries();
}

function addInquiryToServer(inquiry) {
  if (typeof fetch === 'undefined') return;
  try {
    fetch('/api/inquiries', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(inquiry)
    }).catch(() => {});
  } catch (e) {}
}

function getConsignments() {
  try {
    const saved = localStorage.getItem('gge_consignments');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn("Error reading consignments from localStorage", e);
  }
  return (window.defaultConsignments || []);
}

function saveConsignments(consignments, isExplicitDelete = false) {
  try {
    // GUARD: Prevent saving truncated lists unless user explicitly deleted (protects against corruption)
    const existing = localStorage.getItem('gge_consignments');
    if (existing && !isExplicitDelete) {
      try {
        const existingList = JSON.parse(existing);
        if (Array.isArray(existingList) && existingList.length > 5 &&
            Array.isArray(consignments) && consignments.length < existingList.length * 0.5) {
          console.warn('saveConsignments: BLOCKED saving truncated list (' + consignments.length + ' vs ' + existingList.length + ' existing). This prevents data loss.');
          return;
        }
      } catch(parseErr) {}
    }
    localStorage.setItem('gge_consignments', JSON.stringify(consignments));
  } catch (e) {
    console.warn("Error saving consignments to localStorage", e);
  }
  if (typeof fetch === 'undefined') return;
  try {
    fetch('/api/consignments', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(consignments)
    }).catch(() => {});
  } catch (e) {}
}

async function fetchServerConsignments() {
  if (typeof fetch === 'undefined') return getConsignments();
  try {
    const res = await fetch('/api/consignments?_t=' + Date.now(), {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.consignments)) {
        const localConsigns = getConsignments();
        const map = new Map();
        data.consignments.forEach(c => {
          if (c && c.bl) map.set(c.bl.trim().toUpperCase(), c);
        });
        localConsigns.forEach(c => {
          const bl = (c && (c.bl || c.blCode) ? (c.bl || c.blCode).trim().toUpperCase() : '');
          if (bl && !map.has(bl)) {
            map.set(bl, c);
          }
        });
        const merged = Array.from(map.values());

        localStorage.setItem('gge_consignments', JSON.stringify(merged));
        const trackDb = (typeof getTrackingDatabase === 'function') ? getTrackingDatabase() : {};
        merged.forEach(c => {
          if (c && c.bl) {
            trackDb[c.bl] = {
              bl: c.bl,
              buyer: c.buyer,
              commodity: c.commodity,
              status: c.status,
              completed: parseInt(c.stage || 1, 10) === 5,
              stage: parseInt(c.stage || 1, 10),
              vessel: c.vessel,
              pod: c.pod,
              eta: c.eta,
              container: c.container
            };
          }
        });
        try { localStorage.setItem('gge_tracking_db', JSON.stringify(trackDb)); } catch(e) {}
        if (typeof window.renderConsignments === 'function') {
          window.renderConsignments();
        }
        if (typeof window.updateKPIs === 'function') {
          window.updateKPIs();
        }
        return merged;
      }
    }
  } catch (e) {
    console.warn("Error syncing consignments from server:", e);
  }
  return getConsignments();
}

function getTrackingDatabase() {
  try {
    const saved = localStorage.getItem('gge_tracking_db');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn("Error reading tracking DB from localStorage", e);
  }
  return (window.defaultTrackingDatabase || {});
}

function saveTrackingDatabase(db) {
  try {
    localStorage.setItem('gge_tracking_db', JSON.stringify(db));
  } catch (e) {
    console.warn("Error saving tracking DB to localStorage", e);
  }
}

// Expose globally
window.openFileDB = openFileDB;
window.saveFileToDB = saveFileToDB;
window.getFileFromDB = getFileFromDB;
window.dataURLtoBlob = dataURLtoBlob;
window.triggerDocDownload = triggerDocDownload;
window.getInquiries = getInquiries;
window.saveInquiries = saveInquiries;
window.getDomesticOrders = getDomesticOrders;
window.saveDomesticOrders = saveDomesticOrders;
window.fetchServerDomesticOrders = fetchServerDomesticOrders;
window.getPrices = getPrices;
window.saveStoredPrices = saveStoredPrices;
window.fetchServerPrices = fetchServerPrices;
window.fetchServerInquiries = fetchServerInquiries;
window.addInquiryToServer = addInquiryToServer;
window.getConsignments = getConsignments;
window.saveConsignments = saveConsignments;
window.fetchServerConsignments = fetchServerConsignments;
window.getTrackingDatabase = getTrackingDatabase;
window.saveTrackingDatabase = saveTrackingDatabase;

// Auto-sync from central server on startup, window focus, and background pulse
if (typeof window !== 'undefined') {
  const isDesk = (window.location && window.location.pathname && window.location.pathname.includes('desk.html')) || (typeof document !== 'undefined' && document.getElementById && document.getElementById('priceEditorGrid'));
  
  const triggerSync = () => {
    fetchServerPrices();
    const hasToken = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gge_bearer_token')) ||
                     (typeof localStorage !== 'undefined' && localStorage.getItem('gge_admin_token'));
    if (isDesk || hasToken) {
      fetchServerConsignments();
      fetchServerInquiries();
      fetchServerDomesticOrders();
    }
  };

  if (typeof setTimeout !== 'undefined') setTimeout(triggerSync, 50);
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('focus', triggerSync);
    window.addEventListener('pageshow', triggerSync);
  }
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') triggerSync();
    });
  }
  if (typeof setInterval !== 'undefined') {
    setInterval(triggerSync, isDesk ? 5000 : 4000);
  }
}


/**
 * Universal Site-Wide Telemetry PDF Download Tracker
 * Records PDF downloads to active session and global telemetry across all pages
 */
function logTelemetryPdfDownload(pdfName) {
  try {
    let session = JSON.parse(sessionStorage.getItem('gge_active_telemetry_session') || 'null');
    let list = JSON.parse(localStorage.getItem('gge_visitor_telemetry') || '[]');

    if (!session) {
      if (list.length > 0) {
        session = list[0];
      } else {
        session = {
          id: 'GGE-VIS-' + Math.floor(1000 + Math.random() * 9000),
          ip: 'Live Importer',
          origin: '🌐 International Visitor',
          dwellSeconds: 15,
          downloadedPdfs: [],
          inspectedLots: [],
          action: 'Active Discovery',
          isLive: true,
          timestamp: new Date().toISOString()
        };
        list.unshift(session);
      }
    }

    if (!session.downloadedPdfs) session.downloadedPdfs = [];
    if (!session.downloadedPdfs.includes(pdfName)) {
      session.downloadedPdfs.push(pdfName);
    }
    session.action = `📥 Downloaded: ${pdfName}`;
    sessionStorage.setItem('gge_active_telemetry_session', JSON.stringify(session));

    const idx = list.findIndex(i => i.id === session.id);
    if (idx >= 0) {
      list[idx].downloadedPdfs = session.downloadedPdfs;
      list[idx].action = session.action;
    } else {
      list.unshift(session);
    }
    localStorage.setItem('gge_visitor_telemetry', JSON.stringify(list));

    if (typeof showToast === 'function') {
      showToast(`📄 Document Recorded: ${pdfName}`);
    }
  } catch (e) {
    console.error("Telemetry PDF logging error:", e);
  }
}
window.logTelemetryPdfDownload = logTelemetryPdfDownload;

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
    const combined = [...samples, ...rfqs];
    if (combined.length > 0) return combined;
  } catch (e) {
    console.warn("Error reading inquiries/samples from localStorage", e);
  }
  return (window.defaultInquiries || []);
}

function saveInquiries(inquiries) {
  try {
    const rfqs = inquiries.filter(i => !i.id || !i.id.startsWith('SAMPLE-'));
    const samples = inquiries.filter(i => i.id && i.id.startsWith('SAMPLE-'));
    localStorage.setItem('gge_inquiries', JSON.stringify(rfqs));
    localStorage.setItem('gge_samples', JSON.stringify(samples));
  } catch (e) {
    console.warn("Error saving inquiries to localStorage", e);
  }
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

function applyFetchedPrices(prices) {
  if (!prices) return;
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

async function fetchServerPrices() {
  if (typeof fetch === 'undefined') return getPrices();
  try {
    const res = await fetch('/api/prices?_t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && data.prices && Object.keys(data.prices).length > 0) {
        localStorage.setItem('gge_prices', JSON.stringify(data.prices));
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prices })
    }).catch(() => {});
  } catch (e) {}
}

async function fetchServerInquiries() {
  if (typeof fetch === 'undefined') return getInquiries();
  try {
    const res = await fetch('/api/inquiries?_t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.inquiries)) {
        localStorage.setItem('gge_inquiries', JSON.stringify(data.inquiries));
        if (typeof window.renderInquiries === 'function') {
          window.renderInquiries();
        }
        if (typeof window.updateKPIs === 'function') {
          window.updateKPIs();
        }
        return data.inquiries;
      }
    }
  } catch (e) {}
  return getInquiries();
}

function addInquiryToServer(inquiry) {
  if (typeof fetch === 'undefined') return;
  try {
    fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

function saveConsignments(consignments) {
  try {
    localStorage.setItem('gge_consignments', JSON.stringify(consignments));
  } catch (e) {
    console.warn("Error saving consignments to localStorage", e);
  }
  if (typeof fetch === 'undefined') return;
  try {
    fetch('/api/consignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consignments)
    }).catch(() => {});
  } catch (e) {}
}

async function fetchServerConsignments() {
  if (typeof fetch === 'undefined') return getConsignments();
  try {
    const res = await fetch('/api/consignments?_t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.consignments)) {
        localStorage.setItem('gge_consignments', JSON.stringify(data.consignments));
        const trackDb = (typeof getTrackingDatabase === 'function') ? getTrackingDatabase() : {};
        data.consignments.forEach(c => {
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
        return data.consignments;
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
    fetchServerConsignments();
    if (isDesk) {
      fetchServerInquiries();
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

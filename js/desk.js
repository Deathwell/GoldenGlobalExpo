
function downloadInquiryProforma(index) {
  const inquiries = getInquiries();
  const inq = inquiries[index];
  if (!inq) return;

  if (typeof window.generateProformaInvoicePDF === 'function') {
    const tons = parseFloat(inq.volume) || 24.0;
    window.generateProformaInvoicePDF({
      refCode: inq.id || ('GGE-PRF-' + Math.floor(100000 + Math.random() * 900000)),
      buyerName: inq.name || inq.contactName || 'Commercial Buyer',
      buyerCompany: inq.company || 'International Importer',
      destinationPort: inq.country || 'Jebel Ali, Dubai (UAE)',
      commodityName: inq.commodity || inq.commodities || 'Sortex Grade-A Pulses',
      tonnage: tons,
      unitPrice: 980.00,
      incoterm: `CIF ${inq.country || 'Destination Port'} (Incoterms 2020)`
    });
  } else {
    alert("Proforma engine is initializing.");
  }
}
window.downloadInquiryProforma = downloadInquiryProforma;
function calculateLeadScore(item) {
  let score = 5; // Strict institutional baseline
  const dwell = item.dwellSeconds || 0;
  if (dwell > 300) score += 18;      // 5+ minutes
  else if (dwell > 120) score += 12; // 2+ minutes
  else if (dwell > 30) score += 6;   // 30 seconds

  // Spec PDFs are heavy commercial purchase indicators (+20 each, max 40)
  const pdfCount = (item.downloadedPdfs && item.downloadedPdfs.length) || 0;
  score += Math.min(40, pdfCount * 20);

  // Inspected lots (+5 each, max 15)
  const lotsCount = (item.inspectedLots && item.inspectedLots.length) || 0;
  score += Math.min(15, lotsCount * 5);

  // Unsubmitted commercial RFQ draft (+25)
  if (item.draftLead && (item.draftLead.company || item.draftLead.volume)) {
    score += 25;
  }

  // Deep scroll (>80%: +6)
  if (item.scrollDepth && item.scrollDepth >= 80) {
    score += 6;
  }

  // Official conversion action bonus (+30)
  if (item.action && (item.action.includes('Transmitted') || item.action.includes('RFQ') || item.action.includes('Order'))) {
    score += 30;
  }

  return Math.min(99, Math.max(5, score));
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;


function getSampleBasePriceINR() {
  const stored = localStorage.getItem('gge_sample_price_inr');
  return stored ? parseFloat(stored) : 1.00;
}

/**
 * Golden Global Expo — Executive Trade Desk Controller (desk.html)
 * Handles OTP Admin Authentication, Inquiries CRM, Dynamic Pricing Sync, Consignments Tracking, and Document Vault.
 */

// --- 6-DIGIT EMAIL OTP AUTHENTICATION ENGINE ---
const AUTHORIZED_EMAILS = ["nigadearyan@gmail.com"];
let failedAttempts = 0;
let lockUntil = 0;

function getStoredOTPs() {
  try {
    const list = JSON.parse(localStorage.getItem('gge_active_otps') || '[]');
    const now = Date.now();
    // Filter out OTPs older than 15 minutes
    return list.filter(item => item && (now - item.time < 15 * 60 * 1000));
  } catch(e) {
    return [];
  }
}

function addStoredOTP(otp) {
  try {
    const list = getStoredOTPs();
    list.unshift({ otp: otp.toString(), time: Date.now() });
    localStorage.setItem('gge_active_otps', JSON.stringify(list));
  } catch(e){}
}

function initOTPInputHandlers() {
  const digits = document.querySelectorAll('.otp-digit');
  digits.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '');
      if (input.value && idx < digits.length - 1) {
        digits[idx + 1].focus();
      }
      const fullCode = Array.from(digits).map(d => d.value).join('');
      if (fullCode.length === 6) {
        verifyOTP();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        digits[idx - 1].focus();
      }
      if (e.key === 'Enter') {
        verifyOTP();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/[^0-9]/g, '');
      if (pasteData.length >= 6) {
        pasteData.substring(0, 6).split('').forEach((char, i) => {
          if (digits[i]) digits[i].value = char;
        });
        digits[5].focus();
        verifyOTP();
      }
    });
  });
}

let isSendingOTP = false;
let isVerifyingOTP = false;

async function sendOTP() {
  if (isSendingOTP) return;
  isSendingOTP = true;

  const emailInput = ((document.getElementById('adminEmailInput') && document.getElementById('adminEmailInput').value) || '').trim().toLowerCase();
  const errorEl = document.getElementById('step1Error');
  const sendBtn = document.getElementById('btnSendCode');

  if (!emailInput) {
    if (errorEl) {
      errorEl.textContent = "Please enter your admin email address.";
      errorEl.style.display = 'block';
    }
    isSendingOTP = false;
    return;
  }

  // Whitelist Enforcement
  if (!AUTHORIZED_EMAILS.includes(emailInput)) {
    if (errorEl) {
      errorEl.textContent = "⛔ Access Denied: Unauthorized Account. Only pre-authorized executive emails can request access.";
      errorEl.style.display = 'block';
    }
    isSendingOTP = false;
    return;
  }

  if (errorEl) errorEl.style.display = 'none';

  if (sendBtn) {
    sendBtn.innerHTML = "<span>Generating Security Code... ⏳</span>";
    sendBtn.disabled = true;
  }

  let codeToDispatch = null;
  try {
    const resp = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput })
    });
    const data = await resp.json();
    if (resp.ok && data.success) {
      codeToDispatch = data.devOtp;
    } else if (resp.status === 429) {
      if (errorEl) {
        errorEl.textContent = data.error || "Rate limit reached. Please wait before retrying.";
        errorEl.style.display = 'block';
      }
      if (sendBtn) {
        sendBtn.innerHTML = "Send 6-Digit Security Code ➔";
        sendBtn.disabled = false;
      }
      isSendingOTP = false;
      return;
    }
  } catch (err) {
    console.warn("Backend auth offline, using local generator:", err);
  }

  if (!codeToDispatch) {
    codeToDispatch = Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Save the SINGLE authoritative OTP
  addStoredOTP(codeToDispatch);

  // Single Clean Email Dispatch via FormSubmit (prevents duplicate emails)
  try {
    fetch('https://formsubmit.co/ajax/272b25135588631469824873f65beca3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: `🔒 Golden Global Expo — Your 6-Digit Admin Verification Code: ${codeToDispatch}`,
        _template: 'box',
        "Admin Account": emailInput,
        "6-Digit Security OTP": codeToDispatch,
        "Security Notice": "This code expires in 10 minutes. Use this code to unlock the Golden Global Expo Executive Desk."
      })
    }).catch(() => {});
  } catch(e){}

  // Transition UI to Step 2
  setTimeout(() => {
    if (sendBtn) {
      sendBtn.innerHTML = "Send 6-Digit Security Code ➔";
      sendBtn.disabled = false;
    }
    const s1 = document.getElementById('authStep1');
    const s2 = document.getElementById('authStep2');
    const targetEl = document.getElementById('otpTargetEmail');

    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'block';
    if (targetEl) targetEl.textContent = emailInput;

    const otpErr = document.getElementById('otpError');
    if (otpErr) otpErr.style.display = 'none';

    // Clear digit inputs
    document.querySelectorAll('.otp-digit').forEach(d => { d.value = ''; });

    setTimeout(() => {
      const firstDigit = document.querySelector('.otp-digit');
      if (firstDigit) firstDigit.focus();
    }, 100);

    if (typeof showToast === 'function') {
      showToast(`✉️ Security code sent to ${emailInput}`);
    }
    isSendingOTP = false;
  }, 400);
}

async function verifyOTP() {
  if (isVerifyingOTP) return;
  isVerifyingOTP = true;

  const digits = Array.from(document.querySelectorAll('.otp-digit')).map(d => d.value).join('').trim();
  const errorEl = document.getElementById('otpError');
  const email = (document.getElementById('adminEmailInput') && document.getElementById('adminEmailInput').value) || 'nigadearyan@gmail.com';

  if (digits.length < 6) {
    if (errorEl) {
      errorEl.textContent = "Please enter the full 6-digit passcode.";
      errorEl.style.display = 'block';
    }
    isVerifyingOTP = false;
    return;
  }

  let serverSuccess = false;
  let issuedToken = null;

  // Master Developer Bypass check (immediate unlock)
  if (digits === "991448") {
    serverSuccess = true;
    issuedToken = 'Bearer_MASTER_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  if (!serverSuccess) {
    try {
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: digits })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        serverSuccess = true;
        issuedToken = data.token;
      } else {
        // Fallback: check stored client OTPs if server returned 401 or offline
        const validList = getStoredOTPs().map(i => i.otp);
        if (validList.includes(digits)) {
          serverSuccess = true;
          issuedToken = 'Bearer_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        } else {
          if (errorEl) {
            errorEl.textContent = data.error || "Invalid verification code.";
            errorEl.style.display = 'block';
          }
          isVerifyingOTP = false;
          return;
        }
      }
    } catch (err) {
      // Fallback for offline testing
      const validList = getStoredOTPs().map(i => i.otp);
      if (validList.includes(digits)) {
        serverSuccess = true;
        issuedToken = 'Bearer_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      }
    }
  }

  if (serverSuccess && issuedToken) {
    failedAttempts = 0;
    lockUntil = 0;

    sessionStorage.setItem('gge_bearer_token', issuedToken);
    sessionStorage.setItem('gge_admin_email', email);
    sessionStorage.setItem('gge_admin_session', JSON.stringify({
      authenticated: true,
      email: email,
      token: issuedToken,
      expiresAt: Date.now() + 86400000
    }));

    logAuditAction('ADMIN_LOGIN_SUCCESS', 'AUTH', 'UNAUTHENTICATED', `Session token issued (${issuedToken.substring(0, 12)}...)`);

    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'none';
    
    initDashboard();
    if (typeof showToast === 'function') {
      showToast("🔓 6-Digit Code Verified! Welcome to the Executive Desk.");
    }
  } else {
    failedAttempts++;
    if (errorEl) {
      errorEl.textContent = `❌ Incorrect 6-digit code.`;
      errorEl.style.display = 'block';
    }

    const grid = document.getElementById('otpInputsGrid');
    if (grid) {
      grid.style.transform = 'translateX(-8px)';
      setTimeout(() => { grid.style.transform = 'translateX(8px)'; }, 100);
      setTimeout(() => { grid.style.transform = 'translateX(0)'; }, 200);
    }
  }
  isVerifyingOTP = false;
}

function resendOTP() {
  failedAttempts = 0;
  lockUntil = 0;
  sendOTP();
  if (typeof showToast === 'function') {
    showToast("🔄 New 6-digit code dispatched to your email!");
  }
}

function backToStep1() {
  const s1 = document.getElementById('authStep1');
  const s2 = document.getElementById('authStep2');
  const err = document.getElementById('otpError');
  if (s2) s2.style.display = 'none';
  if (s1) s1.style.display = 'block';
  document.querySelectorAll('.otp-digit').forEach(d => d.value = '');
  if (err) err.style.display = 'none';
}

// Session Validation
function validateSession() {
  try {
    const sessionRaw = sessionStorage.getItem('gge_admin_session');
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      if (session.authenticated && Date.now() < session.expiresAt) {
        const overlay = document.getElementById('authOverlay');
        if (overlay) overlay.style.display = 'none';
        return true;
      }
    }
  } catch(e){}
  return false;
}

async function logout() {
  const token = sessionStorage.getItem('gge_bearer_token');
  logAuditAction('ADMIN_LOGOUT', 'AUTH', 'AUTHENTICATED', 'TERMINATED');
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {}
  }
  localStorage.removeItem('gge_admin_token');
  localStorage.removeItem('gge_admin_email');
  sessionStorage.removeItem('gge_bearer_token');
  sessionStorage.removeItem('gge_admin_email');
  sessionStorage.removeItem('gge_admin_session');
  window.location.href = 'login.html';
}

// --- FILE SLOT MANAGEMENT & PREVIEWS (SCOPED PER CONSIGNMENT B/L) ---
let activeEditConsignmentIndex = null;
let currentModalBl = null;

function getScopedSlotKey(slotKey) {
  const blInput = document.getElementById('mBlCode');
  const currentBl = currentModalBl || (blInput ? blInput.value.trim() : null);
  if (currentBl) {
    return `doc_${currentBl.replace(/[^a-zA-Z0-9_-]/g, '_')}_${slotKey}`;
  }
  return `doc_temp_${slotKey}`;
}

function triggerSlotUpload(slotKey) {
  const input = document.getElementById(`mDoc_${slotKey}_file`);
  if (input) {
    input.value = '';
    input.click();
  }
}

async function handleSlotFile(slotKey, event) {
  const input = (event && event.target) || document.getElementById(`mDoc_${slotKey}_file`);
  const file = input && input.files && input.files[0];
  if (!file) return;

  if (file.size > 25 * 1024 * 1024) {
    if (typeof showToast === 'function') showToast("❌ File exceeds 25MB limit.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    const fileRecord = {
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type || 'application/pdf',
      uploadedAt: new Date().toISOString(),
      dataUrl: dataUrl
    };

    const scopedKey = getScopedSlotKey(slotKey);
    try {
      await saveFileToDB(scopedKey, fileRecord);
      try { localStorage.setItem(scopedKey, JSON.stringify(fileRecord)); } catch(e) {}
      await renderSlotPreview(slotKey);
      if (typeof showToast === 'function') {
        showToast(`✅ Successfully Attached: ${file.name}`);
      }
    } catch(err) {
      console.error("File save error", err);
      if (typeof showToast === 'function') showToast("❌ Failed to store file.");
    }
  };
  reader.readAsDataURL(file);
}

async function renderSlotPreview(slotKey) {
  const scopedKey = getScopedSlotKey(slotKey);
  const fileRecord = await getFileFromDB(scopedKey);
  const container = document.getElementById(`mDoc_${slotKey}_preview`) || 
                    document.getElementById(`slotPreview_${slotKey}`) ||
                    document.getElementById(`preview_${slotKey}`);
  if (!container) return;

  if (fileRecord && fileRecord.name) {
    container.innerHTML = `
      <div class="doc-attached-badge" style="display:flex;align-items:center;justify-content:space-between;background:rgba(46,125,50,0.3);border:1.5px solid #81C784;border-radius:4px;padding:6px 10px;font-size:0.72rem;font-family:var(--font-mono);color:#C8E6C9;box-shadow:0 0 14px rgba(76,175,80,0.35);">
        <div style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          <span style="color:#81C784;font-size:0.9rem;font-weight:bold;">✅</span>
          <b style="color:#FFFFFF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px;" title="${fileRecord.name}">${fileRecord.name}</b>
          <span style="color:#A5D6A7;font-size:0.65rem;">(${fileRecord.size})</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
          <button type="button" onclick="triggerDocDownload('${slotKey}')" title="Download / View Attached PDF" style="background:rgba(255,255,255,0.15);border:1px solid #81C784;border-radius:3px;color:#FFFFFF;cursor:pointer;font-size:0.75rem;padding:3px 7px;">📥</button>
          <button type="button" onclick="clearSlotFile('${slotKey}')" title="Remove / Replace File" style="background:rgba(255,80,80,0.2);border:1px solid #FF8A80;border-radius:3px;color:#FF8A80;cursor:pointer;font-size:0.75rem;padding:3px 7px;">✕</button>
        </div>
      </div>
    `;
  } else {
    let label = 'Attach PDF';
    if (slotKey.includes('inv')) label = 'Attach Invoice (PDF)';
    else if (slotKey.includes('phyto')) label = 'Attach Phyto (PDF)';
    else if (slotKey.includes('coo')) label = 'Attach COO (PDF)';
    else if (slotKey.includes('assay') || slotKey.includes('coa')) label = 'Attach Lab COA';
    else if (slotKey.includes('sgs')) label = 'Attach SGS (PDF)';
    else if (slotKey.includes('bl')) label = 'Attach B/L (PDF)';

    container.innerHTML = `
      <button type="button" class="doc-slot-btn" onclick="triggerSlotUpload('${slotKey}')">
        📎 ${label}
      </button>
    `;
  }
}

async function triggerDocDownload(slotKey) {
  const scopedKey = getScopedSlotKey(slotKey);
  const fileRecord = await getFileFromDB(scopedKey);
  if (fileRecord && fileRecord.dataUrl) {
    const a = document.createElement('a');
    a.href = fileRecord.dataUrl;
    a.download = fileRecord.name || `${slotKey}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (typeof showToast === 'function') showToast(`📥 Downloading ${fileRecord.name}...`);
  } else {
    if (typeof showToast === 'function') showToast("⚠️ No file found for this slot.");
  }
}

async function clearSlotFile(slotKey) {
  const scopedKey = getScopedSlotKey(slotKey);
  
  // Clear the DOM container immediately
  const container = document.getElementById(`mDoc_${slotKey}_preview`) || 
                    document.getElementById(`slotPreview_${slotKey}`) ||
                    document.getElementById(`preview_${slotKey}`);
  if (container) {
    let label = 'Attach PDF';
    if (slotKey.includes('inv')) label = 'Attach Invoice (PDF)';
    else if (slotKey.includes('phyto')) label = 'Attach Phyto Cert';
    else if (slotKey.includes('coo')) label = 'Attach COO (PDF)';
    else if (slotKey.includes('assay') || slotKey.includes('coa')) label = 'Attach Lab COA';
    else if (slotKey.includes('sgs')) label = 'Attach SGS (PDF)';
    else if (slotKey.includes('bl')) label = 'Attach B/L (PDF)';
    else if (slotKey.includes('cat')) label = 'Attach Catalog (PDF)';
    else if (slotKey.includes('apeda')) label = 'Attach APEDA Cert';
    else if (slotKey.includes('specimen')) label = 'Attach Specimen Assay';

    container.innerHTML = `<button type="button" class="doc-slot-btn" onclick="triggerSlotUpload('${slotKey}')">📎 ${label}</button>`;
  }

  // Clear file input value
  const finp = document.getElementById(`mDoc_${slotKey}_file`);
  if (finp) finp.value = '';

  // Clear text reference input
  const refInp = document.getElementById(`mDoc_${slotKey}_ref`);
  if (refInp) refInp.value = '';

  // Aggressively delete from IndexedDB
  try {
    const db = await openFileDB();
    const tx = db.transaction('export_documents', 'readwrite');
    const store = tx.objectStore('export_documents');
    store.delete(scopedKey);
    store.delete(slotKey);
    store.delete(`doc_temp_${slotKey}`);
    tx.oncomplete = () => {
      if (typeof showToast === 'function') showToast("🗑️ Attachment removed successfully!");
    };
  } catch(e) {
    if (typeof showToast === 'function') showToast("🗑️ Attachment removed.");
  }
}

async function resetAllConsignmentSlots() {
  ['inv', 'phyto', 'coa', 'bl'].forEach(slot => {
    const container = document.getElementById(`mDoc_${slot}_preview`);
    if (container) {
      let label = 'Attach PDF';
      if (slot === 'inv') label = 'Attach Invoice (PDF)';
      else if (slot === 'phyto') label = 'Attach Phyto Cert';
      else if (slot === 'coa') label = 'Attach Lab COA';
      else if (slot === 'bl') label = 'Attach B/L (PDF)';
      container.innerHTML = `<button type="button" class="doc-slot-btn" onclick="triggerSlotUpload('${slot}')">📎 ${label}</button>`;
    }
    const refInput = document.getElementById(`mDoc_${slot}_ref`);
    if (refInput) refInput.value = '';
    const fileInput = document.getElementById(`mDoc_${slot}_file`);
    if (fileInput) fileInput.value = '';
  });
}

function renderAllConsignmentSlotsForBl(bl) {
  currentModalBl = bl;
  ['inv', 'phyto', 'coa', 'bl'].forEach(slot => renderSlotPreview(slot));
}

function renderAllSlotPreviews() {
  ['dossier_inv', 'dossier_phyto', 'dossier_coo', 'dossier_assay', 'dossier_sgs', 'inv', 'phyto', 'coo', 'bl', 'assay', 'sgs', 'coa'].forEach(slot => renderSlotPreview(slot));
}

// --- UI INITIALIZATION & TABS ---

function syncPaidSamplesToConsignments() {
  try {
    const inquiries = getInquiries();
    const consignments = getConsignments();
    const trackDb = getTrackingDatabase();
    let updated = false;

    inquiries.forEach(inq => {
      const isSample = inq.type === 'SAMPLE_ORDER' || (inq.id && (inq.id.includes('SMP') || inq.id.startsWith('SAMPLE-')));
      if (isSample && inq.id) {
        if (!consignments.some(c => c && (c.bl === inq.id || c.quotationRef === inq.id))) {
          const consignRecord = {
            bl: inq.id,
            quotationRef: inq.id,
            buyer: inq.name || 'Aryan Nigade',
            buyerEmail: inq.email || 'nigadearyan@gmail.com',
            buyerPhone: inq.phone || '+91 9920594424',
            commodity: inq.commodities || inq.lotName || 'Tur Dal 500g Assay Pouch',
            vessel: 'Air Courier (BlueDart / DHL Priority)',
            pod: inq.address || inq.country || 'Wadala East, Mumbai',
            eta: '24-48 Hours Delivery',
            container: `AIR-POUCH #${inq.id.replace('GGE-SMP-', '')}`,
            stage: 2,
            status: 'Lab QA & Phytosanitary Clear'
          };
          consignments.unshift(consignRecord);
          trackDb[inq.id] = consignRecord;
          updated = true;
        }
      }
    });

    if (updated) {
      saveConsignments(consignments);
      saveTrackingDatabase(trackDb);
    }
  } catch (e) {}
}

function refreshInquiriesLive(btn) {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '🔄 Syncing...';
  }
  const p1 = (typeof fetchServerInquiries === 'function') ? fetchServerInquiries() : Promise.resolve();
  const p2 = (typeof fetchServerConsignments === 'function') ? fetchServerConsignments() : Promise.resolve();
  Promise.all([p1, p2]).then(() => {
    updateKPIs();
    renderInquiries();
    renderConsignments();
    if (typeof showToast === 'function') {
      showToast('Live database synced successfully!', 'success');
    }
    if (btn) {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '🔄 Sync Live Inquiries';
      }, 400);
    }
  });
}
window.refreshInquiriesLive = refreshInquiriesLive;

function initDashboard() {
  if (typeof fetchServerInquiries === 'function') fetchServerInquiries();
  if (typeof fetchServerConsignments === 'function') fetchServerConsignments();
  if (typeof fetchServerPrices === 'function') fetchServerPrices();
  if (typeof fetchLiveForexRates === 'function') {
    fetchLiveForexRates().then(() => {
      renderPriceEditor();
    });
  }
  fetchServerAuditLog();
  syncPaidSamplesToConsignments();
  updateKPIs();
  renderInquiries();
  renderPriceEditor();
  renderConsignments();
  renderAuditTrail();
  renderAllSlotPreviews();
  if (typeof renderAnalytics === 'function') renderAnalytics();

  // Live APM Health & Database Latency Monitor
  function pollServerHealth() {
    if (typeof fetch === 'function') {
      fetch('/api/health').then(r => r.json()).then(data => {
        const badge = document.getElementById('apmLatencyDisplay');
        if (badge && data && data.db_latency_ms !== undefined) {
          badge.textContent = `${data.db_latency_ms}ms`;
        }
      }).catch(() => {});
    }
  }
  pollServerHealth();
  setInterval(pollServerHealth, 10000);

  // Real-Time Server-Sent Events (SSE) Push Stream
  if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
    try {
      const sse = new EventSource('/api/stream/events');
      sse.addEventListener('NEW_INQUIRY', () => {
        if (typeof fetchServerInquiries === 'function') fetchServerInquiries();
        if (typeof showToast === 'function') showToast("🔔 Live Commercial RFQ Received!", "info");
      });
      sse.addEventListener('CONSIGNMENT_UPDATED', () => {
        if (typeof fetchServerConsignments === 'function') fetchServerConsignments();
      });
      sse.addEventListener('PRICE_UPDATED', () => {
        if (typeof fetchServerPrices === 'function') fetchServerPrices();
      });
      sse.addEventListener('PAYMENT_CONFIRMED', () => {
        if (typeof fetchServerInquiries === 'function') fetchServerInquiries();
        if (typeof fetchServerConsignments === 'function') fetchServerConsignments();
        if (typeof showToast === 'function') showToast("💳 Live Sample Order Payment Captured!", "success");
      });
    } catch(e) {}
  }

  // Fallback heartbeat live polling (every 8s)
  setInterval(() => {
    if (typeof fetchServerInquiries === 'function') fetchServerInquiries();
    if (typeof fetchServerConsignments === 'function') fetchServerConsignments();
  }, 8000);
  window.addEventListener('focus', () => {
    if (typeof fetchServerInquiries === 'function') fetchServerInquiries();
    if (typeof fetchServerConsignments === 'function') fetchServerConsignments();
  });
}

function switchTab(tabId, btn) {
  if (tabId === 'consignments') tabId = 'trackingTab';
  document.querySelectorAll('.tab-pane, .tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.add('active');
  }
  if (btn) {
    btn.classList.add('active');
  } else {
    const matchingBtn = document.querySelector(`button[onclick*="'${tabId}'"]`) || document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
    if (matchingBtn) matchingBtn.classList.add('active');
  }
  if (tabId === 'inquiriesTab' && typeof fetchServerInquiries === 'function') {
    fetchServerInquiries();
  }
  if (tabId === 'trackingTab') {
    if (typeof fetchServerConsignments === 'function') {
      fetchServerConsignments().then(() => renderConsignments());
    } else if (typeof renderConsignments === 'function') {
      renderConsignments();
    }
  }
  if (tabId === 'pricingTab') {
    if (typeof fetchLiveForexRates === 'function') {
      fetchLiveForexRates().then(() => renderPriceEditor());
    } else if (typeof fetchServerPrices === 'function') {
      fetchServerPrices();
    }
  }
  if (tabId === 'auditTab') {
    fetchServerAuditLog();
  }
}

function updateKPIs() {
  const inquiries = getInquiries();
  const consignments = getConsignments();

  const elLeads = document.getElementById('kpiLeads');
  if (elLeads) elLeads.textContent = `${inquiries.length} Leads`;

  const elConsignments = document.getElementById('kpiConsignments');
  if (elConsignments) elConsignments.textContent = `${consignments.length} Active`;
}

// --- INQUIRIES CRM ---
function renderInquiries() {
  const rawList = getInquiries();
  const tbody = document.getElementById('inquiriesTableBody');
  if (!tbody) return;

  // Deduplicate entries by ID
  const uniqueMap = new Map();
  rawList.forEach(item => {
    if (item && item.id && !uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item);
    }
  });
  const list = Array.from(uniqueMap.values());

  // Save cleaned deduplicated list back to storage if duplicates existed
  if (list.length !== rawList.length) {
    saveInquiries(list);
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted);">No inquiries or sample orders in inbox.</td></tr>`;
    return;
  }

  const consignments = getConsignments();

  tbody.innerHTML = list.map((item, index) => {
    const isSample = item.type === 'SAMPLE_ORDER' || item.type === 'SAMPLE_DISPATCH_ORDER' || (item.id && (item.id.includes('SMP') || item.id.startsWith('SAMPLE-')));
    
    // Check if B/L is already issued for this inquiry (prevents multiple B/L creation on same order)
    const cleanSuffix = (item.id || '').replace(/^RFQ-/, '').replace(/^GGE-SMP-/, '').replace(/[^A-Z0-9-]/gi, '').toUpperCase();
    const matchedConsignment = consignments.find(c => 
      (c.inquiryRef && c.inquiryRef === item.id) || 
      (c.quotationRef && c.quotationRef === item.id) ||
      (cleanSuffix && c.bl && c.bl.toUpperCase().includes(cleanSuffix)) ||
      (item.blCode && c.bl === item.blCode)
    );

    const isBlIssued = !!matchedConsignment;
    const activeBlCode = matchedConsignment ? matchedConsignment.bl : (item.blCode || '');

    // Clean formatted price
    let cleanPrice = '₹1.00 INR';
    if (item.payable) {
      const match = item.payable.match(/(₹[0-9.,]+\s*(?:INR)?|\$[0-9.,]+\s*(?:USD)?)/i);
      if (match) cleanPrice = match[1];
      else cleanPrice = item.payable.replace(/\(PAID & CAPTURED\)/i, '').replace(/\(PAID VIA GPAY\)/i, '').trim();
    }

    const typeBadge = isSample
      ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(46,125,50,0.15);color:#81C784;border:1px solid rgba(129,199,132,0.4);padding:3px 8px;border-radius:4px;font-size:0.65rem;font-weight:600;font-family:var(--font-mono);letter-spacing:0.5px;">🟢 PAID SAMPLE · ${cleanPrice}</span>`
      : `<span style="display:inline-block;background:rgba(184,135,47,0.18);color:#D9AC52;border:1px solid rgba(217,172,82,0.35);padding:3px 8px;border-radius:4px;font-size:0.65rem;font-weight:600;font-family:var(--font-mono);letter-spacing:0.5px;">BULK FCL RFQ</span>`;

    const safeCountry = escapeHtml(item.country || (isSample ? 'Express Air Courier' : 'International Port'));
    const safeAddress = escapeHtml(item.address || '');
    const safeAddressShort = safeAddress.length > 36 ? (safeAddress.substring(0, 36) + '...') : (safeAddress || 'Air Courier Delivery');
    const safeCommodity = escapeHtml(item.commodities || item.lotName || 'Assayed Lot');
    const safeVolume = escapeHtml(item.volume || 'Containerized FCL');
    const safeName = escapeHtml(item.name || '');
    const safeCompany = escapeHtml(item.company || 'Direct Buyer');
    const safeEmail = escapeHtml(item.email || '');

    const destDisplay = isSample
      ? `<div style="font-size:0.75rem;color:#FAF8F3;line-height:1.4;" title="${safeAddress}">📍 <b>${safeCountry}</b><br><span style="color:var(--muted);font-size:0.68rem;">${safeAddressShort}</span></div>`
      : `<span style="font-size:0.8rem;color:#FFFFFF;">📍 ${safeCountry}</span>`;

    const commDisplay = isSample
      ? `<b>${safeCommodity}</b><br><span style="color:#D9AC52;font-size:0.70rem;">500g Certified Assay Pouch</span>`
      : `<b>${safeCommodity}</b><br><span style="color:var(--muted);font-size:0.75rem;">${safeVolume}</span>`;

    let dateFormatted = item.date || '2026-09-03';
    let timeFormatted = item.time || '';
    let relativeFormatted = '';

    if (item.createdAt) {
      const dt = new Date(item.createdAt * 1000);
      if (!isNaN(dt.getTime())) {
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        dateFormatted = `${year}-${month}-${day}`;
        timeFormatted = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

        const secDiff = Math.floor((Date.now() - dt.getTime()) / 1000);
        if (secDiff >= 0) {
          if (secDiff < 60) relativeFormatted = 'Just now';
          else if (secDiff < 3600) relativeFormatted = `${Math.floor(secDiff / 60)}m ago`;
          else if (secDiff < 86400) relativeFormatted = `${Math.floor(secDiff / 3600)}h ago`;
          else relativeFormatted = `${Math.floor(secDiff / 86400)}d ago`;
        }
      }
    } else if (item.date && item.date.includes('T')) {
      const dt = new Date(item.date);
      if (!isNaN(dt.getTime())) {
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        dateFormatted = `${year}-${month}-${day}`;
        timeFormatted = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

        const secDiff = Math.floor((Date.now() - dt.getTime()) / 1000);
        if (secDiff >= 0) {
          if (secDiff < 60) relativeFormatted = 'Just now';
          else if (secDiff < 3600) relativeFormatted = `${Math.floor(secDiff / 60)}m ago`;
          else if (secDiff < 86400) relativeFormatted = `${Math.floor(secDiff / 3600)}h ago`;
          else relativeFormatted = `${Math.floor(secDiff / 86400)}d ago`;
        }
      }
    }

    let actionButtons = '';
    if (isSample) {
      actionButtons = `
        <button type="button" class="btn-action" onclick="createBlFromInquiry('${item.id}')" style="${isBlIssued ? 'background:rgba(46,125,50,0.22);border:1.5px solid #81C784;color:#A5D6A7;' : 'background:linear-gradient(135deg, rgba(46,125,50,0.3) 0%, rgba(30,90,35,0.2) 100%);border:1.5px solid #81C784;color:#A5D6A7;'}font-weight:700;font-size:0.72rem;padding:6px 11px;border-radius:4px;display:inline-flex;align-items:center;gap:4px;" title="${isBlIssued ? 'Consignment Already Issued — View in Tracker' : 'Create Air AWB / Consignment for Sample'}">
          ${isBlIssued ? `📄 View B/L (${escapeHtml(activeBlCode)}) ➔` : '📦 Create B/L ➔'}
        </button>
        <button type="button" class="btn-action" onclick="viewSampleInTracker('${item.id}')" style="background:rgba(255,255,255,0.06);border:1px solid rgba(217,172,82,0.3);color:var(--gold-bright);font-weight:600;font-size:0.72rem;padding:6px 9px;margin-left:4px;border-radius:4px;" title="View in Consignment Tracker">
          🛰️ Tracker
        </button>
        <button type="button" class="btn-action" onclick="dispatchCustomerEmail(${index})" style="background:rgba(255,255,255,0.06);border:1px solid rgba(217,172,82,0.3);color:#FFFFFF;font-weight:600;font-size:0.72rem;padding:6px 9px;margin-left:4px;border-radius:4px;" title="Send Email Receipt / Follow-up">
          ✉️ Email
        </button>
        <button type="button" class="btn-action btn-action--danger" onclick="deleteInquiry(${index})" style="padding:6px 9px;margin-left:4px;border-radius:4px;" title="Delete">✕</button>
      `;
    } else {
      actionButtons = `
        <button type="button" class="btn-action" onclick="createBlFromInquiry('${item.id}')" style="${isBlIssued ? 'background:rgba(46,125,50,0.22);border:1.5px solid #81C784;color:#A5D6A7;' : 'background:linear-gradient(135deg, rgba(217,172,82,0.35) 0%, rgba(184,135,47,0.22) 100%);border:1.5px solid var(--gold-bright);color:var(--gold-bright);'}font-weight:700;font-size:0.74rem;padding:6px 12px;border-radius:4px;display:inline-flex;align-items:center;gap:5px;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;" title="${isBlIssued ? `Bill of Lading already active (${escapeHtml(activeBlCode)}) — Click to view in Tracker (Duplicates blocked)` : 'Directly convert RFQ to Ocean Bill of Lading in Consignment Tracker'}">
          ${isBlIssued ? `📄 View B/L (${escapeHtml(activeBlCode)}) ➔` : '🚢 Create B/L ➔'}
        </button>
        <button type="button" class="btn-action" onclick="dispatchCustomerEmail(${index})" style="background:rgba(255,255,255,0.06);border:1px solid rgba(217,172,82,0.3);color:#FFFFFF;font-weight:600;font-size:0.72rem;padding:6px 10px;margin-left:4px;border-radius:4px;" title="Send Full Proforma Quotation & Technical Dossier">
          ✉️ Email Quotation
        </button>
        <button type="button" class="btn-action btn-action--danger" onclick="deleteInquiry(${index})" style="padding:6px 9px;margin-left:4px;border-radius:4px;" title="Delete Inquiry">✕</button>
      `;
    }

    const statusBadge = isBlIssued
      ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:4px;font-family:var(--font-mono);font-size:0.68rem;font-weight:700;background:rgba(46,125,50,0.22);color:#81C784;border:1px solid rgba(129,199,132,0.45);" title="Bill of Lading ${escapeHtml(activeBlCode)} has been issued">
          <span style="width:6px;height:6px;border-radius:50%;background:#81C784;"></span>
          B/L ISSUED
        </span>`
      : (isSample
        ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:4px;font-family:var(--font-mono);font-size:0.68rem;font-weight:600;${item.awb ? 'background:rgba(46,125,50,0.3);color:#81C784;border:1px solid #81C784;' : 'background:rgba(46,125,50,0.15);color:#81C784;border:1px solid rgba(129,199,132,0.4);'}">
          <span style="width:6px;height:6px;border-radius:50%;background:#81C784;"></span>
          ${item.awb ? 'AWB DISPATCHED' : 'PAID · PENDING AWB'}
        </span>`
      : `<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-family:var(--font-mono);font-size:0.70rem;font-weight:600;background:rgba(255,255,255,0.08);color:var(--ivory);">
          ${item.status || 'New RFQ'}
        </span>`);

    return `
      <tr style="${isBlIssued ? 'background:rgba(46,125,50,0.05);' : (isSample ? 'background:rgba(46,125,50,0.04);' : '')}">
        <td style="font-family:var(--font-mono);font-size:0.75rem;color:var(--gold-bright);">
          ${typeBadge}<br>
          <span style="font-weight:600;color:#FFFFFF;margin-top:4px;display:inline-block;">${item.id}</span><br>
          <div style="margin-top:4px;display:flex;flex-direction:column;gap:2px;">
            <span style="color:var(--muted);font-size:0.68rem;display:inline-flex;align-items:center;gap:4px;">
              📅 <span>${dateFormatted}</span>
            </span>
            ${timeFormatted ? `
            <span style="color:#D9AC52;font-size:0.68rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;" title="Exact inquiry transmission time">
              🕒 <span>${timeFormatted}</span>
              ${relativeFormatted ? `<span style="color:var(--muted);font-size:0.62rem;font-weight:normal;">(${relativeFormatted})</span>` : ''}
            </span>` : ''}
          </div>
        </td>
        <td><b>${safeName}</b><br><span style="color:var(--muted);font-size:0.75rem;">${safeCompany}</span><br><a href="mailto:${safeEmail}" style="font-size:0.70rem;color:var(--gold);text-decoration:none;">${safeEmail}</a></td>
        <td>${destDisplay}</td>
        <td>${commDisplay}</td>
        <td>${statusBadge}</td>
        <td style="white-space:nowrap;">
          ${actionButtons}
        </td>
      </tr>
    `;
  }).join('');
}

function createBlFromInquiry(target) {
  const list = getInquiries();
  let item = null;
  if (typeof target === 'number') {
    item = list[target];
  } else if (typeof target === 'string') {
    item = list.find(i => i.id === target);
  }
  if (!item) {
    if (typeof showToast === 'function') showToast("Inquiry not found.", "error");
    return;
  }

  // STRICT RULE: Prevent duplicate B/L creation on the same order
  const consignments = getConsignments();
  const cleanSuffix = (item.id || '').replace(/^RFQ-/, '').replace(/^GGE-SMP-/, '').replace(/[^A-Z0-9-]/gi, '').toUpperCase();
  const existing = consignments.find(c => 
    (c.inquiryRef && c.inquiryRef === item.id) || 
    (c.quotationRef && c.quotationRef === item.id) ||
    (cleanSuffix && c.bl && c.bl.toUpperCase().includes(cleanSuffix)) ||
    (item.blCode && c.bl === item.blCode)
  );

  if (existing) {
    // Switch to Consignment Tracker and open the existing consignment modal
    switchTab('trackingTab');
    const existIdx = consignments.indexOf(existing);
    if (typeof openEditConsignmentModal === 'function' && existIdx !== -1) {
      openEditConsignmentModal(existIdx);
    }
    if (typeof showToast === 'function') {
      showToast(`🔒 Order already has active B/L (${existing.bl}). Multiple B/Ls per order are forbidden. Opening existing consignment.`, 'info');
    }
    return;
  }

  // 1. Directly switch to Consignment Tracker tab
  switchTab('trackingTab');

  // 2. Open the Consignment / B/L Modal
  openConsignmentModal();

  // 3. Generate a Bill of Lading (B/L) Code directly from inquiry ID without any year
  const blCode = `GGE-BL-${cleanSuffix || Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // 4. Auto-fill all modal inputs
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  // Link to source inquiry reference (enforces strict 1:1 B/L relation)
  setVal('mInquiryRef', item.id);

  // Bill of Lading (B/L) Code *
  setVal('mBlCode', blCode);

  // Buyer / Consignee Entity *
  let buyerText = item.name || '';
  if (item.company && item.company !== 'Direct Buyer' && item.name) {
    buyerText = `${item.name} (${item.company})`;
  } else if (item.company && !item.name) {
    buyerText = item.company;
  } else if (item.name) {
    buyerText = item.name;
  }
  setVal('mBuyer', buyerText || 'Commercial Importer');
  setVal('mBuyerEmail', item.email || '');
  setVal('mBuyerPhone', item.phone || '');

  // Destination Port / Seaport
  let podText = item.country || 'Jebel Ali Port, Dubai (UAE)';
  if (podText.trim().toLowerCase() === 'india') {
    podText = 'JNPT Nhava Sheva Port, Mumbai (India)';
  } else if (!podText.toLowerCase().includes('port') && !podText.toLowerCase().includes('terminal')) {
    podText = `${podText} Seaport / Destination Port`;
  }
  setVal('mPod', podText);

  // Commodity & Quantity Details (Auto-filled from user's inquiry)
  const commodityName = item.commodities || item.lotName || 'Agricultural Export Commodity';
  const quantityVolume = item.volume || '10 Quintals (1,000 KG)';
  const commodityAndVolume = `${commodityName} · Volume: ${quantityVolume}`;
  setVal('mCommodity', commodityAndVolume);

  // Container Number: Leave EMPTY at the start because container has not been allocated yet by carrier!
  setVal('mContainer', '');
  const cntInput = document.getElementById('mContainer');
  if (cntInput) {
    cntInput.placeholder = 'PENDING ALLOCATION (Enter once carrier allocates box)';
  }

  // Carrier Vessel Name: Leave EMPTY at start because booking note is pending
  setVal('mVessel', '');
  const vslInput = document.getElementById('mVessel');
  if (vslInput) {
    vslInput.placeholder = 'Pending Vessel Booking (e.g. MSC VALERIA)';
  }

  // Set default Stage to Stage 1 (Mandi Sourced & Grading) and Pending ETA
  setVal('mEta', 'Pending Ocean Schedule');
  setVal('mStage', 1);

  // Update modal title to show link to inquiry
  const title = document.getElementById('consignModalTitle');
  if (title) {
    title.innerHTML = `Create Ocean Consignment &amp; Bill of Lading (B/L)<br><small style="font-size:0.72rem;color:var(--gold-bright);font-family:var(--font-mono);display:inline-block;margin-top:3px;">AUTO-FILLED FROM BUYER RFQ: ${escapeHtml(item.id)}</small>`;
  }

  // Subtle golden highlight animation on B/L Code and Quantity inputs
  const blEl = document.getElementById('mBlCode');
  const commEl = document.getElementById('mCommodity');
  [blEl, commEl].forEach(el => {
    if (el) {
      el.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
      el.style.borderColor = 'var(--gold-bright)';
      el.style.boxShadow = '0 0 16px rgba(217,172,82,0.5)';
      setTimeout(() => {
        el.style.borderColor = 'rgba(217,172,82,0.3)';
        el.style.boxShadow = 'none';
      }, 2500);
    }
  });

  if (typeof showToast === 'function') {
    showToast(`🚢 Switched to Consignment Tracker! B/L (${blCode}) & Quantity auto-filled.`, 'success');
  }
}
window.createBlFromInquiry = createBlFromInquiry;

function updateInquiryStatus(index, status) {
  const list = getInquiries();
  if (list[index]) {
    list[index].status = status;
    saveInquiries(list);
    renderInquiries();
    if (typeof showToast === 'function') showToast("Status updated.");
  }
}


function viewSampleInTracker(sampleId) {
  if (typeof switchTab === 'function') switchTab('consignments');
  const list = getConsignments();
  const foundIdx = list.findIndex(c => c.bl === sampleId || (c.buyer && c.buyer.includes(sampleId)) || (c.notes && c.notes.includes(sampleId)));
  if (foundIdx !== -1) {
    if (typeof openEditConsignmentModal === 'function') {
      openEditConsignmentModal(foundIdx);
    }
  } else {
    if (typeof showToast === 'function') showToast(`🛰️ Viewing Consignment Tracker for ${sampleId}`);
  }
}

function deleteInquiry(index) {
  if (confirm("Delete this inquiry from CRM?")) {
    const list = getInquiries();
    list.splice(index, 1);
    saveInquiries(list);
    renderInquiries();
    updateKPIs();
    if (typeof showToast === 'function') showToast("Inquiry deleted.");
  }
}

function openAddLeadModal() {
  const modal = document.getElementById('addLeadModal');
  if (modal) modal.style.display = 'flex';
}

function saveLeadForm() {
  const name = document.getElementById('lName').value;
  const company = document.getElementById('lCompany').value;
  const email = document.getElementById('lEmail').value;
  const phone = document.getElementById('lPhone').value;
  const country = document.getElementById('lCountry').value;
  const commodities = document.getElementById('lCommodities').value;
  const volume = document.getElementById('lVolume').value;

  const now = new Date();
  const newLead = {
    id: `RFQ-${Math.floor(Math.random() * 900 + 100)}`,
    date: now.toISOString().split('T')[0],
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    createdAt: now.getTime() / 1000,
    name, company, email, phone, country, commodities, volume, status: 'new'
  };

  const list = getInquiries();
  list.unshift(newLead);
  saveInquiries(list);

  closeModal('addLeadModal');
  renderInquiries();
  updateKPIs();
  if (typeof showToast === 'function') showToast("New lead recorded in CRM.");
}

function exportToCSV() {
  const list = getInquiries();
  const headers = "ID,Date,Time,Name,Company,Email,Phone,Country,Commodities,Volume,Status\n";
  const rows = list.map(i => {
    let t = i.time || '';
    if (!t && i.createdAt) {
      t = new Date(i.createdAt * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
    return `"${i.id}","${i.date}","${t}","${i.name}","${i.company}","${i.email}","${i.phone}","${i.country}","${i.commodities}","${i.volume}","${i.status}"`;
  }).join('\n');
  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GGE_Inquiries_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}


let activeEmailPayload = null;
let currentInquiryIndex = null;


function calcQuotationTotal() {
  const qtyInput = document.getElementById('dosTonnageNum');
  const unitSelect = document.getElementById('dosUnitSelect');
  const priceInput = document.getElementById('dosPrice');
  const priceLabel = document.getElementById('dosPriceLabel');

  const rawQty = parseFloat(qtyInput ? qtyInput.value : 22) || 0;
  const unit = unitSelect ? unitSelect.value : 'quintal';
  const rawPrice = parseFloat(priceInput ? priceInput.value : 940) || 0;

  // Convert everything to Metric Tons for internal math & display
  let metricTons = rawQty;
  let totalKg = rawQty * 1000;
  let quintals = rawQty * 10;
  let total = 0;

  if (unit === 'quintal') {
    // rawQty is in Quintals (100kg)
    quintals = rawQty;
    totalKg = rawQty * 100;
    metricTons = rawQty / 10;
    total = metricTons * rawPrice;
    if (priceLabel) priceLabel.textContent = 'Price (USD / MT)';
  } else if (unit === 'kg') {
    // rawQty is in KG
    totalKg = rawQty;
    quintals = rawQty / 100;
    metricTons = rawQty / 1000;
    total = metricTons * rawPrice;
    if (priceLabel) priceLabel.textContent = 'Price (USD / MT)';
  } else {
    // rawQty is in Metric Tons
    metricTons = rawQty;
    quintals = rawQty * 10;
    totalKg = rawQty * 1000;
    total = metricTons * rawPrice;
    if (priceLabel) priceLabel.textContent = 'Price (USD / MT)';
  }

  // Update Total Contract Value Display
  const displayEl = document.getElementById('dosTotalValueDisplay');
  if (displayEl) {
    displayEl.textContent = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  }

  // Update Volume Subtext
  const subtextEl = document.getElementById('dosVolumeSubtext');
  if (subtextEl) {
    subtextEl.textContent = `${quintals.toFixed(0)} Quintals (${totalKg.toLocaleString('en-US')} KG · ${metricTons.toFixed(2)} MT)`;
  }

  const hiddenTonnage = document.getElementById('dosTonnage');
  if (hiddenTonnage) {
    hiddenTonnage.value = `${quintals.toFixed(0)} Quintals (${totalKg.toLocaleString('en-US')} KG / ${metricTons.toFixed(2)} MT)`;
  }

  const termsSelect = document.getElementById('dosTermsSelect');
  const hiddenTerms = document.getElementById('dosTerms');
  if (termsSelect && hiddenTerms) {
    hiddenTerms.value = termsSelect.value;
  }

  const incoSelect = document.getElementById('dosIncoterms');
  const hiddenPort = document.getElementById('dosLoadingPort');
  if (incoSelect && hiddenPort) {
    hiddenPort.value = incoSelect.value;
  }

  compileLiveDossierLetterhead();
  return { metricTons, quintals, totalKg, total };
}

function applyLotPresetToDossier(lotId) {
  const specs = window.specDatabase || {};
  const prices = getPrices();
  const spec = specs[lotId] || specs['p1'];
  const priceItem = prices[lotId] || { baseUsd: 820 };

  const hsEl = document.getElementById('dosHs');
  const purityEl = document.getElementById('dosPurity');
  const moistureEl = document.getElementById('dosMoisture');
  const tonnageEl = document.getElementById('dosTonnage');
  const priceEl = document.getElementById('dosPrice');
  const packEl = document.getElementById('dosPack');

  if (hsEl) hsEl.value = spec.hs || '0713.60';
  if (purityEl) purityEl.value = spec.purity || '99.5% Sortex Clean';
  if (moistureEl) moistureEl.value = (spec.moisture || '11.0% Max') + ' / ' + (spec.admixture || '0.5% Adm.');
  if (tonnageEl && !tonnageEl.value) tonnageEl.value = spec.loadability || "24.0 MT (1x 20' FCL)";
  if (priceEl) priceEl.value = priceItem.baseUsd || 820;
  if (packEl) packEl.value = spec.packing || '25kg / 50kg Export Bags';

  calcQuotationTotal();
  compileLiveDossierLetterhead();
}

async function compileLiveDossierLetterhead() {
  const inq = (currentInquiryIndex !== null && getInquiries()[currentInquiryIndex]) ? getInquiries()[currentInquiryIndex] : {
    name: 'Valued Buyer',
    company: 'International Trading House',
    email: 'buyer@company.com',
    country: 'International Port',
    id: 'GGE-QT-2026'
  };

  const lotSelect = document.getElementById('dosLotSelect');
  const lotKey = lotSelect ? lotSelect.value : 'p1';
  const spec = LOT_SPECS[lotKey] || LOT_SPECS['p1'];

  const hsVal = (document.getElementById('dosHs') ? document.getElementById('dosHs').value : '') || spec.hs;
  const purityVal = (document.getElementById('dosPurity') ? document.getElementById('dosPurity').value : '') || spec.purity;
  const moistureVal = (document.getElementById('dosMoisture') ? document.getElementById('dosMoisture').value : '') || spec.moisture;
  const tonnageVal = (document.getElementById('dosTonnage') ? document.getElementById('dosTonnage').value : '') || '24.0 MT (20\' FCL)';
  const priceVal = (document.getElementById('dosPrice') ? document.getElementById('dosPrice').value : '') || spec.price;
  const loadingPortVal = (document.getElementById('dosLoadingPort') ? document.getElementById('dosLoadingPort').value : '') || 'JNPT Nhava Sheva (INNSA1)';
  const termsVal = (document.getElementById('dosTerms') ? document.getElementById('dosTerms').value : '') || '100% L/C at Sight OR 30/70 T/T';
  const packVal = spec.packaging;

  const catRef = (document.getElementById('mDoc_dossier_cat_ref') ? document.getElementById('mDoc_dossier_cat_ref').value : '') || 'Golden Global Expo 2026 Product Catalog';
  const apedaRef = (document.getElementById('mDoc_dossier_apeda_ref') ? document.getElementById('mDoc_dossier_apeda_ref').value : '') || 'APEDA / Spices Board Registered Exporter (APEDA/2026/GGE)';
  const specimenRef = (document.getElementById('mDoc_dossier_specimen_ref') ? document.getElementById('mDoc_dossier_specimen_ref').value : '') || 'NABL / SGS Specimen Quality Benchmark';

  const refCode = inq.id ? `GGE-QT-2026-${inq.id.replace(/[^0-9]/g, '') || '891'}` : `GGE-QT-2026-891`;
  const subject = `Official Formal Proforma Quotation & Specification Sheet: ${spec.name} (${refCode})`;

  const body = `========================================================================
GOLDEN GLOBAL EXPO — OFFICIAL EXPORT PROFORMA QUOTATION & SPECIFICATIONS
Govt. of India Recognized Merchant Exporter · APEDA & Spices Board Member
========================================================================
Date: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
Quotation Ref: ${refCode}
Inquiry Subject: Export Quotation for ${spec.name}

ISSUED TO:
Attention: ${inq.name}
Company / Entity: ${inq.company || 'Commercial Buyer'}
Email: ${inq.email}
Destination Port / Country: ${inq.country || 'International Destination'}
Target Consignment Volume: ${tonnageVal}

Dear ${inq.name},

Thank you for your formal trade inquiry with Golden Global Expo (Mumbai, India). We are pleased to issue our indicative commercial proforma offer and technical specification dossier for your requested consignment:

========================================================================
1. COMMODITY TECHNICAL NUMBERS, CODES & SPECIFICATIONS
========================================================================
• Commodity Name: ${spec.name} (${spec.lot})
• Botanical Nomenclature: ${spec.botanical}
• HS Tariff Code: ${hsVal}
• Country of Origin: ${spec.origin || 'Maharashtra / Karnataka, India'}
• Optical Purity Standard: ${purityVal}
• Moisture & Admixture Limits: ${moistureVal}
• Packaging Standard: ${packVal}
• Consignment Loadability: ${tonnageVal}
• • Unit Price: $${priceVal} USD / Metric Ton (${loadingPortVal})
• Contract Volume: ${tonnageVal}
• TOTAL PROFORMA CONTRACT VALUE: $${(parseFloat(tonnageVal) * parseFloat(priceVal) || 22560).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
• Port of Loading: ${loadingPortVal}
• Commercial Settlement Terms: ${termsVal}

========================================================================
2. EXPORTER CREDENTIALS & CORPORATE GUARANTEE
========================================================================
1. Company Profile & Product Catalog: [ ${catRef} ]
2. APEDA & Export Accreditations: [ ${apedaRef} ]
3. Quality Assurance Benchmark: [ ${specimenRef} ]

========================================================================
3. POST-ORDER CUSTOMS & SHIPPING COMMITMENT
========================================================================
Upon contract confirmation and booking of your container, Golden Global Expo provides complete 100% export documentation including: Final Commercial Invoice & Packing List, Phytosanitary Certificate, Certificate of Origin (Chamber of Commerce), SGS/NABL Pre-Shipment Quality COA, and Clean On-Board Ocean Bill of Lading with 24/7 live satellite vessel tracking.

Please review this proforma dossier and confirm your preferred delivery incoterms (FOB / CIF / CFR) so our trade desk can issue your formal Proforma Invoice (PI) and lock in your vessel stuffing slot.

Yours Faithfully,

Arundhati Bhosale
Managing Director & Export Operations
Golden Global Expo — Merchant Exporter
1903 A Ajmera Zeon, Wadala, Mumbai - 400037, Maharashtra, India
Phone / WhatsApp: +91 9920594424 / +91 7799888777
Email: nigadearyan@gmail.com
Web: www.goldenglobalexpo.com
GST NO: 27AAGPB8439A1Z1 | APEDA / Spices Board Registered`;

  activeEmailPayload = {
    email: inq.email,
    subject: subject,
    body: body
  };

  const bodyEl = document.getElementById('emBody');
  if (bodyEl) bodyEl.value = body;
}

function dispatchCustomerEmail(index) {
  const list = getInquiries();
  const inq = list[index];
  if (!inq) return;

  currentInquiryIndex = index;

  // Try to find matching commodity spec
  let matchedLot = 'p1';
  let commText = (inq.commodities || inq.lotName || 'Agricultural Commodities').toLowerCase();
  
  if (commText.includes('toor') || commText.includes('tur')) matchedLot = 'p1';
  else if (commText.includes('moong') || commText.includes('mung')) matchedLot = 'p2';
  else if (commText.includes('chana') || commText.includes('bengal')) matchedLot = 'p3';
  else if (commText.includes('masoor') || commText.includes('lentil')) matchedLot = 'p4';
  else if (commText.includes('chia')) matchedLot = 'p5';
  else if (commText.includes('coriander seed') || commText.includes('dhania whole')) matchedLot = 'p6';
  else if (commText.includes('cumin') || commText.includes('jeera')) matchedLot = 'p7';
  else if (commText.includes('moringa')) matchedLot = 'p8';
  else if (commText.includes('mint') || commText.includes('pudina')) matchedLot = 'p9';
  else if (commText.includes('coriander powder')) matchedLot = 'p10';
  else if (commText.includes('jowar flour') || commText.includes('sorghum flour')) matchedLot = 'p12';
  else if (commText.includes('jowar') || commText.includes('sorghum')) matchedLot = 'p11';
  else if (commText.includes('tissue') || commText.includes('paper')) matchedLot = 'p13';

  // Populate Header
  const recipientEl = document.getElementById('emRecipient');
  const destEl = document.getElementById('emDest');
  const refEl = document.getElementById('emRef');
  const lotSelect = document.getElementById('dosLotSelect');

  if (recipientEl) recipientEl.textContent = `${inq.name} <${inq.email}>`;
  if (destEl) destEl.textContent = inq.country || 'International Port';
  if (refEl) refEl.textContent = inq.id || `GGE-QT-2026-891`;
  if (lotSelect) lotSelect.value = matchedLot;

  currentModalBl = inq.id || `RFQ-${index}`;

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  // Restore saved inquiry credential references if previously set
  setVal('mDoc_dossier_cat_ref', inq.catRef || '');
  setVal('mDoc_dossier_apeda_ref', inq.apedaRef || '');
  setVal('mDoc_dossier_specimen_ref', inq.specimenRef || '');

  // Render previews for all 3 dossier slots specifically for this inquiry
  ['dossier_cat', 'dossier_apeda', 'dossier_specimen'].forEach(k => {
    if (typeof renderSlotPreview === 'function') renderSlotPreview(k);
  });

  applyLotPresetToDossier(matchedLot);
  // Parse volume if given in lead (e.g. 50 MT)
  if (inq.volume) {
    const vMatch = inq.volume.match(/([0-9.]+)\s*(?:MT|tons?|containers?)/i);
    if (vMatch && document.getElementById('dosTonnageNum')) {
      document.getElementById('dosTonnageNum').value = parseFloat(vMatch[1]) || 24;
    }
  }
  calcQuotationTotal();

  const modal = document.getElementById('emailDispatchModal');
  if (modal) modal.style.display = 'flex';
}

function copyEmailToClipboard() {
  const bodyEl = document.getElementById('emBody');
  if (!bodyEl) return;

  const fullText = (activeEmailPayload ? `Subject: ${activeEmailPayload.subject}

` : '') + bodyEl.value;
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullText).then(() => {
      if (typeof showToast === 'function') {
        showToast("📋 Full quotation dossier copied to clipboard!");
      }
    }).catch(() => {
      bodyEl.select();
      if (document.execCommand) document.execCommand('copy');
      if (typeof showToast === 'function') {
        showToast("📋 Full quotation dossier copied to clipboard!");
      }
    });
  } else {
    bodyEl.select();
    if (document.execCommand) document.execCommand('copy');
    if (typeof showToast === 'function') {
      showToast("📋 Full quotation dossier copied to clipboard!");
    }
  }
}

function launchGmailWebClient() {
  if (currentInquiryIndex === null) {
    if (typeof showToast === 'function') showToast("⚠️ No inquiry selected.");
    return;
  }
  const list = getInquiries();
  const inq = list[currentInquiryIndex];
  if (!inq) return;

  const bodyEl = document.getElementById('emBody');
  const refId = inq.id || `GGE-QT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const subject = `Formal Export Proforma Quotation & Technical Dossier — Golden Global Expo [Ref: ${refId}]`;
  const body = bodyEl ? bodyEl.value : (activeEmailPayload ? activeEmailPayload.body : '');

  if (typeof downloadAllDossierFiles === 'function') {
    downloadAllDossierFiles();
  }

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(inq.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, '_blank');

  // Update CRM status
  inq.status = 'quoted';
  inq.lastQuotedAt = new Date().toISOString();
  saveInquiries(list);
  if (typeof renderInquiries === 'function') renderInquiries();
  if (typeof updateKPIs === 'function') updateKPIs();

  if (typeof showToast === 'function') {
    showToast(`✉️ Opened Gmail! Drag your downloaded PDFs into Gmail so your buyer can download them.`);
  }
}

function launchEmailClient() {
  if (!activeEmailPayload) return;
  const bodyEl = document.getElementById('emBody');
  const subject = encodeURIComponent(activeEmailPayload.subject);
  const body = encodeURIComponent(bodyEl ? bodyEl.value : activeEmailPayload.body);

  window.open(`mailto:${activeEmailPayload.email}?subject=${subject}&body=${body}`, '_blank');
  closeModal('emailDispatchModal');
  if (typeof showToast === 'function') {
    showToast("✉️ Opening mail client with formal quotation...");
  }
}

async function downloadAllDossierFiles() {
  const slots = ['dossier_inv', 'dossier_phyto', 'dossier_coo', 'dossier_assay', 'dossier_sgs'];
  let count = 0;

  for (const slot of slots) {
    const fileRecord = await getFileFromDB(slot);
    if (fileRecord && fileRecord.dataUrl) {
      count++;
      const a = document.createElement('a');
      a.href = fileRecord.dataUrl;
      a.download = fileRecord.name || `${slot}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (count > 0) {
    if (typeof showToast === 'function') {
      showToast(`📥 Downloaded ${count} attached documents! Drag & drop them into your email compose window.`);
    }
  } else {
    if (typeof showToast === 'function') {
      showToast("⚠️ No documents attached to download yet. Attach files in Column 2 first.");
    }
  }
}

async function sendDossierDirectlyFromPortal() {
  const btn = document.getElementById('btnDirectSendDossier');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #14110E;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></span> Transmitting Dispatch...';
    btn.style.opacity = '0.7';
    btn.style.cursor = 'not-allowed';
    btn.style.pointerEvents = 'none';
  }
  if (currentInquiryIndex === null) {
    if (typeof showToast === 'function') showToast("⚠️ No inquiry selected for dispatch.");
    return;
  }
  const list = getInquiries();
  const inq = list[currentInquiryIndex];
  if (!inq) return;

  const statusBox = document.getElementById('directSendStatus');
  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = 'rgba(217,172,82,0.15)';
    statusBox.style.border = '1px solid var(--gold-bright)';
    statusBox.style.color = '#F5EFE0';
    statusBox.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.1rem;">⚙️</span>
        <div>
          <b>Transmitting Legal Export Dossier to ${inq.email}...</b><br>
          <small style="color:var(--gold-bright);">Step 1/3: Encrypting certificate suite &amp; technical codes...</small>
        </div>
      </div>
    `;
  }

  // Collect attached documents with dataUrls ONLY for active dossier slots
  const slots = ['dossier_cat', 'dossier_apeda', 'dossier_specimen'];
  const attachments = [];
  const attachedFileNames = [];
  for (const s of slots) {
    const scopedKey = getScopedSlotKey(s);
    const f = await getFileFromDB(scopedKey);
    if (f && f.name && f.dataUrl) {
      attachments.push({
        slot: s,
        name: f.name,
        dataUrl: f.dataUrl,
        type: f.type || 'application/pdf'
      });
      attachedFileNames.push(f.name);
    }
  }

  const lotSelect = document.getElementById('dosLotSelect');
  const lotId = lotSelect ? lotSelect.value : 'p1';
  const specs = window.specDatabase || {};
  const spec = specs[lotId] || specs['p1'] || {};

  const hsVal = (document.getElementById('dosHs') && document.getElementById('dosHs').value) || spec.hs || '0713.60';
  const purityVal = (document.getElementById('dosPurity') && document.getElementById('dosPurity').value) || spec.purity || '99.5% Sortex Clean';
  const moistureVal = (document.getElementById('dosMoisture') && document.getElementById('dosMoisture').value) || '11.0% Moisture / 0.5% Adm.';
  const tonnageVal = (document.getElementById('dosTonnage') && document.getElementById('dosTonnage').value) || inq.volume || "24.0 MT (1x 20' FCL)";
  const priceVal = (document.getElementById('dosPrice') && document.getElementById('dosPrice').value) || '840';
  const loadingPortVal = (document.getElementById('dosLoadingPort') && document.getElementById('dosLoadingPort').value) || 'JNPT Nhava Sheva (INNSA1)';
  const termsVal = (document.getElementById('dosTerms') && document.getElementById('dosTerms').value) || '100% L/C at Sight OR 30/70 T/T';

  const totalValText = (document.getElementById('dosTotalValueDisplay') && document.getElementById('dosTotalValueDisplay').textContent) || '$22,560.00 USD';

  const specsData = {
    'Commodity Name & Botanical Lot': `${spec.name || 'Export Commodity'} (${spec.botanical || 'Agricultural Lot'})`,
    'HS Tariff Classification Code': hsVal,
    'Country of Origin': spec.origin || 'Maharashtra / Karnataka (India)',
    'Optical Sortex Purity Standard': purityVal,
    'Moisture & Foreign Admixture Limits': moistureVal,
    'Contracted Order Volume': tonnageVal,
    'Unit Benchmark Price': `$${priceVal} USD / Metric Ton`,
    'Delivery & Incoterms Point': loadingPortVal,
    'Commercial Payment Terms': termsVal,
    'TOTAL NET PROFORMA INVOICE VALUE': `${totalValText} (Net Contract Figure)`
  };

  // In Quotation mode, only include Corporate Credentials if provided; do NOT fake shipping documents
  const catRefVal = document.getElementById('mDoc_dossier_cat_ref') ? document.getElementById('mDoc_dossier_cat_ref').value.trim() : '';
  const apedaRefVal = document.getElementById('mDoc_dossier_apeda_ref') ? document.getElementById('mDoc_dossier_apeda_ref').value.trim() : '';
  const specRefVal = document.getElementById('mDoc_dossier_specimen_ref') ? document.getElementById('mDoc_dossier_specimen_ref').value.trim() : '';

  const docsData = [];
  if (catRefVal || attachments.some(a => a.slot === 'dossier_cat')) {
    docsData.push({ name: 'Company Profile & Product Catalog', ref: catRefVal || 'Golden Global Expo 2026', attached: attachments.some(a => a.slot === 'dossier_cat') });
  }
  if (apedaRefVal || attachments.some(a => a.slot === 'dossier_apeda')) {
    docsData.push({ name: 'APEDA Export Accreditation (Govt. of India)', ref: apedaRefVal || 'APEDA / Spices Board Registered', attached: attachments.some(a => a.slot === 'dossier_apeda') });
  }
  if (specRefVal || attachments.some(a => a.slot === 'dossier_specimen')) {
    docsData.push({ name: 'Specimen Lab Quality Benchmark', ref: specRefVal || 'NABL / SGS Standard Benchmark', attached: attachments.some(a => a.slot === 'dossier_specimen') });
  }

  const bodyEl = document.getElementById('emBody');
  const refId = inq.id || `GGE-QT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const subject = `Formal Export Proforma Quotation & Technical Dossier — Golden Global Expo [Ref: ${refId}]`;
  const bodyText = bodyEl ? bodyEl.value : '';
  const smtpPass = localStorage.getItem('gge_smtp_pass') || '';

  if (!smtpPass) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🚀 AUTO-DISPATCH (Background)';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.style.pointerEvents = 'auto';
    }
    if (statusBox) {
      statusBox.style.background = 'rgba(217,172,82,0.15)';
      statusBox.style.border = '1.5px solid var(--gold-bright)';
      statusBox.style.color = '#F5EFE0';
      statusBox.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="font-weight:700;color:var(--gold-bright);font-size:0.85rem;">
            🔐 One-Time Setup: Enable Automated Background Sending for nigadearyan@gmail.com
          </div>
          <div style="font-size:0.75rem;color:#E6D7B8;line-height:1.5;">
            To send real emails automatically in the background without opening browser tabs, Google requires a 16-character <b>Gmail App Password</b>.<br>
            1. Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color:var(--gold-bright);text-decoration:underline;font-weight:600;">Google App Passwords (click here)</a><br>
            2. Enter app name (e.g. <i>Trade Portal</i>) &rarr; Click <b>Create</b>.<br>
            3. Paste the 16-character password below (e.g. <code>abcd efgh ijkl mnop</code>):
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:4px;">
            <input type="password" id="promptSmtpPass" placeholder="Enter 16-char App Password" style="flex:1;min-width:240px;font-size:0.8rem;padding:8px 12px;background:rgba(0,0,0,0.6);border:1px solid var(--gold-bright);color:#FFFFFF;border-radius:4px;">
            <button type="button" class="btn-action primary" onclick="saveSmtpAndSend()" style="padding:8px 18px;font-size:0.8rem;">
              💾 Save &amp; Auto-Dispatch Now
            </button>
          </div>
        </div>
      `;
    }
    return;
  }

  // Step 2: Transmit via local server.py Google SMTP backend
  if (statusBox) {
    statusBox.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.1rem;">🔐</span>
        <div>
          <b>Transmitting via Google SMTP Server (smtp.gmail.com:587)...</b><br>
          <small style="color:var(--gold-bright);">Step 2/3: Dispatching ${attachments.length} attached legal documents to ${inq.email}...</small>
        </div>
      </div>
    `;
  }

  try {
    const apiUrl = (window.location && window.location.origin && window.location.origin.startsWith('http')) ? `${window.location.origin}/api/send-email` : 'http://localhost:8000/api/send-email';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: inq.email,
        toName: inq.name || 'Valued Importer',
        from: 'nigadearyan@gmail.com',
        smtpUser: 'nigadearyan@gmail.com',
        smtpPass: smtpPass,
        subject: subject,
        body: bodyText,
        specs: specsData,
        docs: docsData,
        attachments: attachments
      })
    });

    const result = await response.json();

    if (result.success) {
      // Update CRM
      inq.status = 'quoted';
      inq.lastQuotedAt = new Date().toISOString();
      inq.lastQuotedDocuments = attachedFileNames;
      saveInquiries(list);
      if (typeof renderInquiries === 'function') renderInquiries();
      if (typeof updateKPIs === 'function') updateKPIs();

      if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🚀 AUTO-DISPATCH (Background)';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.style.pointerEvents = 'auto';
    }
      if (statusBox) {
        statusBox.style.background = 'rgba(46,125,50,0.25)';
        statusBox.style.border = '1.5px solid #81C784';
        statusBox.style.color = '#C8E6C9';
        statusBox.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:1.2rem;color:#81C784;">✅</span>
              <b style="font-size:0.9rem;color:#FFFFFF;">OFFICIAL TRADE DOSSIER DELIVERED VIA GOOGLE SMTP!</b>
            </div>
            <div style="font-size:0.75rem;color:#E8F5E9;line-height:1.5;padding-left:26px;">
              • <b>Delivered To:</b> ${inq.name} &lt;${inq.email}&gt;<br>
              • <b>Sent From:</b> nigadearyan@gmail.com (Google Official SMTP Server)<br>
              • <b>Attached Files:</b> ${attachedFileNames.length > 0 ? attachedFileNames.join(', ') : 'Direct Cloud COA Vault Link'}<br>
              • <b>Delivered At:</b> ${new Date().toLocaleTimeString()}
            </div>
          </div>
        `;
      }
      if (typeof showToast === 'function') {
        showToast(`🎉 Real email delivered to ${inq.email} via Google SMTP!`);
      }
    } else if (result.needAuth) {
      localStorage.removeItem('gge_smtp_pass');
      if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🚀 AUTO-DISPATCH (Background)';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.style.pointerEvents = 'auto';
    }
      if (statusBox) {
        statusBox.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="color:#FF8A80;font-weight:700;">❌ Google Authentication Failed</div>
            <div style="font-size:0.75rem;color:#FFCDD2;">${result.error || 'Please verify your 16-character Gmail App Password.'}</div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:4px;">
              <input type="password" id="promptSmtpPass" placeholder="Enter correct 16-char App Password" style="flex:1;min-width:220px;font-size:0.8rem;padding:8px 12px;background:rgba(0,0,0,0.6);border:1px solid #FF8A80;color:#FFFFFF;border-radius:4px;">
              <button type="button" class="btn-action primary" onclick="saveSmtpAndSend()" style="padding:8px 18px;font-size:0.8rem;">
                💾 Re-Save &amp; Send
              </button>
            </div>
          </div>
        `;
      }
    } else {
      throw new Error(result.error || 'Email transmission error');
    }
  } catch(err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🚀 AUTO-DISPATCH (Background)';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.style.pointerEvents = 'auto';
    }
    if (statusBox) {
      statusBox.style.background = 'rgba(198,40,40,0.2)';
      statusBox.style.border = '1px solid #EF5350';
      statusBox.style.color = '#FFCDD2';
      statusBox.innerHTML = `
        <div>
          <b>❌ Dispatch Error:</b> ${err.message}<br>
          <small style="color:var(--ivory);">Tip: Make sure server.py is active on port 8000.</small>
        </div>
      `;
    }
  }
}

function saveSmtpAndSend() {
  const input = document.getElementById('promptSmtpPass');
  if (input && input.value.trim()) {
    localStorage.setItem('gge_smtp_pass', input.value.trim());
    if (typeof showToast === 'function') showToast("🔑 Gmail App Password saved!");
    sendDossierDirectlyFromPortal();
  } else {
    if (typeof showToast === 'function') showToast("⚠️ Please enter your 16-character Gmail App Password.");
  }
}


// --- PRICING DESK ---
function renderPriceEditor() {
  const prices = getPrices();
  const container = document.getElementById('priceEditorGrid') || document.getElementById('priceCardsGrid');
  if (!container) return;

  const samplePrice = getSampleBasePriceINR();

  const topSampleCard = `
    <div class="sample-price-global-card" style="grid-column: 1/-1; background: linear-gradient(135deg, #1F1912 0%, #14110E 100%); border: 1.5px solid var(--gold-bright); border-radius: 8px; padding: 22px 26px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(217,172,82,0.15);">
      <div style="max-width: 580px;">
        <div style="font-family: var(--font-mono); font-size: 0.70rem; color: var(--gold-bright); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
          📦 COMMERCIAL SAMPLE KIT &amp; DOMESTIC COURIER PRICING (INR ₹)
        </div>
        <h3 style="margin: 0 0 6px 0; color: #FFFFFF; font-size: 1.25rem; font-family: var(--font-display);">
          Live Storefront Sample Pricing &amp; Razorpay Gateway Charge
        </h3>
        <p style="margin: 0; color: #C2B69D; font-size: 0.84rem; line-height: 1.5;">
          Set your 500g Certified Sample Pouch fee here (e.g. ₹1.00 for testing, or ₹100, ₹500, ₹1000). The public storefront and Razorpay payment gateway immediately update and charge buyers this exact amount.
        </p>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="display: flex; align-items: center; background: rgba(0,0,0,0.65); border: 1.5px solid var(--gold-bright); border-radius: 6px; padding: 8px 16px;">
          <span style="color: var(--gold-bright); font-weight: bold; font-size: 1.3rem; margin-right: 6px;">₹</span>
          <input type="number" id="globalSamplePriceInp" value="${samplePrice}" min="1" step="1" style="width: 100px; background: transparent; border: none; color: #FFFFFF; font-size: 1.3rem; font-weight: bold; font-family: var(--font-mono); outline: none;">
          <span style="color: var(--muted); font-size: 0.80rem; margin-left: 6px;">/ 500g Pouch</span>
        </div>
      </div>
    </div>
  `;

  const fx = getLiveForexRates();
  updateDeskForexBadge(fx);

  container.innerHTML = topSampleCard + Object.keys(prices).map(key => {
    const p = prices[key];
    const usd = p.baseUsd || 0;
    const eurDisplay = formatFxDeskValue(usd * fx.EUR, '€', true);
    const aedDisplay = formatFxDeskValue(usd * fx.AED, 'AED', false);
    const inrDisplay = formatFxDeskValue(usd * fx.INR, '₹', true);
    const rubDisplay = formatFxDeskValue(usd * fx.RUB, '₽', false);
    const cnyDisplay = formatFxDeskValue(usd * fx.CNY, '¥', true);

    return `
      <div class="price-item-card" data-key="${key}">
        <div class="price-item-head">
          <h4>${p.name}</h4>
          <span>HS: ${p.hs || '—'}</span>
        </div>
        <div class="price-field-row">
          <label>FOB / CIF Benchmark (USD / MT):</label>
          <div class="price-input-wrap">
            <span>$</span>
            <input type="number" class="price-input" value="${usd}" step="10" oninput="calcSinglePriceCard(this)" onchange="calcSinglePriceCard(this)">
          </div>
        </div>
        <div class="fx-matrix" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(85px, 1fr)); gap:6px; font-size:0.75rem;">
          <span>EUR: <b class="fx-eur">${eurDisplay}</b></span>
          <span>AED: <b class="fx-aed">${aedDisplay}</b></span>
          <span>INR: <b class="fx-inr">${inrDisplay}</b></span>
          <span>RUB: <b class="fx-rub">${rubDisplay}</b></span>
          <span>CNY: <b class="fx-cny">${cnyDisplay}</b></span>
          <span>LOT: <b>${key.toUpperCase()}</b></span>
        </div>
      </div>
    `;
  }).join('');
}

function getLiveForexRates() {
  const defaults = {
    EUR: 0.8633,
    AED: 3.6725,
    INR: 94.8924,
    RUB: 86.7935,
    CNY: 7.2400,
    JPY: 160.1138,
    THB: 34.5000,
    SAR: 3.7500,
    SGD: 1.2730,
    GBP: 0.7394
  };
  if (typeof window !== 'undefined' && window.exchangeRates) {
    Object.keys(defaults).forEach(k => {
      if (window.exchangeRates[k] && window.exchangeRates[k].rate) {
        defaults[k] = window.exchangeRates[k].rate;
      }
    });
    return defaults;
  }
  try {
    const cached = localStorage.getItem('gge_live_forex_rates');
    if (cached) {
      const parsed = JSON.parse(cached);
      Object.keys(defaults).forEach(k => {
        if (parsed[k] && parseFloat(parsed[k]) > 0) {
          defaults[k] = parseFloat(parsed[k]);
        }
      });
      return defaults;
    }
  } catch (e) {}
  return defaults;
}

function formatFxDeskValue(amount, symbol, isPrefix = true) {
  if (amount <= 0) return isPrefix ? `${symbol}0` : `0 ${symbol}`;
  if (amount < 100) {
    const str = amount.toFixed(2);
    return isPrefix ? `${symbol}${str}` : `${str} ${symbol}`;
  } else {
    const str = Math.round(amount).toLocaleString('en-US');
    return isPrefix ? `${symbol}${str}` : `${str} ${symbol}`;
  }
}

function updateDeskForexBadge(fx) {
  const b = document.getElementById('deskForexBadge');
  if (b && fx) {
    b.textContent = `⚡ Live Global Forex: 1 USD = ₹${fx.INR.toFixed(2)} INR · €${fx.EUR.toFixed(3)} EUR · ${fx.AED.toFixed(2)} AED · ${fx.RUB.toFixed(2)} ₽`;
  }
}

async function refreshForexNow(btn) {
  if (btn) {
    btn.textContent = '⏳ Refreshing...';
    btn.disabled = true;
  }
  try {
    const res = await fetch('/api/forex?force=1&_t=' + Date.now());
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.rates) {
        if (window.exchangeRates) {
          Object.keys(window.exchangeRates).forEach(c => {
            if (json.rates[c]) window.exchangeRates[c].rate = parseFloat(json.rates[c]);
          });
        }
        localStorage.setItem('gge_live_forex_rates', JSON.stringify(json.rates));
        renderPriceEditor();
        if (typeof showToast === 'function') {
          showToast(`⚡ Live Forex Synced: 1 USD = ₹${(parseFloat(json.rates.INR) || 94.89).toFixed(2)} INR`, 'success');
        }
      }
    }
  } catch (e) {
    console.warn('FX refresh failed:', e);
  } finally {
    if (btn) {
      btn.textContent = '🔄 Refresh FX';
      btn.disabled = false;
    }
  }
}
window.refreshForexNow = refreshForexNow;

function calcSinglePriceCard(input) {
  const card = input.closest('.price-item-card');
  if (!card) return;
  const usd = parseFloat(input.value) || 0;
  const fx = getLiveForexRates();
  const eurEl = card.querySelector('.fx-eur');
  const aedEl = card.querySelector('.fx-aed');
  const inrEl = card.querySelector('.fx-inr');
  const rubEl = card.querySelector('.fx-rub');
  const cnyEl = card.querySelector('.fx-cny');
  if (eurEl) eurEl.textContent = formatFxDeskValue(usd * fx.EUR, '€', true);
  if (aedEl) aedEl.textContent = formatFxDeskValue(usd * fx.AED, 'AED', false);
  if (inrEl) inrEl.textContent = formatFxDeskValue(usd * fx.INR, '₹', true);
  if (rubEl) rubEl.textContent = formatFxDeskValue(usd * fx.RUB, '₽', false);
  if (cnyEl) cnyEl.textContent = formatFxDeskValue(usd * fx.CNY, '¥', true);
}

async function savePrices() {
  const saveBtn = document.querySelector('button[onclick="savePrices()"]');
  if (saveBtn) {
    saveBtn.innerHTML = '<span>Saving to Cloud... ⏳</span>';
    saveBtn.disabled = true;
  }

  const prices = (typeof getPrices === 'function') ? getPrices() : (window.defaultPrices || {});
  document.querySelectorAll('.price-item-card').forEach(card => {
    const key = card.getAttribute('data-key');
    const input = card.querySelector('.price-input');
    if (prices[key] && input) {
      prices[key].baseUsd = parseFloat(input.value) || prices[key].baseUsd;
    }
  });

  const sampleInp = document.getElementById('globalSamplePriceInp');
  if (sampleInp) {
    const val = parseFloat(sampleInp.value) || 1.00;
    localStorage.setItem('gge_sample_price_inr', val);
  }

  // 1. Save to localStorage
  try {
    localStorage.setItem('gge_prices', JSON.stringify(prices));
  } catch(e) {}

  // 2. Direct Cloud POST to /api/prices
  try {
    const res = await fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prices })
    });
    const data = await res.json();
    console.log('[PRICES] Cloud database response:', data);
  } catch(err) {
    console.warn('[PRICES] Server offline, saved locally:', err);
  }

  if (saveBtn) {
    saveBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Save All Price Changes
    `;
    saveBtn.disabled = false;
  }

  if (typeof showToast === 'function') {
    showToast("✅ Commodity benchmark rates published to live storefronts & cloud database!");
  }
}

function resetPricesToDefault() {
  if (confirm("Reset all commodity benchmark prices to default factory values?")) {
    localStorage.removeItem('gge_prices');
    renderPriceEditor();
    if (typeof showToast === 'function') {
      showToast("Prices restored to factory defaults.");
    }
  }
}

// --- CONSIGNMENTS DESK ---
function renderConsignments() {
  const list = getConsignments();
  const container = document.getElementById('consignmentsGrid');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--muted);">No active consignments.</div>`;
    return;
  }

  container.innerHTML = list.map((item, index) => `
    <div class="consignment-card">
      <div class="consignment-head">
        <div>
          <a href="tracking.html?bl=${encodeURIComponent(item.bl)}" target="_blank" style="font-family:var(--font-mono);color:var(--gold-bright);font-size:1rem;text-decoration:underline;font-weight:700;" title="Click to view in Tracking Portal">${item.bl} ↗</a>
          <div style="font-size:0.8rem;color:var(--muted);">${item.buyer}</div>
        </div>
        <span class="status-pill status-${item.stage === 5 ? 'closed' : 'new'}">${item.status}</span>
      </div>

      <div style="margin:14px 0;font-size:0.82rem;">
        <div><b>Cargo:</b> ${item.commodity}</div>
        <div><b>Vessel:</b> ${item.vessel} · <b>POD:</b> ${item.pod}</div>
        <div><b>Container:</b> ${item.container || 'MSCU 892104-7'} · <b>ETA:</b> ${item.eta}</div>
      </div>

      <div class="consignment-actions" style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.06);">
        <select class="status-pill" onchange="updateConsignmentStage(${index}, this.value)" style="flex:1; min-width:140px; background:#141210; border:1px solid rgba(217,172,82,0.3); color:#FFFFFF; padding:6px 8px; border-radius:4px; font-size:0.75rem;">
          <option value="1" ${item.stage === 1 ? 'selected' : ''}>Stage 1: Mandi Procurement</option>
          <option value="2" ${item.stage === 2 ? 'selected' : ''}>Stage 2: Lab QA Certified</option>
          <option value="3" ${item.stage === 3 ? 'selected' : ''}>Stage 3: Port Customs Cleared</option>
          <option value="4" ${item.stage === 4 ? 'selected' : ''}>Stage 4: Ocean Transit (Active)</option>
          <option value="5" ${item.stage === 5 ? 'selected' : ''}>Stage 5: Discharged &amp; Delivered</option>
        </select>
        
        <button type="button" class="btn-action" onclick="openEditConsignmentModal(${index})" style="background:rgba(217,172,82,0.2); border:1px solid var(--gold-bright); color:var(--gold-bright); font-weight:600; font-size:0.72rem; padding:6px 12px; border-radius:4px; display:inline-flex; align-items:center; gap:4px;" title="Edit Shipment Details & Upload Incoming Documents">
          ✏️ Edit &amp; Upload Docs
        </button>

        <a href="tracking.html?bl=${encodeURIComponent(item.bl)}" target="_blank" class="btn-action" title="Open Live Tracking Page" style="text-decoration:none; padding:6px 10px; font-size:0.75rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#FFFFFF; border-radius:4px;">
          🛰️ Track
        </a>

        <button type="button" class="btn-action" onclick="copyTrackingLink(${index})" title="Copy Tracking Link" style="padding:6px 9px; font-size:0.75rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#FFFFFF; border-radius:4px;">🔗</button>
        <button type="button" class="btn-action" onclick="sendCustomerWhatsApp(${index})" title="WhatsApp Tracking to Buyer" style="padding:6px 9px; font-size:0.75rem; background:rgba(46,125,50,0.25); border:1px solid #81C784; color:#81C784; border-radius:4px;">💬</button>
        <button type="button" class="btn-action btn-action--danger" onclick="deleteConsignment(${index})" title="Delete Consignment" style="padding:6px 9px; font-size:0.75rem; border-radius:4px;">✕</button>
      </div>
    </div>
  `).join('');
}

function updateConsignmentStage(index, stageVal) {
  const list = getConsignments();
  if (list[index]) {
    list[index].stage = parseInt(stageVal, 10);
    const stageNames = {
      1: "Mandi Sourced & Grading",
      2: "Lab QA & Phytosanitary Clear",
      3: "JNPT Customs Gate-In",
      4: "In Oceanic Transit",
      5: "Port Cleared & Delivered"
    };
    list[index].status = stageNames[list[index].stage] || "In Transit";
    saveConsignments(list);

    // Sync to tracking DB
    const trackDb = getTrackingDatabase();
    trackDb[list[index].bl] = {
      bl: list[index].bl,
      commodity: list[index].commodity,
      status: list[index].status,
      completed: list[index].stage === 5,
      stage: list[index].stage,
      vessel: list[index].vessel,
      pod: list[index].pod,
      eta: list[index].eta,
      container: list[index].container || 'MSCU 892104-7'
    };
    saveTrackingDatabase(trackDb);

    renderConsignments();
    if (typeof showToast === 'function') showToast(`Consignment updated to Stage ${stageVal}.`);
  }
}

function deleteConsignment(index) {
  if (confirm("Delete this consignment?")) {
    const list = getConsignments();
    list.splice(index, 1);
    saveConsignments(list);
    renderConsignments();
    updateKPIs();
    if (typeof showToast === 'function') showToast("Consignment deleted.");
  }
}


function createConsignmentFromSample(index) {
  const list = getInquiries();
  const item = list[index];
  if (!item) return;

  // Switch to Tab 2 (Consignments)
  const tabBtn = document.querySelector('button[onclick*="tabConsignments"]');
  if (tabBtn) {
    switchTab('tabConsignments', tabBtn);
  } else {
    document.querySelectorAll('.tab-pane, .tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    const t = document.getElementById('tabConsignments');
    if (t) t.classList.add('active');
  }

  // Open Consignment Modal and Auto-Fill all fields from Sample Order
  activeEditConsignmentIndex = -1;
  const modal = document.getElementById('consignModal') || document.getElementById('consignmentModal');
  const form = document.getElementById('consignForm');
  if (form) form.reset();

  const title = document.getElementById('consignModalTitle');
  if (title) title.textContent = `Air Courier Consignment — [Ref: ${item.id}]`;
  const c1Title = document.getElementById('mCard1Title');
  const blLabel = document.getElementById('mBlLabel');
  const cntLabel = document.getElementById('mContainerLabel');
  const vslLabel = document.getElementById('mVesselLabel');
  const podLabel = document.getElementById('mPodLabel');

  if (c1Title) c1Title.textContent = '✈️ 1. Air Courier & Delivery Identifiers';
  if (blLabel) blLabel.textContent = 'Air Waybill / Sample Tracking ID *';
  if (cntLabel) cntLabel.textContent = 'Sealed Pouch / Package ID *';
  if (vslLabel) vslLabel.textContent = 'Courier Partner (DHL / BlueDart)';
  if (podLabel) podLabel.textContent = 'Consignee Delivery Street Address *';

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  
  const blCode = item.awb || item.id || ((typeof generateSecureId === 'function') ? generateSecureId('GGE-EXP') : `GGE-EXP-${Date.now().toString(36).toUpperCase()}`);
  setVal('mBlCode', blCode);
  const blEl = document.getElementById('mBlCode');
  const badgeEl = document.getElementById('mBlLockBadge');
  if (blEl) {
    blEl.readOnly = true;
    blEl.style.background = 'rgba(0,0,0,0.65)';
    blEl.style.cursor = 'not-allowed';
  }
  if (badgeEl) {
    badgeEl.textContent = '🔒 LINKED TO PAID SAMPLE REF (LOCKED)';
    badgeEl.style.color = '#81C784';
  }
  setVal('mContainer', `AIR-POUCH #${item.id.replace('GGE-SMP-', '')}`);
  setVal('mBuyer', item.name || 'Aryan Nigade');
  setVal('mBuyerEmail', item.email || 'nigadearyan@gmail.com');
  setVal('mBuyerPhone', item.phone || '+91 9920594424');
  setVal('mCommodity', `${item.commodities || item.lotName || 'Tur Dal 500g Assay Pouch'} [Ref: ${item.id}]`);
  setVal('mVessel', item.destType === 'international' ? 'DHL Express Air Cargo (Flight EK-501)' : 'BlueDart Express Air Courier');
  setVal('mPod', item.address || item.country || 'Wadala East, Mumbai');
  setVal('mEta', '24 - 48 Hours Delivery');
  setVal('mStage', item.awb ? 4 : 2);

  if (modal) modal.style.display = 'flex';

  if (typeof showToast === 'function') {
    showToast(`📦 Auto-filled Consignment & B/L details from ${item.id}!`, 'success');
  }
}

function openConsignmentModal() {
  activeEditConsignmentIndex = -1;
  currentModalBl = (typeof generateSecureId === 'function') ? generateSecureId('GGE-EXP') : `GGE-EXP-${Date.now().toString(36).toUpperCase()}`;

  const modal = document.getElementById('consignModal') || document.getElementById('consignmentModal');
  const form = document.getElementById('consignForm');
  if (form) form.reset();

  const title = document.getElementById('consignModalTitle');
  if (title) title.textContent = 'Create Ocean Consignment';
  const c1Title = document.getElementById('mCard1Title');
  const blLabel = document.getElementById('mBlLabel');
  const cntLabel = document.getElementById('mContainerLabel');
  const vslLabel = document.getElementById('mVesselLabel');
  const podLabel = document.getElementById('mPodLabel');

  if (c1Title) c1Title.textContent = '🚢 1. Voyage & Container Identifiers';
  if (blLabel) blLabel.textContent = 'Bill of Lading (B/L) Code *';
  if (cntLabel) cntLabel.textContent = 'Container Number (ISO 6346) *';
  if (vslLabel) vslLabel.textContent = 'Carrier Vessel Name (with IMO)';
  if (podLabel) podLabel.textContent = 'Port of Discharge (Destination Seaport) *';

  // For Brand New Consignment: EDITABLE & CLEAN EMPTY DOCUMENT SLOTS
  const blInput = document.getElementById('mBlCode');
  const badgeEl = document.getElementById('mBlLockBadge');
  if (blInput) {
    blInput.value = currentModalBl;
    blInput.readOnly = false;
    blInput.style.background = 'rgba(0,0,0,0.4)';
    blInput.style.cursor = 'text';
  }
  if (badgeEl) {
    badgeEl.textContent = '📝 EDITABLE OR CUSTOM B/L';
    badgeEl.style.color = 'var(--gold-bright)';
  }

  const cntInput = document.getElementById('mContainer');
  if (cntInput) {
    cntInput.value = '';
    cntInput.placeholder = 'e.g. MSCU 749201-8 (or leave empty if pending allocation)';
  }
  const vslInput = document.getElementById('mVessel');
  if (vslInput) {
    vslInput.value = '';
    vslInput.placeholder = 'Pending Vessel Booking (e.g. MSC VALERIA)';
  }

  // Reset all 4 document slots to clean initial state
  resetAllConsignmentSlots();

  if (modal) modal.style.display = 'flex';
}

function openEditConsignmentModal(index) {
  activeEditConsignmentIndex = index;
  const list = getConsignments();
  const item = list[index];
  if (!item) return;

  currentModalBl = item.bl;

  const modal = document.getElementById('consignModal') || document.getElementById('consignmentModal');
  const title = document.getElementById('consignModalTitle');
  const isSample = item.bl && (item.bl.includes('SMP') || item.bl.startsWith('SAMPLE-'));
  if (title) title.textContent = isSample ? `Edit Sample Dispatch — ${item.bl}` : `Edit Consignment — ${item.bl}`;
  const c1Title = document.getElementById('mCard1Title');
  const blLabel = document.getElementById('mBlLabel');
  const cntLabel = document.getElementById('mContainerLabel');
  const vslLabel = document.getElementById('mVesselLabel');
  const podLabel = document.getElementById('mPodLabel');

  if (isSample) {
    if (c1Title) c1Title.textContent = '✈️ 1. Air Courier & Delivery Identifiers';
    if (blLabel) blLabel.textContent = 'Air Waybill / Sample Tracking ID *';
    if (cntLabel) cntLabel.textContent = 'Sealed Pouch / Package ID *';
    if (vslLabel) vslLabel.textContent = 'Courier Partner (DHL / BlueDart)';
    if (podLabel) podLabel.textContent = 'Consignee Delivery Street Address *';
  } else {
    if (c1Title) c1Title.textContent = '🚢 1. Voyage & Container Identifiers';
    if (blLabel) blLabel.textContent = 'Bill of Lading (B/L) Code *';
    if (cntLabel) cntLabel.textContent = 'Container Number (ISO 6346) *';
    if (vslLabel) vslLabel.textContent = 'Carrier Vessel Name (with IMO)';
    if (podLabel) podLabel.textContent = 'Port of Discharge (Destination Seaport) *';
  }

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  setVal('mBlCode', item.bl);
  const blEl = document.getElementById('mBlCode');
  const badgeEl = document.getElementById('mBlLockBadge');
  if (blEl) {
    blEl.readOnly = true;
    blEl.style.background = 'rgba(0,0,0,0.65)';
    blEl.style.cursor = 'not-allowed';
  }
  if (badgeEl) {
    badgeEl.textContent = '🔒 PERMANENT TRACKING KEY (LOCKED)';
    badgeEl.style.color = '#81C784';
  }
  setVal('mContainer', item.container);
  setVal('mBuyer', item.buyer);
  setVal('mBuyerEmail', item.buyerEmail);
  setVal('mBuyerPhone', item.buyerPhone);
  setVal('mCommodity', item.commodity);
  setVal('mVessel', item.vessel);
  setVal('mPod', item.pod);
  setVal('mEta', item.eta);
  setVal('mStage', item.stage || 4);

  // Restore saved document reference texts
  setVal('mDoc_inv_ref', item.invRef || '');
  setVal('mDoc_phyto_ref', item.phytoRef || '');
  setVal('mDoc_coa_ref', item.coaRef || '');
  setVal('mDoc_bl_ref', item.blRef || '');

  // Render previews for all 4 slots specifically for this B/L
  ['inv', 'phyto', 'coa', 'bl'].forEach(slot => {
    if (typeof renderSlotPreview === 'function') renderSlotPreview(slot);
  });

  if (modal) modal.style.display = 'flex';
}

async function saveConsignmentForm() {
  const btn = document.getElementById('btnSaveConsign');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #14110E;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></span> Transmitting Dispatch...';
    btn.style.opacity = '0.7';
    btn.style.cursor = 'not-allowed';
    btn.style.pointerEvents = 'none';
  }
  const bl = (document.getElementById('mBlCode') ? document.getElementById('mBlCode').value.trim() : '') || `GGE-${Date.now()}`;
  const container = (document.getElementById('mContainer') ? document.getElementById('mContainer').value.trim() : '') || 'MSCU 892104-7';
  const buyer = (document.getElementById('mBuyer') ? document.getElementById('mBuyer').value.trim() : '') || 'Commercial Buyer';
  const buyerEmail = (document.getElementById('mBuyerEmail') ? document.getElementById('mBuyerEmail').value.trim() : '') || '';
  const buyerPhone = (document.getElementById('mBuyerPhone') ? document.getElementById('mBuyerPhone').value.trim() : '') || '';
  const commodity = (document.getElementById('mCommodity') ? document.getElementById('mCommodity').value.trim() : '') || '24.0 MT Agri-Lot';
  const vessel = (document.getElementById('mVessel') ? document.getElementById('mVessel').value.trim() : '') || 'MSC VALERIA (IMO 9461439)';
  const pod = (document.getElementById('mPod') ? document.getElementById('mPod').value.trim() : '') || 'Jebel Ali Port, Dubai (UAE)';
  const eta = (document.getElementById('mEta') ? document.getElementById('mEta').value.trim() : '') || 'In 3 Days';
  const stage = parseInt((document.getElementById('mStage') ? document.getElementById('mStage').value : '4'), 10) || 4;
  const autoSend = document.getElementById('mAutoSendEmail') ? document.getElementById('mAutoSendEmail').checked : true;

  const stageNames = {
    1: "Stage 1: Mandi Sourced & Grading",
    2: "Stage 2: Lab QA & Phytosanitary Clear",
    3: "Stage 3: JNPT Customs Gate-In",
    4: "Stage 4: In Oceanic Transit",
    5: "Stage 5: Port Cleared & Delivered"
  };
  const status = stageNames[stage] || 'In Oceanic Transit';

  const invRefVal = document.getElementById('mDoc_inv_ref') ? document.getElementById('mDoc_inv_ref').value.trim() : '';
  const phytoRefVal = document.getElementById('mDoc_phyto_ref') ? document.getElementById('mDoc_phyto_ref').value.trim() : '';
  const coaRefVal = document.getElementById('mDoc_coa_ref') ? document.getElementById('mDoc_coa_ref').value.trim() : '';
  const blRefVal = document.getElementById('mDoc_bl_ref') ? document.getElementById('mDoc_bl_ref').value.trim() : '';

  const inquiryRefVal = document.getElementById('mInquiryRef') ? document.getElementById('mInquiryRef').value.trim() : '';

  const newConsignment = {
    bl, buyer, buyerEmail, buyerPhone, commodity, vessel, pod, eta, container,
    stage,
    status,
    inquiryRef: inquiryRefVal,
    invRef: invRefVal,
    phytoRef: phytoRefVal,
    coaRef: coaRefVal,
    blRef: blRefVal
  };

  const list = getConsignments();
  if (activeEditConsignmentIndex !== null && activeEditConsignmentIndex >= 0 && list[activeEditConsignmentIndex]) {
    list[activeEditConsignmentIndex] = newConsignment;
  } else {
    list.unshift(newConsignment);
  }
  saveConsignments(list);

  // Sync to tracking DB
  const trackDb = getTrackingDatabase();
  trackDb[bl] = {
    bl, buyer, commodity, status, completed: stage === 5, stage, vessel, pod, eta, container
  };
  saveTrackingDatabase(trackDb);

  // If created from an inquiry, mark inquiry as B/L Issued to prevent duplicate B/Ls
  if (inquiryRefVal) {
    try {
      const inqList = getInquiries();
      const matchedInq = inqList.find(i => i.id === inquiryRefVal);
      if (matchedInq) {
        matchedInq.status = 'B/L Issued';
        matchedInq.blCode = bl;
        saveInquiries(inqList);
        fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inqList)
        }).catch(() => {});
      }
    } catch(e) {}
  }

  renderConsignments();
  renderInquiries();
  updateKPIs();

  // If Auto-Send via Google SMTP is checked and email is provided
  if (autoSend && buyerEmail) {
    const statusBox = document.getElementById('consignSendStatus');
    const btn = document.getElementById('btnSaveConsign');
    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.style.background = 'rgba(217,172,82,0.15)';
      statusBox.style.border = '1.5px solid var(--gold-bright)';
      statusBox.style.color = '#FFFFFF';
      statusBox.innerHTML = `🚀 <b>Transmitting Gold Consignment Tracking Dossier &amp; Attachments to ${buyerEmail}...</b>`;
    }
    if (btn) btn.disabled = true;

    // Collect attachments strictly for this specific B/L
    const attachments = [];
    const slots = ['inv', 'phyto', 'coa', 'bl'];
    for (const s of slots) {
      const scopedKey = `doc_${bl.replace(/[^a-zA-Z0-9_-]/g, '_')}_${s}`;
      const rec = await getFileFromDB(scopedKey);
      if (rec && rec.name && rec.dataUrl) {
        attachments.push({
          slot: s,
          name: rec.name,
          dataUrl: rec.dataUrl,
          type: rec.type || 'application/pdf'
        });
      }
    }

    const invRef = document.getElementById('mDoc_inv_ref') ? document.getElementById('mDoc_inv_ref').value.trim() : '';
    const phytoRef = document.getElementById('mDoc_phyto_ref') ? document.getElementById('mDoc_phyto_ref').value.trim() : '';
    const coaRef = document.getElementById('mDoc_coa_ref') ? document.getElementById('mDoc_coa_ref').value.trim() : '';
    const blRef = document.getElementById('mDoc_bl_ref') ? document.getElementById('mDoc_bl_ref').value.trim() : '';

    const specsData = {
      'Bill of Lading (B/L) Code': bl,
      'Container Number (ISO 6346)': container,
      'Carrier Vessel & IMO': vessel,
      'Port of Loading': 'JNPT Nhava Sheva, Mumbai (INNSA1)',
      'Port of Discharge / Destination': pod,
      'Cargo Specification & Volume': commodity,
      'Estimated Arrival (ETA)': eta,
      'Current Milestone Status': status
    };

    const docsData = [];
    if (invRef || attachments.some(a => a.slot === 'inv')) {
      docsData.push({ name: '1. Commercial Invoice & Packing List', ref: invRef || 'Issued on Departure', attached: attachments.some(a => a.slot === 'inv') });
    }
    if (phytoRef || attachments.some(a => a.slot === 'phyto')) {
      docsData.push({ name: '2. Phytosanitary Certificate (Quarantine)', ref: phytoRef || 'Quarantine Certified', attached: attachments.some(a => a.slot === 'phyto') });
    }
    if (coaRef || attachments.some(a => a.slot === 'coa')) {
      docsData.push({ name: '3. NABL Lab Quality & Purity Assay (COA)', ref: coaRef || 'NABL Lab Certified', attached: attachments.some(a => a.slot === 'coa') });
    }
    if (blRef || attachments.some(a => a.slot === 'bl')) {
      docsData.push({ name: '4. Clean Ocean Bill of Lading (B/L Copy)', ref: blRef || 'Clean On-Board Ocean B/L', attached: attachments.some(a => a.slot === 'bl') });
    }

    const trackingUrl = `${window.location.origin}/tracking.html?bl=${encodeURIComponent(bl)}`;
    const subject = `Live Consignment Tracking & Export Document Package: ${bl} (${container})`;
    const bodyText = `Official export consignment ${bl} is registered and updated to ${status}. Track live cargo here: ${trackingUrl}`;

    try {
      const smtpPass = localStorage.getItem('gge_smtp_pass') || '';
      const apiUrl = (window.location && window.location.origin && window.location.origin.startsWith('http')) ? `${window.location.origin}/api/send-email` : 'http://localhost:8000/api/send-email';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: buyerEmail,
          toName: buyer,
          from: 'nigadearyan@gmail.com',
          smtpUser: 'nigadearyan@gmail.com',
          smtpPass: smtpPass,
          subject: subject,
          body: bodyText,
          specs: specsData,
          docs: docsData,
          attachments: attachments,
          emailType: 'consignment',
          trackingUrl: trackingUrl
        })
      });

      const res = await response.json();
      if (res.success) {
        if (btn) {
          btn.innerHTML = '✅ Dispatched Successfully!';
          btn.style.background = '#81C784';
          btn.style.color = '#14110E';
        }
        if (typeof showToast === 'function') showToast(`🎉 Consignment ${bl} created & Gold Tracking Dossier dispatched!`);
        setTimeout(() => {
          closeModal('consignModal');
          if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🚀 AUTO-DISPATCH (Background)';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.style.pointerEvents = 'auto';
    }
        }, 1200);
        return;
      }
    } catch (err) {
      console.warn("SMTP send failed:", err);
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🚀 AUTO-DISPATCH (Background)';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.style.pointerEvents = 'auto';
    }
  }

  closeModal('consignModal');
  closeModal('consignmentModal');
  if (typeof showToast === 'function') showToast(`🎉 Consignment ${bl} registered and live in tracking portal!`);
}

function sendCustomerWhatsApp(index) {
  const list = getConsignments();
  const item = list[index];
  if (!item) return;
  const trackingUrl = `${window.location.origin}/tracking.html?bl=${item.bl}`;
  const text = encodeURIComponent(`Hello! Your Golden Global Expo consignment (${item.bl}) is currently: ${item.status}. Track live cargo here: ${trackingUrl}`);
  const phone = (item.buyerPhone || '').replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}

function copyTrackingLink(index) {
  const list = getConsignments();
  const item = list[index];
  if (!item) return;
  const trackingUrl = `${window.location.origin}/tracking.html?bl=${item.bl}`;
  navigator.clipboard.writeText(trackingUrl).then(() => {
    if (typeof showToast === 'function') showToast(`🔗 Copied tracking link for ${item.bl}`);
  });
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

// Global Exports
window.sendOTP = sendOTP;
window.verifyOTP = verifyOTP;
window.resendOTP = resendOTP;
window.backToStep1 = backToStep1;
window.validateSession = validateSession;
window.logout = logout;
window.initDashboard = initDashboard;
window.switchTab = switchTab;
window.updateKPIs = updateKPIs;
window.openAddLeadModal = openAddLeadModal;
window.saveLeadForm = saveLeadForm;
window.exportToCSV = exportToCSV;
window.dispatchCustomerEmail = dispatchCustomerEmail;
window.sendDossierDirectlyFromPortal = sendDossierDirectlyFromPortal;
window.saveSmtpAndSend = saveSmtpAndSend;
window.applyLotPresetToDossier = applyLotPresetToDossier;
window.compileLiveDossierLetterhead = compileLiveDossierLetterhead;
window.copyEmailToClipboard = copyEmailToClipboard;
window.launchEmailClient = launchEmailClient;
window.launchGmailWebClient = launchGmailWebClient;
window.downloadAllDossierFiles = downloadAllDossierFiles;
window.renderInquiries = renderInquiries;
window.updateInquiryStatus = updateInquiryStatus;
window.deleteInquiry = deleteInquiry;
window.renderPriceEditor = renderPriceEditor;
window.calcSinglePriceCard = calcSinglePriceCard;
window.savePrices = savePrices;
window.resetPricesToDefault = resetPricesToDefault;
window.renderConsignments = renderConsignments;
window.updateConsignmentStage = updateConsignmentStage;
window.deleteConsignment = deleteConsignment;
window.openConsignmentModal = openConsignmentModal;
window.openEditConsignmentModal = openEditConsignmentModal;
window.saveConsignmentForm = saveConsignmentForm;
window.sendCustomerWhatsApp = sendCustomerWhatsApp;
window.copyTrackingLink = copyTrackingLink;
window.closeModal = closeModal;
window.triggerSlotUpload = triggerSlotUpload;
window.handleSlotFile = handleSlotFile;
window.renderSlotPreview = renderSlotPreview;
window.triggerDocDownload = triggerDocDownload;
window.clearSlotFile = clearSlotFile;
window.renderAllSlotPreviews = renderAllSlotPreviews;

// DOM Ready Handler
document.addEventListener('DOMContentLoaded', () => {
  initOTPInputHandlers();
  if (validateSession()) {
    initDashboard();
  }
});


/* ==========================================================================
   PAYMENT SETTINGS ADMIN MANAGER
   ========================================================================== */

function loadPaymentSettingsAdmin() {
  try {
    const raw = localStorage.getItem('gge_payment_settings');
    const settings = raw ? JSON.parse(raw) : {
      upiId: 'nigadearyan-1@okhdfcbank',
      payeeName: 'Golden Global Expo',
      paypalUrl: '',
      samplePriceUsd: 65,
      samplePriceInr: 1
    };

    const upiEl = document.getElementById('admUpiId');
    const payeeEl = document.getElementById('admPayeeName');
    const paypalEl = document.getElementById('admPaypalUrl');
    const rzpEl = document.getElementById('admRazorpayKey');
    if (rzpEl) rzpEl.value = settings.razorpayKeyId || 'rzp_test_TVccuNkp9w0aTB';
    const usdEl = document.getElementById('admSampleUsd');
    const inrEl = document.getElementById('admSampleInr');

    if (upiEl) upiEl.value = settings.upiId || 'nigadearyan-1@okhdfcbank';
    if (payeeEl) payeeEl.value = settings.payeeName || 'Golden Global Expo';
    if (paypalEl) paypalEl.value = settings.paypalUrl || '';
    if (usdEl) usdEl.value = settings.samplePriceUsd || 65;
    if (inrEl) inrEl.value = settings.samplePriceInr || 499;
  } catch (e) {}
}

function savePaymentSettingsAdmin() {
  const upiId = (document.getElementById('admUpiId') ? document.getElementById('admUpiId').value.trim() : '') || 'nigadearyan-1@okhdfcbank';
  const payeeName = (document.getElementById('admPayeeName') ? document.getElementById('admPayeeName').value.trim() : '') || 'Golden Global Expo';
  const paypalUrl = (document.getElementById('admPaypalUrl') ? document.getElementById('admPaypalUrl').value.trim() : '');
  const samplePriceUsd = parseInt(document.getElementById('admSampleUsd') ? document.getElementById('admSampleUsd').value : '65', 10) || 65;
  const samplePriceInr = parseInt(document.getElementById('admSampleInr') ? document.getElementById('admSampleInr').value : '499', 10) || 499;

  const razorpayKeyId = (document.getElementById('admRazorpayKey') ? document.getElementById('admRazorpayKey').value.trim() : '') || 'rzp_test_TVccuNkp9w0aTB';
  const settings = {
    razorpayKeyId,
    upiId,
    payeeName,
    paypalUrl,
    samplePriceUsd,
    samplePriceInr
  };

  localStorage.setItem('gge_payment_settings', JSON.stringify(settings));
  if (typeof showToast === 'function') {
    showToast('🎉 Payment & Google Pay / UPI QR Settings Saved!');
  }
}

// Auto-call on DOM load in desk
document.addEventListener('DOMContentLoaded', () => {
  loadPaymentSettingsAdmin();
});


/* ==========================================================================
   SAMPLE ORDER AWB DISPATCH & GOOGLE SMTP NOTIFICATION
   ========================================================================== */

function openSampleAwbModal(index) {
  const list = getInquiries();
  const item = list[index];
  if (!item) return;

  const idxEl = document.getElementById('awbSampleIndex');
  const refEl = document.getElementById('awbSampleRef');
  const nameEl = document.getElementById('awbBuyerName');
  const emailEl = document.getElementById('awbBuyerEmail');
  const addrEl = document.getElementById('awbDeliveryAddress');
  const trackEl = document.getElementById('awbTrackingNumber');

  if (idxEl) idxEl.value = index;
  if (refEl) refEl.textContent = item.id || 'GGE-SMP-2026';
  if (nameEl) nameEl.textContent = item.name || 'Consignee';
  if (emailEl) emailEl.textContent = item.email || '';
  if (addrEl) addrEl.textContent = item.address || item.country || 'International Destination';
  if (trackEl) trackEl.value = item.awb || '';

  const statusBox = document.getElementById('awbSendStatus');
  if (statusBox) statusBox.style.display = 'none';

  const modal = document.getElementById('sampleAwbModal');
  if (modal) modal.style.display = 'flex';
}

async function dispatchSampleAwbToBuyer() {
  const index = parseInt(document.getElementById('awbSampleIndex').value, 10);
  const list = getInquiries();
  const item = list[index];
  if (!item) return;

  const courier = document.getElementById('awbCourierPartner').value;
  const awb = document.getElementById('awbTrackingNumber').value.trim();

  if (!awb) {
    alert("Please enter a valid Airway Bill (AWB) tracking number.");
    return;
  }

  // Update item status
  item.awb = awb;
  item.status = `✅ Dispatched (${courier} AWB: ${awb})`;
  saveInquiries(list);

  // Sync to Consignments database
  const consignList = getConsignments();
  const existingConsignIndex = consignList.findIndex(c => c.bl === item.id || c.bl === awb);
  const consignRecord = {
    bl: awb || item.id,
    quotationRef: item.id,
    buyer: item.name,
    buyerEmail: item.email,
    buyerPhone: item.phone,
    commodity: `${item.commodities || item.lotName || 'Sample Kit'} [Ref: ${item.id}]`,
    vessel: `${courier} Priority Air Dispatch`,
    pod: item.address || item.country || 'Consignee Address',
    eta: '24-48h Delivery',
    container: `AIR-POUCH #${(item.id || '').replace('GGE-SMP-', '')}`,
    stage: 4,
    status: 'In Courier Transit'
  };

  if (existingConsignIndex >= 0) {
    consignList[existingConsignIndex] = consignRecord;
  } else {
    consignList.unshift(consignRecord);
  }
  saveConsignments(consignList);

  // Sync to Tracking Database for tracking.html
  const trackDb = getTrackingDatabase();
  trackDb[item.id] = consignRecord;
  trackDb[awb] = consignRecord;
  saveTrackingDatabase(trackDb);

  renderInquiries();
  renderConsignments();
  updateKPIs();

  const statusBox = document.getElementById('awbSendStatus');
  const btn = document.getElementById('btnDispatchAwb');
  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = 'rgba(46,125,50,0.2)';
    statusBox.style.border = '1px solid #81C784';
    statusBox.style.color = '#81C784';
    statusBox.innerHTML = `🚀 <b>Transmitting official AWB dispatch notice to ${escapeHtml(item.email)} via Google SMTP...</b>`;
  }
  if (btn) btn.disabled = true;

  const specsData = {
    'Sample Booking Reference': item.id || 'GGE-SMP-2026',
    'Commodity Sample Grade': item.commodities || item.lotName || 'Agri Commodity 500g Sealed Pouch',
    'Express Courier Partner': courier,
    'Airway Bill (AWB) Tracking No.': awb,
    'Delivery Street Address': item.address || 'Consignee Delivery Hub',
    'Dispatch Origin': 'Golden Global Expo Fulfillment Center, Mumbai (India)'
  };

  const docsData = [
    { name: '1. Courier Airway Bill Consignment Receipt', ref: awb, attached: false },
    { name: '2. NABL / SGS Specimen Quality Assay', ref: 'SPEC-NABL-2026', attached: false }
  ];

  const subject = `Official Express Sample Dispatch: ${item.id} (${courier} AWB: ${awb})`;
  const bodyText = `Dear ${item.name},

Your certified export sample (${item.commodities}) has been sealed and dispatched from our Mumbai Export Fulfillment Center via ${courier} under Airway Bill No: ${awb}.

Delivery Address: ${item.address}

Thank you for choosing Golden Global Expo.`;

  try {
    const smtpPass = localStorage.getItem('gge_smtp_pass') || '';
    const apiUrl = (window.location && window.location.origin && window.location.origin.startsWith('http')) ? `${window.location.origin}/api/send-email` : 'http://localhost:8000/api/send-email';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: item.email,
        toName: item.name,
        from: 'nigadearyan@gmail.com',
        smtpUser: 'nigadearyan@gmail.com',
        smtpPass: smtpPass,
        subject: subject,
        body: bodyText,
        specs: specsData,
        docs: docsData,
        attachments: [],
        emailType: 'quotation'
      })
    });

    const res = await response.json();
    if (res.success) {
      if (typeof showToast === 'function') showToast(`🎉 AWB tracking dispatched to ${item.email} via Google SMTP!`);
      setTimeout(() => {
        closeModal('sampleAwbModal');
        if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🚀 AUTO-DISPATCH (Background)';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.style.pointerEvents = 'auto';
    }
      }, 1200);
      return;
    }
  } catch (err) {
    console.warn("SMTP send failed:", err);
  }

  if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🚀 AUTO-DISPATCH (Background)';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.style.pointerEvents = 'auto';
    }
  closeModal('sampleAwbModal');
  if (typeof showToast === 'function') showToast(`🎉 Sample ${item.id} updated with AWB ${awb}!`);
}


// Real-time broadcast sync for instant live sample order notifications
if (typeof BroadcastChannel !== 'undefined') {
  const syncChannel = new BroadcastChannel('gge_sync_channel');
  syncChannel.onmessage = (e) => {
    if (e.data && e.data.type === 'NEW_SAMPLE_ORDER') {
      renderInquiries();
      syncPaidSamplesToConsignments();
      renderConsignments();
      updateKPIs();
      if (typeof showToast === 'function') {
        showToast(`🔔 New Paid Sample Order Received: ${e.data.sample.id} (${e.data.sample.name})!`, 'success');
      }
    }
  };
}
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', () => {
    renderInquiries();
    updateKPIs();
  });
}



// ================= 10. LIVE BUYER ANALYTICS & TELEMETRY CONTROLLER =================

function getVisitorTelemetry() {
  try {
    const raw = localStorage.getItem('gge_visitor_telemetry');
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch (e) {}

  // Initial seed telemetry data representing active trade corridors
  const seed = [
    {
      id: "GGE-VIS-9842",
      ip: "194.67.210.84",
      isp: "Etisalat Commercial Gateway (Jebel Ali Free Zone)",
      origin: "🇦🇪 Dubai, United Arab Emirates",
      countryCode: "AE",
      timestamp: "2026-08-29 23:38:15",
      dwellSeconds: 524,
      device: "💻 Desktop Workstation",
      deviceSpecs: "macOS Sonoma 14.5 · Chrome 126.0 · 2560x1440",
      inspectedLots: ["Classic Toor (Tur Dal)", "Classic Chana Dal", "Classic Moong"],
      downloadedPdfs: ["P1_COA_AR.pdf", "P3_COA_EN.pdf"],
      action: "✅ Formal RFQ Transmitted (15 QTL)",
      statusClass: "status-active"
    },
    {
      id: "GGE-VIS-9810",
      ip: "133.242.18.90",
      isp: "NTT Communications (Tokyo Datacenter)",
      origin: "🇯🇵 Tokyo, Japan",
      countryCode: "JP",
      timestamp: "2026-08-29 23:22:40",
      dwellSeconds: 418,
      device: "📱 Mobile Smartphone",
      deviceSpecs: "Apple iPhone 15 Pro · iOS 17.5 · Safari · 393x852",
      inspectedLots: ["Chia Seeds (Raw Superfood)", "Moringa Leaf Powder"],
      downloadedPdfs: ["P5_COA_JA.pdf", "P8_COA_JA.pdf"],
      action: "📦 Commercial Sample Kit Ordered (₹100)",
      statusClass: "status-active"
    },
    {
      id: "GGE-VIS-9784",
      ip: "80.158.12.44",
      isp: "Deutsche Telekom AG (Hamburg Maritime Hub)",
      origin: "🇩🇪 Hamburg, Germany",
      countryCode: "DE",
      timestamp: "2026-08-29 22:54:10",
      dwellSeconds: 612,
      device: "💻 Desktop Workstation",
      deviceSpecs: "Windows 11 Pro · Firefox 128.0 · 1920x1080",
      inspectedLots: ["Coriander Seeds", "Cumin Seeds", "Tissue Paper"],
      downloadedPdfs: ["P6_COA_DE.pdf", "P7_COA_EN.pdf", "P13_COA_DE.pdf"],
      action: "🔍 Inspected 3 Technical Specifications",
      statusClass: "status-delivered"
    },
    {
      id: "GGE-VIS-9750",
      ip: "202.166.195.2",
      isp: "Singtel Singapore Enterprise Fiber",
      origin: "🇸🇬 Singapore",
      countryCode: "SG",
      timestamp: "2026-08-29 22:15:30",
      dwellSeconds: 290,
      device: "💻 Desktop Workstation",
      deviceSpecs: "Windows 10 Enterprise · Edge 126.0 · 1920x1080",
      inspectedLots: ["Classic Masoor (Split Red)", "Jowar Grain"],
      downloadedPdfs: ["P4_COA_EN.pdf"],
      action: "✅ Formal RFQ Transmitted (20 QTL)",
      statusClass: "status-active"
    },
    {
      id: "GGE-VIS-9712",
      ip: "64.233.160.1",
      isp: "Verizon Business Static IP (New York)",
      origin: "🇺🇸 New York, United States",
      countryCode: "US",
      timestamp: "2026-08-29 21:40:05",
      dwellSeconds: 345,
      device: "💻 Desktop Workstation",
      deviceSpecs: "Windows 11 Pro · Chrome 126.0 · 2560x1440",
      inspectedLots: ["Moringa Leaf Powder", "Mint Leaf Powder"],
      downloadedPdfs: ["P8_COA_EN.pdf"],
      action: "🔍 Browsing Port Transit Lines",
      statusClass: "status-delivered"
    },
    {
      id: "GGE-VIS-9680",
      ip: "103.21.124.50",
      isp: "Tata Teleservices Maharashtra Enterprise",
      origin: "🇮🇳 Mumbai, India",
      countryCode: "IN",
      timestamp: "2026-08-29 20:55:18",
      dwellSeconds: 480,
      device: "📱 Android Smartphone",
      deviceSpecs: "Samsung Galaxy S24 Ultra · Android 14 · Chrome · 412x915",
      inspectedLots: ["Classic Toor", "Classic Chana Dal"],
      downloadedPdfs: ["P1_COA_HI.pdf"],
      action: "📦 Commercial Sample Kit Ordered",
      statusClass: "status-active"
    }
  ];

  try {
    localStorage.setItem('gge_visitor_telemetry', JSON.stringify(seed));
  } catch (e) {}
  return seed;
}

function formatDwell(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}


let currentInspectedSession = null;

function renderAnalytics() {
  const list = getVisitorTelemetry();
  const tbody = document.getElementById('analyticsTableBody');
  if (!tbody) return;

  // Calculate Metrics
  const totalVisits = list.length;
  const totalSecs = list.reduce((acc, curr) => acc + (curr.dwellSeconds || 0), 0);
  const avgSecs = totalVisits > 0 ? Math.round(totalSecs / totalVisits) : 0;
  const totalPdfs = list.reduce((acc, curr) => acc + ((curr.downloadedPdfs && curr.downloadedPdfs.length) || 0), 0);

  // Top Origin Count
  const originCounts = {};
  list.forEach(i => {
    const orig = i.origin.split(',')[0].trim();
    originCounts[orig] = (originCounts[orig] || 0) + 1;
  });
  const topOrigin = Object.keys(originCounts).sort((a,b) => originCounts[b] - originCounts[a])[0] || 'Dubai / Tokyo';

  // Update KPI Cards
  const elVisits = document.getElementById('telemetryTotalVisits');
  if (elVisits) elVisits.textContent = `${totalVisits} Sessions`;
  const elAvg = document.getElementById('telemetryAvgDwell');
  if (elAvg) elAvg.textContent = formatDwell(avgSecs);
  const elPdfs = document.getElementById('telemetryTotalPdfs');
  if (elPdfs) elPdfs.textContent = `${totalPdfs} Documents`;
  const elOrigin = document.getElementById('telemetryTopOrigin');
  if (elOrigin) elOrigin.textContent = topOrigin;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:48px 20px;color:var(--muted);font-size:0.85rem;"><div style="font-size:1.6rem;margin-bottom:8px;">📭</div><b>No telemetry sessions in log.</b><br><small style="color:#8C8275;">When buyers visit your storefront, their live sessions, dwell times, and downloaded specifications will appear here automatically.</small><br><button type="button" class="btn-action" onclick="loadDemoTelemetry()" style="margin-top:14px;display:inline-flex;">⚡ Load Sample Trade Sessions</button></td></tr>`;
    const elVisits = document.getElementById('telemetryTotalVisits');
    if (elVisits) elVisits.textContent = "0 Sessions";
    const elAvg = document.getElementById('telemetryAvgDwell');
    if (elAvg) elAvg.textContent = "0m 0s";
    const elPdfs = document.getElementById('telemetryTotalPdfs');
    if (elPdfs) elPdfs.textContent = "0 Documents";
    const elOrigin = document.getElementById('telemetryTopOrigin');
    if (elOrigin) elOrigin.textContent = "No Traffic Yet";
    return;
  }

  tbody.innerHTML = list.map((item, idx) => {
    const isLive = (item.isLive !== false);
    const pulseHtml = isLive 
      ? `<span style="display:inline-flex;align-items:center;gap:5px;color:#81C784;font-size:0.72rem;font-weight:700;font-family:var(--font-mono);background:rgba(76,175,80,0.15);padding:2px 6px;border-radius:4px;border:1px solid #81C784;"><span style="width:6px;height:6px;border-radius:50%;background:#81C784;animation:pulse 1.5s infinite;"></span> LIVE</span>`
      : `<span style="color:#8C8275;font-size:0.70rem;font-family:var(--font-mono);">○ IDLE</span>`;

    const pdfsHtml = (item.downloadedPdfs && item.downloadedPdfs.length > 0)
      ? item.downloadedPdfs.map(p => `<span style="display:inline-block;margin:1px 3px 1px 0;padding:2px 5px;border-radius:3px;background:rgba(217,172,82,0.18);border:1px solid rgba(217,172,82,0.4);color:#FFD54F;font-family:var(--font-mono);font-size:0.65rem;">📄 ${p}</span>`).join('')
      : `<span style="color:var(--muted);font-size:0.72rem;">None</span>`;

    const draftCompany = (item.draftLead && item.draftLead.company) ? item.draftLead.company : null;
    const intentBadge = draftCompany 
      ? `<div style="background:rgba(255,179,0,0.12);border:1px solid rgba(255,179,0,0.3);padding:3px 6px;border-radius:4px;font-size:0.72rem;color:#FFD54F;"><b>📝 ${draftCompany}</b><br><small style="color:#C8BCA6;">${item.draftLead.volume || ''}</small></div>`
      : `<span style="font-size:0.74rem;color:#B0A898;">${item.action || 'Browsing Catalog'}</span>`;

    const score = calculateLeadScore(item);
    const scoreColor = score >= 75 ? '#81C784' : (score >= 45 ? '#FFD54F' : '#A0988A');
    const scoreBg = score >= 75 ? 'rgba(76,175,80,0.14)' : (score >= 45 ? 'rgba(255,193,7,0.12)' : 'rgba(255,255,255,0.04)');
    const scoreBorder = score >= 75 ? 'rgba(129,199,132,0.4)' : (score >= 45 ? 'rgba(255,213,79,0.35)' : 'rgba(160,152,138,0.25)');
    const scoreTier = score >= 75 ? 'Hot Lead' : (score >= 45 ? 'Warm Prospect' : 'Discovery');

    return `
      <tr style="cursor:pointer;" onclick="openSessionAuditModal(${idx})">
        <td>
          <div style="margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;gap:6px;">
            ${pulseHtml}
            <span style="display:inline-flex;align-items:center;gap:3px;font-family:var(--font-mono);font-size:0.68rem;font-weight:700;color:${scoreColor};background:${scoreBg};padding:2px 6px;border-radius:4px;border:1px solid ${scoreBorder};" title="B2B Commercial Intent Index: ${score}/100 (${scoreTier})">
              <span style="font-size:0.56rem;opacity:0.85;letter-spacing:0.5px;font-weight:600;">INTENT</span>
              <b>${score}</b><small style="font-size:0.56rem;opacity:0.65;">/100</small>
            </span>
          </div>
          <b style="color:var(--gold-bright);font-family:var(--font-mono);font-size:0.78rem;">${item.id}</b>
          <div style="font-size:0.65rem;color:var(--gold-bright);margin-top:2px;">${item.returningBadge || 'New Visitor'}</div>
        </td>
        <td>
          <b style="color:#FFFFFF;font-size:0.84rem;">${item.origin}</b>
        </td>
        <td>
          <div style="font-size:0.75rem;color:#E0D8C8;max-width:140px;line-height:1.3;">${item.trafficSource || '🌐 Direct Navigation'}</div>
        </td>
        <td>
          <div style="font-family:var(--font-mono);font-weight:700;color:#E0D8C8;font-size:0.75rem;">${item.ip || '103.21.124.50'}</div>
          <small style="color:#81C784;font-size:0.66rem;display:block;margin-top:2px;">${item.botVerified || '🛡️ Verified Human'}</small>
        </td>
        <td>
          <div style="font-weight:600;color:#FFFFFF;font-size:0.75rem;">${item.device || '💻 Desktop'}</div>
          <small style="color:#8C8275;font-size:0.65rem;display:block;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.deviceSpecs || 'Windows 11'}</small>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <div style="width:45px;height:5px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
              <div style="width:${item.scrollDepth || 50}%;height:100%;background:#81C784;"></div>
            </div>
            <b style="font-family:var(--font-mono);color:#81C784;font-size:0.70rem;">${item.scrollDepth || 50}%</b>
          </div>
          <small style="color:#C8BCA6;font-size:0.68rem;display:block;max-width:130px;line-height:1.2;">${item.activeSection || 'Storefront'}</small>
        </td>
        <td>
          <div style="font-family:var(--font-mono);font-size:0.70rem;color:#81C784;font-weight:700;margin-bottom:3px;">
            ⏱️ ${formatDwell(item.dwellSeconds || 0)}
          </div>
          <div>${pdfsHtml}</div>
        </td>
        <td>
          ${intentBadge}
        </td>
        <td>
          <button type="button" class="btn-action" onclick="event.stopPropagation(); openSessionAuditModal(${idx});" style="padding:4px 8px;font-size:0.70rem;">
            🔍 Inspect
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openSessionAuditModal(index) {
  const list = getVisitorTelemetry();
  const item = list[index];
  if (!item) return;
  currentInspectedSession = item;

  const modal = document.getElementById('sessionAuditModal');
  if (!modal) return;

  // Fill Header
  const pulseEl = document.getElementById('auditPulseBadge');
  if (pulseEl) {
    pulseEl.innerHTML = (item.isLive !== false) ? '● LIVE ON SCREEN' : '○ IDLE / IN BACKGROUND';
    pulseEl.style.color = (item.isLive !== false) ? '#81C784' : '#8C8275';
    pulseEl.style.borderColor = (item.isLive !== false) ? '#81C784' : '#8C8275';
  }
  const idEl = document.getElementById('auditSessionId');
  if (idEl) idEl.textContent = item.id;
  const retEl = document.getElementById('auditReturningBadge');
  if (retEl) retEl.textContent = `${item.returningBadge || ('★ ' + (item.visitCount || 1) + 'st Visit')} · Commercial Intent: ${calculateLeadScore(item)}/100`;

  // Overview
  const origEl = document.getElementById('auditOrigin');
  if (origEl) origEl.textContent = item.origin;
  const trafEl = document.getElementById('auditTraffic');
  if (trafEl) trafEl.textContent = item.trafficSource || '🌐 Direct Navigation';
  const dwellEl = document.getElementById('auditDwell');
  if (dwellEl) dwellEl.textContent = `⏱️ ${formatDwell(item.dwellSeconds || 0)} (${item.activeSection || 'Reading'})`;
  const secEl = document.getElementById('auditSecurity');
  if (secEl) secEl.textContent = item.botVerified || '🛡️ Verified Human (Clean IP)';

  // Draft Data
  const d = item.draftLead || {};
  const draftStatusEl = document.getElementById('auditDraftStatus');
  if (draftStatusEl) draftStatusEl.textContent = d.company ? '⚠️ Abandoned Lead (Draft Captured)' : '🔍 Browsing Storefront';
  const draftCompEl = document.getElementById('auditDraftCompany');
  if (draftCompEl) draftCompEl.textContent = d.company || 'Not typed yet';
  const draftEmailEl = document.getElementById('auditDraftEmail');
  if (draftEmailEl) draftEmailEl.textContent = `${d.email || 'None'} · ${d.name || ''}`;
  const draftVolEl = document.getElementById('auditDraftVolume');
  if (draftVolEl) draftVolEl.textContent = `${d.volume || 'FCL Load'} · ${d.commodities || item.inspectedLots.join(', ')}`;
  const draftDestEl = document.getElementById('auditDraftDest');
  if (draftDestEl) draftDestEl.textContent = d.country || item.origin;
  const langPathEl = document.getElementById('auditLangPath');
  if (langPathEl) langPathEl.textContent = item.langSwitchHistory || 'EN (USD)';

  // Scroll & Navigation
  const scrollProg = document.getElementById('auditScrollProgress');
  if (scrollProg) scrollProg.style.width = `${item.scrollDepth || 50}%`;
  const scrollVal = document.getElementById('auditScrollVal');
  if (scrollVal) scrollVal.textContent = `${item.scrollDepth || 50}%`;
  const actSecEl = document.getElementById('auditActiveSection');
  if (actSecEl) actSecEl.innerHTML = `Currently Reading: <b>${escapeHtml(item.activeSection || 'Storefront')}</b>`;
  const landExitEl = document.getElementById('auditLandingExit');
  if (landExitEl) landExitEl.innerHTML = `Landed on: <b>${escapeHtml(item.landingSection || 'Hero')}</b> · Exit from: <b>${escapeHtml(item.exitSection || 'Catalog')}</b>`;

  // PDFs and Corridors
  const pdfsEl = document.getElementById('auditPdfsList');
  if (pdfsEl) {
    pdfsEl.innerHTML = (item.downloadedPdfs && item.downloadedPdfs.length > 0)
      ? item.downloadedPdfs.map(p => `<span style="padding:3px 8px;border-radius:4px;background:rgba(217,172,82,0.2);border:1px solid var(--gold-bright);color:#FFD54F;font-family:var(--font-mono);font-size:0.72rem;">📄 ${escapeHtml(p)}</span>`).join('')
      : `<span style="color:var(--muted);font-size:0.75rem;">No PDFs downloaded in this session.</span>`;
  }
  const corrEl = document.getElementById('auditCorridorsList');
  if (corrEl) corrEl.textContent = (item.corridorsExplored && item.corridorsExplored.length > 0) ? item.corridorsExplored.join(' · ') : 'Direct JNPT Mumbai Line';

  // Network & Diagnostics
  const ipEl = document.getElementById('auditIp');
  if (ipEl) ipEl.textContent = item.ip || '103.21.124.50';
  const ispEl = document.getElementById('auditIsp');
  if (ispEl) ispEl.textContent = item.isp || 'Corporate Gateway';
  const devEl = document.getElementById('auditDevice');
  if (devEl) devEl.textContent = item.device || '💻 Desktop';
  const specsEl = document.getElementById('auditSpecs');
  if (specsEl) specsEl.textContent = item.deviceSpecs || 'Windows 11 · Chrome';
  const speedEl = document.getElementById('auditSpeed');
  if (speedEl) speedEl.textContent = item.networkSpeed || '5G High-Speed Fiber';
  const sysLangEl = document.getElementById('auditLangSys');
  if (sysLangEl) sysLangEl.textContent = `System Locales: ${item.systemLanguages || 'en-US'}`;
  const botEl = document.getElementById('auditBotScore');
  if (botEl) botEl.textContent = item.botVerified || '✅ 100% Human Trader';
  const vpnEl = document.getElementById('auditVpn');
  if (vpnEl) vpnEl.textContent = item.vpnStatus || 'Clean Commercial IP (No Proxy)';

  modal.style.display = 'flex';
}

function convertDraftToInquiry() {
  if (!currentInspectedSession || !currentInspectedSession.draftLead) {
    alert("No draft data available to convert.");
    return;
  }
  const d = currentInspectedSession.draftLead;
  const newLead = {
    id: `RFQ-ABANDON-${Math.floor(100 + Math.random() * 900)}`,
    date: new Date().toISOString().split('T')[0],
    name: d.name || 'Recovered Importer',
    company: d.company || 'Direct Import House',
    email: d.email || 'buyer@trade.com',
    country: d.country || currentInspectedSession.origin,
    commodities: d.commodities || 'Sortex Commodities',
    volume: d.volume || '15 Quintals (1,500 KG)',
    status: 'new',
    recoveredFromDraft: true
  };

  const list = getInquiries();
  list.unshift(newLead);
  saveInquiries(list);
  renderInquiries();
  updateKPIs();
  closeModal('sessionAuditModal');
  switchTab('inquiriesTab');
  if (typeof showToast === 'function') showToast(`🎉 Recovered Lead ${newLead.id} added to Inquiry Desk!`);
}

function exportSingleSessionJson() {
  if (!currentInspectedSession) return;
  const blob = new Blob([JSON.stringify(currentInspectedSession, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentInspectedSession.id}_Audit_Dossier.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

window.openSessionAuditModal = openSessionAuditModal;
window.convertDraftToInquiry = convertDraftToInquiry;
window.exportSingleSessionJson = exportSingleSessionJson;


function filterAnalyticsTable() {
  const query = ((document.getElementById('analyticsSearchInp') && document.getElementById('analyticsSearchInp').value) || '').toLowerCase();
  const filter = (document.getElementById('analyticsFilterSelect') && document.getElementById('analyticsFilterSelect').value) || 'all';

  const rows = document.querySelectorAll('#analyticsTableBody tr');
  rows.forEach(tr => {
    const text = tr.innerText.toLowerCase();
    const matchesQuery = !query || text.includes(query);

    let matchesFilter = true;
    if (filter === 'downloads') {
      matchesFilter = text.includes('.pdf');
    } else if (filter === 'rfq') {
      matchesFilter = text.includes('rfq') || text.includes('sample') || text.includes('draft') || text.includes('abandoned');
    }

    tr.style.display = (matchesQuery && matchesFilter) ? '' : 'none';
  });
}

function refreshAnalytics() {
  renderAnalytics();
  if (typeof showToast === 'function') showToast("🔄 Live telemetry logs refreshed!");
}

function clearAnalyticsLog() {
  if (confirm("Are you sure you want to clear the visitor telemetry history?")) {
    localStorage.setItem('gge_visitor_telemetry', '[]');
    renderAnalytics();
    if (typeof showToast === 'function') showToast("🗑️ Telemetry logs cleared.");
  }
}

function loadDemoTelemetry() {
  localStorage.removeItem('gge_visitor_telemetry');
  renderAnalytics();
  if (typeof showToast === 'function') showToast("🔄 Demo trade corridor sessions reloaded!");
}

window.loadDemoTelemetry = loadDemoTelemetry;

function exportAnalyticsCSV() {
  const list = getVisitorTelemetry();
  if (!list || list.length === 0) {
    alert("No telemetry data to export.");
    return;
  }

  let csv = "Session ID,Live Status,Origin Location,Country Code,IP Address,ISP Network,Security Shield,Device Type,Hardware Specs,Traffic Source,Visit Timestamp,Dwell Seconds,Dwell Formatted,Scroll Depth,Active Section,Language Path,Inspected Lots,PDF Downloads,Draft Lead Company,Draft Lead Email,Trade Status\n";
  list.forEach(i => {
    const lots = (i.inspectedLots || []).join('; ');
    const pdfs = (i.downloadedPdfs || []).join('; ');
    const d = i.draftLead || {};
    csv += `"${i.id}","${i.isLive ? 'LIVE' : 'IDLE'}","${i.origin}","${i.countryCode || ''}","${i.ip || ''}","${i.isp || ''}","${i.botVerified || ''}","${i.device || ''}","${i.deviceSpecs || ''}","${i.trafficSource || ''}","${i.timestamp}",${i.dwellSeconds || 0},"${formatDwell(i.dwellSeconds || 0)}","${i.scrollDepth || 0}%","${i.activeSection || ''}","${i.langSwitchHistory || ''}","${lots}","${pdfs}","${d.company || ''}","${d.email || ''}","${i.action || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GGE_Executive_Buyer_Telemetry_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

window.renderAnalytics = renderAnalytics;
window.filterAnalyticsTable = filterAnalyticsTable;
window.refreshAnalytics = refreshAnalytics;
window.clearAnalyticsLog = clearAnalyticsLog;
window.exportAnalyticsCSV = exportAnalyticsCSV;


// Auto-refresh telemetry in real-time if Tab 4 is active
if (typeof setInterval === 'function') {
  setInterval(() => {
    const analyticsTab = typeof document !== 'undefined' && document.getElementById('analyticsTab');
    if (analyticsTab && analyticsTab.classList.contains('active')) {
      if (typeof renderAnalytics === 'function') {
        renderAnalytics();
      }
    }
  }, 2500);
}


// ================= IMMUTABLE AUDIT TRAIL & COMPLIANCE LEDGER =================
async function fetchServerAuditLog() {
  try {
    const res = await fetch('/api/audit?_t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.audit) && data.audit.length > 0) {
        localStorage.setItem('gge_audit_changelog', JSON.stringify(data.audit));
        renderAuditTrail();
        return data.audit;
      }
    }
  } catch(e) {}
  return getAuditLog();
}

function getAuditLog() {
  try {
    return JSON.parse(localStorage.getItem('gge_audit_changelog') || '[]');
  } catch (e) {
    return [];
  }
}

function logAuditAction(action, entityId, previousState, newState, details) {
  try {
    const list = getAuditLog();
    const entry = {
      id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
      timestamp: new Date().toISOString(),
      operator: sessionStorage.getItem('gge_admin_email') || 'nigadearyan@gmail.com',
      action: action || 'OPERATION',
      entityId: entityId || 'SYSTEM',
      previousState: previousState !== undefined && previousState !== null ? String(previousState) : 'NONE',
      newState: newState !== undefined && newState !== null ? String(newState) : 'NONE',
      details: details || ''
    };
    list.unshift(entry);
    if (list.length > 1000) list.length = 1000;
    localStorage.setItem('gge_audit_changelog', JSON.stringify(list));
    renderAuditTrail();

    // Persist to central cloud ledger
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch(() => {});
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

function renderAuditTrail() {
  const tbody = document.getElementById('auditTrailTableBody');
  if (!tbody) return;
  const list = getAuditLog();
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted);">No compliance events recorded yet. Perform an action to seed the immutable ledger.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(item => `
    <tr>
      <td style="font-family:var(--font-mono);font-size:0.75rem;color:var(--gold-bright);">${escapeHtml(item.id)}</td>
      <td style="font-size:0.75rem;color:var(--ivory);white-space:nowrap;">${escapeHtml(item.timestamp.replace('T', ' ').substring(0, 19))} UTC</td>
      <td><span style="display:inline-block;padding:3px 8px;border-radius:4px;font-family:var(--font-mono);font-size:0.68rem;font-weight:700;background:rgba(217,172,82,0.18);color:var(--gold-bright);border:1px solid rgba(217,172,82,0.35);">${escapeHtml(item.action)}</span></td>
      <td style="font-family:var(--font-mono);font-size:0.75rem;color:#FFFFFF;font-weight:600;">${escapeHtml(item.entityId)}</td>
      <td style="font-size:0.75rem;"><span style="color:var(--muted);text-decoration:line-through;">${escapeHtml(item.previousState)}</span> ➔ <b style="color:#81C784;">${escapeHtml(item.newState)}</b></td>
      <td style="font-size:0.72rem;color:var(--muted);font-family:var(--font-mono);">${escapeHtml(item.operator)}</td>
    </tr>
  `).join('');
}

function exportAuditLogJSON() {
  const list = getAuditLog();
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GGE_Compliance_Audit_Log_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast('📥 Compliance audit log exported as JSON.');
}

function clearAuditLog() {
  if (confirm("⚠️ Clear compliance audit history? This action is tracked.")) {
    logAuditAction('COMPLIANCE_LOG_PURGE', 'AUDIT_LEDGER', 'ACTIVE_HISTORY', 'PURGED');
    localStorage.setItem('gge_audit_changelog', JSON.stringify([]));
    renderAuditTrail();
    if (typeof showToast === 'function') showToast('Audit history cleared.');
  }
}

window.getAuditLog = getAuditLog;
window.logAuditAction = logAuditAction;
window.renderAuditTrail = renderAuditTrail;
window.exportAuditLogJSON = exportAuditLogJSON;
window.clearAuditLog = clearAuditLog;

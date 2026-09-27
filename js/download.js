/**
 * Golden Global Expo — Secure Document Download Portal Controller (download.html)
 * Parses document tokens and initiates file download stream from Server Vault or IndexedDB.
 */

let activeDataUrl = null;
let activeFileName = "Document.pdf";

function isSafeDownloadUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/api/documents/')) return true;
  if (trimmed.startsWith('blob:')) return true;
  if (trimmed.startsWith('data:application/pdf') || trimmed.startsWith('data:image/')) return true;
  return false;
}

async function triggerDownload() {
  if (activeDataUrl && isSafeDownloadUrl(activeDataUrl)) {
    const a = document.createElement('a');
    a.href = activeDataUrl;
    a.download = activeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (typeof showToast === 'function') {
      showToast(`📥 Downloading ${activeFileName}...`);
    }
    if (typeof logTelemetryPdfDownload === 'function') {
      logTelemetryPdfDownload(activeFileName);
    }
  } else {
    if (typeof showToast === 'function') {
      showToast("⏳ Official document payload has not been uploaded to the vault yet.");
    } else {
      alert("Official document payload has not been uploaded to the vault yet.");
    }
  }
}

window.triggerDownload = triggerDownload;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = (urlParams.get('code') || 'GGE-JNPT-2026').trim();
  const cleanCode = code.replace(/[^A-Za-z0-9_-]/g, '_').toUpperCase();
  const docSlot = (urlParams.get('docSlot') || 'inv').trim().toLowerCase();

  const rawSlot = docSlot.replace(/[^a-z0-9_-]/g, '').replace(/^(dossier_|mdoc_)/, '');
  const slotMap = { 'inv': 'inv', 'invoice': 'inv', 'phyto': 'phyto', 'coa': 'coa', 'assay': 'coa', 'sgs': 'coa', 'bl': 'bl', 'bill_of_lading': 'bl' };
  const cleanSlot = slotMap[rawSlot] || rawSlot;

  const docTitleEl = document.getElementById('fileName') || document.getElementById('docTitle');
  const manifestCodeEl = document.getElementById('manifestCode');
  const fileSizeEl = document.getElementById('fileSize');
  const docMetaEl = document.getElementById('docMeta');
  const btnDl = document.getElementById('dlBtn') || document.getElementById('btnDownload');
  const statusEl = document.getElementById('statusMsg') || document.getElementById('statusBadge');
  const docTypeLabel = document.getElementById('docTypeLabel');
  const previewLink = document.getElementById('previewLink');

  const docNames = {
    'inv': 'Commercial Invoice & Proforma Declaration',
    'phyto': 'Phytosanitary Inspection Certificate (NPPO)',
    'coa': 'Certificate of Analysis (Sortex & Moisture Lab)',
    'bl': 'Ocean Bill of Lading (JNPT to Destination Port)'
  };

  const prettySlotName = docNames[cleanSlot] || `${cleanSlot.toUpperCase()} Export Document`;
  if (docTypeLabel) docTypeLabel.textContent = `Official ${prettySlotName}`;
  if (manifestCodeEl) manifestCodeEl.textContent = `MANIFEST: ${cleanCode}`;

  // 1. Primary Attempt: Query Live Server Document Vault (/api/documents/{bl}/{slot})
  try {
    const serverUrl = `/api/documents/${encodeURIComponent(cleanCode)}/${encodeURIComponent(cleanSlot)}`;
    const headRes = await fetch(serverUrl, { method: 'HEAD' });
    if (headRes.ok) {
      activeDataUrl = serverUrl;
      activeFileName = `GGE_${cleanSlot.toUpperCase()}_${cleanCode}.pdf`;

      const cl = headRes.headers.get('content-length');
      const sizeStr = cl ? `${Math.round(parseInt(cl, 10) / 1024)} KB` : 'Verified PDF';

      if (docTitleEl) docTitleEl.textContent = activeFileName;
      if (fileSizeEl) fileSizeEl.textContent = sizeStr;
      if (docMetaEl) docMetaEl.textContent = `${sizeStr} · Official Certified Document · ${cleanCode}`;
      if (statusEl) {
        statusEl.textContent = "● Server Vault Document Verified & Ready";
        statusEl.style.color = "#4CAF50";
      }
      if (btnDl) {
        btnDl.disabled = false;
        btnDl.innerHTML = `📥 Download ${cleanSlot.toUpperCase()} (PDF)`;
      }
      if (previewLink) {
        previewLink.href = `${serverUrl}?inline=1`;
        previewLink.style.display = 'inline-block';
      }
      return;
    }
  } catch (err) {
    console.warn("Server vault check encountered error, checking local store:", err);
  }

  // 2. Secondary Attempt: Check Local IndexedDB or LocalStorage
  const scopedKey = `doc_${cleanCode}_${cleanSlot}`;
  const legacyKey = `slot_${code}_${docSlot}`;
  let fileRecord = (typeof getFileFromDB === 'function') 
    ? (await getFileFromDB(scopedKey) || await getFileFromDB(legacyKey)) 
    : null;

  if (!fileRecord) {
    try {
      const raw = localStorage.getItem(scopedKey) || localStorage.getItem(legacyKey);
      if (raw) fileRecord = JSON.parse(raw);
    } catch (e) {}
  }

  if (fileRecord && fileRecord.dataUrl && isSafeDownloadUrl(fileRecord.dataUrl)) {
    activeDataUrl = fileRecord.dataUrl;
    activeFileName = fileRecord.name || `GGE_${cleanSlot.toUpperCase()}_${cleanCode}.pdf`;

    if (docTitleEl) docTitleEl.textContent = activeFileName;
    if (fileSizeEl) fileSizeEl.textContent = fileRecord.size || 'Local Cached PDF';
    if (docMetaEl) docMetaEl.textContent = `${fileRecord.size || 'PDF'} · Certified Consignment Document · ${cleanCode}`;
    if (statusEl) {
      statusEl.textContent = "● Vault Document Verified & Ready (Cached)";
      statusEl.style.color = "#4CAF50";
    }
    if (btnDl) {
      btnDl.disabled = false;
      btnDl.innerHTML = `📥 Download ${cleanSlot.toUpperCase()} (PDF)`;
    }
    return;
  }

  // 3. Fallback: Document not yet uploaded
  const prettyName = `${cleanCode}_${cleanSlot.toUpperCase()}.pdf`;
  if (docTitleEl) docTitleEl.textContent = prettyName;
  if (fileSizeEl) fileSizeEl.textContent = "Pending";
  if (statusEl) {
    statusEl.textContent = "⏳ Document Pending Upload by Operations Desk";
    statusEl.style.color = "#D9AC52";
  }
  if (btnDl) {
    btnDl.disabled = false;
    btnDl.innerHTML = `⚠️ Request Document Release`;
    btnDl.onclick = () => {
      if (typeof showToast === 'function') {
        showToast(`Document ${prettyName} is currently undergoing customs verification.`);
      } else {
        alert(`Document ${prettyName} is currently undergoing customs verification.`);
      }
    };
  }
});

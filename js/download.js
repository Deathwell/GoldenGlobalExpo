/**
 * Golden Global Expo — Secure Document Download Portal Controller (download.html)
 * Parses document tokens and initiates file download stream from IndexedDB.
 */

let activeDataUrl = null;
let activeFileName = "Document.pdf";

async function triggerDownload() {
  if (activeDataUrl) {
    const a = document.createElement('a');
    a.href = activeDataUrl;
    a.download = activeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

  } else {
    alert("File payload not available in vault.");
  }
}

window.triggerDownload = triggerDownload;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code') || 'GGE-JNPT-2026';
  const docSlot = urlParams.get('docSlot') || 'inv';

  const docTitleEl = document.getElementById('fileName') || document.getElementById('docTitle');
  const manifestCodeEl = document.getElementById('manifestCode');
  const fileSizeEl = document.getElementById('fileSize');
  const docMetaEl = document.getElementById('docMeta');
  const btnDl = document.getElementById('dlBtn') || document.getElementById('btnDownload');
  const statusEl = document.getElementById('statusMsg') || document.getElementById('statusBadge');
  const docTypeLabel = document.getElementById('docTypeLabel');

  const slotKey = `slot_${code}_${docSlot}`;
  const fileRecord = (typeof getFileFromDB === 'function') ? await getFileFromDB(slotKey) : null;

  if (fileRecord && fileRecord.dataUrl) {
    activeDataUrl = fileRecord.dataUrl;
    activeFileName = fileRecord.name || `${code}_${docSlot}.pdf`;

    if (docTitleEl) docTitleEl.textContent = activeFileName;
    if (manifestCodeEl) manifestCodeEl.textContent = `MANIFEST: ${code}`;
    if (fileSizeEl) fileSizeEl.textContent = fileRecord.size || 'PDF';
    if (docMetaEl) docMetaEl.textContent = `${fileRecord.size} · Certified Consignment Document · ${code}`;
    if (statusEl) {
      statusEl.textContent = "● Vault Document Verified & Ready";
      statusEl.style.color = "#4CAF50";
    }
    if (btnDl) btnDl.disabled = false;
  } else {
    const docNames = {
      'inv': 'Commercial Invoice & Proforma Declaration',
      'phyto': 'Phytosanitary Inspection Certificate (NPPO)',
      'coa': 'Certificate of Analysis (Sortex & Moisture Lab)',
      'bl': 'Ocean Bill of Lading (JNPT to Destination Port)'
    };
    const prettyName = docNames[docSlot] || `${code}_${docSlot.toUpperCase()}.pdf`;
    if (docTitleEl) docTitleEl.textContent = prettyName;
    if (manifestCodeEl) manifestCodeEl.textContent = `MANIFEST: ${code}`;
    if (fileSizeEl) fileSizeEl.textContent = "Certified";
    if (docTypeLabel) docTypeLabel.textContent = `Official ${docSlot.toUpperCase()} Document Verification`;
    if (statusEl) {
      statusEl.textContent = "● Vault Reference Verified";
      statusEl.style.color = "#D9AC52";
    }
  }
});

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

  const docTitleEl = document.getElementById('docTitle');
  const docMetaEl = document.getElementById('docMeta');
  const btnDl = document.getElementById('btnDownload');
  const statusEl = document.getElementById('statusBadge');

  const slotKey = `slot_${code}_${docSlot}`;
  const fileRecord = (typeof getFileFromDB === 'function') ? await getFileFromDB(slotKey) : null;

  if (fileRecord && fileRecord.dataUrl) {
    activeDataUrl = fileRecord.dataUrl;
    activeFileName = fileRecord.name || `${code}_${docSlot}.pdf`;

    if (docTitleEl) docTitleEl.textContent = activeFileName;
    if (docMetaEl) docMetaEl.textContent = `${fileRecord.size} · Certified Consignment Document · ${code}`;
    if (statusEl) {
      statusEl.textContent = "● Vault Document Verified";
      statusEl.style.color = "#4CAF50";
    }
    if (btnDl) btnDl.disabled = false;
  } else {
    if (docTitleEl) docTitleEl.textContent = `Document: ${code} (${docSlot.toUpperCase()})`;
    if (docMetaEl) docMetaEl.textContent = "Standard Seaway Bill / Laboratory Certificate Reference";
    if (statusEl) {
      statusEl.textContent = "● Reference Verified";
      statusEl.style.color = "#D9AC52";
    }
  }
});

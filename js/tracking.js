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

/**
 * Golden Global Expo — Live Cargo & Consignment Tracking Controller (tracking.html)
 * Searches B/L and container records across LocalStorage & Seed DB, updates 5-stage milestone telemetry, and retrieves docs.
 */

async function downloadPortalDoc(docSlot) {
  const activeBL = (window.currentActiveBL || localStorage.getItem('gge_last_active_bl') || 'GGE-JNPT-2026');
  const slotKey = `slot_${activeBL}_${docSlot}`;
  
  if (typeof triggerDocDownload === 'function') {
    await triggerDocDownload(slotKey);
  } else {
    alert("Document download engine is initializing.");
  }
}

function setDemo(code) {
  const input = document.getElementById('trackInput') || document.getElementById('blInput');
  if (input) {
    input.value = code;
  }
  searchBL(code);
}

let isSearchingBL = false;

async function searchBL(explicitCode) {
  if (isSearchingBL) return;
  isSearchingBL = true;

  try {
    const input = document.getElementById('trackInput') || document.getElementById('blInput');
    const resCard = document.getElementById('resultCard');
    
    const rawCode = (explicitCode || (input ? input.value : '')).trim().toUpperCase();
    if (!rawCode) {
      if (typeof showToast === 'function') showToast("Please enter a B/L or Container Number.");
      return;
    }

  // 1. Search in Consignments array from storage (Highest Priority)
  let data = null;
  if (typeof getConsignments === 'function') {
    const consignList = getConsignments();
    const found = consignList.find(c => 
      (c.bl && c.bl.trim().toUpperCase() === rawCode) || 
      (c.container && c.container.trim().toUpperCase().includes(rawCode)) ||
      (c.bl && c.bl.trim().toUpperCase().replace(/[^A-Z0-9]/g,'') === rawCode.replace(/[^A-Z0-9]/g,''))
    );
    if (found) {
      data = {
        bl: found.bl,
        buyer: found.buyer,
        commodity: found.commodity,
        status: found.status,
        stage: parseInt(found.stage || 1, 10),
        vessel: found.vessel,
        pod: found.pod,
        eta: found.eta,
        container: found.container
      };
    }
  }

  // 2. Search in Tracking DB
  if (!data) {
    const liveDb = (typeof getTrackingDatabase === 'function') ? getTrackingDatabase() : (window.defaultTrackingDatabase || {});
    if (liveDb[rawCode]) {
      const item = liveDb[rawCode];
      data = {
        bl: item.bl,
        buyer: item.buyer,
        commodity: item.commodity,
        status: item.status,
        stage: parseInt(item.stage || 1, 10),
        vessel: item.vessel,
        pod: item.pod,
        eta: item.eta,
        container: item.container
      };
    } else {
      const keys = Object.keys(liveDb);
      for (const k of keys) {
        const item = liveDb[k];
        if ((item.container && item.container.trim().toUpperCase().includes(rawCode)) ||
            (item.bl && item.bl.trim().toUpperCase() === rawCode)) {
          data = {
            bl: item.bl,
            buyer: item.buyer,
            commodity: item.commodity,
            status: item.status,
            stage: parseInt(item.stage || 1, 10),
            vessel: item.vessel,
            pod: item.pod,
            eta: item.eta,
            container: item.container
          };
          break;
        }
      }
    }
  }

  // 3. Direct Live Cloud Database Query (Guarantees cross-device live sync)
  if (!data) {
    try {
      const res = await fetch('/api/consignments?_t=' + Date.now());
      if (res.ok) {
        const cJson = await res.json();
        if (cJson && Array.isArray(cJson.consignments)) {
          localStorage.setItem('gge_consignments', JSON.stringify(cJson.consignments));
          const found = cJson.consignments.find(c => 
            (c.bl && c.bl.trim().toUpperCase() === rawCode) || 
            (c.container && c.container.trim().toUpperCase().includes(rawCode)) ||
            (c.bl && c.bl.trim().toUpperCase().replace(/[^A-Z0-9]/g,'') === rawCode.replace(/[^A-Z0-9]/g,''))
          );
          if (found) {
            data = {
              bl: found.bl,
              buyer: found.buyer,
              commodity: found.commodity,
              status: found.status,
              stage: parseInt(found.stage || 1, 10),
              vessel: found.vessel,
              pod: found.pod,
              eta: found.eta,
              container: found.container
            };
          }
        }
      }
    } catch(e) {}
  }

  // 4. Fallback to default demo records
  if (!data && window.defaultTrackingDatabase) {
    const dKeys = Object.keys(window.defaultTrackingDatabase);
    for (const k of dKeys) {
      const dItem = window.defaultTrackingDatabase[k];
      if ((dItem.bl && dItem.bl.toUpperCase().includes(rawCode)) || 
          (dItem.container && dItem.container.toUpperCase().includes(rawCode))) {
        data = {
          bl: dItem.bl,
          buyer: dItem.buyer,
          commodity: dItem.commodity,
          status: dItem.status,
          stage: parseInt(dItem.stage || 4, 10),
          vessel: dItem.vessel,
          pod: dItem.pod,
          eta: dItem.eta,
          container: dItem.container
        };
        break;
      }
    }
  }

  if (data) {
    window.currentActiveBL = data.bl;
    try {
      if (localStorage.getItem('gge_last_active_bl') !== data.bl) {
        localStorage.setItem('gge_last_active_bl', data.bl);
      }
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const currentUrlParam = new URLSearchParams(window.location.search).get('bl');
        if (currentUrlParam !== data.bl) {
          window.history.replaceState(null, '', `?bl=${encodeURIComponent(data.bl)}`);
        }
      }
    } catch (e) {}

    if (input) input.value = data.bl;
    renderTrackingResult(data);
    if (resCard) resCard.style.display = 'block';
  } else {
    if (resCard) {
      resCard.style.display = 'block';
      resCard.innerHTML = `
        <div style="text-align:center;padding:48px 24px;background:rgba(20,17,14,0.7);border:1px dashed rgba(217,172,82,0.3);border-radius:8px;">
          <div style="font-size:2.5rem;margin-bottom:12px;">🔍</div>
          <div style="font-family:var(--font-heading);font-size:1.1rem;color:var(--gold-bright);font-weight:700;margin-bottom:8px;">
            No Active Consignment Found for "${escapeHtml(rawCode)}"
          </div>
          <p style="color:var(--muted);font-size:0.85rem;max-width:480px;margin:0 auto 20px auto;line-height:1.5;">
            Please verify your Bill of Lading (B/L) Code, Container ISO Number, or Air Waybill tracking reference. Contact your designated Golden Global Expo export compliance officer if you require assistance.
          </p>
          <a href="index.html#contact" class="btn btn-outline" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;font-size:0.8rem;text-decoration:none;">
            📞 Contact Trade Support
          </a>
        </div>
      `;
    }
    if (typeof showToast === 'function') {
      showToast(`⚠️ No consignment found for: ${rawCode}`);
    }
  }
  } finally {
    isSearchingBL = false;
  }
}

/**
 * Enterprise PII Redaction & Privacy Shield
 * Masks private individual street addresses on public tracking portal
 */
function maskPIIAddress(addr) {
  if (!addr || typeof addr !== 'string') return 'Authorized Destination';
  const portKeywords = ['port', 'jebel ali', 'nhava sheva', 'rotterdam', 'singapore', 'hamburg', 'shanghai', 'fcl', 'cif'];
  const lower = addr.toLowerCase();
  if (portKeywords.some(k => lower.includes(k)) && !lower.includes('flat') && !lower.includes('apt') && !lower.includes('zeon') && !lower.includes('floor') && !lower.includes('house')) {
    return addr;
  }
  const segments = addr.split(',');
  if (segments.length > 1) {
    return `[Protected Consignee Delivery Address], ${segments.slice(1).join(', ').trim()}`;
  }
  return addr.replace(/\d+/g, '••••');
}

function renderTrackingResult(data) {
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  
  setEl('rBlCode', data.bl || 'GGE-EXP-2026');
  setEl('resBL', data.bl || 'GGE-EXP-2026');
  setEl('rCommodity', data.commodity || '24.0 MT Agri-Lot · 20ft FCL Container');
  setEl('resCommodity', data.commodity || '24.0 MT Agri-Lot · 20ft FCL Container');
  
  const stage = parseInt(data.stage || 1, 10);
  const stageNames = {
    1: "Stage 1: Mandi Origin & Grading",
    2: "Stage 2: Quality Assay & Laboratory QA",
    3: "Stage 3: Nhava Sheva CFS Stuffing & Phyto",
    4: "Stage 4: Customs EDI & Let Export Order (LEO)",
    5: "Stage 5: High Seas Ocean Transit",
    6: "Stage 6: Discharge Port Cleared & Gate-Out"
  };
  
  const statusDisplay = data.status || stageNames[stage] || "Active Shipment";
  setEl('rStatusText', statusDisplay);
  setEl('resStatus', statusDisplay);
  
  const pill = document.getElementById('rStatusPill');
  if (pill) {
    if (stage >= 6) {
      pill.classList.add('completed');
    } else {
      pill.classList.remove('completed');
    }
  }
  
  const vesselDisplay = data.vessel || 'MSC VALERIA (IMO 9461439)';
  setEl('rVessel', vesselDisplay);
  setEl('resVessel', vesselDisplay);
  setEl('rVesselShort', data.vessel ? data.vessel.split('(')[0].trim() : 'MSC Valeria');
  
  const isSample = (data.bl && data.bl.includes('SMP')) || (data.container && data.container.includes('AIR'));
  const rawPod = data.pod || 'Jebel Ali, Dubai (UAE)';
  const podDisplay = isSample ? maskPIIAddress(rawPod) : rawPod;
  setEl('rPod', podDisplay);
  setEl('resPod', podDisplay);

  let podShort = rawPod.split(',')[0].trim();
  if (isSample) {
    const parts = rawPod.split(',');
    podShort = parts.length > 1 ? parts[parts.length - 2].trim() + ' (Air Hub)' : 'India (Air Hub)';
  }
  setEl('rPodShort', podShort);
  
  setEl('rEta', data.eta || (stage >= 6 ? 'Delivered' : 'In 3 Days (~48 Hrs)'));
  setEl('resEta', data.eta || (stage >= 6 ? 'Delivered' : 'In 3 Days (~48 Hrs)'));
  
  const containerDisplay = data.container || "MSCU 892104-7 (20' GP)";
  setEl("rContainer", containerDisplay);
  setEl("resContainer", containerDisplay);

  // High-Security Customs Bolt Seal & Cargo Weight Tally
  const sealDisplay = (data.bl && data.bl.includes('SMP')) 
    ? 'DHL-EXP-TAMPER-EVIDENT-SEAL' 
    : `IND-CUS-${Math.abs((data.bl || 'GGE').split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0) % 90000 + 10000)}-SEAL`;
  setEl('rBoltSeal', sealDisplay);

  const cargoWeightDisplay = (data.bl && data.bl.includes('SMP'))
    ? '500g Commercial Sample Pouch · Courier Air Cargo'
    : '24.0 Metric Tons Net (240 Quintals) · 26.2 MT Gross';
  setEl('rCargoWeight', cargoWeightDisplay);

  // Maritime Radar Telemetry Dynamic Simulation
  if (stage >= 6) {
    setEl('rSpeed', '0.0 Knots (Moored / Discharged)');
    setEl('rHeading', 'Berth Complete');
    setEl('rCoords', 'Port Discharge Terminal (Gate Cleared)');
  } else if (stage === 5) {
    setEl('rSpeed', '18.4 Knots (Cruise Speed)');
    setEl('rHeading', '278° WNW');
    setEl('rCoords', '18°57\'N 72°40\'E (Arabian Sea Corridor)');
  } else {
    setEl('rSpeed', '0.0 Knots (Port Terminal)');
    setEl('rHeading', 'Stationary at CFS');
    setEl('rCoords', '18°57\'01"N 72°56\'54"E (Nhava Sheva Sea Port)');
  }

  // Update Visual 6-Stage Stepper Nodes
  const stepNodes = document.querySelectorAll('.step-node');
  stepNodes.forEach((node, index) => {
    const stepNum = index + 1;
    const circle = node.querySelector('.step-circle');
    node.classList.remove('completed', 'active');
    
    if (stepNum < stage) {
      // Completed past stages: Green background with checkmark
      node.classList.add('completed');
      if (circle) circle.textContent = '✓';
    } else if (stepNum === stage) {
      // Current active stage
      if (stage >= 6) {
        node.classList.add('completed');
        if (circle) circle.textContent = '✓';
      } else {
        node.classList.add('active');
        if (circle) circle.textContent = stepNum.toString();
      }
    } else {
      // Future pending stages: Plain step number
      if (circle) circle.textContent = stepNum.toString();
    }
  });

  window.currentConsignmentData = data;
  renderLegalDocuments(data);

  // Carrier Auto-Detection & Dynamic Deep Links
  const carrierRow = document.querySelector('.carrier-row');
  if (carrierRow && window.CARRIERS) {
    const prefix = (containerDisplay.substring(0, 4) || '').toUpperCase();
    const carrier = window.CARRIERS[prefix] || window.CARRIERS['MSCU'];
    const cleanCnt = containerDisplay.replace(/[^A-Za-z0-9]/g, '');
    
    carrierRow.innerHTML = `
      <a href="${carrier.url(cleanCnt)}" target="_blank" rel="noopener" class="btn-carrier">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        <span>Track on ${carrier.name}</span>
      </a>
      <a href="https://www.marinetraffic.com/en/ais/details/ships?shipname=${encodeURIComponent(data.vessel || 'MSC VALERIA')}" target="_blank" rel="noopener" class="btn-carrier">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
        <span>Open Satellite AIS Radar Map</span>
      </a>
    `;
  }
}

/**
 * Safe Privacy Architecture:
 * Fictitious demonstration B/L is used for public portal walkthrough.
 * Real consignments are NEVER exposed as public clickable pills.
 */
function renderDynamicDemoChips() {
  const chipsContainer = document.querySelector('.demo-chips');
  if (!chipsContainer) return;
  chipsContainer.innerHTML = `
    <span>Example Demonstration:</span>
    <button type="button" class="chip-btn" onclick="setDemo('GGE-DEMO-XXXX-XXXX')">GGE-DEMO-XXXX-XXXX (Interactive Demo Consignment)</button>
  `;
}

// Global Exports
window.downloadPortalDoc = downloadPortalDoc;
window.setDemo = setDemo;
window.searchBL = searchBL;
window.renderDynamicDemoChips = renderDynamicDemoChips;
window.maskPIIAddress = maskPIIAddress;

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', async () => {
    if (typeof fetchServerConsignments === 'function') {
      try { await fetchServerConsignments(); } catch(e) {}
    }
    renderDynamicDemoChips();
    
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      const blParam = urlParams.get('bl');
      
      if (blParam) {
        setDemo(blParam);
      } else {
        const cList = (typeof getConsignments === 'function') ? getConsignments() : [];
        if (cList.length > 0 && cList[0].bl) {
          setDemo(cList[0].bl);
        } else {
          setDemo('GGE-BL-9XXC-NMZC');
        }
      }
    }
  });
}


// Export document generation
function showDocPendingNotice(docTitle) {
  if (typeof showToast === 'function') {
    showToast(`⏳ ${docTitle} has not been uploaded yet by the export desk.`);
  }
}
window.showDocPendingNotice = showDocPendingNotice;

function renderLegalDocuments(data) {
  const docsSection = document.getElementById('rDocsSection');
  const docsGrid = document.getElementById('rDocsGrid');
  if (!docsSection || !docsGrid) return;

  const blCode = data.bl || 'GGE-BL-2026';
  const cleanBl = blCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const shortRef = blCode.replace(/[^0-9]/g, '').slice(-4) || '9042';

  const docDefinitions = [
    {
      slot: 'inv',
      type: 'Commercial Cargo Title',
      title: 'Commercial Invoice & Certified Packing List',
      ref: data.invRef || `INV-GGE-2026-${shortRef}`,
      pendingNotice: 'Awaiting export desk invoice upload & customs appraisal'
    },
    {
      slot: 'phyto',
      type: 'Plant Quarantine & Sanitary',
      title: 'Govt. Phytosanitary Quarantine Certificate',
      ref: data.phytoRef || `APEDA/PQ/2026/${shortRef}`,
      pendingNotice: 'Quarantine laboratory analysis awaiting officer upload'
    },
    {
      slot: 'coa',
      type: 'Laboratory Quality Assay',
      title: 'NABL / SGS Export Grade Assay (COA)',
      ref: data.coaRef || `NABL-SGS-QA-${shortRef}`,
      pendingNotice: 'Sortex optical purity assay awaiting lab certificate upload'
    },
    {
      slot: 'bl',
      type: 'Maritime Ocean Bill of Lading',
      title: 'Clean-on-Board Ocean Bill of Lading (e-BL)',
      ref: data.blRef || blCode,
      pendingNotice: 'Carrier master shipping bill awaiting port dispatch upload'
    }
  ];

  let uploadedCount = 0;

  docsGrid.innerHTML = docDefinitions.map(doc => {
    const scopedKey = `doc_${cleanBl}_${doc.slot}`;
    const legacyKey = `slot_${blCode}_${doc.slot}`;
    let uploadedFile = null;

    try {
      const raw = localStorage.getItem(scopedKey) || localStorage.getItem(legacyKey) || (data.docs && data.docs[doc.slot]);
      if (raw) uploadedFile = (typeof raw === 'string') ? JSON.parse(raw) : raw;
    } catch (e) {}

    const isUploaded = !!(uploadedFile && (uploadedFile.dataUrl || uploadedFile.name));
    if (isUploaded) uploadedCount++;

    if (isUploaded) {
      const fileName = uploadedFile.name || `${doc.slot.toUpperCase()}_Document.pdf`;
      const fileSize = uploadedFile.size || 'Certified PDF';
      return `
        <div class="doc-card verified">
          <div class="doc-card-top">
            <span class="doc-type-tag" style="color:#81C784;">${escapeHtml(doc.type)}</span>
            <h4 class="doc-title">${escapeHtml(doc.title)}</h4>
            <div class="doc-ref">Filing Ref: <b>${escapeHtml(doc.ref)}</b></div>
            <div class="doc-status-pill verified">
              <span class="status-dot dot-green"></span>
              <span>Officially Attached &amp; Available</span>
            </div>
            <div class="doc-file-meta">
              <span>📄 <b>${escapeHtml(fileName)}</b></span>
              <span style="color:rgba(245,239,224,0.55);font-size:0.65rem;">(${fileSize})</span>
            </div>
          </div>
          <button type="button" class="btn-doc-download verified" onclick="downloadOfficialConsignmentDoc('${doc.slot}')">
            📥 Download Attached Document ➔
          </button>
        </div>
      `;
    } else {
      return `
        <div class="doc-card pending">
          <div class="doc-card-top">
            <span class="doc-type-tag" style="color:rgba(245,239,224,0.45);">${escapeHtml(doc.type)}</span>
            <h4 class="doc-title">${escapeHtml(doc.title)}</h4>
            <div class="doc-ref">Filing Ref: <b>${escapeHtml(doc.ref)}</b></div>
            <div class="doc-status-pill pending" style="background:rgba(255,255,255,0.04);color:rgba(245,239,224,0.5);border-color:rgba(255,255,255,0.1);">
              <span class="status-dot" style="background:#888;"></span>
              <span>Not Uploaded Yet</span>
            </div>
            <div class="doc-file-meta pending">
              <span>⏳ ${escapeHtml(doc.pendingNotice)}</span>
            </div>
          </div>
          <button type="button" class="btn-doc-download" onclick="showDocPendingNotice('${escapeHtml(doc.title)}')" style="background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.15);color:rgba(245,239,224,0.4);cursor:not-allowed;">
            🔒 File Not Yet Uploaded
          </button>
        </div>
      `;
    }
  }).join('');

  docsSection.style.display = 'block';

  const btnAll = document.getElementById('btnDownloadAllDocs');
  if (btnAll) {
    if (uploadedCount > 0) {
      btnAll.innerHTML = `📦 Download Attached Documents (${uploadedCount}/4)`;
      btnAll.style.opacity = '1';
      btnAll.style.cursor = 'pointer';
      btnAll.onclick = () => downloadAllConsignmentDocs(data);
    } else {
      btnAll.innerHTML = `🔒 Documents Not Yet Uploaded (0/4)`;
      btnAll.style.opacity = '0.5';
      btnAll.style.cursor = 'not-allowed';
      btnAll.onclick = () => {
        if (typeof showToast === 'function') showToast("⏳ No documents have been uploaded for this consignment yet.");
      };
    }
  }
}

async function downloadOfficialConsignmentDoc(slot) {
  const data = window.currentConsignmentData || { bl: 'GGE-JNPT-2026' };
  const bl = data.bl || 'GGE-JNPT-2026';
  const cleanBl = bl.replace(/[^a-zA-Z0-9_-]/g, '_');
  const scopedKey = `doc_${cleanBl}_${slot}`;
  const legacyKey = `slot_${bl}_${slot}`;

  let uploadedFile = null;
  if (typeof getFileFromDB === 'function') {
    try {
      uploadedFile = await getFileFromDB(scopedKey) || await getFileFromDB(legacyKey);
    } catch(e) {}
  }
  if (!uploadedFile) {
    try {
      const raw = localStorage.getItem(scopedKey) || localStorage.getItem(legacyKey) || (data.docs && data.docs[slot]);
      if (raw) uploadedFile = (typeof raw === 'string') ? JSON.parse(raw) : raw;
    } catch (e) {}
  }

  if (uploadedFile && uploadedFile.dataUrl) {
    const docName = uploadedFile.name || `GGE_${slot.toUpperCase()}_${bl}.pdf`;
    if (typeof logTelemetryPdfDownload === 'function') {
      logTelemetryPdfDownload(docName);
    }
    const a = document.createElement('a');
    a.href = uploadedFile.dataUrl;
    a.download = docName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (typeof showToast === 'function') showToast(`📥 Downloaded: ${docName}`);
  } else {
    if (typeof showToast === 'function') {
      showToast("🔒 This document has not been uploaded yet by the export desk.");
    }
  }
}

async function downloadAllConsignmentDocs(data) {
  const bl = data.bl || 'GGE-JNPT-2026';
  const cleanBl = bl.replace(/[^a-zA-Z0-9_-]/g, '_');
  const slots = ['inv', 'phyto', 'coa', 'bl'];
  let count = 0;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const scopedKey = `doc_${cleanBl}_${slot}`;
    const legacyKey = `slot_${bl}_${slot}`;
    let uploadedFile = null;
    try {
      const raw = localStorage.getItem(scopedKey) || localStorage.getItem(legacyKey) || (data.docs && data.docs[slot]);
      if (raw) uploadedFile = (typeof raw === 'string') ? JSON.parse(raw) : raw;
    } catch (e) {}

    if (uploadedFile && uploadedFile.dataUrl) {
      count++;
      await new Promise(r => setTimeout(r, 400));
      downloadOfficialConsignmentDoc(slot);
    }
  }

  if (count === 0) {
    if (typeof showToast === 'function') showToast("⏳ No documents uploaded yet for this shipment.");
  }
}

window.renderLegalDocuments = renderLegalDocuments;
window.downloadOfficialConsignmentDoc = downloadOfficialConsignmentDoc;
window.downloadAllConsignmentDocs = downloadAllConsignmentDocs;



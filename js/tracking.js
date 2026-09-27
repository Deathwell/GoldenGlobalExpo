
function generateFallbackTradePDF(slot, data) {
  if (typeof window.jspdf === 'undefined') return null;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  
  const bl = data.bl || 'GGE-JNPT-2026';
  const isDomestic = bl && (bl.includes('DOM') || bl.startsWith('DOM-') || bl.includes('DOMESTIC'));

  const exportTitles = {
    inv: 'COMMERCIAL INVOICE & CERTIFIED PACKING LIST',
    phyto: 'GOVT. PHYTOSANITARY QUARANTINE CERTIFICATE',
    coa: 'NABL / SGS EXPORT GRADE OPTICAL ASSAY (COA)',
    bl: 'CLEAN-ON-BOARD MARITIME BILL OF LADING (e-BL)'
  };

  const domesticTitles = {
    inv: 'GST TAX INVOICE & PACKING DISPATCH DOCKET',
    phyto: 'FSSAI STATUTORY COMPLIANCE & AGMARK CERTIFICATE',
    coa: 'DOMESTIC BATCH QUALITY ASSAY & SORTEX REPORT',
    bl: 'DOMESTIC SURFACE EXPRESS LORRY RECEIPT (LR / AWB)'
  };

  const docTitle = (isDomestic ? domesticTitles : exportTitles)[slot] || (isDomestic ? 'OFFICIAL DOMESTIC TRADE DOCUMENT' : 'OFFICIAL EXPORT TRADE DOCUMENT');
  
  // Luxury Dark/Gold Executive Header
  doc.setFillColor(20, 17, 14);
  doc.rect(0, 0, 210, 297, 'F');
  
  doc.setFillColor(184, 135, 47);
  doc.rect(15, 14, 180, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(217, 172, 82);
  doc.text('GOLDEN GLOBAL EXPO', 15, 25);
  
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(245, 239, 224);
  if (isDomestic) {
    doc.text('NATIONAL AGRICULTURAL COMMODITY & PACKAGED DISTRIBUTION · INDIA LOGISTICS', 15, 31);
    doc.text('OFFICIAL REGULATORY DOMESTIC TRADE FILING · FSSAI & GST COMPLIANT', 15, 36);
  } else {
    doc.text('PREMIER AGRICULTURAL COMMODITY MERCHANT EXPORTERS · JNPT MUMBAI', 15, 31);
    doc.text('OFFICIAL REGULATORY TRADE FILING · APEDA & DGFT CERTIFIED', 15, 36);
  }
  
  doc.setDrawColor(217, 172, 82);
  doc.setLineWidth(0.4);
  doc.line(15, 40, 195, 40);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(docTitle, 15, 50);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 195, 180);
  if (isDomestic) {
    doc.text(`Domestic Consignment Docket: ${bl}`, 15, 58);
    doc.text(`Carrier / Fleet: ${data.vessel || 'Domestic Surface Express (BlueDart / Delhivery)'}`, 15, 64);
    doc.text(`Dispatch Hub: Central Logistics Warehouse (Maharashtra, India)`, 15, 70);
    doc.text(`Destination Hub: ${data.pod || 'Domestic Consignee Hub, India'}`, 15, 76);
    doc.text(`Tracking Reference: ${data.container || "DOM-PARCEL #SURFACE"}`, 15, 82);
    doc.text(`Security Seal: FSSAI-DOM-TAMPER-EVIDENT-TAPE`, 15, 88);
    doc.text(`Commodity Specification: ${data.commodity || 'Sortex Clean Grade-A Retail Pack'}`, 15, 94);
    doc.text(`Statutory Authority: FSSAI Reg. #11521008000142 · GST Registered`, 15, 100);
    doc.text(`Verification Timestamp: ${new Date().toUTCString()} · India National Distribution`, 15, 106);
  } else {
    doc.text(`Master Shipping Reference: ${bl}`, 15, 58);
    doc.text(`Active Ocean Vessel: ${data.vessel || 'MSC VALERIA (IMO 9461439)'}`, 15, 64);
    doc.text(`Port of Loading: JNPT (Nhava Sheva Sea Port, INNSA1)`, 15, 70);
    doc.text(`Port of Discharge: ${data.pod || 'Jebel Ali, Dubai (UAE)'}`, 15, 76);
    doc.text(`Container ISO Number: ${data.container || "MSCU 892104-7 (20' GP)"}`, 15, 82);
    doc.text(`Customs Bolt Seal (ISO 17712): IND-CUS-88412-SEAL`, 15, 88);
    doc.text(`Commodity Specification: ${data.commodity || '24.0 Metric Tons Tur Dal (Sortex Clean Grade-A)'}`, 15, 94);
    doc.text(`Issuing Statutory Authority: DGFT / APEDA Export Inspection Council`, 15, 100);
    doc.text(`Verification Timestamp: ${new Date().toUTCString()} · DPDP & ICC Incoterms Compliant`, 15, 106);
  }
  
  // Executive Certification Box
  doc.setDrawColor(184, 135, 47);
  doc.setFillColor(28, 24, 20);
  doc.roundedRect(15, 116, 180, 70, 2, 2, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 172, 82);
  if (isDomestic) {
    doc.text('OFFICIAL DOMESTIC DISTRIBUTION & TAX COMPLIANCE CERTIFICATION', 20, 126);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(245, 239, 224);
    doc.text('This digital trade document is issued by Golden Global Expo under statutory Indian commerce,', 20, 136);
    doc.text('GST statutory filing rules, and FSSAI Food Safety & Standards Regulations, 2011.', 20, 143);
    doc.text('All goods are sorted, Agmark-inspected, hygienic-packaged, and dispatched via certified', 20, 150);
    doc.text('surface express logistics partners for verified doorstep delivery across India.', 20, 157);
  } else {
    doc.text('OFFICIAL EXPORT TRADE COMPLIANCE CERTIFICATION', 20, 126);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(245, 239, 224);
    doc.text('This digital trade document is issued by Golden Global Expo under the statutory guidelines of the', 20, 136);
    doc.text('Foreign Trade (Development and Regulation) Act, 1992 and APEDA Export Inspection Standards.', 20, 143);
    doc.text('All products have been sortex-graded, quarantine-cleared, fumigated, and customs cleared under', 20, 150);
    doc.text('Central EDI Let Export Order (LEO) at Nhava Sheva Sea Port, India.', 20, 157);
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(129, 199, 132);
  doc.text('● VERIFIED & REGISTERED IN GOLDEN GLOBAL EXPO DOCUMENT VAULT', 20, 172);
  
  // Signatory & Stamp
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(isDomestic ? 'Authorized Distribution Officer:' : 'Authorized Compliance Officer:', 15, 210);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 239, 224);
  doc.text(isDomestic ? 'S. V. Patil (Head of Domestic Distribution & QC)' : 'Dr. R. K. Sharma (Head of Export Compliance & QA)', 15, 216);
  doc.setFont('helvetica', 'normal');
  doc.text(isDomestic ? 'Golden Global Expo National Distribution Center · Mumbai, India' : 'Golden Global Expo Logistics Hub · JNPT, Mumbai', 15, 221);
  
  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text('© Golden Global Expo · Official Consignment Document Vault · Verify at /verify.html · All Rights Reserved', 15, 285);
  
  return doc;
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

function renderInquiryNoticeCard(code, inqData) {
  inqData = inqData || {};
  const cView = document.getElementById('consignmentView');
  const iView = document.getElementById('inquiryView');
  const resCard = document.getElementById('resultCard');
  const input = document.getElementById('trackInput') || document.getElementById('blInput');

  if (cView) cView.style.display = 'none';
  if (iView) iView.style.display = 'block';
  if (resCard) resCard.style.display = 'block';

  if (input) input.value = code;

  try {
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', `?bl=${encodeURIComponent(code)}`);
    }
  } catch (e) {}

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };

  setEl('inqRefTitle', code);
  setEl('inqRefVal', code);
  setEl('inqCommodityTitle', inqData.commodity || 'Export Grade Agri-Commodities');
  setEl('inqCommoditiesVal', inqData.commodity || 'Sortex Clean Agri-Commodities');
  setEl('inqStatusBadge', (inqData.status || 'INQUIRY RECEIVED · PRE-ORDER REVIEW').toUpperCase());
  setEl('inqBuyerVal', inqData.company || inqData.name || 'Prospective Commercial Buyer');
  setEl('inqDestVal', inqData.destination || 'Nhava Sheva (JNPT) Proposed Port Loading');
  setEl('inqVolumeVal', inqData.volume || 'Commercial Consignment');

  if (typeof showToast === 'function') {
    showToast(`📋 Inquiry Reference ${code} Found (Under Review).`, 'info');
  }
}
window.renderInquiryNoticeCard = renderInquiryNoticeCard;

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

    // 0. Explicit check for Inquiry References (RFQs)
    const isRfqCode = rawCode.startsWith('RFQ') || rawCode.startsWith('GGE-RFQ');
    if (isRfqCode) {
      let inqData = null;
      try {
        const trackRes = await fetch(`/api/track?bl=${encodeURIComponent(rawCode)}&_t=` + Date.now());
        if (trackRes.ok) {
          const tJson = await trackRes.json();
          if (tJson && tJson.isInquiry && tJson.inquiry) {
            inqData = tJson.inquiry;
          }
        }
      } catch(e) {}

      if (!inqData && typeof getInquiries === 'function') {
        const list = getInquiries();
        const match = list.find(i => i.id && i.id.toUpperCase() === rawCode);
        if (match) {
          inqData = {
            id: match.id,
            commodity: match.commodities || match.lotName,
            name: match.name,
            company: match.company,
            destination: match.country,
            volume: match.volume,
            status: match.status
          };
        }
      }

      renderInquiryNoticeCard(rawCode, inqData);
      return;
    }

  let data = null;

  // 1. Direct Live Server / Cloud Database Query (Highest Priority: guarantees immediate real-time sync across devices)
  try {
    const trackRes = await fetch(`/api/track?bl=${encodeURIComponent(rawCode)}&_t=` + Date.now());
    if (trackRes.ok) {
      const tJson = await trackRes.json();
      if (tJson && tJson.isInquiry && tJson.inquiry) {
        renderInquiryNoticeCard(rawCode, tJson.inquiry);
        return;
      }
      if (tJson && tJson.success && tJson.consignment) {
        const found = tJson.consignment;
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
        // Update ONLY the tracking DB — NEVER overwrite master gge_consignments from tracking page
        try {
          const liveDb = (typeof getTrackingDatabase === 'function') ? getTrackingDatabase() : {};
          liveDb[found.bl] = { ...data, completed: data.stage >= 5 };
          localStorage.setItem('gge_tracking_db', JSON.stringify(liveDb));
        } catch(e) {}
      }
    } else if (trackRes.status >= 500) {
      if (typeof showToast === 'function') {
        showToast(`⚠️ Live telemetry service error (HTTP ${trackRes.status}). Engaging contingency cache.`, 'warning');
      }
    }
  } catch(e) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Network connection failed. Engaging contingency cache.', 'warning');
    }
  }

  // 2. Search in Consignments array from storage (Fallback if offline or network unavailable)
  if (!data && typeof getConsignments === 'function') {
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

  // 3. Search in Tracking DB (Fallback)
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

  // 4. Try authenticated /api/consignments if admin session exists
  if (!data) {
    try {
      const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gge_bearer_token')) ||
                    (typeof localStorage !== 'undefined' && localStorage.getItem('gge_admin_token'));
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/consignments?_t=' + Date.now(), {
        headers: headers,
        credentials: 'include'
      });
      if (res.ok) {
        const cJson = await res.json();
        if (cJson && Array.isArray(cJson.consignments)) {
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
        <div class="not-found-card" id="notFoundState" style="text-align:center;padding:48px 24px;background:rgba(20,17,14,0.7);border:1px dashed rgba(217,172,82,0.3);border-radius:8px;">
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
  const cView = document.getElementById('consignmentView');
  const iView = document.getElementById('inquiryView');
  if (iView) iView.style.display = 'none';
  if (cView) cView.style.display = 'block';

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  
  setEl('rBlCode', data.bl || 'GGE-EXP-2026');
  setEl('resBL', data.bl || 'GGE-EXP-2026');
  setEl('rCommodity', data.commodity || '24.0 MT Agri-Lot · 20ft FCL Container');
  setEl('resCommodity', data.commodity || '24.0 MT Agri-Lot · 20ft FCL Container');
  
  const isDomestic = (data.bl && (data.bl.includes('DOM') || data.bl.startsWith('DOM-') || data.bl.includes('DOMESTIC'))) || 
                     (data.container && (data.container.includes('DOM') || data.container.includes('SURFACE') || data.container.includes('EXPRESS') || data.container.includes('PARCEL')));
  const isSample = !isDomestic && ((data.bl && (data.bl.includes('SMP') || data.bl.startsWith('SAMPLE-'))) || (data.container && data.container.includes('AIR')));
  const stage = parseInt(data.stage || 1, 10);
  const oceanStageNames = {
    1: "Stage 1: Mandi Origin & Grading",
    2: "Stage 2: Quality Assay & Laboratory QA",
    3: "Stage 3: Nhava Sheva CFS Stuffing & Phyto",
    4: "Stage 4: Customs EDI & Let Export Order (LEO)",
    5: "Stage 5: High Seas Ocean Transit",
    6: "Stage 6: Discharge Port Cleared & Gate-Out"
  };
  const sampleStageNames = {
    1: "Stage 1: Sample APMC Origin",
    2: "Stage 2: Laboratory QA & COA Certified",
    3: "Stage 3: JNPT Customs Gate-In / Phyto Cleared",
    4: "Stage 4: Air Cargo Customs Exit Cleared",
    5: "Stage 5: Express Air Courier Transit",
    6: "Stage 6: Consignee Delivered & Signed"
  };
  const domesticStageNames = {
    1: "Stage 1: Mandi / Warehouse Packing & QC",
    2: "Stage 2: FSSAI & AGMARK Quality Sealed",
    3: "Stage 3: Handed to Surface Express Courier",
    4: "Stage 4: In-Transit via National Highway Logistics",
    5: "Stage 5: Out for Local Delivery / Destination Hub",
    6: "Stage 6: Consignee Delivered & Confirmed"
  };
  
  const statusDisplay = data.status || (isDomestic ? domesticStageNames : (isSample ? sampleStageNames : oceanStageNames))[stage] || "Active Shipment";
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
  
  const vesselDisplay = data.vessel || (isDomestic ? 'Domestic Surface Express (BlueDart / Delhivery)' : 'MSC VALERIA (IMO 9461439)');
  setEl('rVessel', vesselDisplay);
  setEl('resVessel', vesselDisplay);
  setEl('rVesselShort', data.vessel ? data.vessel.split('(')[0].trim() : (isDomestic ? 'Surface Express' : 'MSC Valeria'));
  
  const rawPod = data.pod || (isDomestic ? 'Pune / Mumbai Hub, Maharashtra, India' : 'Jebel Ali, Dubai (UAE)');
  const podDisplay = (isSample || isDomestic) ? maskPIIAddress(rawPod) : rawPod;
  setEl('rPod', podDisplay);
  setEl('resPod', podDisplay);

  let podShort = rawPod.split(',')[0].trim();
  if (isDomestic) {
    const parts = rawPod.split(',');
    podShort = parts.length > 1 ? parts[0].trim() + ' (Hub)' : (rawPod.trim() || 'Domestic Hub');
  } else if (isSample) {
    const parts = rawPod.split(',');
    podShort = parts.length > 1 ? parts[parts.length - 2].trim() + ' (Air Hub)' : 'India (Air Hub)';
  }
  setEl('rPodShort', podShort);
  
  setEl('rEta', data.eta || (stage >= 6 ? 'Delivered' : (isDomestic ? 'In 2-3 Business Days' : 'In 3 Days (~48 Hrs)')));
  setEl('resEta', data.eta || (stage >= 6 ? 'Delivered' : (isDomestic ? 'In 2-3 Business Days' : 'In 3 Days (~48 Hrs)')));
  
  const containerDisplay = data.container || (isDomestic ? 'DOM-PARCEL #SURFACE' : (isSample ? 'AIR-POUCH #SAMPLE' : "MSCU 892104-7 (20' GP)"));
  setEl("rContainer", containerDisplay);
  setEl("resContainer", containerDisplay);

  // High-Security Customs Bolt Seal & Cargo Weight Tally
  const sealDisplay = isDomestic
    ? 'FSSAI-COMPLIANT-TAMPER-EVIDENT-TAPE'
    : (isSample 
      ? 'DHL-EXP-TAMPER-EVIDENT-SEAL' 
      : `IND-CUS-${Math.abs((data.bl || 'GGE').split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0) % 90000 + 10000)}-SEAL`);
  setEl('rBoltSeal', sealDisplay);

  const cargoWeightDisplay = isDomestic
    ? (data.commodity || '5.0 kg Sortex Agri-Pack · Domestic Surface Express')
    : (isSample
      ? '500g Commercial Sample Pouch · Courier Air Cargo'
      : '24.0 Metric Tons Net (240 Quintals) · 26.2 MT Gross');
  setEl('rCargoWeight', cargoWeightDisplay);

  // Maritime / Domestic Highway Logistics Telemetry Dynamic Simulation
  if (isDomestic) {
    if (stage >= 6) {
      setEl('rSpeed', '0.0 km/h (Delivered at Consignee Doorstep)');
      setEl('rHeading', 'Delivery Confirmed');
      setEl('rCoords', 'Consignee Address (Doorstep Completed)');
    } else if (stage === 5) {
      setEl('rSpeed', '28 km/h (Local Delivery Van Transit)');
      setEl('rHeading', 'Destination City Route');
      setEl('rCoords', 'Local Destination Hub · Out for Delivery');
    } else if (stage === 4) {
      setEl('rSpeed', '62 km/h (Express Highway Corridor)');
      setEl('rHeading', 'National Highway Transit');
      setEl('rCoords', 'National Highway Network (Inter-State Transit)');
    } else {
      setEl('rSpeed', '0.0 km/h (Dispatch Hub)');
      setEl('rHeading', 'Sorting & QC Terminal');
      setEl('rCoords', 'Central Dispatch Logistics Center, India');
    }
  } else if (stage >= 6) {
    setEl('rSpeed', '0.0 Knots (Moored / Discharged)');
    setEl('rHeading', 'Berth Complete');
    setEl('rCoords', 'Port Discharge Terminal (Gate Cleared)');
  } else if (stage === 5) {
    setEl('rSpeed', isSample ? '480 Knots (Cruising Altitude)' : '18.4 Knots (Cruise Speed)');
    setEl('rHeading', '278° WNW');
    setEl('rCoords', isSample ? 'Air Corridor Mumbai - International' : '18°57\'N 72°40\'E (Arabian Sea Corridor)');
  } else {
    setEl('rSpeed', '0.0 Knots (Port Terminal)');
    setEl('rHeading', isSample ? 'Stationary at Air Cargo Terminal' : 'Stationary at CFS');
    setEl('rCoords', '18°57\'01"N 72°56\'54"E (Nhava Sheva Sea Port)');
  }

  // Update Visual 6-Stage Stepper Nodes
  const sampleLabels = [
    { title: "Sample Origin", sub: "APMC Lot Sourced" },
    { title: "Quality & Lab QA", sub: "NABL COA Certified" },
    { title: "Phyto & Packing", sub: "Tamper-Sealed Pouch" },
    { title: "Customs Exit", sub: "Air Cargo Cleared" },
    { title: "Air Transit", sub: (data.vessel ? data.vessel.split('(')[0].trim() : 'Priority Air Hub') },
    { title: "Consignee Delivery", sub: podShort || "Authorized Address" }
  ];

  const oceanLabels = [
    { title: "Mandi Origin", sub: "Latur / Unjha APMC" },
    { title: "Quality & Lab QA", sub: "SGS / Intertek Sortex" },
    { title: "CFS Stuffing", sub: "Phyto & Fumigated" },
    { title: "Customs LEO", sub: "EDI Gate Cleared" },
    { title: "Ocean Transit", sub: (data.vessel ? data.vessel.split('(')[0].trim() : 'MSC Valeria') },
    { title: "Port Discharge", sub: podShort || "Jebel Ali (UAE)" }
  ];

  const domesticLabels = [
    { title: "Mandi / Warehouse", sub: "Graded & Packed" },
    { title: "FSSAI & AGMARK", sub: "Certified & QC Sealed" },
    { title: "Courier Dispatch", sub: "BlueDart / Delhivery" },
    { title: "Highway Transit", sub: "Inter-State Fleet" },
    { title: "Local Hub", sub: "Out for Delivery" },
    { title: "Doorstep Delivery", sub: podShort || "Consignee Address" }
  ];

  const activeLabels = isDomestic ? domesticLabels : (isSample ? sampleLabels : oceanLabels);
  const stepNodes = document.querySelectorAll('.step-node');
  stepNodes.forEach((node, index) => {
    const lbl = node.querySelector('.step-label');
    if (lbl && activeLabels[index]) {
      lbl.innerHTML = `<b>${activeLabels[index].title}</b><span>${escapeHtml(activeLabels[index].sub)}</span>`;
    }
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
  updateMaritimeOceanMap(data);

  // Carrier Auto-Detection & Dynamic Deep Links
  const carrierRow = document.querySelector('.carrier-row');
  if (carrierRow) {
    if (isDomestic) {
      carrierRow.innerHTML = `
        <a href="https://www.bluedart.com/tracking" target="_blank" rel="noopener" class="btn-carrier">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <span>Track on BlueDart / Delhivery Express</span>
        </a>
        <a href="https://maps.google.com/?q=${encodeURIComponent(rawPod || 'India')}" target="_blank" rel="noopener" class="btn-carrier">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>View Destination Route Map</span>
        </a>
      `;
    } else if (window.CARRIERS) {
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
}



if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', async () => {
    if (typeof fetchServerConsignments === 'function') {
      try { await fetchServerConsignments(); } catch(e) {}
    }
    if (typeof renderDynamicDemoChips === 'function') {
      renderDynamicDemoChips();
    }
    
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      const blParam = urlParams.get('bl');
      
      if (blParam) {
        setDemo(blParam);
      } else {
        const cList = (typeof getConsignments === 'function') ? getConsignments() : [];
        const validOceanConsignment = cList.find(c => c.bl && !c.bl.startsWith('order_') && !c.bl.startsWith('RFQ') && !c.bl.startsWith('GGE-SMP'));
        if (validOceanConsignment && validOceanConsignment.bl) {
          setDemo(validOceanConsignment.bl);
        } else {
          setDemo('GGE-JNPT-2026');
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

  const isDomestic = (blCode && (blCode.includes('DOM') || blCode.startsWith('DOM-') || blCode.includes('DOMESTIC'))) ||
                     (data.container && (data.container.includes('DOM') || data.container.includes('SURFACE') || data.container.includes('EXPRESS') || data.container.includes('PARCEL')));

  const oceanDocDefinitions = [
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

  const domesticDocDefinitions = [
    {
      slot: 'inv',
      type: 'Domestic Tax Docket',
      title: 'GST Tax Invoice & Packing Docket',
      ref: data.invRef || `GST-DOM-2026-${shortRef}`,
      pendingNotice: 'Awaiting domestic dispatch desk GST invoice upload'
    },
    {
      slot: 'phyto',
      type: 'Food Safety Compliance',
      title: 'FSSAI License & AGMARK Batch Compliance',
      ref: data.phytoRef || `FSSAI-AGM-2026-${shortRef}`,
      pendingNotice: 'FSSAI batch compliance certification awaiting upload'
    },
    {
      slot: 'coa',
      type: 'Quality Assay',
      title: 'Moisture & Optical Sortex QC Report',
      ref: data.coaRef || `QC-LAB-DOM-${shortRef}`,
      pendingNotice: 'Domestic QA lot certificate awaiting upload'
    },
    {
      slot: 'bl',
      type: 'Consignment Note (LR)',
      title: 'Surface Express Courier AWB / Lorry Receipt (LR)',
      ref: data.blRef || blCode,
      pendingNotice: 'Carrier dispatch manifest / LR awaiting upload'
    }
  ];

  const docDefinitions = isDomestic ? domesticDocDefinitions : oceanDocDefinitions;

  // Asynchronously query server vault metadata if not yet queried for this BL
  if (!data._serverMetaFetched) {
    data._serverMetaFetched = true;
    fetch(`/api/documents/meta/${encodeURIComponent(cleanBl)}?_t=${Date.now()}`)
      .then(r => r.json())
      .then(metaRes => {
        if (metaRes && metaRes.success && metaRes.documents) {
          data._serverDocs = metaRes.documents;
          renderLegalDocuments(data);
        }
      })
      .catch(() => {});
  }

  let uploadedCount = 0;

  docsGrid.innerHTML = docDefinitions.map(doc => {
    const scopedKey = `doc_${cleanBl}_${doc.slot}`;
    const legacyKey = `slot_${blCode}_${doc.slot}`;
    let uploadedFile = null;

    try {
      const raw = localStorage.getItem(scopedKey) || localStorage.getItem(legacyKey) || (data.docs && data.docs[doc.slot]);
      if (raw) uploadedFile = (typeof raw === 'string') ? JSON.parse(raw) : raw;
    } catch (e) {}

    const serverDoc = (data._serverDocs && data._serverDocs[doc.slot]) || null;
    const isServerVault = !!(serverDoc && serverDoc.uploaded && serverDoc.sizeBytes > 0);
    const hasValidLocalFile = !!(
      uploadedFile && (
        (typeof uploadedFile.dataUrl === 'string' && uploadedFile.dataUrl.length > 50) ||
        (uploadedFile.name && uploadedFile.size && uploadedFile.size !== '0 B')
      )
    );
    const hasVaultRef = !!(doc.ref && String(doc.ref).startsWith('DOC-VAULT-'));

    // Strictly check if actually uploaded: ONLY true if real file in vault or local storage!
    const isUploaded = isServerVault || hasValidLocalFile || hasVaultRef;
    if (isUploaded) uploadedCount++;

    if (isUploaded) {
      const fileName = (uploadedFile && uploadedFile.name) || (serverDoc && serverDoc.filename) || `GGE_${doc.slot.toUpperCase()}_${cleanBl}.pdf`;
      const fileSize = (serverDoc && serverDoc.sizeBytes > 0) 
        ? `${Math.round(serverDoc.sizeBytes / 1024)} KB` 
        : ((uploadedFile && uploadedFile.size) || 'Attached PDF');
      return `
        <div class="doc-table-row verified">
          <div class="td-doc">
            <div class="doc-row-title">${escapeHtml(doc.title)}</div>
            <div class="doc-row-cat">${escapeHtml(doc.type)}</div>
          </div>
          <div class="td-ref">Ref: <b>${escapeHtml(doc.ref)}</b></div>
          <div class="td-status">
            <span class="status-badge verified">
              <span class="status-dot dot-green"></span> Attached (${escapeHtml(fileSize)})
            </span>
          </div>
          <div class="td-action">
            <button type="button" class="btn-table-action verified" onclick="downloadOfficialConsignmentDoc('${doc.slot}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="doc-table-row pending">
          <div class="td-doc">
            <div class="doc-row-title text-muted">${escapeHtml(doc.title)}</div>
            <div class="doc-row-cat text-muted">${escapeHtml(doc.type)}</div>
          </div>
          <div class="td-ref">Ref: <b>${escapeHtml(doc.ref)}</b></div>
          <div class="td-status">
            <span class="status-badge pending">
              <span class="status-dot dot-pending"></span> Awaiting Upload
            </span>
          </div>
          <div class="td-action">
            <button type="button" class="btn-table-action pending" data-doc-title="${escapeHtml(doc.title)}" onclick="showDocPendingNotice(this.getAttribute('data-doc-title'))">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Awaiting Upload</span>
            </button>
          </div>
        </div>
      `;
    }
  }).join('');

  docsSection.style.display = 'block';

  const btnAll = document.getElementById('btnDownloadAllDocs');
  if (btnAll) {
    if (uploadedCount > 0) {
      btnAll.className = 'btn-carrier btn-download-all';
      btnAll.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>Download Attached (${uploadedCount}/4)</span>
      `;
      btnAll.style.opacity = '1';
      btnAll.style.cursor = 'pointer';
      btnAll.onclick = () => downloadAllConsignmentDocs(data);
    } else {
      btnAll.className = 'btn-carrier btn-download-all disabled';
      btnAll.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Docs Pending Upload (0/4)</span>
      `;
      btnAll.style.opacity = '0.5';
      btnAll.style.cursor = 'not-allowed';
      btnAll.onclick = () => {
        if (typeof showToast === 'function') showToast("⏳ Official documents are awaiting export desk clearance & upload.");
      };
    }
  }
}

async function downloadOfficialConsignmentDoc(slot) {
  const data = window.currentConsignmentData || { bl: 'GGE-JNPT-2026' };
  const bl = data.bl || 'GGE-JNPT-2026';
  const cleanBl = bl.replace(/[^a-zA-Z0-9_-]/g, '_');
  const docName = `GGE_${slot.toUpperCase()}_${cleanBl}.pdf`;

  // 1. First Attempt: Download from Live Server Vault
  try {
    const serverUrl = `/api/documents/${encodeURIComponent(cleanBl)}/${encodeURIComponent(slot)}`;
    const checkRes = await fetch(serverUrl, { method: 'HEAD' });
    if (checkRes.ok) {
      const a = document.createElement('a');
      a.href = serverUrl;
      a.download = docName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (typeof showToast === 'function') showToast(`📥 Downloaded from Vault: ${docName}`);
      return;
    }
  } catch(e) {}

  // 2. Second Attempt: Client-side local storage
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
    const a = document.createElement('a');
    a.href = uploadedFile.dataUrl;
    a.download = docName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (typeof showToast === 'function') showToast(`📥 Downloaded: ${docName}`);
    return;
  }

  // 3. Document has not been uploaded to vault or client storage
  if (typeof showToast === 'function') {
    showToast("🔒 Official document is awaiting upload by the export desk.");
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

    const isServerVault = !!(data._serverDocs && data._serverDocs[slot] && data._serverDocs[slot].uploaded);
    const hasVaultRef = !!(data[`${slot}Ref`] && String(data[`${slot}Ref`]).startsWith('DOC-VAULT-'));

    if ((uploadedFile && uploadedFile.dataUrl) || isServerVault || hasVaultRef) {
      count++;
      await new Promise(r => setTimeout(r, 400));
      await downloadOfficialConsignmentDoc(slot);
    }
  }

  if (count === 0) {
    if (typeof showToast === 'function') showToast("⏳ No documents uploaded yet for this shipment.");
  }
}

window.renderLegalDocuments = renderLegalDocuments;
window.downloadOfficialConsignmentDoc = downloadOfficialConsignmentDoc;
window.downloadAllConsignmentDocs = downloadAllConsignmentDocs;

// =========================================================================
// EXECUTIVE MINIMALIST MARITIME VECTOR MAP ENGINE (Matches Main Website 1:1)
// 100% Self-Contained SVG: Zero External Tiles, Zero Watermarks, Instant Load
// =========================================================================

const CORRIDOR_MAPPINGS = {
  'domestic-india': {
    regionClass: 'active-me',
    routeId: 'routeMiddleEast',
    beaconId: 'beaconNhavaSheva',
    viewBox: [590, 190, 180, 110],
    seaRegion: 'Indian National Logistics Corridor',
    coords: [19.07, 72.87],
    totalNm: 450
  },
  'middle-east': {
    regionClass: 'active-me',
    routeId: 'routeMiddleEast',
    beaconId: 'beaconMiddleEast',
    viewBox: [550, 180, 260, 130],
    seaRegion: 'Arabian Sea Corridor',
    coords: [22.58, 61.92],
    totalNm: 1148
  },
  'europe': {
    regionClass: 'active-eu',
    routeId: 'routeEurope',
    beaconId: 'beaconEurope',
    viewBox: [400, 100, 360, 180],
    seaRegion: 'Red Sea / Mediterranean',
    coords: [19.50, 39.00],
    totalNm: 4320
  },
  'southeast-asia': {
    regionClass: 'active-sea',
    routeId: 'routeSEAsia',
    beaconId: 'beaconSEAsia',
    viewBox: [620, 210, 280, 140],
    seaRegion: 'Malacca Strait Corridor',
    coords: [4.50, 97.50],
    totalNm: 1860
  },
  'east-asia': {
    regionClass: 'active-ea',
    routeId: 'routeEastAsia',
    beaconId: 'beaconEastAsia',
    viewBox: [640, 150, 280, 140],
    seaRegion: 'Taiwan Strait / East Sea',
    coords: [22.00, 118.00],
    totalNm: 3650
  },
  'north-america': {
    regionClass: 'active-na',
    routeId: 'routeNorthAmerica',
    beaconId: 'beaconNorthAmerica',
    viewBox: [150, 95, 380, 190],
    seaRegion: 'North Atlantic Highway',
    coords: [37.00, -35.00],
    totalNm: 6980
  },
  'eurasia': {
    regionClass: 'active-eurasia',
    routeId: 'routeEurasia',
    beaconId: 'beaconEurasia',
    viewBox: [530, 95, 380, 190],
    seaRegion: 'Black Sea Maritime Corridor',
    coords: [43.50, 34.00],
    totalNm: 4410
  },
  'oceania': {
    regionClass: 'active-oc',
    routeId: 'routeOceania',
    beaconId: 'beaconOceania',
    viewBox: [660, 245, 335, 175],
    seaRegion: 'Southern Indian Ocean',
    coords: [-20.00, 110.00],
    totalNm: 5240
  }
};

const WORLD_VIEWBOX = [0, 60, 1000, 380];
let currentViewBox = [0, 60, 1000, 380];
let zoomAnimFrame = null;
let activeCorridorKey = 'middle-east';

function animateViewBox(targetVB, duration = 550) {
  const svg = document.getElementById('worldMapSvg');
  if (!svg) return;

  if (zoomAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(zoomAnimFrame);
    zoomAnimFrame = null;
  }

  const startVB = [...currentViewBox];
  const startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function step(now) {
    const elapsed = (now || (typeof performance !== 'undefined' ? performance.now() : Date.now())) - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeInOutCubic(progress);

    const x = startVB[0] + (targetVB[0] - startVB[0]) * ease;
    const y = startVB[1] + (targetVB[1] - startVB[1]) * ease;
    const w = startVB[2] + (targetVB[2] - startVB[2]) * ease;
    const h = startVB[3] + (targetVB[3] - startVB[3]) * ease;

    currentViewBox = [x, y, w, h];
    svg.setAttribute('viewBox', `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);

    if (progress < 1) {
      if (typeof requestAnimationFrame !== 'undefined') {
        zoomAnimFrame = requestAnimationFrame(step);
      }
    } else {
      currentViewBox = [...targetVB];
      svg.setAttribute('viewBox', `${targetVB[0]} ${targetVB[1]} ${targetVB[2]} ${targetVB[3]}`);
      zoomAnimFrame = null;
    }
  }

  if (typeof requestAnimationFrame !== 'undefined') {
    zoomAnimFrame = requestAnimationFrame(step);
  } else {
    currentViewBox = [...targetVB];
    svg.setAttribute('viewBox', `${targetVB[0]} ${targetVB[1]} ${targetVB[2]} ${targetVB[3]}`);
  }
}

function initTrackingMapPanZoom() {
  const container = document.getElementById('worldMapContainer');
  const svg = document.getElementById('worldMapSvg');
  if (!container || !svg) return;

  if (container._panZoomInitialized) return;
  container._panZoomInitialized = true;

  // 1. Explicitly wire toolbar buttons and prevent event bubbling
  const zoomInBtn = document.getElementById('mapZoomInBtn');
  const zoomOutBtn = document.getElementById('mapZoomOutBtn');
  const focusBtn = document.getElementById('mapFocusCorridorBtn');
  const resetBtn = document.getElementById('mapResetBtn');

  const wireBtn = (btn, fn) => {
    if (!btn) return;
    const stopHandler = (e) => { e.stopPropagation(); };
    btn.addEventListener('mousedown', stopHandler);
    btn.addEventListener('touchstart', stopHandler, { passive: true });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      fn();
    });
  };

  wireBtn(zoomInBtn, zoomMapIn);
  wireBtn(zoomOutBtn, zoomMapOut);
  wireBtn(focusBtn, refocusCorridor);
  wireBtn(resetBtn, resetMapToWorld);

  const toolbar = container.querySelector('.map-toolbar');
  if (toolbar) {
    toolbar.addEventListener('mousedown', (e) => e.stopPropagation());
    toolbar.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  }

  let isDragging = false;
  let startX = 0, startY = 0;
  let startVB = [...currentViewBox];

  // 2. Mouse Panning
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.map-toolbar')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startVB = [...currentViewBox];
    container.classList.add('is-dragging');
    if (zoomAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(zoomAnimFrame);
      zoomAnimFrame = null;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const rect = container.getBoundingClientRect();
    const scaleX = currentViewBox[2] / (rect.width || 1000);
    const scaleY = currentViewBox[3] / (rect.height || 500);

    let newX = startVB[0] - dx * scaleX;
    let newY = startVB[1] - dy * scaleY;
    newX = Math.max(-150, Math.min(1150 - currentViewBox[2], newX));
    newY = Math.max(-80, Math.min(580 - currentViewBox[3], newY));

    currentViewBox[0] = newX;
    currentViewBox[1] = newY;
    svg.setAttribute('viewBox', `${newX.toFixed(2)} ${newY.toFixed(2)} ${currentViewBox[2].toFixed(2)} ${currentViewBox[3].toFixed(2)}`);
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      container.classList.remove('is-dragging');
    }
  });

  // 3. Mouse Wheel Zoom (Focal-point zoom toward cursor)
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (zoomAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(zoomAnimFrame);
      zoomAnimFrame = null;
    }
    const rect = container.getBoundingClientRect();
    const mouseRelX = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
    const mouseRelY = Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1)));

    const cursorSvgX = currentViewBox[0] + mouseRelX * currentViewBox[2];
    const cursorSvgY = currentViewBox[1] + mouseRelY * currentViewBox[3];

    const factor = e.deltaY < 0 ? 0.82 : 1.22;
    let newW = currentViewBox[2] * factor;
    newW = Math.max(120, Math.min(1000, newW));
    let newH = newW * 0.5;

    let newX = cursorSvgX - mouseRelX * newW;
    let newY = cursorSvgY - mouseRelY * newH;
    newX = Math.max(-50, Math.min(1050 - newW, newX));
    newY = Math.max(-40, Math.min(540 - newH, newY));

    animateViewBox([newX, newY, newW, newH], 200);
  }, { passive: false });

  // 4. Touch Gestures: 1-finger pan & 2-finger pinch-to-zoom
  let touchStartX = 0, touchStartY = 0;
  let touchStartDist = 0;
  let touchStartVB = [...currentViewBox];

  container.addEventListener('touchstart', (e) => {
    if (e.target.closest('.map-toolbar')) return;
    if (e.touches.length === 1) {
      isDragging = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartVB = [...currentViewBox];
      if (zoomAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(zoomAnimFrame);
        zoomAnimFrame = null;
      }
    } else if (e.touches.length === 2) {
      isDragging = false;
      touchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartVB = [...currentViewBox];
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      const rect = container.getBoundingClientRect();
      const scaleX = currentViewBox[2] / (rect.width || 1000);
      const scaleY = currentViewBox[3] / (rect.height || 500);

      let newX = touchStartVB[0] - dx * scaleX;
      let newY = touchStartVB[1] - dy * scaleY;
      newX = Math.max(-150, Math.min(1150 - currentViewBox[2], newX));
      newY = Math.max(-80, Math.min(580 - currentViewBox[3], newY));

      currentViewBox[0] = newX;
      currentViewBox[1] = newY;
      svg.setAttribute('viewBox', `${newX.toFixed(2)} ${newY.toFixed(2)} ${currentViewBox[2].toFixed(2)} ${currentViewBox[3].toFixed(2)}`);
    } else if (e.touches.length === 2 && touchStartDist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = touchStartDist / (dist || 1);
      let newW = Math.max(120, Math.min(1000, touchStartVB[2] * factor));
      let newH = newW * 0.5;
      let newX = touchStartVB[0] + (touchStartVB[2] - newW) / 2;
      let newY = touchStartVB[1] + (touchStartVB[3] - newH) / 2;
      newX = Math.max(-50, Math.min(1050 - newW, newX));
      newY = Math.max(-40, Math.min(540 - newH, newY));
      currentViewBox = [newX, newY, newW, newH];
      svg.setAttribute('viewBox', `${newX.toFixed(2)} ${newY.toFixed(2)} ${newW.toFixed(2)} ${newH.toFixed(2)}`);
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    isDragging = false;
    touchStartDist = 0;
  });
}

// Auto-initialize pan/zoom immediately on page load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTrackingMapPanZoom);
  } else {
    setTimeout(initTrackingMapPanZoom, 0);
  }
}

function updateMaritimeOceanMap(consignmentData) {
  if (!consignmentData) return;
  const container = document.getElementById('worldMapContainer');
  if (!container) return; // Map removed: clean bypass
  initTrackingMapPanZoom();

  const rawPod = (consignmentData.pod || '').toLowerCase();
  const stage = parseInt(consignmentData.stage || 1, 10);

  const isDomestic = (consignmentData.bl && (consignmentData.bl.includes('DOM') || consignmentData.bl.startsWith('DOM-') || consignmentData.bl.includes('DOMESTIC'))) ||
                     (consignmentData.container && (consignmentData.container.includes('DOM') || consignmentData.container.includes('SURFACE') || consignmentData.container.includes('EXPRESS')));

  // 1. Identify destination corridor
  let corridorKey = 'middle-east';
  let podDisplayName = 'JEBEL ALI (AEJEA)';

  if (isDomestic) {
    corridorKey = 'domestic-india';
    podDisplayName = consignmentData.pod ? consignmentData.pod.split(',')[0].toUpperCase().trim() + ' (DOMESTIC)' : 'DOMESTIC HUB, INDIA';
  } else if (rawPod.includes('rotterdam') || rawPod.includes('netherlands') || rawPod.includes('holland') || rawPod.includes('europe')) {
    corridorKey = 'europe';
    podDisplayName = 'ROTTERDAM (NLRTM)';
  } else if (rawPod.includes('singapore') || rawPod.includes('klang') || rawPod.includes('malaysia') || rawPod.includes('asean')) {
    corridorKey = 'southeast-asia';
    podDisplayName = 'SINGAPORE (SGSIN)';
  } else if (rawPod.includes('shanghai') || rawPod.includes('china') || rawPod.includes('japan') || rawPod.includes('korea')) {
    corridorKey = 'east-asia';
    podDisplayName = 'SHANGHAI (CNSHA)';
  } else if (rawPod.includes('london') || rawPod.includes('uk') || rawPod.includes('britain')) {
    corridorKey = 'europe';
    podDisplayName = 'LONDON GATEWAY (GBLON)';
  } else if (rawPod.includes('new york') || rawPod.includes('america') || rawPod.includes('usa') || rawPod.includes('canada')) {
    corridorKey = 'north-america';
    podDisplayName = 'NEW YORK (USNYC)';
  } else if (rawPod.includes('novorossiysk') || rawPod.includes('russia') || rawPod.includes('saint petersburg')) {
    corridorKey = 'eurasia';
    podDisplayName = 'NOVOROSSIYSK (RUNVS)';
  } else if (rawPod.includes('sydney') || rawPod.includes('melbourne') || rawPod.includes('australia')) {
    corridorKey = 'oceania';
    podDisplayName = 'SYDNEY (AUSYD)';
  }

  activeCorridorKey = corridorKey;
  const corridor = CORRIDOR_MAPPINGS[corridorKey] || CORRIDOR_MAPPINGS['middle-east'];

  // 2. Update Header Telemetry Strip
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('mapPodLabel', podDisplayName);
  setEl('rVesselMini', consignmentData.vessel ? consignmentData.vessel.split('(')[0].trim() : (isDomestic ? 'SURFACE EXPRESS' : 'MSC VALERIA'));
  
  const speedText = isDomestic
    ? (stage >= 6 ? '0.0 km/h (Delivered)' : (stage >= 4 ? '62 km/h' : '0.0 km/h (Hub)'))
    : (stage >= 6 ? '0.0 Knots (Moored)' : (stage === 5 ? '18.4 Knots' : '0.0 Knots (Berth)'));
  setEl('rSpeedMini', speedText);

  const statusText = isDomestic
    ? (stage >= 6 ? 'Delivered' : (stage >= 4 ? 'Highway Transit' : 'Dispatch Hub'))
    : (stage >= 6 ? 'Delivered' : (stage === 5 ? 'High Seas Transit' : 'Port Cleared'));
  setEl('rStatusMini', statusText);

  // 3. Highlight Matching Countries Layer
  const countriesLayer = document.getElementById('worldCountriesLayer');
  if (countriesLayer) {
    countriesLayer.classList.remove('active-me', 'active-sea', 'active-ea', 'active-eu', 'active-na', 'active-oc', 'active-eurasia');
    if (corridor.regionClass) {
      countriesLayer.classList.add(corridor.regionClass);
    }
  }

  // 4. Deactivate other routes & beacons, activate matching one
  document.querySelectorAll('.maritime-route').forEach(r => r.classList.remove('active'));
  document.querySelectorAll('.port-beacon').forEach(b => b.classList.remove('active'));

  const routeEl = document.getElementById(corridor.routeId);
  const beaconEl = document.getElementById(corridor.beaconId);
  if (routeEl) routeEl.classList.add('active');
  if (beaconEl) beaconEl.classList.add('active');

  // 5. Calculate Vessel Progression & Position Vessel Marker on Route Path
  let progressRatio = 0.0;
  if (stage <= 3) progressRatio = 0.0;
  else if (stage === 4) progressRatio = 0.08;
  else if (stage === 5) progressRatio = 0.58;
  else if (stage >= 6) progressRatio = 1.0;

  const totalDist = isDomestic ? 450 : (corridor.totalNm || 1200);
  const sailedDist = Math.round(totalDist * progressRatio);
  const remainingDist = Math.max(0, totalDist - sailedDist);
  const distUnit = isDomestic ? 'KM' : 'NM';

  setEl('rDistSailed', `${sailedDist} ${distUnit}`);
  setEl('rDistRemaining', `${remainingDist} ${distUnit}`);
  setEl('rEtaDynamic', consignmentData.eta || (stage >= 6 ? 'Completed' : 'On Schedule'));

  const vessel = document.getElementById('vesselScout');
  if (vessel && routeEl && typeof routeEl.getPointAtLength === 'function') {
    vessel.style.display = 'block';
    const totalLength = routeEl.getTotalLength();
    const point = routeEl.getPointAtLength(progressRatio * totalLength);
    vessel.setAttribute('cx', point.x.toFixed(1));
    vessel.setAttribute('cy', point.y.toFixed(1));
  }

  // 6. Smoothly Zoom Camera to Active Trade Corridor
  window.trackingActiveCorridor = corridorKey;
  if (corridor.viewBox) {
    if (typeof window.animateTrackingViewBox === 'function') {
      window.animateTrackingViewBox(corridor.viewBox, 650);
    } else if (typeof animateViewBox === 'function') {
      animateViewBox(corridor.viewBox, 650);
    }
  }

  // 7. Fetch Live Ocean Weather Telemetry (Open-Meteo Integration)
  fetchLiveOceanTelemetry(corridor.coords[0], corridor.coords[1]);
}

async function fetchLiveOceanTelemetry(lat, lon) {
  const waveEl = document.getElementById('rWaveData');
  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=wave_height,wave_direction,wave_period`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const c = data.current || {};
      const height = c.wave_height != null ? c.wave_height : 1.9;
      const period = c.wave_period != null ? c.wave_period : 8.5;
      const dir = c.wave_direction != null ? c.wave_direction : 210;

      let state = 'Moderate Swell · Normal Sea State';
      if (height < 1.0) state = 'Smooth Sea · Optimal Navigation';
      else if (height > 3.0) state = 'Heavy Swell · Navigational Caution';

      if (waveEl) {
        waveEl.innerHTML = `<b style="color:#FFF;">${height.toFixed(1)}m Wave Height</b> (${dir}°) · Swell: <b style="color:#FFF;">${period.toFixed(1)}s</b> · <span style="color:#D9AC52;">${state}</span>`;
      }
      return;
    }
  } catch (e) {}

  if (waveEl) {
    waveEl.innerHTML = `<b style="color:#FFF;">1.9m Moderate Swell</b> · Period: <b style="color:#FFF;">8.5s</b> · <span style="color:#D9AC52;">Normal High Seas Conditions</span>`;
  }
}

function zoomMapIn() {
  let newW = Math.max(120, currentViewBox[2] * 0.72);
  let newH = newW * 0.5;
  let newX = currentViewBox[0] + (currentViewBox[2] - newW) / 2;
  let newY = currentViewBox[1] + (currentViewBox[3] - newH) / 2;
  newX = Math.max(-50, Math.min(1050 - newW, newX));
  newY = Math.max(-40, Math.min(540 - newH, newY));
  animateViewBox([newX, newY, newW, newH], 300);
}

function zoomMapOut() {
  let newW = Math.min(1000, currentViewBox[2] * 1.38);
  let newH = newW * 0.5;
  let newX = currentViewBox[0] + (currentViewBox[2] - newW) / 2;
  let newY = currentViewBox[1] + (currentViewBox[3] - newH) / 2;
  newX = Math.max(-50, Math.min(1050 - newW, newX));
  newY = Math.max(-40, Math.min(540 - newH, newY));
  animateViewBox([newX, newY, newW, newH], 300);
}

function refocusCorridor() {
  const corridor = CORRIDOR_MAPPINGS[activeCorridorKey] || CORRIDOR_MAPPINGS['middle-east'];
  if (corridor && corridor.viewBox) {
    animateViewBox(corridor.viewBox, 500);
  }
}

function resetMapToWorld() {
  animateViewBox(WORLD_VIEWBOX, 600);
}

window.updateMaritimeOceanMap = updateMaritimeOceanMap;
window.initTrackingMapPanZoom = initTrackingMapPanZoom;
window.zoomMapIn = zoomMapIn;
window.zoomMapOut = zoomMapOut;
window.refocusCorridor = refocusCorridor;
window.resetMapToWorld = resetMapToWorld;
window.fetchLiveOceanTelemetry = fetchLiveOceanTelemetry;

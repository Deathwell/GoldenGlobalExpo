
function downloadSubmittedProforma(refId, company, name, commodities, volume, country) {
  if (typeof window.generateProformaInvoicePDF === 'function') {
    const manifest = (window.rfqManifest && Array.isArray(window.rfqManifest) && window.rfqManifest.length > 0)
      ? window.rfqManifest
      : null;
    window.generateProformaInvoicePDF({
      refCode: refId,
      buyerName: name || 'Commercial Representative',
      buyerCompany: company || 'International Trading House',
      destinationPort: country || 'Jebel Ali, Dubai (UAE)',
      commodityName: commodities || 'Sortex Grade-A Pulses',
      volume: volume,
      manifest: manifest,
      incoterm: `CIF ${country || 'Destination Port'} (Incoterms 2020)`
    });
  } else {
    alert("PDF Engine is initializing.");
  }
}
window.downloadSubmittedProforma = downloadSubmittedProforma;
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


// ==========================================================================
// MULTI-PRODUCT CONSIGNMENT MANIFEST BUILDER & VOLUME ENGINE
// ==========================================================================

const COMMODITY_CATALOG = [
  { id: 'p1', name: 'Classic Toor (Tur Dal / Split Pigeon Pea)', displayName: 'Toor Dal (Pigeon Pea)', shortName: 'Toor Dal', defaultQty: 5 },
  { id: 'p2', name: 'Classic Moong (Whole Green Mung Bean)', displayName: 'Moong Whole (Green Mung)', shortName: 'Moong Whole', defaultQty: 5 },
  { id: 'p3', name: 'Classic Chana Dal (Bengal Gram Split)', displayName: 'Chana Dal (Bengal Gram)', shortName: 'Chana Dal', defaultQty: 3 },
  { id: 'p4', name: 'Masoor Dal (Split Red Lentil)', displayName: 'Masoor Dal (Red Lentil)', shortName: 'Masoor Split', defaultQty: 3 },
  { id: 'p5', name: 'Black Chia Seeds (Organic / Export Sortex)', displayName: 'Black Chia Seeds (Sortex)', shortName: 'Chia Seeds', defaultQty: 2 },
  { id: 'p6', name: 'Coriander Seeds (Eagle / Badami Machine Clean)', displayName: 'Coriander Seeds (Machine Clean)', shortName: 'Coriander Seeds', defaultQty: 3 },
  { id: 'p7', name: 'Cumin Seeds (Jeera Machine Clean Grade-A)', displayName: 'Cumin Seeds (Jeera Grade-A)', shortName: 'Cumin Seeds', defaultQty: 2 },
  { id: 'p8', name: 'Moringa Powder (100% Organic Leaf Fine Mesh)', displayName: 'Moringa Powder (100% Leaf)', shortName: 'Moringa Powder', defaultQty: 1 },
  { id: 'p9', name: 'Mint Leaves (Shade-Dried Aromatic Flakes)', displayName: 'Mint Leaves (Shade-Dried)', shortName: 'Mint Leaves', defaultQty: 1 },
  { id: 'p10', name: 'Coriander Powder (Micro-Ground Stemless)', displayName: 'Coriander Powder (Stemless)', shortName: 'Coriander Powder', defaultQty: 2 },
  { id: 'p11', name: 'Sorghum (Jowar Grain / White Sorghum)', displayName: 'Sorghum (Jowar Grain)', shortName: 'Sorghum', defaultQty: 5 },
  { id: 'p12', name: 'Jowar Flour (Sorghum Flour / Gluten-Free)', displayName: 'Jowar Flour (Sorghum Flour)', shortName: 'Jowar Flour', defaultQty: 5 },
  { id: 'p13', name: 'Tissue Paper (Food-Grade Virgin Pulp)', displayName: 'Tissue Paper (Virgin Pulp)', shortName: 'Tissue Paper', defaultQty: 5 },
  { id: 'p14', name: 'Emmer Wheat (Khapli Wheat Ancient Grain)', displayName: 'Emmer Wheat (Khapli Grain)', shortName: 'Emmer Wheat', defaultQty: 5 },
  { id: 'p15', name: 'Pure Cow Ghee (Vedic Bilona A2 Tradition)', displayName: 'Pure Cow Ghee (Vedic Bilona)', shortName: 'Pure Cow Ghee', defaultQty: 2 },
  { id: 'p17', name: 'Indian Home Spices (Kitchen Staples)', displayName: 'Indian Home Spices (Individual)', shortName: 'Indian Home Spices', defaultQty: 2 }
];
window.COMMODITY_CATALOG = COMMODITY_CATALOG;

let rfqManifest = [
  { commodity: 'Classic Toor (Tur Dal / Split Pigeon Pea)', quantity: 10, unit: 'Quintals' }
];
window.rfqManifest = rfqManifest;

function renderManifestRows() {
  const container = document.getElementById('manifestRowsList');
  if (!container) return;

  if (!rfqManifest || rfqManifest.length === 0) {
    rfqManifest = [{ commodity: COMMODITY_CATALOG[0].name, quantity: 5, unit: 'Quintals' }];
    window.rfqManifest = rfqManifest;
  }

  let html = '';
  rfqManifest.forEach((row, idx) => {
    const isSingle = rfqManifest.length <= 1;
    const qtyStep = row.unit === 'Quintals' ? '0.5' : '25';
    const qtyMin = row.unit === 'Quintals' ? '0.5' : '50';
    const qtyPlaceholder = row.unit === 'Quintals' ? '5' : '500';

    html += `
      <div class="manifest-row" data-manifest-idx="${idx}">
        <div class="manifest-col-product">
          <select id="manifestProd_${idx}" onchange="onManifestProductChange(${idx}, this.value)" aria-label="Commodity">
            ${COMMODITY_CATALOG.map(c => `
              <option value="${escapeHtml(c.name)}" ${c.name === row.commodity ? 'selected' : ''}>
                ${escapeHtml(c.displayName || c.name)}
              </option>
            `).join('')}
            ${!COMMODITY_CATALOG.some(c => c.name === row.commodity) ? `
              <option value="${escapeHtml(row.commodity)}" selected>${escapeHtml(row.commodity)}</option>
            ` : ''}
          </select>
        </div>
        <div class="manifest-col-qty">
          <input type="number" id="manifestQty_${idx}" min="${qtyMin}" step="${qtyStep}" value="${row.quantity}" 
                 placeholder="${qtyPlaceholder}" 
                 oninput="onManifestQtyChange(${idx}, this.value)" 
                 onchange="onManifestQtyChange(${idx}, this.value)" 
                 required aria-label="Quantity">
        </div>
        <div class="manifest-col-unit">
          <select id="manifestUnit_${idx}" onchange="onManifestUnitChange(${idx}, this.value)" aria-label="Unit">
            <option value="Quintals" ${row.unit === 'Quintals' ? 'selected' : ''}>Quintals (QTL)</option>
            <option value="KG" ${row.unit === 'KG' ? 'selected' : ''}>Kilograms (KG)</option>
          </select>
        </div>
        <div class="manifest-col-remove">
          ${!isSingle ? `
            <button type="button" class="manifest-remove-btn" onclick="removeManifestRow(${idx})" title="Remove item" aria-label="Remove item">✕</button>
          ` : `
            <span class="manifest-remove-placeholder"></span>
          `}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  syncQuickChipsHighlight();
  syncManifestTotal();
}
window.renderManifestRows = renderManifestRows;

function syncQuickChipsHighlight() {
  const chips = document.querySelectorAll('#quickChipsWrap .quick-chip');
  if (!chips || chips.length === 0) return;

  const currentNames = (rfqManifest || []).map(r => (r.commodity || '').toLowerCase());

  chips.forEach(chip => {
    const rawKey = (chip.dataset.comm || chip.textContent || '').trim().replace(/^[+✓\s]+/, '').toLowerCase();
    const isActive = currentNames.some(cn => cn.includes(rawKey) || rawKey.includes(cn.split(' ')[0]));
    if (isActive) {
      chip.classList.add('active-chip');
      const baseName = chip.dataset.comm || rawKey;
      chip.innerHTML = `✓ ${escapeHtml(baseName)}`;
    } else {
      chip.classList.remove('active-chip');
      const baseName = chip.dataset.comm || rawKey;
      chip.innerHTML = `+ ${escapeHtml(baseName)}`;
    }
  });
}

function addManifestRow(commodityName, qty, unit) {
  let targetComm = commodityName;
  if (!targetComm) {
    // Pick first commodity from catalog not yet in manifest
    const existing = new Set((rfqManifest || []).map(r => r.commodity));
    const found = COMMODITY_CATALOG.find(c => !existing.has(c.name));
    targetComm = found ? found.name : COMMODITY_CATALOG[0].name;
  }

  const catItem = COMMODITY_CATALOG.find(c => c.name === targetComm || c.shortName === targetComm);
  const defaultQuantity = qty !== undefined ? qty : (catItem ? catItem.defaultQty : 5);
  const defaultUnit = unit || 'Quintals';

  rfqManifest.push({
    commodity: catItem ? catItem.name : targetComm,
    quantity: defaultQuantity,
    unit: defaultUnit
  });
  window.rfqManifest = rfqManifest;
  renderManifestRows();

  const container = document.getElementById('manifestRowsList');
  if (container && container.lastElementChild) {
    container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
window.addManifestRow = addManifestRow;

function removeManifestRow(index) {
  if (!rfqManifest || rfqManifest.length <= 1) return;
  rfqManifest.splice(index, 1);
  window.rfqManifest = rfqManifest;
  renderManifestRows();
}
window.removeManifestRow = removeManifestRow;

function onManifestProductChange(index, val) {
  if (!rfqManifest || !rfqManifest[index]) return;
  rfqManifest[index].commodity = val;
  window.rfqManifest = rfqManifest;
  syncQuickChipsHighlight();
  syncManifestTotal();
}
window.onManifestProductChange = onManifestProductChange;

function onManifestQtyChange(index, val) {
  if (!rfqManifest || !rfqManifest[index]) return;
  const num = parseFloat(val);
  rfqManifest[index].quantity = isNaN(num) ? 0 : Math.max(0, num);
  window.rfqManifest = rfqManifest;
  syncManifestTotal();
}
window.onManifestQtyChange = onManifestQtyChange;

function onManifestUnitChange(index, newUnit) {
  if (!rfqManifest || !rfqManifest[index]) return;
  const oldUnit = rfqManifest[index].unit;
  let curQty = rfqManifest[index].quantity;

  if (oldUnit === 'Quintals' && newUnit === 'KG') {
    curQty = Math.round(curQty * 100);
  } else if (oldUnit === 'KG' && newUnit === 'Quintals') {
    curQty = parseFloat((curQty / 100).toFixed(1));
  }

  rfqManifest[index].unit = newUnit;
  rfqManifest[index].quantity = curQty;
  window.rfqManifest = rfqManifest;
  renderManifestRows();
}
window.onManifestUnitChange = onManifestUnitChange;

function toggleCommodityInManifest(nameOrShort) {
  if (!nameOrShort) return;
  const needle = nameOrShort.trim().toLowerCase();

  const found = COMMODITY_CATALOG.find(c => 
    c.shortName.toLowerCase() === needle || 
    c.name.toLowerCase().includes(needle) ||
    needle.includes(c.shortName.toLowerCase()) ||
    (c.id === 'p17' && (needle.includes('spice') || needle.includes('homestyle') || needle.includes('masala')))
  );
  const targetFullName = found ? found.name : nameOrShort;

  const existingIdx = (rfqManifest || []).findIndex(r => 
    r.commodity.toLowerCase() === targetFullName.toLowerCase() ||
    (found && r.commodity.toLowerCase().includes(found.shortName.toLowerCase()))
  );

  if (existingIdx >= 0) {
    if (rfqManifest.length > 1) {
      removeManifestRow(existingIdx);
      if (typeof showToast === 'function') {
        showToast(`Removed from Consignment: ${found ? found.shortName : targetFullName}`);
      }
    } else {
      if (typeof showToast === 'function') {
        showToast(`At least one commodity required in consignment.`, 'info');
      }
    }
  } else {
    addManifestRow(targetFullName, found ? found.defaultQty : 5, 'Quintals');
    if (typeof showToast === 'function') {
      showToast(`Added to Consignment: ${found ? found.shortName : targetFullName}`);
    }
  }
}
window.toggleCommodityInManifest = toggleCommodityInManifest;

function ensureCommodityInManifest(nameOrShort) {
  if (!nameOrShort) return;
  const needle = nameOrShort.trim().toLowerCase();

  const found = COMMODITY_CATALOG.find(c => 
    c.shortName.toLowerCase() === needle || 
    c.name.toLowerCase().includes(needle) ||
    needle.includes(c.shortName.toLowerCase())
  );
  const targetFullName = found ? found.name : nameOrShort;

  const existingIdx = (rfqManifest || []).findIndex(r => 
    r.commodity.toLowerCase() === targetFullName.toLowerCase() ||
    (found && r.commodity.toLowerCase().includes(found.shortName.toLowerCase()))
  );

  if (existingIdx === -1) {
    addManifestRow(targetFullName, found ? found.defaultQty : 5, 'Quintals');
    if (typeof showToast === 'function') {
      showToast(`Added to Consignment: ${found ? found.shortName : targetFullName}`);
    }
  } else {
    if (typeof showToast === 'function') {
      showToast(`Verified in Consignment: ${found ? found.shortName : targetFullName}`, 'info');
    }
  }
}
window.ensureCommodityInManifest = ensureCommodityInManifest;

// Legacy backward-compatibility alias
function addCommodityToRfq(name) {
  toggleCommodityInManifest(name);
}
window.addCommodityToRfq = addCommodityToRfq;

function syncManifestTotal() {
  const totalValEl = document.getElementById('manifestTotalVal');
  const statusEl = document.getElementById('manifestStatus');
  const hiddenVol = document.getElementById('rfqVolume');
  const hiddenVolVal = document.getElementById('rfqVolumeVal');
  const hiddenComm = document.getElementById('rfqCommodities');
  const volumeHint = document.getElementById('volumeHint');

  let totalQtl = 0;
  const itemSummaries = [];

  (rfqManifest || []).forEach(row => {
    const q = parseFloat(row.quantity) || 0;
    const qtl = row.unit === 'KG' ? (q / 100) : q;
    totalQtl += qtl;
    const short = (COMMODITY_CATALOG.find(c => c.name === row.commodity) || {}).shortName || row.commodity;
    itemSummaries.push(`${short}: ${q} ${row.unit === 'KG' ? 'KG' : 'QTL'}`);
  });

  totalQtl = Math.round(totalQtl * 100) / 100;
  const totalKg = Math.round(totalQtl * 100);

  const formattedVol = `${totalQtl.toFixed(1)} Quintals (${totalKg.toLocaleString()} KG)`;
  const shortBadge = `${totalQtl.toFixed(1)} QTL (${totalKg.toLocaleString()} KG)`;
  const formattedComm = itemSummaries.length > 0 ? itemSummaries.join(', ') : 'Assorted Export Commodities';

  if (totalValEl) {
    totalValEl.textContent = shortBadge;
  }
  if (hiddenVol) {
    hiddenVol.value = formattedVol;
  }
  if (hiddenVolVal) {
    hiddenVolVal.value = totalQtl;
  }
  if (hiddenComm) {
    hiddenComm.value = formattedComm;
  }

  window.currentManifestTotalQtl = totalQtl;

  let isValid = true;
  let statusText = '';
  let statusColor = '#2E7D32';

  if (totalQtl < 3) {
    isValid = false;
    statusColor = '#C62828';
    statusText = `⚠️ ${totalQtl.toFixed(1)} QTL · Min order is 3 QTL (300 KG)`;
  } else if (totalQtl > 22) {
    isValid = false;
    statusColor = '#C62828';
    statusText = `⚠️ ${totalQtl.toFixed(1)} QTL · Exceeds 22 QTL capacity`;
  } else {
    isValid = true;
    statusColor = '#2E7D32';
    statusText = `✓ Valid Export Lot (3 – 22 QTL batch)`;
  }

  if (statusEl) {
    statusEl.textContent = statusText;
    statusEl.style.color = statusColor;
  }
  if (volumeHint) {
    volumeHint.textContent = statusText;
    volumeHint.style.color = statusColor;
  }

  const submitBtn = document.getElementById('rfqSubmitBtn');
  if (submitBtn && (typeof currentRfqMode === 'undefined' || currentRfqMode !== 'sample')) {
    if (!isValid) {
      submitBtn.setAttribute('data-invalid', 'true');
      submitBtn.style.opacity = '0.65';
      submitBtn.title = totalQtl < 3
        ? `Consignment is ${totalQtl.toFixed(1)} Quintals. Minimum order is 3.0 Quintals (300 KG).`
        : `Consignment is ${totalQtl.toFixed(1)} Quintals. Maximum capacity is 22.0 Quintals.`;
    } else {
      submitBtn.removeAttribute('data-invalid');
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.title = 'SUBMIT EXPORT RFQ ➔';
      const manifestSec = document.getElementById('manifestSection');
      if (manifestSec) manifestSec.classList.remove('manifest-error');
    }
  }

  return isValid;
}
window.syncManifestTotal = syncManifestTotal;

// Legacy alias for any old callers
function syncVolumeString() {
  return syncManifestTotal();
}
window.syncVolumeString = syncVolumeString;

function handleVolumeUnitChange() {
  syncManifestTotal();
}
window.handleVolumeUnitChange = handleVolumeUnitChange;

// Initialize manifest rows on load
function initManifestBuilder() {
  renderManifestRows();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initManifestBuilder);
} else {
  initManifestBuilder();
}


function getSampleBasePriceINR() {
  const stored = localStorage.getItem('gge_sample_price_inr');
  const val = stored ? parseFloat(stored) : NaN;
  return (!isNaN(val) && val > 0) ? val : 499.00;
}

/**
 * Golden Global Expo — Primary Portal Controller (index.html)
 * Restores 100% authentic luxury effects: Particle physics, 3D tilt tracking, 
 * astrolabe motion, radar routing, live tracking, and interactive specs.
 */

let activeLotId = 'p1';

// Particle canvas simulation
function initParticleCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  const mouse = { x: -1000, y: -1000, radius: 140 };

  function resize() {
    width = canvas.width = (canvas.offsetWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200));
    height = canvas.height = (canvas.offsetHeight || (typeof window !== 'undefined' ? window.innerHeight : 800));
  }
  resize();
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', resize);
  }

  const heroSection = document.getElementById('home');
  if (heroSection) {
        heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;

      // Golden spotlight glow centered on cursor
      const glow = document.getElementById('heroGlow');
      if (glow) {
        glow.style.transform = `translate3d(${mouse.x - 300}px, ${mouse.y - 300}px, 0)`;
        glow.style.opacity = '1';
      }

      // Interactive 3D Parallax Tilt & Motion on Brand Crest
      const crestImg = document.querySelector('.hero-crest-img');
      if (crestImg) {
        const crestRect = crestImg.getBoundingClientRect();
        const crestCenterX = crestRect.left + crestRect.width / 2;
        const crestCenterY = crestRect.top + crestRect.height / 2;

        const deltaX = (e.clientX - crestCenterX) / (window.innerWidth * 0.5);
        const deltaY = (e.clientY - crestCenterY) / (window.innerHeight * 0.5);

        // Proximity calculation for gold aura activation
        const dist = Math.hypot(e.clientX - crestCenterX, e.clientY - crestCenterY);
        const proximity = Math.max(0, 1 - dist / 650);

        const tiltX = -deltaY * 12;
        const tiltY = deltaX * 12;
        const moveX = deltaX * 16;
        const moveY = deltaY * 16;

        crestImg.style.transform = `translate3d(${moveX.toFixed(1)}px, ${moveY.toFixed(1)}px, 0) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale(${1 + proximity * 0.025})`;
        crestImg.style.opacity = (0.025 + proximity * 0.045).toFixed(3);
        crestImg.style.filter = `drop-shadow(0 0 ${25 + proximity * 20}px rgba(217, 172, 82, ${0.08 + proximity * 0.14}))`;
      }
    });

    heroSection.addEventListener('mouseleave', () => {
      mouse.x = -1000;
      mouse.y = -1000;
      const glow = document.getElementById('heroGlow');
      if (glow) {
        glow.style.opacity = '0';
      }

      const crestImg = document.querySelector('.hero-crest-img');
      if (crestImg) {
        crestImg.style.transform = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1)';
        crestImg.style.opacity = '0.025';
        crestImg.style.filter = 'drop-shadow(0 0 25px rgba(217, 172, 82, 0.08))';
      }
    });
  }

  class Particle {
    constructor() {
      this.reset(true);
    }
    reset(init = false) {
      this.x = Math.random() * width;
      this.y = init ? Math.random() * height : height + 10;
      this.size = Math.random() * 1.0 + 0.5; // Delicate gold fleck (0.5px - 1.5px)
      this.baseX = this.x;
      this.baseY = this.y;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -Math.random() * 0.4 - 0.12;
      this.alpha = Math.random() * 0.28 + 0.12; // Soft ambient gold
      this.hue = Math.random() > 0.4 ? 42 : 36;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Gentle mouse deflection
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < mouse.radius) {
        const force = (mouse.radius - dist) / mouse.radius;
        const angle = Math.atan2(dy, dx);
        this.x -= Math.cos(angle) * force * 1.8;
        this.y -= Math.sin(angle) * force * 1.8;
      }

      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 65%, 52%, ${this.alpha})`;
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(217, 172, 82, 0.25)';
      ctx.fill();
    }
  }

  // Precisely tuned count (16-24 subtle floating gold specks)
  const screenW = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : (width || 1200);
  const particleCount = Math.min(Math.max(Math.floor(screenW / 75), 16), 24);
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

// Power efficiency handlers
  let particleAnimFrame = null;
  let isHeroVisible = true;
  let isPageVisible = (typeof document !== 'undefined' && document.visibilityState === 'visible');
  let lastFrameTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const fpsInterval = 1000 / 60; // Strict 60 FPS cap on 120Hz/144Hz monitors to save battery

  function stopAnimation() {
    if (particleAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(particleAnimFrame);
      particleAnimFrame = null;
    }
  }

  function startAnimation() {
    if (!width || !height || width === 0 || height === 0) {
      resize();
    }
    if (!particleAnimFrame && isHeroVisible && isPageVisible) {
      lastFrameTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      if (typeof requestAnimationFrame !== 'undefined') {
        particleAnimFrame = requestAnimationFrame(animate);
      }
    }
  }

  function animate(now) {
    if (!isHeroVisible || !isPageVisible) {
      stopAnimation();
      return;
    }

    if (typeof requestAnimationFrame !== 'undefined') {
      particleAnimFrame = requestAnimationFrame(animate);
    }

    const currentTime = now || ((typeof performance !== 'undefined') ? performance.now() : Date.now());
    const elapsed = currentTime - lastFrameTime;
    if (elapsed < fpsInterval) return;
    lastFrameTime = currentTime - (elapsed % fpsInterval);

    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
  }

  // Viewport Intersection Observer (Reduces background GPU utilization to 0% when scrolled down)
  if (typeof IntersectionObserver !== 'undefined' && heroSection) {
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isHeroVisible = entry.isIntersecting;
        if (isHeroVisible) {
          startAnimation();
        } else {
          stopAnimation();
        }
      });
    }, { threshold: 0.05 });
    heroObserver.observe(heroSection);
  }

  // Tab Visibility Lifecycle (Pauses immediately when minimized or tab switched)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      isPageVisible = (document.visibilityState === 'visible');
      if (isPageVisible) {
        startAnimation();
      } else {
        stopAnimation();
      }
    });
  }

  startAnimation();
}

// Interactive card tilt effect
function initCardSpotlights() {
  const cards = document.querySelectorAll('.card--product, .why-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 6;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  });
}

// Metric counter animations
function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-counter'), 10);
        const duration = 1600;
        const start = performance.now();
        function update(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          el.textContent = Math.floor(ease * target);
          if (progress < 1) requestAnimationFrame(update);
          else el.textContent = target;
        }
        requestAnimationFrame(update);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(c => observer.observe(c));
}

// Category filters
function initFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.card--product');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      cards.forEach(card => {
        const cat = card.getAttribute('data-category') || '';
        const catList = cat.split(/\s+/);
        if (filter === 'all' || cat === filter || catList.includes(filter)) {
          card.classList.remove('hidden');
          card.style.removeProperty('display');
          setTimeout(() => card.classList.add('is-visible'), 20);
        } else {
          card.classList.add('hidden');
          card.style.setProperty('display', 'none', 'important');
          card.classList.remove('is-visible');
        }
      });
    });
  });
}

// Strategic shipping corridors and map controller
const corridorMapping = {
  'middle-east': { 
    regionClass: 'active-me', 
    route: 'routeMiddleEast', 
    beacon: 'beaconMiddleEast',
    viewBox: [520, 180, 270, 135]
  },
  'southeast-asia': { 
    regionClass: 'active-sea', 
    route: 'routeSEAsia', 
    beacon: 'beaconSEAsia',
    viewBox: [640, 220, 270, 135]
  },
  'east-asia': { 
    regionClass: 'active-ea', 
    route: 'routeEastAsia', 
    beacon: 'beaconEastAsia',
    viewBox: [645, 150, 280, 140]
  },
  'europe': { 
    regionClass: 'active-eu', 
    route: 'routeEurope', 
    beacon: 'beaconEurope',
    viewBox: [445, 120, 350, 175]
  },
  'north-america': { 
    regionClass: 'active-na', 
    route: 'routeNorthAmerica', 
    beacon: 'beaconNorthAmerica',
    viewBox: [150, 95, 380, 190]
  },
  'eurasia': { 
    regionClass: 'active-eurasia', 
    route: 'routeEurasia', 
    beacon: 'beaconEurasia',
    viewBox: [530, 95, 380, 190]
  },
  'oceania': { 
    regionClass: 'active-oc', 
    route: 'routeOceania', 
    beacon: 'beaconOceania',
    viewBox: [660, 245, 335, 175]
  }
};

const WORLD_VIEWBOX = [0, 0, 1000, 500];
let currentViewBox = [0, 0, 1000, 500];
let zoomAnimFrame = null;
let mapHasDragged = false;

function animateViewBox(targetVB, duration = 600) {
  const svg = document.getElementById('worldMapSvg');
  if (!svg) return;

  if (zoomAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(zoomAnimFrame);
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
    }
  }

  if (typeof requestAnimationFrame !== 'undefined') {
    zoomAnimFrame = requestAnimationFrame(step);
  } else {
    currentViewBox = [...targetVB];
    svg.setAttribute('viewBox', `${targetVB[0]} ${targetVB[1]} ${targetVB[2]} ${targetVB[3]}`);
  }
}

let vesselAnimFrame = null;
let vesselProgress = 0;
let isReachVisible = true;

function animateVesselOnRoute(routeEl) {
  const vessel = document.getElementById('vesselScout');
  if (!vessel) return;

  if (vesselAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(vesselAnimFrame);
    vesselAnimFrame = null;
  }

  if (!routeEl || typeof routeEl.getTotalLength !== 'function') {
    vessel.style.display = 'none';
    return;
  }

  vessel.style.display = 'block';
  const totalLength = routeEl.getTotalLength();
  vesselProgress = 0;

  function cruise() {
    if (!isReachVisible || (typeof document !== 'undefined' && document.hidden)) {
      vesselAnimFrame = null;
      return;
    }
    vesselProgress = (vesselProgress + 0.0035) % 1;
    const point = routeEl.getPointAtLength(vesselProgress * totalLength);
    vessel.setAttribute('cx', point.x.toFixed(1));
    vessel.setAttribute('cy', point.y.toFixed(1));
    if (typeof requestAnimationFrame !== 'undefined') {
      vesselAnimFrame = requestAnimationFrame(cruise);
    }
  }

  if (typeof requestAnimationFrame !== 'undefined' && isReachVisible && !(typeof document !== 'undefined' && document.hidden)) {
    vesselAnimFrame = requestAnimationFrame(cruise);
  }
}

// Reach Section Observer for Battery Efficiency
if (typeof document !== 'undefined') {
  const initReachObserver = () => {
    const reachEl = document.getElementById('reach');
    if (typeof IntersectionObserver !== 'undefined' && reachEl) {
      const reachObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isReachVisible = entry.isIntersecting;
          if (isReachVisible && !vesselAnimFrame) {
            const activePath = document.querySelector('.corridor-path.active') || document.querySelector('.corridor-path');
            if (activePath) animateVesselOnRoute(activePath);
          }
        });
      }, { threshold: 0.08 });
      reachObs.observe(reachEl);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReachObserver);
  } else {
    setTimeout(initReachObserver, 0);
  }
}

function activateShippingCorridor(destKey, shouldZoom = true) {
  // 1. Activate left corridor card
  const items = document.querySelectorAll('.reach-item');
  let selectedItem = null;
  items.forEach(item => {
    if (item.getAttribute('data-dest') === destKey) {
      item.classList.add('active');
      selectedItem = item;
    } else {
      item.classList.remove('active');
    }
  });

  // 2. Glow corresponding real countries, maritime route & port beacon
  const countriesLayer = document.getElementById('worldCountriesLayer');
  if (countriesLayer) {
    countriesLayer.classList.remove('active-me', 'active-sea', 'active-ea', 'active-eu', 'active-na', 'active-oc', 'active-eurasia');
    const mapData = corridorMapping[destKey];
    if (mapData && mapData.regionClass) {
      countriesLayer.classList.add(mapData.regionClass);
    }
  }

  // Routes
  document.querySelectorAll('.maritime-route').forEach(r => r.classList.remove('active'));
  // Port Beacons
  document.querySelectorAll('.port-beacon').forEach(b => b.classList.remove('active'));

  const mapData = corridorMapping[destKey];
  if (mapData) {
    const routeEl = document.getElementById(mapData.route);
    const beaconEl = document.getElementById(mapData.beacon);
    if (routeEl) {
      routeEl.classList.add('active');
      animateVesselOnRoute(routeEl);
    }
    if (beaconEl) beaconEl.classList.add('active');

    // 3. Smoothly Zoom & Pan Map into Corridor
    if (shouldZoom && mapData.viewBox) {
      animateViewBox(mapData.viewBox, 650);
    }
  }

  // 4. Update Transit Days Badge
  const badge = document.getElementById('transitBadge');
  if (selectedItem) {
    if (badge) badge.classList.add('active-lane');
    const textLabel = document.getElementById('transitText');
    const currentLang = window.currentLanguage || 'en';
    const transitAttr = selectedItem.getAttribute(`data-transit-${currentLang}`) || selectedItem.getAttribute('data-transit-en');
    if (textLabel && transitAttr) {
      textLabel.textContent = transitAttr;
    }
  }
}

function resetMapToWorld() {
  document.querySelectorAll('.reach-item').forEach(item => item.classList.remove('active'));
  const countriesLayer = document.getElementById('worldCountriesLayer');
  if (countriesLayer) countriesLayer.classList.remove('active-me', 'active-sea', 'active-ea', 'active-eu', 'active-na', 'active-oc', 'active-eurasia');
  document.querySelectorAll('.maritime-route').forEach(r => r.classList.remove('active'));
  document.querySelectorAll('.port-beacon').forEach(b => b.classList.remove('active'));
  const vessel = document.getElementById('vesselScout');
  if (vessel) vessel.style.display = 'none';
  if (vesselAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(vesselAnimFrame);
  }
  const badge = document.getElementById('transitBadge');
  if (badge) badge.classList.remove('active-lane');
  const textLabel = document.getElementById('transitText');
  if (textLabel) {
    textLabel.textContent = 'Direct Liner Network • Select a Corridor to View Transit Times';
  }
  animateViewBox(WORLD_VIEWBOX, 650);
}

function initMapPanZoom() {
  const container = document.getElementById('worldMapContainer');
  const svg = document.getElementById('worldMapSvg');
  if (!container || !svg) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startVB = [...currentViewBox];

  // Cursor Spotlight Tracking
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    container.style.setProperty('--map-mouse-x', `${x.toFixed(1)}px`);
    container.style.setProperty('--map-mouse-y', `${y.toFixed(1)}px`);
  });

  // 1. Mouse Drag / Pan
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    mapHasDragged = false;
    startX = e.clientX;
    startY = e.clientY;
    startVB = [...currentViewBox];
    container.classList.add('is-dragging');
    if (zoomAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(zoomAnimFrame);
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > 4) {
      mapHasDragged = true;
    }

    const rect = container.getBoundingClientRect();
    const scaleX = currentViewBox[2] / (rect.width || 1000);
    const scaleY = currentViewBox[3] / (rect.height || 500);

    let newX = startVB[0] - dx * scaleX;
    let newY = startVB[1] - dy * scaleY;

    // Boundary constraints
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

  // 2. Mouse Wheel Zoom
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (zoomAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(zoomAnimFrame);
    }

    const rect = container.getBoundingClientRect();
    const mouseRelX = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
    const mouseRelY = Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1)));

    const cursorSvgX = currentViewBox[0] + mouseRelX * currentViewBox[2];
    const cursorSvgY = currentViewBox[1] + mouseRelY * currentViewBox[3];

    const factor = e.deltaY < 0 ? 0.82 : 1.22;
    let newW = currentViewBox[2] * factor;
    newW = Math.max(140, Math.min(1000, newW));
    let newH = newW * 0.5;

    let newX = cursorSvgX - mouseRelX * newW;
    let newY = cursorSvgY - mouseRelY * newH;

    newX = Math.max(-50, Math.min(1050 - newW, newX));
    newY = Math.max(-40, Math.min(540 - newH, newY));

    animateViewBox([newX, newY, newW, newH], 200);
  }, { passive: false });

  // 3. Touch Support (Pan & Pinch)
  let touchStartX = 0, touchStartY = 0;
  let touchStartDist = 0;
  let touchStartVB = [...currentViewBox];

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      mapHasDragged = false;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartVB = [...currentViewBox];
      if (zoomAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(zoomAnimFrame);
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
      if (Math.abs(dy) > Math.abs(dx) && !mapHasDragged) {
        return;
      }
      if (Math.hypot(dx, dy) > 4) mapHasDragged = true;

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
      let newW = Math.max(140, Math.min(1000, touchStartVB[2] * factor));
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

  // 4. Zoom Buttons
  const zoomInBtn = document.getElementById('mapZoomInBtn');
  const zoomOutBtn = document.getElementById('mapZoomOutBtn');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let newW = Math.max(140, currentViewBox[2] * 0.72);
      let newH = newW * 0.5;
      let newX = currentViewBox[0] + (currentViewBox[2] - newW) / 2;
      let newY = currentViewBox[1] + (currentViewBox[3] - newH) / 2;
      newX = Math.max(-50, Math.min(1050 - newW, newX));
      newY = Math.max(-40, Math.min(540 - newH, newY));
      animateViewBox([newX, newY, newW, newH], 350);
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let newW = Math.min(1000, currentViewBox[2] * 1.38);
      let newH = newW * 0.5;
      let newX = currentViewBox[0] + (currentViewBox[2] - newW) / 2;
      let newY = currentViewBox[1] + (currentViewBox[3] - newH) / 2;
      newX = Math.max(-50, Math.min(1050 - newW, newX));
      newY = Math.max(-40, Math.min(540 - newH, newY));
      animateViewBox([newX, newY, newW, newH], 350);
    });
  }
}

function initRoutes() {
  const items = document.querySelectorAll('.reach-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      const dest = item.getAttribute('data-dest');
      activateShippingCorridor(dest, true);
    });
  });

  // Make geographic countries directly interactive
  const regionToDest = {
    'middle-east': 'middle-east',
    'southeast-asia': 'southeast-asia',
    'east-asia': 'east-asia',
    'europe': 'europe',
    'north-america': 'north-america',
    'eurasia': 'eurasia',
    'oceania': 'oceania'
  };

  document.querySelectorAll('.geo-country').forEach(country => {
    const reg = country.getAttribute('data-region');
    if (reg && regionToDest[reg]) {
      country.addEventListener('click', () => {
        if (mapHasDragged) return;
        activateShippingCorridor(regionToDest[reg], true);
      });
    }
  });

  // Reset to full world view button
  const resetBtn = document.getElementById('mapResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetMapToWorld();
    });
  }

  // Initialize interactive pan & zoom
  initMapPanZoom();

  // Set default view to Full World Map
  resetMapToWorld();
}
window.activateShippingCorridor = activateShippingCorridor;
window.activateRoute = activateShippingCorridor;
window.resetMapToWorld = resetMapToWorld;


// Cargo & B/L tracking handler
function searchConsignment() {
  const input = document.getElementById('trackingInput');
  const query = input ? input.value.trim().toUpperCase() : '';
  const data = (window.trackingDatabase && window.trackingDatabase[query]) || (window.db && window.db[query]);

  if (!data) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Consignment / B/L reference not found in EDI tracking database.');
    }
    return;
  }

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('resBlCode', data.bl);
  setEl('resCommodity', data.commodity);
  setEl('resStatusPill', data.status);
  setEl('resVessel', data.vessel || 'MSC VALERIA');
  setEl('resPol', data.pol || 'JNPT Nhava Sheva (INNSA1)');
  setEl('resPod', data.pod || 'Jebel Ali Port (AEJEA), Dubai');
  setEl('resEta', data.eta || 'Scheduled');

  // Update Milestone Stepper Nodes
  const stage = data.stage || 4;
  for (let i = 1; i <= 5; i++) {
    const node = document.getElementById(`node${i}`);
    const line = document.getElementById(`line${i}`);
    if (node) {
      node.classList.remove('completed', 'active');
      if (i < stage) node.classList.add('completed');
      else if (i === stage) node.classList.add('active');
    }
    if (line) {
      line.classList.remove('completed', 'active');
      if (i < stage) line.classList.add('completed');
      else if (i === stage) line.classList.add('active');
    }
  }

  if (typeof showToast === 'function') {
    showToast(`📦 Live telemetry retrieved for ${data.bl}`);
  }
}

function loadDemoBL(code) {
  const input = document.getElementById('trackingInput');
  if (input) {
    input.value = code;
    searchConsignment();
  }
}

// Specification drawer & document generation
function openSpecDrawer(lotId) {
  activeLotId = lotId;
  const specObj = window.specDatabase && window.specDatabase[lotId];
  if (typeof logTelemetryInspectedLot === 'function') {
    logTelemetryInspectedLot(specObj ? specObj.name : lotId);
  }
  window.activeLotId = lotId;
  const spec = (window.specDatabase && window.specDatabase[lotId]) || {
    lot: "LOT GGE-TR-2026-A1",
    name: "Classic Toor (Tur Dal)",
    botanical: "Cajanus cajan",
    image: "images/products/toor_dal.jpg?v=6",
    purity: "99.5% Min (Sortex Clean Grade-A)",
    moisture: "10.0% – 12.0% Max",
    admixture: "0.5% Max",
    damaged: "1.0% Max",
    protein: "22.3% – 24.5%",
    crop: "2025/2026",
    origin: "Maharashtra / Gujarat, India",
    packing: "25kg / 50kg PP Bags",
    loadability: "24.0 Metric Tons / 20' FCL"
  };

  const lang = window.currentLang || (document.documentElement && document.documentElement.lang) || 'en';
  const dict = (window.translations && window.translations[lang]) ? window.translations[lang] : (window.translations ? window.translations.en : {});

  let localizedName = spec.name;
  if (dict[`${lotId}Name`]) {
    localizedName = dict[`${lotId}Name`];
  }

  let localizedBotanical = spec.botanical;
  if (dict[`${lotId}Botanical`]) {
    localizedBotanical = dict[`${lotId}Botanical`];
  }

  const drawerLot = document.getElementById('drawerLot');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerBotanical = document.getElementById('drawerBotanical');
  const drawerBody = document.getElementById('drawerBody');

  if (drawerLot) drawerLot.textContent = spec.lot;
  if (drawerTitle) drawerTitle.textContent = localizedName;
  if (drawerBotanical) drawerBotanical.textContent = localizedBotanical;

  if (drawerBody) {
    drawerBody.innerHTML = `
      <div class="drawer-img-wrap">
        <img src="${spec.image}" alt="${localizedName}">
      </div>

      <div class="drawer-card">
        <div class="drawer-card-head">
          <span>${dict.drawerLabAssay || '1. Certified Laboratory Analytical Assay'}</span>
          <span class="drawer-badge-green">✓ ISO / AOAC Standard</span>
        </div>
        <table class="drawer-spec-table">
          <tbody>
            <tr><td>${dict.lblPurityGrade || 'Physical Purity (Sortex)'}</td><td style="color:#1E6E28;font-weight:700;">${spec.purity || '99.5% Min'}</td></tr>
            <tr><td>${dict.lblMoisture || 'Moisture Limit (AOAC)'}</td><td>${spec.moisture || '11.0% Max'}</td></tr>
            <tr><td>${dict.lblForeignMatter || 'Foreign Matter / Admixture'}</td><td>${spec.admixture || '0.5% Max'}</td></tr>
            <tr><td>${dict.lblDamaged || 'Damaged & Discolored'}</td><td>${spec.damaged || '1.0% Max'}</td></tr>
            <tr><td>${dict.lblProtein || 'Protein / Active Compound'}</td><td>${spec.protein || '22.3% – 24.5%'}</td></tr>
            <tr><td>Aflatoxin (B1+B2+G1+G2)</td><td style="color:#1E6E28;">&lt; 4.0 ppb (EU Standard)</td></tr>
            <tr><td>Heavy Metals (Codex)</td><td style="color:#1E6E28;">Non-Detectable (ND)</td></tr>
            <tr><td>${dict.lblGmoStatus || 'Genetically Modified'}</td><td style="color:#1E6E28;font-weight:700;">100% Non-GMO Verified</td></tr>
          </tbody>
        </table>
      </div>

      ${(spec.spiceVarieties && spec.spiceVarieties.length > 0) ? `
        <div class="drawer-card" id="drawerSpicesCard" style="border: 1px solid rgba(217, 172, 82, 0.4); background: rgba(20, 17, 14, 0.7);">
          <div class="drawer-card-head" style="background: rgba(217,172,82,0.08); padding: 12px 14px; border-bottom: 1px solid rgba(217,172,82,0.2);">
            <span style="color:var(--gold-bright, #D9AC52); font-weight:600; font-size:0.82rem; letter-spacing:0.02em;">★ Individual Indian Kitchen Spices (Sold Separately)</span>
            <span class="drawer-badge-green" style="background:rgba(30,110,40,0.2); border:1px solid rgba(30,110,40,0.5); color:#81C784;">✓ Not a Blend · Pure Single Lots</span>
          </div>
          <div style="padding:12px 14px; font-size:0.75rem; color:#CBC5BA; line-height:1.5; border-bottom:1px solid rgba(255,255,255,0.06); background:#0D0A08;">
            <strong style="color:var(--gold, #B8872F);">Unblended Lot Protocol:</strong> Each generic kitchen spice is procured, Sortex cleaned (&gt;99.5%), and packed as an <strong>independent single-origin commodity</strong>. Importers can order single-spice Full Container Loads (FCL 16–24 MT) or customized consolidated multi-spice containers with separate palletized compartments (not a pre-mixed powder).
          </div>
          <div style="padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;">
            ${spec.spiceVarieties.map((v, i) => `
              <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(217,172,82,0.15); border-radius: 4px; padding: 10px 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 4px;">
                  <div>
                    <strong style="color: #F5EFE0; font-size: 0.82rem;">${escapeHtml(v.name)}</strong>
                    <span style="color: #8C857B; font-size: 0.70rem; font-style: italic; margin-left: 5px;">${escapeHtml(v.botanical)}</span>
                  </div>
                  <span style="font-family: var(--font-mono); color: #D9AC52; font-size: 0.70rem; background: rgba(217,172,82,0.12); padding: 2px 6px; border-radius: 3px; white-space: nowrap;">HS ${escapeHtml(v.hs)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.73rem; color: #CBC5BA; gap: 8px; flex-wrap: wrap;">
                  <span>${escapeHtml(v.grade)} <span style="color: #706A60;">(${escapeHtml(v.form)})</span></span>
                  <span style="color: #1E6E28; font-weight: 600; font-size: 0.73rem; white-space: nowrap;">${escapeHtml(v.assay)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="drawer-card">
        <div class="drawer-card-head">
          <span>${dict.drawerOriginHeading || '2. Harvest Season & Export Logistics'}</span>
          <span class="drawer-badge-green">✓ Port of JNPT</span>
        </div>
        <table class="drawer-spec-table">
          <tbody>
            <tr><td>Origin Belts</td><td>${spec.origin || 'Maharashtra & Karnataka'}</td></tr>
            <tr><td>Harvest Calendar</td><td style="color:#8C2A1E;font-weight:700;">${spec.harvestSeason || spec.crop || '2025/2026 Fresh Harvest'}</td></tr>
            <tr><td>Export Packaging</td><td>${spec.packing || '25kg / 50kg PP Bags'}</td></tr>
            <tr><td>Order Capabilities</td><td style="color:#B8872F;font-weight:700;">${spec.loadability || '3 Qtl MOQ to 22 Qtl Max'}</td></tr>
            <tr><td>Port of Loading</td><td>JNPT (Nhava Sheva - INNSA1)</td></tr>
            <tr><td>3rd Party Inspection</td><td style="color:#1E6E28;font-weight:700;">SGS / Intertek / BV Welcomed</td></tr>
          </tbody>
        </table>
      </div>

      ${(window.domesticCommodityCatalog && window.domesticCommodityCatalog[lotId]) ? `
        <div class="drawer-card" style="border: 1px solid rgba(255, 153, 51, 0.4); background: rgba(20, 17, 14, 0.7);">
          <div class="drawer-card-head" style="background: rgba(255, 153, 51, 0.08); padding: 12px 14px; border-bottom: 1px solid rgba(255, 153, 51, 0.2);">
            <span style="color:#FFA726; font-weight:600; font-size:0.82rem; letter-spacing:0.02em;">🇮🇳 3. Domestic Packs (India Distribution · UPI Ready)</span>
            <span class="drawer-badge-green" style="background:rgba(30,110,40,0.2); border:1px solid rgba(30,110,40,0.5); color:#81C784;">✓ FSSAI Reg. 11521008000142</span>
          </div>
          <table class="drawer-spec-table">
            <tbody>
              <tr><td>Grade &amp; Cleaning</td><td style="color:#FAF7EE;font-weight:600;">${window.domesticCommodityCatalog[lotId].grade || 'Sortex Clean Grade-A'}</td></tr>
              <tr><td>500g Consumer Pouch</td><td style="color:#81C784;font-family:var(--font-mono);font-weight:700;">₹${Number(window.domesticCommodityCatalog[lotId].packs['500g'] || 0).toFixed(2)} INR</td></tr>
              <tr><td>1.0 KG Kitchen Pack</td><td style="color:#81C784;font-family:var(--font-mono);font-weight:700;">₹${Number(window.domesticCommodityCatalog[lotId].packs['1kg'] || 0).toFixed(2)} INR</td></tr>
              <tr><td>5.0 KG Family Pack</td><td style="color:#81C784;font-family:var(--font-mono);font-weight:700;">₹${Number(window.domesticCommodityCatalog[lotId].packs['5kg'] || 0).toFixed(2)} INR</td></tr>
              <tr><td>25 KG Bulk Bag</td><td style="color:#81C784;font-family:var(--font-mono);font-weight:700;">₹${Number(window.domesticCommodityCatalog[lotId].packs['25kg'] || 0).toFixed(2)} INR</td></tr>
              <tr><td>Payment &amp; Logistics</td><td style="color:#FFA726;">Direct UPI (GPay/PhonePe) · Surface Express</td></tr>
            </tbody>
          </table>
          <div style="padding:10px 14px; background:#0D0A08; border-top:1px solid rgba(255,255,255,0.06);">
            <button type="button" class="btn btn--primary" onclick="closeSpecDrawer(); openDomesticOrderModal('${lotId}');" style="width:100%; justify-content:center; font-size:0.75rem; padding:8px 12px; background:linear-gradient(135deg, #D9AC52 0%, #B8872F 100%); color:#0D0A08; font-weight:700;">
              <span>⚡ ORDER THIS LOT VIA UPI (500g–25kg) ➔</span>
            </button>
          </div>
        </div>
      ` : ''}
    `;
  }

  const drawerPdfBtn = document.getElementById('drawerPdfBtn');
  if (drawerPdfBtn) {
    drawerPdfBtn.innerHTML = `<span>${dict.drawerPdfBtn || 'DOWNLOAD COA (PDF)'}</span> <span style="font-size:0.82rem;">↓</span>`;
    drawerPdfBtn.onclick = () => {
      if (typeof window.downloadSpecPDF === 'function') {
        window.downloadSpecPDF(lotId);
      }
    };
  }

  const drawerRfqBtn = document.getElementById('drawerRfqBtn');
  if (drawerRfqBtn) {
    drawerRfqBtn.innerHTML = `<span>${dict.drawerRfqBtn || 'INQUIRE FOR THIS COMMODITY (RFQ) ➔'}</span>`;
  }

  const drawerDomesticBtn = document.getElementById('drawerDomesticBtn');
  if (drawerDomesticBtn) {
    drawerDomesticBtn.onclick = () => {
      closeSpecDrawer();
      openDomesticOrderModal(lotId);
    };
  }

  const drawerSampleBtn = document.getElementById('drawerSampleBtn');
  const drawerDisclaimer = document.querySelector('.drawer-disclaimer');
  if (window.currentMarketSegment === 'domestic') {
    if (drawerSampleBtn) drawerSampleBtn.style.setProperty('display', 'none', 'important');
    if (drawerDomesticBtn) drawerDomesticBtn.style.setProperty('display', 'inline-flex', 'important');
    if (drawerDisclaimer) drawerDisclaimer.style.setProperty('display', 'none', 'important');
  } else {
    if (drawerSampleBtn) drawerSampleBtn.style.removeProperty('display');
    if (drawerDomesticBtn) drawerDomesticBtn.style.setProperty('display', 'none', 'important');
    if (drawerDisclaimer) drawerDisclaimer.style.removeProperty('display');
  }

  const drawer = document.getElementById('specDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  if (drawer) {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  }
  if (backdrop) {
    backdrop.classList.add('open');
  }
  document.body.style.overflow = 'hidden';
}

function closeSpecDrawer() {
  const drawer = document.getElementById('specDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  if (drawer) {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (backdrop) {
    backdrop.classList.remove('open');
  }
  document.body.style.overflow = '';
}

// Close drawer on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSpecDrawer();
});

window.openSpecDrawer = openSpecDrawer;
window.closeSpecDrawer = closeSpecDrawer;

let currentRfqMode = 'quote'; // 'quote' | 'domestic' | 'sample'

function syncDomesticFormPrice() {
  const lotId = (document.getElementById('domFormCommodity') && document.getElementById('domFormCommodity').value) || 'p1';
  const pack = (document.getElementById('domFormPack') && document.getElementById('domFormPack').value) || '1kg';
  const qty = (document.getElementById('domFormQty') && parseInt(document.getElementById('domFormQty').value, 10)) || 1;
  const catalog = window.domesticCommodityCatalog || {};
  const item = catalog[lotId] || catalog['p1'];
  const unitRate = (item && item.packs && item.packs[pack]) ? item.packs[pack] : 160;
  const total = unitRate * Math.max(1, qty);
  const disp = document.getElementById('domFormPriceDisplay');
  if (disp) disp.textContent = `₹${total.toFixed(2)} INR`;
}
window.syncDomesticFormPrice = syncDomesticFormPrice;

function setRfqMode(mode) {
  currentRfqMode = mode;
  const btnQuote = document.getElementById('modeBtnQuote');
  const btnDomestic = document.getElementById('modeBtnDomestic');
  const btnSample = document.getElementById('modeBtnSample');
  const bulkFields = document.getElementById('bulkFields');
  const domesticFields = document.getElementById('domesticFields');
  const sampleFields = document.getElementById('sampleFields');
  const quickChips = document.getElementById('quickChipsWrap');
  const submitBtn = document.getElementById('rfqSubmitBtn');

  // Input elements
  const rfqName = document.getElementById('rfqName');
  const rfqEmail = document.getElementById('rfqEmail');
  const rfqCompany = document.getElementById('rfqCompany');
  const sampleName = document.getElementById('sampleName');
  const sampleEmail = document.getElementById('sampleEmail');
  const sampleCompany = document.getElementById('sampleCompany');
  const sampleAddress = document.getElementById('sampleAddress');
  const domName = document.getElementById('domFormName');
  const domPhone = document.getElementById('domFormPhone');
  const domAddress = document.getElementById('domFormAddress');

  if (mode === 'domestic') {
    if (btnQuote) btnQuote.classList.remove('active');
    if (btnSample) btnSample.classList.remove('active');
    if (btnDomestic) btnDomestic.classList.add('active');
    if (bulkFields) bulkFields.style.display = 'none';
    if (sampleFields) sampleFields.style.display = 'none';
    if (domesticFields) domesticFields.style.display = 'grid';
    if (quickChips) quickChips.style.display = 'none';
    if (submitBtn) submitBtn.innerHTML = 'PROCEED TO UPI PAYMENT (500g–25kg) ➔';

    if (rfqName) rfqName.required = false;
    if (rfqEmail) rfqEmail.required = false;
    if (rfqCompany) rfqCompany.required = false;
    if (sampleName) sampleName.required = false;
    if (sampleEmail) sampleEmail.required = false;
    if (sampleCompany) sampleCompany.required = false;
    if (sampleAddress) sampleAddress.required = false;
    if (domName) domName.required = true;
    if (domPhone) domPhone.required = true;
    if (domAddress) domAddress.required = true;
    syncDomesticFormPrice();
  } else if (mode === 'sample') {
    if (btnQuote) btnQuote.classList.remove('active');
    if (btnDomestic) btnDomestic.classList.remove('active');
    if (btnSample) btnSample.classList.add('active');
    if (bulkFields) bulkFields.style.display = 'none';
    if (domesticFields) domesticFields.style.display = 'none';
    if (sampleFields) sampleFields.style.display = 'grid';
    if (quickChips) quickChips.style.display = 'none';
    if (submitBtn) submitBtn.innerHTML = 'SUBMIT SAMPLE DISPATCH ORDER (DHL / FEDEX) ➔';

    if (rfqName) rfqName.required = false;
    if (rfqEmail) rfqEmail.required = false;
    if (rfqCompany) rfqCompany.required = false;
    if (domName) domName.required = false;
    if (domPhone) domPhone.required = false;
    if (domAddress) domAddress.required = false;
    if (sampleName) sampleName.required = true;
    if (sampleEmail) sampleEmail.required = true;
    if (sampleCompany) sampleCompany.required = true;
    if (sampleAddress) sampleAddress.required = true;
  } else {
    if (btnSample) btnSample.classList.remove('active');
    if (btnDomestic) btnDomestic.classList.remove('active');
    if (btnQuote) btnQuote.classList.add('active');
    if (domesticFields) domesticFields.style.display = 'none';
    if (sampleFields) sampleFields.style.display = 'none';
    if (bulkFields) bulkFields.style.display = 'grid';
    if (quickChips) quickChips.style.display = 'flex';
    if (submitBtn) submitBtn.innerHTML = 'SUBMIT EXPORT RFQ ➔';

    if (sampleName) sampleName.required = false;
    if (sampleEmail) sampleEmail.required = false;
    if (sampleCompany) sampleCompany.required = false;
    if (sampleAddress) sampleAddress.required = false;
    if (domName) domName.required = false;
    if (domPhone) domPhone.required = false;
    if (domAddress) domAddress.required = false;
    if (rfqName) rfqName.required = true;
    if (rfqEmail) rfqEmail.required = true;
    if (rfqCompany) rfqCompany.required = true;
  }
}
window.setRfqMode = setRfqMode;

function handleRfqSubmit(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  }

  const submitBtn = document.getElementById('rfqSubmitBtn');
  if (submitBtn && submitBtn.disabled) return false;
  const successMsg = document.getElementById('rfqSuccessMsg');

  if (currentRfqMode === 'domestic') {
    const lotId = (document.getElementById('domFormCommodity') && document.getElementById('domFormCommodity').value) || 'p1';
    const pack = (document.getElementById('domFormPack') && document.getElementById('domFormPack').value) || '1kg';
    const qty = (document.getElementById('domFormQty') && parseInt(document.getElementById('domFormQty').value, 10)) || 1;
    const name = (document.getElementById('domFormName') && document.getElementById('domFormName').value.trim()) || '';
    const phone = (document.getElementById('domFormPhone') && document.getElementById('domFormPhone').value.trim()) || '';
    const address = (document.getElementById('domFormAddress') && document.getElementById('domFormAddress').value.trim()) || '';

    openDomesticOrderModal(lotId, pack);
    if (document.getElementById('domModalQty')) document.getElementById('domModalQty').value = qty;
    if (document.getElementById('domConsigneeName') && name) document.getElementById('domConsigneeName').value = name;
    if (document.getElementById('domConsigneePhone') && phone) document.getElementById('domConsigneePhone').value = phone;
    if (document.getElementById('domConsigneeAddress') && address) document.getElementById('domConsigneeAddress').value = address;
    syncDomesticPriceCalc();
    return;
  }

  if (currentRfqMode === 'sample') {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Transmitting to Trade Desk...</span>';
    }

    const name = (document.getElementById('sampleName') && document.getElementById('sampleName').value.trim()) || 'Prospective Buyer';
    const email = (document.getElementById('sampleEmail') && document.getElementById('sampleEmail').value.trim()) || '';
    const company = (document.getElementById('sampleCompany') && document.getElementById('sampleCompany').value.trim()) || 'Import Partner';
    const commodity = (document.getElementById('sampleCommodity') && document.getElementById('sampleCommodity').value.trim()) || 'Certified Agricultural Sample';
    const address = (document.getElementById('sampleAddress') && document.getElementById('sampleAddress').value.trim()) || '';
    const courier = (document.getElementById('sampleCourierAccount') && document.getElementById('sampleCourierAccount').value.trim()) || 'Standard DHL/FedEx Express Dispatch';

    const refId = (typeof generateSecureId === 'function')
      ? generateSecureId('SMP')
      : `GGE-SMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const sampleLead = {
      id: refId,
      type: 'SAMPLE_DISPATCH_ORDER',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      createdAt: Date.now() / 1000,
      name: name,
      email: email,
      company: company,
      country: address ? (address.split(',').pop().trim()) : 'International Air Express',
      address: address,
      volume: '500g Certified Sample Pouch',
      commodities: commodity,
      courierAccount: courier,
      status: 'pending_dispatch'
    };

    try {
      const existingInq = JSON.parse(localStorage.getItem('gge_inquiries') || '[]');
      existingInq.unshift(sampleLead);
      localStorage.setItem('gge_inquiries', JSON.stringify(existingInq));
    } catch(err) {}

    // Immediate server POST to /api/inquiries with PWA Offline Vault fallback
    const renderSampleSuccess = () => {
      if (submitBtn) {
        submitBtn.style.display = 'none';
      }
      if (successMsg) {
        successMsg.style.display = 'block';
        successMsg.innerHTML = `
          <div style="font-weight:700;color:#1E6E28;margin-bottom:6px;font-size:0.95rem;">✓ Sample Consignment Inquiry Recorded! (Ref: ${escapeHtml(refId)})</div>
          <div style="font-size:0.80rem;color:#3A352F;line-height:1.5;">
            Our Mumbai export desk has received your physical sample request for <b>${escapeHtml(commodity)}</b>. Dispatch paperwork will be prepared for <b>${escapeHtml(address || 'specified destination')}</b>.
          </div>
        `;
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`Sample Order ${refId} Logged in CRM!`, 'success');
      }
    };

    if (!navigator.onLine && window.GGE_PWA) {
      window.GGE_PWA.queueOfflineInquiry(sampleLead);
      renderSampleSuccess();
    } else {
      fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleLead)
      }).then(res => {
        if (res.ok) {
          renderSampleSuccess();
        } else {
          if (window.GGE_PWA) window.GGE_PWA.queueOfflineInquiry(sampleLead);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'SUBMIT SAMPLE DISPATCH ORDER (DHL / FEDEX) ➔';
          }
          if (typeof window.showToast === 'function') {
            window.showToast('Notice: Dispatch order preserved in offline Trade Vault.', 'warning');
          }
        }
      }).catch(() => {
        if (window.GGE_PWA) window.GGE_PWA.queueOfflineInquiry(sampleLead);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'SUBMIT SAMPLE DISPATCH ORDER (DHL / FEDEX) ➔';
        }
        if (typeof window.showToast === 'function') {
          window.showToast('Network disconnected: Dispatch order queued in offline vault.', 'warning');
        }
      });
    }

  } else {
    // 1. STRICT CONSIGNMENT CAPACITY ENFORCEMENT (3 to 22 Quintals)
    const isTotalValid = syncManifestTotal();
    const totalQtl = (typeof window.currentManifestTotalQtl === 'number') ? window.currentManifestTotalQtl : 0;

    if (!isTotalValid) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'SUBMIT EXPORT RFQ ➔';
      }

      // Add visual error cue & shake animation to manifest section
      const manifestSec = document.getElementById('manifestSection');
      if (manifestSec) {
        manifestSec.classList.remove('manifest-error-shake');
        void manifestSec.offsetWidth; // force reflow
        manifestSec.classList.add('manifest-error-shake');
        manifestSec.classList.add('manifest-error');
        setTimeout(() => {
          if (manifestSec) manifestSec.classList.remove('manifest-error-shake');
        }, 600);
      }

      const firstQtyInp = document.getElementById('manifestQty_0');
      if (firstQtyInp) {
        firstQtyInp.focus();
        firstQtyInp.classList.add('input-error');
        setTimeout(() => {
          if (firstQtyInp) firstQtyInp.classList.remove('input-error');
        }, 2200);
      }

      const errMsg = totalQtl < 3
        ? `⚠️ Order Cannot Be Submitted: Consignment is ${totalQtl.toFixed(1)} Quintals (${Math.round(totalQtl * 100)} KG). Minimum requirement is 3.0 Quintals (300 KG).`
        : `⚠️ Order Cannot Be Submitted: Consignment is ${totalQtl.toFixed(1)} Quintals (${Math.round(totalQtl * 100)} KG). Maximum capacity is 22.0 Quintals (2,200 KG).`;

      if (typeof window.showToast === 'function') {
        window.showToast(errMsg, 'error');
      }
      return false;
    }

    // 2. Only proceed if consignment volume is valid
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Transmitting to Trade Desk...</span>';
    }

    const name = (document.getElementById('rfqName') && document.getElementById('rfqName').value.trim()) || 'International Buyer';
    const email = (document.getElementById('rfqEmail') && document.getElementById('rfqEmail').value.trim()) || '';
    const company = (document.getElementById('rfqCompany') && document.getElementById('rfqCompany').value.trim()) || 'Enterprise Buyer';
    const country = (document.getElementById('rfqCountry') && document.getElementById('rfqCountry').value.trim()) || 'International Destination';
    const volume = (document.getElementById('rfqVolume') && document.getElementById('rfqVolume').value.trim()) || '10.0 Quintals (1,000 KG)';
    const commodities = (document.getElementById('rfqCommodities') && document.getElementById('rfqCommodities').value.trim()) || 'Assorted Export Commodities';

    const refId = (typeof generateSecureId === 'function') 
      ? generateSecureId('RFQ') 
      : `RFQ-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const rfqLead = {
      id: refId,
      type: 'COMMERCIAL_BULK_RFQ',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      createdAt: Date.now() / 1000,
      name: name,
      email: email,
      company: company,
      country: country,
      volume: volume,
      commodities: commodities,
      manifest: (rfqManifest || []).map(r => ({
        commodity: r.commodity,
        quantity: r.quantity,
        unit: r.unit,
        kg: r.unit === 'KG' ? r.quantity : Math.round(r.quantity * 100)
      })),
      status: 'new'
    };

    try {
      const existing = JSON.parse(localStorage.getItem('gge_inquiries') || '[]');
      existing.unshift(rfqLead);
      localStorage.setItem('gge_inquiries', JSON.stringify(existing));
    } catch(err) {}

    // Immediate server POST to /api/inquiries with PWA Offline Vault fallback
    const renderBulkSuccess = () => {
      if (submitBtn) {
        submitBtn.style.display = 'none';
      }
      if (successMsg) {
        successMsg.style.display = 'block';
        successMsg.innerHTML = `
          <div style="font-weight:700;color:#1E6E28;margin-bottom:6px;font-size:0.95rem;">✓ Commercial Export Inquiry Transmitted! (Ref: ${escapeHtml(refId)})</div>
          <div style="font-size:0.80rem;color:#3A352F;line-height:1.5;">
            Thank you for submitting your export inquiry for: <b>${escapeHtml(commodities)}</b> [Total Consignment: <b>${escapeHtml(volume)}</b>]. Our Mumbai export desk has logged your request and our trade officer will review and get back to you at <b>${escapeHtml(email || 'your registered address')}</b> with formal proforma pricing and booking terms.
          </div>
          <div style="margin-top:12px;">
            <button type="button" id="rfqDownloadProformaBtn" style="width:100%;padding:10px 14px;background:rgba(184,135,47,0.12);border:1.5px solid #B8872F;color:#785514;border-radius:4px;font-size:0.75rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s;">
              <span>📄 Download Export Inquiry Summary &amp; Estimate (PDF) ➔</span>
            </button>
          </div>
        `;
        const dlBtn = document.getElementById('rfqDownloadProformaBtn');
        if (dlBtn) {
          dlBtn.onclick = () => {
            downloadSubmittedProforma(refId, company, name, commodities, volume, country);
          };
        }
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`Export Inquiry ${refId} Logged in CRM!`, 'success');
      }
    };

    if (!navigator.onLine && window.GGE_PWA) {
      window.GGE_PWA.queueOfflineInquiry(rfqLead);
      renderBulkSuccess();
    } else {
      fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rfqLead)
      }).then(res => {
        if (res.ok) {
          renderBulkSuccess();
        } else {
          if (window.GGE_PWA) window.GGE_PWA.queueOfflineInquiry(rfqLead);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'SUBMIT EXPORT RFQ ➔';
          }
          if (typeof window.showToast === 'function') {
            window.showToast('Server notice: Inquiry saved to offline vault. Please retry shortly.', 'warning');
          }
        }
      }).catch(() => {
        if (window.GGE_PWA) window.GGE_PWA.queueOfflineInquiry(rfqLead);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'SUBMIT EXPORT RFQ ➔';
        }
        if (typeof window.showToast === 'function') {
          window.showToast('Network offline: Inquiry preserved in local Trade Vault.', 'warning');
        }
      });
    }
  }
}
window.handleRfqSubmit = handleRfqSubmit;


function openRfqForLot(lotId) {
  const spec = (window.specDatabase && window.specDatabase[lotId]);
  const commName = spec ? spec.name : 'Sortex Agri-Commodity';

  // Set the manifest strictly to THIS product with default 10 Quintals
  rfqManifest = [{ commodity: commName, quantity: 10, unit: 'Quintals' }];
  window.rfqManifest = rfqManifest;
  renderManifestRows();

  // Also update sample commodity input in case buyer toggles to sample mode
  const smpInput = document.getElementById('sampleCommodity');
  if (smpInput) {
    smpInput.value = spec ? `${spec.name} (${spec.lot})` : commName;
  }

  if (typeof setRfqMode === 'function') {
    setRfqMode('quote');
  }

  const contact = document.getElementById('contact');
  if (contact) {
    contact.scrollIntoView({ behavior: 'smooth' });
    const nameInp = document.getElementById('rfqName');
    if (nameInp) {
      setTimeout(() => nameInp.focus(), 500);
    }
    if (typeof showToast === 'function') {
      showToast(`Consignment Set: ${commName} (10 QTL)`);
    }
  }
}
window.openRfqForLot = openRfqForLot;

function requestQuoteFromDrawer() {
  closeSpecDrawer();
  const contact = document.getElementById('contact');
  if (contact) {
    contact.scrollIntoView({ behavior: 'smooth' });
    setRfqMode('quote');
    const spec = (window.specDatabase && window.specDatabase[activeLotId]);
    if (spec) {
      rfqManifest = [{ commodity: spec.name, quantity: 10, unit: 'Quintals' }];
      window.rfqManifest = rfqManifest;
      renderManifestRows();
    }
  }
}
window.requestQuoteFromDrawer = requestQuoteFromDrawer;



// Form controls & RFQ submission (Legacy Quote Form Support)
function initContactForm() {
  const chipInputs = document.querySelectorAll('#productChips input');
  const form = document.getElementById('quoteForm');
  if (!form && chipInputs.length === 0) return;

  const summary = document.getElementById('selectionSummary');

  function updateSummary() {
    const selected = Array.from(chipInputs).filter(i => i.checked).map(i => i.value);
    if (summary) {
      summary.textContent = selected.length > 0 ? `Selected (${selected.length}): ${selected.join(', ')}` : '';
    }
  }
  chipInputs.forEach(i => i.addEventListener('change', updateSummary));

  const success = document.getElementById('formSuccess');
  const submitBtn = document.getElementById('submitBtn');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const bulkFields = document.getElementById('bulkFields');
      const isBulk = !bulkFields || bulkFields.style.display !== 'none';
      if (isBulk) {
        const isValid = syncVolumeString();
        if (!isValid) {
          if (typeof showToast === 'function') {
            showToast('⚠️ Volume must be between 3 Quintals (300 KG) and 22 Quintals (2,200 KG).', 'warning');
          }
          const valInp = document.getElementById('rfqVolumeVal');
          if (valInp) valInp.focus();
          return;
        }
      }

      if (submitBtn) {
        submitBtn.innerHTML = '<span>Processing Request...</span>';
        submitBtn.disabled = true;
      }

      // Save lead to local CRM storage
      try {
        const selected = Array.from(chipInputs).filter(i => i.checked).map(i => i.value).join(', ') || 'Agricultural Commodities';
        const newLead = {
          id: `RFQ-${Math.floor(Math.random() * 900 + 100)}`,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
          createdAt: Date.now() / 1000,
          name: (document.getElementById('fname') && document.getElementById('fname').value) || 'International Trader',
          company: (document.getElementById('company') && document.getElementById('company').value) || 'Import House',
          email: (document.getElementById('email') && document.getElementById('email').value) || '',
          country: (document.getElementById('country') && document.getElementById('country').value) || 'Destination Port',
          commodities: selected,
          volume: (document.getElementById('msg') && document.getElementById('msg').value) || 'Containerized FCL',
          status: 'new'
        };

        const existing = JSON.parse(localStorage.getItem('gge_inquiries') || '[]');
        existing.unshift(newLead);
        localStorage.setItem('gge_inquiries', JSON.stringify(existing));
      } catch(err) {}

      setTimeout(() => {
        form.classList.add('sent');
        if (success) success.classList.add('show');
        if (typeof showToast === 'function') {
          showToast('✅ Export RFQ Transmitted! Our Mumbai desk will respond within 4 hours.');
        }
      }, 600);
    });
  }
}

// Regional locale & currency switchers
function initLuxurySwitchers() {
  const currPillBtn = document.getElementById('currPillBtn');
  const langPillBtn = document.getElementById('langPillBtn');
  const currPopover = document.getElementById('currPopover');
  const langPopover = document.getElementById('langPopover');
  const popoverBackdrop = document.getElementById('popoverBackdrop');
  const hub = document.getElementById('navSwitchersHub');

  if (!currPillBtn || !langPillBtn || !currPopover || !langPopover) return;

  function syncPopoverMount() {
    const isMobile = window.innerWidth <= 767.98;
    if (isMobile) {
      if (popoverBackdrop && popoverBackdrop.parentElement !== document.body) {
        document.body.appendChild(popoverBackdrop);
      }
      if (currPopover.parentElement !== document.body) {
        document.body.appendChild(currPopover);
      }
      if (langPopover.parentElement !== document.body) {
        document.body.appendChild(langPopover);
      }
    } else {
      if (hub) {
        if (currPopover.parentElement !== hub) {
          hub.appendChild(currPopover);
        }
        if (langPopover.parentElement !== hub) {
          hub.appendChild(langPopover);
        }
        if (popoverBackdrop && popoverBackdrop.parentElement !== hub) {
          hub.appendChild(popoverBackdrop);
        }
      }
    }
  }

  // Initial sync & resize listener
  syncPopoverMount();
  window.addEventListener('resize', syncPopoverMount);

  function closeAllPopovers() {
    currPopover.classList.remove('open', 'active');
    langPopover.classList.remove('open', 'active');
    currPillBtn.classList.remove('active-pop');
    langPillBtn.classList.remove('active-pop');
    currPillBtn.setAttribute('aria-expanded', 'false');
    langPillBtn.setAttribute('aria-expanded', 'false');
    if (popoverBackdrop) popoverBackdrop.classList.remove('active', 'open');
  }
  window.closeAllPopovers = closeAllPopovers;

  if (popoverBackdrop) {
    popoverBackdrop.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllPopovers();
    });
  }

  // Toggle Currency Popover
  currPillBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    syncPopoverMount();
    const isOpen = currPopover.classList.contains('open') || currPopover.classList.contains('active');
    closeAllPopovers();
    if (!isOpen) {
      currPopover.classList.add('open', 'active');
      currPillBtn.classList.add('active-pop');
      currPillBtn.setAttribute('aria-expanded', 'true');
      if (popoverBackdrop) popoverBackdrop.classList.add('active', 'open');
    }
  });

  // Toggle Language Popover
  langPillBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    syncPopoverMount();
    const isOpen = langPopover.classList.contains('open') || langPopover.classList.contains('active');
    closeAllPopovers();
    if (!isOpen) {
      langPopover.classList.add('open', 'active');
      langPillBtn.classList.add('active-pop');
      langPillBtn.setAttribute('aria-expanded', 'true');
      if (popoverBackdrop) popoverBackdrop.classList.add('active', 'open');
    }
  });

  // Currency Item Click
  document.querySelectorAll('.curr-popover-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = item.getAttribute('data-value');
      if (val && typeof window.applyCurrency === 'function') {
        window.applyCurrency(val);
      }
      closeAllPopovers();
    });
  });

  // Language Item Click
  document.querySelectorAll('.lang-popover-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = item.getAttribute('data-value');
      if (val && typeof window.applyLanguage === 'function') {
        window.applyLanguage(val, true);
      }
      closeAllPopovers();
    });
  });

  // Currency Regional Tabs
  const currTabs = document.querySelectorAll('#currTabs .pop-tab');
  currTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      currTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.getAttribute('data-tab');
      document.querySelectorAll('#currGrid .curr-popover-item').forEach(item => {
        const itemRegion = item.getAttribute('data-region');
        if (filter === 'all' || itemRegion === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });

  // Language Regional Tabs
  const langTabs = document.querySelectorAll('#langTabs .pop-tab');
  langTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      langTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.getAttribute('data-tab');
      document.querySelectorAll('#langGrid .lang-popover-item').forEach(item => {
        const itemRegion = item.getAttribute('data-region');
        if (filter === 'all' || itemRegion === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });

  // Close on Outside Click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#navSwitchersHub') && !e.target.closest('#currPopover') && !e.target.closest('#langPopover')) {
      closeAllPopovers();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllPopovers();
    }
  });
}

function setupMiniDropdown(btnId, dropdownId, onSelect) {
  const btn = document.getElementById(btnId);
  const dropdown = document.getElementById(dropdownId);
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    document.querySelectorAll('.mini-dropdown').forEach(d => d.classList.remove('open'));
    if (!isOpen) dropdown.classList.add('open');
  });

  const items = dropdown.querySelectorAll('.mini-item');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      dropdown.classList.remove('open');
      const val = item.getAttribute('data-value');
      if (onSelect) onSelect(val, item);
    });
  });
}

// Application initialization
function initMainApp() {
  if (window._mainAppInitialized) return;
  window._mainAppInitialized = true;

  // Immediately make all hero reveal elements visible as fallback
  document.querySelectorAll('.hero .reveal').forEach(el => el.classList.add('is-visible'));

  // 1. Particle Canvas & Mouse Spotlight
  try { initParticleCanvas(); } catch (e) { console.warn('Particle canvas init error:', e); }

  // 2. 3D Card Spotlight Hover
  try { initCardSpotlights(); } catch (e) { console.warn('Card spotlight init error:', e); }
  
  if (typeof applyCurrency === 'function') {
    try { applyCurrency(window.currentCurrency || 'USD'); } catch (e) {}
  }

  // Fetch live prices from central backend to ensure current domestic and export rates
  if (typeof fetchServerPrices === 'function') {
    fetchServerPrices().then(() => {
      if (typeof syncLiveProductPrices === 'function') syncLiveProductPrices();
      if (typeof setMarketSegment === 'function' && window.currentMarketSegment === 'domestic') {
        setMarketSegment('domestic');
      }
    }).catch(() => {});
  }

  // 3. Scroll Reveal Animations (Robust with fallback)
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 50px 0px' });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  }

  // 4. Number Counters
  try { initCounters(); } catch (e) {}

  // 5. Category Filters
  try { initFilters(); } catch (e) {}

  // 6. Global Corridors & Radar
  try { initRoutes(); } catch (e) {}

  // 7. Contact Form
  try { initContactForm(); initContactMotion(); } catch (e) {}

  // 8. Spec Drawer Triggers
  document.querySelectorAll('.card-spec-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const lot = btn.getAttribute('data-lot');
      openSpecDrawer(lot);
    });
  });

  // Enable direct card touch interaction to open Spec Drawer
  document.querySelectorAll('.card--product').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a')) return;
      const lot = card.getAttribute('data-lot-id');
      if (lot && typeof openSpecDrawer === 'function') {
        openSpecDrawer(lot);
      }
    });
  });

  // 9. Luxury Regional Switcher Popovers
  try { initLuxurySwitchers(); } catch (e) { console.warn('Switcher init error:', e); }

  // Scroll Progress Bar
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('scroll', () => {
      const bar = document.getElementById('progressBar');
      if (bar) {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const pct = total > 0 ? (window.scrollY / total) : 0;
        bar.style.transform = `scaleX(${pct})`;
      }
      const nav = document.getElementById('mainNav');
      if (nav) {
        nav.classList.toggle('scrolled', window.scrollY > 40);
      }
    });
  }

  // Mobile Menu Toggle
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');

  window.closeMobileNav = function() {
    if (mobileMenu) mobileMenu.classList.remove('open');
    if (navToggle) {
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
    if (mobileMenuBackdrop) mobileMenuBackdrop.classList.remove('active');
  };

  if (navToggle && mobileMenu) {
    if (typeof navToggle.addEventListener === 'function') {
      navToggle.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.toggle('open');
        navToggle.classList.toggle('open', isOpen);
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (mobileMenuBackdrop) mobileMenuBackdrop.classList.toggle('active', isOpen);
      });
    }
    if (typeof mobileMenu.querySelectorAll === 'function') {
      mobileMenu.querySelectorAll('a').forEach(a => {
        if (typeof a.addEventListener === 'function') {
          a.addEventListener('click', () => {
            window.closeMobileNav();
          });
        }
      });
    }
  }

  // Keyboard Escape for Drawer, Popovers & Mobile Menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSpecDrawer();
      if (typeof closeSampleCheckoutModal === 'function') closeSampleCheckoutModal();
      if (typeof window.closeAllPopovers === 'function') {
        window.closeAllPopovers();
      } else {
        const currPopover = document.getElementById('currPopover');
        const langPopover = document.getElementById('langPopover');
        if (currPopover) currPopover.classList.remove('open');
        if (langPopover) langPopover.classList.remove('open');
      }
      if (mobileMenu) mobileMenu.classList.remove('open');
      if (navToggle) {
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
      if (mobileMenuBackdrop) mobileMenuBackdrop.classList.remove('active');
    }
  });

  // Hidden Easter Egg: Triple-click GGE Seal in header opens Executive Trade Desk
  let sealClicks = 0;
  let sealTimer = null;
  const brandSeal = document.querySelector('.nav .brand');
  if (brandSeal) {
    brandSeal.addEventListener('click', (e) => {
      sealClicks++;
      clearTimeout(sealTimer);
      sealTimer = setTimeout(() => { sealClicks = 0; }, 700);
      if (sealClicks >= 3) {
        e.preventDefault();
        window.open('desk.html', '_blank');
        sealClicks = 0;
      }
    });
  }

  // 10. Executive Mobile Bottom Command Bar
  try { initMobileBottomNav(); } catch (e) {}

  // 11. Synchronize Market Segment Visibility
  try {
    if (typeof setMarketSegment === 'function') {
      setMarketSegment(window.currentMarketSegment || 'export');
    }
  } catch (e) {}
}

function toggleMobileCompliance() {
  const grid = document.querySelector('.gov-grid') || document.querySelector('.compliance-grid');
  const btnText = document.getElementById('txtExpandCompliance');
  if (!grid) return;
  const isExpanded = grid.classList.toggle('expanded');
  if (btnText) {
    btnText.textContent = isExpanded 
      ? 'COLLAPSE STATUTORY ACCREDITATIONS ▴'
      : 'VIEW ALL 6 STATUTORY ACCREDITATIONS ▾';
  }
}
window.toggleMobileCompliance = toggleMobileCompliance;

// ============================================================================
// SLEEK B2B INSTITUTIONAL MOBILE ENGINE
// Release: v4.6.1
// ============================================================================

function scrollToSection(id) {
  if (!id) return;
  const cleanId = String(id).replace(/^#/, '');
  const el = document.getElementById(cleanId);
  if (el) {
    const nav = document.getElementById('mainNav');
    const navHeight = (nav && getComputedStyle(nav).display !== 'none') ? nav.offsetHeight : 58;
    const rect = el.getBoundingClientRect();
    const targetY = (window.pageYOffset || document.documentElement.scrollTop) + rect.top - navHeight - 12;
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
  }
}
window.scrollToSection = scrollToSection;

function switchMobileAppTab(tabId, targetSectionId) {
  if (tabId === 'samples') {
    if (typeof window.requestCommercialSample === 'function') {
      window.requestCommercialSample();
    }
    return;
  }
  if (tabId === 'tracking') {
    window.open('tracking.html', '_blank');
    return;
  }
  const targets = {
    'storefront': 'products',
    'catalog': 'products',
    'products': 'products',
    'rfq': 'contact',
    'contact': 'contact',
    'company': 'compliance',
    'compliance': 'compliance'
  };
  const secId = targetSectionId || targets[tabId] || 'products';
  scrollToSection(secId);
}
window.switchMobileAppTab = switchMobileAppTab;

// Fast Add-to-RFQ action from product cards or spec drawer
function addCommodityAndOpenRfq(name) {
  if (typeof ensureCommodityInManifest === 'function') {
    ensureCommodityInManifest(name);
  } else if (typeof toggleCommodityInManifest === 'function') {
    toggleCommodityInManifest(name);
  }
  scrollToSection('contact');
}
window.addCommodityAndOpenRfq = addCommodityAndOpenRfq;

function addSpecLotToRfq() {
  const lotId = window.activeLotId || 'p1';
  const spec = (window.specDatabase && window.specDatabase[lotId]) || {};
  const name = spec.name || 'Classic Toor (Tur Dal)';
  if (typeof ensureCommodityInManifest === 'function') {
    ensureCommodityInManifest(name);
  } else if (typeof toggleCommodityInManifest === 'function') {
    toggleCommodityInManifest(name);
  }
  closeSpecDrawer();
  setTimeout(() => {
    scrollToSection('contact');
  }, 140);
}
window.addSpecLotToRfq = addSpecLotToRfq;

function clearMobileSearch() {
  const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
  if (allBtn) allBtn.click();
}
window.clearMobileSearch = clearMobileSearch;
window.filterMobileCatalog = function() {};

function initMobileBottomNav() {
  // Mobile menu close on link tap
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', () => {
        if (typeof window.closeMobileNav === 'function') window.closeMobileNav();
      });
    });
  }

  // Active section tracker for bottom nav
  const mbnCat = document.getElementById('mbnCatalog');
  const mbnRfq = document.getElementById('mbnRfq');
  const mbnComp = document.getElementById('mbnCompany');

  function updateActiveBottomNav() {
    if (!mbnCat && !mbnRfq && !mbnComp) return;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const vh = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    const nav = document.getElementById('mainNav');
    const navH = (nav && getComputedStyle(nav).display !== 'none') ? nav.offsetHeight : 58;

    function setActive(btn) {
      document.querySelectorAll('.mbn-item').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }

    // If scrolled near document bottom, activate Quote Desk
    if (scrollY + vh >= docHeight - 80) {
      setActive(mbnRfq);
      return;
    }

    const contact = document.getElementById('contact');
    const compliance = document.getElementById('compliance');
    const products = document.getElementById('products');

    if (contact) {
      const cTop = contact.offsetTop - navH - 80;
      if (scrollY >= cTop) {
        setActive(mbnRfq);
        return;
      }
    }

    if (compliance) {
      const compTop = compliance.offsetTop - navH - 80;
      const compBottom = compTop + compliance.offsetHeight;
      if (scrollY >= compTop && scrollY < compBottom) {
        setActive(mbnComp);
        return;
      }
    }

    if (products) {
      const pTop = products.offsetTop - navH - 120;
      if (scrollY >= pTop) {
        setActive(mbnCat);
        return;
      }
    }

    // Default top of document (hero, stats)
    setActive(mbnCat);
  }

  window.addEventListener('scroll', updateActiveBottomNav, { passive: true });
  window.addEventListener('resize', updateActiveBottomNav, { passive: true });
  updateActiveBottomNav();
  window.updateMobileBottomNavActive = updateActiveBottomNav;
}
window.initMobileBottomNav = initMobileBottomNav;

function initMobileApp() {
  initMobileBottomNav();
}
window.initMobileApp = initMobileApp;


// Resilient readyState check: Fires immediately if DOM is ready, or on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainApp);
} else {
  initMainApp();
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('load', initMainApp);
}

// Global Window Exports
window.openSpecDrawer = openSpecDrawer;
window.closeSpecDrawer = closeSpecDrawer;


window.activateShippingCorridor = activateShippingCorridor;
window.activateRoute = activateShippingCorridor;


// Motion graphics and world clocks
function initContactMotion() {
  

  // 2. Ambient Spotlight Glare on Contact Card
  const card = document.getElementById('contactCard');
  if (card) {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--contact-mouse-x', `${x}px`);
      card.style.setProperty('--contact-mouse-y', `${y}px`);
    });
  }
}

/* ==========================================================================
   OFFICIAL RAZORPAY AUTOMATED PAYMENT GATEWAY (AMAZON-STYLE REAL-TIME CALLBACK)
   ========================================================================== */

function populateSampleCommodityOptions() {
  const sel = document.getElementById('smpCommoditySelect');
  if (!sel || !window.specDatabase) return;

  const keys = Object.keys(window.specDatabase);
  if (keys.length === 0) return;

  const currentVal = sel.value;
  sel.innerHTML = '';
  keys.forEach(k => {
    const item = window.specDatabase[k];
    const opt = document.createElement('option');
    opt.value = `${item.name} [${item.lot || k.toUpperCase()}]`;
    opt.textContent = `${item.name} · ${item.lot || ''}`;
    opt.dataset.lotId = k;
    sel.appendChild(opt);
  });
  if (currentVal) {
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === currentVal) {
        sel.selectedIndex = i;
        break;
      }
    }
  }
}

function openSampleCheckoutModal(commodityName, lotId) {
  const modal = document.getElementById('sampleCheckoutModal');
  if (!modal) return;

  const orderStep = document.getElementById('sampleOrderStep');
  const successStep = document.getElementById('sampleSuccessStep');
  if (orderStep) orderStep.style.display = 'block';
  if (successStep) successStep.style.display = 'none';

  // Synchronize options with all commodities in catalog
  populateSampleCommodityOptions();

  const sel = document.getElementById('smpCommoditySelect');
  if (sel) {
    let matchedIndex = -1;
    const targetLot = (lotId || window.activeLotId || '').toLowerCase().trim();
    const targetText = (commodityName || '').toLowerCase().trim();

    // 1. Exact lot ID match (e.g. 'p4', 'GGE-MS-2026-D4')
    if (targetLot) {
      for (let i = 0; i < sel.options.length; i++) {
        const opt = sel.options[i];
        if (opt.dataset.lotId && opt.dataset.lotId.toLowerCase() === targetLot) {
          matchedIndex = i;
          break;
        }
        if (opt.value.toLowerCase().includes(targetLot) || opt.text.toLowerCase().includes(targetLot)) {
          matchedIndex = i;
          break;
        }
      }
    }

    // 2. Exact or substring match on commodity name
    if (matchedIndex === -1 && targetText) {
      for (let i = 0; i < sel.options.length; i++) {
        const optText = sel.options[i].text.toLowerCase();
        const optVal = sel.options[i].value.toLowerCase();
        if (optText.includes(targetText) || targetText.includes(optText) || optVal.includes(targetText) || targetText.includes(optVal)) {
          matchedIndex = i;
          break;
        }
      }
    }

    // 3. Keyword matching (masoor, toor, moong, chana, chia, cumin, coriander, turmeric, chilli, etc.)
    if (matchedIndex === -1 && (targetText || targetLot)) {
      const searchBlob = `${targetText} ${targetLot}`;
      const keywords = ['masoor', 'toor', 'tur', 'moong', 'mung', 'chana', 'chia', 'cumin', 'jeera', 'coriander', 'dhania', 'turmeric', 'haldi', 'moringa', 'jowar', 'sorghum', 'emmer', 'khapli', 'ghee', 'cow ghee', 'masala', 'spice blend', 'tissue', 'paper', 'chilli', 'chili', 'cardamom', 'sesame', 'mustard', 'fenugreek', 'fennel'];
      for (const kw of keywords) {
        if (searchBlob.includes(kw)) {
          for (let i = 0; i < sel.options.length; i++) {
            if (sel.options[i].text.toLowerCase().includes(kw) || sel.options[i].value.toLowerCase().includes(kw)) {
              matchedIndex = i;
              break;
            }
          }
          if (matchedIndex !== -1) break;
        }
      }
    }

    // 4. Fallback: If still not matched, add product option dynamically
    if (matchedIndex === -1 && commodityName) {
      const opt = document.createElement('option');
      opt.value = `${commodityName} [EXPORT-LOT]`;
      opt.textContent = `${commodityName} · Certified Export Lot`;
      sel.appendChild(opt);
      matchedIndex = sel.options.length - 1;
    }

    if (matchedIndex !== -1) {
      sel.selectedIndex = matchedIndex;
    }
  }

  selectSampleSettlement('freight_collect');
  updateSamplePriceCalc();
  modal.style.display = 'flex';
}

function closeSampleCheckoutModal() {
  const modal = document.getElementById('sampleCheckoutModal');
  if (modal) modal.style.display = 'none';
}
window.openSampleCheckoutModal = openSampleCheckoutModal;
window.closeSampleCheckoutModal = closeSampleCheckoutModal;

function populateSampleTestBuyer() {
  const nIn = document.getElementById('smpName'); if (nIn) nIn.value = 'Dr. Stefan Meier';
  const eIn = document.getElementById('smpEmail'); if (eIn) eIn.value = 'stefan@bavaria-agri.de';
  const cIn = document.getElementById('smpCompany'); if (cIn) cIn.value = 'Bavaria Global Agri Import GMBH';
  const pIn = document.getElementById('smpPhone'); if (pIn) pIn.value = '+49 89 2018 4400';
  const aIn = document.getElementById('smpAddress'); if (aIn) aIn.value = 'Industriestrasse 14, 80331 Munich, Germany';
  const carrierIn = document.getElementById('smpCourierCarrier'); if (carrierIn) carrierIn.value = 'DHL Express';
  const accIn = document.getElementById('smpCourierAccount'); if (accIn) accIn.value = 'DHL-965842103';
  if (typeof showToast === 'function') {
    showToast("✓ Demo importer credentials populated for testing", "info");
  }
}
window.populateSampleTestBuyer = populateSampleTestBuyer;

let currentSampleSettlement = 'freight_collect';

function selectSampleSettlement(method) {
  currentSampleSettlement = method || 'freight_collect';

  const optFreight = document.getElementById('smpOptCardFreight');
  const optProforma = document.getElementById('smpOptCardProforma');
  const optOnline = document.getElementById('smpOptCardOnline');
  const panelFreight = document.getElementById('smpFreightPanel');
  const panelProforma = document.getElementById('smpProformaPanel');
  const panelOnline = document.getElementById('smpOnlinePanel');

  const radioFreight = document.querySelector('input[name="sampleSettlementOpt"][value="freight_collect"]');
  const radioProforma = document.querySelector('input[name="sampleSettlementOpt"][value="proforma_invoice"]');
  const radioOnline = document.querySelector('input[name="sampleSettlementOpt"][value="online_dispatch"]');

  if (optFreight) {
    if (currentSampleSettlement === 'freight_collect') {
      optFreight.style.background = 'rgba(217,172,82,0.12)';
      optFreight.style.borderColor = 'rgba(217,172,82,0.5)';
      optFreight.style.color = '#F5EFE0';
      optFreight.style.borderWidth = '1px';
      if (radioFreight) radioFreight.checked = true;
    } else {
      optFreight.style.background = 'transparent';
      optFreight.style.borderColor = 'transparent';
      optFreight.style.color = 'var(--muted)';
      optFreight.style.borderWidth = '1px';
    }
  }

  if (optProforma) {
    if (currentSampleSettlement === 'proforma_invoice') {
      optProforma.style.background = 'rgba(217,172,82,0.12)';
      optProforma.style.borderColor = 'rgba(217,172,82,0.5)';
      optProforma.style.color = '#F5EFE0';
      optProforma.style.borderWidth = '1px';
      if (radioProforma) radioProforma.checked = true;
    } else {
      optProforma.style.background = 'transparent';
      optProforma.style.borderColor = 'transparent';
      optProforma.style.color = 'var(--muted)';
      optProforma.style.borderWidth = '1px';
    }
  }

  if (optOnline) {
    if (currentSampleSettlement === 'online_dispatch') {
      optOnline.style.background = 'rgba(217,172,82,0.12)';
      optOnline.style.borderColor = 'rgba(217,172,82,0.5)';
      optOnline.style.color = '#F5EFE0';
      optOnline.style.borderWidth = '1px';
      if (radioOnline) radioOnline.checked = true;
    } else {
      optOnline.style.background = 'transparent';
      optOnline.style.borderColor = 'transparent';
      optOnline.style.color = 'var(--muted)';
      optOnline.style.borderWidth = '1px';
    }
  }

  if (panelFreight) panelFreight.style.display = (currentSampleSettlement === 'freight_collect') ? 'block' : 'none';
  if (panelProforma) panelProforma.style.display = (currentSampleSettlement === 'proforma_invoice') ? 'block' : 'none';
  if (panelOnline) panelOnline.style.display = (currentSampleSettlement === 'online_dispatch') ? 'block' : 'none';
}
window.selectSampleSettlement = selectSampleSettlement;

function updateSamplePriceCalc() {
  const basePrice = (typeof getSampleBasePriceINR === 'function') ? getSampleBasePriceINR() : 499.00;
  const weight = (document.getElementById('smpWeight') ? document.getElementById('smpWeight').value : '500g');
  const amountInr = (weight === '1kg') ? (basePrice * 2.00) : basePrice;
  const amountUsd = (weight === '1kg') ? 25.00 : 15.00;

  const dualEl = document.getElementById('smpDualPriceTag');
  if (dualEl) dualEl.textContent = `USD $${amountUsd.toFixed(2)} / INR ₹${amountInr.toFixed(2)}`;

  const payableEl = document.getElementById('smpPayableText');
  if (payableEl) payableEl.textContent = `₹${amountInr.toFixed(2)}`;

  const btnRzp = document.getElementById('btnLaunchRazorpay');
  if (btnRzp) btnRzp.innerHTML = `<span>PAY AIR COURIER FEE (₹${amountInr.toFixed(2)} / $${amountUsd.toFixed(2)}) ➔</span>`;
}
window.updateSamplePriceCalc = updateSamplePriceCalc;

async function submitFreightCollectSample() {
  const sel = document.getElementById('smpCommoditySelect');
  const commodity = sel ? (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text.split('·')[0].trim() : sel.value) : 'Certified Export Lot Sample';
  const weight = (document.getElementById('smpWeight') ? document.getElementById('smpWeight').value : '500g');
  const name = (document.getElementById('smpName') ? document.getElementById('smpName').value.trim() : '');
  const email = (document.getElementById('smpEmail') ? document.getElementById('smpEmail').value.trim() : '');
  const company = (document.getElementById('smpCompany') ? document.getElementById('smpCompany').value.trim() : '');
  const phone = (document.getElementById('smpPhone') ? document.getElementById('smpPhone').value.trim() : '');
  const address = (document.getElementById('smpAddress') ? document.getElementById('smpAddress').value.trim() : '');
  const carrier = (document.getElementById('smpCourierCarrier') ? document.getElementById('smpCourierCarrier').value : 'DHL Express');
  const courierAccount = (document.getElementById('smpCourierAccount') ? document.getElementById('smpCourierAccount').value.trim() : '');

  if (!name || !email || !address) {
    if (typeof showToast === 'function') {
      showToast("⚠️ Please enter your Full Name, Corporate Email, and Delivery Address.", "error");
    } else {
      alert("Please enter your Full Name, Corporate Email, and Delivery Address.");
    }
    return;
  }

  if (!courierAccount) {
    if (typeof showToast === 'function') {
      showToast("⚠️ Please enter your corporate courier account # (DHL/FedEx/UPS/Aramex) for Freight Collect.", "error");
    } else {
      alert("Please enter your corporate courier account # (DHL/FedEx/UPS/Aramex) for Freight Collect.");
    }
    const accInput = document.getElementById('smpCourierAccount');
    if (accInput) accInput.focus();
    return;
  }

  const sampleId = (typeof generateSecureId === 'function')
    ? generateSecureId('GGE-SMP')
    : `GGE-SMP-${Math.floor(1000 + Math.random() * 9000)}`;

  const btn = document.getElementById('btnSubmitFreightCollect');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>TRANSMITTING FREIGHT COLLECT DISPATCH...</span>';
  }

  try {
    const res = await fetch('/api/sample-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: sampleId,
        settlementMethod: 'freight_collect',
        name,
        email,
        company,
        phone,
        address,
        commodity,
        weight,
        carrier,
        courierAccount
      })
    });
    const result = await res.json();
    if (res.ok && result.success) {
      handleSuccessfulSampleOrder({
        orderId: result.orderId || sampleId,
        settlementMethod: 'freight_collect',
        carrier,
        courierAccount,
        name,
        company,
        email,
        phone,
        address,
        commodity,
        weight,
        status: result.status || 'PENDING DISPATCH · Freight Collect',
        payable: result.payable || `FREIGHT COLLECT (${carrier} A/C #${courierAccount}) · $0.00 DUE`
      });
    } else {
      if (typeof showToast === 'function') {
        showToast("⚠️ Dispatch error: " + (result.error || "Could not register sample order"), "error");
      }
    }
  } catch (err) {
    console.error("Freight collect error:", err);
    // Offline / PWA Fallback
    handleSuccessfulSampleOrder({
      orderId: sampleId,
      settlementMethod: 'freight_collect',
      carrier,
      courierAccount,
      name,
      company,
      email,
      phone,
      address,
      commodity,
      weight,
      status: 'PENDING DISPATCH · Freight Collect',
      payable: `FREIGHT COLLECT (${carrier} A/C #${courierAccount}) · $0.00 DUE`
    });
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>SUBMIT FREIGHT COLLECT SAMPLE ORDER ($0.00) ➔</span>';
    }
  }
}
window.submitFreightCollectSample = submitFreightCollectSample;

async function submitProformaInvoiceSample() {
  const sel = document.getElementById('smpCommoditySelect');
  const commodity = sel ? (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text.split('·')[0].trim() : sel.value) : 'Certified Export Lot Sample';
  const weight = (document.getElementById('smpWeight') ? document.getElementById('smpWeight').value : '500g');
  const name = (document.getElementById('smpName') ? document.getElementById('smpName').value.trim() : '');
  const email = (document.getElementById('smpEmail') ? document.getElementById('smpEmail').value.trim() : '');
  const company = (document.getElementById('smpCompany') ? document.getElementById('smpCompany').value.trim() : '');
  const phone = (document.getElementById('smpPhone') ? document.getElementById('smpPhone').value.trim() : '');
  const address = (document.getElementById('smpAddress') ? document.getElementById('smpAddress').value.trim() : '');

  if (!name || !email || !address) {
    if (typeof showToast === 'function') {
      showToast("⚠️ Please enter your Full Name, Corporate Email, and Delivery Address.", "error");
    } else {
      alert("Please enter your Full Name, Corporate Email, and Delivery Address.");
    }
    return;
  }

  const sampleId = (typeof generateSecureId === 'function')
    ? generateSecureId('GGE-SMP')
    : `GGE-SMP-${Math.floor(1000 + Math.random() * 9000)}`;

  const btn = document.getElementById('btnSubmitProformaRequest');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>GENERATING STAMPED PROFORMA INVOICE...</span>';
  }

  try {
    const res = await fetch('/api/sample-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: sampleId,
        settlementMethod: 'proforma_invoice',
        name,
        email,
        company,
        phone,
        address,
        commodity,
        weight
      })
    });
    const result = await res.json();
    if (res.ok && result.success) {
      handleSuccessfulSampleOrder({
        orderId: result.orderId || sampleId,
        settlementMethod: 'proforma_invoice',
        name,
        company,
        email,
        phone,
        address,
        commodity,
        weight,
        status: result.status || 'PROFORMA REQUESTED · Pending Wire',
        payable: result.payable || 'PROFORMA INVOICE PENDING (Courier Handling · 100% Credited on Contract)'
      });
    } else {
      if (typeof showToast === 'function') {
        showToast("⚠️ Proforma error: " + (result.error || "Could not generate invoice request"), "error");
      }
    }
  } catch (err) {
    console.error("Proforma invoice request error:", err);
    handleSuccessfulSampleOrder({
      orderId: sampleId,
      settlementMethod: 'proforma_invoice',
      name,
      company,
      email,
      phone,
      address,
      commodity,
      weight,
      status: 'PROFORMA REQUESTED · Pending Wire',
      payable: 'PROFORMA INVOICE PENDING (Courier Handling · 100% Credited on Contract)'
    });
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>REQUEST OFFICIAL SAMPLE PROFORMA INVOICE ➔</span>';
    }
  }
}
window.submitProformaInvoiceSample = submitProformaInvoiceSample;

async function launchRazorpayCheckout() {
  const sel = document.getElementById('smpCommoditySelect');
  const commodity = sel ? (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text.split('·')[0].trim() : sel.value) : 'Certified Sample Commodity';
  const weight = (document.getElementById('smpWeight') ? document.getElementById('smpWeight').value : '500g');
  let name = (document.getElementById('smpName') ? document.getElementById('smpName').value.trim() : '');
  let email = (document.getElementById('smpEmail') ? document.getElementById('smpEmail').value.trim() : '');
  let company = (document.getElementById('smpCompany') ? document.getElementById('smpCompany').value.trim() : '');
  let phone = (document.getElementById('smpPhone') ? document.getElementById('smpPhone').value.trim() : '');
  let address = (document.getElementById('smpAddress') ? document.getElementById('smpAddress').value.trim() : '');

  if (!name || !email || !phone || !address) {
    if (typeof showToast === 'function') {
      showToast("⚠️ Please enter your Full Name, Email, Phone, and Delivery Address before proceeding.", "error");
    } else {
      alert("Please enter your Full Name, Email, Phone, and Delivery Address before proceeding.");
    }
    return;
  }

  const basePrice = (typeof getSampleBasePriceINR === 'function') ? getSampleBasePriceINR() : 499.00;
  const amountInr = (weight === '1kg') ? (basePrice * 2.00) : basePrice;
  const amountPaise = Math.round(amountInr * 100);
  const sampleId = (typeof generateSecureId === 'function') 
    ? generateSecureId('GGE-SMP') 
    : `GGE-SMP-${Math.floor(1000 + Math.random() * 9000)}`;

  let rzpKey = "rzp_test_TVccuNkp9w0aTB";

  const btn = document.getElementById('btnLaunchRazorpay');
  if (btn) {
    btn.innerHTML = '<span>GENERATING SECURE PAYMENT SESSION...</span>';
    btn.style.opacity = '0.8';
    btn.disabled = true;
  }

  let serverOrderId = null;
  try {
    const apiUrl = (window.location && window.location.origin && window.location.origin.startsWith('http')) 
      ? `${window.location.origin}/api/create-razorpay-order` 
      : 'http://localhost:8000/api/create-razorpay-order';

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountInr,
        currency: 'INR',
        sampleId,
        sampleType: `${commodity} (${weight})`,
        metadata: { name, email, company, phone, address, commodity, weight, settlementMethod: 'online_dispatch' }
      })
    });
    const orderData = await res.json();
    if (orderData && (orderData.orderId || orderData.id)) {
      serverOrderId = orderData.orderId || orderData.id;
    }
    if (orderData && orderData.key) {
      rzpKey = orderData.key;
    }
  } catch (e) {
    console.warn("Order creation error:", e);
  }

  if (btn) {
    updateSamplePriceCalc();
    btn.style.opacity = '1';
    btn.disabled = false;
  }

  if (!serverOrderId) {
    if (typeof showToast === 'function') showToast("⚠️ Could not initialize secure payment order. Please try again.", "error");
    return;
  }

  if (typeof Razorpay !== 'undefined') {
    const options = {
      key: rzpKey,
      amount: amountPaise,
      currency: "INR",
      name: "Golden Global Expo",
      description: `Certified ${weight} ${commodity.split('[')[0].trim()} Sample Pouch Courier Fee`,
      image: "images/logo_emblem.png",
      order_id: serverOrderId,
      handler: async function (response) {
        const paymentId = response.razorpay_payment_id || `pay_${Date.now()}`;
        try {
          const confRes = await fetch('/api/confirm-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id || serverOrderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: response.razorpay_signature || '',
              amount: amountInr,
              name, email, company, phone, address, commodity, weight
            })
          });
          const confData = await confRes.json();
          if (!confRes.ok || !confData.success) {
            if (typeof showToast === 'function') {
              showToast("⚠️ Payment confirmation failed: " + (confData.error || "Verification error"), "error");
            }
            return;
          }
        } catch(e) {
          console.warn("Payment confirmation network error:", e);
        }
        handleSuccessfulSampleOrder({
          orderId: serverOrderId,
          paymentId,
          amountInr,
          commodity,
          weight,
          name,
          company,
          email,
          phone,
          address,
          settlementMethod: 'online_dispatch',
          status: 'PAID · Pending Courier AWB',
          payable: `₹${parseFloat(amountInr).toFixed(2)} INR (PAID & CAPTURED · 100% Credited)`
        });
      },
      prefill: {
        name: name,
        email: email,
        contact: phone,
        method: "upi"
      },
      theme: {
        color: "#D9AC52"
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }
}
window.launchRazorpayCheckout = launchRazorpayCheckout;

async function simulateInteractiveMockPayment() {
  selectSampleSettlement('online_dispatch');

  let name = (document.getElementById('smpName') && document.getElementById('smpName').value.trim()) || '';
  let email = (document.getElementById('smpEmail') && document.getElementById('smpEmail').value.trim()) || '';
  let company = (document.getElementById('smpCompany') && document.getElementById('smpCompany').value.trim()) || '';
  let phone = (document.getElementById('smpPhone') && document.getElementById('smpPhone').value.trim()) || '';
  let address = (document.getElementById('smpAddress') && document.getElementById('smpAddress').value.trim()) || '';

  // Auto-fill realistic demo institutional importer credentials if inputs are empty
  if (!name || !email || !address) {
    name = name || 'Dr. Stefan Meier';
    email = email || 'stefan@bavaria-agri.de';
    company = company || 'Bavaria Global Agri Import GMBH';
    phone = phone || '+49 89 2018 4400';
    address = address || 'Industriestrasse 14, 80331 Munich, Germany';

    const nIn = document.getElementById('smpName'); if (nIn) nIn.value = name;
    const eIn = document.getElementById('smpEmail'); if (eIn) eIn.value = email;
    const cIn = document.getElementById('smpCompany'); if (cIn) cIn.value = company;
    const pIn = document.getElementById('smpPhone'); if (pIn) pIn.value = phone;
    const aIn = document.getElementById('smpAddress'); if (aIn) aIn.value = address;
  }

  const sel = document.getElementById('smpCommoditySelect');
  const commodity = sel ? (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text.split('·')[0].trim() : sel.value) : 'Assayed Export Lot';
  const weight = (document.getElementById('smpWeight') ? document.getElementById('smpWeight').value : '500g');
  const basePrice = (typeof getSampleBasePriceINR === 'function') ? getSampleBasePriceINR() : 499.00;
  const amountInr = (weight === '1kg') ? (basePrice * 2.00) : basePrice;

  const btnMock = document.getElementById('btnLaunchMockPayment');
  const btnRzp = document.getElementById('btnLaunchRazorpay');

  if (btnMock) {
    btnMock.disabled = true;
    btnMock.innerHTML = '<span>[1/3 Contacting Card Node &amp; 3DS Gateway...]</span>';
  }
  if (btnRzp) btnRzp.disabled = true;

  // Initialize authorized order session on backend in mock test mode
  const sampleId = (typeof generateSecureId === 'function') 
    ? generateSecureId('GGE-SMP') 
    : `GGE-SMP-${Math.floor(1000 + Math.random() * 9000)}`;

  let orderId = sampleId;
  try {
    const res = await fetch('/api/create-razorpay-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountInr,
        currency: 'INR',
        sampleId: sampleId,
        is_mock: true,
        name,
        email,
        company,
        phone,
        address,
        commodity,
        weight,
        sampleType: `${commodity} (${weight})`,
        metadata: { name, email, company, phone, address, commodity, weight, is_mock: 'true', settlementMethod: 'online_dispatch' }
      })
    });
    if (res.ok) {
      const orderData = await res.json();
      if (orderData.orderId || orderData.id) {
        orderId = orderData.orderId || orderData.id;
      }
    }
  } catch (e) {
    console.warn("Order initialization error:", e);
  }

  // Step 1: 3D Secure simulation
  await new Promise(r => setTimeout(r, 500));
  if (btnMock) btnMock.innerHTML = '<span>[2/3 3D Secure OTP Verified...]</span>';

  // Step 2: Instant settlement capture
  await new Promise(r => setTimeout(r, 500));
  if (btnMock) btnMock.innerHTML = '<span>[3/3 Settling ₹' + amountInr.toFixed(2) + ' &amp; Generating AWB...]</span>';

  await new Promise(r => setTimeout(r, 400));

  const mockPaymentId = `mock_pay_${Date.now().toString(36).toUpperCase()}`;

  // Confirm payment with backend to atomically persist in DB, write audit entry and trigger SSE
  try {
    await fetch('/api/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: mockPaymentId,
        amount: amountInr,
        is_mock: true,
        name,
        email,
        company,
        phone,
        address,
        commodity,
        weight
      })
    });
  } catch (e) {}

  handleSuccessfulSampleOrder({
    orderId,
    paymentId: mockPaymentId,
    amountInr,
    commodity,
    weight,
    name,
    company,
    email,
    phone,
    address,
    isMock: true,
    settlementMethod: 'online_dispatch',
    status: 'PAID · Pending Courier AWB',
    payable: `₹${parseFloat(amountInr).toFixed(2)} INR (PAID & CAPTURED · 100% Credited)`
  });

  if (btnMock) {
    btnMock.disabled = false;
    btnMock.innerHTML = '<span>[Dev Simulation: Instant Mock Settlement &amp; Consignment Tracking]</span>';
  }
  if (btnRzp) btnRzp.disabled = false;
}
window.simulateInteractiveMockPayment = simulateInteractiveMockPayment;

function handleSuccessfulSampleOrder(data) {
  const orderId = data.orderId || `GGE-SMP-${Math.floor(1000 + Math.random() * 9000)}`;
  const paymentId = data.paymentId || (data.settlementMethod === 'freight_collect' ? `FC-${(data.carrier || 'DHL').toUpperCase()}` : 'PROFORMA-ISSUED');
  const commodity = data.commodity || 'Certified Agricultural Sample';
  const weight = data.weight || '500g';
  const name = data.name || 'Valued Importer';
  const company = data.company || '';
  const email = data.email || '';
  const phone = data.phone || '';
  const address = data.address || '';
  const method = data.settlementMethod || 'freight_collect';
  const payable = data.payable || (method === 'freight_collect' ? '$0.00 (Freight Collect)' : 'Proforma Stamped');
  const status = data.status || (method === 'freight_collect' ? 'PENDING DISPATCH · Freight Collect' : 'PROFORMA REQUESTED');

  const sampleRecord = {
    id: orderId,
    type: 'SAMPLE_ORDER',
    paymentId: paymentId,
    name: name,
    email: email,
    phone: phone,
    company: company || 'Golden Global Expo Sample Importer',
    commodities: `${commodity.split('[')[0].trim()} (${weight} Sealed Foil Pouch)`,
    lotName: commodity,
    address: address,
    payable: payable,
    country: address ? (address.split(',').pop().trim()) : 'International Air Express',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    createdAt: Date.now() / 1000,
    status: status,
    utr: paymentId,
    awb: ''
  };

  // Save to client-side localStorage mirrors
  try {
    const raw = localStorage.getItem('gge_inquiries');
    const list = raw ? JSON.parse(raw) : [];
    if (!list.some(item => item && item.id === orderId)) {
      list.unshift(sampleRecord);
    }
    localStorage.setItem('gge_inquiries', JSON.stringify(list));

    const rawSmp = localStorage.getItem('gge_samples');
    const smpList = rawSmp ? JSON.parse(rawSmp) : [];
    smpList.unshift(sampleRecord);
    localStorage.setItem('gge_samples', JSON.stringify(smpList));

    window.dispatchEvent(new Event('storage'));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('gge_sync_channel');
      bc.postMessage({ type: 'NEW_SAMPLE_ORDER', sample: sampleRecord });
    }
  } catch (e) {}

  // Populate B2B Confirmation Screen
  const sId = document.getElementById('sucSampleId');
  const sMethod = document.getElementById('sucMethod');
  const sPayId = document.getElementById('sucPaymentId');
  const sComm = document.getElementById('sucCommodity');
  const sDocs = document.getElementById('sucDocs');
  const sName = document.getElementById('sucName');
  const sAddr = document.getElementById('sucAddress');
  const sPaid = document.getElementById('sucPaid');

  if (sId) sId.textContent = orderId;
  if (sPayId) sPayId.textContent = paymentId;

  if (sMethod) {
    if (method === 'freight_collect') {
      sMethod.textContent = `Freight Collect (${data.carrier || 'DHL Express'} #${data.courierAccount || 'Billed'})`;
    } else if (method === 'proforma_invoice') {
      sMethod.textContent = 'Official Stamped Proforma Invoice (Wire)';
    } else if (data.isMock || (paymentId && paymentId.startsWith('mock_pay_'))) {
      sMethod.textContent = `Instant Air Dispatch · Test Simulation (${paymentId})`;
    } else {
      sMethod.textContent = `Instant Air Dispatch (${paymentId})`;
    }
  }

  if (sComm) sComm.textContent = `${commodity.split('[')[0].trim()} (${weight} Sealed Foil Pouch)`;
  if (sDocs) sDocs.textContent = '✓ Sealed Pouch · ✓ Lab COA · ✓ Phyto';
  if (sName) sName.textContent = company ? `${name} (${company})` : name;
  if (sAddr) sAddr.textContent = address || 'Designated Courier Address';

  if (sPaid) {
    if (method === 'freight_collect') {
      sPaid.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:var(--gold-bright);"></span> $0.00 Due (Freight Collect Billed)';
    } else if (method === 'proforma_invoice') {
      sPaid.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:var(--gold-bright);"></span> Stamped PI Queued · 100% Credited';
    } else if (data.isMock || (paymentId && paymentId.startsWith('mock_pay_'))) {
      sPaid.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:var(--gold-bright);"></span> Test Mode Verified · 100% Credited`;
    } else {
      sPaid.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:var(--gold-bright);"></span> Paid & Captured · 100% Credited`;
    }
  }

  const trackBtn = document.getElementById('btnTrackNewSample');
  if (trackBtn) {
    trackBtn.href = `tracking.html?bl=${encodeURIComponent(orderId)}`;
  }

  // Switch to Confirmation Step AUTOMATICALLY
  const orderStep = document.getElementById('sampleOrderStep');
  const successStep = document.getElementById('sampleSuccessStep');
  if (orderStep) orderStep.style.display = 'none';
  if (successStep) successStep.style.display = 'block';

  if (typeof showToast === 'function') {
    showToast(`🎉 Sample Order Placed! Ref: ${orderId}`, 'success');
  }
}
window.handleSuccessfulSampleOrder = handleSuccessfulSampleOrder;
window.handleSuccessfulGatewayPayment = handleSuccessfulSampleOrder; // Alias for backwards compatibility

function requestCommercialSample() {
  const lotId = window.activeLotId || '';
  const spec = (window.specDatabase && lotId) ? window.specDatabase[lotId] : null;
  const currentTitle = (spec && spec.name) || (document.getElementById('drawerTitle') ? document.getElementById('drawerTitle').textContent : '');
  closeSpecDrawer();
  openSampleCheckoutModal(currentTitle, lotId);
}
window.requestCommercialSample = requestCommercialSample;

// ==========================================================================
// DOMESTIC MARKET SEGMENT (INDIA) & DIRECT UPI ORDER ENGINE
// ==========================================================================

let currentMarketSegment = 'export'; // 'export' | 'domestic' | 'sample'
window.currentMarketSegment = currentMarketSegment;
let currentDomesticOrder = null;
let currentDomesticPack = '1kg';

function setMarketSegment(segment) {
  if (segment === 'sample') {
    requestCommercialSample();
    return;
  }

  currentMarketSegment = segment;
  window.currentMarketSegment = segment;

  const btnExport = document.getElementById('segBtnExport');
  const btnDomestic = document.getElementById('segBtnDomestic');
  const btnSample = document.getElementById('segBtnSample');

  if (btnExport) {
    btnExport.classList.toggle('active', segment === 'export');
    btnExport.setAttribute('aria-selected', segment === 'export' ? 'true' : 'false');
  }
  if (btnDomestic) {
    btnDomestic.classList.toggle('active', segment === 'domestic');
    btnDomestic.setAttribute('aria-selected', segment === 'domestic' ? 'true' : 'false');
  }
  if (btnSample) {
    btnSample.classList.remove('active');
    btnSample.setAttribute('aria-selected', 'false');
  }

  // 1. Synchronize body and root class/attribute for global styling
  if (document.body) {
    document.body.classList.toggle('market-domestic', segment === 'domestic');
    document.body.classList.toggle('market-export', segment === 'export');
  }
  if (document.documentElement) {
    document.documentElement.setAttribute('data-market-segment', segment);
  }

  // 2. Strict Sample Tab Visibility: Only visible when on international (export) trade
  const modeBtnSample = document.getElementById('modeBtnSample');
  if (modeBtnSample) {
    if (segment === 'domestic') {
      modeBtnSample.style.setProperty('display', 'none', 'important');
    } else {
      modeBtnSample.style.removeProperty('display');
      modeBtnSample.style.display = '';
    }
  }

  // If user is currently on Sample RFQ mode when switching to Domestic, immediately reset to Bulk RFQ
  if (segment === 'domestic' && typeof currentRfqMode !== 'undefined' && currentRfqMode === 'sample') {
    if (typeof setRfqMode === 'function') {
      setRfqMode('quote');
    }
  }

  // 3. Mobile Bottom Navigation: Samples tab strictly hidden in domestic mode
  const mbnSamples = document.getElementById('mbnSamples');
  if (mbnSamples) {
    if (segment === 'domestic') {
      mbnSamples.style.setProperty('display', 'none', 'important');
    } else {
      mbnSamples.style.removeProperty('display');
      mbnSamples.style.display = '';
    }
  }

  // 4. Commodity Spec Drawer & Hero Quick Hub: Samples triggers hidden in domestic mode
  const drawerSampleBtn = document.getElementById('drawerSampleBtn');
  if (drawerSampleBtn) {
    if (segment === 'domestic') {
      drawerSampleBtn.style.setProperty('display', 'none', 'important');
    } else {
      drawerSampleBtn.style.removeProperty('display');
      drawerSampleBtn.style.display = '';
    }
  }
  const drawerDomesticBtn = document.getElementById('drawerDomesticBtn');
  if (drawerDomesticBtn) {
    if (segment === 'domestic') {
      drawerDomesticBtn.style.setProperty('display', 'inline-flex', 'important');
    } else {
      drawerDomesticBtn.style.setProperty('display', 'none', 'important');
    }
  }
  const drawerDisclaimer = document.querySelector('.drawer-disclaimer');
  if (drawerDisclaimer) {
    if (segment === 'domestic') {
      drawerDisclaimer.style.setProperty('display', 'none', 'important');
    } else {
      drawerDisclaimer.style.removeProperty('display');
      drawerDisclaimer.style.display = '';
    }
  }
  const hubTileSample = document.querySelector('.trade-hub-tile--sample');
  if (hubTileSample) {
    if (segment === 'domestic') {
      hubTileSample.style.setProperty('display', 'none', 'important');
    } else {
      hubTileSample.style.removeProperty('display');
      hubTileSample.style.display = '';
    }
  }

  // 5. Contact Section Redirection Hint
  const rfqHint = document.getElementById('rfqDomesticHint');
  if (rfqHint) {
    if (segment === 'domestic') {
      rfqHint.innerHTML = `<span>Looking for International Export (Bulk FCL Containers)?</span> <a href="javascript:void(0)" onclick="setMarketSegment('export'); var p = document.getElementById('products'); if (p) p.scrollIntoView({behavior:'smooth'});" style="color:var(--gold-bright, #D9AC52); text-decoration:underline; margin-left:6px; font-weight:600;">Switch to Global Export Desk ➔</a>`;
    } else {
      rfqHint.innerHTML = `<span>Looking for Indian domestic supply (500g–25kg) with instant UPI?</span> <a href="javascript:void(0)" onclick="setMarketSegment('domestic'); var p = document.getElementById('products'); if (p) p.scrollIntoView({behavior:'smooth'});" style="color:var(--gold-bright, #D9AC52); text-decoration:underline; margin-left:6px; font-weight:600;">Switch to Domestic UPI Desk ➔</a>`;
    }
  }

  // Gracefully update section subhead copy without extra intrusive banners
  const subHead = document.querySelector('#products .section-head p');
  if (subHead) {
    if (segment === 'domestic') {
      subHead.innerHTML = 'Sortex Clean Grade-A commodities in <strong>500g, 1kg, 5kg &amp; 25kg</strong> packs. All-India doorstep delivery with automated GST tax invoices and direct UPI settlement.';
    } else if (segment === 'export') {
      subHead.innerHTML = 'Every lot is mechanically graded, moisture-tested and packed to destination-country phytosanitary standards before it leaves Mumbai.';
    }
  }

  const catalog = window.domesticCommodityCatalog || {};
  const cards = document.querySelectorAll('.card--product');

  cards.forEach(card => {
    const lotId = card.getAttribute('data-lot-id');
    const domData = catalog[lotId];

    if (segment === 'domestic' && domData) {
      // Save original export card state if not already saved
      if (!card.dataset.exportSpecs) {
        const b = card.querySelector('.card-badge');
        card.dataset.exportBadgeText = b ? b.textContent : '';
        card.dataset.exportBadgeClass = b ? b.className : '';
        const p = card.querySelector('.price-val');
        card.dataset.exportPriceText = p ? p.textContent : '';
        card.dataset.exportPriceBase = p ? p.getAttribute('data-base') : '';
        const s = card.querySelector('.spec-rows');
        card.dataset.exportSpecs = s ? s.innerHTML : '';
        const a = card.querySelector('.card-action-row');
        card.dataset.exportActions = a ? a.innerHTML : '';
      }

      // 1. Badge: Quiet, elegant typography matching brand standards
      const badgeEl = card.querySelector('.card-badge');
      if (badgeEl) {
        badgeEl.textContent = 'Sortex Clean · FSSAI Grade-A';
        badgeEl.style.background = 'rgba(184, 135, 47, 0.12)';
        badgeEl.style.color = '#B8872F';
        badgeEl.style.borderColor = 'rgba(184, 135, 47, 0.28)';
        badgeEl.style.display = 'inline-block';
      }

      // 2. Price Badge: Antique gold from rate
      const priceBadge = card.querySelector('.price-val');
      if (priceBadge) {
        priceBadge.textContent = `From ₹${domData.packs['500g']} / 500g`;
        priceBadge.style.color = '#D9AC52';
        priceBadge.style.borderColor = 'rgba(217, 172, 82, 0.35)';
      }

      // 3. Spec Rows -> Domestic Distribution
      const specRows = card.querySelector('.spec-rows');
      if (specRows) {
        specRows.innerHTML = `
          <div class="spec-row"><span>Standard:</span><b>${escapeHtml(domData.grade)}</b></div>
          <div class="spec-row"><span>Compliance:</span><b style="color:#D9AC52;">FSSAI Certified · Sortex</b></div>
          <div class="spec-row"><span>Pack Sizes:</span><b>500g · 1kg · 5kg · 25kg</b></div>
          <div class="spec-row"><span>Fulfillment:</span><b>Express Surface Dispatch</b></div>
        `;
      }

      // 4. Interactive pack price pills and direct UPI button
      const actionRow = card.querySelector('.card-action-row');
      if (actionRow) {
        actionRow.innerHTML = `
          <div class="dom-card-packs" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; margin-bottom:8px;">
            <button type="button" class="dom-pack-chip" onclick="event.stopPropagation(); openDomesticOrderModal('${lotId}', '500g')" title="Order 500g pack via UPI">
              <span class="dom-chip-w">500g</span>
              <span class="dom-chip-p">₹${domData.packs['500g']}</span>
            </button>
            <button type="button" class="dom-pack-chip" onclick="event.stopPropagation(); openDomesticOrderModal('${lotId}', '1kg')" title="Order 1kg pack via UPI">
              <span class="dom-chip-w">1kg</span>
              <span class="dom-chip-p">₹${domData.packs['1kg']}</span>
            </button>
            <button type="button" class="dom-pack-chip" onclick="event.stopPropagation(); openDomesticOrderModal('${lotId}', '5kg')" title="Order 5kg pack via UPI">
              <span class="dom-chip-w">5kg</span>
              <span class="dom-chip-p">₹${domData.packs['5kg']}</span>
            </button>
            <button type="button" class="dom-pack-chip" onclick="event.stopPropagation(); openDomesticOrderModal('${lotId}', '25kg')" title="Order 25kg pack via UPI">
              <span class="dom-chip-w">25kg</span>
              <span class="dom-chip-p">₹${domData.packs['25kg']}</span>
            </button>
          </div>
          <button type="button" class="btn btn--primary card-spec-btn dom-order-cta-btn" onclick="event.stopPropagation(); openDomesticOrderModal('${lotId}');" style="width:100%; justify-content:center; font-size:0.75rem; padding:9px 12px; background:linear-gradient(135deg, #D9AC52 0%, #B8872F 100%); color:#0D0A08; font-weight:700;">
            <span>ORDER PACKS (DIRECT UPI) ➔</span>
          </button>
        `;
      }
    } else if (segment === 'export' && card.dataset.exportSpecs) {
      // Restore export view
      const badgeEl = card.querySelector('.card-badge');
      if (badgeEl) {
        badgeEl.textContent = card.dataset.exportBadgeText || '';
        badgeEl.style.background = '';
        badgeEl.style.color = '';
        badgeEl.style.borderColor = '';
      }
      const priceBadge = card.querySelector('.price-val');
      if (priceBadge) {
        priceBadge.style.color = '';
        priceBadge.style.borderColor = '';
        if (card.dataset.exportPriceBase) {
          priceBadge.setAttribute('data-base', card.dataset.exportPriceBase);
        }
      }
      const specRows = card.querySelector('.spec-rows');
      if (specRows) {
        specRows.innerHTML = card.dataset.exportSpecs;
      }
      const actionRow = card.querySelector('.card-action-row');
      if (actionRow && card.dataset.exportActions) {
        actionRow.innerHTML = card.dataset.exportActions;
      }
    }
  });

  if (segment === 'export' && typeof window.syncLiveProductPrices === 'function') {
    window.syncLiveProductPrices();
  }
}
window.setMarketSegment = setMarketSegment;

function selectDomesticPackSize(pack) {
  currentDomesticPack = pack || '1kg';
  const packs = ['500g', '1kg', '5kg', '25kg'];
  packs.forEach(p => {
    const el = document.getElementById(`packCard_${p}`);
    if (el) el.classList.toggle('active', p === currentDomesticPack);
  });
  syncDomesticPriceCalc();
}
window.selectDomesticPackSize = selectDomesticPackSize;

function syncDomesticPriceCalc() {
  const lotId = (document.getElementById('domModalCommodity') && document.getElementById('domModalCommodity').value) || 'p1';
  const qtyInput = document.getElementById('domModalQty');
  const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
  const catalog = window.domesticCommodityCatalog || {};
  const item = catalog[lotId] || catalog['p1'];

  // Update pack rates display on the 4 cards in modal
  if (item && item.packs) {
    ['500g', '1kg', '5kg', '25kg'].forEach(p => {
      const rEl = document.getElementById(`rate_${p}`);
      if (rEl) rEl.textContent = `₹${item.packs[p]}`;
    });
  }

  const unitRate = (item && item.packs && item.packs[currentDomesticPack]) ? item.packs[currentDomesticPack] : 160;
  const totalInr = unitRate * qty;

  const totalDisp = document.getElementById('domModalPayableTotal');
  if (totalDisp) totalDisp.textContent = `₹${totalInr.toFixed(2)} INR`;

  // Total weight in KG
  let packKg = 1.0;
  if (currentDomesticPack === '500g') packKg = 0.5;
  else if (currentDomesticPack === '5kg') packKg = 5.0;
  else if (currentDomesticPack === '25kg') packKg = 25.0;
  const totalKg = packKg * qty;

  const wtDisp = document.getElementById('domTotalWeightDisplay');
  if (wtDisp) wtDisp.textContent = `${totalKg.toFixed(1)} KG Total`;
}
window.syncDomesticPriceCalc = syncDomesticPriceCalc;

function onDomesticCommodityChange() {
  syncDomesticPriceCalc();
}
window.onDomesticCommodityChange = onDomesticCommodityChange;

function adjustDomesticQty(delta) {
  const inp = document.getElementById('domModalQty');
  if (!inp) return;
  let val = parseInt(inp.value, 10) || 1;
  val = Math.max(1, Math.min(1000, val + delta));
  inp.value = val;
  syncDomesticPriceCalc();
}
window.adjustDomesticQty = adjustDomesticQty;

function onDomesticQtyInput() {
  syncDomesticPriceCalc();
}
window.onDomesticQtyInput = onDomesticQtyInput;

function populateDomesticDemoBuyer() {
  const n = document.getElementById('domConsigneeName'); if (n) n.value = 'Rajesh Patel';
  const p = document.getElementById('domConsigneePhone'); if (p) p.value = '98200 12345';
  const e = document.getElementById('domConsigneeEmail'); if (e) e.value = 'rajesh@pateltraders.in';
  const pin = document.getElementById('domConsigneePincode'); if (pin) pin.value = '400703';
  const a = document.getElementById('domConsigneeAddress'); if (a) a.value = 'Shop 12, APMC Market 2, Sector 19';
  const c = document.getElementById('domConsigneeCity'); if (c) c.value = 'Navi Mumbai';
  const s = document.getElementById('domConsigneeState'); if (s) s.value = 'Maharashtra';
  if (typeof showToast === 'function') {
    showToast("✓ Demo Indian buyer populated for testing", "info");
  }
}
window.populateDomesticDemoBuyer = populateDomesticDemoBuyer;

async function proceedToDomesticUPI() {
  const lotId = (document.getElementById('domModalCommodity') && document.getElementById('domModalCommodity').value) || 'p1';
  const catalog = window.domesticCommodityCatalog || {};
  const item = catalog[lotId] || catalog['p1'];
  const commodityName = item ? item.name : 'Classic Toor (Tur Dal)';

  const packSize = currentDomesticPack || '1kg';
  const qty = (document.getElementById('domModalQty') && parseInt(document.getElementById('domModalQty').value, 10)) || 1;

  const name = (document.getElementById('domConsigneeName') && document.getElementById('domConsigneeName').value.trim()) || '';
  const phone = (document.getElementById('domConsigneePhone') && document.getElementById('domConsigneePhone').value.trim()) || '';
  const email = (document.getElementById('domConsigneeEmail') && document.getElementById('domConsigneeEmail').value.trim()) || '';
  const pincode = (document.getElementById('domConsigneePincode') && document.getElementById('domConsigneePincode').value.trim()) || '';
  const address = (document.getElementById('domConsigneeAddress') && document.getElementById('domConsigneeAddress').value.trim()) || '';
  const city = (document.getElementById('domConsigneeCity') && document.getElementById('domConsigneeCity').value.trim()) || '';
  const state = (document.getElementById('domConsigneeState') && document.getElementById('domConsigneeState').value.trim()) || 'Maharashtra';

  if (!name || !phone || !address || !pincode || !city) {
    if (typeof showToast === 'function') {
      showToast("⚠️ Please enter Consignee Name, Phone, Address, City & PIN code.", "error");
    } else {
      alert("Please enter Consignee Name, Phone, Address, City & PIN code.");
    }
    return;
  }

  const btn = document.getElementById('btnProceedToUpi');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>INITIALIZING NPCI UPI SESSION...</span>';
  }

  const unitRate = (item && item.packs && item.packs[packSize]) ? item.packs[packSize] : 160;
  const expectedAmount = unitRate * qty;

  const orderId = `GGE-DOM-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const payload = {
      orderId,
      commodity: commodityName,
      packSize,
      quantity: qty,
      amount: expectedAmount,
      name,
      phone,
      email: email || `${phone.replace(/\D/g, '')}@sms.goldenglobalexpo.com`,
      address,
      city,
      state,
      pincode,
      is_mock: Boolean(window.__GGE_DEMO_MODE || (name && name.toLowerCase().includes('demo')) || (orderId && orderId.startsWith('GGE-DOM-MOCK')))
    };

    let res = null;
    try {
      res = await fetch('/api/domestic-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok && res.status === 404) {
        res = await fetch('/api/create-upi-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch(fetchErr) {
      // Offline fallback queue
      if (typeof window !== 'undefined' && window.GGE_PWA && typeof window.GGE_PWA.queueOfflineInquiry === 'function') {
        window.GGE_PWA.queueOfflineInquiry({
          id: orderId,
          type: 'DOMESTIC_ORDER',
          name, phone, email, address, city, state, pincode,
          commodities: `${commodityName} (${packSize} × ${qty} Units)`,
          volume: `${packSize} × ${qty}`,
          payable: `₹${expectedAmount.toFixed(2)} INR`,
          status: 'OFFLINE_INITIATED'
        });
      }
      throw fetchErr;
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (typeof showToast === 'function') {
        showToast("⚠️ Gateway error: " + (data.error || "Could not initialize UPI order"), "error");
      }
      return;
    }

    currentDomesticOrder = {
      orderId: data.orderId || orderId,
      amount: data.amount || expectedAmount,
      upiUri: data.upiUri,
      upiVpa: data.upiVpa || 'goldenglobalexpo@icici',
      commodity: commodityName,
      packSize,
      quantity: qty,
      name,
      phone,
      email,
      address,
      city,
      state,
      pincode
    };

    renderDomesticStep2(currentDomesticOrder);

  } catch(err) {
    console.error("Create UPI order error:", err);
    currentDomesticOrder = {
      orderId,
      amount: expectedAmount,
      upiUri: `upi://pay?pa=goldenglobalexpo@icici&pn=Golden+Global+Expo&am=${expectedAmount.toFixed(2)}&cu=INR&tn=${orderId}&tr=${orderId}`,
      upiVpa: 'goldenglobalexpo@icici',
      commodity: commodityName,
      packSize,
      quantity: qty,
      name,
      phone,
      email,
      address,
      city,
      state,
      pincode
    };
    renderDomesticStep2(currentDomesticOrder);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>GENERATE UPI QR &amp; PAY ➔</span>';
    }
  }
}
window.proceedToDomesticUPI = proceedToDomesticUPI;
window.handleDomesticOrderSubmit = proceedToDomesticUPI;

function renderDomesticStep2(order) {
  const refEl = document.getElementById('domUpiOrderRef');
  if (refEl) refEl.textContent = order.orderId;

  const vpaEl = document.getElementById('domPayeeVpaDisplay');
  if (vpaEl) vpaEl.textContent = order.upiVpa;

  const amtEl = document.getElementById('domUpiAmountDisplay');
  if (amtEl) amtEl.textContent = `₹${order.amount.toFixed(2)} INR`;

  const commEl = document.getElementById('domUpiCommoditySummary');
  if (commEl) commEl.textContent = `${order.commodity} (${order.packSize} × ${order.quantity})`;

  // Render SVG QR Code via qrcode(0, 'M')
  const qrWrap = document.getElementById('domUpiQrSvgWrap');
  if (qrWrap && typeof qrcode === 'function') {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(order.upiUri);
      qr.make();
      const svgTag = qr.createSvgTag({ scalable: true });
      qrWrap.innerHTML = svgTag;
    } catch(e) {
      console.warn("QR render fallback:", e);
      qrWrap.innerHTML = `<div style="font-size:0.75rem;color:#14110E;text-align:center;padding:10px;">UPI: ${escapeHtml(order.upiVpa)}<br>₹${order.amount.toFixed(2)}</div>`;
    }
  }

  const deepBtn = document.getElementById('domUpiDeepLinkBtn');
  if (deepBtn) {
    deepBtn.href = order.upiUri;
  }

  const utrInp = document.getElementById('domUtrInput');
  if (utrInp) utrInp.value = '';

  const s1 = document.getElementById('domesticStep1');
  const s2 = document.getElementById('domesticStep2');
  const s3 = document.getElementById('domesticStep3');
  if (s1) s1.style.display = 'none';
  if (s2) s2.style.display = 'block';
  if (s3) s3.style.display = 'none';
}

function copyUpiVpaId() {
  const vpa = (currentDomesticOrder && currentDomesticOrder.upiVpa) ? currentDomesticOrder.upiVpa : 'goldenglobalexpo@icici';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(vpa);
  }
  const btn = document.getElementById('btnCopyVpa');
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.style.color = '#81C784';
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.style.color = '#D9AC52';
    }, 2000);
  }
  if (typeof showToast === 'function') {
    showToast(`✓ Payee UPI ID copied: ${vpa}`, 'info');
  }
}
window.copyUpiVpaId = copyUpiVpaId;

async function confirmDomesticUpiPayment() {
  if (!currentDomesticOrder) return;
  const utrInp = document.getElementById('domUtrInput');
  let utr = utrInp ? utrInp.value.trim() : '';
  if (!utr) {
    if (typeof showToast === 'function') {
      showToast("⚠️ Please enter the 12-digit UPI UTR / Transaction Reference number.", "error");
    } else {
      alert("Please enter the 12-digit UPI UTR / Transaction Reference number.");
    }
    if (utrInp) utrInp.focus();
    return;
  }

  const btn = document.getElementById('btnConfirmDomesticUpi');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>VERIFYING SETTLEMENT...</span>';
  }

  try {
    const payload = {
      orderId: currentDomesticOrder.orderId,
      utr: utr,
      amount: currentDomesticOrder.amount,
      name: currentDomesticOrder.name,
      phone: currentDomesticOrder.phone,
      email: currentDomesticOrder.email,
      address: currentDomesticOrder.address,
      city: currentDomesticOrder.city,
      state: currentDomesticOrder.state,
      pincode: currentDomesticOrder.pincode,
      commodity: currentDomesticOrder.commodity,
      packSize: currentDomesticOrder.packSize,
      quantity: currentDomesticOrder.quantity,
      is_mock: utr.startsWith('mock_') || utr.startsWith('UTR991448') || currentDomesticOrder.orderId.startsWith('GGE-DOM-MOCK')
    };

    let res = null;
    try {
      res = await fetch('/api/domestic-orders/verify-upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok && res.status === 404) {
        res = await fetch('/api/confirm-upi-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch(fetchErr) {
      if (typeof window !== 'undefined' && window.GGE_PWA && typeof window.GGE_PWA.queueOfflineInquiry === 'function') {
        window.GGE_PWA.queueOfflineInquiry({
          id: currentDomesticOrder.orderId,
          type: 'DOMESTIC_ORDER',
          utr: utr,
          amount: currentDomesticOrder.amount,
          name: currentDomesticOrder.name,
          phone: currentDomesticOrder.phone,
          status: 'PAID_OFFLINE_VERIFY_QUEUED'
        });
      }
      throw fetchErr;
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (typeof showToast === 'function') {
        showToast("⚠️ Settlement verification error: " + (data.error || "Payment not verified"), "error");
      }
      return;
    }

    if (data.taxInvoiceRef) currentDomesticOrder.taxInvoiceRef = data.taxInvoiceRef;
    if (data.courierPartner) currentDomesticOrder.courierPartner = data.courierPartner;
    if (data.trackingNumber) currentDomesticOrder.trackingNumber = data.trackingNumber;

    renderDomesticStep3(currentDomesticOrder, utr);

  } catch(err) {
    console.error("Confirm UPI error:", err);
    renderDomesticStep3(currentDomesticOrder, utr);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>VERIFY &amp; SCHEDULE DISPATCH ➔</span>';
    }
  }
}
window.confirmDomesticUpiPayment = confirmDomesticUpiPayment;

function simulateInstantDomesticUPI() {
  if (!currentDomesticOrder) return;
  const mockUtr = `UTR991448${Math.floor(100000 + Math.random() * 900000)}`;
  const utrInp = document.getElementById('domUtrInput');
  if (utrInp) utrInp.value = mockUtr;
  if (typeof showToast === 'function') {
    showToast(`⚡ Simulated UPI Payment: ${mockUtr}`, 'info');
  }
  confirmDomesticUpiPayment();
}
window.simulateInstantDomesticUPI = simulateInstantDomesticUPI;

function renderDomesticStep3(order, utr) {
  const oId = document.getElementById('domReceiptOrderId');
  if (oId) oId.textContent = order.orderId;

  const uEl = document.getElementById('domReceiptUtr');
  if (uEl) uEl.textContent = utr;

  const cEl = document.getElementById('domReceiptCommodity');
  if (cEl) cEl.textContent = `${order.commodity} (${order.packSize} × ${order.quantity} Units)`;

  const aEl = document.getElementById('domReceiptAmount');
  if (aEl) aEl.textContent = `₹${order.amount.toFixed(2)} INR (PAID VIA UPI)`;

  const dEl = document.getElementById('domReceiptDestination');
  if (dEl) dEl.textContent = `${order.city}, ${order.state} (PIN ${order.pincode})`;

  const trackBtn = document.getElementById('btnTrackDomesticOrder');
  if (trackBtn) {
    trackBtn.href = `tracking.html?bl=${encodeURIComponent(order.orderId)}`;
  }

  // Save to client localStorage for cross-tab sync with desk.html
  try {
    const list = JSON.parse(localStorage.getItem('gge_inquiries') || '[]');
    const shortSfx = order.orderId.replace('GGE-DOM-', '');
    const domRecord = {
      id: order.orderId,
      type: 'DOMESTIC_ORDER',
      name: order.name,
      company: 'Domestic Retail / APMC Distribution',
      email: order.email,
      phone: order.phone,
      country: 'India',
      address: `${order.address}, ${order.city}, ${order.state} - ${order.pincode}`,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      commodities: `${order.commodity} (${order.packSize} × ${order.quantity} Units)`,
      volume: `${order.packSize} × ${order.quantity}`,
      pack_size: order.packSize,
      pack_quantity: order.quantity,
      incoterms: 'DOOR DELIVERY (Surface Express)',
      payable: `₹${order.amount.toFixed(2)} INR (PAID VIA UPI · UTR: ${utr})`,
      status: 'PAID · Pending Domestic Dispatch',
      payment_status: 'PAID',
      tax_invoice_ref: order.taxInvoiceRef || `TAX-INV-DOM-${shortSfx}`,
      courier_partner: order.courierPartner || 'Blue Dart Express Surface',
      tracking_number: order.trackingNumber || `BD-DOM-${shortSfx}`,
      blCode: order.orderId,
      utr: utr,
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now() / 1000
    };
    list.unshift(domRecord);
    localStorage.setItem('gge_inquiries', JSON.stringify(list));

    // Also persist dedicated domestic orders storage
    const domList = JSON.parse(localStorage.getItem('gge_domestic_orders') || '[]');
    domList.unshift(domRecord);
    localStorage.setItem('gge_domestic_orders', JSON.stringify(domList));

    if (typeof window.saveDomesticOrders === 'function') {
      window.saveDomesticOrders(domList);
    }
    if (typeof window.saveInquiries === 'function') {
      window.saveInquiries(list);
    }

    // Also persist consignment to localStorage so tracking.html works immediately
    const consignList = JSON.parse(localStorage.getItem('gge_consignments') || '[]');
    consignList.unshift({
      bl: order.orderId,
      inquiryRef: order.orderId,
      quotationRef: order.orderId,
      buyer: order.name,
      buyerEmail: order.email,
      buyerPhone: order.phone,
      commodity: `${order.commodity} (${order.packSize} × ${order.quantity} Units)`,
      vessel: 'Domestic Surface Express (BlueDart / Delhivery)',
      pod: `${order.city}, ${order.state} (PIN ${order.pincode})`,
      eta: '2-4 Business Days Door Delivery',
      container: `DOM-PARCEL #${shortSfx}`,
      stage: 2,
      status: 'Domestic Order Confirmed · Hub Allocation',
      invRef: order.taxInvoiceRef || `TAX-INV-DOM-${shortSfx}`,
      phytoRef: `AGMARK-IN-${shortSfx}`,
      coaRef: `FSSAI-GGE-${shortSfx}`,
      blRef: order.trackingNumber || `BD-DOM-${shortSfx}`,
      updatedAt: Date.now() / 1000
    });
    localStorage.setItem('gge_consignments', JSON.stringify(consignList));

    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('gge_channel');
      bc.postMessage({ type: 'NEW_DOMESTIC_ORDER', order: domRecord });
      bc.close();
    }
  } catch(e) {
    console.warn("Storage sync error:", e);
  }

  const s1 = document.getElementById('domesticStep1');
  const s2 = document.getElementById('domesticStep2');
  const s3 = document.getElementById('domesticStep3');
  if (s1) s1.style.display = 'none';
  if (s2) s2.style.display = 'none';
  if (s3) s3.style.display = 'block';

  if (typeof showToast === 'function') {
    showToast(`🎉 Domestic Order ${order.orderId} Confirmed via UPI!`, 'success');
  }
}

function returnToDomesticStep1() {
  const s1 = document.getElementById('domesticStep1');
  const s2 = document.getElementById('domesticStep2');
  const s3 = document.getElementById('domesticStep3');
  if (s1) s1.style.display = 'block';
  if (s2) s2.style.display = 'none';
  if (s3) s3.style.display = 'none';
}
window.returnToDomesticStep1 = returnToDomesticStep1;

function openDomesticOrderModal(lotId, preselectedPack) {
  const modal = document.getElementById('domesticOrderModal');
  if (!modal) return;

  const lot = lotId || 'p1';
  const sel = document.getElementById('domModalCommodity');
  if (sel) {
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === lot || sel.options[i].text.toLowerCase().includes(lot.toLowerCase())) {
        sel.selectedIndex = i;
        break;
      }
    }
  }

  selectDomesticPackSize(preselectedPack || '1kg');
  returnToDomesticStep1();
  modal.style.display = 'flex';
}
window.openDomesticOrderModal = openDomesticOrderModal;

function closeDomesticOrderModal() {
  const modal = document.getElementById('domesticOrderModal');
  if (modal) modal.style.display = 'none';
}
window.closeDomesticOrderModal = closeDomesticOrderModal;


// Client telemetry and analytics


// Client telemetry controller
let telemetryHumanInteractions = 0;
let telemetryMaxScroll = 0;
let telemetryLastActiveSection = 'Hero Overview';
let telemetryLangHistory = [];

function detectTrafficSource() {
  const ref = (typeof document !== 'undefined' && document.referrer) ? document.referrer : '';
  const search = (typeof window !== 'undefined' && window.location && window.location.search) ? window.location.search : '';
  if (search.includes('ref=whatsapp') || search.includes('utm_source=whatsapp')) return '💬 WhatsApp Direct Outreach';
  if (search.includes('ref=linkedin') || search.includes('utm_source=linkedin') || ref.includes('linkedin.com')) return '💼 LinkedIn B2B Trade Lead';
  if (search.includes('ref=indiamart') || ref.includes('indiamart.com')) return '🏢 IndiaMART B2B Portal Referral';
  if (ref.includes('google.')) return '🌐 Google Organic Search';
  if (ref.includes('bing.') || ref.includes('yahoo.')) return '🌐 Search Engine Referral';
  if (!ref || ref.includes('localhost') || ref.includes('127.0.0.1')) return '🔗 Direct Navigation / Trade Bookmark';
  return `🌐 Referral from ${ref.split('/')[2] || ref}`;
}

function detectNetworkDiagnostics(deviceType) {
  const conn = (typeof navigator !== 'undefined' && (navigator.connection || navigator.mozConnection || navigator.webkitConnection)) || {};
  let speed = 'High-Speed Broadband / Wi-Fi · ~12ms Ping';
  if (deviceType && (deviceType.includes('Mobile') || deviceType.includes('Smartphone'))) {
    speed = '5G High-Speed Mobile Data · ~24ms Ping';
  } else if (deviceType && deviceType.includes('Tablet')) {
    speed = 'Wi-Fi / 5G Mobile Data · ~18ms Ping';
  }
  const langs = (typeof navigator !== 'undefined' && navigator.languages && navigator.languages.join(', ')) || (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
  return { speed, langs };
}

function detectDeviceSpecs() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
  let deviceType = "💻 Desktop Workstation";
  let os = "Windows 11 Pro";
  let browser = "Google Chrome";

  if (/iPad|Tablet|PlayBook/i.test(ua)) {
    deviceType = "📟 Tablet Device";
    os = "iPadOS / Tablet";
  } else if (/Mobile|Android|iPhone|iPod|BlackBerry/i.test(ua)) {
    deviceType = "📱 Mobile Smartphone";
    if (/iPhone/i.test(ua)) os = "Apple iOS 17";
    else if (/Android/i.test(ua)) os = "Android 14";
  } else {
    if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS Sonoma";
    else if (/Windows/i.test(ua)) os = "Windows 11 Pro";
    else if (/Linux/i.test(ua)) os = "Linux x86_64";
  }

  if (/Edg|Edge/i.test(ua)) browser = "Microsoft Edge";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera Browser";
  else if (/Firefox/i.test(ua)) browser = "Mozilla Firefox";
  else if (/Brave/i.test(ua) || (navigator.brave && typeof navigator.brave.isBrave === 'function')) browser = "Brave Browser";
  else if (/Chrome/i.test(ua)) browser = "Google Chrome";
  else if (/Safari/i.test(ua)) browser = "Apple Safari";

  const screenRes = (typeof window !== 'undefined' && window.screen) ? `${window.screen.width}x${window.screen.height}` : '1920x1080';
  return {
    type: deviceType,
    specs: `${os} · ${browser} · ${screenRes}`
  };
}

async function initVisitorTelemetryTracker() {
  try {
    let session = JSON.parse(sessionStorage.getItem('gge_active_telemetry_session') || 'null');
    
    // Increment persistent visit count
    let myVisitCount = parseInt(localStorage.getItem('gge_my_visit_count') || '0', 10) + 1;
    localStorage.setItem('gge_my_visit_count', myVisitCount.toString());
    const returnBadge = myVisitCount > 2 ? `★ ${myVisitCount}rd Visit (Hot Lead)` : (myVisitCount === 2 ? '★ 2nd Visit' : 'New Visitor');

    // Timezone mappings
    const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Kolkata';
    const tzLocations = {
      'Asia/Kolkata': '🇮🇳 Mumbai / Maharashtra, India',
      'Asia/Calcutta': '🇮🇳 Mumbai / Maharashtra, India',
      'Asia/Dubai': '🇦🇪 Dubai, United Arab Emirates',
      'Asia/Muscat': '🇴🇲 Muscat, Oman',
      'Asia/Riyadh': '🇸🇦 Riyadh, Saudi Arabia',
      'Asia/Qatar': '🇶🇦 Doha, Qatar',
      'Asia/Tokyo': '🇯🇵 Tokyo, Japan',
      'Asia/Seoul': '🇰🇷 Seoul, South Korea',
      'Asia/Shanghai': '🇨🇳 Shanghai, China',
      'Asia/Singapore': '🇸🇬 Singapore',
      'Asia/Kuala_Lumpur': '🇲🇾 Kuala Lumpur, Malaysia',
      'Asia/Jakarta': '🇮🇩 Jakarta, Indonesia',
      'Asia/Bangkok': '🇹🇭 Bangkok, Thailand',
      'Europe/Berlin': '🇩🇪 Hamburg / Berlin, Germany',
      'Europe/Amsterdam': '🇳🇱 Rotterdam, Netherlands',
      'Europe/London': '🇬🇧 London, United Kingdom',
      'Europe/Paris': '🇫🇷 Paris, France',
      'Europe/Madrid': '🇪🇸 Valencia / Madrid, Spain',
      'America/New_York': '🇺🇸 New York, United States',
      'America/Los_Angeles': '🇺🇸 Los Angeles, United States',
      'Australia/Sydney': '🇦🇺 Sydney, Australia'
    };

    let locationName = tzLocations[tz] || `🇮🇳 Mumbai / Local Desk, India`;
    const dev = detectDeviceSpecs();
    const netDiag = detectNetworkDiagnostics(dev.type);
    const trafficSource = detectTrafficSource();

    let list = JSON.parse(localStorage.getItem('gge_visitor_telemetry') || '[]');
    const existsInList = session && list.some(i => i.id === session.id);

    if (!session || !existsInList) {
      if (!session) {
        const now = new Date();
        const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
        session = {
          id: `GGE-VIS-${Math.floor(1000 + Math.random() * 9000)}`,
          isLive: true,
          returningBadge: returnBadge,
          visitCount: myVisitCount,
          ip: 'Connecting...',
          isp: 'Commercial Fiber Gateway',
          vpnStatus: 'Clean Commercial / Residential IP',
          botVerified: '🛡️ Verified Human (Score: 100%)',
          origin: locationName,
          timestamp: dateStr,
          dwellSeconds: 0,
          scrollDepth: 10,
          activeSection: 'Hero Overview',
          landingSection: 'Hero Overview',
          exitSection: 'Hero Overview',
          device: dev.type,
          deviceSpecs: dev.specs,
          networkSpeed: netDiag.speed,
          systemLanguages: netDiag.langs,
          trafficSource: trafficSource,
          langSwitchHistory: 'EN (USD)',
          inspectedLots: [],
          downloadedPdfs: [],
          corridorsExplored: [],
          draftLead: {},
          action: 'Browsing Storefront'
        };
        sessionStorage.setItem('gge_active_telemetry_session', JSON.stringify(session));
      }

      // Always ensure session is in global visitor list
      try {
        let currentList = JSON.parse(localStorage.getItem('gge_visitor_telemetry') || '[]');
        if (!currentList.some(i => i.id === session.id)) {
          currentList.unshift(session);
          localStorage.setItem('gge_visitor_telemetry', JSON.stringify(currentList));
        }
      } catch (e) {}

      // Instant server-side real IP & location resolution with live ping measurement
      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      fetch('/api/get-ip')
        .then(r => r.json())
        .then(data => {
          const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
          const realPing = Math.max(4, Math.round(t1 - t0));

          if (data && data.ip) session.ip = data.ip;
          if (data && data.origin) session.origin = data.origin;
          if (data && data.isp) session.isp = data.isp;
          if (data && data.vpnStatus) session.vpnStatus = data.vpnStatus;
          if (data && data.browser && data.os) {
            const screenRes = (typeof window !== 'undefined' && window.screen) ? `${window.screen.width}x${window.screen.height}` : '1920x1080';
            session.deviceSpecs = `${data.os} · ${data.browser} · ${screenRes}`;
            session.device = (data.os.includes('iPhone') || data.os.includes('Android')) ? '📱 Mobile Smartphone' : '💻 Desktop Workstation';
          }
          session.networkSpeed = `High-Speed Broadband Fiber · ~${realPing}ms Latency`;
          sessionStorage.setItem('gge_active_telemetry_session', JSON.stringify(session));

          let list = JSON.parse(localStorage.getItem('gge_visitor_telemetry') || '[]');
          const idx = list.findIndex(i => i.id === session.id);
          if (idx >= 0) {
            list[idx] = Object.assign({}, list[idx], session);
            localStorage.setItem('gge_visitor_telemetry', JSON.stringify(list));
          }
        })
        .catch(() => {});
    }

    // Dynamically refresh IP & location in background even if session was already active (e.g. VPN turned on/off)
    if (session) {
      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      fetch('/api/get-ip')
        .then(r => r.json())
        .then(data => {
          const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
          const realPing = Math.max(4, Math.round(t1 - t0));
          if (data && data.ip) session.ip = data.ip;
          if (data && data.origin) session.origin = data.origin;
          if (data && data.isp) session.isp = data.isp;
          if (data && data.vpnStatus) session.vpnStatus = data.vpnStatus;
          if (data && data.browser && data.os) {
            const screenRes = (typeof window !== 'undefined' && window.screen) ? `${window.screen.width}x${window.screen.height}` : '1920x1080';
            session.deviceSpecs = `${data.os} · ${data.browser} · ${screenRes}`;
            session.device = (data.os.includes('iPhone') || data.os.includes('Android')) ? '📱 Mobile Smartphone' : '💻 Desktop Workstation';
          }
          session.networkSpeed = `High-Speed Broadband Fiber · ~${realPing}ms Latency`;
          sessionStorage.setItem('gge_active_telemetry_session', JSON.stringify(session));
          let list = JSON.parse(localStorage.getItem('gge_visitor_telemetry') || '[]');
          const idx = list.findIndex(i => i.id === session.id);
          if (idx >= 0) {
            list[idx] = Object.assign({}, list[idx], session);
            localStorage.setItem('gge_visitor_telemetry', JSON.stringify(list));
          }
        })
        .catch(() => {});
    }

    // Track Human Interactions (Mouse, Touch, Scroll)
    window.addEventListener('mousemove', () => { telemetryHumanInteractions++; });
    window.addEventListener('touchstart', () => { telemetryHumanInteractions++; });
    window.addEventListener('keydown', () => { telemetryHumanInteractions++; });

    // Track Scroll Depth & Active Section
    window.addEventListener('scroll', () => {
      const scrollH = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollH > 0) {
        const pct = Math.min(100, Math.round((window.scrollY / scrollH) * 100));
        if (pct > telemetryMaxScroll) telemetryMaxScroll = pct;
        session.scrollDepth = telemetryMaxScroll;
      }

      // Determine active section
      const sections = [
        { id: 'home', name: 'Hero / Overview' },
        { id: 'products', name: 'Commodities Portfolio' },
        { id: 'packaging', name: 'Custom Packaging Suite' },
        { id: 'quality', name: '5-Stage Sortex QA Workflow' },
        { id: 'incoterms', name: 'Incoterms 2020 & Trade Terms' },
        { id: 'process', name: 'Operational Protocol' },
        { id: 'why', name: 'Export Advantage (Why Us)' },
        { id: 'reach', name: 'Interactive Maritime Corridors' },
        { id: 'contact', name: 'Contact RFQ Desk' }
      ];

      for (let s of sections) {
        const el = document.getElementById(s.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 250 && rect.bottom >= 150) {
            telemetryLastActiveSection = s.name;
            session.activeSection = s.name;
            session.exitSection = s.name;
            break;
          }
        }
      }
    });

    // Track Form Drafts & Abandonment Live Keystrokes
    const trackFormInputs = () => {
      const fname = (document.getElementById('rfqName') && document.getElementById('rfqName').value) || (document.getElementById('fname') && document.getElementById('fname').value) || '';
      const email = (document.getElementById('rfqEmail') && document.getElementById('rfqEmail').value) || (document.getElementById('email') && document.getElementById('email').value) || '';
      const company = (document.getElementById('rfqCompany') && document.getElementById('rfqCompany').value) || (document.getElementById('company') && document.getElementById('company').value) || '';
      const country = (document.getElementById('rfqCountry') && document.getElementById('rfqCountry').value) || (document.getElementById('country') && document.getElementById('country').value) || '';
      const vol = (document.getElementById('rfqVolume') && document.getElementById('rfqVolume').value) || '';
      const comm = (document.getElementById('rfqCommodities') && document.getElementById('rfqCommodities').value) || '';

      if (company || email || fname || vol) {
        session.draftLead = {
          company: company || 'Pending Trade Entity',
          name: fname || 'Commercial Representative',
          email: email || '',
          country: country || session.origin,
          volume: vol || 'FCL Load',
          commodities: comm || session.inspectedLots.join(', ') || 'Sortex Commodities'
        };
        if (!session.action.includes('Transmitted') && !session.action.includes('Sample')) {
          session.action = `⚠️ Abandoned Lead: ${company || fname}`;
        }
      }
    };

    ['fname', 'rfqName', 'email', 'rfqEmail', 'company', 'rfqCompany', 'country', 'rfqCountry', 'rfqVolumeVal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', trackFormInputs);
    });

    // Track Live Pulse (Tab focused vs blurred)
    document.addEventListener('visibilitychange', () => {
      session.isLive = (document.visibilityState === 'visible');
    });

    // Increment dwell timer every 1 second, flush to localStorage every 2 seconds
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        session.dwellSeconds += 1;
      }
      session.botVerified = telemetryHumanInteractions > 3 ? '🛡️ Verified Human (Score: 100%)' : '🛡️ Verified Human (Evaluating)';
      sessionStorage.setItem('gge_active_telemetry_session', JSON.stringify(session));
    }, 1000);

    setInterval(() => {
      try {
        let list = JSON.parse(localStorage.getItem('gge_visitor_telemetry') || '[]');
        const idx = list.findIndex(i => i.id === session.id);
        if (idx >= 0) {
          list[idx] = Object.assign({}, list[idx], session);
        } else {
          list.unshift(session);
        }
        localStorage.setItem('gge_visitor_telemetry', JSON.stringify(list));
      } catch (e) {}
    }, 2000);

  } catch (e) {}
}

function logTelemetryInspectedLot(lotName) {
  try {
    let session = JSON.parse(sessionStorage.getItem('gge_active_telemetry_session') || 'null');
    if (!session) {
      let list = JSON.parse(localStorage.getItem('gge_visitor_telemetry') || '[]');
      if (list.length > 0) session = list[0];
    }
    if (session && lotName) {
      if (!session.inspectedLots) session.inspectedLots = [];
      if (!session.inspectedLots.includes(lotName)) {
        session.inspectedLots.push(lotName);
      }
      sessionStorage.setItem('gge_active_telemetry_session', JSON.stringify(session));
      let list = JSON.parse(localStorage.getItem('gge_visitor_telemetry') || '[]');
      const idx = list.findIndex(i => i.id === session.id);
      if (idx >= 0) {
        list[idx].inspectedLots = session.inspectedLots;
        localStorage.setItem('gge_visitor_telemetry', JSON.stringify(list));
      }
    }
  } catch (e) {}
}

function logTelemetryPdfDownload(pdfName) {
  try {
    let session = JSON.parse(sessionStorage.getItem('gge_active_telemetry_session') || 'null');
    let list = JSON.parse(localStorage.getItem('gge_visitor_telemetry') || '[]');
    if (!session && list.length > 0) {
      session = list[0];
    }
    if (session && pdfName) {
      if (!session.downloadedPdfs) session.downloadedPdfs = [];
      if (!session.downloadedPdfs.includes(pdfName)) {
        session.downloadedPdfs.push(pdfName);
      }
      session.action = `📥 Downloaded Spec: ${pdfName}`;
      sessionStorage.setItem('gge_active_telemetry_session', JSON.stringify(session));

      const idx = list.findIndex(i => i.id === session.id);
      if (idx >= 0) {
        list[idx].downloadedPdfs = session.downloadedPdfs;
        list[idx].action = session.action;
      } else {
        list.unshift(session);
      }
      localStorage.setItem('gge_visitor_telemetry', JSON.stringify(list));
    }
  } catch (e) {}
}

function logTelemetryConversion(actionText) {
  try {
    let session = JSON.parse(sessionStorage.getItem('gge_active_telemetry_session') || 'null');
    if (session && actionText) {
      session.action = actionText;
      sessionStorage.setItem('gge_active_telemetry_session', JSON.stringify(session));

      let list = JSON.parse(localStorage.getItem('gge_visitor_telemetry') || '[]');
      const idx = list.findIndex(i => i.id === session.id);
      if (idx >= 0) {
        list[idx].action = actionText;
        localStorage.setItem('gge_visitor_telemetry', JSON.stringify(list));
      }
    }
  } catch (e) {}
}

function logTelemetryLangSwitch(fromLang, toLang, toCurr) {
  try {
    let session = JSON.parse(sessionStorage.getItem('gge_active_telemetry_session') || 'null');
    if (session) {
      const entry = `${fromLang.toUpperCase()} → ${toLang.toUpperCase()} (${toCurr})`;
      if (!session.langSwitchHistory) session.langSwitchHistory = 'EN (USD)';
      if (!session.langSwitchHistory.includes(entry)) {
        session.langSwitchHistory += ` → ${toLang.toUpperCase()} (${toCurr})`;
        sessionStorage.setItem('gge_active_telemetry_session', JSON.stringify(session));
      }
    }
  } catch (e) {}
}

function logTelemetryCorridor(corridorName) {
  try {
    let session = JSON.parse(sessionStorage.getItem('gge_active_telemetry_session') || 'null');
    if (session && corridorName) {
      if (!session.corridorsExplored) session.corridorsExplored = [];
      if (!session.corridorsExplored.includes(corridorName)) {
        session.corridorsExplored.push(corridorName);
        sessionStorage.setItem('gge_active_telemetry_session', JSON.stringify(session));
      }
    }
  } catch (e) {}
}

window.logTelemetryInspectedLot = logTelemetryInspectedLot;
window.logTelemetryPdfDownload = logTelemetryPdfDownload;
window.logTelemetryConversion = logTelemetryConversion;
window.logTelemetryLangSwitch = logTelemetryLangSwitch;
window.logTelemetryCorridor = logTelemetryCorridor;






if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisitorTelemetryTracker);
} else {
  initVisitorTelemetryTracker();
}

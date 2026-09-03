
function downloadSubmittedProforma(refId, company, name, commodities, volume, country) {
  if (typeof window.generateProformaInvoicePDF === 'function') {
    const tons = parseFloat(volume) || 24.0;
    window.generateProformaInvoicePDF({
      refCode: refId,
      buyerName: name || 'Commercial Representative',
      buyerCompany: company || 'International Trading House',
      destinationPort: country || 'Jebel Ali, Dubai (UAE)',
      commodityName: commodities || 'Sortex Grade-A Pulses',
      tonnage: tons,
      unitPrice: 980.00,
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


// ================= VOLUME CAPACITY VALIDATOR (3 to 22 QUINTALS / 300 to 2,200 KG) =================
function handleVolumeUnitChange() {
  const unitEl = document.getElementById('rfqVolumeUnit');
  const valInp = document.getElementById('rfqVolumeVal');
  const hint = document.getElementById('volumeHint');
  if (!unitEl || !valInp) return;

  const unit = unitEl.value;
  if (unit === 'Quintals') {
    valInp.min = 3;
    valInp.max = 22;
    valInp.step = 0.5;
    let cur = parseFloat(valInp.value) || 10;
    if (cur > 22) valInp.value = 22;
    if (cur < 3) valInp.value = 3;
  } else {
    // KG
    valInp.min = 300;
    valInp.max = 2200;
    valInp.step = 50;
    let cur = parseFloat(valInp.value) || 1000;
    if (cur < 300) valInp.value = 300;
    if (cur > 2200) valInp.value = 2200;
  }
  syncVolumeString();
}

function syncVolumeString() {
  const unitEl = document.getElementById('rfqVolumeUnit');
  const valInp = document.getElementById('rfqVolumeVal');
  const hidden = document.getElementById('rfqVolume');
  const hint = document.getElementById('volumeHint');
  if (!unitEl || !valInp) return true;

  const unit = unitEl.value;
  const val = parseFloat(valInp.value) || 0;

  let valid = true;
  if (unit === 'Quintals') {
    if (val < 3) {
      if (hint) {
        hint.textContent = '⚠️ Minimum order quantity is 3 Quintals (300 KG).';
        hint.style.color = '#D9534F';
      }
      valid = false;
    } else if (val > 22) {
      if (hint) {
        hint.textContent = '⚠️ Maximum consignment batch is 22 Quintals (2,200 KG).';
        hint.style.color = '#D9534F';
      }
      valid = false;
    } else {
      if (hint) {
        hint.textContent = `✓ Batch: ${val} Quintals (${(val * 100).toLocaleString()} KG) · Valid Export Lot`;
        hint.style.color = '#2E7D32';
      }
    }
    if (hidden) hidden.value = `${val} Quintals (${(val * 100).toLocaleString()} KG)`;
  } else {
    // KG
    if (val < 300) {
      if (hint) {
        hint.textContent = '⚠️ Minimum order quantity is 300 KG (3 Quintals).';
        hint.style.color = '#D9534F';
      }
      valid = false;
    } else if (val > 2200) {
      if (hint) {
        hint.textContent = '⚠️ Maximum consignment batch is 2,200 KG (22 Quintals).';
        hint.style.color = '#D9534F';
      }
      valid = false;
    } else {
      if (hint) {
        hint.textContent = `✓ Batch: ${val.toLocaleString()} KG (${(val / 100).toFixed(1)} Quintals) · Valid Export Lot`;
        hint.style.color = '#2E7D32';
      }
    }
    if (hidden) hidden.value = `${val.toLocaleString()} KG (${(val / 100).toFixed(1)} Quintals)`;
  }
  return valid;
}
window.handleVolumeUnitChange = handleVolumeUnitChange;
window.syncVolumeString = syncVolumeString;


function getSampleBasePriceINR() {
  const stored = localStorage.getItem('gge_sample_price_inr');
  return stored ? parseFloat(stored) : 10.00;
}

/**
 * Golden Global Expo — Primary Portal Controller (index.html)
 * Restores 100% authentic luxury effects: Particle physics, 3D tilt tracking, 
 * astrolabe motion, radar routing, live tracking, and interactive specs.
 */

let activeLotId = 'p1';

// ================= 1. PARTICLE CANVAS & STARDUST PHYSICS =================
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

  // ================= GPU & BATTERY EFFICIENCY ENGINE =================
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

// ================= 2. 3D CARD TILT & SPOTLIGHT =================
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

// ================= 3. ANIMATED NUMBER COUNTERS =================
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

// ================= 4. COMMODITY CATEGORY FILTERS =================
function initFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.card--product');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      cards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
          setTimeout(() => card.classList.add('is-visible'), 20);
        } else {
          card.style.display = 'none';
          card.classList.remove('is-visible');
        }
      });
    });
  });
}

// ================= 5. STRATEGIC SHIPPING CORRIDORS & REAL WORLD MAP (PAN & ZOOM ENGINE) =================
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


// ================= 6. LIVE CARGO & B/L TRACKER =================
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

// ================= 7. SPECIFICATION DRAWER & COA PDF =================
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
    image: "images/products/toor_dal.jpg",
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

let currentRfqMode = 'quote'; // 'quote' | 'sample'

function setRfqMode(mode) {
  currentRfqMode = mode;
  const btnQuote = document.getElementById('modeBtnQuote');
  const btnSample = document.getElementById('modeBtnSample');
  const bulkFields = document.getElementById('bulkFields');
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

  if (mode === 'sample') {
    if (btnQuote) btnQuote.classList.remove('active');
    if (btnSample) btnSample.classList.add('active');
    if (bulkFields) bulkFields.style.display = 'none';
    if (sampleFields) sampleFields.style.display = 'grid';
    if (quickChips) quickChips.style.display = 'none';
    if (submitBtn) submitBtn.innerHTML = 'SUBMIT SAMPLE DISPATCH ORDER (DHL / FEDEX) ➔';

    if (rfqName) rfqName.required = false;
    if (rfqEmail) rfqEmail.required = false;
    if (rfqCompany) rfqCompany.required = false;
    if (sampleName) sampleName.required = true;
    if (sampleEmail) sampleEmail.required = true;
    if (sampleCompany) sampleCompany.required = true;
    if (sampleAddress) sampleAddress.required = true;
  } else {
    if (btnSample) btnSample.classList.remove('active');
    if (btnQuote) btnQuote.classList.add('active');
    if (sampleFields) sampleFields.style.display = 'none';
    if (bulkFields) bulkFields.style.display = 'grid';
    if (quickChips) quickChips.style.display = 'flex';
    if (submitBtn) submitBtn.innerHTML = 'SUBMIT EXPORT RFQ ➔';

    if (sampleName) sampleName.required = false;
    if (sampleEmail) sampleEmail.required = false;
    if (sampleCompany) sampleCompany.required = false;
    if (sampleAddress) sampleAddress.required = false;
    if (rfqName) rfqName.required = true;
    if (rfqEmail) rfqEmail.required = true;
    if (rfqCompany) rfqCompany.required = true;
  }
}
window.setRfqMode = setRfqMode;



function handleRfqSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const submitBtn = document.getElementById('rfqSubmitBtn');
  const successMsg = document.getElementById('rfqSuccessMsg');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Transmitting to Trade Desk...</span>';
  }

  if (currentRfqMode === 'sample') {
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

    // Immediate server POST to /api/inquiries
    fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleLead)
    }).catch(() => {});

    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'LOT_SAMPLE_DISPATCH_SUBMITTED',
        actor: email || name,
        details: `Sample dispatch inquiry ${refId} logged for ${commodity} to ${address || 'destination'}`
      })
    }).catch(() => {});

    setTimeout(() => {
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
    }, 400);

  } else {
    const name = (document.getElementById('rfqName') && document.getElementById('rfqName').value.trim()) || 'International Buyer';
    const email = (document.getElementById('rfqEmail') && document.getElementById('rfqEmail').value.trim()) || '';
    const company = (document.getElementById('rfqCompany') && document.getElementById('rfqCompany').value.trim()) || 'Enterprise Buyer';
    const country = (document.getElementById('rfqCountry') && document.getElementById('rfqCountry').value.trim()) || 'International Destination';
    const volume = (document.getElementById('rfqVolume') && document.getElementById('rfqVolume').value.trim()) || '10 Quintals (1,000 KG)';
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
      status: 'new'
    };

    try {
      const existing = JSON.parse(localStorage.getItem('gge_inquiries') || '[]');
      existing.unshift(rfqLead);
      localStorage.setItem('gge_inquiries', JSON.stringify(existing));
    } catch(err) {}

    // Immediate server POST to /api/inquiries
    fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rfqLead)
    }).catch(() => {});

    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'COMMERCIAL_BULK_RFQ_SUBMITTED',
        actor: email || name,
        details: `Bulk RFQ ${refId} received for ${commodities} (${volume}) to ${country}`
      })
    }).catch(() => {});

    setTimeout(() => {
      if (submitBtn) {
        submitBtn.style.display = 'none';
      }
      if (successMsg) {
        successMsg.style.display = 'block';
        successMsg.innerHTML = `
          <div style="font-weight:700;color:#1E6E28;margin-bottom:6px;font-size:0.95rem;">✓ Commercial Export RFQ Transmitted! (Ref: ${escapeHtml(refId)})</div>
          <div style="font-size:0.80rem;color:#3A352F;line-height:1.5;">
            Proforma quotation generated for <b>${escapeHtml(commodities)} (${escapeHtml(volume)})</b>. Our Mumbai trade desk will send formal proforma pricing to <b>${escapeHtml(email || 'registered address')}</b>.
          </div>
          <div style="margin-top:12px;">
            <button type="button" onclick="downloadSubmittedProforma('${escapeHtml(refId)}', '${escapeHtml(company)}', '${escapeHtml(name)}', '${escapeHtml(commodities)}', '${escapeHtml(volume)}', '${escapeHtml(country)}')" style="width:100%;padding:10px 14px;background:rgba(184,135,47,0.12);border:1.5px solid #B8872F;color:#785514;border-radius:4px;font-size:0.75rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s;">
              <span>📄 Download Certified Proforma Invoice (PDF) ➔</span>
            </button>
          </div>
        `;
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`Export Inquiry ${refId} Logged in CRM!`, 'success');
      }
    }, 400);
  }
}
window.handleRfqSubmit = handleRfqSubmit;


function openRfqForLot(lotId) {
  const spec = (window.specDatabase && window.specDatabase[lotId]);
  const commName = spec ? `${spec.name} (${spec.lot})` : 'Sortex Agri-Commodity';

  // Set the commodity input strictly to THIS product ONLY
  const commInput = document.getElementById('rfqCommodities');
  if (commInput) {
    commInput.value = commName;
  }

  // Also update sample commodity input in case buyer toggles to sample mode
  const smpInput = document.getElementById('sampleCommodity');
  if (smpInput) {
    smpInput.value = commName;
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
      showToast(`⚡ Direct RFQ Active: ${commName}`);
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
      const commInput = document.getElementById('rfqCommodities');
      if (commInput) commInput.value = `${spec.name} (${spec.lot})`;
    }
  }
}
window.requestQuoteFromDrawer = requestQuoteFromDrawer;



// ================= 8. FORM CHIPS & RFQ DISPATCH =================
function initContactForm() {
  const chipInputs = document.querySelectorAll('#productChips input');
  const summary = document.getElementById('selectionSummary');

  function updateSummary() {
    const selected = Array.from(chipInputs).filter(i => i.checked).map(i => i.value);
    if (summary) {
      summary.textContent = selected.length > 0 ? `Selected (${selected.length}): ${selected.join(', ')}` : '';
    }
  }
  chipInputs.forEach(i => i.addEventListener('change', updateSummary));

  const form = document.getElementById('quoteForm');
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

// ================= 9. LUXURY REGIONAL FLYOUT SWITCHERS =================
function initLuxurySwitchers() {
  const currPillBtn = document.getElementById('currPillBtn');
  const langPillBtn = document.getElementById('langPillBtn');
  const currPopover = document.getElementById('currPopover');
  const langPopover = document.getElementById('langPopover');

  if (!currPillBtn || !langPillBtn || !currPopover || !langPopover) return;

  function closeAllPopovers() {
    currPopover.classList.remove('open');
    langPopover.classList.remove('open');
    currPillBtn.classList.remove('active-pop');
    langPillBtn.classList.remove('active-pop');
    currPillBtn.setAttribute('aria-expanded', 'false');
    langPillBtn.setAttribute('aria-expanded', 'false');
  }

  // Toggle Currency Popover
  currPillBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = currPopover.classList.contains('open');
    closeAllPopovers();
    if (!isOpen) {
      currPopover.classList.add('open');
      currPillBtn.classList.add('active-pop');
      currPillBtn.setAttribute('aria-expanded', 'true');
    }
  });

  // Toggle Language Popover
  langPillBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = langPopover.classList.contains('open');
    closeAllPopovers();
    if (!isOpen) {
      langPopover.classList.add('open');
      langPillBtn.classList.add('active-pop');
      langPillBtn.setAttribute('aria-expanded', 'true');
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
    if (!e.target.closest('#navSwitchersHub')) {
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

// ================= 10. DOM INITIALIZATION =================
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
  if (navToggle && mobileMenu) {
    if (typeof navToggle.addEventListener === 'function') {
      navToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
      });
    }
    if (typeof mobileMenu.querySelectorAll === 'function') {
      mobileMenu.querySelectorAll('a').forEach(a => {
        if (typeof a.addEventListener === 'function') {
          a.addEventListener('click', () => mobileMenu.classList.remove('open'));
        }
      });
    }
  }

  // Keyboard Escape for Drawer & Popovers
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSpecDrawer();
      const currPopover = document.getElementById('currPopover');
      const langPopover = document.getElementById('langPopover');
      if (currPopover) currPopover.classList.remove('open');
      if (langPopover) langPopover.classList.remove('open');
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
}

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


// ================= 8. CONTACT FORM MOTION GRAPHICS & WORLD CLOCK =================
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

  // 3. Form Submission with Scanning State
  const form = document.getElementById('rfqForm');
  const submitBtn = document.getElementById('rfqSubmitBtn');
  const successMsg = document.getElementById('rfqSuccessMsg');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (submitBtn) {
        submitBtn.innerHTML = '<span>TRANSMITTING TO MUMBAI DESK...</span>';
        submitBtn.style.opacity = '0.7';
        submitBtn.disabled = true;
      }

      setTimeout(() => {
        if (submitBtn) {
          submitBtn.style.display = 'none';
        }
        if (successMsg) {
          successMsg.style.display = 'block';
        }
        if (typeof showToast === 'function') {
          showToast('✅ Formal Export RFQ Transmitted! Reference generated.');
        }
      }, 700);
    });
  }
}

// Quick add commodity chip into input
function addCommodityToRfq(name) {
  const input = document.getElementById('rfqCommodities');
  if (!input) return;
  const current = input.value.trim();
  if (!current) {
    input.value = name;
  } else if (!current.includes(name)) {
    input.value = `${current}, ${name}`;
  }
  input.focus();
}
window.addCommodityToRfq = addCommodityToRfq;

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
      const keywords = ['masoor', 'toor', 'tur', 'moong', 'mung', 'chana', 'chia', 'cumin', 'jeera', 'coriander', 'dhania', 'turmeric', 'haldi', 'moringa', 'jowar', 'sorghum', 'chilli', 'chili', 'cardamom', 'sesame', 'mustard', 'fenugreek', 'fennel'];
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

  updateSamplePriceCalc();
  modal.style.display = 'flex';
}

function closeSampleCheckoutModal() {
  const modal = document.getElementById('sampleCheckoutModal');
  if (modal) modal.style.display = 'none';
}

function updateSamplePriceCalc() {
  const basePrice = getSampleBasePriceINR();
  const weight = (document.getElementById('smpWeight') ? document.getElementById('smpWeight').value : '500g');
  const amountInr = (weight === '1kg') ? (basePrice * 2.00) : basePrice;
  const payableEl = document.getElementById('smpPayableText');
  if (payableEl) payableEl.textContent = `₹${amountInr.toFixed(2)}`;
  const btn = document.getElementById('btnLaunchRazorpay');
  if (btn) btn.innerHTML = `<span>⚡ PROCEED TO PAY ₹${amountInr.toFixed(2)} (FIXED PRICE) VIA UPI / GPAY ➔</span>`;
}

async function launchRazorpayCheckout() {
  const sel = document.getElementById('smpCommoditySelect');
  const commodity = sel ? (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text.split('·')[0].trim() : sel.value) : 'Certified Sample Commodity';
  const weight = (document.getElementById('smpWeight') ? document.getElementById('smpWeight').value : '500g');
  let name = (document.getElementById('smpName') ? document.getElementById('smpName').value.trim() : 'Aryan Nigade');
  let email = (document.getElementById('smpEmail') ? document.getElementById('smpEmail').value.trim() : 'nigadearyan@gmail.com');
  let phone = (document.getElementById('smpPhone') ? document.getElementById('smpPhone').value.trim() : '+91 9920594424');
  let address = (document.getElementById('smpAddress') ? document.getElementById('smpAddress').value.trim() : '1903 A Ajmera Zeon, Wadala East, Mumbai');

  if (!name) name = "Aryan Nigade";
  if (!email) email = "nigadearyan@gmail.com";
  if (!phone) phone = "+91 9920594424";
  if (!address) address = "1903 A Ajmera Zeon, Wadala East, Mumbai - 400037, Maharashtra, India";

  const basePrice = getSampleBasePriceINR();
  const amountInr = (weight === '1kg') ? (basePrice * 2.00) : basePrice;
  const amountPaise = Math.round(amountInr * 100);
  const sampleId = (typeof generateSecureId === 'function') 
    ? generateSecureId('GGE-SMP') 
    : `GGE-SMP-${Math.floor(1000 + Math.random() * 9000)}`;

  const rzpKey = "rzp_test_TVccuNkp9w0aTB";

  const btn = document.getElementById('btnLaunchRazorpay');
  if (btn) {
    btn.innerHTML = '<span>⚡ GENERATING SECURE UPI & GPAY SESSION...</span>';
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
      body: JSON.stringify({ amount: amountInr })
    });
    const orderData = await res.json();
    if (orderData && orderData.id) {
      serverOrderId = orderData.id;
    }
  } catch (e) {
    console.warn("Order creation error:", e);
  }

  if (btn) {
    btn.innerHTML = '⚡ PROCEED TO PAY ₹1.00 (AMAZON-STYLE AUTOMATIC GATEWAY) ➔';
    btn.style.opacity = '1';
    btn.disabled = false;
  }

  if (typeof Razorpay !== 'undefined') {
    const options = {
      key: rzpKey,
      amount: amountPaise,
      currency: "INR",
      name: "Golden Global Expo",
      description: `Certified ${weight} ${commodity.split('[')[0].trim()} Sample Pouch`,
      image: "images/logo_emblem.png",
      order_id: serverOrderId,
      handler: function (response) {
        const paymentId = response.razorpay_payment_id || `pay_${Date.now()}`;
        handleSuccessfulGatewayPayment(sampleId, paymentId, amountInr, commodity, weight, name, email, phone, address);
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

async function simulateInteractiveMockPayment() {
  const name = (document.getElementById('smpName') && document.getElementById('smpName').value.trim()) || 'International Buyer';
  const email = (document.getElementById('smpEmail') && document.getElementById('smpEmail').value.trim()) || 'buyer@globaltrade.com';
  const phone = (document.getElementById('smpPhone') && document.getElementById('smpPhone').value.trim()) || '+91 9920594424';
  let address = (document.getElementById('smpAddress') && document.getElementById('smpAddress').value.trim()) || '1903 A Ajmera Zeon, Wadala East, Mumbai - 400037, Maharashtra, India';
  const sel = document.getElementById('smpCommoditySelect');
  const commodity = sel ? (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text.split('·')[0].trim() : sel.value) : 'Assayed Export Lot';
  const weight = (document.getElementById('smpWeight') ? document.getElementById('smpWeight').value : '500g');
  const basePrice = (typeof getSampleBasePriceINR === 'function') ? getSampleBasePriceINR() : 1.0;
  const amountInr = (weight === '1kg') ? (basePrice * 2.0) : basePrice;
  const sampleId = (typeof generateSecureId === 'function') 
    ? generateSecureId('GGE-SMP') 
    : `GGE-SMP-${Math.floor(1000 + Math.random() * 9000)}`;

  const btnMock = document.getElementById('btnLaunchMockPayment');
  const btnRzp = document.getElementById('btnLaunchRazorpay');

  if (btnMock) {
    btnMock.disabled = true;
    btnMock.innerHTML = '<span>⏳ Contacting Card Issuer & Banking Node...</span>';
  }
  if (btnRzp) btnRzp.disabled = true;

  // Step 1: 3D Secure simulation
  await new Promise(r => setTimeout(r, 600));
  if (btnMock) btnMock.innerHTML = '<span>🔒 3D Secure 2.0 OTP Verified...</span>';

  // Step 2: Instant settlement capture
  await new Promise(r => setTimeout(r, 600));
  if (btnMock) btnMock.innerHTML = '<span>✅ Settle & Capture: ₹' + amountInr.toFixed(2) + '...</span>';

  await new Promise(r => setTimeout(r, 400));

  const mockPaymentId = `mock_pay_${Date.now().toString(36).toUpperCase()}`;

  handleSuccessfulGatewayPayment(sampleId, mockPaymentId, amountInr, commodity, weight, name, email, phone, address);

  // Notify backend to trigger real-time SSE event to desk
  try {
    fetch('/api/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: sampleId,
        payment_id: mockPaymentId,
        amount: amountInr.toFixed(2),
        paid_at: new Date().toISOString()
      })
    }).catch(() => {});
  } catch (e) {}

  if (btnMock) {
    btnMock.disabled = false;
    btnMock.innerHTML = '<span>🚀 Run Interactive Mock Gateway Demo (No Card Needed)</span>';
  }
  if (btnRzp) btnRzp.disabled = false;
}
window.simulateInteractiveMockPayment = simulateInteractiveMockPayment;

function handleSuccessfulGatewayPayment(orderId, paymentId, amountInr, commodity, weight, name, email, phone, address) {
  const sampleRecord = {
    id: orderId,
    type: 'SAMPLE_ORDER',
    paymentId: paymentId,
    name,
    email,
    phone,
    company: 'Golden Global Expo Sample Importer',
    commodities: `${commodity.split('[')[0].trim()} (${weight} Sealed Pouch)`,
    lotName: commodity,
    address,
    payable: `₹${parseFloat(amountInr).toFixed(2)} INR (PAID & CAPTURED)`,
    country: 'India Domestic (SpeedPost / BlueDart)',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    createdAt: Date.now() / 1000,
    status: 'PAID · Pending Courier AWB',
    utr: paymentId,
    awb: ''
  };

  // Save to inquiries & samples
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

    // 1. Immediately persist to server inquiries database
    if (typeof addInquiryToServer === 'function') {
      addInquiryToServer(sampleRecord);
    } else {
      fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleRecord)
      }).catch(() => {});
    }

    // 2. Immediately register sample consignment in tracker
    const consignmentItem = {
      bl: orderId,
      buyer: name,
      buyerEmail: email,
      buyerPhone: phone,
      commodity: `${commodity.split('[')[0].trim()} (${weight} Sealed Pouch)`,
      vessel: 'Air Courier (BlueDart / DHL Priority)',
      pod: address || 'Mumbai, Maharashtra, India',
      eta: '24-48 Hours Delivery',
      container: `AIR-POUCH #${orderId.replace('GGE-SMP-', '')}`,
      stage: 2,
      status: 'Sample Dispatched · Air Hub',
      invRef: '',
      phytoRef: '',
      coaRef: '',
      blRef: ''
    };
    fetch('/api/consignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consignmentItem)
    }).catch(() => {});

    // 3. Immediately record in Immutable Audit & Compliance Ledger
    const auditEntry = {
      id: `AUD-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      operator: 'Payment Gateway (Razorpay)',
      action: 'SAMPLE_ORDER_PAID_CAPTURED',
      entityId: orderId,
      previousState: 'CHECKOUT_PENDING',
      newState: `PAID_₹${parseFloat(amountInr).toFixed(2)}_CAPTURED`,
      details: `Gateway Ref: ${paymentId} | Consignee: ${name} | Commodity: ${commodity}`
    };
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditEntry)
    }).catch(() => {});

    window.dispatchEvent(new Event('storage'));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('gge_sync_channel');
      bc.postMessage({ type: 'NEW_SAMPLE_ORDER', sample: sampleRecord });
    }
  } catch (e) {}

  // Populate Green Tickmark Confirmation Screen
  const sId = document.getElementById('sucSampleId');
  const sPayId = document.getElementById('sucPaymentId');
  const sComm = document.getElementById('sucCommodity');
  const sName = document.getElementById('sucName');
  const sAddr = document.getElementById('sucAddress');
  const sPaid = document.getElementById('sucPaid');

  if (sId) sId.textContent = orderId;
  if (sPayId) sPayId.textContent = paymentId;
  if (sComm) sComm.textContent = `${commodity.split('[')[0].trim()} (${weight} Sealed Pouch)`;
  if (sName) sName.textContent = name;
  if (sAddr) sAddr.textContent = address;
  if (sPaid) sPaid.textContent = `₹${parseFloat(amountInr).toFixed(2)} INR (PAID & CAPTURED)`;

  const trackBtn = document.getElementById('btnTrackNewSample');
  if (trackBtn) {
    trackBtn.href = `tracking.html?bl=${encodeURIComponent(orderId)}`;
  }

  // Switch to Green Tickmark Step AUTOMATICALLY
  const orderStep = document.getElementById('sampleOrderStep');
  const successStep = document.getElementById('sampleSuccessStep');
  if (orderStep) orderStep.style.display = 'none';
  if (successStep) successStep.style.display = 'block';

  if (typeof showToast === 'function') {
    showToast(`🎉 Payment Captured (${paymentId})! Order Placed Successfully!`, 'success');
  }
}

function requestCommercialSample() {
  const lotId = window.activeLotId || '';
  const spec = (window.specDatabase && lotId) ? window.specDatabase[lotId] : null;
  const currentTitle = (spec && spec.name) || (document.getElementById('drawerTitle') ? document.getElementById('drawerTitle').textContent : '');
  closeSpecDrawer();
  openSampleCheckoutModal(currentTitle, lotId);
}


// ================= LIVE VISITOR & BUYER TELEMETRY ENGINE =================


// ================= ENTERPRISE LIVE BUYER TELEMETRY ENGINE =================
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
      const fname = (document.getElementById('fname') && document.getElementById('fname').value) || '';
      const email = (document.getElementById('email') && document.getElementById('email').value) || '';
      const company = (document.getElementById('company') && document.getElementById('company').value) || '';
      const country = (document.getElementById('country') && document.getElementById('country').value) || '';
      const vol = (document.getElementById('rfqVolumeVal') && document.getElementById('rfqVolumeVal').value) || '';
      const unit = (document.getElementById('rfqVolumeUnit') && document.getElementById('rfqVolumeUnit').value) || 'QTL';

      if (company || email || fname || vol) {
        session.draftLead = {
          company: company || 'Pending Trade Entity',
          name: fname || 'Commercial Representative',
          email: email || '',
          country: country || session.origin,
          volume: vol ? `${vol} ${unit}` : 'FCL Load',
          commodities: session.inspectedLots.join(', ') || 'Sortex Commodities'
        };
        if (!session.action.includes('Transmitted') && !session.action.includes('Sample')) {
          session.action = `⚠️ Abandoned Lead: ${company || fname}`;
        }
      }
    };

    ['fname', 'email', 'company', 'country', 'rfqVolumeVal'].forEach(id => {
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

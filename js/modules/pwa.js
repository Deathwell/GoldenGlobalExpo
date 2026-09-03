// Golden Global Expo — PWA Offline Resilience & Installation Controller
(function() {
  'use strict';

  // 1. Service Worker Registration
  if ('serviceWorker' in navigator && window.location && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js')
        .then(function(reg) {
          console.log('[GGE PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch(function(err) {
          console.warn('[GGE PWA] Service Worker registration failed:', err);
        });
    });
  }

  // 2. Offline Mode Banner & Notifications
  function renderOfflineBanner() {
    var banner = document.getElementById('ggeOfflineBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'ggeOfflineBanner';
      banner.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:rgba(11,19,32,0.96);border:1px solid #D4AF37;box-shadow:0 10px 30px rgba(0,0,0,0.6);border-radius:30px;padding:8px 18px;display:none;align-items:center;gap:10px;color:#F5EFE0;font-size:0.8rem;font-family:inherit;backdrop-filter:blur(10px);transition:all 0.3s cubic-bezier(0.16,1,0.3,1);';
      banner.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#D4AF37;display:inline-block;box-shadow:0 0 8px #D4AF37;"></span><span style="font-weight:600;">OFFLINE MODE</span><span style="color:#A0AEC0;">| Instant Cache &amp; Vault Active</span>';
      document.body.appendChild(banner);
    }
    return banner;
  }

  function updateNetworkStatus() {
    var banner = renderOfflineBanner();
    if (!navigator.onLine) {
      banner.style.display = 'inline-flex';
      banner.style.transform = 'translateY(0)';
      banner.style.opacity = '1';
      if (typeof showToast === 'function') {
        showToast('⚡ Offline Mode Active: Viewing cached trade catalog & specs.', 'info');
      }
    } else {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(10px)';
      setTimeout(function() { banner.style.display = 'none'; }, 300);
      syncOfflineVault();
    }
  }

  window.addEventListener('offline', updateNetworkStatus);
  window.addEventListener('online', function() {
    if (typeof showToast === 'function') {
      showToast('🟢 Connection Restored: Live Telemetry & Dispatch Online', 'success');
    }
    updateNetworkStatus();
  });

  // 3. Offline RFQ Vault
  function queueOfflineInquiry(inquiryData) {
    try {
      var queue = JSON.parse(localStorage.getItem('gge_offline_rfq_vault') || '[]');
      queue.push({
        data: inquiryData,
        queuedAt: new Date().toISOString()
      });
      localStorage.setItem('gge_offline_rfq_vault', JSON.stringify(queue));
      return true;
    } catch(e) {
      return false;
    }
  }

  function syncOfflineVault() {
    try {
      var raw = localStorage.getItem('gge_offline_rfq_vault');
      if (!raw) return;
      var queue = JSON.parse(raw);
      if (!queue || !queue.length) return;

      console.log('[GGE PWA] Syncing ' + queue.length + ' queued inquiries from Offline Vault...');
      var itemsToSync = queue.map(function(q) { return q.data; });
      
      fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsToSync)
      }).then(function(res) {
        if (res.ok) {
          localStorage.removeItem('gge_offline_rfq_vault');
          if (typeof showToast === 'function') {
            showToast('🚀 Dispatched ' + queue.length + ' inquiry(s) from Offline Vault to Executive Desk!', 'success');
          }
        }
      }).catch(function(err) {
        console.warn('[GGE PWA] Offline sync delayed:', err);
      });
    } catch(err) {
      console.warn('[GGE PWA] Offline sync error:', err);
    }
  }

  // 4. Install App Trigger
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    var installBtns = [document.getElementById('btnPwaInstall'), document.getElementById('btnPwaInstallMobile')].filter(Boolean);
    installBtns.forEach(function(installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.addEventListener('click', function() {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(function(choiceResult) {
            if (choiceResult.outcome === 'accepted') {
              console.log('[GGE PWA] User installed the app.');
            }
            deferredPrompt = null;
            installBtns.forEach(function(b) { b.style.display = 'none'; });
          });
        }
      });
    });
  });

  window.GGE_PWA = {
    queueOfflineInquiry: queueOfflineInquiry,
    syncOfflineVault: syncOfflineVault
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNetworkStatus);
  } else {
    updateNetworkStatus();
  }
})();

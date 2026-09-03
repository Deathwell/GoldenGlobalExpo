/**
 * Golden Global Expo — Unified Toast Notification System
 */

function showToast(msg, duration = 3200) {
  let toastEl = document.getElementById('toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = msg;
  toastEl.classList.add('show');

  if (toastEl._hideTimeout) {
    clearTimeout(toastEl._hideTimeout);
  }

  toastEl._hideTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

window.showToast = showToast;

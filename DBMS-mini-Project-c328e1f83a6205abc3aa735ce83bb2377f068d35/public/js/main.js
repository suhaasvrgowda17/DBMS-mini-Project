/**
 * TravelMate Core Client Javascript
 * Handles Theme Management, Global Validations, and Utility formatters
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Theme Management ---
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const currentTheme = localStorage.getItem('theme') || 'light';

  // Apply saved theme on boot
  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeIcon('dark');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      let activeTheme = document.documentElement.getAttribute('data-theme');
      if (activeTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        updateThemeIcon('light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon('dark');
      }
    });
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun text-warning fs-5';
    } else {
      icon.className = 'fa-solid fa-moon text-dark fs-5';
    }
  }

  // --- Bootstrap Form Validation Trigger ---
  const forms = document.querySelectorAll('.needs-validation');
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });
});

// --- Dynamic Notification Utility ---
window.showNotification = (message, type = 'success') => {
  // Find or create notification container
  let container = document.getElementById('toastNotificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastNotificationContainer';
    container.style.position = 'fixed';
    container.style.top = '24px';
    container.style.right = '24px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }

  const toastId = 'toast-' + Date.now();
  const icon = type === 'success' ? 'fa-solid fa-circle-check text-success' : 'fa-solid fa-circle-exclamation text-danger';
  const heading = type === 'success' ? 'Success Action' : 'System Error';

  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center show border-0 shadow-lg card-glass animate__animated animate__fadeInRight animate__faster" role="alert" aria-live="assertive" aria-atomic="true" style="min-width: 280px; max-width: 380px;">
      <div class="toast-header border-bottom-0 bg-transparent py-2">
        <i class="${icon} me-2 fs-6"></i>
        <strong class="me-auto text-dark fw-bold fs-7">${heading}</strong>
        <button type="button" class="btn-close shadow-none" onclick="document.getElementById('${toastId}').remove()" aria-label="Close"></button>
      </div>
      <div class="toast-body pt-0 pb-3 px-3 fs-7 text-secondary">
        ${message}
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);

  // Automatically fade out after 4 seconds
  setTimeout(() => {
    const el = document.getElementById(toastId);
    if (el) {
      el.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
      setTimeout(() => el.remove(), 400);
    }
  }, 4000);
};

// --- Custom Confirmation Modal Utility ---
window.customConfirm = (message, callback) => {
  // Remove existing modal if any
  const existingModal = document.getElementById('customConfirmModal');
  if (existingModal) existingModal.remove();

  const modalHtml = `
    <div class="modal fade" id="customConfirmModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg rounded-4">
          <div class="modal-header border-0 pb-0">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center pt-0 px-5 pb-4">
            <div class="text-danger mb-3">
              <i class="fa-solid fa-triangle-exclamation" style="font-size: 4rem;"></i>
            </div>
            <h4 class="fw-bold text-dark font-outfit mb-3">Are you sure?</h4>
            <p class="text-muted fs-6 mb-4">${message}</p>
            <div class="d-flex justify-content-center gap-3">
              <button type="button" class="btn btn-light border text-dark rounded-pill px-4 fw-semibold shadow-sm" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger rounded-pill px-4 fw-semibold shadow-sm" id="confirmDeleteBtn">Yes, delete it!</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modalEl = document.getElementById('customConfirmModal');
  const modal = new bootstrap.Modal(modalEl);
  
  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    modal.hide();
    callback();
  });
  
  modal.show();
};

// --- Custom Helpers ---
window.formatCurrency = (value) => {
  return '₹' + parseFloat(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

window.formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

/**
 * TravelMate Customer Workspace Operations
 * Coordinates package browsing, self-booking, billing checkouts, and booking cancellations
 */

document.addEventListener('DOMContentLoaded', () => {
  // Load packages first
  loadCustomerPackages();
  
  // Setup forms handlers
  setupCustomerFormHandlers();
  
  // Real-time cost estimator event
  const travelersInput = document.getElementById('bookModalTravelers');
  if (travelersInput) {
    travelersInput.addEventListener('input', updateEstimatedTotalCost);
  }

  // Promo code verification event
  const applyPromoBtn = document.getElementById('applyPromoBtn');
  if (applyPromoBtn) {
    applyPromoBtn.addEventListener('click', applyPromoDiscountAction);
  }

  // Live search key event
  const searchInput = document.getElementById('custPackageSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      loadCustomerPackages(e.target.value.trim());
    });
  }
});

// Panel Tab Swapper
window.switchTab = (tabName) => {
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.id === `v-${tabName}-tab`) {
      link.classList.add('active');
    }
  });

  const panels = document.querySelectorAll('.dashboard-tab-panel');
  panels.forEach(panel => panel.classList.add('d-none'));

  const activePanel = document.getElementById(`${tabName}-panel`);
  if (activePanel) {
    activePanel.classList.remove('d-none');
  }

  if (tabName === 'packages') loadCustomerPackages();
  if (tabName === 'bookings') loadCustomerBookingHistory();
  if (tabName === 'profile') loadCustomerProfile();
};

// --- CUSTOMER PACKAGES BROWSER ---
window.loadCustomerPackages = async (query = '') => {
  try {
    const grid = document.getElementById('custPackagesCardGrid');
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-2">Loading active tour programs...</p>
      </div>
    `;

    const response = await fetch(`/api/customer/packages?search=${encodeURIComponent(query)}`);
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      grid.innerHTML = '';
      result.data.forEach(pack => {
        grid.insertAdjacentHTML('beforeend', `
          <div class="col-md-6 col-lg-4 animate__animated animate__fadeInUp animate__faster">
            <div class="card card-package h-100 border-0 shadow-sm overflow-hidden position-relative">
              <div class="package-img-wrapper" style="height: 180px; overflow: hidden; position: relative;">
                <img src="${pack.image_url}" class="card-img-top h-100 w-100 object-fit-cover transition-all" alt="${pack.name}">
                <span class="badge bg-primary position-absolute top-3 end-3 px-3 py-2 fs-7 fw-semibold shadow-sm">${pack.duration}</span>
              </div>
              <div class="card-body p-4 d-flex flex-column">
                <div class="d-flex align-items-center gap-1 text-primary fs-7 mb-2 fw-semibold">
                  <i class="fa-solid fa-location-dot"></i>
                  <span>${pack.destination}</span>
                </div>
                <h5 class="card-title fw-bold text-dark font-outfit mb-2">${pack.name}</h5>
                <p class="card-text text-muted fs-7 mb-4 flex-grow-1">${pack.description}</p>
                <div class="d-flex align-items-center justify-content-between pt-3 border-top mt-auto">
                  <div>
                    <small class="text-muted fs-8 text-uppercase d-block mb-n1">Per Passenger</small>
                    <span class="fs-5 fw-extrabold text-primary font-outfit">${formatCurrency(pack.price)}</span>
                  </div>
                  <button class="btn btn-primary rounded-pill px-4 fw-semibold fs-7" onclick="openConfirmBookingModal(${JSON.stringify(pack).replace(/"/g, '&quot;')})">Book Now</button>
                </div>
              </div>
            </div>
          </div>
        `);
      });
    } else {
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <h5 class="fw-bold text-dark">No Tour Programs Available</h5>
          <p class="text-muted">Try typing another travel destination search query.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('AJAX Customer Load Packages Error:', error);
  }
};

window.openConfirmBookingModal = (pack) => {
  document.getElementById('bookModalPackageId').value = pack.id;
  document.getElementById('bookModalPackageName').innerText = pack.name;
  document.getElementById('bookModalDestination').innerText = pack.destination;
  document.getElementById('bookModalDuration').innerText = pack.duration;
  document.getElementById('bookModalRate').innerText = formatCurrency(pack.price);
  
  // Reset promo code fields
  const promoInput = document.getElementById('bookModalPromoCode');
  if (promoInput) promoInput.value = '';
  
  const promoFeedback = document.getElementById('promoFeedback');
  if (promoFeedback) {
    promoFeedback.className = 'fs-8 mt-1 d-none';
    promoFeedback.innerText = '';
  }
  
  const originalPriceLabel = document.getElementById('originalPriceLabel');
  if (originalPriceLabel) {
    originalPriceLabel.classList.add('d-none');
    originalPriceLabel.innerText = '';
  }
  
  const modalElem = document.getElementById('confirmBookingModal');
  modalElem.dataset.rate = pack.price;
  modalElem.dataset.discountPercent = '0';
  
  document.getElementById('bookModalTravelers').value = 1;
  updateEstimatedTotalCost();

  const modal = new bootstrap.Modal(modalElem);
  modal.show();
};

function updateEstimatedTotalCost() {
  const modal = document.getElementById('confirmBookingModal');
  const rate = parseFloat(modal.dataset.rate || 0);
  const count = parseInt(document.getElementById('bookModalTravelers').value || 1);
  const discountPercent = parseFloat(modal.dataset.discountPercent || 0);
  
  const originalTotal = rate * count;
  let finalTotal = originalTotal;
  
  if (discountPercent > 0) {
    finalTotal = originalTotal - (originalTotal * discountPercent) / 100;
    
    const originalPriceLabel = document.getElementById('originalPriceLabel');
    if (originalPriceLabel) {
      originalPriceLabel.classList.remove('d-none');
      originalPriceLabel.innerText = formatCurrency(originalTotal);
    }
  } else {
    const originalPriceLabel = document.getElementById('originalPriceLabel');
    if (originalPriceLabel) {
      originalPriceLabel.classList.add('d-none');
    }
  }
  
  document.getElementById('bookModalTotalCost').innerText = formatCurrency(finalTotal);
}

async function applyPromoDiscountAction() {
  const promoInput = document.getElementById('bookModalPromoCode');
  const promoFeedback = document.getElementById('promoFeedback');
  const modal = document.getElementById('confirmBookingModal');
  
  if (!promoInput || !promoFeedback || !modal) return;
  
  const code = promoInput.value.trim();
  if (!code) {
    promoFeedback.className = 'fs-8 mt-1 text-danger fw-semibold';
    promoFeedback.innerText = 'Please enter a promo code first.';
    promoFeedback.classList.remove('d-none');
    return;
  }
  
  try {
    const response = await fetch(`/api/customer/promo/validate?code=${encodeURIComponent(code)}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      promoFeedback.className = 'fs-8 mt-1 text-success fw-semibold';
      promoFeedback.innerText = result.message;
      promoFeedback.classList.remove('d-none');
      
      modal.dataset.discountPercent = result.data.discount_percent;
      updateEstimatedTotalCost();
    } else {
      promoFeedback.className = 'fs-8 mt-1 text-danger fw-semibold';
      promoFeedback.innerText = result.message || 'Invalid promo code.';
      promoFeedback.classList.remove('d-none');
      
      modal.dataset.discountPercent = '0';
      updateEstimatedTotalCost();
    }
  } catch (error) {
    console.error('AJAX Promo Validate Error:', error);
    promoFeedback.className = 'fs-8 mt-1 text-danger fw-semibold';
    promoFeedback.innerText = 'Unable to verify coupon code.';
    promoFeedback.classList.remove('d-none');
  }
}

// --- BOOKING HISTORY OPERATIONS ---
window.loadCustomerBookingHistory = async () => {
  try {
    const tableBody = document.getElementById('custBookingsTableBody');
    tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Retrieving reservations...</td></tr>`;

    const response = await fetch('/api/customer/bookings');
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      tableBody.innerHTML = '';
      result.data.forEach(b => {
        const badgeClass = `badge-status badge-${b.status}`;
        const paymentBadge = b.payment_status === 'completed' ? 'badge-confirmed' : 'badge-pending';
        
        let billingActions = '';
        if (b.status === 'pending' && b.payment_status === 'pending') {
          // Unpaid pending booking
          billingActions = `
            <button class="btn btn-primary btn-sm rounded-pill px-3 fw-semibold fs-8" onclick="openSimulatedCheckout(${b.id}, '${b.package_name}', ${b.total_price})"><i class="fa-solid fa-credit-card me-1"></i> Pay Now</button>
            <button class="btn btn-light-danger btn-sm border-0 rounded-circle" onclick="cancelCustomerBooking(${b.id})" title="Cancel Booking"><i class="fa-solid fa-trash"></i></button>
          `;
        } else {
          // Paid or confirmed booking -> display invoice details printable view
          billingActions = `
            <a href="/invoice/${b.id}" class="btn btn-light btn-sm border px-3 rounded-pill fw-semibold text-primary fs-8" title="Download Printable Bill"><i class="fa-solid fa-file-invoice me-1"></i> Receipt</a>
            ${b.status !== 'cancelled' ? `<button class="btn btn-light-danger btn-sm border-0 rounded-circle ms-2" onclick="cancelCustomerBooking(${b.id})" title="Cancel Booking"><i class="fa-solid fa-ban"></i></button>` : ''}
          `;
        }

        tableBody.insertAdjacentHTML('beforeend', `
          <tr class="animate__animated animate__fadeInUp animate__faster">
            <td><code>${b.booking_reference || '#BKG-' + b.id}</code></td>
            <td><span class="fw-bold text-dark">${b.package_name}</span></td>
            <td><span class="text-primary fw-semibold fs-7"><i class="fa-solid fa-location-dot me-1"></i> ${b.package_destination}</span></td>
            <td><span class="text-dark fs-7">${formatDate(b.travel_date)}</span></td>
            <td><span class="badge bg-light text-dark border px-2 rounded-circle">${b.number_of_travelers}</span></td>
            <td><span class="fw-extrabold text-primary">${formatCurrency(b.total_price)}</span></td>
            <td><span class="${badgeClass}">${b.status}</span></td>
            <td><span class="badge-status ${paymentBadge} fs-9 py-1 px-2">${b.payment_status || 'pending'}</span></td>
            <td class="text-end">
              <div class="d-flex justify-content-end align-items-center">
                ${billingActions}
              </div>
            </td>
          </tr>
        `);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">You have placed no travel bookings yet. Explore destinations!</td></tr>`;
    }
  } catch (error) {
    console.error('AJAX Customer Bookings Load Error:', error);
  }
};

window.openSimulatedCheckout = (bookingId, name, cost) => {
  document.getElementById('checkoutBookingId').value = bookingId;
  document.getElementById('checkoutBookingName').innerText = name;
  document.getElementById('checkoutBookingCost').innerText = formatCurrency(cost);

  const modal = new bootstrap.Modal(document.getElementById('paymentCheckoutModal'));
  modal.show();
};

window.cancelCustomerBooking = async (id) => {
  if (!confirm('Are you sure you want to cancel this booking? This updates booking to "cancelled" and triggers refunded/failed flags on payments.')) return;
  try {
    const response = await fetch(`/api/customer/bookings/${id}/cancel`, { method: 'PUT' });
    const result = await response.json();
    if (result.success) {
      showNotification(result.message);
      loadCustomerBookingHistory();
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Cancel Customer Booking Error:', error);
    showNotification('Unable to cancel booking transaction.', 'error');
  }
};

// --- CUSTOMER PROFILE OPERATIONS ---
window.loadCustomerProfile = async () => {
  try {
    const response = await fetch('/api/auth/profile');
    const result = await response.json();
    if (result.success && result.data) {
      const p = result.data;
      document.getElementById('profName').value = p.name || '';
      document.getElementById('profEmail').value = p.email || '';
      document.getElementById('profPhone').value = p.phone || '';
      document.getElementById('profPassport').value = p.passport_number || '';
      document.getElementById('profAddress').value = p.address || '';
      document.getElementById('sideCardName').innerText = p.name || '';
      
      const sidebarName = document.querySelector('.sidebar-profile h6');
      if (sidebarName) sidebarName.innerText = p.name;
    }
  } catch (error) {
    console.error('AJAX Load Profile Error:', error);
  }
};

// --- CUSTOMER FORM SUBMISSIONS ---
function setupCustomerFormHandlers() {
  // 1. Customer Place Booking Request
  const formBook = document.getElementById('confirmBookingForm');
  if (formBook) {
    formBook.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!formBook.checkValidity()) {
        formBook.classList.add('was-validated');
        return;
      }
      const data = Object.fromEntries(new FormData(formBook).entries());
      try {
        const response = await fetch('/api/customer/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          formBook.reset();
          formBook.classList.remove('was-validated');
          bootstrap.Modal.getInstance(document.getElementById('confirmBookingModal')).hide();
          
          // Switch to booking history tab to complete checkout payment!
          switchTab('bookings');
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Booking placement request failed.', 'error');
      }
    });
  }

  // 2. Customer Simulated Payment Submission
  const formPay = document.getElementById('paymentForm');
  if (formPay) {
    formPay.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(formPay).entries());
      try {
        const response = await fetch('/api/customer/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          bootstrap.Modal.getInstance(document.getElementById('paymentCheckoutModal')).hide();
          loadCustomerBookingHistory();
          
          // Automatically open invoice print screen in new window!
          window.open(result.invoiceUrl, '_blank');
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Simulated bank transaction failed.', 'error');
      }
    });
  }

  // 3. Customer Profile Update Settings Submission
  const formProfile = document.getElementById('profileUpdateForm');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const profileEditActions = document.getElementById('profileEditActions');

  if (editProfileBtn && cancelEditBtn && profileEditActions && formProfile) {
    const inputs = formProfile.querySelectorAll('input:not([type="password"]), textarea');
    
    editProfileBtn.addEventListener('click', () => {
      inputs.forEach(i => i.removeAttribute('disabled'));
      profileEditActions.classList.remove('d-none');
      editProfileBtn.classList.add('d-none');
    });

    cancelEditBtn.addEventListener('click', () => {
      inputs.forEach(i => i.setAttribute('disabled', 'true'));
      profileEditActions.classList.add('d-none');
      editProfileBtn.classList.remove('d-none');
      loadCustomerProfile(); // Reset to current database state
    });
  }

  if (formProfile) {
    formProfile.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!formProfile.checkValidity()) {
        formProfile.classList.add('was-validated');
        return;
      }
      const data = Object.fromEntries(new FormData(formProfile).entries());
      try {
        const response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          
          // Clear security password fields
          document.getElementById('profCurrentPassword').value = '';
          document.getElementById('profNewPassword').value = '';
          formProfile.classList.remove('was-validated');
          
          if (cancelEditBtn) cancelEditBtn.click(); // revert to readonly state
          
          // Refresh profile details in card
          loadCustomerProfile();

          // Live update top-bar display name
          const topBarName = document.querySelector('.navbar .dropdown-toggle span');
          if (topBarName) topBarName.innerText = data.name;
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        console.error('Submit Profile Form Error:', error);
        showNotification('Failed to save profile modifications.', 'error');
      }
    });
  }
}

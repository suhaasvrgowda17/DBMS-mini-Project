/**
 * TravelMate Agent Workspace Operations
 * Coordinates assigned customer profiles and bookings management
 */

document.addEventListener('DOMContentLoaded', () => {
  // Load initial view
  loadAgentCustomers();
  
  // Setup forms submissions
  setupAgentFormHandlers();
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

  if (tabName === 'customers') loadAgentCustomers();
  if (tabName === 'bookings') loadAgentBookings();
  if (tabName === 'profile') loadAgentProfile();
};

// --- CLIENT PROFILE OPERATIONS ---
window.loadAgentCustomers = async () => {
  try {
    const tableBody = document.getElementById('agentCustomersTableBody');
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Loading assigned clients...</td></tr>`;

    const response = await fetch('/api/agent/customers');
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      tableBody.innerHTML = '';
      result.data.forEach(c => {
        tableBody.insertAdjacentHTML('beforeend', `
          <tr class="animate__animated animate__fadeInUp animate__faster">
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="avatar bg-light-primary text-primary rounded-circle d-flex align-items-center justify-content-center border" style="width: 32px; height: 32px; font-size: 0.8rem;">
                  <i class="fa-solid fa-user"></i>
                </div>
                <span class="fw-bold text-dark">${c.name}</span>
              </div>
            </td>
            <td><code>${c.username}</code></td>
            <td><span class="text-muted fs-7">${c.email}</span></td>
            <td><span class="text-secondary">${c.phone}</span></td>
            <td><span class="fw-semibold text-dark">${c.passport_number || 'N/A'}</span></td>
            <td><span class="text-muted fs-7">${formatDate(c.created_at)}</span></td>
            <td class="text-end">
              <div class="d-flex justify-content-end gap-1">
                <button class="btn btn-light-primary btn-sm border-0 rounded-circle" onclick="openAgentEditCustomerModal(${JSON.stringify(c).replace(/"/g, '&quot;')})" title="Edit Details"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-light-danger btn-sm border-0 rounded-circle" onclick="deleteAgentCustomer(${c.id})" title="Delete Client Profile"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">You have no assigned customer passengers. Register one!</td></tr>`;
    }
  } catch (error) {
    console.error('Agent Load Customers Error:', error);
  }
};

window.openAgentEditCustomerModal = (c) => {
  document.getElementById('editCustomerId').value = c.id;
  document.getElementById('editCustomerName').value = c.name;
  document.getElementById('editCustomerPhone').value = c.phone;
  document.getElementById('editCustomerPassport').value = c.passport_number || '';
  document.getElementById('editCustomerAddress').value = c.address || '';

  const modal = new bootstrap.Modal(document.getElementById('agentEditCustomerModal'));
  modal.show();
};

window.deleteAgentCustomer = (id) => {
  customConfirm('Are you sure you want to permanently delete this customer? This action drops their credentials alongside all transactional bookings Cascade.', async () => {
    try {
      const response = await fetch(`/api/agent/customers/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        showNotification('deleted customer');
        loadAgentCustomers();
      } else {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      console.error('Delete Assigned Customer Error:', error);
      showNotification('Unable to drop client passenger details.', 'error');
    }
  });
};

// --- BOOKINGS OPERATIONS ---
window.loadAgentBookings = async () => {
  try {
    const tableBody = document.getElementById('agentBookingsTableBody');
    tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Loading booking list...</td></tr>`;

    const response = await fetch('/api/agent/bookings');
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      tableBody.innerHTML = '';
      result.data.forEach(b => {
        const badgeClass = `badge-status badge-${b.status}`;
        const paymentBadge = b.payment_status === 'completed' ? 'badge-confirmed' : 'badge-pending';
        
        let actionButtons = '';
        let statusBadge = `<span class="${badgeClass}">${b.status}</span>`;
        
        if (b.agent_assignment_status === 'assigned_pending') {
          statusBadge = `<span class="badge bg-light-warning text-warning border border-warning-subtle px-2 py-1 rounded-pill fw-semibold">Pending Accept</span>`;
          actionButtons = `
            <button class="btn btn-success btn-sm px-2 rounded-pill fs-8 fw-semibold shadow-sm" onclick="respondToAssignment(${b.id}, 'accept')" title="Accept Assignment">
              <i class="fa-solid fa-check me-1"></i> Accept Request
            </button>
            <button class="btn btn-danger btn-sm px-2 rounded-pill fs-8 fw-semibold shadow-sm" onclick="respondToAssignment(${b.id}, 'reject')" title="Reject Assignment">
              <i class="fa-solid fa-xmark me-1"></i> Reject
            </button>
          `;
        } else {
          // Normal booking operations (if accepted or direct agent booked)
          if (b.status === 'pending') {
            actionButtons = `
              <button class="btn btn-light-success btn-sm border-0 rounded-circle" onclick="updateAgentBookingStatus(${b.id}, 'confirmed')" title="Confirm Booking"><i class="fa-solid fa-circle-check"></i></button>
              <button class="btn btn-light-danger btn-sm border-0 rounded-circle" onclick="updateAgentBookingStatus(${b.id}, 'cancelled')" title="Cancel Booking"><i class="fa-solid fa-circle-xmark"></i></button>
            `;
          }
        }
        
        tableBody.insertAdjacentHTML('beforeend', `
          <tr class="animate__animated animate__fadeInUp animate__faster">
            <td><code>${b.booking_reference || '#BKG-' + b.id}</code></td>
            <td><span class="fw-bold text-dark">${b.customer_name}</span></td>
            <td><span class="text-secondary fs-7 fw-semibold">${b.package_name}</span></td>
            <td><span class="text-dark fs-7">${formatDate(b.travel_date)}</span></td>
            <td><span class="badge bg-light text-dark border px-2 rounded-circle">${b.number_of_travelers}</span></td>
            <td><span class="fw-bold text-primary">${formatCurrency(b.total_price)}</span></td>
            <td>${statusBadge}</td>
            <td><span class="badge-status ${paymentBadge} fs-9 py-1 px-2">${b.payment_status || 'pending'}</span></td>
            <td class="text-end">
              <div class="d-flex justify-content-end gap-2 align-items-center">
                ${actionButtons}
                <a href="/invoice/${b.id}" class="btn btn-light btn-sm border-0 rounded-circle text-primary" title="Print invoice receipt"><i class="fa-solid fa-file-invoice"></i></a>
              </div>
            </td>
          </tr>
        `);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No client bookings recorded under your name.</td></tr>`;
    }
  } catch (error) {
    console.error('Agent Load Bookings Error:', error);
  }
};

window.openCreateBookingModal = async () => {
  try {
    const customerDropdown = document.getElementById('bookingCustomerDropdown');
    const packageDropdown = document.getElementById('bookingPackageDropdown');

    customerDropdown.innerHTML = '<option value="">Loading passengers...</option>';
    packageDropdown.innerHTML = '<option value="">Loading package options...</option>';

    // Fetch assigned Customers
    const custRes = await fetch('/api/agent/customers');
    const custData = await custRes.json();

    // Fetch Packages
    const packRes = await fetch('/api/packages');
    const packData = await packRes.json();

    if (custData.success && custData.data.length > 0) {
      customerDropdown.innerHTML = '<option value="">-- Choose Assigned Client --</option>';
      custData.data.forEach(c => {
        customerDropdown.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name} (${c.username})</option>`);
      });
    } else {
      customerDropdown.innerHTML = '<option value="">Register a passenger first</option>';
    }

    if (packData.success && packData.data.length > 0) {
      packageDropdown.innerHTML = '<option value="">-- Choose Tour Package --</option>';
      packData.data.forEach(p => {
        packageDropdown.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name} ($${parseFloat(p.price).toLocaleString()})</option>`);
      });
    } else {
      packageDropdown.innerHTML = '<option value="">No packages available</option>';
    }

    const modal = new bootstrap.Modal(document.getElementById('agentCreateBookingModal'));
    modal.show();
  } catch (error) {
    console.error('Error preparing booking modal:', error);
    showNotification('Unable to compile passenger or package options.', 'error');
  }
};

window.updateAgentBookingStatus = async (id, status) => {
  const confirmationMsg = status === 'confirmed' ? 'Are you sure you want to CONFIRM this booking and marks payment as completed?' : 'Are you sure you want to CANCEL this booking?';
  if (!confirm(confirmationMsg)) return;

  try {
    const response = await fetch(`/api/agent/bookings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const result = await response.json();
    if (result.success) {
      showNotification(result.message);
      loadAgentBookings();
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Agent Update Booking Status Error:', error);
    showNotification('Transaction status change failed.', 'error');
  }
};

// --- AGENT PROFILE OPERATIONS ---
window.loadAgentProfile = async () => {
  try {
    const response = await fetch('/api/auth/profile');
    const result = await response.json();
    if (result.success && result.data) {
      const p = result.data;
      document.getElementById('profName').value = p.name || '';
      document.getElementById('profEmail').value = p.email || '';
      document.getElementById('profPhone').value = p.phone || '';
      document.getElementById('profCommission').value = p.commission_rate ? `${p.commission_rate}%` : '10.00%';
      document.getElementById('sideCardName').innerText = p.name || '';
      
      const sidebarName = document.querySelector('.sidebar-profile h6');
      if (sidebarName) sidebarName.innerText = p.name;
    }
  } catch (error) {
    console.error('AJAX Load Agent Profile Error:', error);
  }
};

// --- AGENT FORM SUBMISSIONS ---
function setupAgentFormHandlers() {
  // 1. Agent Add Customer
  const formAdd = document.getElementById('agentAddCustomerForm');
  if (formAdd) {
    formAdd.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!formAdd.checkValidity()) {
        formAdd.classList.add('was-validated');
        return;
      }
      const data = Object.fromEntries(new FormData(formAdd).entries());
      try {
        const response = await fetch('/api/agent/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          formAdd.reset();
          formAdd.classList.remove('was-validated');
          bootstrap.Modal.getInstance(document.getElementById('agentAddCustomerModal')).hide();
          loadAgentCustomers();
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Passenger registration failed.', 'error');
      }
    });
  }

  // 2. Agent Edit Customer Profile
  const formEdit = document.getElementById('agentEditCustomerForm');
  if (formEdit) {
    formEdit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editCustomerId').value;
      const data = Object.fromEntries(new FormData(formEdit).entries());
      try {
        const response = await fetch(`/api/agent/customers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          bootstrap.Modal.getInstance(document.getElementById('agentEditCustomerModal')).hide();
          loadAgentCustomers();
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Unable to modify client profile.', 'error');
      }
    });
  }

  // 3. Agent Create Booking
  const formBook = document.getElementById('agentCreateBookingForm');
  if (formBook) {
    formBook.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!formBook.checkValidity()) {
        formBook.classList.add('was-validated');
        return;
      }
      const data = Object.fromEntries(new FormData(formBook).entries());
      try {
        const response = await fetch('/api/agent/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          formBook.reset();
          formBook.classList.remove('was-validated');
          bootstrap.Modal.getInstance(document.getElementById('agentCreateBookingModal')).hide();
          loadAgentBookings();
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Itinerary creation transaction failed.', 'error');
      }
    });
  }

  // 4. Agent Profile updates
  const formProfile = document.getElementById('profileUpdateForm');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const profileEditActions = document.getElementById('profileEditActions');

  if (editProfileBtn && cancelEditBtn && profileEditActions && formProfile) {
    const inputs = formProfile.querySelectorAll('input:not([type="password"]):not([readonly]), textarea');
    
    editProfileBtn.addEventListener('click', () => {
      inputs.forEach(i => i.removeAttribute('disabled'));
      profileEditActions.classList.remove('d-none');
      editProfileBtn.classList.add('d-none');
    });

    cancelEditBtn.addEventListener('click', () => {
      inputs.forEach(i => i.setAttribute('disabled', 'true'));
      profileEditActions.classList.add('d-none');
      editProfileBtn.classList.remove('d-none');
      loadAgentProfile(); // Reset to current database state
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
          document.getElementById('profCurrentPassword').value = '';
          document.getElementById('profNewPassword').value = '';
          formProfile.classList.remove('was-validated');
          
          if (cancelEditBtn) cancelEditBtn.click(); // revert to readonly state
          
          loadAgentProfile();

          const topBarName = document.querySelector('.navbar .dropdown-toggle span');
          if (topBarName) topBarName.innerText = data.name;
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        console.error('Submit Agent Profile Form Error:', error);
        showNotification('Failed to save profile modifications.', 'error');
      }
    });
  }
}

// Agent responds to assignment request
window.respondToAssignment = async (bookingId, action) => {
  const confirmationMsg = action === 'accept' ? 'Are you sure you want to ACCEPT this booking assignment?' : 'Are you sure you want to REJECT this booking assignment?';
  if (!confirm(confirmationMsg)) return;

  try {
    const response = await fetch(`/api/agent/bookings/${bookingId}/respond-assignment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const result = await response.json();
    if (result.success) {
      showNotification(result.message);
      loadAgentBookings();
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Agent Respond Assignment Error:', error);
    showNotification('Action failed.', 'error');
  }
};

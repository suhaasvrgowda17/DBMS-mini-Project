/**
 * TravelMate Admin Workspace Operations
 * Coordinates statistics, agents, passengers, packages, bookings, and payments CRUD via REST API
 */

document.addEventListener('DOMContentLoaded', () => {
  // Load initial view details
  loadDashboardStats();
  
  // Register forms submission handlers
  setupFormHandlers();
});

// Switch visible panel in the workspace
window.switchTab = (tabName) => {
  // Update sidebar active classes
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.id === `v-${tabName}-tab`) {
      link.classList.add('active');
    }
  });

  // Hide all panels
  const panels = document.querySelectorAll('.dashboard-tab-panel');
  panels.forEach(panel => panel.classList.add('d-none'));

  // Show selected panel
  const activePanel = document.getElementById(`${tabName}-panel`);
  if (activePanel) {
    activePanel.classList.remove('d-none');
  }

  // Load specific data on tab swap
  if (tabName === 'stats') loadDashboardStats();
  if (tabName === 'agents') loadAgents();
  if (tabName === 'customers') loadCustomers();
  if (tabName === 'packages') loadPackages();
  if (tabName === 'bookings') loadBookings();
  if (tabName === 'payments') loadPayments();
  if (tabName === 'profile') loadAdminProfile();
};

// --- DASHBOARD ANALYTICS ---
window.loadDashboardStats = async () => {
  try {
    const response = await fetch('/api/admin/stats');
    const result = await response.json();

    if (result.success) {
      // 1. Populate Metrics
      document.getElementById('stat-revenue').innerText = formatCurrency(result.stats.totalRevenue);
      document.getElementById('stat-bookings').innerText = result.stats.totalBookings;
      document.getElementById('stat-packages').innerText = result.stats.activePackages;
      document.getElementById('stat-agents').innerText = result.stats.totalAgents;

      // 2. Populate Recent Bookings Table
      const bookingsBody = document.getElementById('statsRecentBookings');
      if (result.recentBookings.length > 0) {
        bookingsBody.innerHTML = '';
        result.recentBookings.forEach(b => {
          const badgeClass = `badge-status badge-${b.status}`;
          bookingsBody.insertAdjacentHTML('beforeend', `
            <tr>
              <td><span class="fw-bold text-dark">${b.customer_name}</span></td>
              <td><span class="fs-7 text-secondary">${b.package_name}</span></td>
              <td><span class="fw-semibold text-primary">${formatCurrency(b.total_price)}</span></td>
              <td><span class="${badgeClass}">${b.status}</span></td>
            </tr>
          `);
        });
      } else {
        bookingsBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No bookings placed yet.</td></tr>`;
      }

      // 3. Populate Recent Payments Table
      const paymentsBody = document.getElementById('statsRecentPayments');
      if (result.recentPayments.length > 0) {
        paymentsBody.innerHTML = '';
        result.recentPayments.forEach(p => {
          const badgeClass = `badge-status badge-${p.status}`;
          paymentsBody.insertAdjacentHTML('beforeend', `
            <tr>
              <td><span class="fw-bold text-primary">${formatCurrency(p.amount)}</span></td>
              <td><span class="fs-8 text-secondary">${p.payment_method}</span></td>
              <td><span class="${badgeClass}">${p.status}</span></td>
            </tr>
          `);
        });
      } else {
        paymentsBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">No transactions recorded.</td></tr>`;
      }
    }
  } catch (error) {
    console.error('AJAX Load Stats Error:', error);
  }
};

// --- AGENT CRUD OPERATIONS ---
window.loadAgents = async () => {
  try {
    const tableBody = document.getElementById('agentsTableBody');
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Loading agents...</td></tr>`;

    const response = await fetch('/api/admin/agents');
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      tableBody.innerHTML = '';
      result.data.forEach(agent => {
        const badgeClass = agent.status === 'active' ? 'badge-report' : 'badge-report badge-report-inactive';
        tableBody.insertAdjacentHTML('beforeend', `
          <tr class="animate__animated animate__fadeInUp animate__faster">
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="avatar bg-light-primary text-primary rounded-circle d-flex align-items-center justify-content-center border" style="width: 32px; height: 32px; font-size: 0.8rem;">
                  <i class="fa-solid fa-user-tie"></i>
                </div>
                <span class="fw-bold text-dark">${agent.name}</span>
              </div>
            </td>
            <td><code>${agent.username}</code></td>
            <td><span class="text-muted fs-7">${agent.email}</span></td>
            <td><span class="text-secondary">${agent.phone}</span></td>
            <td><span class="fw-semibold text-primary">${agent.agency_commission}%</span></td>
            <td><span class="${badgeClass} text-capitalize">${agent.status}</span></td>
            <td class="text-end">
              <div class="d-flex justify-content-end">
                <button class="btn-report-action btn-report-edit" onclick="openEditAgentModal(${JSON.stringify(agent).replace(/"/g, '&quot;')})" title="Edit Details"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-report-action btn-report-delete" onclick="deleteAgent(${agent.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No agents registered.</td></tr>`;
    }
  } catch (error) {
    console.error('AJAX Load Agents Error:', error);
  }
};

window.openEditAgentModal = (agent) => {
  document.getElementById('editAgentId').value = agent.id;
  document.getElementById('editAgentName').value = agent.name;
  document.getElementById('editAgentPhone').value = agent.phone;
  document.getElementById('editAgentCommission').value = agent.agency_commission;
  document.getElementById('editAgentStatus').value = agent.status;

  const modal = new bootstrap.Modal(document.getElementById('editAgentModal'));
  modal.show();
};

window.deleteAgent = (id) => {
  customConfirm('Are you sure you want to permanently delete this agent? This cascades and removes all associated records.', async () => {
    try {
      const response = await fetch(`/api/admin/agents/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        showNotification('deleted agent');
        loadAgents();
      } else {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      console.error('Delete Agent Error:', error);
      showNotification('Unable to delete agent record.', 'error');
    }
  });
};

// --- CUSTOMER MANAGEMENT ---
window.loadCustomers = async () => {
  try {
    const tableBody = document.getElementById('customersTableBody');
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Loading customers...</td></tr>`;

    const response = await fetch('/api/admin/customers');
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      tableBody.innerHTML = '';
      result.data.forEach(c => {
        const agentName = c.assigned_agent_name ? `<span class="badge bg-light-primary text-primary px-2 rounded-pill border border-primary-subtle"><i class="fa-solid fa-user-tie me-1"></i> ${c.assigned_agent_name}</span>` : '<span class="text-muted fs-8 italic">Unassigned</span>';
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
            <td>${agentName}</td>
            <td class="text-end">
              <div class="d-flex justify-content-end">
                <button class="btn-report-action btn-report-edit" onclick="openEditCustomerModal(${JSON.stringify(c).replace(/"/g, '&quot;')})" title="Edit Details"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-report-action btn-report-delete" onclick="deleteCustomer(${c.id})" title="Delete Passenger"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No passengers registered.</td></tr>`;
    }
  } catch (error) {
    console.error('AJAX Load Customers Error:', error);
  }
};

window.openEditCustomerModal = (c) => {
  document.getElementById('editCustomerId').value = c.id;
  document.getElementById('editCustomerName').value = c.name;
  document.getElementById('editCustomerPhone').value = c.phone;
  document.getElementById('editCustomerPassport').value = c.passport_number || '';
  document.getElementById('editCustomerAddress').value = c.address || '';
  document.getElementById('editCustomerAgent').value = c.assigned_agent_id || '';

  const modal = new bootstrap.Modal(document.getElementById('editCustomerModal'));
  modal.show();
};

window.deleteCustomer = (id) => {
  customConfirm('Are you sure you want to permanently delete this customer passenger?', async () => {
    try {
      const response = await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        showNotification('deleted customer');
        loadCustomers();
      } else {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      console.error('Delete Customer Error:', error);
      showNotification('Unable to delete customer record.', 'error');
    }
  });
};

// --- PACKAGE MANAGEMENT ---
window.loadPackages = async () => {
  try {
    const tableBody = document.getElementById('packagesTableBody');
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Loading tour catalog...</td></tr>`;

    const response = await fetch('/api/packages');
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      tableBody.innerHTML = '';
      result.data.forEach(p => {
        tableBody.insertAdjacentHTML('beforeend', `
          <tr class="animate__animated animate__fadeInUp animate__faster">
            <td>
              <img src="${p.image_url}" class="rounded-3 object-fit-cover shadow-sm" style="width: 50px; height: 35px;" alt="destination">
            </td>
            <td><span class="fw-bold text-dark">${p.name}</span></td>
            <td><span class="text-primary fw-semibold"><i class="fa-solid fa-location-dot me-1"></i> ${p.destination}</span></td>
            <td><span class="fw-bold text-dark">${formatCurrency(p.price)}</span></td>
            <td><span class="badge bg-light text-dark border px-2 py-1 rounded-pill">${p.duration}</span></td>
            <td><span class="text-muted fs-8 text-truncate d-inline-block" style="max-width: 220px;">${p.description || 'No description provided.'}</span></td>
            <td class="text-end">
              <div class="d-flex justify-content-end">
                <button class="btn-report-action btn-report-edit" onclick="openEditPackageModal(${JSON.stringify(p).replace(/"/g, '&quot;')})" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-report-action btn-report-delete" onclick="deletePackage(${p.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No tour packages recorded.</td></tr>`;
    }
  } catch (error) {
    console.error('AJAX Load Packages Error:', error);
  }
};

window.openEditPackageModal = (p) => {
  document.getElementById('editPackageId').value = p.id;
  document.getElementById('editPackageName').value = p.name;
  document.getElementById('editPackageDestination').value = p.destination;
  document.getElementById('editPackageDuration').value = p.duration;
  document.getElementById('editPackagePrice').value = p.price;
  document.getElementById('editPackageImage').value = p.image_url;
  document.getElementById('editPackageDesc').value = p.description || '';

  const modal = new bootstrap.Modal(document.getElementById('editPackageModal'));
  modal.show();
};

window.deletePackage = async (id) => {
  if (!confirm('Are you sure you want to permanently delete this tour package?')) return;
  try {
    const response = await fetch(`/api/packages/${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      showNotification(result.message);
      loadPackages();
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Delete Package Error:', error);
    showNotification('Unable to delete tour package.', 'error');
  }
};

// --- MASTER BOOKINGS VIEW ---
window.loadBookings = async () => {
  try {
    const tableBody = document.getElementById('bookingsTableBody');
    tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Loading booking ledger...</td></tr>`;

    // Re-use statistics load which compiles full booking lists
    const response = await fetch('/api/admin/stats');
    const result = await response.json();

    if (result.success && result.recentBookings.length > 0) {
      const bookings = result.recentBookings; 
      tableBody.innerHTML = '';
      bookings.forEach(b => {
        const badgeClass = `badge-status badge-${b.status}`;
        const agentName = b.agent_name ? `<span class="fs-8 text-secondary"><i class="fa-solid fa-user-tie me-1"></i> ${b.agent_name}</span>` : '<span class="text-muted fs-8 italic">Direct Online</span>';
        
        tableBody.insertAdjacentHTML('beforeend', `
          <tr class="animate__animated animate__fadeInUp animate__faster">
            <td><code>${b.booking_reference || '#BKG-' + b.id}</code></td>
            <td><span class="fw-bold text-dark">${b.customer_name}</span></td>
            <td><span class="text-secondary fs-7 fw-semibold">${b.package_name}</span></td>
            <td>${agentName}</td>
            <td><span class="text-dark fs-7">${formatDate(b.travel_date)}</span></td>
            <td><span class="badge bg-light text-dark border px-2 rounded-circle">${b.number_of_travelers}</span></td>
            <td><span class="fw-bold text-primary">${formatCurrency(b.total_price)}</span></td>
            <td><span class="${badgeClass}">${b.status}</span></td>
            <td class="text-end">
              <div class="d-flex justify-content-end">
                <a href="/invoice/${b.id}" class="btn-report-action btn-report-edit" title="Print/View invoice" style="text-decoration:none;"><i class="fa-solid fa-file-invoice"></i></a>
                <button class="btn-report-action btn-report-delete" onclick="deleteBooking(${b.id})" title="Delete Booking"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No reservations recorded in database.</td></tr>`;
    }
  } catch (error) {
    console.error('AJAX Load Bookings Error:', error);
  }
};

window.deleteBooking = async (id) => {
  if (!confirm('Are you sure you want to permanently delete this booking reservation? This cascade drops active payment receipts from auditing.')) return;
  try {
    const response = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      showNotification(result.message);
      loadBookings();
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Delete Master Booking Error:', error);
    showNotification('Unable to delete booking.', 'error');
  }
};

// --- PAYMENTS LEDGER VIEW ---
window.loadPayments = async () => {
  try {
    const tableBody = document.getElementById('paymentsTableBody');
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Loading auditing logs...</td></tr>`;

    const response = await fetch('/api/admin/stats');
    const result = await response.json();

    if (result.success && result.recentPayments.length > 0) {
      const payments = result.recentPayments;
      tableBody.innerHTML = '';
      payments.forEach(p => {
        const badgeClass = `badge-status badge-${p.status}`;
        tableBody.insertAdjacentHTML('beforeend', `
          <tr class="animate__animated animate__fadeInUp animate__faster">
            <td><code>${p.transaction_id}</code></td>
            <td><span class="fw-bold text-dark">${p.customer_name}</span></td>
            <td><span class="text-secondary fs-7">${p.package_name}</span></td>
            <td><span class="fw-extrabold text-primary">${formatCurrency(p.amount)}</span></td>
            <td><span class="fs-8 text-secondary fw-semibold">${p.payment_method}</span></td>
            <td><span class="text-muted fs-7">${formatDate(p.payment_date)}</span></td>
            <td><span class="${badgeClass}">${p.status}</span></td>
            <td class="text-end">
              <a href="/invoice/${p.booking_id}" class="btn btn-light btn-sm border-0 rounded-circle text-primary" title="Print Invoice"><i class="fa-solid fa-print"></i></a>
            </td>
          </tr>
        `);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No payments logged in system.</td></tr>`;
    }
  } catch (error) {
    console.error('AJAX Load Payments Error:', error);
  }
};

// --- ADMIN PROFILE LOAD ---
window.loadAdminProfile = async () => {
  try {
    const response = await fetch('/api/auth/profile');
    const result = await response.json();
    if (result.success && result.data) {
      const p = result.data;
      document.getElementById('profName').value = p.name || '';
      document.getElementById('profEmail').value = p.email || '';
      document.getElementById('sideCardName').innerText = p.name || '';
      
      const sidebarName = document.querySelector('.sidebar-profile h6');
      if (sidebarName) sidebarName.innerText = p.name;
    }
  } catch (error) {
    console.error('AJAX Load Admin Profile Error:', error);
  }
};

// --- SETUP FORM HANDLERS (AJAX-Driven Forms) ---
function setupFormHandlers() {
  // 1. Add Agent Submission
  const addAgentForm = document.getElementById('addAgentForm');
  if (addAgentForm) {
    addAgentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!addAgentForm.checkValidity()) {
        addAgentForm.classList.add('was-validated');
        return;
      }
      const data = Object.fromEntries(new FormData(addAgentForm).entries());
      try {
        const response = await fetch('/api/admin/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          addAgentForm.reset();
          addAgentForm.classList.remove('was-validated');
          bootstrap.Modal.getInstance(document.getElementById('addAgentModal')).hide();
          loadAgents();
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Failed to register agent.', 'error');
      }
    });
  }

  // 2. Edit Agent Submission
  const editAgentForm = document.getElementById('editAgentForm');
  if (editAgentForm) {
    editAgentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editAgentId').value;
      const data = Object.fromEntries(new FormData(editAgentForm).entries());
      try {
        const response = await fetch(`/api/admin/agents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          bootstrap.Modal.getInstance(document.getElementById('editAgentModal')).hide();
          loadAgents();
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Failed to update agent profile.', 'error');
      }
    });
  }

  // 3. Add Customer Submission (Admin View)
  const addCustomerForm = document.getElementById('addCustomerForm');
  if (addCustomerForm) {
    addCustomerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!addCustomerForm.checkValidity()) {
        addCustomerForm.classList.add('was-validated');
        return;
      }
      const data = Object.fromEntries(new FormData(addCustomerForm).entries());
      try {
        const response = await fetch('/api/admin/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          addCustomerForm.reset();
          addCustomerForm.classList.remove('was-validated');
          bootstrap.Modal.getInstance(document.getElementById('addCustomerModal')).hide();
          loadCustomers();
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Failed to register customer.', 'error');
      }
    });
  }

  // 3b. Edit Customer Submission (Admin View)
  const editCustomerForm = document.getElementById('editCustomerForm');
  if (editCustomerForm) {
    editCustomerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editCustomerId').value;
      const data = Object.fromEntries(new FormData(editCustomerForm).entries());
      try {
        const response = await fetch(`/api/admin/customers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          bootstrap.Modal.getInstance(document.getElementById('editCustomerModal')).hide();
          loadCustomers();
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Failed to update passenger profile details.', 'error');
      }
    });
  }

  // 4. Add Package Submission
  const addPackageForm = document.getElementById('addPackageForm');
  if (addPackageForm) {
    addPackageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!addPackageForm.checkValidity()) {
        addPackageForm.classList.add('was-validated');
        return;
      }
      const data = Object.fromEntries(new FormData(addPackageForm).entries());
      try {
        const response = await fetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          addPackageForm.reset();
          addPackageForm.classList.remove('was-validated');
          bootstrap.Modal.getInstance(document.getElementById('addPackageModal')).hide();
          loadPackages();
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Failed to add package.', 'error');
      }
    });
  }

  // 5. Edit Package Submission
  const editPackageForm = document.getElementById('editPackageForm');
  if (editPackageForm) {
    editPackageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editPackageId').value;
      const data = Object.fromEntries(new FormData(editPackageForm).entries());
      try {
        const response = await fetch(`/api/packages/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          showNotification(result.message);
          bootstrap.Modal.getInstance(document.getElementById('editPackageModal')).hide();
          loadPackages();
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Failed to update package.', 'error');
      }
    });
  }

  // 6. Admin Profile Update Settings Submission
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
      loadAdminProfile(); // Reset to current database state
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
          
          loadAdminProfile();

          const topBarName = document.querySelector('.navbar .dropdown-toggle span');
          if (topBarName) topBarName.innerText = data.name;
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        console.error('Submit Admin Profile Form Error:', error);
        showNotification('Failed to save profile modifications.', 'error');
      }
    });
  }
}

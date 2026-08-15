/* ECDI Admin Dashboard Controller */

document.addEventListener("DOMContentLoaded", () => {
  if (!window.ECDIAuth.isAuthenticated()) {
    window.location.href = "/admin-login.html";
    return;
  }

  const token = window.ECDIAuth.getToken();
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => window.ECDIAuth.logout());
  }

  // Load Admin Stats Overview
  async function loadOverviewStats() {
    try {
      const res = await fetch("/api/admin/overview", { headers });
      if (!res.ok) {
        if (res.status === 401) return window.ECDIAuth.logout();
        throw new Error("Failed to load metrics");
      }
      const stats = await res.json();

      document.getElementById("stat-total").textContent = stats.totalApplications || 0;
      document.getElementById("stat-pending").textContent = stats.paymentPending || 0;
      document.getElementById("stat-proof").textContent = stats.paymentProofSubmitted || 0;
      document.getElementById("stat-review").textContent = stats.underReview || 0;
      document.getElementById("stat-approved").textContent = stats.approved || 0;
      document.getElementById("stat-rejected").textContent = stats.rejected || 0;
    } catch (err) {
      console.error(err);
    }
  }

  // Load Applications List
  let currentSearch = "";
  let currentCategory = "ALL";
  let currentLevel = "ALL";
  let currentStatus = "ALL";
  let currentSort = "newest";

  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("filter-category");
  const levelFilter = document.getElementById("filter-level");
  const statusFilter = document.getElementById("filter-status");
  const sortFilter = document.getElementById("filter-sort");
  const appsTableBody = document.getElementById("apps-table-body");

  async function loadApplications() {
    if (!appsTableBody) return;

    appsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-slate-500">
          <svg class="animate-spin h-6 w-6 mx-auto text-slate-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading applications...
        </td>
      </tr>
    `;

    try {
      const query = new URLSearchParams({
        search: currentSearch,
        category: currentCategory,
        level: currentLevel,
        status: currentStatus,
        sort: currentSort
      });

      const res = await fetch(`/api/admin/applications?${query}`, { headers });
      if (!res.ok) throw new Error("Failed to load applications");
      const apps = await res.json();

      if (apps.length === 0) {
        appsTableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-10 text-slate-500">
              No application records found matching your filters.
            </td>
          </tr>
        `;
        return;
      }

      appsTableBody.innerHTML = apps.map((a) => {
        let badgeClass = "badge-pending";
        if (a.applicationStatus === "Payment Proof Submitted") badgeClass = "badge-proof";
        if (a.applicationStatus === "Under Review") badgeClass = "badge-review";
        if (a.applicationStatus === "Shortlisted") badgeClass = "badge-shortlisted";
        if (a.applicationStatus === "Approved") badgeClass = "badge-approved";
        if (a.applicationStatus === "Rejected") badgeClass = "badge-rejected";

        return `
          <tr class="hover:bg-slate-50 border-b border-slate-100">
            <td class="font-mono font-bold text-slate-900">${a.applicationId}</td>
            <td>
              <div class="font-bold text-slate-900">${a.fullName}</div>
              <div class="text-xs text-slate-500">${a.email} | ${a.phone}</div>
            </td>
            <td>
              <div class="text-slate-800 font-medium">${a.specificDegree}</div>
              <div class="text-xs text-slate-500">${a.academicCategory} (${a.educationLevel})</div>
            </td>
            <td>
              ${a.hasWorkExperience ? `<span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Yes (${a.yearsOfExperience} yrs)</span>` : `<span class="text-xs text-slate-400">N/A</span>`}
            </td>
            <td>
              <span class="badge ${a.paymentStatus === 'Payment Proof Submitted' ? 'badge-proof' : 'badge-pending'}">${a.paymentStatus}</span>
            </td>
            <td>
              <span class="badge ${badgeClass}">${a.applicationStatus}</span>
            </td>
            <td class="text-xs text-slate-500">
              ${new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </td>
            <td>
              <div class="flex items-center gap-2">
                <button 
                  onclick="viewApplicationDetails('${a.applicationId}')"
                  class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-all"
                >
                  View
                </button>
                <button 
                  onclick="deleteApplication('${a.applicationId}', '${a.fullName.replace(/'/g, "\\'")}')"
                  class="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 font-semibold text-xs rounded-lg transition-all"
                  title="Delete Application"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    } catch (err) {
      console.error(err);
      appsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-6 text-rose-600 font-medium">
            Error loading records: ${err.message}
          </td>
        </tr>
      `;
    }
  }

  // Live Search & Filters Listener
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentSearch = e.target.value;
        loadApplications();
      }, 300);
    });
  }

  if (categoryFilter) categoryFilter.addEventListener("change", (e) => { currentCategory = e.target.value; loadApplications(); });
  if (levelFilter) levelFilter.addEventListener("change", (e) => { currentLevel = e.target.value; loadApplications(); });
  if (statusFilter) statusFilter.addEventListener("change", (e) => { currentStatus = e.target.value; loadApplications(); });
  if (sortFilter) sortFilter.addEventListener("change", (e) => { currentSort = e.target.value; loadApplications(); });

  // View Application Details Modal
  window.viewApplicationDetails = async function (appId) {
    const modal = document.getElementById("detail-modal");
    const modalBody = document.getElementById("detail-modal-body");

    modalBody.innerHTML = `
      <div class="text-center py-12">
        <svg class="animate-spin h-8 w-8 mx-auto text-emerald-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Fetching application details...
      </div>
    `;

    modal.classList.add("open");

    try {
      const res = await fetch(`/api/admin/applications/${appId}`, { headers });
      if (!res.ok) throw new Error("Could not retrieve application profile");
      const app = await res.json();

      modalBody.innerHTML = `
        <div class="space-y-6">
          <!-- Header Profile Summary -->
          <div class="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <span class="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider block">Application ID: ${app.applicationId}</span>
              <h2 class="text-2xl font-bold text-slate-900">${app.fullName}</h2>
              <p class="text-sm text-slate-600">${app.email} • ${app.phone} • DOB: ${app.dateOfBirth}</p>
              <p class="text-xs text-slate-500 mt-1">📍 Address: ${app.address}</p>
            </div>
            <div class="text-right">
              <span class="badge badge-approved text-sm mb-2">${app.applicationStatus}</span>
              <p class="text-xs text-slate-400">Submitted: ${new Date(app.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <!-- Status Updater Bar -->
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <span class="text-xs font-bold text-slate-700 block uppercase">Update Application Status</span>
              <p class="text-xs text-slate-500">Change review stage for candidate</p>
            </div>
            <div class="flex items-center gap-2">
              <select id="status-update-select" class="form-input text-sm py-1.5 px-3">
                <option value="Payment Pending" ${app.applicationStatus === 'Payment Pending' ? 'selected' : ''}>Payment Pending</option>
                <option value="Payment Proof Submitted" ${app.applicationStatus === 'Payment Proof Submitted' ? 'selected' : ''}>Payment Proof Submitted</option>
                <option value="Under Review" ${app.applicationStatus === 'Under Review' ? 'selected' : ''}>Under Review</option>
                <option value="Shortlisted" ${app.applicationStatus === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
                <option value="Approved" ${app.applicationStatus === 'Approved' ? 'selected' : ''}>Approved</option>
                <option value="Rejected" ${app.applicationStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
              </select>
              <button 
                onclick="updateAppStatus('${app.applicationId}')"
                class="btn-primary text-xs py-2 px-4"
              >
                Save Status
              </button>
            </div>
          </div>

          <!-- Education Section -->
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <h3 class="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">🎓 Education Background</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span class="text-xs text-slate-500 block">Category</span><span class="font-semibold">${app.academicCategory}</span></div>
              <div><span class="text-xs text-slate-500 block">Degree / Major</span><span class="font-semibold">${app.specificDegree}</span></div>
              <div><span class="text-xs text-slate-500 block">Education Level</span><span class="font-semibold">${app.educationLevel}</span></div>
              <div><span class="text-xs text-slate-500 block">University/College</span><span class="font-semibold">${app.university}</span></div>
              <div><span class="text-xs text-slate-500 block">Graduation Year</span><span class="font-semibold">${app.graduationYear}</span></div>
              <div><span class="text-xs text-slate-500 block">GPA</span><span class="font-semibold">${app.gpa}</span></div>
            </div>
          </div>

          <!-- Work Experience Section -->
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <h3 class="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">💼 Previous Work Experience</h3>
            ${app.hasWorkExperience ? `
              <div class="grid grid-cols-3 gap-4 text-sm">
                <div><span class="text-xs text-slate-500 block">Years of Experience</span><span class="font-semibold">${app.yearsOfExperience} Years</span></div>
                <div><span class="text-xs text-slate-500 block">Previous Employer</span><span class="font-semibold">${app.previousEmployer}</span></div>
                <div><span class="text-xs text-slate-500 block">Job Title</span><span class="font-semibold">${app.jobTitle}</span></div>
              </div>
            ` : `<p class="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">Applicant indicated NO previous work experience (N/A).</p>`}
          </div>

          <!-- Volunteer Experience -->
          <div class="bg-white p-5 rounded-xl border border-slate-200">
            <h3 class="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">🤝 Volunteer Experience</h3>
            <p class="text-sm text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-lg">${app.volunteerExperience || 'Not provided'}</p>
          </div>

          <!-- Attachments Section (CV PDF & Payment Screenshot) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- CV Attachment Card -->
            <div class="bg-white p-5 rounded-xl border border-slate-200">
              <h3 class="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
                <span>📄 CV / Resume (PDF)</span>
                <span class="text-xs text-slate-500">${app.cvOriginalName || 'Attached PDF'}</span>
              </h3>
              <div class="space-y-2">
                <a 
                  href="${app.cvUrl}" 
                  target="_blank" 
                  class="btn-outline w-full text-xs py-2 justify-center"
                >
                  👁️ Preview / View CV PDF
                </a>
                <a 
                  href="${app.cvUrl}" 
                  download 
                  class="btn-primary w-full text-xs py-2 justify-center"
                >
                  📥 Download CV PDF
                </a>
              </div>
            </div>

            <!-- Payment Screenshot Card -->
            <div class="bg-white p-5 rounded-xl border border-slate-200">
              <h3 class="font-bold text-slate-900 text-sm mb-3">📸 Payment Proof Screenshot</h3>
              ${app.paymentScreenshotUrl ? `
                <div class="space-y-3">
                  <img src="${app.paymentScreenshotUrl}" alt="Payment Proof" class="w-full h-40 object-cover rounded-lg border border-slate-200">
                  <a 
                    href="${app.paymentScreenshotUrl}" 
                    target="_blank" 
                    class="btn-outline w-full text-xs py-2 justify-center"
                  >
                    🔍 View Full Screenshot
                  </a>
                </div>
              ` : `
                <div class="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-500">
                  No payment proof screenshot uploaded yet. Status: Payment Pending.
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      modalBody.innerHTML = `<div class="p-6 text-center text-rose-600">${err.message}</div>`;
    }
  };

  // Status Update Handler inside Modal
  window.updateAppStatus = async function (appId) {
    const statusSelect = document.getElementById("status-update-select");
    if (!statusSelect) return;

    const newStatus = statusSelect.value;
    try {
      const res = await fetch(`/api/admin/applications/${appId}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      window.showToast("Application status updated!", "success");
      loadOverviewStats();
      loadApplications();
    } catch (err) {
      window.showToast(err.message, "error");
    }
  };

  // Soft Delete Application Handler
  window.deleteApplication = async function (appId, name) {
    if (!confirm(`Are you sure you want to permanently remove application ${appId} for ${name}?\n\nThis action removes candidate record, CV file, and payment proof.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: "DELETE",
        headers
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      window.showToast(`Application ${appId} removed.`, "success");
      loadOverviewStats();
      loadApplications();
    } catch (err) {
      window.showToast(err.message, "error");
    }
  };

  // Export CSV Handler
  const exportCsvBtn = document.getElementById("export-csv-btn");
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/admin/export-csv", { headers });
        if (!res.ok) throw new Error("Failed to export CSV");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ECDI_Applications_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        window.showToast("CSV Export failed: " + err.message, "error");
      }
    });
  }

  // Payment Methods Management CRUD
  const paymentMethodsList = document.getElementById("payment-methods-admin-list");
  const addPaymentMethodBtn = document.getElementById("add-pm-btn");

  async function loadPaymentMethodsAdmin() {
    if (!paymentMethodsList) return;

    try {
      const res = await fetch("/api/admin/payment-methods", { headers });
      if (!res.ok) throw new Error("Failed to load payment methods");
      const methods = await res.json();

      paymentMethodsList.innerHTML = methods.map((pm) => `
        <div class="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between gap-4 shadow-sm">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-slate-900">${pm.bankName}</h4>
              <span class="badge ${pm.isActive ? 'badge-approved' : 'badge-rejected'}">${pm.isActive ? 'Active' : 'Disabled'}</span>
            </div>
            <p class="text-sm font-mono text-slate-700 font-semibold mt-1">Account: ${pm.accountNumber}</p>
            <p class="text-xs text-slate-500">${pm.accountName || 'ECDI'}</p>
          </div>
          <div class="flex items-center gap-2">
            <button 
              onclick="togglePaymentMethodStatus('${pm.id}', ${!pm.isActive})"
              class="px-3 py-1.5 text-xs font-semibold rounded-lg ${pm.isActive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}"
            >
              ${pm.isActive ? 'Disable' : 'Enable'}
            </button>
            <button 
              onclick="deletePaymentMethod('${pm.id}', '${pm.bankName.replace(/'/g, "\\'")}')"
              class="px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg"
            >
              Delete
            </button>
          </div>
        </div>
      `).join("");
    } catch (err) {
      console.error(err);
    }
  }

  window.togglePaymentMethodStatus = async function (pmId, newActive) {
    try {
      const res = await fetch(`/api/admin/payment-methods/${pmId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ isActive: newActive })
      });
      if (!res.ok) throw new Error("Failed to update payment method");
      window.showToast("Payment method updated!", "success");
      loadPaymentMethodsAdmin();
    } catch (err) {
      window.showToast(err.message, "error");
    }
  };

  window.deletePaymentMethod = async function (pmId, name) {
    if (!confirm(`Are you sure you want to delete payment method '${name}'?\n\nThis will remove it from public payment page.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/payment-methods/${pmId}`, {
        method: "DELETE",
        headers
      });
      if (!res.ok) throw new Error("Failed to delete payment method");
      window.showToast("Payment method deleted.", "success");
      loadPaymentMethodsAdmin();
    } catch (err) {
      window.showToast(err.message, "error");
    }
  };

  // Add Payment Method Modal
  if (addPaymentMethodBtn) {
    addPaymentMethodBtn.addEventListener("click", async () => {
      const bankName = prompt("Enter Bank / Provider Name (e.g. Commercial Bank of Ethiopia):");
      if (!bankName) return;

      const accountNumber = prompt("Enter Account Number:");
      if (!accountNumber) return;

      const accountName = prompt("Enter Account Holder Name (Optional):", "Ethiopian Community Development Initiative");
      const instructions = prompt("Enter Payment Instructions (Optional):", "Use your Application ID as reference.");

      try {
        const res = await fetch("/api/admin/payment-methods", {
          method: "POST",
          headers,
          body: JSON.stringify({
            bankName,
            accountNumber,
            accountName,
            instructions,
            isActive: true
          })
        });

        if (!res.ok) throw new Error("Failed to add payment method");
        window.showToast("New payment method added successfully!", "success");
        loadPaymentMethodsAdmin();
      } catch (err) {
        window.showToast(err.message, "error");
      }
    });
  }

  // Initial Boot
  loadOverviewStats();
  loadApplications();
  loadPaymentMethodsAdmin();
});

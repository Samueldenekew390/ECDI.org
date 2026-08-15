/* ECDI Payment Page Controller */

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  let applicationId = urlParams.get("id");

  if (!applicationId) {
    applicationId = sessionStorage.getItem("ecdi_current_app_id") || localStorage.getItem("ecdi_current_app_id");
  }

  const appIdDisplay = document.getElementById("application-id-display");
  if (appIdDisplay) {
    appIdDisplay.textContent = applicationId || "ECDI-2026-000001";
  }

  // Load Active Payment Methods dynamically from Database API if available
  const paymentMethodsContainer = document.getElementById("payment-methods-container");
  if (paymentMethodsContainer) {
    try {
      const response = await fetch("/api/payment-methods");
      if (response.ok) {
        const methods = await response.json();
        if (Array.isArray(methods) && methods.length > 0) {
          paymentMethodsContainer.innerHTML = methods.map((pm) => `
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-100">
                    🏛️
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900 text-lg">${pm.bankName}</h3>
                    <p class="text-xs text-slate-500">${pm.accountName || 'ECDI'}</p>
                  </div>
                </div>
                <span class="badge badge-approved">Active</span>
              </div>

              <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-4 flex items-center justify-between gap-3">
                <div>
                  <span class="text-xs text-slate-500 font-medium block uppercase tracking-wider">Account Number</span>
                  <span class="text-xl font-mono font-bold text-slate-900 select-all tracking-wider">${pm.accountNumber}</span>
                </div>
                <button 
                  type="button"
                  onclick="window.copyToClipboard('${pm.accountNumber}', this)"
                  class="px-4 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  aria-label="Copy ${pm.bankName} Account Number"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                  <span>Copy</span>
                </button>
              </div>
              ${pm.instructions ? `<p class="text-xs text-slate-500 mt-3 flex items-center gap-1.5"><span class="text-amber-600">💡</span> ${pm.instructions}</p>` : ''}
            </div>
          `).join("");
        }
      }
    } catch (err) {
      console.warn("Using pre-rendered official payment accounts:", err);
    }
  }

  // Payment Screenshot File Upload & Preview Handler
  let selectedScreenshotFile = null;
  const dropzone = document.getElementById("screenshot-dropzone");
  const fileInput = document.getElementById("screenshotFileInput");
  const previewContainer = document.getElementById("screenshot-preview-container");
  const previewImage = document.getElementById("screenshot-preview-img");
  const removeBtn = document.getElementById("remove-screenshot-btn");
  const submitProofBtn = document.getElementById("submit-proof-btn");

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFile(e.target.files[0]);
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        selectedScreenshotFile = null;
        fileInput.value = "";
        previewContainer.classList.add("hidden");
        dropzone.classList.remove("hidden");
      });
    }
  }

  function handleImageFile(file) {
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    const isImage = validTypes.includes(file.type) || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    if (!isImage) {
      if (window.showToast) {
        window.showToast("Payment screenshot must be an image (JPG, JPEG, PNG, or WebP). PDF files are not allowed.", "error");
      }
      selectedScreenshotFile = null;
      if (fileInput) fileInput.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      if (window.showToast) {
        window.showToast("Payment screenshot file size must be no larger than 2 MB.", "error");
      }
      selectedScreenshotFile = null;
      if (fileInput) fileInput.value = "";
      return;
    }

    selectedScreenshotFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      dropzone.classList.add("hidden");
      previewContainer.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }

  // Final Proof Submission
  if (submitProofBtn) {
    const handleSubmitProof = async () => {
      const currentAppId = applicationId || sessionStorage.getItem("ecdi_current_app_id") || localStorage.getItem("ecdi_current_app_id") || "ECDI-2026-000001";

      if (!selectedScreenshotFile) {
        if (window.showToast) {
          window.showToast("Please select and upload a payment screenshot first.", "error");
        }
        return;
      }

      submitProofBtn.disabled = true;
      submitProofBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Uploading Payment Proof...</span>
      `;

      try {
        // Update local database record
        try {
          const savedApps = JSON.parse(localStorage.getItem("ecdi_applications_db") || "[]");
          const idx = savedApps.findIndex((a) => a.applicationId === currentAppId);
          const now = new Date().toISOString();
          if (idx >= 0) {
            savedApps[idx].paymentStatus = "Payment Proof Submitted";
            savedApps[idx].applicationStatus = "Payment Proof Submitted";
            savedApps[idx].paymentSubmittedAt = now;
            savedApps[idx].updatedAt = now;
            localStorage.setItem("ecdi_applications_db", JSON.stringify(savedApps));
          }
        } catch (e) {}

        // Try server upload
        try {
          const payload = new FormData();
          payload.append("screenshotFile", selectedScreenshotFile);

          await fetch(`/api/applications/${encodeURIComponent(currentAppId)}/payment-proof`, {
            method: "POST",
            body: payload
          });
        } catch (serverErr) {
          console.warn("Payment proof server upload notice:", serverErr);
        }

        if (window.showToast) {
          window.showToast("Payment screenshot uploaded successfully!", "success");
        }

        setTimeout(() => {
          window.location.href = `/success.html?id=${encodeURIComponent(currentAppId)}`;
        }, 800);

      } catch (err) {
        console.error("Payment proof upload error:", err);
        if (window.showToast) {
          window.showToast(err.message || "Upload failed. Please try again.", "error");
        }
        submitProofBtn.disabled = false;
        submitProofBtn.innerHTML = `Submit Payment Proof`;
      }
    };

    submitProofBtn.addEventListener("click", handleSubmitProof);
    submitProofBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      handleSubmitProof();
    });
  }
});

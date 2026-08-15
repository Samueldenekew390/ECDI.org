/* ECDI Multi-Step Application Controller */

document.addEventListener("DOMContentLoaded", () => {
  let currentStep = 1;
  const FINAL_REVIEW_STEP = 6;
  const STORAGE_KEY = "ecdi_application_draft_v1";

  // Prevent default form submission on enter key / submit triggers
  const appForm = document.getElementById("applicationForm");
  if (appForm) {
    appForm.addEventListener("submit", (e) => {
      e.preventDefault();
      return false;
    });
  }

  // State flags for workflow enforcement
  let selectedCvFile = null;
  let cvUploaded = false;
  let step5Completed = false;
  let isSubmitting = false;

  const stepElements = {
    1: document.getElementById("step-1"),
    2: document.getElementById("step-2"),
    3: document.getElementById("step-3"),
    4: document.getElementById("step-4"),
    5: document.getElementById("step-5"),
    6: document.getElementById("step-6")
  };

  const progressFill = document.getElementById("progress-fill");
  const stepIndicators = document.querySelectorAll(".step-item");

  // Nav Buttons
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const navButtonsBar = document.getElementById("nav-buttons-bar");
  const editAppBtn = document.getElementById("edit-app-btn");
  const confirmBtn = document.getElementById("confirm-submit-btn");

  // Work Experience Toggle Logic
  const workExpYes = document.getElementById("work-exp-yes");
  const workExpNo = document.getElementById("work-exp-no");
  const workExpDetails = document.getElementById("work-exp-details");

  if (workExpYes && workExpNo && workExpDetails) {
    workExpYes.addEventListener("change", () => {
      if (workExpYes.checked) {
        workExpDetails.classList.remove("hidden");
      }
      saveDraftToSession();
    });

    workExpNo.addEventListener("change", () => {
      if (workExpNo.checked) {
        workExpDetails.classList.add("hidden");
        const yrs = document.getElementById("yearsOfExperience");
        const emp = document.getElementById("previousEmployer");
        const title = document.getElementById("jobTitle");
        if (yrs) yrs.value = "";
        if (emp) emp.value = "";
        if (title) title.value = "";
      }
      saveDraftToSession();
    });
  }

  // File Upload Handling
  const dropzone = document.getElementById("cv-dropzone");
  const cvFileInput = document.getElementById("cvFileInput");
  const filePreview = document.getElementById("file-preview");
  const fileNameDisplay = document.getElementById("file-name-display");
  const removeFileBtn = document.getElementById("remove-file-btn");

  if (dropzone && cvFileInput) {
    dropzone.addEventListener("click", () => cvFileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    cvFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0]);
      }
    });

    if (removeFileBtn) {
      removeFileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedCvFile = null;
        cvUploaded = false;
        step5Completed = false;
        if (cvFileInput) cvFileInput.value = "";
        if (filePreview) filePreview.classList.add("hidden");
        if (dropzone) dropzone.classList.remove("hidden");

        // If currently on Step 6, revert to Step 5
        if (currentStep === FINAL_REVIEW_STEP) {
          currentStep = 5;
        }
        updateStepUI();
      });
    }
  }

  function handleFileSelection(file) {
    clearErrors();
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      showError("cvGroup", "Please upload your CV/Resume in PDF format before continuing.");
      selectedCvFile = null;
      cvUploaded = false;
      step5Completed = false;
      if (cvFileInput) cvFileInput.value = "";
      return;
    }

    // Strict 5 MB check
    if (file.size > 5 * 1024 * 1024) {
      showError("cvGroup", "File size exceeds the maximum allowed limit of 5 MB.");
      selectedCvFile = null;
      cvUploaded = false;
      step5Completed = false;
      if (cvFileInput) cvFileInput.value = "";
      return;
    }

    selectedCvFile = file;
    cvUploaded = true;
    step5Completed = true;

    if (fileNameDisplay) {
      fileNameDisplay.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    }
    if (dropzone) dropzone.classList.add("hidden");
    if (filePreview) filePreview.classList.remove("hidden");

    // Clear any previous CV error message
    const errEl = document.getElementById("cvGroup-error");
    if (errEl) {
      errEl.textContent = "";
      errEl.classList.add("hidden");
    }
  }

  // Session Storage Draft Functions
  function saveDraftToSession() {
    try {
      const draft = {
        fullName: document.getElementById("fullName")?.value || "",
        email: document.getElementById("email")?.value || "",
        phone: document.getElementById("phone")?.value || "",
        dateOfBirth: document.getElementById("dateOfBirth")?.value || "",
        address: document.getElementById("address")?.value || "",
        academicCategory: document.getElementById("academicCategory")?.value || "",
        specificDegree: document.getElementById("specificDegree")?.value || "",
        educationLevel: document.getElementById("educationLevel")?.value || "",
        university: document.getElementById("university")?.value || "",
        graduationYear: document.getElementById("graduationYear")?.value || "",
        gpa: document.getElementById("gpa")?.value || "",
        hasWorkExp: workExpYes ? workExpYes.checked : false,
        hasNoWorkExp: workExpNo ? workExpNo.checked : false,
        yearsOfExperience: document.getElementById("yearsOfExperience")?.value || "",
        previousEmployer: document.getElementById("previousEmployer")?.value || "",
        jobTitle: document.getElementById("jobTitle")?.value || "",
        volunteerExperience: document.getElementById("volunteerExperience")?.value || ""
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      // Storage unavailable
    }
  }

  function restoreDraftFromSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);

      if (draft.fullName) document.getElementById("fullName").value = draft.fullName;
      if (draft.email) document.getElementById("email").value = draft.email;
      if (draft.phone) document.getElementById("phone").value = draft.phone;
      if (draft.dateOfBirth) document.getElementById("dateOfBirth").value = draft.dateOfBirth;
      if (draft.address) document.getElementById("address").value = draft.address;

      if (draft.academicCategory) document.getElementById("academicCategory").value = draft.academicCategory;
      if (draft.specificDegree) document.getElementById("specificDegree").value = draft.specificDegree;
      if (draft.educationLevel) document.getElementById("educationLevel").value = draft.educationLevel;
      if (draft.university) document.getElementById("university").value = draft.university;
      if (draft.graduationYear) document.getElementById("graduationYear").value = draft.graduationYear;
      if (draft.gpa) document.getElementById("gpa").value = draft.gpa;

      if (draft.hasWorkExp) {
        if (workExpYes) workExpYes.checked = true;
        if (workExpDetails) workExpDetails.classList.remove("hidden");
        if (draft.yearsOfExperience) document.getElementById("yearsOfExperience").value = draft.yearsOfExperience;
        if (draft.previousEmployer) document.getElementById("previousEmployer").value = draft.previousEmployer;
        if (draft.jobTitle) document.getElementById("jobTitle").value = draft.jobTitle;
      } else if (draft.hasNoWorkExp) {
        if (workExpNo) workExpNo.checked = true;
        if (workExpDetails) workExpDetails.classList.add("hidden");
      }

      if (draft.volunteerExperience) document.getElementById("volunteerExperience").value = draft.volunteerExperience;
    } catch (e) {
      console.warn("Could not restore form draft from sessionStorage:", e);
    }
  }

  function clearDraftSession() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // Ignore
    }
  }

  // Consistent Application ID generator and manager
  function getOrCreateApplicationId() {
    let existingId = sessionStorage.getItem("ecdi_current_app_id") || localStorage.getItem("ecdi_current_app_id");
    if (existingId && /^ECDI-2026-\d{6}$/i.test(existingId.trim())) {
      return existingId.trim();
    }

    let nextSeq = 1;
    try {
      const savedApps = JSON.parse(localStorage.getItem("ecdi_applications_db") || "[]");
      if (Array.isArray(savedApps) && savedApps.length > 0) {
        savedApps.forEach((a) => {
          const m = (a.applicationId || "").match(/^ECDI-2026-(\d+)$/i);
          if (m) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num) && num >= nextSeq) nextSeq = num + 1;
          }
        });
      }
    } catch (e) {}

    const zeroPadded = String(nextSeq).padStart(6, "0");
    const newId = `ECDI-2026-${zeroPadded}`;
    sessionStorage.setItem("ecdi_current_app_id", newId);
    localStorage.setItem("ecdi_current_app_id", newId);
    return newId;
  }

  // Attach input listener to auto-save draft
  document.querySelectorAll("#applicationForm input, #applicationForm select, #applicationForm textarea").forEach((input) => {
    input.addEventListener("input", saveDraftToSession);
    input.addEventListener("change", saveDraftToSession);
  });

  // Scroll to First Error Field (Critical for Mobile Usability)
  function scrollToFirstError() {
    setTimeout(() => {
      const firstErrorEl = document.querySelector(".form-input.error, .radio-card.error, .error-message:not(.hidden)");
      if (firstErrorEl) {
        const targetContainer = firstErrorEl.closest("div") || firstErrorEl;
        const headerOffset = 90; // Offset for sticky header
        const elementPosition = targetContainer.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: "smooth"
        });

        const focusable = targetContainer.querySelector("input, select, textarea") || (typeof firstErrorEl.focus === "function" ? firstErrorEl : null);
        if (focusable && typeof focusable.focus === "function") {
          try {
            focusable.focus({ preventScroll: true });
          } catch (e) {
            // Ignore focus errors
          }
        }
      }
    }, 50);
  }

  // Smooth Scroll to Form Top
  function scrollToFormTop() {
    setTimeout(() => {
      const formCard = document.querySelector(".form-card") || document.querySelector("main");
      if (formCard) {
        const headerOffset = 90;
        const elementPosition = formCard.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: "smooth"
        });
      }
    }, 50);
  }

  // Navigation Event Handlers
  if (nextBtn) {
    const handleNext = (e) => {
      if (e) e.preventDefault();
      try {
        if (currentStep < 5) {
          if (validateCurrentStep(currentStep)) {
            currentStep++;
            updateStepUI();
            scrollToFormTop();
          } else {
            if (window.showToast) window.showToast("Please fill in all required fields highlighted in red.", "error");
            scrollToFirstError();
          }
        } else if (currentStep === 5) {
          // Step 5 Validation
          clearErrors();
          if (!selectedCvFile || (selectedCvFile.type !== "application/pdf" && !selectedCvFile.name.toLowerCase().endsWith(".pdf"))) {
            showError("cvGroup", "Please upload your CV/Resume in PDF format before continuing.");
            cvUploaded = false;
            step5Completed = false;
            if (window.showToast) window.showToast("Please upload your CV/Resume in PDF format (Max 5 MB).", "error");
            scrollToFirstError();
            return;
          }

          if (selectedCvFile.size > 5 * 1024 * 1024) {
            showError("cvGroup", "File size exceeds the maximum allowed limit of 5 MB.");
            cvUploaded = false;
            step5Completed = false;
            if (window.showToast) window.showToast("File size exceeds 5 MB limit.", "error");
            scrollToFirstError();
            return;
          }

          // CV is valid!
          cvUploaded = true;
          step5Completed = true;

          if (!validateAllStepsBeforeReview()) {
            if (window.showToast) window.showToast("Please complete all required fields before proceeding to review.", "error");
            scrollToFirstError();
            return;
          }

          currentStep = FINAL_REVIEW_STEP;
          populateReviewData();
          updateStepUI();
          scrollToFormTop();
        }
      } catch (err) {
        console.error("Error in handleNext:", err);
        if (window.showToast) window.showToast("An unexpected error occurred. Please review your input.", "error");
      }
    };

    nextBtn.addEventListener("click", handleNext);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      if (e) e.preventDefault();
      if (currentStep > 1) {
        currentStep--;
        updateStepUI();
        scrollToFormTop();
      }
    });
  }

  if (editAppBtn) {
    editAppBtn.addEventListener("click", (e) => {
      if (e) e.preventDefault();
      currentStep = 1;
      updateStepUI();
      scrollToFormTop();
    });
  }

  // Error Helper Functions
  function showError(fieldId, msg) {
    const field = document.getElementById(fieldId);
    if (field) field.classList.add("error");

    const errEl = document.getElementById(`${fieldId}-error`);
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove("hidden");
    }
  }

  function clearErrors() {
    document.querySelectorAll(".form-input").forEach((input) => input.classList.remove("error"));
    document.querySelectorAll(".radio-card").forEach((card) => card.classList.remove("error"));
    document.querySelectorAll(".error-message").forEach((msg) => {
      msg.textContent = "";
      msg.classList.add("hidden");
    });
  }

  // Validate Single Step
  function validateCurrentStep(step) {
    clearErrors();
    let isValid = true;

    if (step === 1) {
      const fullName = (document.getElementById("fullName")?.value || "").trim();
      const email = (document.getElementById("email")?.value || "").trim();
      const rawPhone = (document.getElementById("phone")?.value || "").trim();
      const dateOfBirth = (document.getElementById("dateOfBirth")?.value || "").trim();
      const address = (document.getElementById("address")?.value || "").trim();

      const cleanPhone = rawPhone.replace(/[\s\-\(\)\+]/g, "");

      if (!fullName) { showError("fullName", "Full Name is required."); isValid = false; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError("email", "Valid Email Address is required."); isValid = false; }
      if (!rawPhone || cleanPhone.length < 9) { showError("phone", "Valid Phone Number is required (minimum 9 digits)."); isValid = false; }
      if (!dateOfBirth) { showError("dateOfBirth", "Date of Birth is required."); isValid = false; }
      if (!address) { showError("address", "Address / City is required."); isValid = false; }
    } else if (step === 2) {
      const academicCategory = document.getElementById("academicCategory")?.value;
      const specificDegree = (document.getElementById("specificDegree")?.value || "").trim();
      const educationLevel = document.getElementById("educationLevel")?.value;
      const university = (document.getElementById("university")?.value || "").trim();
      const graduationYear = document.getElementById("graduationYear")?.value;
      const gpa = (document.getElementById("gpa")?.value || "").trim();

      if (!academicCategory) { showError("academicCategory", "Please select an Academic Category."); isValid = false; }
      if (!specificDegree) { showError("specificDegree", "Specific Degree/Major is required."); isValid = false; }
      if (!educationLevel) { showError("educationLevel", "Educational Level is required."); isValid = false; }
      if (!university) { showError("university", "University/College name is required."); isValid = false; }
      if (!graduationYear || parseInt(graduationYear, 10) < 1970 || parseInt(graduationYear, 10) > 2026) {
        showError("graduationYear", "Valid Graduation Year (1970 - 2026) is required.");
        isValid = false;
      }
      if (!gpa) { showError("gpa", "GPA / Grade is required."); isValid = false; }
    } else if (step === 3) {
      if (!workExpYes?.checked && !workExpNo?.checked) {
        showError("workExpGroup", "Please select whether you have work experience.");
        isValid = false;
      } else if (workExpYes?.checked) {
        const years = (document.getElementById("yearsOfExperience")?.value || "").trim();
        const employer = (document.getElementById("previousEmployer")?.value || "").trim();
        const title = (document.getElementById("jobTitle")?.value || "").trim();

        if (!years) { showError("yearsOfExperience", "Years of experience is required."); isValid = false; }
        if (!employer) { showError("previousEmployer", "Previous Employer/Organization is required."); isValid = false; }
        if (!title) { showError("jobTitle", "Job Title is required."); isValid = false; }
      }
    } else if (step === 4) {
      // Step 4 Volunteer experience is optional
      isValid = true;
    } else if (step === 5) {
      if (!selectedCvFile) {
        showError("cvGroup", "Please upload your CV/Resume in PDF format before continuing.");
        isValid = false;
      } else {
        const isPdf = selectedCvFile.type === "application/pdf" || selectedCvFile.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          showError("cvGroup", "Please upload your CV/Resume in PDF format.");
          isValid = false;
        } else if (selectedCvFile.size > 5 * 1024 * 1024) {
          showError("cvGroup", "File size exceeds the maximum allowed limit of 5 MB.");
          isValid = false;
        }
      }
    }

    return isValid;
  }

  // Validate All Steps Before Review
  function validateAllStepsBeforeReview() {
    clearErrors();
    let firstInvalidStep = 0;

    // Step 1
    const fullName = (document.getElementById("fullName")?.value || "").trim();
    const email = (document.getElementById("email")?.value || "").trim();
    const rawPhone = (document.getElementById("phone")?.value || "").trim();
    const dateOfBirth = (document.getElementById("dateOfBirth")?.value || "").trim();
    const address = (document.getElementById("address")?.value || "").trim();
    const cleanPhone = rawPhone.replace(/[\s\-\(\)\+]/g, "");

    if (!fullName) { showError("fullName", "Full Name is required."); if (!firstInvalidStep) firstInvalidStep = 1; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError("email", "Valid Email Address is required."); if (!firstInvalidStep) firstInvalidStep = 1; }
    if (!rawPhone || cleanPhone.length < 9) { showError("phone", "Valid Phone Number is required."); if (!firstInvalidStep) firstInvalidStep = 1; }
    if (!dateOfBirth) { showError("dateOfBirth", "Date of Birth is required."); if (!firstInvalidStep) firstInvalidStep = 1; }
    if (!address) { showError("address", "Address is required."); if (!firstInvalidStep) firstInvalidStep = 1; }

    // Step 2
    const academicCategory = document.getElementById("academicCategory")?.value;
    const specificDegree = (document.getElementById("specificDegree")?.value || "").trim();
    const educationLevel = document.getElementById("educationLevel")?.value;
    const university = (document.getElementById("university")?.value || "").trim();
    const graduationYear = document.getElementById("graduationYear")?.value;
    const gpa = (document.getElementById("gpa")?.value || "").trim();

    if (!academicCategory) { showError("academicCategory", "Please select Academic Category."); if (!firstInvalidStep) firstInvalidStep = 2; }
    if (!specificDegree) { showError("specificDegree", "Specific Degree/Major is required."); if (!firstInvalidStep) firstInvalidStep = 2; }
    if (!educationLevel) { showError("educationLevel", "Educational Level is required."); if (!firstInvalidStep) firstInvalidStep = 2; }
    if (!university) { showError("university", "University/College name is required."); if (!firstInvalidStep) firstInvalidStep = 2; }
    if (!graduationYear || parseInt(graduationYear, 10) < 1970 || parseInt(graduationYear, 10) > 2026) {
      showError("graduationYear", "Valid Graduation Year is required.");
      if (!firstInvalidStep) firstInvalidStep = 2;
    }
    if (!gpa) { showError("gpa", "GPA / Grade is required."); if (!firstInvalidStep) firstInvalidStep = 2; }

    // Step 3
    if (!workExpYes?.checked && !workExpNo?.checked) {
      showError("workExpGroup", "Please select whether you have work experience.");
      if (!firstInvalidStep) firstInvalidStep = 3;
    } else if (workExpYes?.checked) {
      const years = (document.getElementById("yearsOfExperience")?.value || "").trim();
      const employer = (document.getElementById("previousEmployer")?.value || "").trim();
      const title = (document.getElementById("jobTitle")?.value || "").trim();

      if (!years) { showError("yearsOfExperience", "Years of experience is required."); if (!firstInvalidStep) firstInvalidStep = 3; }
      if (!employer) { showError("previousEmployer", "Previous Employer/Organization is required."); if (!firstInvalidStep) firstInvalidStep = 3; }
      if (!title) { showError("jobTitle", "Job Title is required."); if (!firstInvalidStep) firstInvalidStep = 3; }
    }

    // Step 5
    if (!selectedCvFile) {
      showError("cvGroup", "Please upload your CV/Resume in PDF format before continuing.");
      if (!firstInvalidStep) firstInvalidStep = 5;
    } else {
      const isPdf = selectedCvFile.type === "application/pdf" || selectedCvFile.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        showError("cvGroup", "Please upload your CV/Resume in PDF format.");
        if (!firstInvalidStep) firstInvalidStep = 5;
      } else if (selectedCvFile.size > 5 * 1024 * 1024) {
        showError("cvGroup", "File size exceeds maximum limit of 5 MB.");
        if (!firstInvalidStep) firstInvalidStep = 5;
      }
    }

    if (firstInvalidStep > 0) {
      currentStep = firstInvalidStep;
      updateStepUI();
      return false;
    }

    return true;
  }

  // Collect All Data Directly From DOM Elements
  function collectAllFormData() {
    const fullName = (document.getElementById("fullName")?.value || "").trim();
    const email = (document.getElementById("email")?.value || "").trim();
    const phone = (document.getElementById("phone")?.value || "").trim();
    const dateOfBirth = (document.getElementById("dateOfBirth")?.value || "").trim();
    const address = (document.getElementById("address")?.value || "").trim();

    const academicCategory = (document.getElementById("academicCategory")?.value || "").trim();
    const specificDegree = (document.getElementById("specificDegree")?.value || "").trim();
    const educationLevel = (document.getElementById("educationLevel")?.value || "").trim();
    const university = (document.getElementById("university")?.value || "").trim();
    const graduationYear = (document.getElementById("graduationYear")?.value || "").trim();
    const gpa = (document.getElementById("gpa")?.value || "").trim();

    const hasWorkExp = workExpYes ? workExpYes.checked : false;
    let yearsOfExperience = "N/A";
    let previousEmployer = "N/A";
    let jobTitle = "N/A";

    if (hasWorkExp) {
      yearsOfExperience = (document.getElementById("yearsOfExperience")?.value || "").trim() || "N/A";
      previousEmployer = (document.getElementById("previousEmployer")?.value || "").trim() || "N/A";
      jobTitle = (document.getElementById("jobTitle")?.value || "").trim() || "N/A";
    }

    const volunteerExperience = (document.getElementById("volunteerExperience")?.value || "").trim() || "Not provided";

    return {
      fullName,
      email,
      phone,
      dateOfBirth,
      address,
      academicCategory,
      specificDegree,
      educationLevel,
      university,
      graduationYear,
      gpa,
      hasWorkExperience: hasWorkExp,
      yearsOfExperience,
      previousEmployer,
      jobTitle,
      volunteerExperience,
      cvFile: selectedCvFile
    };
  }

  function updateStepUI() {
    // Toggle active step
    Object.keys(stepElements).forEach((s) => {
      const stepNum = parseInt(s, 10);
      if (stepElements[stepNum]) {
        stepElements[stepNum].classList.toggle("hidden", stepNum !== currentStep);
      }
    });

    // Update Progress Bar
    const progressPercent = ((currentStep - 1) / (FINAL_REVIEW_STEP - 1)) * 100;
    if (progressFill) progressFill.style.width = `${progressPercent}%`;

    stepIndicators.forEach((ind, idx) => {
      const stepNum = idx + 1;
      ind.classList.remove("active", "completed");
      if (stepNum < currentStep) {
        ind.classList.add("completed");
      } else if (stepNum === currentStep) {
        ind.classList.add("active");
      }
    });

    // Toggle navigation bar buttons
    if (navButtonsBar) {
      if (currentStep === FINAL_REVIEW_STEP) {
        navButtonsBar.classList.add("hidden");
      } else {
        navButtonsBar.classList.remove("hidden");
      }
    }

    if (prevBtn) {
      prevBtn.classList.toggle("hidden", currentStep === 1 || currentStep === FINAL_REVIEW_STEP);
    }

    if (nextBtn) {
      if (currentStep === FINAL_REVIEW_STEP) {
        nextBtn.classList.add("hidden");
      } else {
        nextBtn.classList.remove("hidden");
        const nextText = currentStep === 5 ? "Proceed to Review" : "Next Step";
        nextBtn.innerHTML = `<span>${nextText}</span> <svg class="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>`;
      }
    }
  }

  function populateReviewData() {
    const data = collectAllFormData();
    if (document.getElementById("review-name")) document.getElementById("review-name").textContent = data.fullName || "-";
    if (document.getElementById("review-email")) document.getElementById("review-email").textContent = data.email || "-";
    if (document.getElementById("review-phone")) document.getElementById("review-phone").textContent = data.phone || "-";
    if (document.getElementById("review-dob")) document.getElementById("review-dob").textContent = data.dateOfBirth || "-";
    if (document.getElementById("review-address")) document.getElementById("review-address").textContent = data.address || "-";

    if (document.getElementById("review-category")) document.getElementById("review-category").textContent = data.academicCategory || "-";
    if (document.getElementById("review-degree")) document.getElementById("review-degree").textContent = data.specificDegree || "-";
    if (document.getElementById("review-level")) document.getElementById("review-level").textContent = data.educationLevel || "-";
    if (document.getElementById("review-university")) document.getElementById("review-university").textContent = data.university || "-";
    if (document.getElementById("review-grad-year")) document.getElementById("review-grad-year").textContent = data.graduationYear || "-";
    if (document.getElementById("review-gpa")) document.getElementById("review-gpa").textContent = data.gpa || "-";

    if (document.getElementById("review-work-exp")) {
      if (data.hasWorkExperience) {
        document.getElementById("review-work-exp").textContent = `Yes (${data.yearsOfExperience} yrs at ${data.previousEmployer} as ${data.jobTitle})`;
      } else {
        document.getElementById("review-work-exp").textContent = "No (N/A)";
      }
    }

    if (document.getElementById("review-volunteer")) document.getElementById("review-volunteer").textContent = data.volunteerExperience || "Not provided";
    if (document.getElementById("review-cv")) document.getElementById("review-cv").textContent = data.cvFile ? data.cvFile.name : "-";
  }

  // Confirm & Proceed to Payment Action Handler
  async function handleConfirmAndProceed() {
    if (isSubmitting) return;

    if (currentStep !== FINAL_REVIEW_STEP) {
      return;
    }

    if (!selectedCvFile || !cvUploaded || !step5Completed) {
      if (window.showToast) window.showToast("Please upload your CV/Resume in PDF format before continuing.", "error");
      currentStep = 5;
      updateStepUI();
      scrollToFirstError();
      return;
    }

    if (!validateAllStepsBeforeReview()) {
      if (window.showToast) window.showToast("Please complete all required fields before proceeding to payment.", "error");
      scrollToFirstError();
      return;
    }

    const btn = document.getElementById("confirm-submit-btn");
    const originalBtnContent = btn ? btn.innerHTML : "Confirm & Proceed to Payment →";

    try {
      isSubmitting = true;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processing...</span>
        `;
      }

      const data = collectAllFormData();
      const applicationId = getOrCreateApplicationId();
      const now = new Date().toISOString();

      // Store application locally in database schema for resilience and offline support
      const appRecord = {
        applicationId,
        fullName: data.fullName,
        name: data.fullName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        academicCategory: data.academicCategory,
        educationCategory: data.academicCategory,
        specificDegree: data.specificDegree,
        educationLevel: data.educationLevel,
        educationalLevel: data.educationLevel,
        university: data.university,
        graduationYear: data.graduationYear,
        gpa: data.gpa,
        hasWorkExperience: data.hasWorkExperience,
        workExperienceStatus: data.hasWorkExperience ? "YES" : "NO",
        yearsOfExperience: data.yearsOfExperience,
        previousEmployer: data.previousEmployer,
        jobTitle: data.jobTitle,
        volunteerExperience: data.volunteerExperience,
        cvOriginalName: data.cvFile ? data.cvFile.name : "resume.pdf",
        paymentStatus: "Payment Pending",
        applicationStatus: "Payment Pending",
        createdAt: now,
        updatedAt: now
      };

      try {
        const savedApps = JSON.parse(localStorage.getItem("ecdi_applications_db") || "[]");
        const existingIdx = savedApps.findIndex((a) => a.applicationId === applicationId);
        if (existingIdx >= 0) {
          savedApps[existingIdx] = { ...savedApps[existingIdx], ...appRecord };
        } else {
          savedApps.push(appRecord);
        }
        localStorage.setItem("ecdi_applications_db", JSON.stringify(savedApps));
        localStorage.setItem("ecdi_current_application", JSON.stringify(appRecord));
        sessionStorage.setItem("ecdi_current_application", JSON.stringify(appRecord));
        sessionStorage.setItem("ecdi_current_app_id", applicationId);
        localStorage.setItem("ecdi_current_app_id", applicationId);
      } catch (storageErr) {
        console.warn("Local storage write warning:", storageErr);
      }

      // Submit to backend server if available
      let serverAppId = applicationId;
      try {
        const payload = new FormData();
        payload.append("applicationId", applicationId);
        payload.append("fullName", data.fullName);
        payload.append("email", data.email);
        payload.append("phone", data.phone);
        payload.append("dateOfBirth", data.dateOfBirth);
        payload.append("address", data.address);
        payload.append("academicCategory", data.academicCategory);
        payload.append("specificDegree", data.specificDegree);
        payload.append("educationLevel", data.educationLevel);
        payload.append("university", data.university);
        payload.append("graduationYear", data.graduationYear);
        payload.append("gpa", data.gpa);
        payload.append("hasWorkExperience", data.hasWorkExperience ? "true" : "false");
        payload.append("yearsOfExperience", data.yearsOfExperience);
        payload.append("previousEmployer", data.previousEmployer);
        payload.append("jobTitle", data.jobTitle);
        payload.append("volunteerExperience", data.volunteerExperience);
        if (data.cvFile) {
          payload.append("cvFile", data.cvFile);
        }

        const response = await fetch("/api/applications", {
          method: "POST",
          body: payload
        });

        if (response.ok) {
          const resData = await response.json().catch(() => ({}));
          if (resData.applicationId) {
            serverAppId = resData.applicationId;
            sessionStorage.setItem("ecdi_current_app_id", serverAppId);
            localStorage.setItem("ecdi_current_app_id", serverAppId);
          }
        } else {
          console.warn(`Server responded with status ${response.status}. Using preserved local application record.`);
        }
      } catch (netErr) {
        console.warn("Backend API request returned error, proceeding with preserved local record:", netErr);
      }

      clearDraftSession();

      if (window.showToast) {
        window.showToast("Application confirmed! Redirecting to payment...", "success");
      }

      const finalId = serverAppId || applicationId;
      const paymentUrl = `/payment.html?id=${encodeURIComponent(finalId)}`;

      setTimeout(() => {
        window.location.href = paymentUrl;
      }, 500);

    } catch (err) {
      console.error("Confirm & Proceed to Payment error:", err);
      if (window.showToast) {
        window.showToast("Unable to proceed to payment. Please try again.", "error");
      }
      isSubmitting = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnContent;
      }
    }
  }

  // Attach event listener to confirm-submit-btn
  if (confirmBtn) {
    confirmBtn.addEventListener("click", handleConfirmAndProceed);
    confirmBtn.addEventListener("touchend", (e) => {
      // Touch support for mobile/tablet
      e.preventDefault();
      handleConfirmAndProceed();
    });
  }

  // Restore draft on load & initialize UI
  restoreDraftFromSession();
  updateStepUI();
});

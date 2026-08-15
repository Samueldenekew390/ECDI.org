/* ECDI Main Global JavaScript */

// Toast Notification System
window.showToast = function (message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `
    <span class="text-base select-none">${icon}</span>
    <span style="flex: 1; word-break: break-word;">${message}</span>
  `;

  container.appendChild(toast);

  // Allow tap to dismiss toast on mobile
  toast.addEventListener('click', () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 200);
  });

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
};

// Copy To Clipboard Helper Function
window.copyToClipboard = function (text, elementOrBtn) {
  if (!text) return;

  const cleanText = text.trim();

  if (navigator.clipboard && window.isSecureContext && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(cleanText)
      .then(() => {
        handleCopySuccess(elementOrBtn);
      })
      .catch(() => {
        fallbackCopyTextToClipboard(cleanText, elementOrBtn);
      });
  } else {
    fallbackCopyTextToClipboard(cleanText, elementOrBtn);
  }
};

function fallbackCopyTextToClipboard(text, elementOrBtn) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.width = "2em";
  textArea.style.height = "2em";
  textArea.style.padding = "0";
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";
  textArea.style.background = "transparent";
  textArea.setAttribute("readonly", "");
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      handleCopySuccess(elementOrBtn);
    } else {
      window.showToast("Failed to copy account number. Please copy manually: " + text, "error");
    }
  } catch (err) {
    window.showToast("Copy command failed. Please copy manually: " + text, "error");
  }

  document.body.removeChild(textArea);
}

function handleCopySuccess(btn) {
  window.showToast("Account number copied to clipboard!", "success");
  if (btn) {
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<span class="font-bold">✓ Copied!</span>`;
    btn.classList.add("bg-emerald-700", "text-white");
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = originalContent;
      btn.classList.remove("bg-emerald-700");
      btn.disabled = false;
    }, 2000);
  }
}

// Mobile Menu Toggle & Interactive Navigation Logic
document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const mobileNav = document.getElementById("mobile-nav");

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isExpanded = !mobileNav.classList.contains("hidden");
      if (isExpanded) {
        mobileNav.classList.add("hidden");
        menuBtn.setAttribute("aria-expanded", "false");
      } else {
        mobileNav.classList.remove("hidden");
        menuBtn.setAttribute("aria-expanded", "true");
      }
    });

    // Close mobile nav when clicking any nav link
    const mobileLinks = mobileNav.querySelectorAll("a, button");
    mobileLinks.forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.classList.add("hidden");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });

    // Close mobile nav when clicking outside
    document.addEventListener("click", (e) => {
      if (!mobileNav.classList.contains("hidden")) {
        if (!mobileNav.contains(e.target) && !menuBtn.contains(e.target)) {
          mobileNav.classList.add("hidden");
          menuBtn.setAttribute("aria-expanded", "false");
        }
      }
    });
  }

  // Header Scroll Effect
  const header = document.querySelector("header");
  if (header) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 20) {
        header.classList.add("shadow-md");
      } else {
        header.classList.remove("shadow-md");
      }
    }, { passive: true });
  }
});


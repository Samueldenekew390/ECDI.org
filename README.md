# ETHIOPIAN COMMUNITY DEVELOPMENT INITIATIVE (ECDI)
> **Tagline:** "Empowering People. Strengthening Communities. Building Ethiopia's Future."

Official Production Full-Stack Web Application and Administration System for the **Ethiopian Community Development Initiative (ECDI)**.

---

## 📋 Executive Overview

ECDI is a community-focused Ethiopian organization committed to sustainable development, professional opportunities, skills development, research, community participation, and social, economic, and environmental progress.

This platform connects qualified Ethiopian graduates (Social Science, Natural Science, and related disciplines) with professional opportunities and community development initiatives for up to **758 professionals**.

---

## ✨ Key Features & Technical Capabilities

- **Public Responsive Website**: Premium, human-centered NGO design built with clean, accessible typography, high contrast, mobile hamburger menu, and natural SEO keyword optimization.
- **Multi-Step Application System**:
  1. Applicant Personal Information (Full Name, Email, Phone, Date of Birth, Address)
  2. Academic Background & Education (Social Science, Natural Science, Other; Specific Degree, Education Level, University, Graduation Year, GPA)
  3. Work Experience ("If none, enter N/A", Yes/No toggle with dynamic fields)
  4. Volunteer Experience (Optional details)
  5. CV/Resume PDF Upload (Strict PDF MIME validation, file size limit 10MB)
  6. Application Review Overlay Modal before final submission
- **Application ID Generator**: Generates unique Application IDs formatted as `ECDI-2026-XXXXXX`.
- **Dynamic Payment System**:
  - Application Fee: **$4 (600 Birr)**
  - Default payment channels: Commercial Bank of Ethiopia (CBE `1000327468956`) and Bank of Abyssinia (`264416817`).
  - Account Copy Buttons with instant visual `Copied!` feedback.
  - Dynamically loaded from database API (`/api/payment-methods`).
  - Clear non-refundable fee warnings and admin verification notices.
- **Payment Screenshot Upload**:
  - Drag-and-drop file upload zone for JPG/PNG/WebP proof images.
  - Client-side image preview, image swap/removal, server-side validation.
- **Confirmation Page**: Clear status tracking (`Payment Proof Submitted`), Application ID display, and direct WhatsApp contact link.
- **Secure Admin Authentication**:
  - JWT token-based authentication (Session / LocalStorage).
  - No hardcoded credentials in client-side JavaScript.
  - Default Administrator: `admin@ecdi.org.et` / `ecdi_admin_secure_2026`.
- **Admin Dashboard**:
  - Real-time application metrics (Total, Payment Pending, Proof Submitted, Under Review, Approved, Rejected).
  - Application Table with live search (Name, Email, Phone, Application ID, Degree, University), multi-filter dropdowns, and sorting.
  - Detailed Applicant Profile Modal with inline CV PDF preview/download and payment proof image viewer.
  - Real-time Application Status Updater.
  - Soft-Delete Application capability with confirmation warning dialogs.
  - Complete Payment Methods CRUD (Add, Edit, Enable/Disable, Delete with confirmation).
  - CSV Data Export tool for spreadsheets.
- **Direct WhatsApp Integration**: Persistent floating button linking to `https://wa.me/251927141774`.

---

## 📁 Directory Structure

```
/
├── index.html                   # Public Homepage
├── apply.html                   # Multi-Step Application Page
├── payment.html                 # Payment Page & Proof Upload
├── success.html                 # Application Submission Success Page
├── admin-login.html             # Secure Admin Login Portal
├── admin.html                   # Admin Dashboard
├── server.ts                    # Express + Vite Full-Stack API Server
├── css/
│   ├── style.css                # Global ECDI styles & Tailwind CSS
│   ├── application.css          # Multi-step form & step progress bar styles
│   └── admin.css                # Admin dashboard layout, tables, & modals
├── js/
│   ├── app.js                   # Global utilities, toast notifications, copy-to-clipboard
│   ├── application.js           # Multi-step form controller & validation
│   ├── payment.js               # Dynamic payment methods & proof screenshot upload
│   ├── auth.js                  # Admin JWT session authentication controller
│   ├── admin.js                 # Admin dashboard metrics, table, profile modal, CRUD, CSV
│   └── firebase-config.js       # Firebase configuration module
├── assets/
│   └── logo/
│       └── ecdi_logo.jpg        # Official ECDI brand logo asset
├── data/
│   └── db.json                  # Persistent JSON Database file
├── uploads/
│   ├── cv-resumes/              # Local backup cache for CV uploads
│   └── payment-proofs/          # Local backup cache for payment screenshots
├── firebase-blueprint.json      # Firestore Intermediate Representation schema
├── firestore.rules              # Production Firestore security rules
├── metadata.json                # AI Studio application metadata
├── package.json                 # Dependencies and build scripts
├── vite.config.ts               # Vite multi-page build configuration
└── README.md                    # Platform documentation
```

---

## 🛠️ API Endpoints Summary

### Public Endpoints
- `GET /api/health`: Health status & organization metadata.
- `GET /api/payment-methods`: Fetches active payment methods for `payment.html`.
- `POST /api/applications`: Accepts multipart `FormData` (applicant info + PDF `cvFile`), creates application with ID `ECDI-2026-XXXXXX`.
- `POST /api/applications/:id/payment-proof`: Accepts multipart `screenshotFile` and attaches payment proof screenshot.
- `GET /api/applications/:id/status`: Public status lookup for confirmation page.

### Admin Endpoints (Requires `Authorization: Bearer <token>`)
- `POST /api/admin/login`: Authenticates administrator credentials.
- `GET /api/admin/overview`: Returns real-time metrics counts.
- `GET /api/admin/applications`: Returns list of applications with search, multi-filter, and sorting parameters.
- `GET /api/admin/applications/:id`: Returns single application details with CV and screenshot URL pointers.
- `PATCH /api/admin/applications/:id/status`: Updates application status (`Under Review`, `Shortlisted`, `Approved`, `Rejected`).
- `DELETE /api/admin/applications/:id`: Soft-deletes an application.
- `GET /api/admin/payment-methods`: Returns all payment methods (active and disabled).
- `POST /api/admin/payment-methods`: Creates a new payment method.
- `PUT /api/admin/payment-methods/:id`: Edits a payment method or toggles active status.
- `DELETE /api/admin/payment-methods/:id`: Deletes a payment method.
- `GET /api/admin/export-csv`: Generates downloadable CSV of application records.

---

## 🚀 Local Development & Deployment

### 1. Running Locally
```bash
# Start development server on http://localhost:3000
npm run dev
```

### 2. Building for Production
```bash
npm run build
```

### 3. Starting Production Build
```bash
npm start
```

---

## 🔐 Default Admin Credentials
- **URL**: `/admin-login.html`
- **Username**: `admin@ecdi.org.et`
- **Password**: `ecdi_admin_secure_2026`

---

## 🧪 Testing Checklist

- [x] Homepage loads cleanly with ECDI logo, hero, about content, core values, and opportunities.
- [x] `APPLY` button opens `/apply.html`.
- [x] Multi-step application validates required fields across Steps 1 to 5.
- [x] Work experience toggle dynamically displays/hides experience fields or records `N/A`.
- [x] PDF CV upload validates file extension and size limit.
- [x] Application review overlay modal displays all entered fields before submission.
- [x] Submitting application generates `ECDI-2026-XXXXXX` Application ID and redirects to `/payment.html?id=ECDI-2026-XXXXXX`.
- [x] Payment page displays Application ID, fee ($4 / 600 Birr), non-refundable warning, and active payment channels.
- [x] Copy account number buttons copy to clipboard and show `Copied!` feedback.
- [x] Uploading payment screenshot updates status to `Payment Proof Submitted` and redirects to `/success.html`.
- [x] Admin login authenticates securely at `/admin-login.html`.
- [x] Admin dashboard displays overview metrics, searchable table, filters, detail drawer modal with CV preview & screenshot viewer, payment method CRUD manager, soft-delete confirmation, and CSV data export.

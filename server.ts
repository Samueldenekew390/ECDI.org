import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { supabase as supabaseClient } from "./src/lib/supabase";
import * as admin from "firebase-admin";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "ecdi_jwt_secret_key_change_in_prod";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin@ecdi.org.et";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ecdi_admin_secure_2026";

// Ensure local backup directories exist
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const CVS_DIR = path.join(UPLOADS_DIR, "cv-resumes");
const SCREENSHOTS_DIR = path.join(UPLOADS_DIR, "payment-proofs");

[DATA_DIR, UPLOADS_DIR, CVS_DIR, SCREENSHOTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Dedicated Supabase Storage Client imported from src/lib/supabase.ts

// Firebase Firestore Admin
let firestoreDb: any = null;
try {
  if (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const adminSdk = admin as any;
    if (!adminSdk.apps || !adminSdk.apps.length) {
      adminSdk.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "ecdi-applet"
      });
    }
    if (typeof adminSdk.firestore === "function") {
      firestoreDb = adminSdk.firestore();
      console.log("[Firestore] Admin SDK initialized.");
    }
  }
} catch (err) {
  console.warn("[Firestore] Initialization notice:", err);
}


// Middleware
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use("/assets", express.static(path.join(process.cwd(), "public/assets")));
app.use("/assets", express.static(path.join(process.cwd(), "assets")));
app.use("/public", express.static(path.join(process.cwd(), "public")));
app.use("/js", express.static(path.join(process.cwd(), "public/js")));
app.use("/js", express.static(path.join(process.cwd(), "js")));
app.get("/app.js", (_req, res) => {
  const possiblePaths = [
    path.join(process.cwd(), "public/app.js"),
    path.join(process.cwd(), "public/js/app.js"),
    path.join(process.cwd(), "js/app.js"),
    path.join(process.cwd(), "dist/app.js"),
    path.join(process.cwd(), "dist/js/app.js")
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).send("app.js not found");
});

// Initialize DB JSON
interface PaymentMethod {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

interface ApplicationRecord {
  applicationId: string;
  name?: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  educationCategory?: string;
  academicCategory: string;
  specificDegree: string;
  educationalLevel?: string;
  educationLevel: string;
  university: string;
  graduationYear: number;
  gpa: string;
  workExperienceStatus?: string;
  hasWorkExperience: boolean;
  yearsOfExperience: string;
  previousEmployer: string;
  jobTitle: string;
  volunteerExperience: string;
  cvStoragePath: string;
  cvOriginalName: string;
  paymentProofStoragePath?: string | null;
  paymentScreenshotStoragePath?: string | null;
  paymentScreenshotOriginalName?: string;
  paymentStatus: "Payment Pending" | "Payment Proof Submitted" | "Verified" | "Failed";
  applicationStatus: "Payment Pending" | "Payment Proof Submitted" | "Under Review" | "Shortlisted" | "Approved" | "Rejected";
  statusHistory: Array<{ status: string; changedAt: string; note?: string }>;
  createdAt: string;
  updatedAt: string;
  paymentSubmittedAt?: string | null;
  isDeleted?: boolean;
}


interface DatabaseSchema {
  paymentMethods: PaymentMethod[];
  applications: ApplicationRecord[];
}

function getDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DatabaseSchema = {
      paymentMethods: [
        {
          id: "pm-cbe-001",
          bankName: "Commercial Bank of Ethiopia (CBE)",
          accountName: "Ethiopian Community Development Initiative",
          accountNumber: "1000327468956",
          instructions: "Please enter your Application ID in the payment reference/reason field.",
          isActive: true,
          displayOrder: 1,
          createdAt: new Date().toISOString()
        },
        {
          id: "pm-aby-002",
          bankName: "Bank of Abyssinia",
          accountName: "Ethiopian Community Development Initiative",
          accountNumber: "264416817",
          instructions: "Please enter your Application ID in the payment reference/reason field.",
          isActive: true,
          displayOrder: 2,
          createdAt: new Date().toISOString()
        }
      ],
      applications: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
    return initialDb;
  }
  try {
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading database file:", err);
    return { paymentMethods: [], applications: [] };
  }
}

function saveDatabase(data: DatabaseSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Sequential Application ID Generator: ECDI-2026-000001, ECDI-2026-000002...
function getNextApplicationId(): string {
  const db = getDatabase();
  let maxNum = 0;

  if (db.applications && db.applications.length > 0) {
    for (const appRecord of db.applications) {
      if (appRecord.applicationId) {
        const match = appRecord.applicationId.match(/^ECDI-2026-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  const zeroPadded = String(nextNum).padStart(6, "0");
  return `ECDI-2026-${zeroPadded}`;
}

// Supabase Storage Upload Helper
async function uploadToSupabaseStorage(
  bucket: "cv-resumes" | "payment-proofs",
  pathInBucket: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const relativeStoragePath = `${bucket}/${pathInBucket}`;

  if (!supabaseClient) {
    console.warn(`[Supabase Storage] Supabase credentials not set. Saving locally to ${relativeStoragePath}`);
    return relativeStoragePath;
  }

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .upload(pathInBucket, buffer, {
      contentType,
      upsert: true
    });

  if (error) {
    console.error(`[Supabase Storage Error] Bucket: ${bucket}, Path: ${pathInBucket}:`, error);
    throw new Error(`Supabase Storage upload error: ${error.message}`);
  }

  console.log(`[Supabase Storage Success] Uploaded file to bucket ${bucket}: ${data.path}`);
  return relativeStoragePath;
}

// Supabase Signed URL Helper
async function getSupabaseSignedUrl(
  bucket: "cv-resumes" | "payment-proofs",
  pathInBucket: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .createSignedUrl(pathInBucket, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn(`[Supabase Storage] Signed URL creation warning for ${bucket}/${pathInBucket}:`, error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("[Supabase Signed URL Error]:", err);
    return null;
  }
}

// Firestore Helper functions
async function saveToFirestore(record: ApplicationRecord) {
  if (!firestoreDb) return;
  try {
    await firestoreDb.collection("applications").doc(record.applicationId).set({
      applicationId: record.applicationId,
      name: record.fullName,
      fullName: record.fullName,
      email: record.email,
      phone: record.phone,
      dateOfBirth: record.dateOfBirth,
      address: record.address,
      educationCategory: record.academicCategory,
      academicCategory: record.academicCategory,
      specificDegree: record.specificDegree,
      educationalLevel: record.educationLevel,
      educationLevel: record.educationLevel,
      university: record.university,
      graduationYear: record.graduationYear,
      gpa: record.gpa,
      workExperienceStatus: record.hasWorkExperience ? "YES" : "NO",
      hasWorkExperience: record.hasWorkExperience,
      yearsOfExperience: record.yearsOfExperience,
      previousEmployer: record.previousEmployer,
      jobTitle: record.jobTitle,
      volunteerExperience: record.volunteerExperience,
      cvStoragePath: record.cvStoragePath,
      paymentProofStoragePath: record.paymentProofStoragePath || null,
      applicationStatus: record.applicationStatus,
      paymentStatus: record.paymentStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    });
    console.log(`[Firestore] Saved record for ${record.applicationId}`);
  } catch (err) {
    console.error(`[Firestore Error] Failed to save record ${record.applicationId}:`, err);
  }
}

async function updateInFirestore(applicationId: string, updateFields: Record<string, any>) {
  if (!firestoreDb) return;
  try {
    await firestoreDb.collection("applications").doc(applicationId).set(updateFields, { merge: true });
    console.log(`[Firestore] Updated record for ${applicationId}`);
  } catch (err) {
    console.error(`[Firestore Error] Failed to update record ${applicationId}:`, err);
  }
}

// Multer Upload Configuration for CV (5MB Limit)
const uploadCV = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed for CV upload."));
    }
  }
});

// Multer Upload Configuration for Payment Screenshots (2MB Limit)
const uploadScreenshot = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowedTypes.includes(file.mimetype) || /\.(jpg|jpeg|png|webp)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, PNG, or WebP images are allowed for payment screenshots."));
    }
  }
});


// Admin Auth Middleware
function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. Token missing." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: string };
    (req as any).admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session token." });
  }
}

// -------------------------------------------------------------
// PUBLIC API ENDPOINTS
// -------------------------------------------------------------

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", organization: "Ethiopian Community Development Initiative (ECDI)" });
});

// Get Active Payment Methods for Applicants
app.get("/api/payment-methods", (_req, res) => {
  const db = getDatabase();
  const activeMethods = db.paymentMethods
    .filter((pm) => pm.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  res.json(activeMethods);
});

// Get Next Application ID (For Step 6 Review Preview)
app.get("/api/applications/next-id", (_req, res) => {
  const applicationId = getNextApplicationId();
  res.json({ applicationId });
});

// Submit Application (Step 1-5 + CV PDF Upload)
app.post("/api/applications", (req, res, next) => {
  uploadCV.single("cvFile")(req, res, (err) => {
    if (err) {
      console.error("[Submission Error] CV Upload Validation Failed:", err);
      return res.status(400).json({ error: err.message || "CV file upload failed. Must be a PDF file under 5 MB." });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CV PDF file is required. Please upload a PDF file under 5 MB." });
    }

    const body = req.body;
    const requiredFields = [
      "fullName",
      "email",
      "phone",
      "dateOfBirth",
      "address",
      "academicCategory",
      "specificDegree",
      "educationLevel",
      "university",
      "graduationYear",
      "gpa"
    ];

    for (const field of requiredFields) {
      if (!body[field] || String(body[field]).trim() === "" || String(body[field]) === "undefined") {
        return res.status(400).json({ error: `Field '${field}' is required.` });
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const hasWorkExperience = body.hasWorkExperience === "true" || body.hasWorkExperience === true;
    let yearsOfExperience = "N/A";
    let previousEmployer = "N/A";
    let jobTitle = "N/A";

    if (hasWorkExperience) {
      yearsOfExperience = (body.yearsOfExperience && body.yearsOfExperience !== "undefined") ? body.yearsOfExperience.trim() : "N/A";
      previousEmployer = (body.previousEmployer && body.previousEmployer !== "undefined") ? body.previousEmployer.trim() : "N/A";
      jobTitle = (body.jobTitle && body.jobTitle !== "undefined") ? body.jobTitle.trim() : "N/A";
    }

    // Determine Application ID (ECDI-2026-000001, ECDI-2026-000002, etc.)
    let applicationId = body.applicationId && /^ECDI-2026-\d{6}$/i.test(body.applicationId.trim())
      ? body.applicationId.trim()
      : getNextApplicationId();

    const db = getDatabase();
    if (db.applications.some((a) => a.applicationId === applicationId)) {
      applicationId = getNextApplicationId();
    }

    const cvPathInBucket = `${applicationId}/resume.pdf`;
    let cvStoragePath = `cv-resumes/${cvPathInBucket}`;

    // Upload to Supabase Storage Bucket: cv-resumes
    try {
      cvStoragePath = await uploadToSupabaseStorage("cv-resumes", cvPathInBucket, req.file.buffer, "application/pdf");
    } catch (supaErr: any) {
      console.error("[Supabase CV Upload Failed]:", supaErr);
      if (supabaseClient) {
        return res.status(500).json({
          error: `Failed to upload CV to Supabase Storage: ${supaErr.message || supaErr}`
        });
      }
    }

    // Save local backup in uploads/cv-resumes/{APPLICATION_ID}/resume.pdf
    const appCvDir = path.join(CVS_DIR, applicationId);
    if (!fs.existsSync(appCvDir)) {
      fs.mkdirSync(appCvDir, { recursive: true });
    }
    fs.writeFileSync(path.join(appCvDir, "resume.pdf"), req.file.buffer);

    const now = new Date().toISOString();

    const newApplication: ApplicationRecord = {
      applicationId,
      name: body.fullName.trim(),
      fullName: body.fullName.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      dateOfBirth: body.dateOfBirth.trim(),
      address: body.address.trim(),
      educationCategory: body.academicCategory.trim(),
      academicCategory: body.academicCategory.trim(),
      specificDegree: body.specificDegree.trim(),
      educationalLevel: body.educationLevel.trim(),
      educationLevel: body.educationLevel.trim(),
      university: body.university.trim(),
      graduationYear: parseInt(body.graduationYear, 10) || new Date().getFullYear(),
      gpa: body.gpa.trim(),
      workExperienceStatus: hasWorkExperience ? "YES" : "NO",
      hasWorkExperience,
      yearsOfExperience,
      previousEmployer,
      jobTitle,
      volunteerExperience: (body.volunteerExperience && body.volunteerExperience !== "undefined") ? body.volunteerExperience.trim() : "Not provided",
      cvStoragePath,
      cvOriginalName: req.file.originalname,
      paymentProofStoragePath: null,
      paymentScreenshotStoragePath: null,
      paymentStatus: "Payment Pending",
      applicationStatus: "Payment Pending",
      statusHistory: [
        {
          status: "Payment Pending",
          changedAt: now,
          note: "Application recorded. Awaiting payment proof."
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    db.applications.push(newApplication);
    saveDatabase(db);
    await saveToFirestore(newApplication);

    console.log(`[Application Recorded] ID: ${applicationId}, Storage Path: ${cvStoragePath}`);

    res.status(201).json({
      success: true,
      message: "Application saved successfully.",
      applicationId,
      redirectUrl: `/payment.html?id=${applicationId}`
    });
  } catch (err: any) {
    console.error("[Application submission error]:", err);
    res.status(500).json({ error: err.message || "Failed to save application." });
  }
});

// Upload Payment Proof Screenshot
app.post("/api/applications/:id/payment-proof", (req, res, next) => {
  uploadScreenshot.single("screenshotFile")(req, res, (err) => {
    if (err) {
      console.error("[Payment Proof Upload Failed]:", err);
      return res.status(400).json({ error: err.message || "Payment proof upload failed. Must be an image under 2 MB." });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const applicationId = req.params.id;
    if (!req.file) {
      return res.status(400).json({ error: "Payment screenshot image file is required." });
    }

    const db = getDatabase();
    const appIndex = db.applications.findIndex((a) => a.applicationId === applicationId && !a.isDeleted);

    if (appIndex === -1) {
      return res.status(404).json({ error: `Application ID '${applicationId}' not found.` });
    }

    const extMatch = req.file.originalname.match(/\.([a-z0-9]+)$/i);
    const extension = extMatch ? extMatch[1].toLowerCase() : "png";
    const filenameInBucket = `payment-proof.${extension}`;
    const proofPathInBucket = `${applicationId}/${filenameInBucket}`;
    let paymentProofStoragePath = `payment-proofs/${proofPathInBucket}`;

    // Upload to Supabase Storage Bucket: payment-proofs
    try {
      paymentProofStoragePath = await uploadToSupabaseStorage("payment-proofs", proofPathInBucket, req.file.buffer, req.file.mimetype);
    } catch (supaErr: any) {
      console.error("[Supabase Payment Screenshot Upload Failed]:", supaErr);
      if (supabaseClient) {
        return res.status(500).json({
          error: `Failed to upload payment proof to Supabase Storage: ${supaErr.message || supaErr}`
        });
      }
    }

    // Save local backup in uploads/payment-proofs/{APPLICATION_ID}/payment-proof.{extension}
    const appProofDir = path.join(SCREENSHOTS_DIR, applicationId);
    if (!fs.existsSync(appProofDir)) {
      fs.mkdirSync(appProofDir, { recursive: true });
    }
    fs.writeFileSync(path.join(appProofDir, filenameInBucket), req.file.buffer);

    const now = new Date().toISOString();
    const targetApp = db.applications[appIndex];

    targetApp.paymentProofStoragePath = paymentProofStoragePath;
    targetApp.paymentScreenshotStoragePath = paymentProofStoragePath;
    targetApp.paymentScreenshotOriginalName = req.file.originalname;
    targetApp.paymentStatus = "Payment Proof Submitted";
    targetApp.applicationStatus = "Payment Proof Submitted";
    targetApp.paymentSubmittedAt = now;
    targetApp.updatedAt = now;
    targetApp.statusHistory.push({
      status: "Payment Proof Submitted",
      changedAt: now,
      note: "Payment screenshot submitted by applicant."
    });

    db.applications[appIndex] = targetApp;
    saveDatabase(db);

    await updateInFirestore(applicationId, {
      paymentProofStoragePath,
      paymentStatus: "Payment Proof Submitted",
      applicationStatus: "Payment Proof Submitted",
      paymentSubmittedAt: now,
      updatedAt: now
    });

    res.json({
      success: true,
      message: "Payment proof uploaded successfully.",
      applicationId,
      redirectUrl: `/success.html?id=${applicationId}`
    });
  } catch (err: any) {
    console.error("Payment proof error:", err);
    res.status(500).json({ error: err.message || "Failed to upload payment proof." });
  }
});

// Public Status Query (for success.html)
app.get("/api/applications/:id/status", (req: Request, res: Response) => {
  const applicationId = req.params.id;
  const db = getDatabase();
  const appRecord = db.applications.find((a) => a.applicationId === applicationId && !a.isDeleted);

  if (!appRecord) {
    return res.status(404).json({ error: "Application not found." });
  }

  res.json({
    applicationId: appRecord.applicationId,
    fullName: appRecord.fullName,
    academicCategory: appRecord.academicCategory,
    paymentStatus: appRecord.paymentStatus,
    applicationStatus: appRecord.applicationStatus,
    createdAt: appRecord.createdAt,
    paymentSubmittedAt: appRecord.paymentSubmittedAt || null
  });
});


// -------------------------------------------------------------
// ADMIN AUTHENTICATION & MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

// Admin Login
app.post("/api/admin/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username/Email and password are required." });
  }

  if (username.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase() && password === ADMIN_PASSWORD) {
    const token = jwt.sign(
      { username: ADMIN_USERNAME, role: "ADMIN", organization: "ECDI" },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    return res.json({
      success: true,
      token,
      admin: {
        username: ADMIN_USERNAME,
        role: "ADMIN",
        organization: "Ethiopian Community Development Initiative"
      }
    });
  }

  res.status(401).json({ error: "Invalid administrator credentials." });
});

// Admin Overview Statistics
app.get("/api/admin/overview", authenticateAdmin, (_req: Request, res: Response) => {
  const db = getDatabase();
  const validApps = db.applications.filter((a) => !a.isDeleted);

  const stats = {
    totalApplications: validApps.length,
    paymentPending: validApps.filter((a) => a.paymentStatus === "Payment Pending").length,
    paymentProofSubmitted: validApps.filter((a) => a.paymentStatus === "Payment Proof Submitted").length,
    underReview: validApps.filter((a) => a.applicationStatus === "Under Review").length,
    shortlisted: validApps.filter((a) => a.applicationStatus === "Shortlisted").length,
    approved: validApps.filter((a) => a.applicationStatus === "Approved").length,
    rejected: validApps.filter((a) => a.applicationStatus === "Rejected").length,
    socialScienceCount: validApps.filter((a) => a.academicCategory === "Social Science").length,
    naturalScienceCount: validApps.filter((a) => a.academicCategory === "Natural Science").length,
    otherCategoryCount: validApps.filter((a) => a.academicCategory === "Other").length
  };

  res.json(stats);
});

// Admin Get Applications List with Search, Filters & Sorting
app.get("/api/admin/applications", authenticateAdmin, (req: Request, res: Response) => {
  const db = getDatabase();
  let apps = db.applications.filter((a) => !a.isDeleted);

  const { search, category, level, workExp, status, paymentStatus, sort } = req.query;

  // Search filter
  if (search && typeof search === "string" && search.trim() !== "") {
    const q = search.trim().toLowerCase();
    apps = apps.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        a.applicationId.toLowerCase().includes(q) ||
        a.specificDegree.toLowerCase().includes(q) ||
        a.university.toLowerCase().includes(q)
    );
  }

  // Academic category filter
  if (category && typeof category === "string" && category !== "ALL") {
    apps = apps.filter((a) => a.academicCategory === category);
  }

  // Education level filter
  if (level && typeof level === "string" && level !== "ALL") {
    apps = apps.filter((a) => a.educationLevel === level);
  }

  // Work experience filter
  if (workExp === "YES") {
    apps = apps.filter((a) => a.hasWorkExperience === true);
  } else if (workExp === "NO") {
    apps = apps.filter((a) => a.hasWorkExperience === false);
  }

  // Application status filter
  if (status && typeof status === "string" && status !== "ALL") {
    apps = apps.filter((a) => a.applicationStatus === status);
  }

  // Payment status filter
  if (paymentStatus && typeof paymentStatus === "string" && paymentStatus !== "ALL") {
    apps = apps.filter((a) => a.paymentStatus === paymentStatus);
  }

  // Sorting
  if (sort === "oldest") {
    apps.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sort === "name_asc") {
    apps.sort((a, b) => a.fullName.localeCompare(b.fullName));
  } else if (sort === "name_desc") {
    apps.sort((a, b) => b.fullName.localeCompare(a.fullName));
  } else {
    // Default newest first
    apps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json(apps);
});

// Admin Get Single Application Details
app.get("/api/admin/applications/:id", authenticateAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  const appRecord = db.applications.find((a) => a.applicationId === req.params.id && !a.isDeleted);

  if (!appRecord) {
    return res.status(404).json({ error: "Application record not found." });
  }

  let cvUrl = `/api/admin/files/cv/${appRecord.applicationId}`;
  let paymentScreenshotUrl = appRecord.paymentProofStoragePath || appRecord.paymentScreenshotStoragePath
    ? `/api/admin/files/screenshot/${appRecord.applicationId}`
    : null;

  // Attempt to generate Supabase Storage signed URLs if available
  if (supabaseClient) {
    const cvSigned = await getSupabaseSignedUrl("cv-resumes", `${appRecord.applicationId}/resume.pdf`);
    if (cvSigned) cvUrl = cvSigned;

    if (appRecord.paymentProofStoragePath || appRecord.paymentScreenshotStoragePath) {
      const storedPath = appRecord.paymentProofStoragePath || appRecord.paymentScreenshotStoragePath || "";
      const pathInBucket = storedPath.startsWith("payment-proofs/")
        ? storedPath.replace(/^payment-proofs\//, "")
        : `${appRecord.applicationId}/payment-proof.png`;

      const proofSigned = await getSupabaseSignedUrl("payment-proofs", pathInBucket);
      if (proofSigned) paymentScreenshotUrl = proofSigned;
    }
  }

  res.json({
    ...appRecord,
    cvUrl,
    paymentScreenshotUrl
  });
});

// Serve CVs & Payment Proof Screenshots for Admin
app.get("/api/admin/files/cv/:id", authenticateAdmin, (req: Request, res: Response) => {
  const appId = req.params.id;
  const filePath = path.join(CVS_DIR, appId, "resume.pdf");

  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "application/pdf");
    return res.sendFile(filePath);
  }

  // Fallback check root CVS_DIR
  const legacyPath = path.join(CVS_DIR, appId);
  if (fs.existsSync(legacyPath)) {
    res.setHeader("Content-Type", "application/pdf");
    return res.sendFile(legacyPath);
  }

  res.status(404).json({ error: "CV PDF file not found." });
});

app.get("/api/admin/files/screenshot/:id", authenticateAdmin, (req: Request, res: Response) => {
  const appId = req.params.id;
  const appDir = path.join(SCREENSHOTS_DIR, appId);

  if (fs.existsSync(appDir)) {
    const files = fs.readdirSync(appDir);
    if (files.length > 0) {
      return res.sendFile(path.join(appDir, files[0]));
    }
  }

  // Fallback check root SCREENSHOTS_DIR
  const legacyPath = path.join(SCREENSHOTS_DIR, appId);
  if (fs.existsSync(legacyPath)) {
    return res.sendFile(legacyPath);
  }

  res.status(404).json({ error: "Payment screenshot file not found." });
});

// Update Application Status
app.patch("/api/admin/applications/:id/status", authenticateAdmin, async (req: Request, res: Response) => {
  const { status, note } = req.body;
  const validStatuses = ["Payment Pending", "Payment Proof Submitted", "Under Review", "Shortlisted", "Approved", "Rejected"];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
  }

  const db = getDatabase();
  const appIndex = db.applications.findIndex((a) => a.applicationId === req.params.id && !a.isDeleted);

  if (appIndex === -1) {
    return res.status(404).json({ error: "Application not found." });
  }

  const now = new Date().toISOString();
  const targetApp = db.applications[appIndex];
  targetApp.applicationStatus = status as any;
  if (status === "Approved" || status === "Shortlisted" || status === "Under Review") {
    targetApp.paymentStatus = "Verified";
  }
  targetApp.updatedAt = now;
  targetApp.statusHistory.push({
    status,
    changedAt: now,
    note: note || `Status updated to ${status} by administrator.`
  });

  db.applications[appIndex] = targetApp;
  saveDatabase(db);

  await updateInFirestore(req.params.id, {
    applicationStatus: status,
    paymentStatus: targetApp.paymentStatus,
    updatedAt: now
  });

  res.json({ success: true, message: "Application status updated successfully.", application: targetApp });
});


// Soft Delete Application
app.delete("/api/admin/applications/:id", authenticateAdmin, (req: Request, res: Response) => {
  const db = getDatabase();
  const appIndex = db.applications.findIndex((a) => a.applicationId === req.params.id);

  if (appIndex === -1) {
    return res.status(404).json({ error: "Application not found." });
  }

  db.applications[appIndex].isDeleted = true;
  db.applications[appIndex].updatedAt = new Date().toISOString();
  saveDatabase(db);

  res.json({ success: true, message: `Application '${req.params.id}' deleted successfully.` });
});

// Admin Payment Methods CRUD
app.get("/api/admin/payment-methods", authenticateAdmin, (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json(db.paymentMethods.sort((a, b) => a.displayOrder - b.displayOrder));
});

app.post("/api/admin/payment-methods", authenticateAdmin, (req: Request, res: Response) => {
  const { bankName, accountName, accountNumber, instructions, isActive, displayOrder } = req.body;

  if (!bankName || !accountNumber) {
    return res.status(400).json({ error: "Bank Name and Account Number are required." });
  }

  const db = getDatabase();
  const newMethod: PaymentMethod = {
    id: `pm-${Date.now()}`,
    bankName: bankName.trim(),
    accountName: accountName ? accountName.trim() : "Ethiopian Community Development Initiative",
    accountNumber: accountNumber.trim(),
    instructions: instructions ? instructions.trim() : "Please include your Application ID as reference.",
    isActive: isActive !== false,
    displayOrder: parseInt(displayOrder, 10) || db.paymentMethods.length + 1,
    createdAt: new Date().toISOString()
  };

  db.paymentMethods.push(newMethod);
  saveDatabase(db);

  res.status(201).json({ success: true, paymentMethod: newMethod });
});

app.put("/api/admin/payment-methods/:id", authenticateAdmin, (req: Request, res: Response) => {
  const db = getDatabase();
  const index = db.paymentMethods.findIndex((pm) => pm.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Payment method not found." });
  }

  const { bankName, accountName, accountNumber, instructions, isActive, displayOrder } = req.body;
  const pm = db.paymentMethods[index];

  if (bankName) pm.bankName = bankName.trim();
  if (accountName !== undefined) pm.accountName = accountName.trim();
  if (accountNumber) pm.accountNumber = accountNumber.trim();
  if (instructions !== undefined) pm.instructions = instructions.trim();
  if (isActive !== undefined) pm.isActive = Boolean(isActive);
  if (displayOrder !== undefined) pm.displayOrder = parseInt(displayOrder, 10) || pm.displayOrder;

  db.paymentMethods[index] = pm;
  saveDatabase(db);

  res.json({ success: true, paymentMethod: pm });
});

app.delete("/api/admin/payment-methods/:id", authenticateAdmin, (req: Request, res: Response) => {
  const db = getDatabase();
  const index = db.paymentMethods.findIndex((pm) => pm.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Payment method not found." });
  }

  const deleted = db.paymentMethods.splice(index, 1);
  saveDatabase(db);

  res.json({ success: true, message: "Payment method removed successfully.", deleted: deleted[0] });
});

// Admin Export Applications to CSV
app.get("/api/admin/export-csv", authenticateAdmin, (_req: Request, res: Response) => {
  const db = getDatabase();
  const apps = db.applications.filter((a) => !a.isDeleted);

  const headers = [
    "Application ID",
    "Full Name",
    "Email",
    "Phone",
    "Date of Birth",
    "Address",
    "Academic Category",
    "Specific Degree",
    "Education Level",
    "University",
    "Graduation Year",
    "GPA",
    "Work Experience Status",
    "Years of Experience",
    "Previous Employer",
    "Job Title",
    "Volunteer Experience",
    "Payment Status",
    "Application Status",
    "Submitted At",
    "Payment Proof Submitted At"
  ];

  const rows = apps.map((a) => [
    `"${a.applicationId}"`,
    `"${a.fullName.replace(/"/g, '""')}"`,
    `"${a.email}"`,
    `"${a.phone}"`,
    `"${a.dateOfBirth}"`,
    `"${a.address.replace(/"/g, '""')}"`,
    `"${a.academicCategory}"`,
    `"${a.specificDegree.replace(/"/g, '""')}"`,
    `"${a.educationLevel}"`,
    `"${a.university.replace(/"/g, '""')}"`,
    `"${a.graduationYear}"`,
    `"${a.gpa}"`,
    `"${a.hasWorkExperience ? "YES" : "NO"}"`,
    `"${a.yearsOfExperience}"`,
    `"${a.previousEmployer.replace(/"/g, '""')}"`,
    `"${a.jobTitle.replace(/"/g, '""')}"`,
    `"${a.volunteerExperience.replace(/"/g, '""')}"`,
    `"${a.paymentStatus}"`,
    `"${a.applicationStatus}"`,
    `"${a.createdAt}"`,
    `"${a.paymentSubmittedAt || ""}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="ECDI_Applications_${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(csvContent);
});

// -------------------------------------------------------------
// VITE / STATIC SERVING INTEGRATION
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`ECDI Full-Stack Server Running on http://0.0.0.0:${PORT}`);
    console.log(`Organization: Ethiopian Community Development Initiative`);
    console.log(`Admin Username: ${ADMIN_USERNAME}`);
    console.log(`====================================================`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

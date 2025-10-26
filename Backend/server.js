const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const env = require('./utils/dotenv');
env.config({ path: path.join(__dirname, '.env') });
env.config({ path: path.join(__dirname, '..', '.env'), override: false });
const express = require('express');
const compression = require('compression');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('node:crypto');

// Student/Admin ID format shared with models
const { STUDENT_ID_REGEX } = require('./models/validators');

const app = express();
app.set('etag', 'strong');
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(morgan('tiny'));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOAD_DIR));

const MIME_EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

let uploadBucket = null;

function parseBase64Payload(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) {
    const comma = trimmed.indexOf(',');
    if (comma === -1) return null;
    const meta = trimmed.slice(5, comma); // skip "data:"
    const [mimePart, encoding] = meta.split(';');
    if (!encoding || encoding.toLowerCase() !== 'base64') return null;
    const data = trimmed.slice(comma + 1);
    if (!data) return null;
    try {
      const buffer = Buffer.from(data, 'base64');
      return { buffer, mime: (mimePart || '').toLowerCase() };
    } catch {
      return null;
    }
  }
  try {
    const buffer = Buffer.from(trimmed, 'base64');
    return { buffer, mime: '' };
  } catch {
    return null;
  }
}

function sanitizeFilename(name) {
  if (!name || typeof name !== 'string') return '';
  return name.replace(/[^A-Za-z0-9._-]+/g, '_');
}

async function removeStoredFile(stored) {
  if (!stored) return;
  const entry =
    typeof stored === 'string'
      ? { storedPath: stored }
      : stored && typeof stored === 'object'
      ? stored
      : null;
  if (!entry) return;

  const fileId = entry.fileId || entry.gridFsId || entry.id;
  if (fileId && uploadBucket) {
    try {
      const objectId =
        typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
      await uploadBucket.delete(objectId);
      return;
    } catch (err) {
      if (!err || err.code !== 'FileNotFound') {
        console.warn('Failed to delete GridFS file:', err?.message || err);
      }
    }
  }

  const storedPath = entry.storedPath;
  if (!storedPath) return;
  const prefix = '/uploads/';
  let relative = storedPath;
  if (storedPath.startsWith(prefix)) {
    relative = storedPath.slice(prefix.length);
  }
  relative = relative.replace(/^\/+/, '');
  if (!relative || relative.includes('..')) return;
  const target = path.join(UPLOAD_DIR, relative);
  try {
    await fsp.unlink(target);
  } catch {}
}

async function storeBase64File({
  base64,
  originalName,
  allowedMime = [],
  maxBytes = 5 * 1024 * 1024,
  subDir = ''
}) {
  const parsed = parseBase64Payload(base64);
  if (!parsed) throw new Error('Invalid file data provided');
  const { buffer } = parsed;
  if (!uploadBucket) {
    throw new Error('File storage is not ready. Please try again shortly.');
  }
  const mime = (parsed.mime || '').toLowerCase();
  const normalizedAllowed = allowedMime.map((m) => m.toLowerCase());
  if (maxBytes && buffer.length > maxBytes) {
    throw new Error(`File is too large. Max size is ${Math.round(maxBytes / (1024 * 1024))}MB`);
  }
  if (normalizedAllowed.length) {
    if (mime) {
      if (!normalizedAllowed.includes(mime)) {
        throw new Error('Unsupported file type');
      }
    } else {
      const fromName = originalName ? path.extname(originalName).toLowerCase() : '';
      const fallbackMime = fromName === '.pdf' ? 'application/pdf' : '';
      if (fallbackMime && !normalizedAllowed.includes(fallbackMime)) {
        throw new Error('Unsupported file type');
      }
    }
  }

  let ext = '';
  if (originalName) {
    ext = path.extname(originalName).toLowerCase();
  }
  if (!ext && mime && MIME_EXTENSIONS[mime]) {
    ext = MIME_EXTENSIONS[mime];
  }
  if (!ext && normalizedAllowed.includes('application/pdf')) {
    ext = '.pdf';
  }
  if (!ext && mime.startsWith('image/')) {
    ext = '.png';
  }

  const safeName = sanitizeFilename(originalName || 'file');
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext || ''}`;

  const contentType =
    mime ||
    (ext === '.pdf'
      ? 'application/pdf'
      : ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : '');

  const fileId = new mongoose.Types.ObjectId();
  await new Promise((resolve, reject) => {
    const uploadStream = uploadBucket.openUploadStreamWithId(fileId, fileName, {
      contentType: contentType || undefined,
      metadata: {
        originalName: safeName || fileName,
        category: subDir ? sanitizeFilename(subDir) : undefined,
        mime: contentType || mime || 'application/octet-stream',
        uploadedAt: new Date()
      }
    });
    uploadStream.on('error', reject);
    uploadStream.on('finish', resolve);
    uploadStream.end(buffer);
  });

  return {
    storedPath: `/api/files/${fileId.toString()}`,
    originalName: safeName || fileName,
    fileId,
    mime: contentType || mime || 'application/octet-stream'
  };
}

function parseIntField(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${fieldName} must be a number`);
  }
  return Math.max(0, Math.trunc(num));
}

function parseTagsInput(raw, fallback) {
  const list = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item !== undefined && item !== null) list.push(String(item));
    }
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) {
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item !== undefined && item !== null) list.push(String(item));
            }
          }
        } catch {
          list.push(trimmed);
        }
      } else {
        for (const piece of trimmed.split(',')) {
          if (piece.trim()) list.push(piece.trim());
        }
      }
    }
  }
  if (fallback) list.push(String(fallback));
  const unique = new Set();
  const out = [];
  for (const item of list) {
    const val = item.trim();
    if (val && !unique.has(val.toLowerCase())) {
      unique.add(val.toLowerCase());
      out.push(val);
    }
  }
  return out;
}

// --- DB connect
const { resolveMongoConfig } = require('./db/uri');
const { uri: MONGO_URI_INIT, dbName: DB_NAME } = resolveMongoConfig();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const NO_DB = String(process.env.NO_DB || process.env.BACKEND_NO_DB || '').toLowerCase() === 'true';
const USE_MEMORY_DB = String(process.env.USE_MEMORY_DB || process.env.BACKEND_INMEMORY_DB || '').toLowerCase() === 'true';
// Default borrowing period in days. Can be overridden via environment.
const DEFAULT_LOAN_DAYS = Number(process.env.LOAN_DAYS_DEFAULT || 28);

let MONGO_URI = MONGO_URI_INIT;
if (!MONGO_URI && !NO_DB && !USE_MEMORY_DB) {
  console.error('Missing MONGO_URI (or MONGODB_URI) in environment');
  process.exit(1);
}

let DB_READY = false;

function initUploadBucket() {
  if (NO_DB) return;
  const db = mongoose.connection && mongoose.connection.db;
  if (!db) return;
  try {
    uploadBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
  } catch (err) {
    console.error('Failed to initialize GridFS bucket:', err?.message || err);
  }
}

mongoose.connection.on('connected', initUploadBucket);
mongoose.connection.on('disconnected', () => {
  uploadBucket = null;
});

if (!NO_DB && USE_MEMORY_DB) {
  (async () => {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mem = await MongoMemoryServer.create();
      MONGO_URI = mem.getUri();
      await mongoose.connect(MONGO_URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 10000, family: 4 });
      initUploadBucket();
      DB_READY = true;
      console.log(`MongoMemoryServer started. Using in-memory DB "${DB_NAME}"`);
      await ensureDefaultAdmin();
    } catch (err) {
      console.error('Failed to start in-memory MongoDB:', err.message);
      process.exit(1);
    }
  })();
} else if (!NO_DB && MONGO_URI) {
  (async () => {
    try {
      await mongoose.connect(MONGO_URI, {
        dbName: DB_NAME,
        serverSelectionTimeoutMS: 10000,
        family: 4
      });
      initUploadBucket();
      DB_READY = true;
      console.log(`MongoDB connected to database "${DB_NAME}"`);
      await ensureDefaultAdmin();
    } catch (err) {
      const code = err && (err.code || err.codeName || err.name);
      console.error('Failed to connect to MongoDB:', code ? `${code}: ${err.message}` : err.message);
      console.error('Tip: If using Atlas/Compass, ensure your password is URL-encoded and add authSource=admin if needed.');
      process.exit(1);
    }
  })();
} else if (NO_DB) {
  console.warn('NO_DB=true; skipping MongoDB connection. All DB-backed routes will return 503.');
}

// --- User model
const { User, Admin, Book, Loan, Visit, Hours, PasswordReset } = require('./models');
// Models loaded from ./models (legacy inline schema removed)

// Separate Admin collection (loaded from ./models)

async function ensureDefaultAdmin() {
  const rawEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const email = rawEmail ? String(rawEmail).trim().toLowerCase() : '';
  const adminId = String(process.env.ADMIN_ID || process.env.ADMIN_STUDENT_ID || '03-2324-03224').trim();
  const fullName = String(process.env.ADMIN_NAME || 'Librarian').trim() || 'Librarian';
  const password = process.env.ADMIN_PASSWORD || 'Password123';

  const lookups = [];
  if (adminId) lookups.push({ adminId });
  if (email) lookups.push({ email });

  const existing = lookups.length ? await Admin.findOne({ $or: lookups }).lean() : null;
  if (existing) {
    const updates = {};
    if (email && !existing.email) updates.email = email;
    if (existing.role !== 'librarian') updates.role = 'librarian';
    if (adminId && existing.adminId !== adminId && STUDENT_ID_REGEX.test(adminId)) {
      updates.adminId = adminId;
    }
    if (Object.keys(updates).length) {
      await Admin.updateOne({ _id: existing._id }, { $set: updates });
    }
    return;
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const toCreate = {
    adminId,
    fullName,
    role: 'librarian',
    passwordHash
  };
  if (email) toCreate.email = email;

  try {
    await Admin.create(toCreate);
    console.log(`Created default admin (librarian) with Admin ID ${adminId}`);
  } catch (err) {
    if (err && (err.code === 11000 || err.code === 11001)) {
      console.warn('Default admin already exists, skipping bootstrap account creation.');
    } else {
      throw err;
    }
  }
}

// Additional models loaded from ./models

//

//

//

// Password reset tokens model loaded from ./models

// --- Health
app.get('/api/health', async (_req, res) => {
  const dbReady = NO_DB ? false : (mongoose.connection.readyState === 1 || DB_READY);
  return res.status(200).json({ ok: true, db: dbReady, noDbMode: NO_DB, time: new Date().toISOString() });
});

// API root index for human checks
app.get(['/api', '/api/'], (_req, res) => {
  res.json({
    ok: true,
    name: 'LibReport API',
    health: '/api/health',
    auth: {
      signup: { method: 'POST', path: '/api/auth/signup' },
      login: { method: 'POST', path: '/api/auth/login' },
      adminSignup: { method: 'POST', path: '/api/auth/admin-signup' }
    },
    time: new Date().toISOString()
  });
});

// Friendly hints for common mistaken GET requests to POST-only endpoints
app.get('/api/auth/signup', (_req, res) => {
  res.status(405).json({ error: 'Method Not Allowed. Use POST /api/auth/signup' });
});
app.get('/api/auth/login', (_req, res) => {
  res.status(405).json({ error: 'Method Not Allowed. Use POST /api/auth/login' });
});

// In NO_DB mode, short-circuit all DB-backed routes with 503 Service Unavailable
if (NO_DB) {
  app.use((req, res, next) => {
    const allow = req.path === '/api' || req.path === '/api/' || req.path === '/api/health';
    if (allow) return next();
    return res.status(503).json({ error: 'Database disabled (NO_DB=true)' });
  });
}

// --- Micro-cache for read-heavy GET endpoints (15s TTL)
const microCache = new Map();
const TTL_MS = 15_000;
function cacheKey(req) { return `${req.method}:${req.originalUrl}`; }
function cacheable(path) {
  return (
    path.startsWith('/api/books/library') ||
    path.startsWith('/api/reports/') ||
    path === '/api/health' ||
    path.startsWith('/api/books/lookup') ||
    path.startsWith('/api/hours') ||
    path.startsWith('/api/dashboard') ||
    path.startsWith('/api/heatmap/visits')
  );
}
app.use((req, res, next) => {
  if (req.method !== 'GET' || !cacheable(req.path)) return next();
  const key = cacheKey(req);
  const hit = microCache.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) {
    res.set('X-Micro-Cache', 'HIT');
    return res.status(hit.status).json(hit.body);
  }
  const json = res.json.bind(res);
  res.json = (body) => {
    try {
      microCache.set(key, { body, status: res.statusCode || 200, expires: now + TTL_MS });
      res.set('X-Micro-Cache', 'MISS');
    } catch {}
    return json(body);
  };
  next();
});

// --- Admin-only global guard for API (except health and auth)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  const open =
    req.path === '/api' ||
    req.path === '/api/' ||
    req.path === '/api/health' ||
    req.path.startsWith('/api/auth/');
  if (open) return next();

  // Routes that any authenticated user (students or librarians) can access
  const sharedAuthPaths = [
    '/api/books/library',
    '/api/books/lookup',
    '/api/hours'
  ];
  if (sharedAuthPaths.some((p) => req.path.startsWith(p))) {
    return authRequired(req, res, next);
  }

  // Student specific APIs
  if (req.path.startsWith('/api/student/')) {
    return studentRequired(req, res, next);
  }

  if (!NO_DB && !(mongoose.connection.readyState === 1 || DB_READY)) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  return adminRequired(req, res, next);
});
// --- Auth helpers ---
function signToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token) return res.status(401).json({ error: 'missing token' });
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

function adminRequired(req, res, next) {
  return authRequired(req, res, () => {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'librarian' && role !== 'librarian_staff') {
      return res.status(403).json({ error: 'admin role required' });
    }
    return next();
  });
}

// Stricter admin middleware: only full admins and librarians
// Used for managing admin accounts so librarian_staff cannot access
function elevatedAdminRequired(req, res, next) {
  return authRequired(req, res, () => {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'librarian') {
      return res.status(403).json({ error: 'librarian or admin role required' });
    }
    return next();
  });
}

function studentRequired(req, res, next) {
  return authRequired(req, res, () => {
    const role = req.user?.role;

    if (role !== 'student' && role !== 'librarian' && role !== 'admin' && role !== 'librarian_staff') {

      return res.status(403).json({ error: 'student role required' });
    }
    return next();
  });
}

// --- Auth: Student Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    if (!NO_DB && !(mongoose.connection.readyState === 1 || DB_READY)) {
      return res.status(503).json({ error: 'Database not ready' });
    }
    const { studentId, email, fullName, password, confirmPassword } = req.body || {};
    if (!studentId || !email || !fullName || !password || !confirmPassword) {
      return res.status(400).json({ error: 'studentId, email, fullName, password, confirmPassword required' });
    }
    if (String(password) !== String(confirmPassword)) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (String(password).length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 chars and contain letters and numbers' });
    }

    const studentIdNorm = String(studentId).trim();
    const emailNorm = String(email).trim().toLowerCase();
    const fullNameNorm = String(fullName).trim();

    if (!STUDENT_ID_REGEX.test(studentIdNorm)) {
      return res.status(400).json({ error: 'Student ID must match 00-0000-000000 pattern' });

    }
    if (!validator.isEmail(emailNorm)) {
      return res.status(400).json({ error: 'Email must be valid' });
    }
    if (!/^[A-Za-z .'-]+$/.test(fullNameNorm)) {
      return res.status(400).json({ error: 'Full name may contain letters, spaces, apostrophes, hyphens, and periods only' });
    }

    const existing = await User.findOne({
      $or: [
        { studentId: studentIdNorm },
        { email: emailNorm }
      ]
    }).lean();
    if (existing) {
      return res.status(409).json({ error: 'studentId or email already exists' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const doc = await User.create({
      studentId: studentIdNorm,
      email: emailNorm,
      fullName: fullNameNorm,
      name: fullNameNorm,
      passwordHash,
      role: 'student',
      status: 'active'
    });
    const token = signToken(doc);
    return res.status(201).json({
      token,
      user: {
        id: String(doc._id),
        studentId: doc.studentId,
        email: doc.email,
        fullName: doc.fullName,
        role: doc.role
      }
    });
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Signup failed' });
  }
});
// --- Admin Signup (enabled only if no admins yet, or ALLOW_ADMIN_SIGNUP=true)
app.post('/api/auth/admin-signup', async (req, res) => {
  try {
    const allow = String(process.env.ALLOW_ADMIN_SIGNUP || '').toLowerCase() === 'true';
    const existing = await Admin.estimatedDocumentCount();
    if (!allow && existing > 0) return res.status(403).json({ error: 'Admin signup is disabled' });

    const { adminId, fullName, email, password, confirmPassword } = req.body || {};
    if (!adminId || !fullName || !password || !confirmPassword) return res.status(400).json({ error: 'adminId, fullName, password, confirmPassword required' });
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });
    if (String(password).length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return res.status(400).json({ error: 'Password must be at least 8 chars and contain letters and numbers' });

    const adminIdNorm = String(adminId).trim();
    const emailNorm = email ? String(email).trim().toLowerCase() : undefined;
    const fullNameNorm = String(fullName).trim();
    if (!STUDENT_ID_REGEX.test(adminIdNorm)) return res.status(400).json({ error: 'Admin ID must match 00-0000-000000 pattern' });
    if (email && !validator.isEmail(emailNorm)) return res.status(400).json({ error: 'Email must be valid' });

    const exists = await Admin.findOne({ $or: [ { adminId: adminIdNorm }, emailNorm ? { email: emailNorm } : null ].filter(Boolean) }).lean();
    if (exists) return res.status(409).json({ error: 'adminId or email already exists' });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const doc = await Admin.create({ adminId: adminIdNorm, email: emailNorm, fullName: fullNameNorm, role: 'librarian', passwordHash });
    const token = signToken(doc);
    return res.status(201).json({ token, user: { id: String(doc._id), studentId: doc.adminId, email: doc.email, fullName: doc.fullName, role: doc.role } });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

});

// --- Auth: Login (studentId or email + password)
app.post('/api/auth/login', async (req, res) => {
  const { password, studentId } = req.body || {};
  if (!studentId || !password) return res.status(400).json({ error: 'studentId and password required' });
  if (!NO_DB && !(mongoose.connection.readyState === 1 || DB_READY)) {
    return res.status(503).json({ error: 'Database not ready' });
  }

  const lookup = String(studentId).trim();
  let account = null;
  let isAdmin = false;

  if (STUDENT_ID_REGEX.test(lookup)) {

    account = await Admin.findOne({ adminId: lookup });
    if (account) isAdmin = true;
    if (!account) account = await User.findOne({ studentId: lookup });
  }
  if (!account && lookup.includes('@')) {
    account = await Admin.findOne({ email: lookup.toLowerCase() });
    if (account) isAdmin = true;
    if (!account) account = await User.findOne({ email: lookup.toLowerCase() });
  }
  if (!account) {
    // Final fallback: allow admins to log in with legacy studentId without dashes
    const digitsOnly = lookup.replace(/[^0-9]/g, '');
    if (digitsOnly.length === 11) {
      const dashed = `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6)}`;
      account = await Admin.findOne({ adminId: dashed });
      if (account) isAdmin = true;
      if (!account) account = await User.findOne({ studentId: dashed });
    }
    if (!account) {
      account = await Admin.findOne({ adminId: digitsOnly });
      if (account) isAdmin = true;
      if (!account) account = await User.findOne({ studentId: digitsOnly });
    }
  }
  if (!account) return res.status(401).json({ error: 'invalid credentials' });

  const ok = await bcrypt.compare(String(password), account.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const role = account.role || (isAdmin ? 'librarian' : 'student');
  const baseAccount = typeof account.toObject === 'function' ? account.toObject() : account;
  const token = signToken({ ...baseAccount, role });
  const payload = {
    id: String(account._id),
    studentId: account.adminId || account.studentId,
    email: account.email,
    fullName: account.fullName,
    role
  };
  return res.json({ token, user: payload });
});

// Current user info
app.get('/api/auth/me', authRequired, async (req, res) => {
  let admin = await Admin.findById(req.user.sub).lean();
  if (admin) return res.json({ id: String(admin._id), studentId: admin.adminId, email: admin.email, fullName: admin.fullName, role: admin.role });
  const user = await User.findById(req.user.sub).lean();
  if (!user) return res.status(404).json({ error: 'not found' });
  return res.json({ id: String(user._id), studentId: user.studentId, email: user.email, fullName: user.fullName, role: user.role });
});

// --- Student self-service endpoints
app.get('/api/student/me', studentRequired, async (req, res) => {
  const user = await User.findById(req.user.sub).lean();
  if (!user) return res.status(404).json({ error: 'not found' });
  return res.json({
    id: String(user._id),
    studentId: user.studentId,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
    role: user.role || 'student',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  });
});

// --- Admins (librarians) CRUD
// Only accessible by librarian/admin (not librarian_staff)
app.get('/api/admins', elevatedAdminRequired, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = q ? { $or: [ { adminId: new RegExp(q, 'i') }, { fullName: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') } ] } : {};
  const items = await Admin.find(filter).select('adminId fullName email role status createdAt').limit(200).sort({ createdAt: -1 }).lean();
  res.json(items);
});

app.post('/api/admins', elevatedAdminRequired, async (req, res) => {
  try {
    const { adminId, email, fullName, password, role } = req.body || {};
    if (!adminId || !fullName || !password) return res.status(400).json({ error: 'adminId, fullName, password required' });
    const adminIdNorm = String(adminId).trim();
    const emailNorm = email ? String(email).trim().toLowerCase() : undefined;
    const fullNameNorm = String(fullName).trim();
    if (!STUDENT_ID_REGEX.test(adminIdNorm)) {
      return res.status(400).json({ error: 'adminId must match 00-0000-000000 pattern' });
    }
    const exists = await Admin.findOne({ $or: [ { adminId: adminIdNorm }, emailNorm ? { email: emailNorm } : null ].filter(Boolean) });
    if (exists) return res.status(409).json({ error: 'adminId or email already exists' });
    const allowedRoles = ['librarian', 'librarian_staff'];
    const normalizedRole = allowedRoles.includes(role) ? role : 'librarian_staff';
    const passwordHash = await bcrypt.hash(String(password), 10);
    const doc = await Admin.create({ adminId: adminIdNorm, email: emailNorm, fullName: fullNameNorm, role: normalizedRole, passwordHash });
    res.status(201).json({ id: String(doc._id), adminId: doc.adminId, fullName: doc.fullName, email: doc.email, role: doc.role });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.patch('/api/admins/:id', elevatedAdminRequired, async (req, res) => {
  try {
    const update = {};
    if (req.body.fullName) update.fullName = String(req.body.fullName);
    if (req.body.email !== undefined) update.email = req.body.email ? String(req.body.email).toLowerCase() : undefined;
    if (req.body.status) update.status = String(req.body.status);
    if (req.body.role) {
      const allowedRoles = ['librarian', 'librarian_staff'];
      if (!allowedRoles.includes(req.body.role)) {
        return res.status(400).json({ error: 'invalid role' });
      }
      update.role = req.body.role;
    }
    if (req.body.newPassword) update.passwordHash = await bcrypt.hash(String(req.body.newPassword), 10);
    const doc = await Admin.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ id: String(doc._id), adminId: doc.adminId, fullName: doc.fullName, email: doc.email, role: doc.role, status: doc.status });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admins/:id', elevatedAdminRequired, async (req, res) => {
  const out = await Admin.findByIdAndDelete(req.params.id).lean();
  if (!out) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// Request password reset (returns token for demo; normally emailed)
app.post('/api/auth/request-reset', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) return res.status(404).json({ error: 'user not found' });
  const token = crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await PasswordReset.create({ userId: user._id, tokenHash, expiresAt });
  // For demo we return the token; in production, send by email.
  return res.json({ ok: true, uid: String(user._id), token, expiresAt });
});

// Perform password reset
app.post('/api/auth/reset', async (req, res) => {
  const { uid, token, newPassword } = req.body || {};
  if (!uid || !token || !newPassword) return res.status(400).json({ error: 'uid, token, newPassword required' });
  if (String(newPassword).length < 8) return res.status(400).json({ error: 'password must be at least 8 chars' });
  let userId;
  try { userId = new mongoose.Types.ObjectId(String(uid)); } catch { return res.status(400).json({ error: 'invalid uid' }); }
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const rec = await PasswordReset.findOne({ userId, tokenHash, used: false, expiresAt: { $gt: new Date() } });
  if (!rec) return res.status(400).json({ error: 'invalid or expired token' });
  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await User.findByIdAndUpdate(userId, { passwordHash });
  await PasswordReset.updateOne({ _id: rec._id }, { $set: { used: true, usedAt: new Date() } });
  await PasswordReset.updateMany({ userId, used: false }, { $set: { used: true, usedAt: new Date() } });
  return res.json({ ok: true });
});

// --- Dashboard
app.get('/api/dashboard', authRequired, async (_req, res) => {
  const [users, books, activeLoans, visitsToday] = await Promise.all([
    User.countDocuments(),
    Book.countDocuments(),
    Loan.countDocuments({ returnedAt: null }),
    Visit.countDocuments({ enteredAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } })
  ]);

  const topBooks = await Loan.aggregate([
    { $group: { _id: '$bookId', borrows: { $sum: 1 } } },
    { $sort: { borrows: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    { $project: { _id: 0, bookId: '$_id', title: '$book.title', author: '$book.author', borrows: 1 } }
  ]);

  res.json({ counts: { users, books, activeLoans, visitsToday }, topBooks });
});

// --- Usage Heatmaps (visits)
app.get('/api/heatmap/visits', authRequired, async (req, res) => {
  const days = Number(req.query.days || 30);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const branch = req.query.branch;
  const match = { enteredAt: { $gte: since } };
  if (branch) match.branch = String(branch);

  const data = await Visit.aggregate([
    { $match: match },
    { $addFields: { dow: { $dayOfWeek: '$enteredAt' }, hour: { $hour: '$enteredAt' } } },
    { $group: { _id: { dow: '$dow', hour: '$hour' }, count: { $sum: 1 } } },
    { $project: { _id: 0, dow: '$_id.dow', hour: '$_id.hour', count: 1 } },
    { $sort: { dow: 1, hour: 1 } }
  ]);
  res.json({ since, items: data });
});

// --- Tracker: visit enter by studentId or barcode
app.post('/api/visit/enter', async (req, res) => {
  const { studentId, barcode, branch = 'Main' } = req.body || {};
  if (!studentId && !barcode) return res.status(400).json({ error: 'studentId or barcode required' });

  const normalizedStudentId = studentId ? String(studentId).trim() : null;
  const normalizedBarcode = barcode ? String(barcode).trim() : null;

  let user = null;
  if (normalizedStudentId) {
    user = await User.findOne({ studentId: normalizedStudentId }).lean();
  } else if (normalizedBarcode) {
    user = await User.findOne({ barcode: normalizedBarcode }).lean();
  }

  const now = new Date();
  const orFilters = [];
  if (user && user._id) orFilters.push({ userId: user._id });
  if (normalizedStudentId) orFilters.push({ studentId: normalizedStudentId });
  if (normalizedBarcode) orFilters.push({ barcode: normalizedBarcode });
  if (!orFilters.length) return res.status(400).json({ error: 'invalid payload' });

  const dupe = await Visit.findOne({
    $or: orFilters,
    enteredAt: { $gt: new Date(now.getTime() - 2 * 60 * 1000) }
  }).lean();

  if (!dupe) {
    await Visit.create({
      userId: user ? user._id : undefined,
      studentId: normalizedStudentId || (user ? user.studentId : undefined),
      barcode: normalizedBarcode || undefined,
      branch,
      enteredAt: now
    });
  }

  const displayName = user?.fullName || normalizedStudentId || normalizedBarcode || 'Unknown';
  res.json({ ok: true, deduped: !!dupe, user: { id: user?._id ? String(user._id) : null, fullName: displayName } });
});

// --- Tracker: visit exit (marks most recent active visit)
app.post('/api/visit/exit', async (req, res) => {
  const { studentId, barcode } = req.body || {};
  if (!studentId && !barcode) return res.status(400).json({ error: 'studentId or barcode required' });
  const filter = studentId ? { studentId: String(studentId) } : { barcode: String(barcode) };
  const doc = await Visit.findOneAndUpdate({ ...filter, exitedAt: null }, { exitedAt: new Date() }, { sort: { enteredAt: -1 }, new: true });
  if (!doc) return res.status(404).json({ error: 'active visit not found' });
  res.json({ ok: true, id: String(doc._id), exitedAt: doc.exitedAt });
});

// --- Recent visits feed (for tracker)
app.get('/api/visits/recent', authRequired, async (req, res) => {
  const minutes = Number(req.query.minutes || 60);
  const since = new Date(Date.now() - minutes * 60 * 1000);
  const items = await Visit.aggregate([
    { $match: { enteredAt: { $gte: since } } },
    { $sort: { enteredAt: -1 } },
    { $limit: 50 },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, studentId: 1, barcode: 1, branch: 1, enteredAt: 1, exitedAt: 1, name: '$user.fullName' } }
  ]);
  res.json({ items });
});

// Tracker dashboard stats (visits + loans snapshot)
app.get('/api/tracker/stats', adminRequired, async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [inbound, outbound, overdue, activeVisits, activeLoans] = await Promise.all([
    Visit.countDocuments({ enteredAt: { $gte: startOfDay } }),
    Visit.countDocuments({ exitedAt: { $ne: null, $gte: startOfDay } }),
    Loan.countDocuments({ returnedAt: null, dueAt: { $lt: now } }),
    Visit.countDocuments({ exitedAt: null }),
    Loan.countDocuments({ returnedAt: null })
  ]);

  res.json({ inbound, outbound, overdue, active: activeVisits, activeLoans });
});

// Recent loan activity for tracker quick log
app.get('/api/tracker/logs', adminRequired, async (req, res) => {
  const limitRaw = Number(req.query.limit || 25);
  const daysRaw = Number(req.query.days || 30);
  const limit = Math.max(1, Math.min(limitRaw, 100));
  const days = Math.max(1, Math.min(daysRaw, 180));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const docs = await Loan.aggregate([
    { $match: { borrowedAt: { $gte: since } } },
    { $sort: { borrowedAt: -1 } },
    { $limit: limit },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'books', localField: 'bookId', foreignField: '_id', as: 'book' } },
    { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        borrowedAt: 1,
        dueAt: 1,
        returnedAt: 1,
        userName: '$user.fullName',
        studentId: '$user.studentId',
        bookTitle: '$book.title'
      }
    }
  ]).exec();

  const now = new Date();
  const items = docs.map((doc) => {
    let status = 'Borrowed';
    if (doc.returnedAt) status = 'Returned';
    else if (doc.dueAt && doc.dueAt < now) status = 'Overdue';
    return {
      id: String(doc._id),
      status,
      borrowedAt: doc.borrowedAt,
      dueAt: doc.dueAt,
      returnedAt: doc.returnedAt,
      material: doc.bookTitle || 'Unknown Material',
      user: doc.userName || doc.studentId || 'Unknown Borrower'
    };
  });

  res.json({ items });
});

// --- Public library listing (auth), supports q and limit
app.get('/api/books/library', authRequired, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(Number(req.query.limit || 24), 100);
  const skip = Math.max(Number(req.query.skip || 0), 0);
  const tag = String(req.query.tag || '').trim();
  const withPdf = String(req.query.withPdf || '').toLowerCase() === 'true';

  const filter = {};
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ title: regex }, { author: regex }, { bookCode: regex }, { isbn: regex }];
  }
  if (tag) {
    filter.$and = filter.$and || [];
    filter.$and.push({ $or: [{ department: tag }, { genre: tag }, { tags: tag }] });
  }
  if (withPdf) {
    filter.$and = filter.$and || [];
    filter.$and.push({ pdfPath: { $exists: true, $ne: '' } });
  }

  const docs = await Book.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const items = docs.map((doc) => ({
    ...doc,
    imageUrl: doc.coverImagePath || null,
    pdfUrl: doc.pdfPath || null
  }));

  res.json({ items });
});

// --- Books CRUD (Admin)
app.post('/api/books', adminRequired, async (req, res) => {
  const {
    title,
    author,
    isbn,
    bookCode,
    department,
    department,
    genre,
    tags,
    totalCopies,
    availableCopies,
    coverImageData,
    coverImageName,
    pdfData,
    pdfName
  } = req.body || {};

  try {
    const normalizedTitle = String(title || '').trim();
    const normalizedAuthor = String(author || '').trim();
    const normalizedCode = String(bookCode || '').trim();
    if (!normalizedTitle || !normalizedAuthor || !normalizedCode) {
      return res.status(400).json({ error: 'title, author, and bookCode are required' });
    }

    const totalParsed = parseIntField(totalCopies, 'totalCopies');
    const totalValue = totalParsed === null ? 1 : totalParsed;
    const availableParsed = parseIntField(availableCopies, 'availableCopies');
    let availableValue = availableParsed === null ? totalValue : availableParsed;
    if (availableValue > totalValue) availableValue = totalValue;

    const normalizedDepartment = typeof department === 'string' ? department.trim() : '';
    const normalizedGenre = typeof genre === 'string' ? genre.trim() : '';
    const primaryTag = normalizedGenre || normalizedDepartment;
    const tagList = parseTagsInput(tags, primaryTag);

    const payload = {
      title: normalizedTitle,
      author: normalizedAuthor,
      isbn: isbn ? String(isbn).trim() : undefined,
      bookCode: normalizedCode,
      department: normalizedDepartment || undefined,
      genre: normalizedGenre || undefined,
      totalCopies: totalValue,
      availableCopies: availableValue,
      tags: tagList
    };

    const storedUploads = [];
    try {
      if (coverImageData) {
        const coverInfo = await storeBase64File({
          base64: coverImageData,
          originalName: coverImageName,
          allowedMime: ['image/png', 'image/jpeg', 'image/webp'],
          maxBytes: 5 * 1024 * 1024,
          subDir: 'covers'
        });
        payload.coverImagePath = coverInfo.storedPath;
        payload.coverImageOriginalName = coverInfo.originalName;
        payload.coverImageFileId = coverInfo.fileId;
        payload.coverImageMime = coverInfo.mime;
        storedUploads.push(coverInfo);
      }
      if (pdfData) {
        const pdfInfo = await storeBase64File({
          base64: pdfData,
          originalName: pdfName,
          allowedMime: ['application/pdf'],
          maxBytes: 25 * 1024 * 1024,
          subDir: 'pdfs'
        });
        payload.pdfPath = pdfInfo.storedPath;
        payload.pdfOriginalName = pdfInfo.originalName;
        payload.pdfFileId = pdfInfo.fileId;
        payload.pdfMime = pdfInfo.mime;
        storedUploads.push(pdfInfo);
      }

      const book = await Book.create(payload);
      res.status(201).json(book);
    } catch (err) {
      for (const stored of storedUploads) {
        await removeStoredFile(stored);
      }
      throw err;
    }
  } catch (e) {
    if (e && (e.code === 11000 || e.code === 11001)) {
      const field = e?.keyPattern ? Object.keys(e.keyPattern)[0] : null;
      if (field === 'bookCode') {
        return res.status(409).json({ error: 'Book code already exists. Please choose a unique code.' });
      }
    }
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/books', adminRequired, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = {};
  const andConditions = [];
  if (q) {
    const escaped = q.replace(/[-/\^$*+?.()|[\]{}]/g, '\$&');
    const regex = new RegExp(escaped, 'i');
    andConditions.push({ $or: [{ title: regex }, { author: regex }, { bookCode: regex }] });
  }
  const tag = String(req.query.tag || '').trim();
  if (tag) {
    andConditions.push({ $or: [{ department: tag }, { genre: tag }, { tags: tag }] });
  }
  if (andConditions.length === 1) {
    Object.assign(filter, andConditions[0]);
  } else if (andConditions.length > 1) {
    filter.$and = andConditions;
  }
  const items = await Book.find(filter).sort({ createdAt: -1, _id: -1 }).limit(400).lean();
  res.json(items);
});

app.get('/api/books/:id', adminRequired, async (req, res) => {
  const item = await Book.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.patch('/api/books/:id', adminRequired, async (req, res) => {
  const {
    title,
    author,
    isbn,
    bookCode,
    genre,
    tags,
    totalCopies,
    availableCopies,
    coverImageData,
    coverImageName,
    pdfData,
    pdfName,
    coverRemoved
  } = req.body || {};

  let newCover;
  let newPdf;
  let oldCoverPath;
  let oldCoverFileId;
  let oldPdfPath;
  let oldPdfFileId;
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Not found' });

    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (!trimmed) throw new Error('title cannot be empty');
      book.title = trimmed;
    }
    if (author !== undefined) {
      const trimmed = String(author).trim();
      if (!trimmed) throw new Error('author cannot be empty');
      book.author = trimmed;
    }
    if (isbn !== undefined) {
      const trimmed = String(isbn).trim();
      book.isbn = trimmed || undefined;
    }
    if (bookCode !== undefined) {
      const trimmed = String(bookCode).trim();
      if (!trimmed) throw new Error('bookCode cannot be empty');
      book.bookCode = trimmed;
    }

    let nextDepartment = book.department;
    if (department !== undefined) {
      const trimmed = typeof department === 'string' ? department.trim() : '';
      nextDepartment = trimmed || undefined;
      book.department = nextDepartment;
    }

    let nextGenre = book.genre;
    if (genre !== undefined) {
      const trimmed = typeof genre === 'string' ? genre.trim() : '';
      nextGenre = trimmed || undefined;
      book.genre = nextGenre;
    }

    if (totalCopies !== undefined || availableCopies !== undefined) {
      let totalValue = book.totalCopies;
      let availableValue = book.availableCopies;
      if (totalCopies !== undefined) {
        const parsed = parseIntField(totalCopies, 'totalCopies');
        if (parsed !== null) totalValue = parsed;
      }
      if (availableCopies !== undefined) {
        const parsed = parseIntField(availableCopies, 'availableCopies');
        if (parsed !== null) availableValue = parsed;
      }
      if (availableValue > totalValue) availableValue = totalValue;
      book.totalCopies = totalValue;
      book.availableCopies = availableValue;
    }

    const removeCoverOnly = Boolean(coverRemoved && !coverImageData);
    if (removeCoverOnly && book.coverImagePath) {
      oldCoverPath = book.coverImagePath;
      oldCoverFileId = book.coverImageFileId;
      book.coverImagePath = undefined;
      book.coverImageOriginalName = undefined;
      book.coverImageFileId = undefined;
      book.coverImageMime = undefined;
    }

    if (coverImageData) {
      newCover = await storeBase64File({
        base64: coverImageData,
        originalName: coverImageName,
        allowedMime: ['image/png', 'image/jpeg', 'image/webp'],
        maxBytes: 5 * 1024 * 1024,
        subDir: 'covers'
      });
      oldCoverPath = book.coverImagePath;
      oldCoverFileId = book.coverImageFileId;
      book.coverImagePath = newCover.storedPath;
      book.coverImageOriginalName = newCover.originalName;
      book.coverImageFileId = newCover.fileId;
      book.coverImageMime = newCover.mime;
    }
    if (pdfData) {
      newPdf = await storeBase64File({
        base64: pdfData,
        originalName: pdfName,
        allowedMime: ['application/pdf'],
        maxBytes: 25 * 1024 * 1024,
        subDir: 'pdfs'
      });
      oldPdfPath = book.pdfPath;
      oldPdfFileId = book.pdfFileId;
      book.pdfPath = newPdf.storedPath;
      book.pdfOriginalName = newPdf.originalName;
      book.pdfFileId = newPdf.fileId;
      book.pdfMime = newPdf.mime;
    }

    const fallbackTag = nextGenre || nextDepartment;

    if (tags !== undefined) {
      book.tags = parseTagsInput(tags, fallbackTag);
    } else if (genre !== undefined || department !== undefined) {
      book.tags = parseTagsInput([], fallbackTag);
    }

    await book.save();

    if (removeCoverOnly && oldCoverPath) {
      await removeStoredFile({ storedPath: oldCoverPath, fileId: oldCoverFileId });
    }
    if (newCover && oldCoverPath && oldCoverPath !== newCover.storedPath) {
      await removeStoredFile({ storedPath: oldCoverPath, fileId: oldCoverFileId });
    }
    if (newPdf && oldPdfPath && oldPdfPath !== newPdf.storedPath) {
      await removeStoredFile({ storedPath: oldPdfPath, fileId: oldPdfFileId });
    }

    res.json(book.toObject());
  } catch (e) {
    if (newCover) await removeStoredFile(newCover);
    if (newPdf) await removeStoredFile(newPdf);
    if (e && (e.code === 11000 || e.code === 11001)) {
      const field = e?.keyPattern ? Object.keys(e.keyPattern)[0] : null;
      if (field === 'bookCode') {
        return res.status(409).json({ error: 'Book code already exists. Please choose a unique code.' });
      }
    }
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/books/:id', adminRequired, async (req, res) => {
  const out = await Book.findByIdAndDelete(req.params.id).lean();
  if (!out) return res.status(404).json({ error: 'Not found' });
  if (out.coverImagePath || out.coverImageFileId) {
    await removeStoredFile({ storedPath: out.coverImagePath, fileId: out.coverImageFileId });
  }
  if (out.pdfPath || out.pdfFileId) {
    await removeStoredFile({ storedPath: out.pdfPath, fileId: out.pdfFileId });
  }
  res.status(204).send();
});

app.get(['/api/files/:id', '/api/files/:id/:name'], async (req, res) => {
  if (NO_DB) return res.status(503).json({ error: 'Database disabled (NO_DB=true)' });
  if (!uploadBucket) return res.status(503).json({ error: 'File storage is not ready yet' });

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid file identifier' });
  }

  const fileId = new mongoose.Types.ObjectId(id);
  try {
    const filesCollection = mongoose.connection.db.collection('uploads.files');
    const fileDoc = await filesCollection.findOne({ _id: fileId });
    if (!fileDoc) return res.status(404).json({ error: 'File not found' });

    const contentType = fileDoc.contentType || fileDoc.metadata?.mime || 'application/octet-stream';
    res.set('Content-Type', contentType);

    const download = String(req.query.download || '').toLowerCase();
    const shouldDownload = download === '1' || download === 'true';
    if (shouldDownload) {
      const rawName =
        req.params.name ||
        fileDoc.metadata?.originalName ||
        fileDoc.filename ||
        `file-${id}`;
      const headerName = sanitizeFilename(rawName) || `file-${id}`;
      res.set(
        'Content-Disposition',
        `attachment; filename="${headerName}"`
      );
    }

    const stream = uploadBucket.openDownloadStream(fileId);
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Failed to read file' });
      } else {
        res.destroy(err);
      }
    });
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
});

// --- Loans
async function markLoanAsReturned(loan) {
  if (!loan) {
    return { ok: false, status: 404, message: 'Active loan not found' };
  }
  if (loan.returnedAt) {
    return { ok: false, status: 400, message: 'Already returned' };
  }

  loan.returnedAt = new Date();
  await loan.save();
  if (loan.bookId) {
    await Book.findByIdAndUpdate(loan.bookId, { $inc: { availableCopies: 1 } });
  }

  return { ok: true, loan };
}

app.post('/api/loans/borrow', adminRequired, async (req, res) => {
  const { userId, bookId, days: daysRaw } = req.body || {};
  if (!userId || !bookId) return res.status(400).json({ error: 'userId and bookId required' });
  const [user, book] = await Promise.all([
    User.findById(userId),
    Book.findById(bookId)
  ]);
  if (!user || !book) return res.status(404).json({ error: 'User or Book not found' });
  if (book.availableCopies <= 0) return res.status(400).json({ error: 'No available copies' });
  const chosenDays = Number(daysRaw ?? DEFAULT_LOAN_DAYS) || DEFAULT_LOAN_DAYS;
  const dueAt = new Date(Date.now() + chosenDays * 24 * 60 * 60 * 1000);
  const loan = await Loan.create({ userId: user._id, bookId: book._id, dueAt });
  await Book.findByIdAndUpdate(book._id, { $inc: { availableCopies: -1 } });
  res.status(201).json(loan);
});

// Student self-service borrowing
app.post('/api/student/borrow', studentRequired, async (req, res) => {
  const { bookId, days: daysRaw } = req.body || {};
  if (!bookId) return res.status(400).json({ error: 'bookId required' });
  
  const userId = req.user.sub;
  const [user, book] = await Promise.all([
    User.findById(userId),
    Book.findById(bookId)
  ]);
  
  if (!user || !book) return res.status(404).json({ error: 'User or Book not found' });
  if (book.availableCopies <= 0) return res.status(400).json({ error: 'No available copies' });
  
  // Check if student already has this book borrowed
  const existingLoan = await Loan.findOne({ 
    userId: user._id, 
    bookId: book._id, 
    returnedAt: null 
  });
  if (existingLoan) return res.status(400).json({ error: 'You already have this book borrowed' });
  
  const chosenDays = Number(daysRaw ?? DEFAULT_LOAN_DAYS) || DEFAULT_LOAN_DAYS;
  const dueAt = new Date(Date.now() + chosenDays * 24 * 60 * 60 * 1000);
  const loan = await Loan.create({ userId: user._id, bookId: book._id, dueAt });
  await Book.findByIdAndUpdate(book._id, { $inc: { availableCopies: -1 } });
  
  res.status(201).json({
    id: loan._id,
    bookId: book._id,
    title: book.title,
    author: book.author,
    borrowedAt: loan.borrowedAt,
    dueAt: loan.dueAt
  });
});

app.post('/api/loans/return', adminRequired, async (req, res) => {
  const { loanId, userId, bookId } = req.body || {};
  const query = loanId ? { _id: loanId } : { userId, bookId, returnedAt: null };
  if (!query._id && (!query.userId || !query.bookId)) {
    return res.status(400).json({ error: 'loanId or userId/bookId required' });
  }

  const loan = await Loan.findOne(query);
  const result = await markLoanAsReturned(loan);
  if (!result.ok) return res.status(result.status).json({ error: result.message });
  res.json(result.loan);
});

app.post('/api/loans/:id/return', adminRequired, async (req, res) => {
  const { id } = req.params;
  let loan;
  try {
    loan = await Loan.findById(id);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid loan id' });
  }

  const result = await markLoanAsReturned(loan);
  if (!result.ok) return res.status(result.status).json({ error: result.message });
  res.json(result.loan);
});

// Student self-service return
app.post('/api/student/return', studentRequired, async (req, res) => {
  const { bookId } = req.body || {};
  if (!bookId) return res.status(400).json({ error: 'bookId required' });
  
  const userId = req.user.sub;
  const loan = await Loan.findOne({ 
    userId: new mongoose.Types.ObjectId(userId), 
    bookId: new mongoose.Types.ObjectId(bookId), 
    returnedAt: null 
  });
  
  const result = await markLoanAsReturned(loan);
  if (!result.ok) return res.status(result.status).json({ error: result.message });
  
  res.status(200).json({
    message: 'Book returned successfully',
    bookId: bookId,
    returnedAt: result.loan.returnedAt
  });
});

app.delete('/api/loans/:id', adminRequired, async (req, res) => {
  let loan;
  try {
    loan = await Loan.findById(req.params.id);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid loan id' });
  }

  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  const wasReturned = Boolean(loan.returnedAt);
  const bookId = loan.bookId;

  await Loan.deleteOne({ _id: loan._id });

  if (!wasReturned && bookId) {
    await Book.findByIdAndUpdate(bookId, { $inc: { availableCopies: 1 } });
  }

  return res.status(204).send();
});

// Active loans with user + book details (for Books Management UI)
app.get('/api/loans/active', adminRequired, async (_req, res) => {
  const now = new Date();
  const items = await Loan.aggregate([
    { $match: { returnedAt: null } },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $lookup: { from: 'books', localField: 'bookId', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    { $project: {
        _id: 1,
        title: '$book.title',
        student: '$user.fullName',
        borrowedAt: 1,
        dueAt: 1,
        status: { $cond: [ { $lt: ['$dueAt', now] }, 'Overdue', 'On Time' ] }
    } }
  ]).exec();
  res.json({ items });
});

app.get('/api/student/:id/borrowed', authRequired, async (req, res) => {
  let userId;
  try {
    userId = new mongoose.Types.ObjectId(String(req.params.id));
  } catch {
    return res.status(400).json({ error: 'invalid user id' });
  }

  const requesterRole = req.user?.role;
  const requesterId = String(req.user?.sub || '');
  const isAdmin = requesterRole === 'admin' || requesterRole === 'librarian';
  if (!isAdmin && requesterId !== String(userId)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const items = await Loan.aggregate([
    { $match: { userId, returnedAt: null } },
    { $lookup: { from: 'books', localField: 'bookId', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    { $project: { _id: 0, title: '$book.title', author: '$book.author', borrowedAt: 1, dueAt: 1 } }
  ]);
  res.json({ items });
});

// Student self-service borrowed books
app.get('/api/student/borrowed', studentRequired, async (req, res) => {
  const userId = req.user.sub;
  
  const items = await Loan.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), returnedAt: null } },
    { $lookup: { from: 'books', localField: 'bookId', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    { $project: { 
      _id: 1,
      bookId: '$book._id',
      title: '$book.title', 
      author: '$book.author',
      bookCode: '$book.bookCode',
      borrowedAt: 1, 
      dueAt: 1 
    } }
  ]);
  res.json({ books: items });
});

// Student self-service overdue books
app.get('/api/student/overdue-books', studentRequired, async (req, res) => {
  const userId = req.user.sub;
  const now = new Date();
  
  const items = await Loan.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId), 
        returnedAt: null,
        dueAt: { $lt: now }
      } 
    },
    { $lookup: { from: 'books', localField: 'bookId', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    { 
      $project: { 
        _id: 1,
        bookId: '$book._id',
        title: '$book.title', 
        author: '$book.author',
        bookCode: '$book.bookCode',
        borrowedAt: 1, 
        dueAt: 1,
        daysOverdue: { $floor: { $divide: [{ $subtract: [now, '$dueAt'] }, 86400000] } }
      } 
    }
  ]);
  
  // Add fine calculation (example: $1 per day overdue)
  const booksWithFines = items.map(book => ({
    ...book,
    fine: Math.max(0, book.daysOverdue * 1.00)
  }));
  
  res.json({ books: booksWithFines });
});

// Student self-service borrowing history
app.get('/api/student/borrowing-history', studentRequired, async (req, res) => {
  const userId = req.user.sub;
  
  const items = await Loan.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $lookup: { from: 'books', localField: 'bookId', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    { $sort: { borrowedAt: -1 } },
    { 
      $project: { 
        _id: 1,
        bookId: '$book._id',
        title: '$book.title', 
        author: '$book.author',
        bookCode: '$book.bookCode',
        borrowedAt: 1, 
        dueAt: 1,
        returnedAt: 1,
        status: {
          $cond: {
            if: { $ne: ['$returnedAt', null] },
            then: 'Returned',
            else: {
              $cond: {
                if: { $lt: ['$dueAt', new Date()] },
                then: 'Overdue',
                else: 'Active'
              }
            }
          }
        }
      } 
    }
  ]);
  
  res.json({ history: items });
});

// --- Reports
app.get('/api/reports/top-books', authRequired, async (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || 10), 50));
  const daysRaw = Number(req.query.days);
  const pipeline = [];
  if (!Number.isNaN(daysRaw) && daysRaw > 0) {
    const since = new Date(Date.now() - daysRaw * 24 * 60 * 60 * 1000);
    pipeline.push({ $match: { borrowedAt: { $gte: since } } });
  }
  pipeline.push(
    { $group: { _id: '$bookId', borrows: { $sum: 1 } } },
    { $sort: { borrows: -1 } },
    { $limit: limit },
    { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    { $project: { _id: 0, bookId: '$_id', title: '$book.title', author: '$book.author', borrows: 1 } }
  );
  const data = await Loan.aggregate(pipeline);
  res.json({ items: data });
});

app.get('/api/reports/overdue', authRequired, async (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || 100), 500));
  const daysRaw = Number(req.query.days || 0);
  const dueMatch = { returnedAt: null, dueAt: { $lt: new Date() } };
  if (!Number.isNaN(daysRaw) && daysRaw > 0) {
    dueMatch.dueAt.$gte = new Date(Date.now() - daysRaw * 24 * 60 * 60 * 1000);
  }
  const items = await Loan.aggregate([
    { $match: dueMatch },
    { $sort: { dueAt: 1 } },
    { $limit: limit },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $lookup: { from: 'books', localField: 'bookId', foreignField: '_id', as: 'book' } },
    { $unwind: '$user' },
    { $unwind: '$book' },
    { $project: { _id: 0, user: '$user.fullName', title: '$book.title', dueAt: 1, borrowedAt: 1 } }
  ]);
  res.json({ items });
});

// --- Hours
app.get('/api/hours', authRequired, async (req, res) => {
  const branch = String(req.query.branch || 'Main');
  const items = await Hours.find({ branch }).sort({ dayOfWeek: 1 }).lean();
  res.json({ branch, items });
});

app.put('/api/hours/:branch/:day', adminRequired, async (req, res) => {
  const branch = String(req.params.branch);
  const day = Number(req.params.day);
  const { open, close } = req.body || {};
  if (!open || !close) return res.status(400).json({ error: 'open and close required' });
  const doc = await Hours.findOneAndUpdate(
    { branch, dayOfWeek: day },
    { branch, dayOfWeek: day, open, close },
    { new: true, upsert: true, runValidators: true }
  ).lean();
  res.json(doc);
});

// --- Admin: users list + role update
app.get('/api/admin/users', adminRequired, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = q ? { $or: [ { fullName: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }, { studentId: new RegExp(q, 'i') } ] } : {};
  const items = await User.find(filter).select('fullName email studentId role createdAt').limit(200).lean();
  res.json(items);
});

app.patch('/api/admin/users/:id/role', adminRequired, async (req, res) => {
  const { role } = req.body || {};
  if (!role) return res.status(400).json({ error: 'role required' });
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ id: String(user._id), role: user.role });
});

// --- Admin: toggle user status
app.patch('/api/admin/users/:id/status', adminRequired, async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true }).lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ id: String(user._id), status: user.status });
});

// --- Lookups
app.get('/api/users/lookup', authRequired, async (req, res) => {
  const { studentId, email, barcode } = req.query || {};
  const filter = studentId ? { studentId: String(studentId) } : email ? { email: String(email).toLowerCase() } : barcode ? { barcode: String(barcode) } : null;
  if (!filter) return res.status(400).json({ error: 'studentId, email, or barcode required' });
  const user = await User.findOne(filter).select('fullName email studentId role status').lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

app.get('/api/books/lookup', authRequired, async (req, res) => {
  const { isbn, q, code } = req.query || {};
  const filter = {};
  if (isbn) filter.isbn = String(isbn);
  if (code) filter.bookCode = String(code);
  if (q) filter.$or = [{ title: new RegExp(String(q), 'i') }, { author: new RegExp(String(q), 'i') }, { bookCode: new RegExp(String(q), 'i') }];
  const items = await Book.find(filter).limit(20).lean();
  res.json({ items });
});

// Static asset routes for legacy book files have been removed

const PORT = process.env.BACKEND_PORT || 4000;
app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));


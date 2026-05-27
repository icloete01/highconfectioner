import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import nodemailer from 'nodemailer';
import { randomInt } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const APP_ID = process.env.APP_ID || 'high-confectioner';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
const upload = multer({ dest: path.join(__dirname, 'uploads') });

const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function ensureUserSchema() {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS delivery_address TEXT`);
}

function toApiRow(row) {
  if (!row) return row;
  const { created_at, updated_at, password_hash, otp_code, otp_expires_at, reset_token, reset_token_expires_at, ...rest } = row;
  return {
    ...rest,
    created_date: created_at,
    updated_date: updated_at,
  };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function userPayload(row) {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    delivery_address: row.delivery_address || '',
  };
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [payload.sub]);
    req.user = rows[0] || null;
  } catch {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required', code: 'UNAUTHORIZED' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required', code: 'FORBIDDEN' });
  }
  next();
}

function assertAppId(req, res, next) {
  if (req.params.appId && req.params.appId !== APP_ID) {
    return res.status(404).json({ message: 'App not found' });
  }
  next();
}

// --- Public settings (AuthContext) ---
app.get('/api/apps/public/prod/public-settings/by-id/:appId', async (req, res) => {
  const { rows } = await pool.query('SELECT id, public_settings FROM apps WHERE id = $1', [req.params.appId]);
  if (!rows[0]) return res.status(404).json({ message: 'App not found' });
  res.json(rows[0]);
});

// --- Auth routes ---
const authRouter = express.Router({ mergeParams: true });
authRouter.use(assertAppId);

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.email_verified) {
    return res.status(401).json({ message: 'Email not verified' });
  }
  const access_token = signToken(user);
  res.json({ access_token, user: userPayload(user) });
});

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const otp = String(randomInt(100000, 999999));
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  try {
    await pool.query(
      `INSERT INTO users (email, password_hash, otp_code, otp_expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, hash, otp, expires]
    );
    console.log(`[OTP] ${email}: ${otp}`);
    let emailSent = false;
    if (mailer) {
      await mailer.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Verify your email',
        text: `Your verification code is: ${otp}`,
      });
      emailSent = true;
    }
    res.json({ ok: true, emailSent, otp: emailSent ? null : otp });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Email already registered' });
    throw e;
  }
});

authRouter.post('/verify-otp', async (req, res) => {
  const { email, otp_code } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || user.otp_code !== otp_code || new Date(user.otp_expires_at) < new Date()) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }
  await pool.query(
    `UPDATE users SET email_verified = true, otp_code = NULL, otp_expires_at = NULL WHERE id = $1`,
    [user.id]
  );
  const access_token = signToken(user);
  res.json({ access_token, user: userPayload({ ...user, email_verified: true }) });
});

authRouter.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  const otp = String(randomInt(100000, 999999));
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await pool.query(
    `UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE email = $3`,
    [otp, expires, email]
  );
  console.log(`[OTP] ${email}: ${otp}`);
  let emailSent = false;
  if (mailer) {
    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verify your email',
      text: `Your verification code is: ${otp}`,
    });
    emailSent = true;
  }
  res.json({ ok: true, emailSent, otp: emailSent ? null : otp });
});

authRouter.post('/reset-password-request', async (req, res) => {
  const { email } = req.body;
  const token = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query(
    `UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE email = $3`,
    [token, expires, email]
  );
  const link = `${process.env.APP_BASE_URL}/reset-password?token=${token}`;
  console.log(`[RESET] ${email}: ${link}`);
  if (mailer) {
    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset your password',
      text: `Reset your password: ${link}`,
    });
  }
  res.json({ ok: true });
});

authRouter.post('/reset-password', async (req, res) => {
  const { reset_token, new_password } = req.body;
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires_at > now()`,
    [reset_token]
  );
  if (!rows[0]) return res.status(400).json({ message: 'Invalid or expired reset token' });
  const hash = await bcrypt.hash(new_password, 10);
  await pool.query(
    `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2`,
    [hash, rows[0].id]
  );
  res.json({ ok: true });
});

app.use('/api/apps/:appId/auth', authRouter);

// --- User/me ---
app.get('/api/apps/:appId/entities/User/me', assertAppId, authMiddleware, requireAuth, (req, res) => {
  res.json(userPayload(req.user));
});

app.put('/api/apps/:appId/entities/User/me', assertAppId, authMiddleware, requireAuth, async (req, res) => {
  const { full_name, delivery_address } = req.body;
  const { rows } = await pool.query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         delivery_address = COALESCE($2, delivery_address),
         updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [full_name, delivery_address, req.user.id]
  );
  res.json(userPayload(rows[0]));
});

// --- Entity CRUD ---
const ENTITY_CONFIG = {
  Product: {
    table: 'products',
    sortDefault: '-created_at',
    list: async (user) => {
      if (user?.role === 'admin') {
        return pool.query('SELECT * FROM products ORDER BY created_at DESC');
      }
      return pool.query('SELECT * FROM products WHERE is_visible = true ORDER BY created_at DESC');
    },
    canCreate: (u) => u?.role === 'admin',
    canUpdate: (u) => u?.role === 'admin',
    canDelete: (u) => u?.role === 'admin',
  },
  Order: {
    table: 'orders',
    sortDefault: '-created_at',
    list: async (user) => {
      if (user?.role === 'admin') {
        return pool.query('SELECT * FROM orders ORDER BY created_at DESC');
      }
      return pool.query(
        'SELECT * FROM orders WHERE created_by = $1 ORDER BY created_at DESC',
        [user.email]
      );
    },
    canCreate: (u) => !!u,
    canUpdate: (u) => u?.role === 'admin',
    canDelete: () => false,
    onCreate: async (data, user) => ({
      ...data,
      created_by: user.email,
      customer_email: data.customer_email || user.email,
    }),
  },
  CartItem: {
    table: 'cart_items',
    sortDefault: '-created_at',
    list: async (user) =>
      pool.query('SELECT * FROM cart_items WHERE created_by = $1 ORDER BY created_at DESC', [user.email]),
    canCreate: (u) => !!u,
    canUpdate: (u) => !!u,
    canDelete: (u) => !!u,
    onCreate: async (data, user) => ({ ...data, created_by: user.email }),
    scopeField: 'created_by',
  },
  User: {
    table: 'users',
    sortDefault: '-created_at',
    list: async () => pool.query(`SELECT id, email, full_name, role, email_verified, created_at FROM users ORDER BY created_at DESC`),
    filter: async (query) => {
      if (query.role) {
        return pool.query(
          `SELECT id, email, full_name, role, email_verified, created_at FROM users WHERE role = $1`,
          [query.role]
        );
      }
      return pool.query(`SELECT id, email, full_name, role, email_verified, created_at FROM users ORDER BY created_at DESC`);
    },
    canRead: (u) => !!u,
    canUpdate: (u) => u?.role === 'admin',
    canDelete: (u) => u?.role === 'admin',
    hideFields: ['password_hash'],
  },
};

function parseSort(sortParam, defaultSort) {
  const sort = sortParam || defaultSort;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  const col = field === 'created_date' ? 'created_at' : field;
  return `${col} ${desc ? 'DESC' : 'ASC'}`;
}

app.get('/api/apps/:appId/entities/:entity', assertAppId, authMiddleware, async (req, res) => {
  const cfg = ENTITY_CONFIG[req.params.entity];
  if (!cfg) return res.status(404).json({ message: 'Unknown entity' });

  try {
    let result;
    if (req.query.q) {
      if (!req.user) return res.status(401).json({ message: 'Authentication required' });
      const query = JSON.parse(req.query.q);
      if (cfg.filter) result = await cfg.filter(query, req.user);
      else return res.status(400).json({ message: 'Filter not supported' });
    } else {
      if (req.params.entity !== 'Product' && !req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      result = await cfg.list(req.user, req.query);
    }
    res.json(result.rows.map(toApiRow));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/apps/:appId/entities/:entity/:id', assertAppId, authMiddleware, async (req, res) => {
  const cfg = ENTITY_CONFIG[req.params.entity];
  if (!cfg) return res.status(404).json({ message: 'Unknown entity' });
  const { rows } = await pool.query(`SELECT * FROM ${cfg.table} WHERE id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Not found' });
  const row = rows[0];
  if (cfg.scopeField && req.user?.email !== row[cfg.scopeField] && req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  res.json(toApiRow(row));
});

app.post('/api/apps/:appId/entities/:entity', assertAppId, authMiddleware, requireAuth, async (req, res) => {
  const cfg = ENTITY_CONFIG[req.params.entity];
  if (!cfg?.canCreate?.(req.user)) return res.status(403).json({ message: 'Forbidden' });

  const data = cfg.onCreate ? await cfg.onCreate(req.body, req.user) : req.body;

  if (req.params.entity === 'Product') {
    const { rows } = await pool.query(
      `INSERT INTO products (title, description, short_description, image_url, price, category,
        dosage, strain_type, ingredients, dosing_guidelines, stock_level, is_visible, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        data.title, data.description, data.short_description, data.image_url, data.price, data.category,
        data.dosage, data.strain_type, data.ingredients, data.dosing_guidelines,
        data.stock_level ?? null, data.is_visible ?? true, data.is_featured ?? false,
      ]
    );
    return res.status(201).json(toApiRow(rows[0]));
  }

  if (req.params.entity === 'Order') {
    const { rows } = await pool.query(
      `INSERT INTO orders (created_by, customer_email, customer_name, items, total_amount, status,
        payment_method, voucher_code, voucher_pin, voucher_type, delivery_method, delivery_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        data.created_by, data.customer_email, data.customer_name, JSON.stringify(data.items || []),
        data.total_amount, data.status || 'payment_submitted', data.payment_method,
        data.voucher_code, data.voucher_pin, data.voucher_type, data.delivery_method, data.delivery_address,
      ]
    );
    return res.status(201).json(toApiRow(rows[0]));
  }

  if (req.params.entity === 'CartItem') {
    const { rows } = await pool.query(
      `INSERT INTO cart_items (created_by, product_id, product_title, product_image, price, dosage, quantity)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (created_by, product_id) DO UPDATE SET
         quantity = cart_items.quantity + EXCLUDED.quantity,
         updated_at = now()
       RETURNING *`,
      [data.created_by, data.product_id, data.product_title, data.product_image, data.price, data.dosage, data.quantity || 1]
    );
    return res.status(201).json(toApiRow(rows[0]));
  }

  res.status(400).json({ message: 'Create not supported' });
});

app.put('/api/apps/:appId/entities/:entity/:id', assertAppId, authMiddleware, requireAuth, async (req, res) => {
  const cfg = ENTITY_CONFIG[req.params.entity];
  if (!cfg?.canUpdate?.(req.user)) return res.status(403).json({ message: 'Forbidden' });

  const allowedFields = req.params.entity === 'User'
    ? ['full_name', 'role', 'email', 'email_verified', 'delivery_address']
    : Object.keys(req.body);

  const allowed = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      allowed[field] = req.body[field];
    }
  }

  delete allowed.id;
  delete allowed.created_by;
  delete allowed.created_at;

  if (req.params.entity === 'User' && allowed.role && !['user', 'admin'].includes(allowed.role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  if (Object.keys(allowed).length === 0) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }

  const sets = [];
  const vals = [];
  let i = 1;
  for (const [k, v] of Object.entries(allowed)) {
    sets.push(`${k} = $${i++}`);
    vals.push(k === 'items' ? JSON.stringify(v) : v);
  }
  sets.push(`updated_at = now()`);
  vals.push(req.params.id);

  const { rows } = await pool.query(
    `UPDATE ${cfg.table} SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  if (!rows[0]) return res.status(404).json({ message: 'Not found' });
  res.json(toApiRow(rows[0]));
});

app.delete('/api/apps/:appId/entities/:entity/:id', assertAppId, authMiddleware, requireAuth, async (req, res) => {
  const cfg = ENTITY_CONFIG[req.params.entity];
  if (!cfg?.canDelete?.(req.user)) return res.status(403).json({ message: 'Forbidden' });
  if (req.params.entity === 'Order') return res.status(403).json({ message: 'Orders cannot be deleted' });

  await pool.query(`DELETE FROM ${cfg.table} WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// --- Analytics ---
app.post('/api/apps/:appId/analytics/track/batch', assertAppId, async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body || {}];
  console.log(`[ANALYTICS] app=${req.params.appId} events=${events.length}`);
  res.json({ ok: true, received: events.length });
});

// --- Integrations ---
app.post('/api/apps/:appId/integration-endpoints/Core/UploadFile', assertAppId, authMiddleware, requireAuth, upload.single('file'), (req, res) => {
  const fileUrl = `/uploads/${path.basename(req.file.path)}`;
  res.json({ file_url: fileUrl });
});

app.post('/api/apps/:appId/integration-endpoints/Core/SendEmail', assertAppId, authMiddleware, requireAuth, async (req, res) => {
  const { to, subject, body } = req.body;
  if (mailer) {
    await mailer.sendMail({ from: process.env.SMTP_FROM, to, subject, text: body });
  } else {
    console.log(`[EMAIL] to=${to} subject=${subject}\n${body}`);
  }
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

async function bootstrap() {
  await ensureUserSchema();
  app.listen(process.env.PORT || 3000, () => {
    console.log(`API on http://localhost:${process.env.PORT || 3000}`);
  });
}

bootstrap();
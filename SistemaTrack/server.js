// SistemaTrack/server.js  — CommonJS

require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_KEY = process.env.ADMIN_KEY || '';

/* ---------- App & Server ---------- */
const app = express();
const server = http.createServer(app);

// (Opcional) socket.io servidor (NO usar socket.io-client aquí)
let io = null;
try {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET','POST','PUT','DELETE'] }
  });
  io.on('connection', (socket) => {
    // console.log('WS connected', socket.id);
  });
} catch (e) {
  // si no instalaste socket.io, no pasa nada
}

/* ---------- Middlewares ---------- */
app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

// sirve /public si existe (admin.html, client.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- DB ---------- */
if (!MONGODB_URI) {
  console.error('✖ Missing MONGODB_URI env var');
  process.exit(1);
}

mongoose.set('strictQuery', true);
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✓ Mongo connected'))
  .catch((err) => {
    console.error('✖ Mongo connection error:', err);
    process.exit(1);
  });

const TrackingSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    status: {
      type: String,
      enum: ['tramite', 'transito', 'entregado', 'devuelto'],
      default: 'tramite'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const Tracking = mongoose.model('Tracking', TrackingSchema);

/* ---------- Helpers ---------- */
function requireAdmin(req, res, next) {
  const token = req.get('x-admin-key') || req.query.key;
  if (!ADMIN_KEY) return res.status(500).json({ error: 'ADMIN_KEY not configured' });
  if (token !== ADMIN_KEY) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function normId(v) {
  return String(v || '').trim().toUpperCase();
}

/* ---------- Routes ---------- */
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Crear (admin)
app.post('/api/tracking', requireAdmin, async (req, res) => {
  try {
    let { id, status } = req.body;
    id = normId(id);
    if (!id) return res.status(400).json({ error: 'id is required' });

    const exists = await Tracking.findOne({ id });
    if (exists) return res.status(409).json({ error: 'already_exists' });

    const doc = await Tracking.create({ id, status: status || 'tramite' });
    if (io) io.emit('tracking:upsert', { id: doc.id, status: doc.status });
    res.json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'already_exists' });
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// Obtener uno (público)
app.get('/api/tracking/:id', async (req, res) => {
  try {
    const id = normId(req.params.id);
    const doc = await Tracking.findOne({ id });
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// Listar (admin)
app.get('/api/tracking', requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const filter = q ? { id: { $regex: q, $options: 'i' } } : {};
    const list = await Tracking.find(filter).sort({ updatedAt: -1 }).limit(1000);
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// Actualizar estado (admin)
app.put('/api/tracking/:id', requireAdmin, async (req, res) => {
  try {
    const id = normId(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    const doc = await Tracking.findOneAndUpdate(
      { id },
      { status, updatedAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'not_found' });

    if (io) io.emit('tracking:upsert', { id: doc.id, status: doc.status });
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// Borrar uno (admin)
app.delete('/api/tracking/:id', requireAdmin, async (req, res) => {
  try {
    const id = normId(req.params.id);
    const result = await Tracking.deleteOne({ id });
    if (io) io.emit('tracking:delete', { id });
    res.json({ deleted: result.deletedCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// Borrar todos (admin)
app.delete('/api/tracking', requireAdmin, async (req, res) => {
  try {
    const result = await Tracking.deleteMany({});
    if (io) io.emit('tracking:reset');
    res.json({ deleted: result.deletedCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

/* ---------- Start ---------- */
server.listen(PORT, () => {
  console.log(`✓ Server running on :${PORT}`);
});

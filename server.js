const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://deepakarora15_db_user:3mELiZyjfXdFw%404@cluster0.8favpau.mongodb.net/?appName=Cluster0';
const DB_NAME = 'da_training';

let db = null;

async function connectDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('✅ Connected to MongoDB Atlas');
        // Ensure collections exist
        const collections = await db.listCollections().toArray();
        const names = collections.map(c => c.name);
        if (!names.includes('addonOverrides')) await db.createCollection('addonOverrides');
        if (!names.includes('hiddenAddons')) await db.createCollection('hiddenAddons');
        if (!names.includes('deletedAddons')) await db.createCollection('deletedAddons');
        if (!names.includes('customAddons')) await db.createCollection('customAddons');
        if (!names.includes('flags')) await db.createCollection('flags');
    } catch (e) {
        console.error('❌ MongoDB connection failed:', e.message);
        console.log('⚠️ Falling back to in-memory storage');
    }
}

// In-memory fallback if MongoDB is unavailable
let memStore = { addonOverrides: {}, hiddenAddons: [], deletedAddons: [], customAddons: {}, flags: [] };

// Middleware to check admin role
function requireAdmin(req, res, next) {
    const role = req.headers['x-user-role'];
    if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/dashboard', express.static(path.join(__dirname, 'public')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/', (req, res) => res.redirect('/login'));
app.get('/health', (req, res) => res.json({ status: 'ok', db: db ? 'connected' : 'memory' }));

// ===== API: Hide an addon (admin only) =====
app.post('/api/addons/hide', requireAdmin, async (req, res) => {
    const { lob, code } = req.body;
    if (!lob || !code) return res.status(400).json({ error: 'lob and code are required' });
    const key = `${lob}::${code}`;
    if (db) {
        await db.collection('hiddenAddons').updateOne({ key }, { $set: { key, lob, code, hiddenAt: new Date() } }, { upsert: true });
    } else {
        if (!memStore.hiddenAddons.includes(key)) memStore.hiddenAddons.push(key);
    }
    res.json({ success: true });
});

// ===== API: Unhide an addon (admin only) =====
app.post('/api/addons/unhide', requireAdmin, async (req, res) => {
    const { lob, code } = req.body;
    if (!lob || !code) return res.status(400).json({ error: 'lob and code are required' });
    const key = `${lob}::${code}`;
    if (db) {
        await db.collection('hiddenAddons').deleteOne({ key });
    } else {
        memStore.hiddenAddons = memStore.hiddenAddons.filter(k => k !== key);
    }
    res.json({ success: true });
});

// ===== API: Get hidden addons list =====
app.get('/api/addons/hidden', async (req, res) => {
    if (db) {
        const docs = await db.collection('hiddenAddons').find({}).toArray();
        res.json(docs.map(d => d.key));
    } else {
        res.json(memStore.hiddenAddons);
    }
});

// ===== API: Bulk add addons (admin only) =====
app.post('/api/addons/bulk', requireAdmin, async (req, res) => {
    const addons = req.body.addons;
    const addedBy = req.headers['x-user-name'] || 'admin';
    if (!Array.isArray(addons) || addons.length === 0) {
        return res.status(400).json({ error: 'addons array is required' });
    }
    let successCount = 0;
    const errors = [];
    for (const [idx, addon] of addons.entries()) {
        if (!addon.lob || !addon.code || !addon.name) {
            errors.push(`Row ${idx + 1}: lob, code, and name are required`);
            continue;
        }
        const doc = {
            lob: addon.lob.toLowerCase().trim(),
            code: addon.code.trim(),
            name: addon.name.trim(),
            irdaRef: addon.irdaRef || '',
            description: addon.description || '',
            whoShouldTake: addon.whoShouldTake || '',
            whyItsNeeded: addon.whyItsNeeded || '',
            claimImpact: addon.claimImpact || '',
            relevantProducts: Array.isArray(addon.relevantProducts) ? addon.relevantProducts : (addon.relevantProducts || '').split(',').map(s => s.trim()).filter(Boolean),
            source: addon.source || '',
            addedBy,
            addedAt: new Date()
        };
        if (db) {
            await db.collection('customAddons').updateOne({ lob: doc.lob, code: doc.code }, { $set: doc }, { upsert: true });
        } else {
            if (!memStore.customAddons[doc.lob]) memStore.customAddons[doc.lob] = [];
            memStore.customAddons[doc.lob] = memStore.customAddons[doc.lob].filter(a => a.code !== doc.code);
            memStore.customAddons[doc.lob].push(doc);
        }
        successCount++;
    }
    res.json({ success: true, successCount, errors });
});

// ===== API: Get custom addons =====
app.get('/api/addons/custom', async (req, res) => {
    if (db) {
        const docs = await db.collection('customAddons').find({}).toArray();
        const grouped = {};
        docs.forEach(d => {
            if (!grouped[d.lob]) grouped[d.lob] = [];
            grouped[d.lob].push(d);
        });
        res.json(grouped);
    } else {
        res.json(memStore.customAddons);
    }
});

// ===== API: Update an addon (admin only) =====
app.put('/api/addons/:lob/:code', requireAdmin, async (req, res) => {
    const { lob, code } = req.params;
    const updates = req.body;
    const updatedBy = req.headers['x-user-name'] || 'admin';
    const key = `${lob}::${code}`;
    const doc = { ...updates, lob, code, key, updatedBy, updatedAt: new Date() };
    if (db) {
        await db.collection('addonOverrides').updateOne({ key }, { $set: doc }, { upsert: true });
    } else {
        memStore.addonOverrides[key] = doc;
    }
    res.json({ success: true, addon: doc });
});

// ===== API: Delete an addon (admin only) =====
app.delete('/api/addons/:lob/:code', requireAdmin, async (req, res) => {
    const { lob, code } = req.params;
    const doc = { lob, code, deletedAt: new Date() };
    if (db) {
        await db.collection('deletedAddons').insertOne(doc);
    } else {
        memStore.deletedAddons.push(doc);
    }
    res.json({ success: true });
});

// ===== API: Get deleted addons =====
app.get('/api/addons/deleted', async (req, res) => {
    if (db) {
        const docs = await db.collection('deletedAddons').find({}).toArray();
        res.json(docs);
    } else {
        res.json(memStore.deletedAddons);
    }
});

// ===== API: Get addon overrides =====
app.get('/api/addons/overrides', async (req, res) => {
    if (db) {
        const docs = await db.collection('addonOverrides').find({}).toArray();
        const map = {};
        docs.forEach(d => { map[d.key] = d; });
        res.json(map);
    } else {
        res.json(memStore.addonOverrides);
    }
});

// ===== API: Flag an addon as incorrect =====
app.post('/api/flags', async (req, res) => {
    const { addonCode, lob, flaggedBy, reason } = req.body;
    if (!addonCode || !lob || !flaggedBy) {
        return res.status(400).json({ error: 'addonCode, lob, and flaggedBy are required' });
    }
    const flag = { addonCode, lob, flaggedBy, reason: reason || '', timestamp: new Date() };
    if (db) {
        await db.collection('flags').insertOne(flag);
    } else {
        memStore.flags.push(flag);
    }
    res.json({ success: true, flag });
});

// ===== API: Get all flags (admin) =====
app.get('/api/flags', requireAdmin, async (req, res) => {
    if (db) {
        const docs = await db.collection('flags').find({}).sort({ timestamp: -1 }).toArray();
        res.json(docs);
    } else {
        res.json(memStore.flags);
    }
});

// Start server after DB connection
connectDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));
});

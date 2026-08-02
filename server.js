const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const DB_PATH = path.join(__dirname, 'db.json');

function readDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
        return { users: [], progress: [], addonOverrides: {}, flags: [] };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Middleware to check admin role from x-user-role header
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
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ===== API: Hide an addon (admin only) =====
app.post('/api/addons/hide', requireAdmin, (req, res) => {
    const { lob, code } = req.body;
    if (!lob || !code) return res.status(400).json({ error: 'lob and code are required' });
    const db = readDB();
    if (!db.hiddenAddons) db.hiddenAddons = [];
    const key = `${lob}::${code}`;
    if (!db.hiddenAddons.includes(key)) {
        db.hiddenAddons.push(key);
        writeDB(db);
    }
    res.json({ success: true });
});

// ===== API: Unhide an addon (admin only) =====
app.post('/api/addons/unhide', requireAdmin, (req, res) => {
    const { lob, code } = req.body;
    if (!lob || !code) return res.status(400).json({ error: 'lob and code are required' });
    const db = readDB();
    if (!db.hiddenAddons) db.hiddenAddons = [];
    const key = `${lob}::${code}`;
    db.hiddenAddons = db.hiddenAddons.filter(k => k !== key);
    writeDB(db);
    res.json({ success: true });
});

// ===== API: Get hidden addons list =====
app.get('/api/addons/hidden', (req, res) => {
    const db = readDB();
    res.json(db.hiddenAddons || []);
});

// ===== API: Bulk add addons (admin only) =====
app.post('/api/addons/bulk', requireAdmin, (req, res) => {
    const addons = req.body.addons;
    if (!Array.isArray(addons) || addons.length === 0) {
        return res.status(400).json({ error: 'addons array is required' });
    }
    const db = readDB();
    if (!db.customAddons) db.customAddons = {};
    let successCount = 0;
    const errors = [];
    addons.forEach((addon, idx) => {
        if (!addon.lob || !addon.code || !addon.name) {
            errors.push(`Row ${idx + 1}: lob, code, and name are required`);
            return;
        }
        const lob = addon.lob.toLowerCase().trim();
        if (!db.customAddons[lob]) db.customAddons[lob] = [];
        // Remove existing with same code to avoid duplicates
        db.customAddons[lob] = db.customAddons[lob].filter(a => a.code !== addon.code);
        db.customAddons[lob].push({
            code: addon.code.trim(),
            name: addon.name.trim(),
            irdaRef: addon.irdaRef || '',
            description: addon.description || '',
            whoShouldTake: addon.whoShouldTake || '',
            whyItsNeeded: addon.whyItsNeeded || '',
            claimImpact: addon.claimImpact || '',
            relevantProducts: Array.isArray(addon.relevantProducts) ? addon.relevantProducts : (addon.relevantProducts || '').split(',').map(s => s.trim()).filter(Boolean),
            addedAt: new Date().toISOString()
        });
        successCount++;
    });
    writeDB(db);
    res.json({ success: true, successCount, errors });
});

// ===== API: Get custom addons (grouped by lob) =====
app.get('/api/addons/custom', (req, res) => {
    const db = readDB();
    res.json(db.customAddons || {});
});

// ===== API: Update an addon (admin only) =====
app.put('/api/addons/:lob/:code', requireAdmin, (req, res) => {
    const { lob, code } = req.params;
    const updates = req.body;
    const db = readDB();
    if (!db.addonOverrides) db.addonOverrides = {};
    const key = `${lob}::${code}`;
    db.addonOverrides[key] = { ...db.addonOverrides[key], ...updates, lob, code, updatedAt: new Date().toISOString() };
    writeDB(db);
    res.json({ success: true, addon: db.addonOverrides[key] });
});

// ===== API: Delete an addon (admin only) =====
app.delete('/api/addons/:lob/:code', requireAdmin, (req, res) => {
    const { lob, code } = req.params;
    const db = readDB();
    if (!db.deletedAddons) db.deletedAddons = [];
    db.deletedAddons.push({ lob, code, deletedAt: new Date().toISOString() });
    writeDB(db);
    res.json({ success: true });
});

// ===== API: Get deleted addons list =====
app.get('/api/addons/deleted', (req, res) => {
    const db = readDB();
    res.json(db.deletedAddons || []);
});

// ===== API: Get addon overrides =====
app.get('/api/addons/overrides', (req, res) => {
    const db = readDB();
    res.json(db.addonOverrides || {});
});

// ===== API: Flag an addon as incorrect =====
app.post('/api/flags', (req, res) => {
    const { addonCode, lob, flaggedBy, reason } = req.body;
    if (!addonCode || !lob || !flaggedBy) {
        return res.status(400).json({ error: 'addonCode, lob, and flaggedBy are required' });
    }
    const db = readDB();
    if (!db.flags) db.flags = [];
    const flag = { addonCode, lob, flaggedBy, reason: reason || '', timestamp: new Date().toISOString() };
    db.flags.push(flag);
    writeDB(db);
    res.json({ success: true, flag });
});

// ===== API: Get all flags (admin) =====
app.get('/api/flags', requireAdmin, (req, res) => {
    const db = readDB();
    res.json(db.flags || []);
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));

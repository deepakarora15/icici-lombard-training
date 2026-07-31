const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== DATABASE =====
let pool = null;
let usePostgres = false;

// In-memory fallback (for local dev without PostgreSQL)
let memDB = { users: [], progress: [] };

if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    usePostgres = true;
    console.log('Using PostgreSQL database');
} else {
    console.log('No DATABASE_URL found — using in-memory storage');
    // Try loading from local JSON
    const DB_PATH = path.join(__dirname, 'db.json');
    try {
        if (fs.existsSync(DB_PATH)) {
            memDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        }
    } catch (e) { /* ignore */ }
}

// Initialize PostgreSQL tables
async function initDB() {
    if (!usePostgres) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                display_name VARCHAR(200),
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS progress (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                quiz_score INTEGER DEFAULT 0,
                quiz_attempts INTEGER DEFAULT 0,
                best_score INTEGER DEFAULT 0,
                lessons_completed TEXT DEFAULT '[]',
                last_active TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Database tables ready');
    } catch (err) {
        console.error('DB init error:', err.message);
    }
}
initDB();

// ===== DB HELPER FUNCTIONS =====
async function findUser(username) {
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return res.rows[0] || null;
    }
    return memDB.users.find(u => u.username === username) || null;
}

async function findUserById(id) {
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return res.rows[0] || null;
    }
    return memDB.users.find(u => u.id === id) || null;
}

async function createUser(username, hashedPassword, displayName) {
    if (usePostgres) {
        const res = await pool.query(
            'INSERT INTO users (username, password, display_name) VALUES ($1, $2, $3) RETURNING *',
            [username, hashedPassword, displayName]
        );
        const user = res.rows[0];
        await pool.query('INSERT INTO progress (user_id) VALUES ($1)', [user.id]);
        return user;
    }
    const user = { id: Date.now(), username, password: hashedPassword, displayName, createdAt: new Date().toISOString() };
    memDB.users.push(user);
    memDB.progress.push({ userId: user.id, quizScore: 0, quizAttempts: 0, bestScore: 0, lessonsCompleted: [] });
    return user;
}

async function getProgress(userId) {
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM progress WHERE user_id = $1', [userId]);
        if (res.rows[0]) {
            const p = res.rows[0];
            return { quizScore: p.quiz_score, quizAttempts: p.quiz_attempts, bestScore: p.best_score, lessonsCompleted: JSON.parse(p.lessons_completed || '[]') };
        }
        return { quizScore: 0, quizAttempts: 0, bestScore: 0, lessonsCompleted: [] };
    }
    const p = memDB.progress.find(p => p.userId === userId);
    return p || { quizScore: 0, quizAttempts: 0, bestScore: 0, lessonsCompleted: [] };
}

async function saveProgress(userId, quizScore, lessonsCompleted) {
    if (usePostgres) {
        if (quizScore !== undefined) {
            await pool.query(`
                UPDATE progress SET quiz_score = $1, quiz_attempts = quiz_attempts + 1,
                best_score = GREATEST(best_score, $1), last_active = NOW() WHERE user_id = $2
            `, [quizScore, userId]);
        }
        if (lessonsCompleted !== undefined) {
            await pool.query('UPDATE progress SET lessons_completed = $1, last_active = NOW() WHERE user_id = $2',
                [JSON.stringify(lessonsCompleted), userId]);
        }
        return;
    }
    let p = memDB.progress.find(p => p.userId === userId);
    if (!p) { p = { userId, quizScore: 0, quizAttempts: 0, bestScore: 0, lessonsCompleted: [] }; memDB.progress.push(p); }
    if (quizScore !== undefined) { p.quizScore = quizScore; p.quizAttempts += 1; p.bestScore = Math.max(p.bestScore, quizScore); }
    if (lessonsCompleted !== undefined) { p.lessonsCompleted = lessonsCompleted; }
}

async function getLeaderboard() {
    if (usePostgres) {
        const res = await pool.query(`
            SELECT u.display_name, u.username, p.best_score, p.quiz_attempts
            FROM progress p JOIN users u ON p.user_id = u.id
            WHERE p.best_score > 0 ORDER BY p.best_score DESC LIMIT 10
        `);
        return res.rows;
    }
    return memDB.progress.filter(p => p.bestScore > 0).sort((a, b) => b.bestScore - a.bestScore).slice(0, 10).map(p => {
        const user = memDB.users.find(u => u.id === p.userId);
        return { display_name: user ? user.displayName : 'Unknown', username: user ? user.username : '', best_score: p.bestScore, quiz_attempts: p.quizAttempts };
    });
}

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET || 'marine-clauses-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' }
}));

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
    res.redirect('/login');
}

// ===== STATIC FILES =====
app.use('/app', requireAuth, express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.use('/dashboard', requireAuth, express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.get('/app/*', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard/*', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ===== ROUTES =====
app.get('/health', (req, res) => res.json({ status: 'ok', db: usePostgres ? 'postgresql' : 'memory' }));
app.get('/', (req, res) => { if (req.session && req.session.userId) return res.redirect('/dashboard'); res.redirect('/login'); });
app.get('/login', (req, res) => { if (req.session && req.session.userId) return res.redirect('/dashboard'); res.sendFile(path.join(__dirname, 'views', 'login.html')); });

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, displayName } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
        if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });

        const existing = await findUser(username.toLowerCase());
        if (existing) return res.status(400).json({ error: 'Username already taken' });

        const hashedPassword = await bcrypt.hash(password, 8);
        const user = await createUser(username.toLowerCase(), hashedPassword, displayName || username);

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.displayName = user.display_name || user.displayName || username;
        res.json({ success: true, redirect: '/dashboard' });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

        const user = await findUser(username.toLowerCase());
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid username or password' });

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.displayName = user.display_name || user.displayName;
        res.json({ success: true, redirect: '/dashboard' });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true, redirect: '/login' }); });

// User info
app.get('/api/user', requireAuth, async (req, res) => {
    const progress = await getProgress(req.session.userId);
    res.json({ username: req.session.username, displayName: req.session.displayName, progress });
});

// Save progress
app.post('/api/progress', requireAuth, async (req, res) => {
    const { quizScore, lessonsCompleted } = req.body;
    await saveProgress(req.session.userId, quizScore, lessonsCompleted);
    res.json({ success: true });
});

// Leaderboard
app.get('/api/leaderboard', requireAuth, async (req, res) => {
    const leaders = await getLeaderboard();
    res.json(leaders);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: ${usePostgres ? 'PostgreSQL' : 'In-memory'}`);
});

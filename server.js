const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== IN-MEMORY DATABASE (loaded once, saved on writes) =====
const DB_PATH = path.join(__dirname, 'db.json');
let db = { users: [], progress: [] };

function loadDBFromDisk() {
    try {
        if (fs.existsSync(DB_PATH)) {
            db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        }
    } catch (e) { db = { users: [], progress: [] }; }
}

function persistDB() {
    fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), () => {});
}

// Load once at startup
loadDBFromDisk();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy in production (Render uses reverse proxy)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'marine-clauses-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Auth middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.redirect('/login');
}

// Static files with no-cache for dev
app.use('/app', requireAuth, express.static(path.join(__dirname, 'public'), {
    etag: true,
    lastModified: true,
    maxAge: 0
}));

app.get('/app/*', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes
app.get('/', (req, res) => {
    if (req.session && req.session.userId) return res.redirect('/app');
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    if (req.session && req.session.userId) return res.redirect('/app');
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, displayName } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
        if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
        if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

        const existing = db.users.find(u => u.username === username.toLowerCase());
        if (existing) return res.status(400).json({ error: 'Username already taken' });

        const hashedPassword = await bcrypt.hash(password, 8);
        const newUser = {
            id: Date.now(),
            username: username.toLowerCase(),
            password: hashedPassword,
            displayName: displayName || username,
            createdAt: new Date().toISOString()
        };
        db.users.push(newUser);
        db.progress.push({ userId: newUser.id, quizScore: 0, quizAttempts: 0, bestScore: 0, lessonsCompleted: [] });
        persistDB();

        req.session.userId = newUser.id;
        req.session.username = newUser.username;
        req.session.displayName = newUser.displayName;
        res.json({ success: true, redirect: '/app' });
    } catch (err) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

        const user = db.users.find(u => u.username === username.toLowerCase());
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid username or password' });

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.displayName = user.displayName;
        res.json({ success: true, redirect: '/app' });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, redirect: '/login' });
});

// Get user info
app.get('/api/user', requireAuth, (req, res) => {
    const progress = db.progress.find(p => p.userId === req.session.userId);
    res.json({
        username: req.session.username,
        displayName: req.session.displayName,
        progress: progress || { quizScore: 0, quizAttempts: 0, bestScore: 0, lessonsCompleted: [] }
    });
});

// Save progress
app.post('/api/progress', requireAuth, (req, res) => {
    const { quizScore, lessonsCompleted } = req.body;
    let progress = db.progress.find(p => p.userId === req.session.userId);

    if (!progress) {
        progress = { userId: req.session.userId, quizScore: 0, quizAttempts: 0, bestScore: 0, lessonsCompleted: [] };
        db.progress.push(progress);
    }

    if (quizScore !== undefined) {
        progress.quizScore = quizScore;
        progress.quizAttempts += 1;
        progress.bestScore = Math.max(progress.bestScore, quizScore);
    }
    if (lessonsCompleted !== undefined) {
        progress.lessonsCompleted = lessonsCompleted;
    }

    persistDB();
    res.json({ success: true });
});

// Leaderboard
app.get('/api/leaderboard', requireAuth, (req, res) => {
    const leaders = db.progress
        .filter(p => p.bestScore > 0)
        .sort((a, b) => b.bestScore - a.bestScore)
        .slice(0, 10)
        .map(p => {
            const user = db.users.find(u => u.id === p.userId);
            return {
                display_name: user ? user.displayName : 'Unknown',
                username: user ? user.username : 'unknown',
                best_score: p.bestScore,
                quiz_attempts: p.quizAttempts
            };
        });
    res.json(leaders);
});

app.listen(PORT, () => {
    console.log(`Marine Clauses Dashboard running on http://localhost:${PORT}`);
});

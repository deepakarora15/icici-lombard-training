// ===== USER SESSION =====
let currentUser = null;
let currentLOB = 'marine';

async function loadUser() {
    try {
        const res = await fetch('/api/user');
        if (res.ok) {
            currentUser = await res.json();
            document.getElementById('userAvatar').textContent = currentUser.displayName.charAt(0).toUpperCase();
            document.getElementById('userName').innerHTML = `${currentUser.displayName} <small>@${currentUser.username}</small>`;
            if (currentUser.progress && currentUser.progress.bestScore) {
                document.getElementById('quizScoreDisplay').textContent = currentUser.progress.bestScore;
            }
        } else if (res.status === 401) {
            window.location.href = '/login';
        }
    } catch (e) {
        console.error('Failed to load user', e);
    }
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
});

async function saveProgress(quizScore, lessonsCompleted) {
    try {
        await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizScore, lessonsCompleted })
        });
    } catch (e) {
        console.error('Failed to save progress', e);
    }
}

// ===== TAB NAVIGATION =====
const navLinks = document.querySelectorAll('.nav-links li');
const tabContents = document.querySelectorAll('.tab-content');

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const tab = link.dataset.tab;
        navLinks.forEach(l => l.classList.remove('active'));
        tabContents.forEach(t => t.classList.remove('active'));
        link.classList.add('active');
        document.getElementById(tab).classList.add('active');
        if (tab === 'leaderboard') loadLeaderboard();
    });
});

// ===== STAT CARDS — CLICK TO SHOW INFO =====
document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', (e) => {
        const isOpen = card.classList.contains('show-tooltip');
        // Close all
        document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('show-tooltip'));
        // Toggle current
        if (!isOpen) card.classList.add('show-tooltip');
    });
});
// Close tooltips when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.stat-card')) {
        document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('show-tooltip'));
    }
});

// ===== DASHBOARD — RISK FLOW CHART =====
function renderRiskFlow() {
    const container = document.getElementById('riskFlowChart');
    const sorted = [...incotermsData].sort((a, b) => a.sellerRiskPercent - b.sellerRiskPercent);
    container.innerHTML = sorted.map(item => `
        <div class="flow-row">
            <div class="flow-label">${item.code}</div>
            <div class="flow-bar-container">
                <div class="flow-bar-seller" style="width: ${item.sellerRiskPercent}%">${item.sellerRiskPercent}%</div>
                <div class="flow-bar-buyer" style="width: ${item.buyerRiskPercent}%">${item.buyerRiskPercent}%</div>
            </div>
        </div>
    `).join('');
}

// ===== INCOTERMS EXPLORER =====
function renderIncoterms(filter = 'all') {
    const grid = document.getElementById('incotermsGrid');
    const filtered = filter === 'all' ? incotermsData : incotermsData.filter(i => i.transport === filter);
    grid.innerHTML = filtered.map(item => `
        <div class="incoterm-card" data-code="${item.code}">
            <span class="transport-badge">${item.transport === 'sea' ? '🚢 Sea' : '🚛 Any'}</span>
            <div class="code">${item.code}</div>
            <div class="name">${item.name}</div>
            <div class="desc">${item.description}</div>
        </div>
    `).join('');
    grid.querySelectorAll('.incoterm-card').forEach(card => {
        card.addEventListener('click', () => openIncotermModal(card.dataset.code));
    });
}

function openIncotermModal(code) {
    const item = incotermsData.find(i => i.code === code);
    if (!item) return;
    const modal = document.getElementById('incotermModal');
    document.getElementById('modalBody').innerHTML = `
        <div class="modal-title">${item.code} — ${item.name}</div>
        <div class="modal-subtitle">${item.description}</div>
        <div class="modal-section"><h4>Risk Transfer Point</h4><p>${item.riskTransfer}</p></div>
        <div class="modal-section"><h4>Cost Allocation</h4><p>${item.costAllocation}</p></div>
        <div class="responsibility-grid">
            <div class="resp-card seller"><h5>Seller Responsibilities</h5><p>${item.sellerResponsibilities}</p></div>
            <div class="resp-card buyer"><h5>Buyer Responsibilities</h5><p>${item.buyerResponsibilities}</p></div>
        </div>
        <div class="modal-section" style="margin-top:20px"><h4>Notes</h4><p>${item.notes}</p></div>
        <div class="modal-section"><h4>Risk Distribution</h4>
            <div class="flow-bar-container" style="height:28px;border-radius:6px;overflow:hidden;margin-top:8px;">
                <div class="flow-bar-seller" style="width:${item.sellerRiskPercent}%">Seller ${item.sellerRiskPercent}%</div>
                <div class="flow-bar-buyer" style="width:${item.buyerRiskPercent}%">Buyer ${item.buyerRiskPercent}%</div>
            </div>
        </div>
    `;
    modal.classList.add('active');
}

document.getElementById('modalClose').addEventListener('click', () => document.getElementById('incotermModal').classList.remove('active'));
document.getElementById('incotermModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('active'); });

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderIncoterms(btn.dataset.filter);
    });
});

// ===== INSURANCE MATRIX =====
function renderMatrix(type = 'inland') {
    const container = document.getElementById('matrixContainer');
    const data = type === 'inland' ? inlandMatrix : marineMatrix;
    const headers = type === 'inland'
        ? ['Incoterm', 'ITC (A) – All Risks', 'ITC (B) – Limited Perils', 'ITC (C) – Major Perils']
        : ['Incoterm', 'ICC (A) – All Risks', 'ICC (B) – Named Perils', 'ICC (C) – Major Perils'];

    const getCellClass = (val) => {
        const v = val.toLowerCase();
        if (v.includes('mandatory')) return 'cell-mandatory';
        if (v.includes('recommended')) return 'cell-recommended';
        if (v.includes('acceptable') || v.includes('optional')) return 'cell-acceptable';
        if (v.includes('limited')) return 'cell-limited';
        if (v.includes('not recommended') || v.includes('not preferred') || v.includes('not applicable') || v.includes('rare')) return 'cell-not-recommended';
        return 'cell-common';
    };

    let html = `<table class="matrix-table"><thead><tr>`;
    headers.forEach(h => html += `<th>${h}</th>`);
    html += `</tr></thead><tbody>`;
    data.forEach(row => {
        const vals = type === 'inland' ? [row.itcA, row.itcB, row.itcC] : [row.iccA, row.iccB, row.iccC];
        html += `<tr><td><strong>${row.incoterm}</strong></td>`;
        vals.forEach(v => html += `<td class="${getCellClass(v)}">${v}</td>`);
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMatrix(btn.dataset.matrix);
    });
});

// ===== LEARNING MODULE =====
function renderLessons() {
    const container = document.getElementById('lessonsContainer');
    container.innerHTML = lessons.map((lesson, idx) => `
        <div class="lesson-card" data-lesson="${lesson.id}">
            <div class="lesson-header">
                <div class="lesson-icon">${lesson.icon}</div>
                <div class="lesson-title-wrap"><h3>Lesson ${idx + 1}: ${lesson.title}</h3><p>Click to expand</p></div>
                <div class="lesson-toggle">▼</div>
            </div>
            <div class="lesson-body">${lesson.content}</div>
        </div>
    `).join('');

    container.querySelectorAll('.lesson-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('open');
            updateProgress();
            // Save lesson progress
            const openLessons = [...document.querySelectorAll('.lesson-card.open')].map(c => parseInt(c.dataset.lesson));
            saveProgress(undefined, openLessons);
        });
    });
}

// ===== QUIZ ENGINE =====
let currentQuestion = 0;
let score = 0;
let answered = [];
let shuffledQuestions = [];
let quizPlayerName = '';

function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Entry gate
document.getElementById('btnStartQuiz').addEventListener('click', () => {
    const nameInput = document.getElementById('quizUserName');
    const name = nameInput.value.trim();
    if (!name) {
        nameInput.style.borderColor = '#dc3545';
        nameInput.setAttribute('placeholder', 'Please enter your name!');
        nameInput.focus();
        return;
    }
    quizPlayerName = name;
    document.getElementById('quizEntry').style.display = 'none';
    document.getElementById('quizActive').style.display = 'block';
    startQuiz();
});

document.getElementById('quizUserName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btnStartQuiz').click();
    e.target.style.borderColor = '';
});

function startQuiz() {
    shuffledQuestions = shuffleArray(quizQuestions).slice(0, 10);
    currentQuestion = 0;
    score = 0;
    answered = [];
    document.getElementById('quizResults').style.display = 'none';
    document.getElementById('quizBody').style.display = 'block';
    renderQuestion();
}

function renderQuestion() {
    const q = shuffledQuestions[currentQuestion];
    document.getElementById('questionText').textContent = q.question;
    document.getElementById('questionCounter').textContent = `Question ${currentQuestion + 1}/${shuffledQuestions.length}`;
    document.getElementById('quizProgressFill').style.width = `${(currentQuestion / shuffledQuestions.length) * 100}%`;
    document.getElementById('scoreDisplay').textContent = `Score: ${score}`;
    document.getElementById('quizFeedback').className = 'quiz-feedback';
    document.getElementById('quizFeedback').style.display = 'none';
    document.getElementById('nextQuestion').classList.remove('show');

    const letters = ['A', 'B', 'C', 'D'];
    const optionsGrid = document.getElementById('optionsGrid');
    optionsGrid.innerHTML = q.options.map((opt, idx) => `
        <button class="option-btn" data-idx="${idx}">
            <span class="option-letter">${letters[idx]}</span>
            <span>${opt}</span>
        </button>
    `).join('');
    optionsGrid.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => handleAnswer(parseInt(btn.dataset.idx)));
    });
}

function handleAnswer(idx) {
    const q = shuffledQuestions[currentQuestion];
    const buttons = document.querySelectorAll('.option-btn');
    const feedback = document.getElementById('quizFeedback');
    buttons.forEach(btn => btn.classList.add('disabled'));
    buttons[q.correct].classList.add('correct');

    if (idx === q.correct) {
        score += 10;
        feedback.className = 'quiz-feedback show correct';
        feedback.textContent = `✓ Correct! ${q.explanation}`;
        answered.push(true);
    } else {
        buttons[idx].classList.add('wrong');
        feedback.className = 'quiz-feedback show wrong';
        feedback.textContent = `✗ Incorrect. ${q.explanation}`;
        answered.push(false);
    }
    feedback.style.display = 'block';
    document.getElementById('scoreDisplay').textContent = `Score: ${score}`;

    if (currentQuestion < shuffledQuestions.length - 1) {
        document.getElementById('nextQuestion').classList.add('show');
        document.getElementById('nextQuestion').textContent = 'Next Question →';
    } else {
        document.getElementById('nextQuestion').classList.add('show');
        document.getElementById('nextQuestion').textContent = 'See Results →';
    }
}

document.getElementById('nextQuestion').addEventListener('click', () => {
    currentQuestion++;
    if (currentQuestion >= shuffledQuestions.length) showResults();
    else renderQuestion();
});

function showResults() {
    document.getElementById('quizBody').style.display = 'none';
    document.getElementById('quizResults').style.display = 'block';
    const correct = answered.filter(a => a).length;
    const total = shuffledQuestions.length;
    document.getElementById('finalScore').textContent = `You scored ${score} points (${correct}/${total} correct)`;
    document.getElementById('resultsPlayer').textContent = `Player: ${quizPlayerName}`;
    document.getElementById('resultsBreakdown').innerHTML = `
        <div class="stat"><div class="stat-num" style="color:var(--accent-green)">${correct}</div><div class="stat-label">Correct</div></div>
        <div class="stat"><div class="stat-num" style="color:var(--accent-red)">${total - correct}</div><div class="stat-label">Incorrect</div></div>
        <div class="stat"><div class="stat-num" style="color:var(--accent-blue)">${score}</div><div class="stat-label">Points</div></div>
    `;
    document.getElementById('quizScoreDisplay').textContent = score;
    // Save to server
    saveProgress(score);
    updateProgress();
}

document.getElementById('restartQuiz').addEventListener('click', startQuiz);
document.getElementById('retakeQuiz').addEventListener('click', startQuiz);

// ===== INCOTERMS STORIES =====
let currentStoryCode = 'EXW';

function renderStoryChips() {
    const container = document.getElementById('storyChips');
    const codes = Object.keys(incotermStories);
    container.innerHTML = codes.map(code => `
        <button class="story-chip ${code === currentStoryCode ? 'active' : ''}" data-code="${code}">${code}</button>
    `).join('');
    container.querySelectorAll('.story-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            currentStoryCode = chip.dataset.code;
            container.querySelectorAll('.story-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderStory(currentStoryCode);
        });
    });
}

function renderStory(code) {
    const story = incotermStories[code];
    if (!story) return;
    const viewer = document.getElementById('storyViewer');

    const activeIdx = story.stops.findIndex(s => s.zone === 'active');
    const totalStops = story.stops.length;
    const sellerPercent = activeIdx >= 0 ? Math.round((activeIdx / (totalStops - 1)) * 100) : 50;
    const buyerPercent = 100 - sellerPercent;

    viewer.innerHTML = `
        <div class="story-scene">
            <div class="story-title">${story.title}</div>
            <div class="story-subtitle">${story.subtitle}</div>

            <!-- JOURNEY VISUAL -->
            <div class="journey-visual">
                <!-- Zone Labels Row -->
                <div class="jv-zone-row">
                    <div class="jv-zone-seller" style="width:${sellerPercent}%">
                        <span class="jv-zone-tag seller">🛡️ SELLER'S RISK</span>
                    </div>
                    <div class="jv-zone-buyer" style="width:${buyerPercent}%">
                        <span class="jv-zone-tag buyer">⚠️ BUYER'S RISK</span>
                    </div>
                </div>

                <!-- Stops Row -->
                <div class="jv-stops-row">
                    ${story.stops.map((stop, i) => {
                        let cls = '';
                        if (stop.zone === 'active') cls = 'jv-stop-active';
                        else if (stop.zone === 'seller') cls = 'jv-stop-seller';
                        else cls = 'jv-stop-buyer';
                        return `<div class="jv-stop ${cls}">
                            <div class="jv-stop-circle">${stop.icon}</div>
                            <div class="jv-stop-name">${stop.label}</div>
                        </div>`;
                    }).join('')}
                </div>

                <!-- Progress Bar -->
                <div class="jv-progress-bar">
                    <div class="jv-progress-seller" style="width:${sellerPercent}%"></div>
                    <div class="jv-progress-buyer" style="width:${buyerPercent}%"></div>
                    <div class="jv-cargo" style="left:${sellerPercent - 2}%">${story.vehicle}</div>
                </div>

                <!-- Risk Transfer Indicator -->
                <div class="jv-risk-indicator">
                    <div class="jv-risk-spacer" style="width:${sellerPercent}%"></div>
                    <div class="jv-risk-badge">⚡ RISK TRANSFERS HERE</div>
                </div>
            </div>

            <!-- Legend -->
            <div class="story-legend">
                <div class="story-legend-item"><div class="legend-dot seller-dot"></div><span>Seller bears risk & cost</span></div>
                <div class="story-legend-item"><div class="legend-dot buyer-dot"></div><span>Buyer bears risk & cost</span></div>
                <div class="story-legend-item"><div class="legend-dot risk-dot"></div><span>Risk Transfer Point</span></div>
            </div>

            <!-- Narration -->
            <div class="story-narration" style="margin-top: 24px;">
                ${story.narration.map(n => `
                    <div class="narration-step">
                        <div class="narration-icon ${n.type}">
                            ${n.type === 'seller' ? '🏭' : n.type === 'buyer' ? '🛒' : n.type === 'risk' ? '⚡' : '💡'}
                        </div>
                        <div class="narration-text">
                            <strong class="${n.type}-label">${n.type === 'seller' ? 'Seller' : n.type === 'buyer' ? 'Buyer' : n.type === 'risk' ? 'Risk Transfer' : 'Key Insight'}</strong>
                            <p>${n.text}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ===== LEADERBOARD =====
async function loadLeaderboard() {
    try {
        const res = await fetch('/api/leaderboard');
        const leaders = await res.json();
        const container = document.getElementById('leaderboardContent');
        if (leaders.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary)">No scores yet. Be the first to complete the quiz!</p>';
            return;
        }
        container.innerHTML = `<table class="leaderboard-table">
            <thead><tr><th>#</th><th>Name</th><th>Best Score</th><th>Attempts</th></tr></thead>
            <tbody>${leaders.map((l, i) => `
                <tr>
                    <td class="${i < 3 ? 'rank-' + (i+1) : ''}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}</td>
                    <td>${l.display_name || l.username}</td>
                    <td><strong>${l.best_score}</strong></td>
                    <td>${l.quiz_attempts}</td>
                </tr>
            `).join('')}</tbody></table>`;
    } catch (e) {
        console.error('Failed to load leaderboard', e);
    }
}

// ===== PROGRESS =====
function updateProgress() {
    const openLessons = document.querySelectorAll('.lesson-card.open').length;
    const totalLessons = lessons.length;
    const quizDone = answered.length > 0 ? 1 : 0;
    const total = totalLessons + 1;
    const completed = openLessons + quizDone;
    const pct = Math.round((completed / total) * 100);
    document.getElementById('globalProgress').style.width = `${pct}%`;
    document.getElementById('globalProgressText').textContent = `${pct}%`;
}

// ===== LOB SWITCHER =====
document.getElementById('lobSelector').addEventListener('change', (e) => {
    currentLOB = e.target.value;
    const config = lobConfig[currentLOB];
    document.getElementById('lobSubtitle').textContent = config.subtitle;
    document.title = `ICICI Lombard — ${config.name} Training`;

    // Show/hide marine-specific tabs
    const marineTabs = ['stories'];
    const allNavItems = document.querySelectorAll('.nav-links li');

    allNavItems.forEach(item => {
        const tab = item.dataset.tab;
        if (marineTabs.includes(tab)) {
            item.style.display = currentLOB === 'marine' ? 'flex' : 'none';
        }
    });

    // Re-render content based on LOB
    renderLOBDashboard();
    renderLOBExplorer();
    renderLOBLessons();

    // Switch to dashboard
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="dashboard"]').classList.add('active');
    document.getElementById('dashboard').classList.add('active');
});

function getLOBData() {
    switch (currentLOB) {
        case 'fire': return fireData;
        case 'engineering': return engineeringData;
        case 'liability': return liabilityData;
        case 'health': return healthData;
        case 'motor': return motorData;
        default: return null;
    }
}

function renderLOBDashboard() {
    const config = lobConfig[currentLOB];
    const header = document.querySelector('#dashboard .page-header');
    header.innerHTML = `<h1>${config.icon} ${config.name} Dashboard</h1><p>ICICI Lombard — ${config.description}</p>`;

    if (currentLOB === 'marine') {
        // Restore marine dashboard content
        document.querySelector('#dashboard .stats-grid').style.display = '';
        document.querySelectorAll('#dashboard .dashboard-section').forEach(s => s.style.display = '');
        return;
    }

    // For other LOBs, show their stats
    const data = getLOBData();
    if (!data) return;

    const statsGrid = document.querySelector('#dashboard .stats-grid');
    statsGrid.style.display = 'grid';
    statsGrid.innerHTML = `
        <div class="stat-card"><div class="stat-icon blue"><span style="font-size:22px">${config.icon}</span></div><div class="stat-info"><h3>${data.explorerCards.length}</h3><p>Concepts & Clauses</p></div></div>
        <div class="stat-card"><div class="stat-icon green"><span style="font-size:22px">📚</span></div><div class="stat-info"><h3>${data.lessons.length}</h3><p>Training Modules</p></div></div>
        <div class="stat-card"><div class="stat-icon purple"><span style="font-size:22px">❓</span></div><div class="stat-info"><h3>${data.quizQuestions.length}</h3><p>Quiz Questions</p></div></div>
        <div class="stat-card"><div class="stat-icon orange"><span style="font-size:22px">⭐</span></div><div class="stat-info"><h3 id="quizScoreDisplay">0</h3><p>Best Quiz Score</p></div></div>
    `;

    // Hide marine-specific dashboard sections
    document.querySelectorAll('#dashboard .dashboard-section').forEach(s => s.style.display = 'none');
}

function renderLOBExplorer() {
    if (currentLOB === 'marine') {
        renderIncoterms();
        return;
    }
    const data = getLOBData();
    if (!data) return;

    const grid = document.getElementById('incotermsGrid');
    const header = document.querySelector('#incoterms .page-header');
    const config = lobConfig[currentLOB];
    header.innerHTML = `<h1>${config.icon} ${config.name} — Explorer</h1><p>Click any card to learn more about each concept</p>`;

    // Update filter buttons
    const categories = [...new Set(data.explorerCards.map(c => c.category))];
    const filterBar = document.querySelector('#incoterms .filter-bar');
    filterBar.innerHTML = `<button class="filter-btn active" data-filter="all">All</button>` +
        categories.map(cat => `<button class="filter-btn" data-filter="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</button>`).join('');

    filterBar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderLOBCards(btn.dataset.filter);
        });
    });

    renderLOBCards('all');
}

function renderLOBCards(filter) {
    const data = getLOBData();
    if (!data) return;
    const grid = document.getElementById('incotermsGrid');
    const filtered = filter === 'all' ? data.explorerCards : data.explorerCards.filter(c => c.category === filter);

    grid.innerHTML = filtered.map(item => `
        <div class="incoterm-card" data-code="${item.code}">
            <span class="transport-badge">${item.category}</span>
            <div class="code">${item.code}</div>
            <div class="name">${item.name}</div>
            <div class="desc">${item.description}</div>
        </div>
    `).join('');

    grid.querySelectorAll('.incoterm-card').forEach(card => {
        card.addEventListener('click', () => {
            const item = data.explorerCards.find(i => i.code === card.dataset.code);
            if (!item) return;
            const modal = document.getElementById('incotermModal');
            document.getElementById('modalBody').innerHTML = `
                <div class="modal-title">${item.code} — ${item.name}</div>
                <div class="modal-subtitle">${item.description}</div>
                <div class="modal-section"><h4>Coverage / Risk Transfer</h4><p>${item.riskTransfer}</p></div>
                <div class="responsibility-grid">
                    <div class="resp-card seller"><h5>Key Responsibilities</h5><p>${item.sellerResponsibilities}</p></div>
                    <div class="resp-card buyer"><h5>Policyholder Duties</h5><p>${item.buyerResponsibilities}</p></div>
                </div>
                <div class="modal-section" style="margin-top:20px"><h4>Important Notes</h4><p>${item.notes}</p></div>
            `;
            modal.classList.add('active');
        });
    });
}

function renderLOBLessons() {
    if (currentLOB === 'marine') {
        renderLessons();
        return;
    }
    const data = getLOBData();
    if (!data) return;
    const config = lobConfig[currentLOB];

    // Update learning page header
    const header = document.querySelector('#learning .page-header');
    header.innerHTML = `<h1>${config.icon} ${config.name} — Learning Modules</h1><p>Step-by-step training for ${config.name.toLowerCase()}</p>`;

    const container = document.getElementById('lessonsContainer');
    container.innerHTML = data.lessons.map((lesson, idx) => `
        <div class="lesson-card" data-lesson="${lesson.id}">
            <div class="lesson-header">
                <div class="lesson-icon">${lesson.icon}</div>
                <div class="lesson-title-wrap"><h3>Module ${idx + 1}: ${lesson.title}</h3><p>Click to expand</p></div>
                <div class="lesson-toggle">▼</div>
            </div>
            <div class="lesson-body">${lesson.content}</div>
        </div>
    `).join('');

    container.querySelectorAll('.lesson-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('open');
        });
    });
}

// ===== INIT =====
loadUser();
renderRiskFlow();
renderIncoterms();
renderStoryChips();
renderStory('EXW');
renderMatrix('inland');
renderLessons();

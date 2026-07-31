// ===== USER SESSION =====
let currentUser = null;
let currentLOB = 'marine';

async function loadUser() {
    try {
        const res = await fetch('/api/user');
        if (res.ok) {
            currentUser = await res.json();
            document.getElementById('userAvatar').textContent = currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U';
            document.getElementById('userName').innerHTML = `${currentUser.displayName || 'User'} <small>@${currentUser.username || 'guest'}</small>`;
            if (currentUser.progress && currentUser.progress.bestScore) {
                document.getElementById('quizScoreDisplay').textContent = currentUser.progress.bestScore;
            }
        } else {
            // No auth required - show as guest
            document.getElementById('userAvatar').textContent = 'G';
            document.getElementById('userName').innerHTML = `Guest <small>Open access</small>`;
        }
    } catch (e) {
        document.getElementById('userAvatar').textContent = 'G';
        document.getElementById('userName').innerHTML = `Guest <small>Open access</small>`;
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

// ===== INSURANCE TABS =====
function renderInsuranceTab(tab = 'marine') {
    const data = insuranceTabContent[tab];
    if (!data) return;
    const container = document.getElementById('insContent');
    container.innerHTML = `
        <h2 class="ins-section-title">${data.title}</h2>
        <p class="ins-section-desc">${data.desc}</p>
        <div class="ins-cards">
            ${data.cards.map(card => `
                <div class="ins-card">
                    <h3>${card.title}</h3>
                    ${card.content}
                </div>
            `).join('')}
        </div>
    `;
}

document.querySelectorAll('.ins-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.ins-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderInsuranceTab(tab.dataset.ins);
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

// ===== LOB TABS =====
const lobTabs = document.querySelectorAll('.lob-tab');
const marineOnlyNavTabs = ['stories', 'incoterms', 'insurance'];

lobTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const lob = tab.dataset.lob;
        currentLOB = lob;

        // Update active tab
        lobTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const config = lobConfig[currentLOB];
        document.getElementById('lobSubtitle').textContent = config.subtitle;
        document.title = `ICICI Lombard — ${config.name} Training`;

        // Show/hide marine-specific nav items
        const allNavItems = document.querySelectorAll('.nav-links li');
        allNavItems.forEach(item => {
            const navTab = item.dataset.tab;
            if (marineOnlyNavTabs.includes(navTab)) {
                item.style.display = currentLOB === 'marine' ? 'flex' : 'none';
            }
        });

        // Re-render content based on LOB
        renderLOBDashboard();
        if (currentLOB === 'marine') {
            renderIncoterms();
            renderLessons();
        } else {
            renderLOBLessons();
        }

        // Switch to dashboard
        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="dashboard"]').classList.add('active');
        document.getElementById('dashboard').classList.add('active');
    });
});

function getLOBData() {
    switch (currentLOB) {
        case 'fire': return fireData;
        case 'engineering': return engineeringData;
        case 'liability': return liabilityData;
        default: return null;
    }
}

function renderLOBDashboard() {
    const config = lobConfig[currentLOB];
    const header = document.querySelector('#dashboard .page-header');
    header.innerHTML = `<h1>${config.icon} ${config.name} Dashboard</h1><p>ICICI Lombard — ${config.description}</p>`;

    if (currentLOB === 'marine') {
        // Hide LOB content if it exists
        const lobContent = document.getElementById('lobDashboardContent');
        if (lobContent) lobContent.style.display = 'none';
        // Restore marine dashboard content
        document.querySelector('#dashboard .stats-grid').style.display = '';
        document.querySelector('#dashboard .stats-grid').innerHTML = `
            <div class="stat-card" id="statIncoterms"><div class="stat-icon blue"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg></div><div class="stat-info"><h3>11</h3><p>Incoterms 2020</p></div></div>
            <div class="stat-card" id="statInsurance"><div class="stat-icon green"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div class="stat-info"><h3>6</h3><p>Insurance Clauses</p></div></div>
            <div class="stat-card" id="statLearning"><div class="stat-icon purple"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div><div class="stat-info"><h3>11</h3><p>Learning Modules</p></div></div>
            <div class="stat-card" id="statQuiz"><div class="stat-icon orange"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><div class="stat-info"><h3 id="quizScoreDisplay">0</h3><p>Best Quiz Score</p></div></div>
        `;
        document.querySelectorAll('#dashboard .dashboard-section').forEach(s => s.style.display = '');
        return;
    }

    // For non-Marine LOBs, show description + policy cards
    const lobData = lobPolicies[currentLOB];
    if (!lobData) return;

    const statsGrid = document.querySelector('#dashboard .stats-grid');
    statsGrid.style.display = 'none';

    // Hide marine-specific dashboard sections
    document.querySelectorAll('#dashboard .dashboard-section').forEach(s => s.style.display = 'none');

    // Check if LOB content container exists, create if not
    let lobContent = document.getElementById('lobDashboardContent');
    if (!lobContent) {
        lobContent = document.createElement('div');
        lobContent.id = 'lobDashboardContent';
        document.querySelector('#dashboard').appendChild(lobContent);
    }
    lobContent.style.display = 'block';
    lobContent.innerHTML = `
        <div class="lob-description">${lobData.description}</div>
        <div class="lob-policies-section">
            <h2>Policies in this LOB</h2>
            <div class="lob-policy-cards">
                ${lobData.policies.map(p => `
                    <div class="lob-policy-card">
                        <div class="policy-code">${p.code}</div>
                        <div class="policy-name">${p.name}</div>
                        <div class="policy-desc">${p.description}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
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
renderInsuranceTab('marine');
renderLessons();

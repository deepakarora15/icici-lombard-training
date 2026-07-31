// Auth guard
(function(){var s=localStorage.getItem('ilSession');if(!s||!JSON.parse(s).username){window.location.href='/login';return;}})();

// ===== USER SESSION =====
let currentUser = null;
let currentLOB = 'marine';

async function loadUser() {
    const session = JSON.parse(localStorage.getItem('ilSession') || 'null');
    if (!session) { window.location.href = '/login'; return; }
    currentUser = session;
    document.getElementById('userAvatar').textContent = session.username.charAt(0).toUpperCase();
    document.getElementById('userName').innerHTML = `${session.username} <small>${session.role}</small>`;
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    const session = JSON.parse(localStorage.getItem('ilSession') || 'null');
    if (session) {
        const logs = JSON.parse(localStorage.getItem('ilLoginLogs') || '[]');
        logs.unshift({ username: session.username, role: session.role, action: 'Logout', timestamp: new Date().toISOString() });
        if (logs.length > 100) logs.pop();
        localStorage.setItem('ilLoginLogs', JSON.stringify(logs));
    }
    localStorage.removeItem('ilSession');
    window.location.href = '/login';
});

async function saveProgress(quizScore, lessonsCompleted) {
    // Progress saved locally (no server needed)
    try {
        const session = JSON.parse(localStorage.getItem('ilSession') || 'null');
        if (!session) return;
        const key = 'ilProgress_' + session.username;
        const progress = JSON.parse(localStorage.getItem(key) || '{}');
        if (quizScore !== undefined) {
            progress.bestScore = Math.max(progress.bestScore || 0, quizScore);
            progress.quizAttempts = (progress.quizAttempts || 0) + 1;
        }
        if (lessonsCompleted !== undefined) progress.lessonsCompleted = lessonsCompleted;
        localStorage.setItem(key, JSON.stringify(progress));
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
        if (tab === 'audit') renderAuditUsers();
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

    // After the lessons cards, also render Insurance Clauses as part of learning
    if (typeof insuranceTabContent !== 'undefined') {
        const insSection = document.createElement('div');
        insSection.style.marginTop = '32px';
        insSection.innerHTML = `
            <h2 style="font-size:20px;font-weight:700;margin-bottom:16px;">📋 Insurance Clauses Reference</h2>
            <div class="ins-tabs">
                <button class="ins-tab active" data-ins="marine">🚢 Marine</button>
                <button class="ins-tab" data-ins="fire">🔥 Fire</button>
                <button class="ins-tab" data-ins="engineering">⚙️ Engineering</button>
                <button class="ins-tab" data-ins="liability">⚖️ Liability</button>
            </div>
            <div id="insContent"></div>
        `;
        container.appendChild(insSection);

        // Re-attach insurance tab handlers
        insSection.querySelectorAll('.ins-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                insSection.querySelectorAll('.ins-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderInsuranceTab(tab.dataset.ins);
            });
        });
        renderInsuranceTab('marine');
    }
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
    const questions = currentLOB === 'marine' ? quizQuestions : (lobQuizQuestions[currentLOB] || quizQuestions);
    shuffledQuestions = shuffleArray(questions).slice(0, 10);
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
        const users = JSON.parse(localStorage.getItem('ilManagedUsers') || '[]');
        const leaders = [];
        users.forEach(u => {
            const progress = JSON.parse(localStorage.getItem('ilProgress_' + u.username) || '{}');
            if (progress.bestScore && progress.bestScore > 0) {
                leaders.push({ username: u.username, best_score: progress.bestScore, quiz_attempts: progress.quizAttempts || 0 });
            }
        });
        leaders.sort((a, b) => b.best_score - a.best_score);
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
                    <td>${l.username}</td>
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
const marineOnlyNavTabs = ['stories'];

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
            <h2>📋 Products & Policies</h2>
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

function renderLOBLessons() {
    if (currentLOB === 'marine') {
        renderLessons();
        return;
    }
    const lobData = lobPolicies[currentLOB];
    if (!lobData || !lobData.addons) return;
    const config = lobConfig[currentLOB];

    const header = document.querySelector('#learning .page-header');
    header.innerHTML = `<h1>${config.icon} ${config.name} — Add-on Covers & Extensions</h1><p>Click any add-on to learn: what it covers, who needs it, and what happens if you don't opt for it</p>`;

    const container = document.getElementById('lessonsContainer');

    // Product slicer buttons
    const productCodes = lobData.policies.map(p => p.code);
    const slicerHtml = `<div class="product-slicer" style="margin-bottom:20px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <span style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-right:8px;">Filter by Product:</span>
        <button class="slicer-btn active" data-product="all" onclick="filterAddonsByProduct('all')">All (${lobData.addons.length})</button>
        ${productCodes.map(code => `<button class="slicer-btn" data-product="${code}" onclick="filterAddonsByProduct('${code}')">${code}</button>`).join('')}
    </div>`;

    // Search box
    const searchHtml = `<div class="lob-search-box" style="margin-bottom:20px;">
        <input type="text" id="lobAddonSearch" placeholder="🔍 Search within ${config.name} add-ons..." style="width:100%;max-width:500px;padding:12px 16px;border:2px solid var(--border);border-radius:10px;font-size:15px;font-family:inherit;transition:border-color 0.2s;" onfocus="this.style.borderColor='var(--accent-primary)'" onblur="this.style.borderColor='var(--border)'">
    </div>`;

    container.innerHTML = slicerHtml + searchHtml + lobData.addons.map((addon, idx) => `
        <div class="lesson-card" data-lesson="${idx}" data-products="${(addon.relevantProducts || []).join(',')}" data-search="${(addon.code + ' ' + addon.name + ' ' + addon.description + ' ' + (addon.whoShouldTake||'')).toLowerCase()}">
            <div class="lesson-header">
                <div class="lesson-icon">📋</div>
                <div class="lesson-title-wrap">
                    <h3>${addon.code} — ${addon.name}</h3>
                    <p>${addon.irdaRef ? 'IRDA Ref #' + addon.irdaRef + ' | ' : ''}${addon.relevantProducts && addon.relevantProducts.length ? '<span style="color:var(--accent-teal);font-weight:600;">Applies to: ' + addon.relevantProducts.join(', ') + '</span>' : 'Applies to: All Products'}</p>
                </div>
                <div class="lesson-toggle">▼</div>
            </div>
            <div class="lesson-body">
                <h3>${addon.name}</h3>
                <p>${addon.description}</p>
                ${addon.whoShouldTake ? `<h4>👤 Who Should Take It</h4><p>${addon.whoShouldTake}</p>` : ''}
                ${addon.whyItsNeeded ? `<h4>❓ Why It's Needed</h4><p>${addon.whyItsNeeded}</p>` : ''}
                ${addon.claimImpact ? `<div class="lesson-highlight"><h4>⚠️ Claim Impact If NOT Opted</h4><p>${addon.claimImpact}</p></div>` : ''}
            </div>
        </div>
    `).join('');

    // LOB-specific search filtering
    const searchInput = document.getElementById('lobAddonSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            container.querySelectorAll('.lesson-card').forEach(card => {
                if (!q || q.length < 2) { card.style.display = ''; return; }
                const searchData = card.dataset.search || '';
                card.style.display = searchData.includes(q) ? '' : 'none';
            });
        });
    }

    container.querySelectorAll('.lesson-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('open');
        });
    });
}

// Product slicer filter
function filterAddonsByProduct(product) {
    const container = document.getElementById('lessonsContainer');
    // Update active button
    container.querySelectorAll('.slicer-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.product === product);
    });
    // Filter cards
    container.querySelectorAll('.lesson-card').forEach(card => {
        if (product === 'all') { card.style.display = ''; return; }
        const prods = card.dataset.products || '';
        // Show if: addon lists this product, OR addon has no products (applies to all)
        card.style.display = (!prods || prods.includes(product)) ? '' : 'none';
    });
}

// ===== SEARCH ADD-ONS =====
function getAllAddons() {
    const allAddons = [];
    const lobs = ['fire', 'engineering', 'liability'];
    lobs.forEach(lob => {
        const lobData = lobPolicies[lob];
        if (lobData && lobData.addons) {
            lobData.addons.forEach(addon => {
                allAddons.push({ ...addon, lob: lob, lobName: lobConfig[lob].name, lobIcon: lobConfig[lob].icon });
            });
        }
    });
    return allAddons;
}

function renderSearchResults(query) {
    const container = document.getElementById('searchResults');
    if (!query || query.length < 2) {
        container.innerHTML = '<p class="search-no-results">Type at least 2 characters to search across all add-on covers...</p>';
        return;
    }
    const allAddons = getAllAddons();
    const q = query.toLowerCase();
    const results = allAddons.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.whoShouldTake && a.whoShouldTake.toLowerCase().includes(q)) ||
        (a.whyItsNeeded && a.whyItsNeeded.toLowerCase().includes(q))
    );

    if (results.length === 0) {
        container.innerHTML = `<p class="search-no-results">No add-ons found matching "${query}". Try different keywords.</p>`;
        return;
    }

    container.innerHTML = `<p class="search-count">${results.length} add-on(s) found</p>` + results.map(a => `
        <div class="search-result-card">
            <div class="sr-lob">${a.lobIcon} ${a.lobName} ${a.irdaRef ? '| IRDA #' + a.irdaRef : ''}</div>
            <div class="sr-name">${a.code} — ${a.name}</div>
            <div class="sr-desc">${a.description}</div>
            ${a.whoShouldTake ? `<div class="sr-detail"><strong>Who:</strong> ${a.whoShouldTake}</div>` : ''}
            ${a.claimImpact ? `<div class="sr-detail"><strong>⚠️ If not opted:</strong> ${a.claimImpact}</div>` : ''}
        </div>
    `).join('');
}

document.getElementById('addonSearchInput').addEventListener('input', (e) => {
    renderSearchResults(e.target.value.trim());
});

// ===== AUDIT LOGS & USER MANAGEMENT =====
function initAuditLogs() {
    const session = JSON.parse(localStorage.getItem('ilSession') || 'null');
    const navAudit = document.getElementById('navAuditLogs');
    if (session && session.role === 'admin') {
        navAudit.style.display = 'flex';
    } else {
        navAudit.style.display = 'none';
    }
}

function renderAuditUsers() {
    const container = document.getElementById('auditContent');
    const users = JSON.parse(localStorage.getItem('ilManagedUsers') || '[]');
    const shareLink = window.location.origin + '/login';

    container.innerHTML = `
        <div style="margin-bottom:24px;padding:16px;background:var(--bg-tertiary);border-radius:10px;border:1px solid var(--border);">
            <h3 style="margin-bottom:8px;font-size:14px;color:var(--text-secondary);">🔗 Share Login Link</h3>
            <div style="display:flex;gap:8px;align-items:center;">
                <input type="text" value="${shareLink}" readonly style="flex:1;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--bg-primary);color:var(--text-primary);" id="shareLinkInput">
                <button onclick="document.getElementById('shareLinkInput').select();document.execCommand('copy');" style="padding:10px 16px;background:var(--accent-primary);color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">Copy</button>
            </div>
        </div>

        <div style="margin-bottom:24px;padding:20px;background:var(--bg-tertiary);border-radius:10px;border:1px solid var(--border);">
            <h3 style="margin-bottom:14px;font-size:15px;">➕ Create New User</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                    <label style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;display:block;margin-bottom:4px;">Username</label>
                    <input type="text" id="newUsername" placeholder="username" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--bg-primary);color:var(--text-primary);">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;display:block;margin-bottom:4px;">Email Prefix</label>
                    <div style="display:flex;align-items:center;gap:0;">
                        <input type="text" id="newEmailPrefix" placeholder="firstname" style="flex:1;padding:10px 12px;border:1px solid var(--border);border-radius:6px 0 0 6px;font-size:13px;background:var(--bg-primary);color:var(--text-primary);">
                        <span style="padding:10px 8px;background:var(--border);border:1px solid var(--border);border-radius:0 6px 6px 0;font-size:12px;color:var(--text-secondary);">@icicilombard.com</span>
                    </div>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;display:block;margin-bottom:4px;">Password</label>
                    <input type="text" id="newPassword" placeholder="password" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--bg-primary);color:var(--text-primary);">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;display:block;margin-bottom:4px;">Role</label>
                    <select id="newRole" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--bg-primary);color:var(--text-primary);">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>
            <button onclick="createUser()" style="margin-top:14px;padding:10px 20px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">Create User</button>
            <span id="createUserMsg" style="margin-left:12px;font-size:12px;color:#28a745;"></span>
        </div>

        <div style="overflow-x:auto;">
            <h3 style="margin-bottom:12px;font-size:15px;">👥 All Users</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="background:var(--bg-tertiary);border-bottom:2px solid var(--border);">
                        <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-secondary);text-transform:uppercase;font-size:11px;">Username</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-secondary);text-transform:uppercase;font-size:11px;">Email</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-secondary);text-transform:uppercase;font-size:11px;">Role</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-secondary);text-transform:uppercase;font-size:11px;">Created</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-secondary);text-transform:uppercase;font-size:11px;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:10px 12px;font-weight:500;">${u.username}</td>
                            <td style="padding:10px 12px;color:var(--text-secondary);">${u.email || '-'}</td>
                            <td style="padding:10px 12px;"><span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${u.role === 'admin' ? '#fff3cd' : '#d4edda'};color:${u.role === 'admin' ? '#856404' : '#155724'};">${u.role}</span></td>
                            <td style="padding:10px 12px;color:var(--text-secondary);font-size:12px;">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                            <td style="padding:10px 12px;">${u.isDefault ? '<span style="font-size:11px;color:var(--text-secondary);">Default</span>' : '<button onclick="deleteUser(\'' + u.username + '\')" style="padding:4px 10px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">Delete</button>'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderAuditLogs() {
    const container = document.getElementById('auditContent');
    const logs = JSON.parse(localStorage.getItem('ilLoginLogs') || '[]');

    if (logs.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary);padding:20px;">No login activity recorded yet.</p>';
        return;
    }

    container.innerHTML = `
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="background:var(--bg-tertiary);border-bottom:2px solid var(--border);">
                        <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-secondary);text-transform:uppercase;font-size:11px;">Username</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-secondary);text-transform:uppercase;font-size:11px;">Role</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-secondary);text-transform:uppercase;font-size:11px;">Action</th>
                        <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-secondary);text-transform:uppercase;font-size:11px;">Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(log => `
                        <tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:10px 12px;font-weight:500;">${log.username}</td>
                            <td style="padding:10px 12px;"><span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${log.role === 'admin' ? '#fff3cd' : '#d4edda'};color:${log.role === 'admin' ? '#856404' : '#155724'};">${log.role}</span></td>
                            <td style="padding:10px 12px;"><span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${log.action === 'Login' ? '#d4edda' : '#f8d7da'};color:${log.action === 'Login' ? '#155724' : '#721c24'};">${log.action}</span></td>
                            <td style="padding:10px 12px;color:var(--text-secondary);font-size:12px;">${new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function createUser() {
    const username = document.getElementById('newUsername').value.trim().toLowerCase();
    const emailPrefix = document.getElementById('newEmailPrefix').value.trim().toLowerCase();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;
    const msgEl = document.getElementById('createUserMsg');

    if (!username || !password) {
        msgEl.style.color = '#dc3545';
        msgEl.textContent = 'Username and password are required';
        return;
    }

    const users = JSON.parse(localStorage.getItem('ilManagedUsers') || '[]');
    if (users.find(u => u.username === username)) {
        msgEl.style.color = '#dc3545';
        msgEl.textContent = 'Username already exists';
        return;
    }

    const email = (emailPrefix || username) + '@icicilombard.com';
    users.push({ username, password, role, email, isDefault: false, createdAt: new Date().toISOString() });
    localStorage.setItem('ilManagedUsers', JSON.stringify(users));

    msgEl.style.color = '#28a745';
    msgEl.textContent = 'User created successfully!';
    document.getElementById('newUsername').value = '';
    document.getElementById('newEmailPrefix').value = '';
    document.getElementById('newPassword').value = '';

    setTimeout(() => { msgEl.textContent = ''; }, 3000);
    renderAuditUsers();
}

function deleteUser(username) {
    if (!confirm('Delete user "' + username + '"? This cannot be undone.')) return;
    let users = JSON.parse(localStorage.getItem('ilManagedUsers') || '[]');
    users = users.filter(u => !(u.username === username && !u.isDefault));
    localStorage.setItem('ilManagedUsers', JSON.stringify(users));
    renderAuditUsers();
}

// Audit tab click handlers
document.querySelectorAll('.audit-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.audit-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.audit === 'users') renderAuditUsers();
        else renderAuditLogs();
    });
});

// ===== INIT =====
loadUser();
initAuditLogs();
renderRiskFlow();
renderStoryChips();
renderStory('EXW');
renderLessons();

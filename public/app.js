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
        document.title = `DA Training — ${config.name} Training`;

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
    header.innerHTML = `<h1>${config.icon} ${config.name} Dashboard</h1><p>DA Insurance Training — ${config.description}</p>`;

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
                        <span style="padding:10px 8px;background:var(--border);border:1px solid var(--border);border-radius:0 6px 6px 0;font-size:12px;color:var(--text-secondary);">@da-insurance.com</span>
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

    const email = (emailPrefix || username) + '@da-insurance.com';
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

// ===== CHATBOT =====
function toggleChatbot() {
    const chat = document.getElementById('chatbot');
    const btn = document.getElementById('chatToggleBtn');
    if (chat.style.display === 'none') {
        chat.style.display = 'flex';
        btn.style.display = 'none';
        document.getElementById('chatInput').focus();
    } else {
        chat.style.display = 'none';
        btn.style.display = 'block';
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    appendChatMessage(msg, 'user');
    setTimeout(() => { appendChatMessage(getChatbotResponse(msg), 'bot'); }, 300);
}

document.getElementById('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });

function appendChatMessage(text, type) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg ' + type;
    div.innerHTML = '<p>' + text + '</p>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function chatAddonClick(code) {
    appendChatMessage(code, 'user');
    setTimeout(function() { appendChatMessage(getChatbotResponse(code), 'bot'); }, 200);
}

// Insurance knowledge base for common questions
const insuranceKnowledge = {
    "under insurance": "**Underinsurance (Average Clause)** means your property is insured for LESS than its actual value. If you're underinsured, claims are reduced proportionately.\n\n**Formula:** Claim = (Sum Insured ÷ Actual Value) × Loss Amount\n\n**Example:** Property worth ₹2Cr insured for ₹1Cr (50% underinsured). A ₹40L loss → you only get ₹20L.\n\n**How to avoid:** Regular valuations, Escalation Clause add-on, Day-1 Reinstatement basis, or Agreed Value policy.",
    "average clause": "**Average Clause** penalizes underinsurance. If Sum Insured < Actual Value, every claim is reduced proportionately.\n\n**Formula:** Claim Payable = (Sum Insured ÷ Actual Value) × Loss Amount\n\n**Example:** SI = ₹50L, Actual Value = ₹1Cr. You're 50% underinsured. A ₹20L claim pays only ₹10L.\n\n**Solution:** Ensure adequate Sum Insured. Use Escalation Clause to auto-adjust for inflation.",
    "reinstatement value": "**Reinstatement Value** means the policy covers FULL replacement/rebuilding cost WITHOUT deducting depreciation (no 'new for old' deduction).\n\n**vs Market Value:** Market Value deducts depreciation. A 10-year-old machine worth ₹50L new but ₹30L at market value → Reinstatement pays ₹50L, Market pays ₹30L.\n\n**Condition:** Insured MUST actually reinstate (rebuild/replace) the property to claim full amount.",
    "sfsp": "**SFSP (Standard Fire & Special Perils Policy)** is the foundational property insurance in India.\n\n**Perils Covered:** Fire, Lightning, Explosion, Aircraft Damage, Riot/Strike, Storm/Flood (STFI), Impact Damage, Subsidence/Landslide, Bursting of Pipes, Missile Testing, Sprinkler Leakage, Bush Fire.\n\n**Property Covered:** Building (incl. plinth & foundation), Plant & Machinery, Stocks (RM, WIP, FG), Furniture/Fixtures.\n\n**Key Exclusion:** Electrical/mechanical breakdown, war, nuclear, pollution, willful damage.",
    "iar": "**IAR (Industrial All Risk)** is a comprehensive property policy covering ALL risks of physical loss or damage EXCEPT specific exclusions.\n\n**Key difference from SFSP:** SFSP = named perils only. IAR = everything unless excluded.\n\n**Suitable for:** Large industrial properties (typically SI > ₹50Cr). Includes automatic covers: Additions/Alterations (15%), Temporary Removal (10%), Professional Fees, Debris Removal.\n\n**Fewer exclusions** than SFSP — broader coverage overall.",
    "business interruption": "**Business Interruption (Consequential Loss/Fire BI)** covers loss of Gross Profit when business is interrupted by insured damage.\n\n**Key Elements:**\n• Indemnity Period: 12/18/24/36 months\n• Covers: Lost profits + Standing charges + Increased Cost of Working\n• Trigger: MUST have valid material damage claim (SFSP/IAR)\n\n**Important:** BI loss often exceeds material damage. A ₹1Cr fire can cause ₹5Cr+ in lost profits during rebuilding.",
    "earthquake": "**Earthquake Cover** is an add-on to SFSP/IAR covering seismic damage.\n\n**Two variants:**\n• Fire & Shock (wider) — covers structural damage + fire from earthquake\n• Fire Only (narrower) — only covers fire resulting from earthquake\n\n**Zone-based rating:** Zone II (low) to Zone V (highest risk/premium)\n**Deductible:** Typically 5% of claim or ₹10,000 (whichever higher)\n\n**Without it:** ALL earthquake damage is excluded — collapse, cracks, foundation shift, fire from quake — ZERO payout.",
    "terrorism": "**Terrorism Cover** protects against property damage from declared acts of terrorism.\n\n**Provided by:** Indian Market Terrorism Risk Insurance Pool (backed by GIC Re)\n**Definition:** Act declared as terrorism by competent government authority\n**Covers:** Property damage + BI (if underlying BI exists)\n\n**Without it:** Any terrorism-related damage — bomb blast, arson, even collateral damage from nearby attack — fully excluded.",
    "stfi": "**STFI (Storm, Tempest, Flood, Inundation)** covers damage from natural weather events.\n\n**Covers:** Cyclone, typhoon, hurricane, tornado, tsunami, flood, and water inundation\n**Excess:** Typically 1-5% of claim amount\n**Critical for:** Coastal properties, riverine locations, low-lying areas\n\n**Without it:** ALL flood, storm, and cyclone damage is excluded. Factory flooded in monsoon? Roof blown off in cyclone? Zero claim.",
    "car": "**CAR (Contractor's All Risk)** covers civil construction projects.\n\n**Section I:** Material Damage to contract works\n**Section II:** Third Party Liability\n**Section III:** Surrounding Property (optional)\n\n**Covers:** Fire, flood, earthquake, theft, faulty workmanship (consequential damage), design defect (resultant damage)\n**Period:** Start of work → Handover + Maintenance Period (12-24 months)",
    "ear": "**EAR (Erection All Risk)** covers mechanical/electrical equipment during installation.\n\n**Covers:** Transit to site → Storage → Erection → Testing → Commissioning\n**Most claims:** During testing & commissioning period (4-12 weeks)\n**Key difference from CAR:** CAR = civil works, EAR = mechanical/electrical installation\n\nMany projects need BOTH — e.g., power plant needs EAR for turbines + CAR for the building.",
    "mbd": "**MBD (Machinery Breakdown)** covers sudden, unforeseen physical damage to operational machinery.\n\n**Covers:** Electrical short circuit, mechanical failure, centrifugal force, operator error, defective material, water hammer\n**NOT Covered:** Gradual wear & tear, corrosion, routine maintenance, overhaul costs\n\n**Critical rule:** Machine must be successfully commissioned and in normal operation. Only SUDDEN failures covered.",
    "d&o": "**D&O (Directors & Officers Liability)** protects directors against personal liability for wrongful acts.\n\n**Structure:**\n• Side A: Directors when company can't indemnify (insolvency)\n• Side B: Reimburses company for indemnifying directors\n• Side C: Entity cover for securities claims\n\n**Basis:** Claims-made (not occurrence)\n**Covers:** Shareholder suits, regulatory investigations (SEBI/RBI/MCA), employment claims, breach of fiduciary duty",
    "cgl": "**CGL (Commercial General Liability)** is the broadest general liability cover.\n\n**Coverage Parts:**\n• Premises Liability (slip & fall, visitor injuries)\n• Operations Liability (damage at other locations)\n• Products/Completed Operations (injury from products after sale)\n• Personal & Advertising Injury (defamation, copyright)\n\n**Trigger:** Occurrence-based\n**Defense costs:** IN ADDITION to limit (doesn't erode indemnity)",
    "cyber": "**Cyber Liability Insurance** covers data breaches, ransomware, and network failures.\n\n**First-party:** Breach response costs, data restoration, BI from network outage, ransomware payments, PR/reputation costs\n**Third-party:** Claims from affected data subjects, regulatory fines (DPDP Act up to ₹250Cr), PCI fines\n\n**DPDP Act 2023:** 72-hour mandatory breach notification. Essential for IT, BFSI, healthcare, e-commerce.",
    "spontaneous combustion": "**Spontaneous Combustion** covers self-ignition/spontaneous heating of stocks. Standard SFSP specifically excludes fire caused by inherent nature of goods.\n\n**Essential for:** Coal yards, cotton/jute warehouses, oil seed storage, chemical manufacturers, fertilizer godowns\n\n**Without it:** Any claim from self-heating or spontaneous ignition is REJECTED outright. This is one of the most common claim rejections in commodity warehouses.",
    "debris removal": "**Debris Removal** covers the cost of clearing wreckage before reconstruction. Standard SFSP gives only 1% of claim amount.\n\n**This add-on:** Extends to cover ACTUAL debris clearing costs (can be 5-15% of total loss)\n\n**Important for:** Multi-storey buildings, industrial units with heavy machinery, chemical plants\n\n**Without it:** Only 1% of claim allowed for debris. If clearing costs ₹15L on a ₹1Cr claim, you get only ₹1L — bearing ₹14L yourself."
};

function getChatbotResponse(query) {
    const q = query.toLowerCase();
    const allAddons = getAllAddons();

    // FIRST: Check knowledge base for conceptual questions
    for (var key in insuranceKnowledge) {
        if (q.includes(key)) {
            return insuranceKnowledge[key].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        }
    }

    // Check if asking about a specific addon by code
    const matchedAddon = allAddons.find(a => q.includes(a.code.toLowerCase()) || a.name.toLowerCase().split('(')[0].trim().split('/')[0].trim().length > 4 && q.includes(a.name.toLowerCase().split('(')[0].trim().split('/')[0].trim().substring(0,15)));
    if (matchedAddon) {
        let r = '<strong>' + matchedAddon.code + ' — ' + matchedAddon.name + '</strong><br>' + matchedAddon.description;
        if (matchedAddon.whoShouldTake) r += '<br><br><strong>Who should take it:</strong> ' + matchedAddon.whoShouldTake;
        if (matchedAddon.claimImpact) r += '<br><br><strong>⚠️ If not opted:</strong> ' + matchedAddon.claimImpact;
        r += '<br><br><em>(' + matchedAddon.lobIcon + ' ' + matchedAddon.lobName + ')</em>';
        return r;
    }

    // Check "which addons for [product]"
    var prodMatch = q.match(/(?:addon|add-on|cover|extension)s?\s*(?:for|of|in|under)\s+(\w+)/i);
    if (!prodMatch) prodMatch = q.match(/(\w{2,6})\s*(?:addon|add-on|cover|extension)/i);
    if (prodMatch) {
        var pc = prodMatch[1].toUpperCase();
        var relevant = allAddons.filter(function(a) { return !a.relevantProducts || a.relevantProducts.length === 0 || a.relevantProducts.includes(pc); });
        if (relevant.length > 0) {
            var top5 = relevant.slice(0, 5);
            return 'Found <strong>' + relevant.length + ' add-ons</strong> for <strong>' + pc + '</strong>:<br><br>' + top5.map(function(a) { return '• <a href="#" onclick="chatAddonClick(\'' + a.code + '\');return false;" style="color:var(--accent-primary);text-decoration:underline;font-weight:700;cursor:pointer;">' + a.code + '</a> — ' + a.name; }).join('<br>') + (relevant.length > 5 ? '<br><br>...and ' + (relevant.length - 5) + ' more. Use Learning Module → Product Slicer to see all.' : '');
        }
    }

    // Check "what if" / "without" / "impact"
    if (q.includes('what if') || q.includes('without') || q.includes('impact') || q.includes('not take')) {
        var kws = q.replace(/what if|without|impact|not take|don't take|i|the|do/gi, '').trim().split(/\s+/);
        var matches = allAddons.filter(function(a) { var s = (a.name + ' ' + a.code + ' ' + a.description).toLowerCase(); return kws.some(function(k) { return k.length > 3 && s.includes(k); }); });
        if (matches.length > 0) return '<strong>⚠️ ' + matches[0].code + ' — ' + matches[0].name + '</strong><br><br>' + (matches[0].claimImpact || 'Claim impact info not available.');
    }

    // Check for product info
    var lobs = ['fire', 'engineering', 'liability'];
    for (var i = 0; i < lobs.length; i++) {
        var ld = lobPolicies[lobs[i]];
        if (!ld) continue;
        var mp = ld.policies.find(function(p) { return q.includes(p.code.toLowerCase()) || (p.name.length > 10 && q.includes(p.name.toLowerCase().substring(0, 12))); });
        if (mp) return '<strong>' + mp.code + ' — ' + mp.name + '</strong><br><br>' + mp.description + '<br><br><em>(' + lobConfig[lobs[i]].icon + ' ' + lobConfig[lobs[i]].name + ')</em>';
    }

    // Keyword search — prioritize phrase match, then all-words, then any-word
    var stopWords = ['what','is','the','a','an','for','of','in','to','and','or','cover','coverage','clause','about','tell','me','explain','does','do','which','how','why','take','get','need','insurance','policy','add-on','addon','under'];
    var words = q.split(/\s+/).filter(function(w) { return w.length > 2 && stopWords.indexOf(w) === -1; });
    if (words.length > 0) {
        var phraseQ = words.join(' ');
        // Priority 1: Full phrase match in name or code
        var phraseMatch = allAddons.filter(function(a) { var s = (a.name + ' ' + a.code).toLowerCase(); return s.includes(phraseQ); });
        if (phraseMatch.length > 0) {
            var t3 = phraseMatch.slice(0, 3);
            return 'Found <strong>' + phraseMatch.length + ' related add-on(s)</strong>:<br><br>' + t3.map(function(a) { return '• <a href="#" onclick="chatAddonClick(\'' + a.code + '\');return false;" style="color:var(--accent-primary);text-decoration:underline;font-weight:700;cursor:pointer;">' + a.code + '</a> (' + a.lobIcon + ') — ' + a.name; }).join('<br>') + (phraseMatch.length > 3 ? '<br><br>...and ' + (phraseMatch.length - 3) + ' more.' : '');
        }
        // Priority 2: All significant words must match
        var allWordsMatch = allAddons.filter(function(a) { var s = (a.name + ' ' + a.code + ' ' + a.description + ' ' + (a.whoShouldTake || '')).toLowerCase(); return words.every(function(k) { return s.includes(k); }); });
        if (allWordsMatch.length > 0) {
            var t3 = allWordsMatch.slice(0, 5);
            return 'Found <strong>' + allWordsMatch.length + ' related add-on(s)</strong>:<br><br>' + t3.map(function(a) { return '• <a href="#" onclick="chatAddonClick(\'' + a.code + '\');return false;" style="color:var(--accent-primary);text-decoration:underline;font-weight:700;cursor:pointer;">' + a.code + '</a> (' + a.lobIcon + ') — ' + a.name; }).join('<br>') + (allWordsMatch.length > 5 ? '<br><br>...and ' + (allWordsMatch.length - 5) + ' more.' : '');
        }
        // Priority 3: Any significant word matches (fallback) — but require at least 4 char words
        var sigWords = words.filter(function(w) { return w.length > 3; });
        if (sigWords.length > 0) {
            var found = allAddons.filter(function(a) { var s = (a.name + ' ' + a.code + ' ' + a.description + ' ' + (a.whoShouldTake || '')).toLowerCase(); return sigWords.some(function(k) { return s.includes(k); }); });
            if (found.length > 0 && found.length <= 10) {
                var t3 = found.slice(0, 5);
                return 'Found <strong>' + found.length + ' related add-on(s)</strong>:<br><br>' + t3.map(function(a) { return '• <a href="#" onclick="chatAddonClick(\'' + a.code + '\');return false;" style="color:var(--accent-primary);text-decoration:underline;font-weight:700;cursor:pointer;">' + a.code + '</a> (' + a.lobIcon + ') — ' + a.name; }).join('<br>') + (found.length > 5 ? '<br><br>...and ' + (found.length - 5) + ' more. Try being more specific.' : '');
            } else if (found.length > 10) {
                return 'Found ' + found.length + ' results — too many matches. Try a more specific query like the addon name or code. Examples: "valet parking", "spontaneous combustion", "ESCALATION"';
            }
        }
    }

    // Default
    var defs = [
        'Try asking about a specific add-on by name or code. Example: "What is spontaneous combustion?" or "Tell me about SFSP"',
        'I can help with: add-on covers, product info, claim impact. Try: "Which add-ons for CAR?" or "What if I don\'t take earthquake cover?"',
        'I search across 130+ insurance add-ons. Try keywords like: "earthquake", "terrorism", "debris", "customs duty", "sprinkler"'
    ];
    return defs[Math.floor(Math.random() * defs.length)];
}

// ===== INIT =====
loadUser();
initAuditLogs();
renderRiskFlow();
renderStoryChips();
renderStory('EXW');
renderLessons();

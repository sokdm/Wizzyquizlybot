// Wiz Quizzly - Main App
const API_URL = 'https://wizzyquizlybot.onrender.com/api';

let tg = window.Telegram.WebApp;
let currentUser = null;
let currentSession = null;
let timerInterval = null;
let timeLeft = 10;
let currentLevel = 1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    tg.ready();
    tg.expand();
    
    tg.setHeaderColor('#0a0a0f');
    tg.setBackgroundColor('#0a0a0f');
    
    initAuth();
    initEventListeners();
    createParticles();
});

function initEventListeners() {
    // Sidebar toggles
    const menuToggles = ['menu-toggle', 'levels-menu-toggle', 'profile-menu-toggle', 'leaderboard-menu-toggle', 'referral-menu-toggle'];
    menuToggles.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', openSidebar);
    });
    
    document.getElementById('close-sidebar')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
    
    // Navigation
    document.getElementById('nav-profile')?.addEventListener('click', () => { closeSidebar(); showProfile(); });
    document.getElementById('nav-levels')?.addEventListener('click', () => { closeSidebar(); showLevels(); });
    document.getElementById('nav-leaderboard')?.addEventListener('click', () => { closeSidebar(); showLeaderboard(); });
    document.getElementById('nav-referral')?.addEventListener('click', () => { closeSidebar(); showReferral(); });
    
    // Welcome
    document.getElementById('start-btn')?.addEventListener('click', showLevels);
    
    // Level Result
    document.getElementById('retry-level-btn')?.addEventListener('click', retryLevel);
    document.getElementById('next-level-btn')?.addEventListener('click', nextLevel);
    document.getElementById('back-to-levels-btn')?.addEventListener('click', showLevels);
    
    // Profile
    document.getElementById('back-btn')?.addEventListener('click', showWelcome);
    document.getElementById('daily-reward-btn')?.addEventListener('click', claimDailyReward);
    
    // Leaderboard
    document.getElementById('leaderboard-back-btn')?.addEventListener('click', showWelcome);
    
    // Referral
    document.getElementById('copy-code-btn')?.addEventListener('click', copyReferralCode);
    document.getElementById('share-referral-btn')?.addEventListener('click', shareReferral);
}

// Sidebar Functions
function openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('open');
    updateSidebarInfo();
}

function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
}

function updateSidebarInfo() {
    if (currentUser) {
        const nameEl = document.getElementById('sidebar-name');
        const levelEl = document.getElementById('sidebar-level');
        const avatarEl = document.getElementById('sidebar-avatar');
        
        if (nameEl) nameEl.textContent = currentUser.first_name || currentUser.username;
        if (levelEl) levelEl.textContent = currentUser.level;
        if (avatarEl) avatarEl.textContent = currentUser.first_name?.[0] || '👤';
    }
}

// Auth
async function initAuth() {
    try {
        const initData = tg.initData;
        if (!initData) {
            console.log('No initData available');
            return;
        }
        
        const response = await fetch(\`\${API_URL}/auth/verify\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: initData })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUI();
            
            // Check referral
            const urlParams = new URLSearchParams(window.location.search);
            const refCode = urlParams.get('ref');
            if (refCode) {
                claimReferral(refCode);
            }
        } else {
            console.error('Auth failed:', await response.text());
        }
    } catch (error) {
        console.error('Auth error:', error);
    }
}

// Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

function showWelcome() {
    showScreen('welcome-screen');
    stopTimer();
}

// Particles
function createParticles() {
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        document.body.appendChild(particle);
    }
}

// Levels Screen
async function showLevels() {
    try {
        const response = await fetch(\`\${API_URL}/quiz/levels\`, {
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load levels');
        }
        
        const data = await response.json();
        currentUser.level = data.current_level;
        
        const grid = document.getElementById('levels-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // Show levels 1-50 initially
        const displayLevels = Math.min(50, data.levels.length);
        
        for (let i = 0; i < displayLevels; i++) {
            const level = data.levels[i];
            const item = document.createElement('div');
            item.className = \`level-item \${level.status}\`;
            item.innerHTML = \`
                <span class="level-number">\${level.level}</span>
                \${level.status === 'completed' ? '<span class="level-star">⭐</span>' : ''}
            \`;
            
            if (level.status !== 'locked') {
                item.addEventListener('click', () => startLevel(level.level));
            }
            
            grid.appendChild(item);
        }
        
        showScreen('levels-screen');
        
    } catch (error) {
        console.error('Levels error:', error);
        tg.showAlert('Failed to load levels: ' + error.message);
    }
}

// Start Level
async function startLevel(level) {
    currentLevel = level;
    
    try {
        console.log('Starting level:', level);
        
        const response = await fetch(\`\${API_URL}/quiz/start-level\`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData
            },
            body: JSON.stringify({ level })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to start level');
        }
        
        const data = await response.json();
        console.log('Level started:', data);
        
        currentSession = data.session_id;
        showQuestion(data);
        
    } catch (error) {
        console.error('Start level error:', error);
        tg.showAlert('Failed to start level: ' + error.message);
    }
}

// Show Question
function showQuestion(data) {
    showScreen('game-screen');
    
    const levelEl = document.getElementById('current-level');
    const qCurrentEl = document.getElementById('q-current');
    const scoreEl = document.getElementById('current-score');
    const qTextEl = document.getElementById('question-text');
    const catTagEl = document.getElementById('category-tag');
    const progressEl = document.getElementById('quiz-progress');
    
    if (levelEl) levelEl.textContent = currentLevel;
    if (qCurrentEl) qCurrentEl.textContent = data.current_question;
    if (scoreEl) scoreEl.textContent = currentUser?.score || 0;
    if (qTextEl) qTextEl.textContent = data.question.question;
    if (catTagEl) catTagEl.textContent = data.question.category;
    if (progressEl) progressEl.style.width = \`\${((data.current_question - 1) / 10) * 100}%\`;
    
    const optionsContainer = document.getElementById('options-container');
    if (!optionsContainer) return;
    
    optionsContainer.innerHTML = '';
    
    data.question.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.onclick = () => submitAnswer(index);
        optionsContainer.appendChild(btn);
    });
    
    startTimer();
}

// Timer
function startTimer() {
    timeLeft = 10;
    clearInterval(timerInterval);
    
    const timerBar = document.getElementById('timer-bar');
    const timerText = document.getElementById('timer-text');
    
    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        const percentage = (timeLeft / 10) * 100;
        if (timerBar) timerBar.style.width = \`\${percentage}%\`;
        if (timerText) timerText.textContent = \`\${Math.ceil(timeLeft)}s\`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitAnswer(-1);
        }
    }, 100);
}

function stopTimer() {
    clearInterval(timerInterval);
}

// Submit Answer - FIXED VERSION
async function submitAnswer(answerIndex) {
    stopTimer();
    
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    const currentQNum = parseInt(document.getElementById('q-current')?.textContent || '1');
    console.log('Submitting answer for question:', currentQNum, 'Answer:', answerIndex);
    
    try {
        const response = await fetch(\`\${API_URL}/quiz/answer\`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData
            },
            body: JSON.stringify({
                answer_index: answerIndex,
                time_taken: Math.round((10 - timeLeft) * 10) / 10
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            throw new Error('Server error: ' + response.status);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        // Visual feedback
        if (answerIndex !== -1) {
            if (data.correct) {
                buttons[answerIndex].classList.add('correct');
                tg.HapticFeedback?.notificationOccurred('success');
            } else {
                buttons[answerIndex].classList.add('wrong');
                if (data.correct_answer !== -1 && data.correct_answer !== answerIndex) {
                    buttons[data.correct_answer]?.classList.add('correct');
                }
                tg.HapticFeedback?.notificationOccurred('error');
            }
        }
        
        // Check if level is complete
        if (data.level_complete) {
            console.log('Level complete! Passed:', data.passed);
            setTimeout(() => {
                showLevelResults(data.results, data.passed);
            }, 1500);
        } else {
            // Show next question
            setTimeout(() => {
                showQuestion({
                    session_id: currentSession,
                    total_questions: 10,
                    current_question: data.current_question,
                    progress: data.progress,
                    question: data.next_question
                });
            }, 1000);
        }
        
    } catch (error) {
        console.error('Submit error:', error);
        tg.showAlert('Error submitting answer: ' + error.message);
        
        // Re-enable buttons on error so user can retry
        buttons.forEach(btn => btn.disabled = false);
    }
}

// Show Level Results
function showLevelResults(results, passed) {
    showScreen('level-result-screen');
    
    const iconEl = document.getElementById('level-result-icon');
    const titleEl = document.getElementById('level-result-title');
    const msgEl = document.getElementById('level-message');
    const correctEl = document.getElementById('result-correct');
    const wrongEl = document.getElementById('result-wrong');
    const retryBtn = document.getElementById('retry-level-btn');
    const nextBtn = document.getElementById('next-level-btn');
    
    const icon = passed ? '🎉' : '😢';
    const title = passed ? 'Level Complete!' : 'Level Failed';
    const message = passed ? 'Perfect! Next level unlocked!' : 'You need 10/10 correct to proceed. Try again!';
    
    if (iconEl) iconEl.textContent = icon;
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (correctEl) correctEl.textContent = results.correct;
    if (wrongEl) wrongEl.textContent = results.wrong;
    
    if (retryBtn) retryBtn.style.display = passed ? 'none' : 'block';
    if (nextBtn) nextBtn.style.display = passed ? 'block' : 'none';
    
    if (passed && currentUser) {
        currentUser.level = Math.max(currentUser.level, currentLevel + 1);
    }
}

function retryLevel() {
    startLevel(currentLevel);
}

function nextLevel() {
    startLevel(currentLevel + 1);
}

// Profile
async function showProfile() {
    try {
        const response = await fetch(\`\${API_URL}/user/profile\`, {
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        
        if (!response.ok) throw new Error('Failed to load profile');
        
        const data = await response.json();
        
        const usernameEl = document.getElementById('profile-username');
        const levelEl = document.getElementById('profile-level');
        const scoreEl = document.getElementById('profile-score');
        const gamesEl = document.getElementById('profile-games');
        const streakEl = document.getElementById('profile-streak');
        const accuracyEl = document.getElementById('profile-accuracy');
        const xpTextEl = document.getElementById('xp-text');
        const xpBarEl = document.getElementById('profile-xp-bar');
        const rewardBtn = document.getElementById('daily-reward-btn');
        const avatarEl = document.getElementById('user-avatar');
        
        if (usernameEl) usernameEl.textContent = data.first_name || data.username;
        if (levelEl) levelEl.textContent = data.level;
        if (scoreEl) scoreEl.textContent = data.score.toLocaleString();
        if (gamesEl) gamesEl.textContent = data.games_played;
        if (streakEl) streakEl.textContent = data.max_streak;
        if (accuracyEl) accuracyEl.textContent = \`\${data.accuracy}%\`;
        if (xpTextEl) xpTextEl.textContent = \`\${data.xp}/\${data.xp_needed} XP\`;
        if (xpBarEl) xpBarEl.style.width = \`\${data.xp_progress}%\`;
        if (rewardBtn) rewardBtn.style.display = data.can_claim_daily ? 'block' : 'none';
        
        if (data.photo_url && avatarEl) {
            avatarEl.innerHTML = \`<img src="\${data.photo_url}" style="width:100%;height:100%;border-radius:50%;">\`;
        }
        
        showScreen('profile-screen');
        
    } catch (error) {
        console.error('Profile error:', error);
        tg.showAlert('Failed to load profile');
    }
}

async function claimDailyReward() {
    try {
        const response = await fetch(\`\${API_URL}/user/claim-daily\`, {
            method: 'POST',
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        
        const data = await response.json();
        
        if (data.success) {
            tg.showAlert(\`🎉 Daily reward claimed! +\${data.reward} points\`);
            const rewardBtn = document.getElementById('daily-reward-btn');
            if (rewardBtn) rewardBtn.style.display = 'none';
            showProfile();
        }
    } catch (error) {
        console.error('Claim error:', error);
    }
}

// Leaderboard
async function showLeaderboard() {
    try {
        const response = await fetch(\`\${API_URL}/leaderboard\`, {
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        
        if (!response.ok) throw new Error('Failed to load leaderboard');
        
        const data = await response.json();
        
        const list = document.getElementById('leaderboard-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        data.top_players.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = \`leaderboard-item \${player.is_current_user ? 'current-user' : ''}\`;
            
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : \`#\${player.rank}\`;
            
            item.innerHTML = \`
                <div class="rank-number \${index < 3 ? 'top-3' : ''}">\${rankEmoji}</div>
                <div class="leaderboard-avatar">\${player.first_name?.[0] || player.username[0]}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-username">\${player.first_name || player.username}</div>
                    <div class="leaderboard-level">Level \${player.level}</div>
                </div>
                <div class="leaderboard-score">\${player.score.toLocaleString()}</div>
            \`;
            
            list.appendChild(item);
        });
        
        const userRankEl = document.getElementById('user-rank');
        const userRankScoreEl = document.getElementById('user-rank-score');
        
        if (userRankEl) userRankEl.textContent = data.current_user.rank;
        if (userRankScoreEl) userRankScoreEl.textContent = \`\${data.current_user.score.toLocaleString()} pts\`;
        
        showScreen('leaderboard-screen');
        
    } catch (error) {
        console.error('Leaderboard error:', error);
    }
}

// Referral
async function showReferral() {
    try {
        const response = await fetch(\`\${API_URL}/referral/code\`, {
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        
        if (!response.ok) throw new Error('Failed to load referral');
        
        const data = await response.json();
        
        const codeEl = document.getElementById('referral-code');
        const countEl = document.getElementById('referral-count');
        const bonusEl = document.getElementById('referral-bonus');
        
        if (codeEl) codeEl.textContent = data.code;
        if (countEl) countEl.textContent = data.referrals_count;
        if (bonusEl) bonusEl.textContent = data.bonus_earned;
        
        showScreen('referral-screen');
        
    } catch (error) {
        console.error('Referral error:', error);
    }
}

function copyReferralCode() {
    const code = document.getElementById('referral-code')?.textContent;
    if (!code) return;
    
    navigator.clipboard.writeText(code).then(() => {
        tg.showAlert('Referral code copied!');
    }).catch(() => {
        tg.showAlert('Failed to copy code');
    });
}

function shareReferral() {
    const code = document.getElementById('referral-code')?.textContent;
    if (!code) return;
    
    const link = \`https://t.me/Wizzyquizlybot?start=\${code}\`;
    const text = 'Join me in Wiz Quizzly! 🎩✨';
    
    tg.openTelegramLink(\`https://t.me/share/url?url=\${encodeURIComponent(link)}&text=\${encodeURIComponent(text)}\`);
}

async function claimReferral(code) {
    try {
        const initData = tg.initData;
        if (!initData) return;
        
        const userData = JSON.parse(new URLSearchParams(initData).get('user'));
        
        await fetch(\`\${API_URL}/referral/claim\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                new_user_id: userData.id
            })
        });
    } catch (error) {
        console.error('Claim referral error:', error);
    }
}

function updateUI() {
    if (currentUser) {
        const levelEl = document.getElementById('current-level');
        const scoreEl = document.getElementById('current-score');
        
        if (levelEl) levelEl.textContent = currentUser.level;
        if (scoreEl) scoreEl.textContent = currentUser.score;
    }
}

// Prevent zoom on double tap
document.addEventListener('dblclick', function(event) {
    event.preventDefault();
}, { passive: false });

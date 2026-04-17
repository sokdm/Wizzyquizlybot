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
    // Sidebar
    document.getElementById('menu-toggle').addEventListener('click', openSidebar);
    document.getElementById('levels-menu-toggle')?.addEventListener('click', openSidebar);
    document.getElementById('profile-menu-toggle')?.addEventListener('click', openSidebar);
    document.getElementById('leaderboard-menu-toggle')?.addEventListener('click', openSidebar);
    document.getElementById('referral-menu-toggle')?.addEventListener('click', openSidebar);
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
    
    // Navigation
    document.getElementById('nav-profile').addEventListener('click', () => { closeSidebar(); showProfile(); });
    document.getElementById('nav-levels').addEventListener('click', () => { closeSidebar(); showLevels(); });
    document.getElementById('nav-leaderboard').addEventListener('click', () => { closeSidebar(); showLeaderboard(); });
    document.getElementById('nav-referral').addEventListener('click', () => { closeSidebar(); showReferral(); });
    
    // Welcome
    document.getElementById('start-btn').addEventListener('click', showLevels);
    
    // Level Result
    document.getElementById('retry-level-btn').addEventListener('click', retryLevel);
    document.getElementById('next-level-btn').addEventListener('click', nextLevel);
    document.getElementById('back-to-levels-btn').addEventListener('click', showLevels);
    
    // Profile
    document.getElementById('back-btn').addEventListener('click', showWelcome);
    document.getElementById('daily-reward-btn').addEventListener('click', claimDailyReward);
    
    // Leaderboard
    document.getElementById('leaderboard-back-btn').addEventListener('click', showWelcome);
    
    // Referral
    document.getElementById('copy-code-btn').addEventListener('click', copyReferralCode);
    document.getElementById('share-referral-btn').addEventListener('click', shareReferral);
}

// Sidebar Functions
function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('open');
    updateSidebarInfo();
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
}

function updateSidebarInfo() {
    if (currentUser) {
        document.getElementById('sidebar-name').textContent = currentUser.first_name || currentUser.username;
        document.getElementById('sidebar-level').textContent = currentUser.level;
        document.getElementById('sidebar-avatar').textContent = currentUser.first_name?.[0] || '👤';
    }
}

// Auth
async function initAuth() {
    try {
        const initData = tg.initData;
        
        const response = await fetch(`${API_URL}/auth/verify`, {
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
        }
    } catch (error) {
        console.error('Auth error:', error);
    }
}

// Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
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
        const response = await fetch(`${API_URL}/quiz/levels`, {
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        
        const data = await response.json();
        currentUser.level = data.current_level;
        
        const grid = document.getElementById('levels-grid');
        grid.innerHTML = '';
        
        // Show levels 1-50 initially
        const displayLevels = Math.min(50, data.levels.length);
        
        for (let i = 0; i < displayLevels; i++) {
            const level = data.levels[i];
            const item = document.createElement('div');
            item.className = `level-item ${level.status}`;
            item.innerHTML = `
                <span class="level-number">${level.level}</span>
                ${level.status === 'completed' ? '<span class="level-star">⭐</span>' : ''}
            `;
            
            if (level.status !== 'locked') {
                item.addEventListener('click', () => startLevel(level.level));
            }
            
            grid.appendChild(item);
        }
        
        showScreen('levels-screen');
        
    } catch (error) {
        console.error('Levels error:', error);
    }
}

// Start Level
async function startLevel(level) {
    currentLevel = level;
    
    try {
        const response = await fetch(`${API_URL}/quiz/start-level`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData
            },
            body: JSON.stringify({ level })
        });
        
        const data = await response.json();
        currentSession = data.session_id;
        
        showQuestion(data);
        
    } catch (error) {
        console.error('Start level error:', error);
        tg.showAlert('Failed to start level');
    }
}

// Show Question
function showQuestion(data) {
    showScreen('game-screen');
    
    document.getElementById('current-level').textContent = currentLevel;
    document.getElementById('q-current').textContent = data.current_question;
    document.getElementById('current-score').textContent = currentUser?.score || 0;
    document.getElementById('question-text').textContent = data.question.question;
    document.getElementById('category-tag').textContent = data.question.category;
    document.getElementById('quiz-progress').style.width = `${((data.current_question - 1) / 10) * 100}%`;
    
    const optionsContainer = document.getElementById('options-container');
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
        timerBar.style.width = `${percentage}%`;
        timerText.textContent = `${Math.ceil(timeLeft)}s`;
        
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
    
    try {
        const response = await fetch(`${API_URL}/quiz/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData
            },
            body: JSON.stringify({
                answer_index: answerIndex,
                time_taken: 10 - timeLeft
            })
        });
        
        const data = await response.json();
        
        // Visual feedback
        if (answerIndex !== -1) {
            if (data.correct) {
                buttons[answerIndex].classList.add('correct');
                tg.HapticFeedback.notificationOccurred('success');
            } else {
                buttons[answerIndex].classList.add('wrong');
                if (data.correct_answer !== -1 && data.correct_answer !== answerIndex) {
                    buttons[data.correct_answer].classList.add('correct');
                }
                tg.HapticFeedback.notificationOccurred('error');
            }
        }
        
        // Check if level is complete
        if (data.level_complete) {
            // Wait for animation then show results
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
        tg.showAlert('Error submitting answer. Please try again.');
    }
}

// Show Level Results - FIXED
function showLevelResults(results, passed) {
    showScreen('level-result-screen');
    
    const icon = passed ? '🎉' : '😢';
    const title = passed ? 'Level Complete!' : 'Level Failed';
    const message = passed ? 'Perfect! Next level unlocked!' : 'You need 10/10 correct to proceed. Try again!';
    
    document.getElementById('level-result-icon').textContent = icon;
    document.getElementById('level-result-title').textContent = title;
    document.getElementById('level-message').textContent = message;
    document.getElementById('result-correct').textContent = results.correct;
    document.getElementById('result-wrong').textContent = results.wrong;
    
    // Show/hide buttons based on pass/fail
    const retryBtn = document.getElementById('retry-level-btn');
    const nextBtn = document.getElementById('next-level-btn');
    
    if (passed) {
        retryBtn.style.display = 'none';
        nextBtn.style.display = 'block';
        // Update user level locally
        currentUser.level = Math.max(currentUser.level, currentLevel + 1);
    } else {
        retryBtn.style.display = 'block';
        nextBtn.style.display = 'none';
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
        const response = await fetch(`${API_URL}/user/profile`, {
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        
        const data = await response.json();
        
        document.getElementById('profile-username').textContent = data.first_name || data.username;
        document.getElementById('profile-level').textContent = data.level;
        document.getElementById('profile-score').textContent = data.score.toLocaleString();
        document.getElementById('profile-games').textContent = data.games_played;
        document.getElementById('profile-streak').textContent = data.max_streak;
        document.getElementById('profile-accuracy').textContent = `${data.accuracy}%`;
        document.getElementById('xp-text').textContent = `${data.xp}/${data.xp_needed} XP`;
        document.getElementById('profile-xp-bar').style.width = `${data.xp_progress}%`;
        
        const rewardBtn = document.getElementById('daily-reward-btn');
        rewardBtn.style.display = data.can_claim_daily ? 'block' : 'none';
        
        if (data.photo_url) {
            document.getElementById('user-avatar').innerHTML = `<img src="${data.photo_url}" style="width:100%;height:100%;border-radius:50%;">`;
        }
        
        showScreen('profile-screen');
        
    } catch (error) {
        console.error('Profile error:', error);
    }
}

async function claimDailyReward() {
    try {
        const response = await fetch(`${API_URL}/user/claim-daily`, {
            method: 'POST',
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        
        const data = await response.json();
        
        if (data.success) {
            tg.showAlert(`🎉 Daily reward claimed! +${data.reward} points`);
            document.getElementById('daily-reward-btn').style.display = 'none';
            showProfile();
        }
    } catch (error) {
        console.error('Claim error:', error);
    }
}

// Leaderboard
async function showLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`, {
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        
        const data = await response.json();
        
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '';
        
        data.top_players.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = `leaderboard-item ${player.is_current_user ? 'current-user' : ''}`;
            
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${player.rank}`;
            
            item.innerHTML = `
                <div class="rank-number ${index < 3 ? 'top-3' : ''}">${rankEmoji}</div>
                <div class="leaderboard-avatar">${player.first_name?.[0] || player.username[0]}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-username">${player.first_name || player.username}</div>
                    <div class="leaderboard-level">Level ${player.level}</div>
                </div>
                <div class="leaderboard-score">${player.score.toLocaleString()}</div>
            `;
            
            list.appendChild(item);
        });
        
        document.getElementById('user-rank').textContent = data.current_user.rank;
        document.getElementById('user-rank-score').textContent = `${data.current_user.score.toLocaleString()} pts`;
        
        showScreen('leaderboard-screen');
        
    } catch (error) {
        console.error('Leaderboard error:', error);
    }
}

// Referral
async function showReferral() {
    try {
        const response = await fetch(`${API_URL}/referral/code`, {
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        
        const data = await response.json();
        
        document.getElementById('referral-code').textContent = data.code;
        document.getElementById('referral-count').textContent = data.referrals_count;
        document.getElementById('referral-bonus').textContent = data.bonus_earned;
        
        showScreen('referral-screen');
        
    } catch (error) {
        console.error('Referral error:', error);
    }
}

function copyReferralCode() {
    const code = document.getElementById('referral-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        tg.showAlert('Referral code copied!');
    });
}

function shareReferral() {
    const code = document.getElementById('referral-code').textContent;
    const link = `https://t.me/Wizzyquizlybot?start=${code}`;
    
    tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me in Wiz Quizzly! 🎩✨')}`);
}

async function claimReferral(code) {
    try {
        const initData = tg.initData;
        const userData = JSON.parse(new URLSearchParams(initData).get('user'));
        
        await fetch(`${API_URL}/referral/claim`, {
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
        document.getElementById('current-level').textContent = currentUser.level;
        document.getElementById('current-score').textContent = currentUser.score;
    }
}

document.addEventListener('dblclick', function(event) {
    event.preventDefault();
}, { passive: false });

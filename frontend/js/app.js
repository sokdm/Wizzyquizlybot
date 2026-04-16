// Wiz Quizzly - Main App
const API_URL = 'https://wizzyquizlybot.onrender.com/api';

let tg = window.Telegram.WebApp;
let currentUser = null;
let currentQuestion = null;
let timerInterval = null;
let timeLeft = 10;
let currentStreak = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    tg.ready();
    tg.expand();
    
    // Set theme
    tg.setHeaderColor('#0a0a0f');
    tg.setBackgroundColor('#0a0a0f');
    
    // Initialize auth
    initAuth();
    
    // Event listeners
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('profile-btn').addEventListener('click', showProfile);
    document.getElementById('leaderboard-btn').addEventListener('click', showLeaderboard);
    document.getElementById('next-question-btn').addEventListener('click', loadQuestion);
    document.getElementById('quit-btn').addEventListener('click', quitGame);
    document.getElementById('back-btn').addEventListener('click', showWelcome);
    document.getElementById('leaderboard-back-btn').addEventListener('click', showWelcome);
    document.getElementById('daily-reward-btn').addEventListener('click', claimDailyReward);
    
    // Add particle effects
    createParticles();
});

// Particle effects
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

async function startGame() {
    showScreen('game-screen');
    await loadQuestion();
}

function quitGame() {
    if (confirm('Are you sure you want to quit? Your progress will be saved.')) {
        showWelcome();
    }
}

// Game Logic
async function loadQuestion() {
    try {
        showScreen('game-screen');
        
        const response = await fetch(`${API_URL}/quiz/question`, {
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        
        if (!response.ok) throw new Error('Failed to load question');
        
        const data = await response.json();
        currentQuestion = data;
        
        // Update UI
        document.getElementById('question-text').textContent = data.question;
        document.getElementById('category-tag').textContent = data.category;
        document.getElementById('current-level').textContent = currentUser?.level || 1;
        document.getElementById('current-score').textContent = currentUser?.score || 0;
        
        // Render options
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';
        
        data.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = option;
            btn.onclick = () => submitAnswer(index);
            optionsContainer.appendChild(btn);
        });
        
        // Start timer
        startTimer();
        
    } catch (error) {
        console.error('Load question error:', error);
        tg.showAlert('Failed to load question. Please try again.');
        showWelcome();
    }
}

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
                question_id: currentQuestion.id,
                answer_index: answerIndex,
                time_bonus: Math.ceil(timeLeft / 2)
            })
        });
        
        const data = await response.json();
        
        // Show visual feedback
        if (answerIndex !== -1) {
            if (data.correct) {
                buttons[answerIndex].classList.add('correct');
                tg.HapticFeedback.notificationOccurred('success');
            } else {
                buttons[answerIndex].classList.add('wrong');
                if (data.correct_answer !== -1) {
                    buttons[data.correct_answer].classList.add('correct');
                }
                tg.HapticFeedback.notificationOccurred('error');
            }
        }
        
        // Update user data
        currentUser.score = data.new_score;
        currentUser.xp = data.new_xp;
        currentUser.level = data.new_level;
        currentStreak = data.streak;
        
        // Show result after delay
        setTimeout(() => showResult(data), 1500);
        
    } catch (error) {
        console.error('Submit error:', error);
    }
}

function showResult(data) {
    showScreen('result-screen');
    
    const isCorrect = data.correct;
    document.getElementById('result-icon').textContent = isCorrect ? '🎉' : '😢';
    document.getElementById('result-title').textContent = isCorrect ? 'Correct!' : 'Wrong!';
    document.getElementById('result-message').textContent = isCorrect 
        ? `+${data.points_earned} points` 
        : 'Better luck next time!';
    
    document.getElementById('result-points').textContent = `+${data.points_earned}`;
    document.getElementById('result-xp').textContent = `+${data.xp_gained}`;
    document.getElementById('result-streak').textContent = data.streak;
    
    // Update streak display
    const streakContainer = document.getElementById('streak-container');
    if (data.streak > 1) {
        streakContainer.style.display = 'block';
        document.getElementById('streak-count').textContent = data.streak;
    } else {
        streakContainer.style.display = 'none';
    }
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
        
        // Daily reward button
        const rewardBtn = document.getElementById('daily-reward-btn');
        rewardBtn.style.display = data.can_claim_daily ? 'block' : 'none';
        
        // Avatar
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

function updateUI() {
    if (currentUser) {
        document.getElementById('current-level').textContent = currentUser.level;
        document.getElementById('current-score').textContent = currentUser.score;
    }
}

// Prevent zoom on double tap
document.addEventListener('dblclick', function(event) {
    event.preventDefault();
}, { passive: false });

// Wiz Quizzly - Main App
const API_URL = 'https://wizzyquizlybot.onrender.com/api';

let tg = window.Telegram.WebApp;
let currentUser = null;
let currentSession = null;
let timerInterval = null;
let timeLeft = 10;
let currentLevel = 1;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
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
    var menuToggles = ['menu-toggle', 'levels-menu-toggle', 'profile-menu-toggle', 'leaderboard-menu-toggle', 'referral-menu-toggle'];
    menuToggles.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', openSidebar);
    });
    
    var closeSidebarBtn = document.getElementById('close-sidebar');
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    
    var sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Navigation
    var navProfile = document.getElementById('nav-profile');
    if (navProfile) navProfile.addEventListener('click', function() { closeSidebar(); showProfile(); });
    
    var navLevels = document.getElementById('nav-levels');
    if (navLevels) navLevels.addEventListener('click', function() { closeSidebar(); showLevels(); });
    
    var navLeaderboard = document.getElementById('nav-leaderboard');
    if (navLeaderboard) navLeaderboard.addEventListener('click', function() { closeSidebar(); showLeaderboard(); });
    
    var navReferral = document.getElementById('nav-referral');
    if (navReferral) navReferral.addEventListener('click', function() { closeSidebar(); showReferral(); });
    
    // Welcome
    var startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', showLevels);
    
    // Level Result
    var retryBtn = document.getElementById('retry-level-btn');
    if (retryBtn) retryBtn.addEventListener('click', retryLevel);
    
    var nextBtn = document.getElementById('next-level-btn');
    if (nextBtn) nextBtn.addEventListener('click', nextLevel);
    
    var backToLevelsBtn = document.getElementById('back-to-levels-btn');
    if (backToLevelsBtn) backToLevelsBtn.addEventListener('click', showLevels);
    
    // Profile
    var backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', showWelcome);
    
    var dailyRewardBtn = document.getElementById('daily-reward-btn');
    if (dailyRewardBtn) dailyRewardBtn.addEventListener('click', claimDailyReward);
    
    // Leaderboard
    var leaderboardBackBtn = document.getElementById('leaderboard-back-btn');
    if (leaderboardBackBtn) leaderboardBackBtn.addEventListener('click', showWelcome);
    
    // Referral
    var copyCodeBtn = document.getElementById('copy-code-btn');
    if (copyCodeBtn) copyCodeBtn.addEventListener('click', copyReferralCode);
    
    var shareReferralBtn = document.getElementById('share-referral-btn');
    if (shareReferralBtn) shareReferralBtn.addEventListener('click', shareReferral);
}

// Sidebar Functions
function openSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
    updateSidebarInfo();
}

function closeSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

function updateSidebarInfo() {
    if (!currentUser) return;
    var nameEl = document.getElementById('sidebar-name');
    var levelEl = document.getElementById('sidebar-level');
    var avatarEl = document.getElementById('sidebar-avatar');
    
    if (nameEl) nameEl.textContent = currentUser.first_name || currentUser.username;
    if (levelEl) levelEl.textContent = currentUser.level;
    if (avatarEl) avatarEl.textContent = (currentUser.first_name && currentUser.first_name[0]) || '👤';
}

// Auth
function initAuth() {
    var initData = tg.initData;
    if (!initData) {
        console.log('No initData available');
        return;
    }
    
    fetch(API_URL + '/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData })
    })
    .then(function(response) {
        if (response.ok) return response.json();
        throw new Error('Auth failed');
    })
    .then(function(data) {
        currentUser = data.user;
        updateUI();
        
        // Check referral
        var urlParams = new URLSearchParams(window.location.search);
        var refCode = urlParams.get('ref');
        if (refCode) claimReferral(refCode);
    })
    .catch(function(error) {
        console.error('Auth error:', error);
    });
}

// Navigation
function showScreen(screenId) {
    var screens = document.querySelectorAll('.screen');
    screens.forEach(function(s) { s.classList.remove('active'); });
    var screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

function showWelcome() {
    showScreen('welcome-screen');
    stopTimer();
}

// Particles
function createParticles() {
    for (var i = 0; i < 20; i++) {
        var particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = (Math.random() * 100) + 'vw';
        particle.style.animationDelay = (Math.random() * 10) + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        document.body.appendChild(particle);
    }
}

// Levels Screen
function showLevels() {
    fetch(API_URL + '/quiz/levels', {
        headers: { 'X-Telegram-Init-Data': tg.initData }
    })
    .then(function(response) {
        if (!response.ok) throw new Error('Failed to load levels');
        return response.json();
    })
    .then(function(data) {
        currentUser.level = data.current_level;
        
        var grid = document.getElementById('levels-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // Show levels 1-50
        var displayLevels = Math.min(50, data.levels.length);
        
        for (var i = 0; i < displayLevels; i++) {
            var level = data.levels[i];
            var item = document.createElement('div');
            item.className = 'level-item ' + level.status;
            item.innerHTML = '<span class="level-number">' + level.level + '</span>' + 
                (level.status === 'completed' ? '<span class="level-star">⭐</span>' : '');
            
            if (level.status !== 'locked') {
                item.addEventListener('click', (function(l) {
                    return function() { startLevel(l); };
                })(level.level));
            }
            
            grid.appendChild(item);
        }
        
        showScreen('levels-screen');
    })
    .catch(function(error) {
        console.error('Levels error:', error);
        tg.showAlert('Failed to load levels: ' + error.message);
    });
}

// Start Level
function startLevel(level) {
    currentLevel = level;
    console.log('Starting level:', level);
    
    fetch(API_URL + '/quiz/start-level', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': tg.initData
        },
        body: JSON.stringify({ level: level })
    })
    .then(function(response) {
        if (!response.ok) {
            return response.json().then(function(err) { throw new Error(err.error); });
        }
        return response.json();
    })
    .then(function(data) {
        console.log('Level started:', data);
        currentSession = data.session_id;
        showQuestion(data);
    })
    .catch(function(error) {
        console.error('Start level error:', error);
        tg.showAlert('Failed to start level: ' + error.message);
    });
}

// Show Question
function showQuestion(data) {
    showScreen('game-screen');
    
    var levelEl = document.getElementById('current-level');
    var qCurrentEl = document.getElementById('q-current');
    var scoreEl = document.getElementById('current-score');
    var qTextEl = document.getElementById('question-text');
    var catTagEl = document.getElementById('category-tag');
    var progressEl = document.getElementById('quiz-progress');
    
    if (levelEl) levelEl.textContent = currentLevel;
    if (qCurrentEl) qCurrentEl.textContent = data.current_question;
    if (scoreEl) scoreEl.textContent = currentUser ? currentUser.score : 0;
    if (qTextEl) qTextEl.textContent = data.question.question;
    if (catTagEl) catTagEl.textContent = data.question.category;
    if (progressEl) progressEl.style.width = (((data.current_question - 1) / 10) * 100) + '%';
    
    var optionsContainer = document.getElementById('options-container');
    if (!optionsContainer) return;
    
    optionsContainer.innerHTML = '';
    
    data.question.options.forEach(function(option, index) {
        var btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.onclick = function() { submitAnswer(index); };
        optionsContainer.appendChild(btn);
    });
    
    startTimer();
}

// Timer
function startTimer() {
    timeLeft = 10;
    clearInterval(timerInterval);
    
    var timerBar = document.getElementById('timer-bar');
    var timerText = document.getElementById('timer-text');
    
    timerInterval = setInterval(function() {
        timeLeft -= 0.1;
        var percentage = (timeLeft / 10) * 100;
        if (timerBar) timerBar.style.width = percentage + '%';
        if (timerText) timerText.textContent = Math.ceil(timeLeft) + 's';
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitAnswer(-1);
        }
    }, 100);
}

function stopTimer() {
    clearInterval(timerInterval);
}

// Submit Answer - FIXED
function submitAnswer(answerIndex) {
    stopTimer();
    
    var buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(function(btn) { btn.disabled = true; });
    
    var qCurrentEl = document.getElementById('q-current');
    var currentQNum = qCurrentEl ? parseInt(qCurrentEl.textContent) : 1;
    console.log('Submitting answer for question:', currentQNum, 'Answer:', answerIndex);
    
    fetch(API_URL + '/quiz/answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': tg.initData
        },
        body: JSON.stringify({
            answer_index: answerIndex,
            time_taken: Math.round((10 - timeLeft) * 10) / 10
        })
    })
    .then(function(response) {
        console.log('Response status:', response.status);
        if (!response.ok) {
            return response.text().then(function(text) {
                throw new Error('Server error: ' + response.status + ' - ' + text);
            });
        }
        return response.json();
    })
    .then(function(data) {
        console.log('Response data:', data);
        
        // Visual feedback
        if (answerIndex !== -1 && answerIndex >= 0 && answerIndex < buttons.length) {
            if (data.correct) {
                buttons[answerIndex].classList.add('correct');
                if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            } else {
                buttons[answerIndex].classList.add('wrong');
                if (data.correct_answer >= 0 && data.correct_answer < buttons.length && data.correct_answer !== answerIndex) {
                    buttons[data.correct_answer].classList.add('correct');
                }
                if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
            }
        }
        
        // Check if level complete
        if (data.level_complete) {
            console.log('Level complete! Passed:', data.passed);
            setTimeout(function() {
                showLevelResults(data.results, data.passed);
            }, 1500);
        } else {
            // Show next question
            setTimeout(function() {
                showQuestion({
                    session_id: currentSession,
                    total_questions: 10,
                    current_question: data.current_question,
                    progress: data.progress,
                    question: data.next_question
                });
            }, 1000);
        }
    })
    .catch(function(error) {
        console.error('Submit error:', error);
        tg.showAlert('Error: ' + error.message);
        
        // Re-enable buttons on error
        buttons.forEach(function(btn) { btn.disabled = false; });
    });
}

// Show Level Results
function showLevelResults(results, passed) {
    showScreen('level-result-screen');
    
    var iconEl = document.getElementById('level-result-icon');
    var titleEl = document.getElementById('level-result-title');
    var msgEl = document.getElementById('level-message');
    var correctEl = document.getElementById('result-correct');
    var wrongEl = document.getElementById('result-wrong');
    var retryBtn = document.getElementById('retry-level-btn');
    var nextBtn = document.getElementById('next-level-btn');
    
    var icon = passed ? '🎉' : '😢';
    var title = passed ? 'Level Complete!' : 'Level Failed';
    var message = passed ? 'Perfect! Next level unlocked!' : 'You need 10/10 correct to proceed. Try again!';
    
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
function showProfile() {
    fetch(API_URL + '/user/profile', {
        headers: { 'X-Telegram-Init-Data': tg.initData }
    })
    .then(function(response) {
        if (!response.ok) throw new Error('Failed to load profile');
        return response.json();
    })
    .then(function(data) {
        var usernameEl = document.getElementById('profile-username');
        var levelEl = document.getElementById('profile-level');
        var scoreEl = document.getElementById('profile-score');
        var gamesEl = document.getElementById('profile-games');
        var streakEl = document.getElementById('profile-streak');
        var accuracyEl = document.getElementById('profile-accuracy');
        var xpTextEl = document.getElementById('xp-text');
        var xpBarEl = document.getElementById('profile-xp-bar');
        var rewardBtn = document.getElementById('daily-reward-btn');
        var avatarEl = document.getElementById('user-avatar');
        
        if (usernameEl) usernameEl.textContent = data.first_name || data.username;
        if (levelEl) levelEl.textContent = data.level;
        if (scoreEl) scoreEl.textContent = data.score.toLocaleString();
        if (gamesEl) gamesEl.textContent = data.games_played;
        if (streakEl) streakEl.textContent = data.max_streak;
        if (accuracyEl) accuracyEl.textContent = data.accuracy + '%';
        if (xpTextEl) xpTextEl.textContent = data.xp + '/' + data.xp_needed + ' XP';
        if (xpBarEl) xpBarEl.style.width = data.xp_progress + '%';
        if (rewardBtn) rewardBtn.style.display = data.can_claim_daily ? 'block' : 'none';
        
        if (data.photo_url && avatarEl) {
            avatarEl.innerHTML = '<img src="' + data.photo_url + '" style="width:100%;height:100%;border-radius:50%;">';
        }
        
        showScreen('profile-screen');
    })
    .catch(function(error) {
        console.error('Profile error:', error);
        tg.showAlert('Failed to load profile');
    });
}

function claimDailyReward() {
    fetch(API_URL + '/user/claim-daily', {
        method: 'POST',
        headers: { 'X-Telegram-Init-Data': tg.initData }
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            tg.showAlert('🎉 Daily reward claimed! +' + data.reward + ' points');
            var rewardBtn = document.getElementById('daily-reward-btn');
            if (rewardBtn) rewardBtn.style.display = 'none';
            showProfile();
        }
    })
    .catch(function(error) {
        console.error('Claim error:', error);
    });
}

// Leaderboard
function showLeaderboard() {
    fetch(API_URL + '/leaderboard', {
        headers: { 'X-Telegram-Init-Data': tg.initData }
    })
    .then(function(response) {
        if (!response.ok) throw new Error('Failed to load leaderboard');
        return response.json();
    })
    .then(function(data) {
        var list = document.getElementById('leaderboard-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        data.top_players.forEach(function(player, index) {
            var item = document.createElement('div');
            item.className = 'leaderboard-item ' + (player.is_current_user ? 'current-user' : '');
            
            var rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + player.rank;
            var initial = player.first_name ? player.first_name[0] : player.username[0];
            
            item.innerHTML = 
                '<div class="rank-number ' + (index < 3 ? 'top-3' : '') + '">' + rankEmoji + '</div>' +
                '<div class="leaderboard-avatar">' + initial + '</div>' +
                '<div class="leaderboard-info">' +
                    '<div class="leaderboard-username">' + (player.first_name || player.username) + '</div>' +
                    '<div class="leaderboard-level">Level ' + player.level + '</div>' +
                '</div>' +
                '<div class="leaderboard-score">' + player.score.toLocaleString() + '</div>';
            
            list.appendChild(item);
        });
        
        var userRankEl = document.getElementById('user-rank');
        var userRankScoreEl = document.getElementById('user-rank-score');
        
        if (userRankEl) userRankEl.textContent = data.current_user.rank;
        if (userRankScoreEl) userRankScoreEl.textContent = data.current_user.score.toLocaleString() + ' pts';
        
        showScreen('leaderboard-screen');
    })
    .catch(function(error) {
        console.error('Leaderboard error:', error);
    });
}

// Referral
function showReferral() {
    fetch(API_URL + '/referral/code', {
        headers: { 'X-Telegram-Init-Data': tg.initData }
    })
    .then(function(response) {
        if (!response.ok) throw new Error('Failed to load referral');
        return response.json();
    })
    .then(function(data) {
        var codeEl = document.getElementById('referral-code');
        var countEl = document.getElementById('referral-count');
        var bonusEl = document.getElementById('referral-bonus');
        
        if (codeEl) codeEl.textContent = data.code;
        if (countEl) countEl.textContent = data.referrals_count;
        if (bonusEl) bonusEl.textContent = data.bonus_earned;
        
        showScreen('referral-screen');
    })
    .catch(function(error) {
        console.error('Referral error:', error);
    });
}

function copyReferralCode() {
    var code = document.getElementById('referral-code');
    if (!code) return;
    
    navigator.clipboard.writeText(code.textContent).then(function() {
        tg.showAlert('Referral code copied!');
    }).catch(function() {
        tg.showAlert('Failed to copy code');
    });
}

function shareReferral() {
    var code = document.getElementById('referral-code');
    if (!code) return;
    
    var link = 'https://t.me/Wizzyquizlybot?start=' + code.textContent;
    var text = 'Join me in Wiz Quizzly! 🎩✨';
    
    tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text));
}

function claimReferral(code) {
    var initData = tg.initData;
    if (!initData) return;
    
    var userData = JSON.parse(new URLSearchParams(initData).get('user'));
    
    fetch(API_URL + '/referral/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: code,
            new_user_id: userData.id
        })
    }).catch(function(error) {
        console.error('Claim referral error:', error);
    });
}

function updateUI() {
    if (!currentUser) return;
    var levelEl = document.getElementById('current-level');
    var scoreEl = document.getElementById('current-score');
    
    if (levelEl) levelEl.textContent = currentUser.level;
    if (scoreEl) scoreEl.textContent = currentUser.score;
}

// Prevent zoom on double tap
document.addEventListener('dblclick', function(event) {
    event.preventDefault();
}, { passive: false });

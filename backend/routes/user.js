const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ telegram_id: req.user.id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const xpNeeded = user.level * 100;
    const xpProgress = (user.xp / xpNeeded) * 100;
    
    // Check daily reward
    const now = new Date();
    const lastClaim = user.daily_reward_claimed;
    const canClaimDaily = !lastClaim || 
      (now - new Date(lastClaim)) > (24 * 60 * 60 * 1000);
    
    res.json({
      username: user.username,
      first_name: user.first_name,
      photo_url: user.photo_url,
      score: user.score,
      level: user.level,
      xp: user.xp,
      xp_needed: xpNeeded,
      xp_progress: xpProgress,
      games_played: user.games_played,
      current_streak: user.current_streak,
      max_streak: user.max_streak,
      total_correct: user.total_correct,
      total_wrong: user.total_wrong,
      accuracy: user.games_played > 0 
        ? Math.round((user.total_correct / user.games_played) * 100) 
        : 0,
      can_claim_daily: canClaimDaily
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/claim-daily', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ telegram_id: req.user.id });
    const now = new Date();
    const lastClaim = user.daily_reward_claimed;
    
    if (lastClaim && (now - new Date(lastClaim)) < (24 * 60 * 60 * 1000)) {
      return res.status(400).json({ error: 'Daily reward already claimed' });
    }
    
    const reward = 50 + (user.level * 10);
    user.score += reward;
    user.daily_reward_claimed = now;
    await user.save();
    
    res.json({
      success: true,
      reward: reward,
      new_score: user.score
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

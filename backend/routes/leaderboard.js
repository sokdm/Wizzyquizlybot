const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findOne({ telegram_id: req.user.id });
    
    // Top 10 players
    const topPlayers = await User.find()
      .sort({ score: -1 })
      .limit(10)
      .select('username first_name score level');
    
    // Current user rank
    const userRank = await User.countDocuments({ score: { $gt: currentUser.score } }) + 1;
    
    res.json({
      top_players: topPlayers.map((player, index) => ({
        rank: index + 1,
        username: player.username,
        first_name: player.first_name,
        score: player.score,
        level: player.level,
        is_current_user: player.telegram_id === req.user.id
      })),
      current_user: {
        rank: userRank,
        username: currentUser.username,
        score: currentUser.score,
        level: currentUser.level
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

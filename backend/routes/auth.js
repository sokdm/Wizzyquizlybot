const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyTelegramInitData } = require('../middleware/auth');

router.post('/verify', async (req, res) => {
  try {
    const { init_data } = req.body;
    
    if (!init_data) {
      return res.status(400).json({ error: 'No init data provided' });
    }
    
    if (!verifyTelegramInitData(init_data, process.env.BOT_TOKEN)) {
      return res.status(401).json({ error: 'Invalid init data' });
    }
    
    const urlParams = new URLSearchParams(init_data);
    const userData = JSON.parse(urlParams.get('user'));
    
    let user = await User.findOne({ telegram_id: userData.id });
    
    if (!user) {
      user = new User({
        telegram_id: userData.id,
        username: userData.username || `user_${userData.id}`,
        first_name: userData.first_name,
        last_name: userData.last_name,
        photo_url: userData.photo_url
      });
      await user.save();
    } else {
      // Update last played
      user.last_played = new Date();
      if (userData.photo_url) user.photo_url = userData.photo_url;
      await user.save();
    }
    
    res.json({
      success: true,
      user: {
        id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        score: user.score,
        xp: user.xp,
        level: user.level,
        games_played: user.games_played
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

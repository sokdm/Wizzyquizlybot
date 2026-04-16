const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

// Generate referral code
router.get('/code', authMiddleware, async (req, res) => {
  try {
    let user = await User.findOne({ telegram_id: req.user.id });
    
    if (!user.referral_code) {
      user.referral_code = crypto.randomBytes(4).toString('hex').toUpperCase();
      await user.save();
    }
    
    const referralLink = `https://t.me/Wizzyquizlybot?start=${user.referral_code}`;
    
    res.json({
      code: user.referral_code,
      link: referralLink,
      referrals_count: user.referrals_count,
      bonus_earned: user.referral_bonus
    });
    
  } catch (error) {
    console.error('Referral code error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Claim referral
router.post('/claim', async (req, res) => {
  try {
    const { code, new_user_id } = req.body;
    
    const referrer = await User.findOne({ referral_code: code });
    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }
    
    if (referrer.telegram_id === new_user_id) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }
    
    const newUser = await User.findOne({ telegram_id: new_user_id });
    if (!newUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (newUser.referred_by) {
      return res.status(400).json({ error: 'Already referred' });
    }
    
    // Update referrer
    referrer.referrals_count += 1;
    referrer.referral_bonus += 100;
    referrer.score += 100;
    await referrer.save();
    
    // Update new user
    newUser.referred_by = referrer.telegram_id;
    newUser.score += 50;
    await newUser.save();
    
    res.json({
      success: true,
      bonus: 50
    });
    
  } catch (error) {
    console.error('Claim referral error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

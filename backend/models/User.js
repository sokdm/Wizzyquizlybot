const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegram_id: { type: Number, required: true, unique: true },
  username: { type: String, required: true },
  first_name: { type: String },
  last_name: { type: String },
  photo_url: { type: String },
  score: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  games_played: { type: Number, default: 0 },
  current_streak: { type: Number, default: 0 },
  max_streak: { type: Number, default: 0 },
  last_played: { type: Date, default: Date.now },
  daily_reward_claimed: { type: Date },
  total_correct: { type: Number, default: 0 },
  total_wrong: { type: Number, default: 0 },
  referral_code: { type: String, unique: true },
  referred_by: { type: Number, default: null },
  referrals_count: { type: Number, default: 0 },
  referral_bonus: { type: Number, default: 0 }
}, { timestamps: true });

// Calculate level based on XP
userSchema.methods.calculateLevel = function() {
  const xpNeeded = this.level * 100;
  if (this.xp >= xpNeeded) {
    this.level += 1;
    this.xp = this.xp - xpNeeded;
  }
};

module.exports = mongoose.model('User', userSchema);

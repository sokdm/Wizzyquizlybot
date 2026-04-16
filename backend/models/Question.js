const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correct_answer: { type: Number, required: true },
  difficulty: { type: Number, default: 1 },
  category: { type: String, default: 'general' },
  used_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', questionSchema);

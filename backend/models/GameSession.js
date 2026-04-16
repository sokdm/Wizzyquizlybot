const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  level: { type: Number, required: true },
  questions: [{
    question_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    user_answer: { type: Number, default: -1 },
    is_correct: { type: Boolean, default: false },
    time_taken: { type: Number, default: 0 }
  }],
  current_question_index: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  correct_count: { type: Number, default: 0 },
  wrong_count: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'failed'], default: 'active' },
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date }
});

module.exports = mongoose.model('GameSession', gameSessionSchema);

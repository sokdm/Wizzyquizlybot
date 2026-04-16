const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const User = require('../models/User');
const { generateQuestion } = require('../utils/deepseek');
const { authMiddleware } = require('../middleware/auth');

// Get question
router.get('/question', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ telegram_id: req.user.id });
    const difficulty = Math.min(Math.floor(user.level / 2) + 1, 5);
    
    // Try to find cached question
    let question = await Question.findOne({ 
      difficulty,
      used_count: { $lt: 50 }
    }).sort({ used_count: 1 });
    
    // Generate new if none exists
    if (!question) {
      const newQuestion = await generateQuestion(difficulty);
      if (!newQuestion) {
        return res.status(500).json({ error: 'Failed to generate question' });
      }
      
      question = new Question(newQuestion);
      await question.save();
    }
    
    // Increment used count
    question.used_count += 1;
    await question.save();
    
    // Don't send correct answer to frontend
    res.json({
      id: question._id,
      question: question.question,
      options: question.options,
      difficulty: question.difficulty,
      category: question.category
    });
  } catch (error) {
    console.error('Question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit answer
router.post('/answer', authMiddleware, async (req, res) => {
  try {
    const { question_id, answer_index, time_bonus } = req.body;
    
    const question = await Question.findById(question_id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    const user = await User.findOne({ telegram_id: req.user.id });
    const isCorrect = answer_index === question.correct_answer;
    
    let points = 0;
    let xpGained = 0;
    
    if (isCorrect) {
      // Base points
      points = 10 * user.level;
      // Time bonus (0-5 extra points)
      points += Math.floor(time_bonus || 0);
      // Streak bonus
      const streakBonus = Math.min(user.current_streak * 2, 10);
      points += streakBonus;
      
      xpGained = 10 + (user.level * 2);
      
      user.current_streak += 1;
      user.max_streak = Math.max(user.max_streak, user.current_streak);
      user.total_correct += 1;
    } else {
      user.current_streak = 0;
      user.total_wrong += 1;
    }
    
    user.score += points;
    user.xp += xpGained;
    user.games_played += 1;
    
    // Level up logic
    const xpNeeded = user.level * 100;
    if (user.xp >= xpNeeded) {
      user.level += 1;
      user.xp -= xpNeeded;
    }
    
    await user.save();
    
    res.json({
      correct: isCorrect,
      correct_answer: question.correct_answer,
      points_earned: points,
      xp_gained: xpGained,
      new_score: user.score,
      new_xp: user.xp,
      new_level: user.level,
      streak: user.current_streak,
      max_streak: user.max_streak
    });
  } catch (error) {
    console.error('Answer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const { generateQuestion } = require('../utils/deepseek');
const { authMiddleware } = require('../middleware/auth');

// Start new game session for a level
router.post('/start-level', authMiddleware, async (req, res) => {
  try {
    const { level } = req.body;
    const user = await User.findOne({ telegram_id: req.user.id });
    
    // Check if user can play this level
    if (level > user.level) {
      return res.status(403).json({ error: 'Level locked' });
    }
    
    // Delete any existing active session
    await GameSession.deleteMany({ user_id: req.user.id, status: 'active' });
    
    // Generate 10 questions for this level
    const questions = [];
    const difficulty = Math.min(Math.floor(level / 3) + 1, 5);
    
    for (let i = 0; i < 10; i++) {
      let question = await Question.findOne({ 
        difficulty,
        used_count: { $lt: 100 }
      }).sort({ used_count: 1 });
      
      if (!question) {
        const newQ = await generateQuestion(difficulty);
        if (newQ) {
          question = new Question(newQ);
          await question.save();
        }
      }
      
      if (question) {
        question.used_count += 1;
        await question.save();
        questions.push({
          question_id: question._id,
          user_answer: -1,
          is_correct: false,
          time_taken: 0
        });
      }
    }
    
    const session = new GameSession({
      user_id: req.user.id,
      level,
      questions,
      current_question_index: 0
    });
    
    await session.save();
    
    // Return first question
    const firstQuestion = await Question.findById(questions[0].question_id);
    
    res.json({
      session_id: session._id,
      total_questions: 10,
      current_question: 1,
      question: {
        id: firstQuestion._id,
        question: firstQuestion.question,
        options: firstQuestion.options,
        category: firstQuestion.category
      }
    });
    
  } catch (error) {
    console.error('Start level error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current question
router.get('/current-question', authMiddleware, async (req, res) => {
  try {
    const session = await GameSession.findOne({ 
      user_id: req.user.id, 
      status: 'active' 
    });
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    const currentQ = session.questions[session.current_question_index];
    const question = await Question.findById(currentQ.question_id);
    
    res.json({
      session_id: session._id,
      total_questions: 10,
      current_question: session.current_question_index + 1,
      progress: ((session.current_question_index) / 10) * 100,
      question: {
        id: question._id,
        question: question.question,
        options: question.options,
        category: question.category
      }
    });
    
  } catch (error) {
    console.error('Current question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit answer and get next question or results
router.post('/answer', authMiddleware, async (req, res) => {
  try {
    const { answer_index, time_taken } = req.body;
    
    const session = await GameSession.findOne({ 
      user_id: req.user.id, 
      status: 'active' 
    });
    
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    
    const currentQ = session.questions[session.current_question_index];
    const question = await Question.findById(currentQ.question_id);
    
    const isCorrect = answer_index === question.correct_answer;
    
    // Update session
    session.questions[session.current_question_index].user_answer = answer_index;
    session.questions[session.current_question_index].is_correct = isCorrect;
    session.questions[session.current_question_index].time_taken = time_taken;
    
    if (isCorrect) {
      session.correct_count += 1;
      session.score += 10 * session.level;
    } else {
      session.wrong_count += 1;
    }
    
    session.current_question_index += 1;
    
    // Check if level complete
    if (session.current_question_index >= 10) {
      session.status = session.correct_count === 10 ? 'completed' : 'failed';
      session.completed_at = new Date();
      await session.save();
      
      // Update user
      const user = await User.findOne({ telegram_id: req.user.id });
      user.score += session.score;
      user.xp += session.correct_count * 10;
      user.games_played += 1;
      user.total_correct += session.correct_count;
      user.total_wrong += session.wrong_count;
      
      // Level up only if perfect score
      if (session.correct_count === 10 && session.level === user.level) {
        user.level += 1;
      }
      
      await user.save();
      
      return res.json({
        level_complete: true,
        passed: session.correct_count === 10,
        results: {
          correct: session.correct_count,
          wrong: session.wrong_count,
          score: session.score,
          total_questions: 10
        }
      });
    }
    
    await session.save();
    
    // Return next question
    const nextQ = session.questions[session.current_question_index];
    const nextQuestion = await Question.findById(nextQ.question_id);
    
    res.json({
      level_complete: false,
      correct: isCorrect,
      correct_answer: question.correct_answer,
      total_questions: 10,
      current_question: session.current_question_index + 1,
      progress: (session.current_question_index / 10) * 100,
      next_question: {
        id: nextQuestion._id,
        question: nextQuestion.question,
        options: nextQuestion.options,
        category: nextQuestion.category
      }
    });
    
  } catch (error) {
    console.error('Answer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all levels status
router.get('/levels', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ telegram_id: req.user.id });
    
    const levels = [];
    for (let i = 1; i <= 300; i++) {
      levels.push({
        level: i,
        status: i < user.level ? 'completed' : i === user.level ? 'unlocked' : 'locked',
        difficulty: Math.min(Math.floor(i / 3) + 1, 5)
      });
    }
    
    res.json({
      current_level: user.level,
      levels: levels
    });
    
  } catch (error) {
    console.error('Levels error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

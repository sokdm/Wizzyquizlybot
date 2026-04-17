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
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (level > user.level) {
      return res.status(403).json({ error: 'Level locked' });
    }
    
    // Delete any existing active session
    await GameSession.deleteMany({ user_id: req.user.id, status: 'active' });
    
    // Generate 10 UNIQUE questions for this level
    const questions = [];
    const difficulty = Math.min(Math.floor(level / 3) + 1, 5);
    const usedQuestionIds = [];
    
    for (let i = 0; i < 10; i++) {
      let question;
      
      // Try to find a question not used in this session
      question = await Question.findOne({ 
        difficulty,
        _id: { $nin: usedQuestionIds },
        used_count: { $lt: 1000 }
      }).sort({ used_count: 1, created_at: -1 });
      
      // If no unused question exists, generate new one
      if (!question) {
        const newQ = await generateQuestion(difficulty);
        if (newQ) {
          question = new Question(newQ);
          await question.save();
        }
      }
      
      if (question) {
        usedQuestionIds.push(question._id);
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
    
    // Check if we have 10 questions
    if (questions.length < 10) {
      return res.status(500).json({ error: 'Failed to generate enough questions' });
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
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Submit answer and get next question or results
router.post('/answer', authMiddleware, async (req, res) => {
  try {
    const { answer_index, time_taken } = req.body;
    
    console.log('Answer request:', { user_id: req.user.id, answer_index, time_taken });
    
    const session = await GameSession.findOne({ 
      user_id: req.user.id, 
      status: 'active' 
    });
    
    if (!session) {
      console.log('No active session found for user:', req.user.id);
      return res.status(404).json({ error: 'No active session' });
    }
    
    console.log('Session found:', session._id, 'Current index:', session.current_question_index);
    
    // Check if already completed all questions
    if (session.current_question_index >= 10) {
      console.log('Session already complete');
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
    
    const currentQ = session.questions[session.current_question_index];
    
    if (!currentQ) {
      console.log('Current question not found at index:', session.current_question_index);
      return res.status(404).json({ error: 'Question not found in session' });
    }
    
    const question = await Question.findById(currentQ.question_id);
    
    if (!question) {
      console.log('Question not found in database:', currentQ.question_id);
      return res.status(404).json({ error: 'Question not found' });
    }
    
    const isCorrect = answer_index === question.correct_answer;
    console.log('Answer result:', { isCorrect, correct_answer: question.correct_answer, user_answer: answer_index });
    
    // Update session
    session.questions[session.current_question_index].user_answer = answer_index;
    session.questions[session.current_question_index].is_correct = isCorrect;
    session.questions[session.current_question_index].time_taken = time_taken || 0;
    
    if (isCorrect) {
      session.correct_count += 1;
      session.score += 10 * session.level;
    } else {
      session.wrong_count += 1;
    }
    
    // Move to next question
    session.current_question_index += 1;
    console.log('Updated index:', session.current_question_index);
    
    // Check if level complete (all 10 questions answered)
    if (session.current_question_index >= 10) {
      console.log('Level complete!');
      
      // Mark session as completed or failed
      const passed = session.correct_count === 10;
      session.status = passed ? 'completed' : 'failed';
      session.completed_at = new Date();
      await session.save();
      
      // Update user stats
      const user = await User.findOne({ telegram_id: req.user.id });
      if (user) {
        user.score += session.score;
        user.xp += session.correct_count * 10;
        user.games_played += 1;
        user.total_correct += session.correct_count;
        user.total_wrong += session.wrong_count;
        
        // Level up only if perfect score (10/10)
        if (passed && session.level === user.level) {
          user.level += 1;
          console.log('User leveled up to:', user.level);
        }
        
        await user.save();
      }
      
      return res.json({
        level_complete: true,
        passed: passed,
        results: {
          correct: session.correct_count,
          wrong: session.wrong_count,
          score: session.score,
          total_questions: 10
        }
      });
    }
    
    // Save session before returning next question
    await session.save();
    
    // Return next question
    const nextQ = session.questions[session.current_question_index];
    const nextQuestion = await Question.findById(nextQ.question_id);
    
    if (!nextQuestion) {
      console.log('Next question not found:', nextQ.question_id);
      return res.status(404).json({ error: 'Next question not found' });
    }
    
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
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Get all levels status
router.get('/levels', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ telegram_id: req.user.id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
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

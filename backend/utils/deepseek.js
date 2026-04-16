const axios = require('axios');

const generateQuestion = async (difficulty = 1) => {
  const categories = ['science', 'history', 'geography', 'technology', 'sports', 'entertainment', 'general knowledge'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  
  const difficultyText = difficulty === 1 ? 'easy' : difficulty === 2 ? 'medium' : 'hard';
  
  const prompt = `Generate a ${difficultyText} trivia question about ${category}.
  
Requirements:
- Question should be engaging and clear
- 4 multiple choice options
- Only ONE correct answer
- Options should be plausible but clearly distinguishable

Respond ONLY with this exact JSON format:
{
  "question": "Your question here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": 0,
  "category": "${category}"
}

correct_answer must be 0, 1, 2, or 3 (index of correct option).`;

  try {
    const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a trivia question generator. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const content = response.data.choices[0].message.content;
    const questionData = JSON.parse(content);
    
    return {
      ...questionData,
      difficulty
    };
  } catch (error) {
    console.error('DeepSeek API Error:', error.message);
    return null;
  }
};

module.exports = { generateQuestion };

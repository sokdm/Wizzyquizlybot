const crypto = require('crypto');

const verifyTelegramInitData = (initData, botToken) => {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    const checkHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    return checkHash === hash;
  } catch (error) {
    return false;
  }
};

const authMiddleware = (req, res, next) => {
  const initData = req.headers['x-telegram-init-data'];
  
  if (!initData) {
    return res.status(401).json({ error: 'No init data provided' });
  }
  
  if (!verifyTelegramInitData(initData, process.env.BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid init data' });
  }
  
  // Parse user data
  const urlParams = new URLSearchParams(initData);
  const userData = JSON.parse(urlParams.get('user'));
  req.user = userData;
  
  next();
};

module.exports = { authMiddleware, verifyTelegramInitData };

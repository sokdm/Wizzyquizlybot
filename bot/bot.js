const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Web App URL - Update this after deploying to Render
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-app.onrender.com';

// Start command
bot.start((ctx) => {
    const user = ctx.from;
    
    ctx.reply(
        `🎩 Welcome to *Wiz Quizzly*, ${user.first_name}! ✨\n\n` +
        `🧙‍♂️ Test your knowledge and become a quiz master!\n\n` +
        `🌟 Features:\n` +
        `• AI-generated questions\n` +
        `• Level up system\n` +
        `• Global leaderboard\n` +
        `• Daily rewards\n\n` +
        `Ready to play? Tap the button below! 👇`,
        {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.webApp('🎮 Play Now', WEBAPP_URL)],
                [Markup.button.url('📢 Join Channel', 'https://t.me/yourchannel')]
            ])
        }
    );
});

// Help command
bot.help((ctx) => {
    ctx.reply(
        `🎮 *Wiz Quizzly Help*\n\n` +
        `/start - Start the game\n` +
        `/play - Open the game\n` +
        `/profile - View your stats\n` +
        `/leaderboard - Global rankings\n\n` +
        `💡 Tip: Answer quickly for time bonuses!`,
        { parse_mode: 'Markdown' }
    );
});

// Play command
bot.command('play', (ctx) => {
    ctx.reply(
        '🎮 Click below to start playing!',
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Launch Game', WEBAPP_URL)]
        ])
    );
});

// Profile command
bot.command('profile', async (ctx) => {
    try {
        const response = await axios.get(`${WEBAPP_URL}/api/user/profile`, {
            headers: { 'X-Telegram-Init-Data': ctx.webAppData?.data || '' }
        });
        
        const data = response.data;
        
        ctx.reply(
            `👤 *Your Profile*\n\n` +
            `🏆 Level: ${data.level}\n` +
            `⭐ Score: ${data.score.toLocaleString()}\n` +
            `🎮 Games: ${data.games_played}\n` +
            `🔥 Best Streak: ${data.max_streak}\n` +
            `🎯 Accuracy: ${data.accuracy}%\n\n` +
            `Keep playing to improve! 🚀`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        ctx.reply('Please open the game first to see your profile!');
    }
});

// Leaderboard command
bot.command('leaderboard', (ctx) => {
    ctx.reply(
        '🏆 Check the global leaderboard in the game!\n\n' +
        'Click below to see top players:',
        Markup.inlineKeyboard([
            [Markup.button.webApp('📊 View Leaderboard', WEBAPP_URL)]
        ])
    );
});

// Handle web app data
bot.on('web_app_data', async (ctx) => {
    try {
        const data = JSON.parse(ctx.webAppData.data);
        
        if (data.action === 'game_complete') {
            ctx.reply(
                `🎉 *Game Complete!*\n\n` +
                `⭐ Score: ${data.score}\n` +
                `✅ Correct: ${data.correct}\n` +
                `❌ Wrong: ${data.wrong}\n\n` +
                `Great job! Play again?`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: Markup.inlineKeyboard([
                        [Markup.button.webApp('🔄 Play Again', WEBAPP_URL)]
                    ])
                }
            );
        }
    } catch (error) {
        console.error('Web app data error:', error);
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err);
});

// Launch bot
bot.launch()
    .then(() => console.log('🤖 Bot started!'))
    .catch(err => console.error('Bot error:', err));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

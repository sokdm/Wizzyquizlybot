const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://wizzyquizlybot-game.onrender.com';

// Start command with referral
bot.start((ctx) => {
    const user = ctx.from;
    const payload = ctx.startPayload;
    
    let message = `🎩 Welcome to *Wiz Quizzly*, ${user.first_name}! ✨\n\n`;
    message += `🧙‍♂️ Test your knowledge and become a quiz master!\n\n`;
    message += `🌟 Features:\n`;
    message += `• 300+ challenging levels\n`;
    message += `• AI-generated questions\n`;
    message += `• Level progression system\n`;
    message += `• Global leaderboard\n`;
    message += `• Invite friends & earn rewards\n\n`;
    
    if (payload) {
        message += `🎁 You were invited! Click Play to claim your bonus!\n\n`;
    }
    
    message += `Ready to play? Tap the button below! 👇`;
    
    ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.webApp('🎮 Play Now', `${WEBAPP_URL}${payload ? '?ref=' + payload : ''}`)],
            [Markup.button.url('📢 Join Channel', 'https://t.me/wizquizzly')]
        ])
    });
});

// Help command
bot.help((ctx) => {
    ctx.reply(
        `🎮 *Wiz Quizzly Help*\n\n` +
        `/start - Start the game\n` +
        `/play - Open the game\n` +
        `/levels - View all levels\n` +
        `/profile - View your stats\n` +
        `/leaderboard - Global rankings\n` +
        `/referral - Invite friends\n\n` +
        `💡 *How to Play:*\n` +
        `• Select a level (1-300)\n` +
        `• Answer all 10 questions correctly\n` +
        `• Unlock the next level\n` +
        `• Earn XP and climb the leaderboard!\n\n` +
        `⚡ Tip: Answer quickly for better scores!`,
        { parse_mode: 'Markdown' }
    );
});

// Play command
bot.command('play', (ctx) => {
    ctx.reply(
        '🎮 Choose your level and start playing!',
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Launch Game', WEBAPP_URL)]
        ])
    );
});

// Levels command
bot.command('levels', (ctx) => {
    ctx.reply(
        '🎮 Select a level to play!\n\nComplete all 10 questions to unlock the next level.',
        Markup.inlineKeyboard([
            [Markup.button.webApp('📊 View Levels', WEBAPP_URL)]
        ])
    );
});

// Profile command
bot.command('profile', (ctx) => {
    ctx.reply(
        '👤 View your stats and progress!',
        Markup.inlineKeyboard([
            [Markup.button.webApp('📊 My Profile', WEBAPP_URL)]
        ])
    );
});

// Leaderboard command
bot.command('leaderboard', (ctx) => {
    ctx.reply(
        '🏆 Check the global rankings!',
        Markup.inlineKeyboard([
            [Markup.button.webApp('🏆 Leaderboard', WEBAPP_URL)]
        ])
    );
});

// Referral command
bot.command('referral', (ctx) => {
    ctx.reply(
        '🎁 Invite friends and earn rewards!\n\n' +
        'Share your referral link to get 100 points per friend!',
        Markup.inlineKeyboard([
            [Markup.button.webApp('🎁 Get My Link', WEBAPP_URL)]
        ])
    );
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

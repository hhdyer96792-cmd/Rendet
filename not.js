const { Bot } = require('grammy');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const bot = new Bot(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

bot.command('start', async (ctx) => {
    const payload = ctx.match;
    if (!payload) return ctx.reply('Привет! Используйте ссылку из приложения для привязки аккаунта.');
    const userId = payload;
    const tgChatId = ctx.chat.id;
    const tgUsername = ctx.from.username;

    const { data: user, error } = await supabase
        .from('user_settings')
        .select('user_id, premium_tier')
        .eq('user_id', userId)
        .single();
    if (error || !user) return ctx.reply('Неверная ссылка. Попробуйте сгенерировать новую в приложении.');

    await supabase.from('telegram_users').upsert({
        user_id: userId,
        tg_chat_id: tgChatId,
        tg_username: tgUsername
    }, { onConflict: 'user_id' });

    ctx.reply(`✅ Аккаунт привязан! Ваш тариф: ${user.premium_tier}. Уведомления будут приходить сюда.`);
});

bot.command('unlink', async (ctx) => {
    const tgChatId = ctx.chat.id;
    await supabase.from('telegram_users').delete().eq('tg_chat_id', tgChatId);
    ctx.reply('Аккаунт отвязан.');
});

bot.command('mycars', async (ctx) => {
    const tgChatId = ctx.chat.id;
    const { data: tgUser } = await supabase
        .from('telegram_users')
        .select('user_id')
        .eq('tg_chat_id', tgChatId)
        .single();
    if (!tgUser) return ctx.reply('Аккаунт не привязан.');
    const { data: cars } = await supabase
        .from('cars')
        .select('id, name')
        .eq('user_id', tgUser.user_id);
    if (!cars || cars.length === 0) return ctx.reply('Нет автомобилей.');
    let message = 'Ваши автомобили:\n';
    cars.forEach(c => message += `- ${c.name}\n`);
    ctx.reply(message);
});

// Health check для Render
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(process.env.PORT || 3000, () => console.log('Health check started'));

bot.start();
console.log('✅ Бот запущен');

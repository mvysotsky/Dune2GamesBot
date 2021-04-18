// https://github.com/mullwar/telebot
const TeleBot = require('telebot');

const bot = new TeleBot('1613103423:AAF1Stk2XAikkL2LeB_eDh1PN3WrJtHKfAs');

const servers = [
    'gs.emu-land.net',
    'nst.nekketsu.fun',
    '151.248.126.219',
];

let new_pending = {};
let lastListID = {};
let lastOpenID = {};
let lastActiveID = {};
let games = {};

bot.on(['/start','/hello','/help'], (msg) => {

    if (msg.chat.type === 'group') {
        msg.reply.text(
            'Привет!\n' +
            'Я бот для управления играми Dune 2!\n\n' +
            'Список команд для группового чата:\n' +
            '/new - Создать новую игру\n' +
            '/open - Показать открытые игры (доступны для подключения) \n' +
            '/active - Показать список активных игр\n' +
            '/list - Показать все активные и открытые игры\n'
        );
    } else {
        msg.reply.text(
            'Привет!\n' +
            'Я бот для управления играми Dune 2!\n\n' +
            'Список команд для личного чата:\n' +
            '/list - Показать список моих игр\n'
        );
    }

});

function reply(to, text) {
    return bot.sendMessage(to.chat.id, text, { replyToMessage: to.message_id });
}

async function getGameInfoMarkup(game, type = 'group') {

    let response = `<b>🕹 Игра #${game.game_id}</b>\n`;

    response += `Создал: ${game.from.first_name} @${game.from.username}\n`;
    response += `Сервер: <code>${game.server}</code>\n`;
    response += `Создана: ${new Date(game.started).toLocaleString('ru-RU')}\n`;

    if (game.active) {
        let follower = await bot.getChatMember(game.group_id, game.follower_id);

        response += `Начало игры: ${new Date(game.active).toLocaleString('ru-RU')}\n`;
        response += `Второй игрок: ${follower.user.first_name} @${follower.user.username}\n`;
    }

    if (type === 'group') {
        if (!game.active) {
            response += `Присоедениться: /join_${game.game_id}\n`;
        }
        response += `Завершить: /stop_${game.game_id}\n`;
    } else if (type === 'leader') {
        response += `Завершить: /stop_${game.game_id}_${game.group_id}\n`;
    }

    return response;
}

bot.on([/^\/new@Dune2GamesBot$/, /^\/new$/], async (msg, props) => {

    if (msg.chat.type !== 'group') {
        return bot.sendMessage(msg.from.id, 'На данный момент эта команда доступна только для групповых чатов.');
    }

    new_pending[msg.from.id] = {'group_id': msg.chat.id};
    games[msg.chat.id] = [];

    let replyMarkup = bot.keyboard([servers], {resize: true, once: true});

    try {
        await bot.sendMessage(msg.from.id, 'Выберите сервер:', {replyMarkup});
    } catch (error) {
        if (error.error_code === 403) {
            reply(msg, `${msg.from.first_name}, я не могу тебе написать 😕 Добавь меня пожалуйста: @Dune2GamesBot`);
        }
    }

});

bot.on('text', async (msg, props) => {

    if (typeof new_pending[msg.from.id] === 'undefined' || msg.chat.type === 'group') {
        return;
    }

    if (servers.includes(msg.text)) {
        new_pending[msg.from.id]['server'] = msg.text;
        new_pending[msg.from.id]['key'] = 'pending';
        return bot.sendMessage(msg.from.id, 'Введите код доступа:');
    }

    if (new_pending[msg.from.id]['key'] === 'pending') {
        let group_id = new_pending[msg.from.id]['group_id'];
        let game_id = games[group_id].length;

        games[group_id][game_id] = {
            'game_id': game_id,
            'group_id': group_id,
            'server': new_pending[msg.from.id]['server'],
            'key': msg.text,
            'started': Date.now(),
            'from': msg.from
        };

        delete new_pending[msg.from.id];
        let group_response = 'Создана новая игра:\n\n' + await getGameInfoMarkup(games[group_id][game_id]);

        bot.sendMessage(msg.from.id, `Номер вашей игры: ${game_id}. Ожидаем подключение второго игрока.`);
        bot.sendMessage(group_id, group_response, {parseMode: 'HTML'});
    }

});

bot.on(/^\/join_(\d+)@Dune2GamesBot$/, async (msg, props) => {

    if (msg.chat.type !== 'group') {
        return bot.sendMessage(msg.from.id, 'На данный момент эта команда доступна только для групповых чатов.');
    }

    let group_id = msg.chat.id;
    let game_id = props.match[1];
    let response = '';

    response += `Получен запрос на подключение к игре #${game_id}\n\n`
    response += `<b>👾 Игрок:</b> ${msg.from.first_name} @${msg.from.username}\n`;
    response += `<b>🕹 Подтвердить:</b> /accept_${Math.abs(group_id)}_${game_id}_${msg.from.id}\n`;
    response += `<b>🙅 Отклонить:</b> /decline_${Math.abs(group_id)}_${game_id}_${msg.from.id}\n`;

    bot.sendMessage(games[group_id][game_id].from.id, response, {parseMode: 'HTML'});

    try {
        await bot.sendMessage(msg.from.id, 'Создателю игры отправлен запрос на подключение');
    } catch (error) {
        if (error.error_code === 403) {
            reply(msg, `${msg.from.first_name}, я не могу тебе написать 😕 Добавь меня пожалуйста: @Dune2GamesBot`);
        }
    }

});

bot.on(/^\/accept_(\d+)_(\d+)_(\d+)$/, async (msg, props) => {

    let group_id = -props.match[1];
    let game_id = props.match[2];
    let follower_id = props.match[3];
    let game = games[group_id][game_id];

    games[group_id][game_id]['active'] = Date.now();
    games[group_id][game_id]['follower_id'] = follower_id;

    await updateGroupLists(group_id);

    bot.sendMessage(msg.from.id, `Отправляю код доступа второму игроку.`);
    bot.sendMessage(follower_id, `Заявка к игре #${game_id} подтверждена. Код доступа: ${game.key}`);
    bot.sendMessage(follower_id, await getGameInfoMarkup(game, 'follower'), {parseMode: 'HTML'});

});

bot.on(/^\/decline_(\d+)_(\d+)_(\d+)$/, async (msg, props) => {

    let group_id = -props.match[1];
    let game_id = props.match[2];
    let follower_id = props.match[3];
    let game = games[group_id][game_id];

    let leader = await bot.getChatMember(game.group_id, game.from.id);
    let follower = await bot.getChatMember(game.group_id, follower_id);

    bot.sendMessage(msg.from.id, `Заявка от игрока @${follower.user.username} отклонена`);
    bot.sendMessage(follower_id, `Создатель @${leader.user.username} отклонил вашу заявку о подключению к игре #${game_id}`);

});

bot.on([/^\/stop_(\d+)@Dune2GamesBot$/, /^\/stop_(\d+)_(\d+)$/], async (msg, props) => {

    let chat_id = msg.chat.id;
    let group_id = msg.chat.type === 'group' ? chat_id : -props.match[2];
    let game_id = props.match[1];
    let admins = await bot.getChatAdministrators(group_id);
    let adminIDs = admins.map(admin => admin.user.id);
    let isGroupAdmin = adminIDs.includes(msg.from.id);

    if (typeof games[group_id] === 'undefined') {
        return reply(msg, 'В этой группе нет активных игр');
    }

    if (typeof games[group_id][game_id] === 'undefined') {
        return reply(msg, 'Игра с таким ID не найдена');
    }

    if (games[group_id][game_id]['finished']) {
        return reply(msg, 'Эта игра уже завершена');
    }

    let game = games[group_id][game_id];

    if (game.from.id !== msg.from.id && !isGroupAdmin) {
        return reply(msg, 'Игру может завершить только ее создатель или администратор чата');
    }

    games[group_id][game_id]['finished'] = Date.now();
    await updateGroupLists(group_id);

    if (isGroupAdmin && game.from.id !== msg.from.id) {
        bot.sendMessage(game.from.id,
            `Ваша игра #${game.game_id} от ${new Date(game.started).toLocaleString('ru-RU')} ` +
            'была завершена администратором группы.');
    }

    return reply(msg, `Игра #${game_id} завершена`);
});

bot.on([/^\/list@Dune2GamesBot$/, /^\/list$/], async (msg) => {

    let chatID = msg.chat.id;

    if (msg.chat.type === 'private') {
        let response = 'Список ваших игр:\n\n';
        let isGamesAvailable = false;

        for (const group of games) {
            for (const game of group) {
                if (game.finished) {
                    continue;
                }

                if (game.from.id === msg.from.id) {
                    response += '\n';
                    response += await getGameInfoMarkup(game, 'leader');
                    isGamesAvailable = true;
                } else if (game.follower_id === msg.from.id) {
                    response += '\n';
                    response += await getGameInfoMarkup(game, 'follower');
                    isGamesAvailable = true;
                }
            }
        }

        if (!isGamesAvailable) {
            return bot.sendMessage(chatID, 'У вас нет активных игр в данный момент');
        } else {
            bot.sendMessage(chatID, response, {parseMode: 'HTML'}).then( re => {
                lastListID[chatID] = re.message_id;
            });
        }
    } else { // msg.chat.type === 'group'
        let groupID = msg.chat.id;

        if (typeof games[groupID] === 'undefined') {
            return msg.reply.text('В этом чате нет доступных игр');
        }

        bot.sendMessage(msg.chat.id, await getGroupGamesList(groupID, 'list'), {parseMode: 'HTML'}).then( re => {
            lastListID[chatID] = re.message_id;
        });
    }
});

bot.on([/^\/active@Dune2GamesBot$/, /^\/active$/], async (msg) => {
    if (msg.chat.type !== 'group') {
        return bot.sendMessage(msg.from.id, 'Эта команда доступна только для группового чата');
    }

    let groupID = msg.chat.id;

    if (typeof games[groupID] === 'undefined') {
        return msg.reply.text('В этом чате нет активных игр');
    }

    bot.sendMessage(msg.chat.id, await getGroupGamesList(groupID, 'active'), {parseMode: 'HTML'}).then( re => {
        lastActiveID[groupID] = re.message_id;
    });
});

bot.on([/^\/open@Dune2GamesBot$/, /^\/open$/], async (msg) => {
    if (msg.chat.type !== 'group') {
        return bot.sendMessage(msg.from.id, 'Эта команда доступна только для группового чата');
    }

    let groupID = msg.chat.id;

    if (typeof games[groupID] === 'undefined') {
        return msg.reply.text('В этом чате нет открытых игр');
    }

    bot.sendMessage(msg.chat.id, await getGroupGamesList(groupID, 'open'), {parseMode: 'HTML'}).then( re => {
        lastOpenID[groupID] = re.message_id;
    });
});

async function getGroupGamesList(groupID, mode) {

    if (typeof games[groupID] === 'undefined') {
        return 'В этом чате нет доступных игр';
    }

    let response = '';
    let isListEmpty = true;

    if (mode === 'open') {
        response = 'Список открытых игр:\n';
    } else if (mode === 'active') {
        response = 'Список активных игр:\n';
    } else {
        response = 'Список всех доступных игр:\n';
    }

    for (let gameID = 0; gameID < games[groupID].length; gameID++) {
        if (typeof games[groupID][gameID] === 'undefined') {
            continue;
        }

        let game = games[groupID][gameID];

        if (game.finished) {
            continue;
        }

        if (mode === 'active' && !game.active) {
            continue;
        }

        if (mode === 'open' && game.active) {
            continue;
        }

        response += '\n';
        response += await getGameInfoMarkup(game);
        isListEmpty = false
    }

    return isListEmpty ? response + 'Игр нет...' : response;
}

async function updateGroupLists(groupID) {

    try {
        if (lastListID[groupID]) {
            let messageID = lastListID[groupID];
            await bot.editMessageText(
                {chatId: groupID, messageId: messageID}, await getGroupGamesList(groupID, 'list'),
                {parseMode: 'html'})
        }

        if (lastOpenID[groupID]) {
            let messageID = lastOpenID[groupID];
            await bot.editMessageText(
                {chatId: groupID, messageId: messageID}, await getGroupGamesList(groupID, 'open'),
                {parseMode: 'html'}
            )
        }

        if (lastOpenID[groupID]) {
            let messageID = lastActiveID[groupID];
            await bot.editMessageText(
                {chatId: groupID, messageId: messageID}, await getGroupGamesList(groupID, 'active'),
                {parseMode: 'html'}
            )
        }
    } catch (e) {
    }

}

bot.start();
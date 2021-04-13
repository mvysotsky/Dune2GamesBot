// https://github.com/mullwar/telebot
const TeleBot = require('telebot');

const bot = new TeleBot('1613103423:AAF1Stk2XAikkL2LeB_eDh1PN3WrJtHKfAs');

let games = {};

bot.on(['/start','/hello','/help'], (msg) => msg.reply.text(
    'Hello!\n' +
    'This is Dune 2 games bot!\n\n' +
    'Commands:\n' +
    '/new {server} {key} - Start a new game\n' +
    '/stop {game_number} - Stop current game\n' +
    '/list - Show games available to join\n' +
    '/active - Show games currently active\n' +
    '/listgames - List games available to join\n' +
    '/endgame - Stop the game\n')
);

function reply(to, text) {
    return bot.sendMessage(to.chat.id, text, { replyToMessage: to.message_id });
}

bot.on(/^\/new (.+)$/, (msg, props) => {
    let params = props.match[1].split(' ');
    let chatID = msg.chat.id;

    if (typeof games[chatID] === "undefined") {
        games[chatID] = [];
    }

    let gamesCount = games[chatID].push({
        'server': params[0],
        'key': params[1],
        'started': Date.now(),
        'from': msg.from
    });

    return bot.sendMessage(chatID, `Добавлена новая игра, ID вашей игры: ${gamesCount - 1}`, { replyToMessage: msg.message_id });
});

bot.on(/^\/stop_(\d+)@Dune2GamesBot$/, async (msg, props) => {
    let chatID = msg.chat.id;
    let gameID = props.match[1];
    let admins = await bot.getChatAdministrators(chatID);
    let adminIDs = admins.map(admin => admin.user.id);

    if (typeof games[chatID] === 'undefined') {
        return reply(msg, 'В этом чате еще нет созданных игр');
    }

    if (typeof games[chatID][gameID] === 'undefined') {
        return reply(msg, 'Игра с таким ID не найдена');
    }

    if (typeof games[chatID][gameID]['finished'] !== 'undefined') {
        return reply(msg, 'Эта игра уже завершена');
    }

    let game = games[chatID][gameID];

    if (game.from.id !== msg.from.id && !adminIDs.includes(msg.from.id)) {
        return reply(msg, 'Игру может завершить только ее создатель или администратор чата');
    }

    games[chatID][gameID]['finished'] = Date.now();

    return reply(msg, `Игра #${gameID} завершена`);
});

bot.on(['/list'], (msg) => {
    let chatID = msg.chat.id;

    if (typeof games[chatID] === 'undefined') {
        return reply(msg, 'В этом чате еще нет созданных игр');
    }

    let response = 'Список активных игр:\n';

    for (let gameID = 0; gameID < games[chatID].length; gameID++) {
        if (typeof games[chatID][gameID] === 'undefined') continue;

        let game = games[chatID][gameID];

        if (game.finished) {
            continue;
        }

        response += `\n<b>🕹 Игра #${gameID}</b>\n`;
        response += `Создал: ${game.from.first_name} ${game.from.last_name} @${game.from.username}\n`;
        response += `Сервер: ${game.server}\n`;
        response += `Код доступа: ${game.key}\n`;
        response += `Присоедениться: /join_${gameID}\n`;
        response += `Завершить: /stop_${gameID}\n`
    }

    bot.sendMessage(msg.chat.id, response, {parseMode: 'HTML'});
});


bot.start();
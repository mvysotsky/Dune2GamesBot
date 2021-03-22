// https://github.com/mullwar/telebot
const TeleBot = require('telebot');

const bot = new TeleBot('1613103423:AAF1Stk2XAikkL2LeB_eDh1PN3WrJtHKfAs');

let open_games = [];
let active_games = [];

bot.on(['/start', '/hello'], (msg) => msg.reply.text(
    'Hello!\n' +
    'This is Dune 2 games bot!\n\n' +
    'Commands:\n' +
    '/newgame - Start a new game\n' +
    '/listgames - List games available to join\n' +
    '/endgame - Stop the game\n')
);

bot.on('/hello', (msg) => {
    return bot.sendMessage(msg.from.id, `Hello, ${ msg.from.first_name }!`);
});

bot.on(/^\/say (.+)$/, (msg, props) => {
    const text = props.match[1];
    return bot.sendMessage(msg.from.id, text, { replyToMessage: msg.message_id });
});

bot.start();
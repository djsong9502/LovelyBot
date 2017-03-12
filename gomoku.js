const Discord = require('discord.js');
const db = require('./db.js');

// Player 1 = o
// Player 2 = x
var player1;
var player2;
var bot;
var board = [];
var turn;
var timeout_id;
var callback;
var ch_list = 
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o']

var board_in_string = function() {
    var board_string = '```';
    for (i = 0; i < 15; i++) {
        board_string += '{0} '.format(ch_list[i]);
        for (j = 0; j < 15; j++) {
            board_string += '{0} '.format(board[i][j]);
        }
        board_string += '\n';
    }
    board_string += '  a b c d e f g h i j k l m n o```';
    return board_string;
}

var remove_timeout = function() {
    clearTimeout(timeout_id);
}

var set_timeout = function(message, f) {
    timeout_id = setTimeout( function() {
        message.channel.sendMessage('Timeout waiting for player {0}\'s turn.'.format(turn));
        bot.removeListener('message', f);
        callback();
    }, 300000);
}

var f = function(message) {
    if (message.author.id !== player1 && message.author.id !== player2) {
        return message;
    }

    if (message.content === 'board') {
        message.channel.sendMessage(board_in_string);
    }
    
    if (message.content === 'quit') {
        message.channel.sendMessage('<@{0}> forfeited the game :('.format(message.author.id));
        bot.removeListener('message', f);
        callback();
    }

    if (message.content === 'draw') {
        var player_to_confirm = message.author.id === player1 ? player2 : player1;
        message.channel.sendMessage('<@{0}> Do you want to draw the game? Type `yes` to confirm.'.format(player_to_confirm));
        bot.on('message', function g (message) {
            if (message.author.id !== player_to_confirm && message.author.id) {
                return;
            }

            if (message.content === 'yes') {
                message.channel.sendMessage('Draw game!');
                bot.removeListener('message', g);
                bot.removeListener('message', f)
                callback();
                return; 
            } else {
                message.channel.sendMessage('Game will continue.');
                bot.removeListener('message', g);
                return;
            }
        });
    }

    var regex = new RegExp('^([a-o])([a-o])$');
    var match = regex.exec(message.content.toString());
    if (!match) {
        return;
    }

    r = ch_list.indexOf(match[1]);
    c = ch_list.indexOf(match[2]);

    if (turn === 1 && message.author.id === player1) {
        if (board[r][c] !== '-') {
            message.channel.sendMessage('Can\'t place in that position. Try again.');
        } else {
            board[r][c] = 'o';
            if (check_board()) {
                message.channel.sendMessage(board_in_string());
                message.channel.sendMessage('<@{0}>\ won the game. Congratlations!'.format(player1));
                bot.removeListener('message', f);
                callback();
                return;
            }

            message.channel.sendMessage(board_in_string());
            message.channel.sendMessage('<@{0}>\'s turn!'.format(player2));
            remove_timeout();
            set_timeout(message, f);
            turn = 2;
        }
    } else if (turn === 2 && message.author.id === player2) {        
        if (board[r][c] !== '-') {
            message.channel.sendMessage('Can\'t place in that position. Try again.');
        } else {
            board[r][c] = 'x';
            if (check_board()) {
                message.channel.sendMessage(board_in_string());
                message.channel.sendMessage('<@{0}>\ won the game. Congratlations!'.format(player2));
                bot.removeListener('message', f);
                callback();
                return;
            }

            message.channel.sendMessage(board_in_string());
            message.channel.sendMessage('<@{0}>\'s turn!'.format(player1));
            remove_timeout();
            set_timeout(message, f);
            turn = 1;
        }
    } else {
        message.channel.sendMessage('Not your turn :(');
    }
}

var check_board = function () {
    for (i = 0; i < 15; i++) {
        for (j = 0; j < 15; j++) {
        }
    }
    return false;
}

var play_gomoku = function(_bot, message, user1, user2, _callback) {
    bot = _bot;
    player1 = user1;
    player2 = user2;
    callback = _callback;
    turn = 1;
   
    message.channel.sendMessage('Started gomoku! <@{0}>\'s turn.'.format(player1));
    for (i = 0; i < 15; i++) {
        board[i] = [];
        for (j = 0; j < 15; j++) {
            board[i][j] = '-';
        }
    }
    message.channel.sendMessage(board_in_string());
    bot.on('message', f);
    set_timeout(message, f);
}

module.exports = {
    play_gomoku : play_gomoku
};


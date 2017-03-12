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

var board_in_string = function() {
    var board_string = '```';
    for (i = 0; i < 9; i++) {
        board_string += '{0} '.format(i)
        for (j = 0; j < 9; j++) {
            board_string += board[i][j];
        }
        board_string += '\n'
    }
    board_string += '  012345678```';
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
    
    if (message.content === 'quit') {
        message.channel.sendMessage('<@{0}> forfeited the game :('.format(message.author.id));
        bot.removeListener('message', f);
        callback();
    }

    var regex = new RegExp('^([0-9]) ([0-9])$');
    var match = regex.exec(message.content.toString());
    if (!match) {
        return;
    }

    if (turn === 1 && message.author.id === player1) {
        // Do player 1 stuff here.

        board[parseInt(match[1])][parseInt(match[2])] = 'o';
        message.channel.sendMessage('<@{0}>\'s turn!'.format(player2));
        message.channel.sendMessage(board_in_string());
        remove_timeout();
        set_timeout(message, f);
        turn = 1;
    } else if (turn === 2 && message.author.id === player2) {
        // Do player 2 stuff here.
        
        board[parseInt(match[1])][parseInt(match[2])] = 'x';
        message.channel.sendMessage('<@{0}>\'s turn!'.format(player1));
        message.channel.sendMessage(board_in_string());
        remove_timeout();
        set_timeout(message, f);
        turn = 1;
    } else {
        message.channel.sendMessage('Not your turn :(');
    }
}

var play_gomoku = function(_bot, message, user1, user2, _callback) {
    bot = _bot;
    player1 = user1;
    player2 = user2;
    callback = _callback;
    turn = 1;
    
    message.channel.sendMessage('Started gomoku! <@{0}>\'s turn.'.format(player1));

    for (i = 0; i < 9; i++) {
        board[i] = [];
        for (j = 0; j < 9; j++) {
            board[i][j] = '+';
        }
    }

    message.channel.sendMessage(board_in_string());
    bot.on('message', f);
    set_timeout(message, f);
}

module.exports = {
    play_gomoku : play_gomoku
};


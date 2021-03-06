const Discord = require('discord.js');
const db = require('./db.js');
const bj = require('./bj.js');
const gom = require('./gomoku.js');
const bot = new Discord.Client();
const token = process.env.bot_token;
const command_prefix = process.env.bot_command;
var bj_active = false;
var gom_active = false;

String.prototype.format = function () {
    var args = [].slice.call(arguments);
    return this.replace(/(\{\d+\})/g, function (a){
        return args[+(a.substr(1,a.length-2))||0];
    });
};

bot.on('ready', () => {
    console.log('LovelyBot is ready!');
});

bot.on('message', message => {

    if (message.author.id === '282890520672600065') {
        return message;
    }

    if (bj_active && message.content.charAt(0) === command_prefix) {
        message.channel.sendMessage('Blackjack game in progress. Please wait until game finishes.');
        return message;
    }

    if (gom_active && message.content.charAt(0) === command_prefix) {
        message.channel.sendMessage('Gomoku game in progress. Please wait until game finishes.');
        return message;
    }


    if (message.content === '{0}help'.format(command_prefix)) {
        message.channel.sendMessage('```★List of commands★\n-------------------------' + 
            '----------------------------------\n' +
            '!q -> Picks a random quote from this server.\n' +
            '!ql -> Show number of quotes in the server library.\n' +
            '!addq -> Add a quote to the VSRG discord group library!\n' +
            '!geng -> DOO*6 JACKPOT with 5% chance. Worth 100 credits.\n' +
            '!nong -> noooooong JACKPOT with 10% chance. Worth 30 credits.\n' +
            '!geng <user> -> Show geng points for user. Replace geng with nong for nong points.\n' +
            '!sellg <number> -> Buy credits. Replace g with n to sell nongs. Bulk sell = more bonus.\n' +
            '!dailies -> Worth 300 credits.\n' +
            '!cd <user> -> Get credit count of user.\n' +
            '!cdl -> Credit Leaderboards \n' +
            '!bet <number> -> Bet that much amount.\n' +
            '!bj -> Start a game of blackjack! Type !bj help for instructions.\n' + 
            '!gom <user> -> Start a game of gomoku! Type !gom help for instructions.\n```'
        );
    }

    if (message.content === '{0}q'.format(command_prefix)) {
        db.get_quote(function(e, doc) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                message.channel.sendMessage(doc.quote);
            }
        });
    }

    if (message.content === '{0}ql'.format(command_prefix)) {
        db.count_quote(function(e, count) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                message.channel.sendMessage("Total of {0} quotes!".format(count))
            }
        });
    }

    if (message.content.startsWith('{0}addq '.format(command_prefix))) {
        var msg = message.content.toString().slice(6, message.content.length);
        db.add_quote(msg, function(e, added, result) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                var msg = added ? 'Added quote to library!' : 
                    'Quote already in database!';
                message.channel.sendMessage(msg);
            }
        });
    }

    if (message.content === '{0}geng'.format(command_prefix)) {
        var random_number = Math.floor(Math.random()*(100+1)) + 1;
        if (random_number === 1) {
            db.update_user_points('geng', message.author.id, 1, function(e, result) {
                if (e) {
                    console.log(e);
                    message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
                } else {
                    message.channel.sendMessage('{0} DOO DOO DOO DOO DOO DOO **JACKPOT YOU GOT 6 DOOS**'.
                    format(message.author.toString()));
                }
            });
        } else {
            message.channel.sendMessage('DOO DOO DOO DOO DOO');
        }
    }

    if (message.content.startsWith('{0}geng '.format(command_prefix))) {
        var user = message.content.toString().slice(8, message.content.length-1);
        var user_name = message.content.toString().slice(6, message.content.length);
        db.get_user_points('geng', user, function(e, doc) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                var msg = doc ? '{0} has {1} gengs'.format(user_name, doc.score) :
                    'Couldn\'t find user in geng database.';
                message.channel.sendMessage(msg);
            }
        });
    }

    if (message.content === '{0}nong'.format(command_prefix)) {
        var random_number = Math.floor(Math.random()*(20+1)) + 1;
        var nong = 'n';
        for(i = 0; i < random_number; i++) {
            nong += 'o'
        }
        nong += 'ng'

        if (random_number === 6) {
            db.update_user_points('nong', message.author.id, 1, function(e, result) {
                if (e) {
                    console.log(e);
                    message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
                } else {
                    message.channel.sendMessage('{0} noooooong **JACKPOT YOU GOT 6 Os**'.
                    format(message.author.toString()));
                }
            });
        } else {
            message.channel.sendMessage(nong);
        }
    }

    if (message.content.startsWith('{0}nong '.format(command_prefix))) {
        var user = message.content.toString().slice(8, message.content.length-1);
        var user_name = message.content.toString().slice(6, message.content.length);
        db.get_user_points('nong', user, function(e, doc) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                var msg = doc ? '{0} has {1} nongs'.format(user_name, doc.score) :
                    'Couldn\'t find user in nong database.';
                message.channel.sendMessage(msg);
            }
        });
    }

    if (message.content === '{0}dailies'.format(command_prefix)) {
        db.dailies(message.author.id, message.author.username, function(e, added, time) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                var hour;
                var min;
                if (!added) {
                    hour = time[0];
                    min = time[1];
                }
                var msg = added ? '{0} You have just received 300 credits.'.format(message.author.toString()) :
                    'You can do dailies again in {0} hours and {1} minutes'.format(hour, min);
                message.channel.sendMessage(msg);
            }
        });
    }

    if (message.content === '{0}cdl'.format(command_prefix)) {
        db.print_credits_list(function(e, board) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                message.channel.sendMessage(board); 
            }
        });
    }

    if (message.content === ('{0}cd'.format(command_prefix))) {
        db.get_user_credit(message.author.id, function(e, doc) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                var msg = doc ? '{0} has {1} credits'.format(message.author, doc.credit) : 
                    'User is either invalid or has 0 credits.';
                message.channel.sendMessage(msg); 
            }
        });
    }

    if (message.content.startsWith('{0}cd '.format(command_prefix))) {
        var user = message.content.toString().slice(6, message.content.length-1);
        var user_name = message.content.toString().slice(4, message.content.length);
        db.get_user_credit(user, function(e, doc) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                var msg = doc ? '{0} has {1} credits'.format(user_name, doc.credit) : 
                    'User is either invalid or has 0 credits.';
                message.channel.sendMessage(msg); 
            }
        });
    }

    if (message.content.startsWith('{0}bet '.format(command_prefix))) {
        number = message.content.toString().slice(5, message.content.length);

        if (!isNaN(number) && !number.includes('.') && parseInt(number) > 0) {
            db.bet_credit(message.author.id, message.author.username, parseInt(number), function(e, valid, win) {
                if (e) {
                    console.log(e);
                    message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
                } else {
                    if (!valid) {
                      message.channel.sendMessage('You don\'t have enough credits to bet that much.');
                    } else {
                        var msg = win ? "{0}, you have won `{1}` credits!!".format(message.author.toString(), number) :
                            "{0}, you have lost `{1}` credits...".format(message.author.toString(), number);
                        message.channel.sendMessage(msg);
                    }    
                }
            });
        } else {
          message.channel.sendMessage('Not valid number.');
        }
    }

    if (message.content.startsWith('{0}give '.format(command_prefix))) {
        if (message.author.id === '185885180408496128') {
            var regex = new RegExp('<@([0-9]+)> (-?[0-9]+)');
            var match = regex.exec(message.content.toString());
            var id = match[1];
            var amount = parseInt(match[2]);

            db.update_credits(id, amount, function(e) {
                if (e) {
                    console.log(e);
                    message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
                } else {
                    message.channel.sendMessage('<@{0}> You received {1} credits!'.format(id, amount));
                }
            });
        } else {
            message.channel.sendMessage('You think it\'s that easy? :thinking:');
        }
    }

    if (message.content.startsWith('{0}sellg '.format(command_prefix))) {
        number = message.content.toString().slice(7, message.content.length);

        if (!isNaN(number) && !number.includes('.') && parseInt(number) > 0) {
            db.buy_credits('geng', message.author.id, parseInt(number), function(e, cd, enough) {
                if (e) {
                    console.log(e);
                    message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
                } else {
                    if (cd) {
                        var msg = !enough ? 'You don\'t have enough geng points to purchase that many.':
                            'You sold {0} geng points for {1} credits!'.format(number, Math.floor(number*100*Math.pow(1.05, number-1)));
                        message.channel.sendMessage(msg);
                    } else {
                        message.channel.sendMessage('You don\'t have any geng points.');
                    }
                }
            });
        } else {
          message.channel.sendMessage('Not valid number.');
        }
    }

    if (message.content.startsWith('{0}selln '.format(command_prefix))) {
        number = message.content.toString().slice(7, message.content.length);

        if (!isNaN(number) && !number.includes('.') && parseInt(number) > 0) {
            db.buy_credits('nong', message.author.id, parseInt(number), function(e, cd, enough) {
                if (e) {
                    console.log(e);
                    message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
                } else {
                    if (cd) {
                        var msg = !enough ? 'You don\'t have enough nong points to purchase that many.':
                            'You sold {0} nong points for {1} credits!'.format(number, Math.floor(number*30*Math.pow(1.05,number-1)));
                        message.channel.sendMessage(msg);
                    } else {
                        message.channel.sendMessage('You don\'t have any nong points.');
                    }
                }
            });
        } else {
          message.channel.sendMessage('Not valid number.');
        }
    }

    if (message.content === '{0}bj help'.format(command_prefix)) {
        message.channel.sendMessage('```\nBlackjack\n-------------------------------------------------\n' +
            'Goal of this game is to get closer to 21 points than the dealer without going over. In each round,' + 
            'you can either hit/stand. If you hit, you get another card. If you stand, it means you are done. ' +
            'A is worth either 1 or 11 points (depending on if you go over 21 or not) All the face cards are worth 10 points.\n\n' +
            'List of commands you can use during the game\n' + 
            ' hit -> continue receiving cards.\n' +
            ' stand -> stop receiving cards and calculate score.\n' + 
            ' score -> get current score\n```' 
        );
        return;
    }

        if (message.content === '{0}gom help'.format(command_prefix)) {
        message.channel.sendMessage('```\nGomoku\n-------------------------------------------------\n' +
            'Goal of this game is connect 5 of your pieces first before your opponent does.' + 
            'You can connect your pieces either horizontally, vertically, or diagonally. To place your piece, type two ' +
            'letters corresponding to the coordinates starting with left then bottom. ' + 
            '(Ex, kj places in k on left coordinate and j on bottom coordinate.\n\n' +
            'List of commands you can use during the game\n' + 
            ' board -> show current board\n' +
            ' quit -> resign the game\n' + 
            ' draw -> request a draw game to the user\n```' 
        );
        return;
    }

    if (message.content.startsWith('{0}bj '.format(command_prefix))) {
        var regex = new RegExp('^{0}bj ([0-9]+)$'.format(command_prefix));
        var match = regex.exec(message.content.toString());
        if (!match) {
            message.channel.sendMessage('Please bet a number to play blackjacks.');
            return
        }
        var amount = parseInt(match[1]);        
        db.get_user_credit(message.author.id, function(e, doc) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                if (doc.credit < amount) {
                    message.channel.sendMessage('Not enough credit to play blackjack :('); 
                } else {
                    bj_active = true;
                    bj.play_blackjack(bot, message, amount, function() {
                        bj_active = false;
                        return message;
                    });
                }
            }
        });
    }

    if (message.content.startsWith('{0}gom '.format(command_prefix))) {
        var regex = new RegExp('^{0}gom <@([0-9]+)>$'.format(command_prefix));
        var match = regex.exec(message.content.toString());
        if (!match) {
            message.channel.sendMessage('Please specify your opponent.');
            return;
        }

        if (message.author.id === match[1]) {
            message.channel.sendMessage('You can\'t play with yourself :(');
            return;
        }

        gom_active = true;

        gom.play_gomoku(bot, message, message.author.id, match[1], function() {
            gom_active = false;
            message.channel.sendMessage('Gomoku game has ended.');
            return message;
        });
    }
});

bot.login(token);

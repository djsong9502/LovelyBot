const Discord = require('discord.js');
const db = require('./db.js');
const bot = new Discord.Client();
const token = process.env.bot_token;

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

    if (message.author.id === "282890520672600065") {
        return;
    }

    if (message.content.charAt(0) != '!') {
        return;
    }

    if (message.content === '!help') {
        message.channel.sendMessage('```★List of commands★\n-------------------------' + 
            '----------------------------------\n' +
            '!q -> Picks a random quote from this server.\n' +
            '!ql -> Show number of quotes in the server library.\n' +
            '!addq -> Add a quote to the VSRG discord group library!\n' +
            '!geng -> DOO*6 JACKPOT with 5% chance. Worth 100 credits.\n' +
            '!nong -> noooooong JACKPOT with 10% chance. Worth 30 credits.\n' +
            '!geng <user> -> Show geng points for user.\n' +
            '!nong <user> -> Show nong points for user.\n' +
            '!sellg <number> -> Sell geng points for credits. Bulk sell = more bonus.\n' +
            '!selln <number> -> Sell nong points for credits. Bulk sell = more bonus.\n' +
            '!dailies -> Worth 300 credits.\n' +
            '!cd <user> -> Get credit count of user.\n' +
            '!cdl -> Credit Leaderboards \n' +
            '!bet <number> -> Bet that much amount.\n```'
        );
    }

    if (message.content === '!q') {
        db.get_quote(function(e, doc) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                message.channel.sendMessage(doc.quote);
            }
        });
    }

    if (message.content === '!ql') {
        db.count_quote(function(e, count) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                message.channel.sendMessage("Total of {0} quotes!".format(count))
            }
        });
    }

    if (message.content.startsWith('!addq ')) {
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

    if (message.content === '!geng') {
        var random_number = Math.floor(Math.random()*(20+1)) + 1;
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

    if (message.content.startsWith('!geng ')) {
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

    if (message.content === '!nong') {
        var random_number = Math.floor(Math.random()*(10+1)) + 1;
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

    if (message.content.startsWith('!nong ')) {
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

    if (message.content === '!dailies') {
        db.dailies(message.author.id, function(e, added, time) {
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

    if (message.content === '!cdl') {
        db.print_credits_list(function(e, board) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                message.channel.sendMessage(board); 
            }
        });
    }

    if (message.content === ('!cd')) {
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

    if (message.content.startsWith('!cd ')) {
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

    if (message.content.startsWith('!bet ')) {
        number = message.content.toString().slice(5, message.content.length);

        if (!isNaN(number) && !number.includes('.') && parseInt(number) > 0) {
            db.bet_credit(message.author.id, parseInt(number), function(e, valid, win) {
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

    if (message.content.startsWith('!sellg ')) {
        number = message.content.toString().slice(7, message.content.length);

        if (!isNaN(number) && !number.includes('.') && parseInt(number) > 0) {
            db.buy_credits('geng', message.author.id, parseInt(number), function(e, cd, enough) {
                if (e) {
                    console.log(e);
                    message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
                } else {
                    if (cd) {
                        var msg = !enough ? 'You don\'t have enough geng points to purchase that many.':
                            'You sold {0} geng points for {1} credits!'.format(number, Math.floor(number*100*Math.pow(1.1,number-1)));
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

    if (message.content.startsWith('!selln ')) {
        number = message.content.toString().slice(7, message.content.length);

        if (!isNaN(number) && !number.includes('.') && parseInt(number) > 0) {
            db.buy_credits('nong', message.author.id, parseInt(number), function(e, cd, enough) {
                if (e) {
                    console.log(e);
                    message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
                } else {
                    if (cd) {
                        var msg = !enough ? 'You don\'t have enough nong points to purchase that many.':
                            'You sold {0} nong points for {1} credits!'.format(number, Math.floor(number*30*Math.pow(1.1,number-1)));
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
});

bot.login(token);

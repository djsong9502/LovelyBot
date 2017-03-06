const MongoClient = require('mongodb').MongoClient,assert = require('assert');
const Discord = require('discord.js');
const bot = new Discord.Client();
const url = process.env.dburl;
const token = process.env.bot_token;

var update_user_points = function(type, user, inc, callback) {
    MongoClient.connect(url, function(e, db) {
        var collection = db.collection(type);
        collection.findOne({ user : user }, function(e, doc) {
            if (!doc) {
                collection.update(
                    { user: user },
                    { $set: { score: inc } },
                    { upsert: true },
                    function(e, result) {
                        db.close();
                        callback(e, result);
                });
            } else {
                collection.update(
                    { user: user },
                    { $inc: { score: inc } },
                    { upsert: true },
                    function(e, result) {
                        db.close();
                        callback(e, result);
                });
            }
        });
    });
}

var get_user_points = function(type, user, callback) {
    MongoClient.connect(url, function(e, db) {
        var collection = db.collection(type);
        collection.findOne( { user: user }, function(e, doc) {
            db.close()
            callback(e, doc)
        });
    });
}

var add_quote = function(msg, callback) {
    MongoClient.connect(url, function(e, db) {
        var collection = db.collection('quotes');
        collection.findOne( { quote: msg }, function(e, doc) {
            if (doc) {
                db.close();
                callback(e, false);
            } else {
                collection.insert(
                    { quote: msg},
                    function(e, result) {
                        db.close();
                        callback(e, true, result);
                });
            }
        });
    });
}

var get_quote = function(callback) {
    MongoClient.connect(url, function(e, db) {
        var collection = db.collection('quotes');
        collection.find().count(function (e, count) {
            var r = Math.floor(Math.random() * count);
            collection.find().toArray(function (e, docs) {
                db.close();
                callback(e, docs[r]);
            });
        });
    });
}

var count_quote = function(callback) {
    MongoClient.connect(url, function(e, db) {
        var collection = db.collection('quotes');
        collection.find().count(function (e, count) {
            db.close();
            callback(e, count);
        });
    });
}

var dailies = function(user, callback) {
    MongoClient.connect(url, function(e, db) {
        var collection = db.collection('credits');
        collection.findOne({ user : user }, function(e, doc) {
            if (doc && Date.now() - doc.time < 86400000) {
                var total_min_left = (86400000 - (Date.now() - doc.time)) / 60000;
                var hour = Math.floor(total_min_left / 60);
                var minute = Math.floor(total_min_left % 60);
                db.close();
                callback(e, false, [hour, minute]);
            } else {
                collection.update(
                    { user: user },
                    { $inc: { credit: 300 },
                      $set: { time: Date.now() } },
                    { upsert: true },
                    function(e, result) {
                        db.close();
                        callback(e, true);
                });
            }
        });
    });
}

var bet_credit = function(user, number, callback) {
    MongoClient.connect(url, function(e, db) {
        var collection = db.collection('credits');
        collection.findOne( { user: user }, function(e, doc) {
            if (doc) {
                if (doc.credit >= number) {
                    var win = Math.round(Math.random()) ? number : -number;
                    collection.update(
                      { user: user },
                      { $inc: { credit: win },
                      },
                      { upsert: true },
                      function(e, result) {
                        db.close();
                        callback(e, true, win > 0);
                    });   
                } else {
                    db.close();
                    callback(e, false);
                }
            } else {
                db.close();
                callback(e,false);
            }
        });
    });
}

var print_credits_list = function(callback) {
    MongoClient.connect(url, function(e, db) {
        var collection = db.collection('credits');
        collection.find().sort({credit: -1}).toArray(function(e, docs) {
            var board = '```Credits Leaderboards\n---------------' +
                '-----------------------\n';
            var length;

            if (docs.length >= 10) {
                length = 10;
            } else {
                length = docs.length;
            }

            for (i = 0; i < length; i++) {
                board += ('{0}: {1} has {2} credits.\n'.format(i+1, docs[i].name, docs[i].credit));
            }
            board += "```";
            db.close();
            callback(e, board);
        });
    });
}

var get_user_credit = function(user, callback) {
    MongoClient.connect(url, function(e, db) {
        var collection = db.collection('credits');
        collection.findOne( { user: user }, function(e, doc) {
            db.close();
            callback(e,doc);
        });
    });
}

// Typical node.js callback hell
// TODO Think of better way
var buy_credits = function(type, user, number, callback) {
    MongoClient.connect(url, function(e, db) {
        var points_collection = db.collection(type);
        points_collection.findOne( { user: user }, function(e, doc) {
            if (doc) {
                if (doc.score < number) {
                    callback(e, true, false);
                } else {
                    var credits_collection = db.collection('credits')
                    points_collection.update(
                        { user: user },
                        { $inc: { score: -number } },
                        { upsert: true },
                        function(e, result) {
                            var value = type === 'geng' ? 100 : 30;
                            credits_collection.update(
                                { user: user },
                                { $inc: { credit: Math.floor(number*value*Math.pow(1.1,number-1)) } },
                                { upsert: true },
                                function(e, result) {
                                    db.close();
                                    callback(e, true, true);
                            });
                    });
                }
            } else {
                db.close();
                callback(e, false);
            }
        });
    });
}

function is_numeric(num){
    return !isNaN(num)
}

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
        get_quote(function(e, doc) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                message.channel.sendMessage(doc.quote);
            }
        });
    }

    if (message.content === '!ql') {
        count_quote(function(e, count) {
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
        add_quote(msg, function(e, added, result) {
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
            update_user_points('geng', message.author.id, 1, function(e, result) {
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
        get_user_points('geng', user, function(e, doc) {
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
            update_user_points('nong', message.author.id, 1, function(e, result) {
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
        get_user_points('nong', user, function(e, doc) {
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
        dailies(message.author.id, function(e, added, time) {
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
        print_credits_list(function(e, board) {
            if (e) {
                console.log(e);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                message.channel.sendMessage(board); 
            }
        });
    }

    if (message.content === ('!cd')) {
        get_user_credit(message.author.id, function(e, doc) {
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
        get_user_credit(user, function(e, doc) {
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

        if (is_numeric(number) && !number.includes('.') && parseInt(number) > 0) {
            bet_credit(message.author.id, parseInt(number), function(e, valid, win) {
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

        if (is_numeric(number) && !number.includes('.') && parseInt(number) > 0) {
            buy_credits('geng', message.author.id, parseInt(number), function(e, cd, enough) {
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

        if (is_numeric(number) && !number.includes('.') && parseInt(number) > 0) {
            buy_credits('nong', message.author.id, parseInt(number), function(e, cd, enough) {
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

const Discord = require('discord.js');
const db = require('./db.js');

var dealer_score_get = function () {
    var weight = Math.random();
    var dealer_score;
    if (weight >= 0.837) {
        dealer_score = 22;
    } else if (weight >= 0.781 && weight < 0.837) {
        dealer_score = 21;
    } else if (weight >= 0.708 && weight < 0.781) {
        dealer_score = 20;
    } else if (weight >= 0.619 && weight < 0.708) {
        dealer_score = 19;
    } else if (weight >= 0.484 && weight < 0.619) {
        dealer_score = 18;
    } else if (weight >= 0.342 && weight < 0.484) {
        dealer_score = 17;
    } else if (weight >= 0.184 && weight < 0.342) {
        dealer_score = 16;
    } else if (weight >= 0 && weight < 0.184) {
        dealer_score = 15;
    }

    return dealer_score;
}

var play_blackjack = function(bot, message, amount, callback) {
    message.channel.sendMessage('Started blackjack! Type hit to start the game.');

    var player = parseInt(message.author.id);
    var user_points = 0;
    var num_of_aces = 0;
    var dealer_score = dealer_score_get();

    bot.on('message', function f (message) {
        if (parseInt(message.author.id) !== player) {
            return message;
        }

        if (message.content === 'hit') {
            var num_list = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
            var suit_list = [':spades:', ':diamonds:', ':clubs:', ':hearts:']
            var index_num = Math.floor(Math.random()*13)
            var random_num =  num_list[index_num];

            index_num =  index_num > 9 ? 9 : index_num;
            var random_suit = suit_list[Math.floor(Math.random()*4)];
            if (index_num == 0) {
                num_of_aces += 1;
                user_points += 10;
            }

            user_points += index_num+1;

            while (user_points > 21 && num_of_aces !== 0) {
                num_of_aces -= 1;
                user_points -= 10;
            }

            if (user_points === 21) {
                message.channel.sendMessage('{0}{1} You got `{2}` exactly!!! You received `{3}` credits.'.format(random_num, random_suit, user_points, amount*2));
                db.update_credits(message.author.id, amount*2, function(e) {
                    if (e) {
                        console.log(e);
                        message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
                    } else {
                        callback();
                        bot.removeListener('message', f);
                    }
                });
                return;
            }

            if (user_points > 21) {
                if (dealer_score == 22) {
                    message.channel.sendMessage('{0}{1}  You got `{2}` but dealer also busted. No credits lost.'.format(random_num, random_suit, user_points));
                    callback();
                    bot.removeListener('message', f);
                } else {
                    message.channel.sendMessage('{0}{1}  You got `{2}` but dealer got `{3}`. You lost {4} credits.'.format(random_num, random_suit, user_points, dealer_score, amount));

                    db.update_credits(message.author.id, -amount, function(e) {
                        if (e) {
                            console.log(e);
                            message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
                        } else {
                            callback();
                            bot.removeListener('message', f);
                        }
                    });
                }
            } else {
                message.channel.sendMessage('{0}{1} Do you want to hit/stand?'.format(random_num, random_suit));
            }
        }

        if (message.content === 'score') {
            message.channel.sendMessage('<@{0}> You have {1} points so far.'.format(message.author.id, user_points));
        }

        if (message.content === 'stand') {
            var win = 0;
            if (dealer_score == 22) {
                message.channel.sendMessage('You got `{0}` but dealer busted. You win {1} credits!'.format(user_points, Math.floor(amount/4)));
                win = Math.floor(amount/4);
            } else if (dealer_score > user_points) {
                message.channel.sendMessage('You got `{0}` but dealer got `{1}`. You lost {2} credits.'.format(user_points, dealer_score, amount));
                win = -amount;
            } else if (dealer_score === user_points) {
                message.channel.sendMessage('You got `{0}` but dealer also got `{1}`. No credits lost.'.format(user_points, dealer_score));
            } else {
                message.channel.sendMessage('You got `{0}` and dealer got `{1}`. You win {2} credits.'.format(user_points, dealer_score, Math.floor(amount/4)));
                win = Math.floor(amount/4);
            }

            db.update_credits(message.author.id, win, function(e) {
                if (e) {
                    console.log(e);
                    message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
                } else {
                    callback();
                    bot.removeListener('message', f);
                }
            });
            
        }
    });
}

module.exports = {
    play_blackjack : play_blackjack
};


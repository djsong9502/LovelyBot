const MongoClient = require('mongodb').
    MongoClient,assert = require('assert');
const Discord = require('discord.js');
const bot = new Discord.Client();
const url = process.env.dburl;
const token = process.env.bot_token;

var update_user_geng = function(user, inc, callback) {
    MongoClient.connect(url, function(err, db) {
        if (err) {
            db.close();
            callback(err);
            return;
        }
        var collection = db.collection('gengaozo');
        collection.findOne({ user : user }, function(err, doc) {
            if (err) {
                db.close();
                callback(err);
            } else {
                if (!doc) {
                    collection.update(
                        { user: user },
                        { $set: { score: inc } },
                        { upsert: true },
                        function(err, result) {
                            db.close();
                            callback(err, result);
                    });
                } else {
                    collection.update(
                        { user: user },
                        { $inc: { score: inc } },
                        { upsert: true },
                        function(err, result) {
                            db.close();
                            callback(err, result);
                    });
                }
            }
        });
    });
}

var get_user_geng = function(user, callback) {
    MongoClient.connect(url, function(err, db) {
        if (err) {
            db.close();
            callback(err);
            return;
        }
        var collection = db.collection('gengaozo');
        collection.findOne( { user: user }, function(err, doc) {
            if (err) {
                callback(err)
            } else {
                callback(err, doc)
            }
            db.close()
        });
    });
}

var add_quote = function(db, message, msg, callback) {
  var collection = db.collection('quotes');
  collection.findOne( { quote: msg } ,function(err, doc) {
    if (doc) {
      message.channel.sendMessage('Quote already in database!')
    } else {
      collection.insert(
        { quote: msg},
        function(err, result) {
          callback(result);
        });
      message.channel.sendMessage('Added quote to library!');
    }
  });
}

var retrieve_quote = function(db, message, allback) {
   var collection = db.collection('quotes');
  collection.find().count(function (e, count) {
    var r = Math.floor(Math.random() * count);

    var random = collection.find().toArray(function (err, docs) {
      message.channel.sendMessage(docs[r].quote);
    });
  });
}

var count_quote = function(db, message, allback) {
  var collection = db.collection('quotes');
  collection.find().count(function (e, count) {
      message.channel.sendMessage("Total of {0} quotes!".format(count))
  });
}

var dailies = function(db, user, callback) {
  var collection = db.collection('credits');
  collection.update(
    { user: user.id },
    { $inc: { credit: 100 },
      $set: {
        time: Date.now(),
        name: user.username
      },
    },
    { upsert: true },
    function(err, result) {
      callback(result);
    });
  db.close()
}

var gamble_credit = function(db, message, number, callback) {
  var collection = db.collection('credits');
  var roll = number;

  collection.findOne( { user: message.author.id }, function(err, doc) {
    if (doc) {
      var positive = Math.round(Math.random());
      if (positive != 1) {
        roll = -roll;
      }

      if (doc.credit >= number) {
        collection.update(
          { user: message.author.id },
          { $inc: { credit: roll },
          },
          { upsert: true },
          function(err, result) {
            callback(result);
          });
        if (positive == 1) {
          message.channel.sendMessage("{0}, you have won `{1}` credits!!".format(message.author.toString(), roll))
        } else {
          message.channel.sendMessage("{0}, you have lost `{1}` credits...".format(message.author.toString(), roll*-1))
        }
      } else {
        message.channel.sendMessage('You don\'t have enough credits to bet that much.')
      }
    } else {
      message.channel.sendMessage('You don\'t have any credits.')
    }
    db.close()
  });
}

var print_credits_list = function(db, message, callback) {
  var collection = db.collection('credits');
  collection.find().sort({credit: -1}).toArray(function(err, docs) {
      var board = '```Credits Leaderboards\n---------------' +
        '-----------------------\n';
      var length;

      if (docs.length >= 10) {
        length = 10;
      } else {
        length = docs.length;
      }

      for (i = 0; i < length; i++) {
        board += ('{0}: {1} has {2} credits.\n'.format(i+1, docs[i].name, docs[i].credit))
      }
      board += "```"
      message.channel.sendMessage(board)
    });
}

var get_user_credit = function(db, message, user, callback) {
  var userID = user.slice(2, user.length-1);
  var collection = db.collection('credits');

  collection.findOne( { user: userID }, function(err, doc) {
    if (doc) {
      message.channel.sendMessage('{0} has {1} credits'.format(user, doc.credit))
    } else {
      message.channel.sendMessage('User is either invalid or has 0 credits.')
    }
    db.close()
  });
}

var buy_credit_with_gengaozo = function(db, message, number, callback) {
  var userID = message.author.id;
  var geng_collection = db.collection('gengaozo');

  geng_collection.findOne( { user: userID }, function(err, doc) {
    if (doc) {
      if (doc.score < number) {
        message.channel.sendMessage('You don\'t have enough geng points to purchase that many.')
      } else {
        var credits_collection = db.collection('credits')
        geng_collection.update(
          { user: userID },
          { $inc: { score: -number },
            $set: {
              time: Date.now()
            }
          },
          { upsert: true },
          function(err, result) {
            callback(result);
          });

        credits_collection.update(
            { user: userID },
            { $inc: { credit: number*100 }
            },
            { upsert: true },
            function(err, result) {
              callback(result);
            });

          message.channel.sendMessage('You sold {0} geng points for {1} credits!'.format(number, number*100))
      }
    } else {
      message.channel.sendMessage('You don\'t have any geng points.')
    }

    db.close()
  });
}

//////////////////////
// HELPER FUNCTIONS //
//////////////////////

function is_numeric(num){
    return !isNaN(num)
}

String.prototype.format = function () {
    var args = [].slice.call(arguments);
    return this.replace(/(\{\d+\})/g, function (a){
        return args[+(a.substr(1,a.length-2))||0];
    });
};

//////////////////////////
// ACTUAL DISCORD STUFF //
//////////////////////////
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


  // HELP COMMAND
  if (message.content === '!help') {
    message.channel.sendMessage('```★List of commands★\n-----------------------------------------------------------\n' +
    '!q -> Picks a random quote from this server.\n' +
    '!ql -> Show number of quotes in the server library.\n' +
    '!addq -> Add a quote to the VSRG discord group library!\n' +
    '!insane <dan> <stage> --> Displays song info in the corresponding dan/stage. If you don\'t supply stage, dan info is displayed\n' +
    '!geng -> DOO DOO DOO JACKPOT with 2% chance. Worth 100 credits.\n' +
    '!geng <user> -> Show geng points for user.\n' +
    '!sellg <number> -> Sell geng points for credits.\n' +
    '!nong -> Try and get noooooong.\n' +
    '!dailies -> Get free daily credit!\n' +
    '!cd <user> -> Get credit count of user. Leave <user> blank for your own credit balance.\n' +
    '!cdl -> Get top 10 users with most credits\n' +
    '!bet <number> -> Bet that much amount. You can either win or lose that much amount.\n```'
    );
  }

  //////////////////
  // QUOTE COMMANDS
  if (message.content === '!q') {
    MongoClient.connect(url, function(err, db) {
      retrieve_quote(db, message, function() {
        db.close();
      });
    });
  }

  if (message.content === '!ql') {
    MongoClient.connect(url, function(err, db) {
      count_quote(db, message, function() {
        db.close();
      });
    });
  }

  if (message.content.startsWith('!addq ')) {
    var msg = message.content.toString().slice(6, message.content.length);
    MongoClient.connect(url, function(err, db) {
      add_quote(db, message, msg, function() {
        db.close();
      });
    });
  }

  //////////////////////
  // DAN INFO COMMANDS
  parsed_msg = message.content.substring(1,message.content.length).split(' ');
  if (parsed_msg[0] === 'insane' && is_numeric(parsed_msg[1])) {
    dan = parseInt(parsed_msg[1]);

    if (parsed_msg[2] == undefined || !is_numeric(parsed_msg[2])) {
      if (dan > 0 && dan < 13) {
        print_dan_info(message, dan);
      } else {
        message.channel.sendMessage('Check if parameters are valid.');
      }

      return;
    }

    stage = parseInt(parsed_msg[2]);
    if (parsed_msg.length < 4 && dan > 0 && dan < 13 && stage > 0 && stage < 5) {
      printInsaneDans(message, dan, stage);
    } else {
        message.channel.sendMessage('Check if parameters are valid.');
    }
  }

    // Done
    if (message.content === '!geng') {
        var random_number = Math.floor(Math.random() * (25 + 1)) + 1;
        if (random_number === 1) {
            update_user_geng(message.author.id, 1, function(err, result) {
                if (err) {
                    console.log(err);
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


    // Done
    if (message.content.startsWith('!geng ')) {
        var user = message.content.toString().slice(8, message.content.length-1);
        var user_name = message.content.toString().slice(6, message.content.length);
        get_user_geng(user, function(err, doc) {
            if (err) {
                console.log(err);
                message.channel.sendMessage('An error has occurred. Please check the logs <@185885180408496128>');
            } else {
                if (doc) {
                    message.channel.sendMessage('{0} has {1} gengs'.format(user_name, doc.score))
                } else {
                    message.channel.sendMessage('Couldn\'t find user in database.');
                }
            }
        });
    }

  if (message.content === '!nong') {
    var random_number = Math.floor(Math.random() * (30 - 1 + 1)) + 1;
    nong = 'n';
    for(i = 0; i < random_number; i++) {
      nong += 'o'
    }
    nong += 'ng'
    if (random_number == 6) {
      message.channel.sendMessage(message.author.toString() + ' ' + nong + ' JACKPOT. YOU HIT 6 Os');
      return;
    }
    message.channel.sendMessage(nong);
  }

  /////////////////////////////
  // CREDITS COMMANDS
  if (message.content === '!dailies') {
    MongoClient.connect(url, function(err, db) {
      var collection = db.collection('credits');
      collection.findOne({ user : message.author.id }, function(err, doc) {
        if (doc && Date.now() - doc.time < 86400000) {
          var total_min_left = (86400000 - (Date.now() - doc.time)) / 1000 / 60
          var hour = Math.floor(total_min_left / 60)
          var minute = Math.floor(total_min_left % 60)
          message.channel.sendMessage('You can do dailies again in {0} hours and {1} minutes'.format(hour, minute));
        } else {
          dailies(db, message.author, function() {
            message.channel.sendMessage('{0} You have just received 100 credits.'.format(message.author.toString()));
          });
        }
        db.close();
      });
    });
  }

  if (message.content === '!cdl') {
    MongoClient.connect(url, function(err, db) {
      print_credits_list(db, message, function() {
        db.close();
      });
    });
  }

  if (message.content === ('!cd')) {
    MongoClient.connect(url, function(err, db) {
      get_user_credit(db, message, message.author.toString(), function() {
        db.close();
      });
    });
  }

  if (message.content.startsWith('!cd ')) {
    var user = message.content.toString().slice(4, message.content.length);
    MongoClient.connect(url, function(err, db) {
      get_user_credit(db, message, user, function() {
        db.close();
      });
    });
  }

  if (message.content.startsWith('!bet ')) {
    number = message.content.toString().slice(5, message.content.length);

    if (is_numeric(number) && !number.includes('.') && parseInt(number) > 0) {
      MongoClient.connect(url, function(err, db) {
        gamble_credit(db, message, parseInt(number), function() {
          db.close();
        });
      });
    } else {
      message.channel.sendMessage('Not valid number.');
      return;
    }
  }


  if (message.content.startsWith('!sellg ')) {
    number = message.content.toString().slice(7, message.content.length);

    if (is_numeric(number) && !number.includes('.') && parseInt(number) > 0) {
      MongoClient.connect(url, function(err, db) {
        buy_credit_with_gengaozo(db, message, parseInt(number), function() {
          db.close();
        });
      });
    } else {
      message.channel.sendMessage('Not valid number.');
      return;
    }
  }
});

//TODO Remove these shit
function print_dan_info(message, dan) {
  if (dan == 1) {
    message.channel.sendMessage('```★01 1st Dan (発狂初段)\n10605 attempted users\n7730 CLEARED users\nTotal Clear Rate = 72%\n--------------------------------------------------------\n' +
    'Overall, pretty balanced dan course. Nothing exceptionally hard.\nMain goal is to clear papyrus and handle pure ruby stairs calmly.```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4945');

  } else if (dan == 2) {
    message.channel.sendMessage('```★02 2nd Dan (発狂二段)\n8326 attempted users\n5881 CLEARED users\nTotal Clear Rate = 70%\n--------------------------------------------------------\n' +
    'Starting to see a lot more variety in patterns now.\nIncluding first ever chordmashing song as well as scratch walls.\n' +
    'Main goal is to not get mindblocked by durandal and watch out for black lair\'s speed changes and scratches```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4944');

  } else if (dan == 3) {
    message.channel.sendMessage('```★03 3rd Dan (発狂三段)\n7159 attempted users\n5028 CLEARED users\nTotal Clear Rate = 70%\n--------------------------------------------------------\n' +
    'Chordstreaming wise, it\'s not much harder than 2nd dan.\nOverall, not much harder however...3rd song will block many people from clearing this dan.\n' +
    'Main goal is to have enough health at the end of candy baguette to start DTD emperor.```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4943');

  } else if (dan == 4) {
    message.channel.sendMessage('```★04 4th Dan (発狂四段)\n7022 attempted users\n4985 CLEARED users\nTotal Clear Rate = 70%\n--------------------------------------------------------\n' +
    'More variety in patterns + introducing high bpm brackets.\nMain goal is to pass absurd gaff\'s ending and not die in the moon intro scratches.```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4942');

  } else if (dan == 5) {
    message.channel.sendMessage('```★05 5th Dan (発狂初段)\n6460 attempted users\n3321 CLEARED users\nTotal Clear Rate = 51%\n--------------------------------------------------------\n' +
    'HUGE leap from 4th dan. You should tackle this dan after you can breeze through all the songs in 4th dan.\nAlso this song has lots of scratching.\n' +
    'Main goal is to save enough health in the 2nd stage to start the 3rd stage. And if you make it pas angelic snow, don\'t choke and die in the last song...```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4941');

  } else if (dan == 6) {
    message.channel.sendMessage('```★06 6th Dan (発狂初段)\n5596 attempted users\n3557 CLEARED users\nTotal Clear Rate = 63%\n--------------------------------------------------------\n' +
    'This dan is easier than 5th dan... no joke.\nAlso, note that this song has more clears + clear rate than 5th dan.\n' +
    'Main goal is to survive the cross breed ending and survive the last song\'s intro slowdown + chordstreaming right after.```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4940');

  } else if (dan == 7) {
    message.channel.sendMessage('```★07 7th Dan (発狂初段)\n4307 attempted users\n2074 CLEARED users\nTotal Clear Rate = 48%\n--------------------------------------------------------\n' +
    'Big, big leap from 6th dan. Overall, all the songs have become much harder.\n' +
    'Main goal is to not die in poppin shower and have enough health to clear the vallista\'s bracket jackfest section.```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4939');

  } else if (dan == 8) {
    message.channel.sendMessage('```★08 8th Dan (発狂初段)\n3539 attempted users\n1440 CLEARED users\nTotal Clear Rate = 40%\n--------------------------------------------------------\n' +
    'The ultimate chordsmashing dan course.\n' +
    'Main goal is to not die in the last half of 3rd song and have enough health to start the last song\'s slowdown.```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4938');

  } else if (dan == 9) {
    message.channel.sendMessage('```★09 9th Dan (発狂初段)\n2863 attempted users\n1232 CLEARED users\nTotal Clear Rate = 43%\n--------------------------------------------------------\n' +
    'Much harder than 8th dan. All the songs got even more dense... and faster\n' +
    'Main goal is to start banana man with the HIGHEST health as possible and hope you will make it through the scratch walls with enough health..```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4937');

  } else if (dan == 10) {
    message.channel.sendMessage('```★10 10th Dan (発狂初段)\n2197 attempted users\n652 CLEARED users\nTotal Clear Rate = 29%\n--------------------------------------------------------\n' +
    'Clearing this dan = clearing cynic\n' + 'Also first time a dan course having overjoy charts.\n' +
    'Main goal is to clear cynic and not die in the ascension\'s killer streams.```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4936');

  } else if (dan == 11) {
    message.channel.sendMessage('```★★ KAIDEN (発狂皆伝)\n2018 attempted users\n496 CLEARED users\nTotal Clear Rate = 24%\n--------------------------------------------------------\n' +
    'Pretty balanced course (believe it or not...)\nThis will be the final BMS goal of many people...\n' +
    'Also watch out for all the endings in this dan because they are all very difficult. (except the last song)\n' +
    'Main goal is to survive the ending of 3rd song with enough health to survive the ultimate intro chordstreaming of the last song.```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4935');

  } else if (dan == 12) {
    message.channel.sendMessage('```(^^) (発狂OVERJOY) \n1959 attempted users\n34 CLEARED users\nTotal Clear Rate = 1%\n--------------------------------------------------------\n' +
    'The chosen ones can pass this course.\n' +
    'Main goal is to... be a true Korean.```' +
    'http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&courseid=4934');

  }
}

function printInsaneDans(message, dan,level) {
  // 1st Dan
  if (dan == 1) {
      if (level == 1) {
          message.channel.sendMessage('```1st (初段) STAGE 1\n★2 Papyrus (Maniac) BOSS\n--------------------------------------------------------\n' +
          'Normal judge. Ocasional bursts and scratches are annoying.\nWatch out for a huge burst near the 3/4 way of the song.```');
      } else if (level == 2) {
          message.channel.sendMessage('```1st (初段) STAGE 2\n★3 elegante [Another Plus+]\n--------------------------------------------------------\n' +
          'Low bpm dense chordstreaming.\nWatch out for high density brackets at the very end.```');
      } else if (level == 3) {
          message.channel.sendMessage('```1st (初段) STAGE 3\n*3 風仁雷仁 (EX)\n--------------------------------------------------------\n' +
          'Also low bpm density chordstreaming.\nLittle easier than elegante.```');
      } else {
          message.channel.sendMessage('```1st (初段) STAGE 4\n★4 Pure Ruby -JUNK7- (mid boss)\n--------------------------------------------------------\n' +
          'High bpm double streaming.\nAlso first time where you will have to handle double stairs in a dan course.```');
      }

  // 2nd Dan
  } else if (dan == 2) {
      if (level == 1) {
          message.channel.sendMessage('```2nd (二段) STAGE 1\n★4 Durandal -Magical Freezing- (Radio Edit) [PLANET] (mid boss)\n--------------------------------------------------------\n' +
          'Upgrade from 1st dan\'s pure ruby.\nDouble stairs are pretty confusing to play.```');
      } else if (level == 2) {
          message.channel.sendMessage('```2nd (二段) STAGE 2\n★6 conflict [EX-HARD]\n--------------------------------------------------------\n' +
          '2/2 note chordstreaming. Watch out for scratch walls near the beginning.\n' +
          'Occasional jacks in the streams.\nThere is a section with huge jack walls 3/4 of the song.```');
      } else if (level == 3) {
          message.channel.sendMessage('```2nd (二段) STAGE 3\n★7 Her Majesty [Another+]\n--------------------------------------------------------\n' +
          'Chordmashing.\nPretty dense but low bpm makes up for it.```');
      } else {
          message.channel.sendMessage('```2nd (二段) STAGE 4\n★6 Black Lair [INSANE] (BOSS)\n--------------------------------------------------------\n' +
          'Slowdown... and scratch bursts are hard.\nHighly recommend to play this before you try this dan course.```');
      }

  // 3rd Dan
  } else if (dan == 3) {
      if (level == 1) {
        message.channel.sendMessage('```3rd (三段) STAGE 1\n★7 Love\'s Rebirth \'06 -7another-\n--------------------------------------------------------\n' +
        'Very simple chordstreaming.\nLow bpm makes this song very easy too.```');
    } else if (level == 2) {
        message.channel.sendMessage('```3rd (三段) STAGE 2\n★8 Candy & Baguette [SP INSANE] (mid boss)\n--------------------------------------------------------\n' +
        'Chordmashing with high bpm chordstreaming.\nStamina draining as well.```');
    } else if (level == 3) {
        message.channel.sendMessage('```3rd (三段) STAGE 3\n★7 DTD Emperor [ANOTHER] (BOSS)\n--------------------------------------------------------\n' +
        'Scratch walls + jacks at the 3/4 of the song will be the biggest wall of clearing 3rd dan.```');
    } else {
        message.channel.sendMessage('```3rd (三段) STAGE 4\n★8 ZENITHALIZE -LUMINOUS-\n--------------------------------------------------------\n' +
        'Introducing the infamous BMS delay.\nPretty simple and not much difficult.```');
    }

  // 4th Dan
  } else if (dan == 4) {
      if (level == 1) {
        message.channel.sendMessage('```4th (四段) STAGE 1\n★9 ERIS （Another+)\n--------------------------------------------------------\n' +
        'Simple and not too hard.\nOccasional scratches and bursts are going to eat your health a little.```');
    } else if (level == 2) {
        message.channel.sendMessage('```4th (四段) STAGE 2\n★9 Absurd Gaff [Another] (BOSS)\n--------------------------------------------------------\n' +
        'This gets very difficult near the end.' +
        '\nBrackets + scratch beats will eat up a lot of health and then the ending delay bursts will make you cry... legit```');
    } else if (level == 3) {
        message.channel.sendMessage('```4th (四段) STAGE 3\n*9 MooN -SP ANOTHER-\n--------------------------------------------------------\n' +
        'Watch out for intro scratch walls and you should be fine.```');
    } else {
        message.channel.sendMessage('```4th (四段) STAGE 4\n★10 Parousia [ANOTHER] (mid boss)\n--------------------------------------------------------\n' +
        'Ugly chart.\nScratches are annoying but if you made it through absurd gaff, you can probably breeze through this one.```');
    }

  // 5th Dan
  } else if (dan == 5) {
      if (level == 1) {
        message.channel.sendMessage('```5th (五段) STAGE 1\n★12 Tuk Tuk Boshi [7keys Crescent]\n--------------------------------------------------------\n' +
        'Patterns are really friendly and nice.\nReally easy song throughout.```');
    } else if (level == 2) {
        message.channel.sendMessage('```5th (五段) STAGE 2\n★12 Ms.Naive Princess [RAFFLESIA]\n--------------------------------------------------------\n' +
        'Scratches are difficult to execute.```');
    } else if (level == 3) {
        message.channel.sendMessage('```5th (五段) STAGE 3\n★14 Angelic Snow -extreme- (BOSS)\n--------------------------------------------------------\n' +
        'Get ready to break your fingers with stamina draining bracketfest throughout the song.```');
    } else {
        message.channel.sendMessage('```5th (五段) STAGE 4\n★12 cold planet -Blue Marble- (mid boss)\n--------------------------------------------------------\n' +
        'Scratchfest.\nPatterns are really confusing.\nI\'m sorry!```');
    }

  // 6th Dan
  } else if (dan == 6) {
      if (level == 1) {
        message.channel.sendMessage('```6th (六段) STAGE 1\n★16 Yakumo >>JOINT STRUGGLE -隙間-\n--------------------------------------------------------\n' +
        'Scratches, chordsmashing, chordstreaming.\nPretty high bpm and stamina draining.```');
    } else if (level == 2) {
        message.channel.sendMessage('```6th (六段) STAGE 2\n★16 furioso melodia [yumether]\n--------------------------------------------------------\n' +
        'Intro contains scratch walls.\nSome little stairs along the way.\nPatterns are slightly confusing.```');
    } else if (level == 3) {
        message.channel.sendMessage('```6th (六段) STAGE 3\n★14 Cross breed -EXTRA- (mid boss)\n--------------------------------------------------------\n' +
        'Another bracketfest + scratch wall song.\nReally difficult.```');
    } else {
        message.channel.sendMessage('```6th (六段) STAGE 4\n*14 ねぇ？メイドさんはみんな忠実だと思う？ [SABOTHER7] (BOSS)\n--------------------------------------------------------\n' +
        'High bpm ultra dense and stamina draining chordstreaming throughout the song.\n' +
        'Watch out for outro stream because most likely you will be very tired by then.```');
    }

  // 7th Dan
  } else if (dan == 7) {
      if (level == 1) {
        message.channel.sendMessage('```7th (七段) STAGE 1\n★17 Poppin\' Shower -sugarless- (mid boss)\n--------------------------------------------------------\n' +
        'Scatch walls throughout the song.\nVery difficult if you don\'t know how to dual scratch.```');
    } else if (level == 2) {
        message.channel.sendMessage('```7th (七段) STAGE 2\n★17 Ereshkigal (FOOLISH)\n--------------------------------------------------------\n' +
        'Piano streams + scratches. Bracketfest.\nOccasional jacks.```');
    } else if (level == 3) {
        message.channel.sendMessage('```7th (七段) STAGE 3\n★18 AutumnBreeze for Expert\n--------------------------------------------------------\n' +
        'Slow bpm. Occasional jack + bursts will eat up your health.```');
    } else {
        message.channel.sendMessage('```7th (七段) STAGE 4\n★19 VALLISTA [Rhodes7] (BOSS)\n--------------------------------------------------------\n' +
        'This song is easy up to 3/4 of the way.\n' +
        'There is a hugeass bracket jacks section that will fail most of the people who are aiming for 7th dan.```');
    }

  // 8th Dan
  } else if (dan == 8) {
      if (level == 1) {
        message.channel.sendMessage('```8th (八段) STAGE 1\n★19 subconsciousness -KILL-\n--------------------------------------------------------\n' +
        'Very tiring chordmashing + jacks song. BPM is low so that makes up for it.\n' +
        'Ending is 6/1 note chordstreams.```');
    } else if (level == 2) {
        message.channel.sendMessage('```8th (八段) STAGE 2\n★20 水晶世界 ～Fracture～ [yumether]\n--------------------------------------------------------\n' +
        'High bpm chordstreaming chart.\nEnding stream is little harder than the rest so' +
        ' make sure you have enough stamina for it.```');
    } else if (level == 3) {
        message.channel.sendMessage('```8th (八段) STAGE 3\n*18 真・千年女王 [yumether] (BOSS)\n--------------------------------------------------------\n' +
        'Bracketfest + jacks.\nVery confusing song to play after half of the song.```');
    } else {
        message.channel.sendMessage('```8th (八段) STAGE 4\n★18 冥界帰航 -ALITHER- (mid boss)\n--------------------------------------------------------\n' +
        'High bpm bracketfest streams.\nSlowdown in the middle is very hard to play.\n' +
        'Just whatever you do, don\'t die AFTER the slowdown.```');
    }

  // 9th Dan
  } else if (dan == 9) {
      if (level == 1) {
        message.channel.sendMessage('```9th (九段) Dan STAGE 1\n★20 Ophelia [INFELNO]\n--------------------------------------------------------\n' +
        'Super high density chordstreaming chart.\nIt\'s simple... but very stamina draining.\n```');
    } else if (level == 2) {
        message.channel.sendMessage('```9th (九段) Dan STAGE 2\n★20 ひつぎとふたご [7KEY/LUNATIC]\n--------------------------------------------------------\n' +
        'Fast stairs throughout the song.\nMiddle section is pretty hard to hit properly.```');
    } else if (level == 3) {
        message.channel.sendMessage('```9th (九段) Dan STAGE 3\n★20 banana man [HIMUTHER] (BOSS)\n--------------------------------------------------------\n' +
        'Scratch walls + dirty grace notes.\nGarbage chart. Very confusing to play.\n' +
        'Trying to get health back up from the scratch walls is really difficult.```');
    } else {
        message.channel.sendMessage('```9th (九段) Dan STAGE 4\n9 ★20 Messier 333 (EX7) (mid boss)\n--------------------------------------------------------\n' +
        'Bracketfest streaming chart.\nWatch out for the huge jacks + bursts section near the 3/4 of the song.\n' +
        'Pretty tiring. Scratches are very annoying as well.```');
    }

  // 10th Dan
  } else if (dan == 10) {
      if (level == 1) {
        message.channel.sendMessage('```10th (十段) Dan STAGE 1\n★21 GaRaKuTic Dream (garbage)\n--------------------------------------------------------\n' +
        'Bracketfest high bpm dense chordstreaming.\nWatch out for the ending bracket jack stream.```');
    } else if (level == 2) {
        message.channel.sendMessage('```10th (十段) Dan STAGE 2\n★22 Cynic (THE another) (BOSS)\n--------------------------------------------------------\n' +
        'Very confusing and awkward chart to play.\nLet\'s just say this song has ' +
        'really uncomfortable bracket jacks + broken stair delayfests right after.```');
    } else if (level == 3) {
        message.channel.sendMessage('```10th (十段) Dan STAGE 3\n★23 煉獄-Purgatorium- [ANOTHER]\n--------------------------------------------------------\n' +
        'Very easy.\nJust make sure you don\'t fail at the ending jacks (so you don\'t have to clear cynic again...)```');
    } else {
        message.channel.sendMessage('```10th (十段) Dan STAGE 4\n★21 Ascension to Heaven -maniaxi- (mid boss)\n--------------------------------------------------------\n' +
        'First half is tltra dense chordstreaming and last half is double stair(?) streaming.\n' +
        'Slightly confusing to play but not as bad as cynic.......```');
    }

  // kaiden
  } else if (dan == 11) {
      if (level == 1) {
        message.channel.sendMessage('```KAIDEN (皆伝) STAGE 1\n★24 PEACE BREAKER [BREAKER] (mid boss)\n--------------------------------------------------------\n' +
        'Delayfest bursts + brackets + scratch beats are very tiring and hard to hit.\n' +
        'Ending is full of super bursts and scratches.```');
    } else if (level == 2) {
        message.channel.sendMessage('```KAIDEN (皆伝) STAGE 2\n★23 %E3%83%96%E3%83%B3%E3%82%BF%E3%83%B3 ～Falling in "B" mix～ (EXPERT)\n--------------------------------------------------------\n' +
        'First half is pretty easy. HUGE slowdown + jacks in the middle.\nEnding is very high density chordstreaming.```');
    } else if (level == 3) {
        message.channel.sendMessage('```KAIDEN (皆伝) STAGE 3\n★23 サンバランド -LAST BOSS-\n--------------------------------------------------------\n' +
        'Ultimate chordmashing stamina chart. Scratches are VERY annoying.\n' +
        'Ending is really dense and there are some occasional brackets that will eat huge portion of your health.```');
    } else {
        message.channel.sendMessage('```KAIDEN (皆伝) STAGE 4\n★24 Love & Justice [GOD] (BOSS)\n--------------------------------------------------------\n' +
        'Very fast and very dense chart.\nTotal of 4000 notes.... in 2 minutes.\n' +
        '30 NPS chordstreaming (with occasional bursts and breaks) throughout the song.```');
    }

  // overjoy
  } else if (dan == 12) {
      if (level == 1) {
        message.channel.sendMessage('```OVERJOY STAGE 1\n★★4 Angelic layer 名人\n--------------------------------------------------------\n' +
        'Ultimate jackfest song.\nIntro scratch walls are very long and hard to play as well.\n' +
        'If you don\'t know how to dual scratch, you most likely won\'t be able to survive the intro no matter how fast you can jack.```');
    } else if (level == 2) {
        message.channel.sendMessage('```OVERJOY STAGE 2\n★★5 End Time [賢者タイム]\n--------------------------------------------------------\n' +
        'Ultra fast stairs.\nNo one hits these properly so you just gotta mash them correctly. (unless you\'re 0133)```');
    } else if (level == 3) {
        message.channel.sendMessage('```OVERJOY STAGE 3\n★★5 MANIERA (KOOKY) (BOSS)\n--------------------------------------------------------\n' +
        'Maniera Fuck```');
    } else {
        message.channel.sendMessage('```OVERJOY STAGE 4\n★25 ★★5 FREEDOM DiVE [FOUR DIMENSIONS] (mid boss)\n--------------------------------------------------------\n' +
        'Final boss of BMS.\n222 bpm chordstreaming throughout the song.\n' +
        'Very fast and tiring to play.```');
    }
  }
}

bot.login(token);

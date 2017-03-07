const MongoClient = require('mongodb').MongoClient,assert = require('assert');
const url = process.env.dburl;

module.exports = {
    update_user_points : function(type, user, inc, callback) {
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
    },

    get_user_points : function(type, user, callback) {
        MongoClient.connect(url, function(e, db) {
            var collection = db.collection(type);
            collection.findOne( { user: user }, function(e, doc) {
                db.close()
                callback(e, doc)
            });
        });
    },

    add_quote : function(msg, callback) {
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
    },

    get_quote : function(callback) {
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
    },

    count_quote : function(callback) {
        MongoClient.connect(url, function(e, db) {
            var collection = db.collection('quotes');
            collection.find().count(function (e, count) {
                db.close();
                callback(e, count);
            });
        });
    },

    dailies : function(user, callback) {
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
    },

    bet_credit : function(user, number, callback) {
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
    },

    print_credits_list : function(callback) {
        MongoClient.connect(url, function(e, db) {
            var collection = db.collection('credits');
            collection.find().sort({credit: -1}).toArray(function(e, docs) {
                var board = '```Credits Leaderboards\n---------------' +
                    '-----------------------\n';
                var length = docs.length >= 10 ? 10 : docs.length;
                for (i = 0; i < length; i++) {
                    board += ('{0}: {1} has {2} credits.\n'.format(i+1, docs[i].name, docs[i].credit));
                }
                board += "```";
                db.close();
                callback(e, board);
            });
        });
    },

    get_user_credit : function(user, callback) {
        MongoClient.connect(url, function(e, db) {
            var collection = db.collection('credits');
            collection.findOne( { user: user }, function(e, doc) {
                db.close();
                callback(e,doc);
            });
        });
    },

    // Typical node.js callback hell
    // TODO Think of better way
    buy_credits : function(type, user, number, callback)  {
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
                                    { $inc: { credit: Math.floor(number*100*Math.log(1.718+number)) } },
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
};


var express = require("express");
var bodyParser = require("body-parser");
var session = require("express-session");
var databox_directory = require("./utils/databox_directory.js");
var request = require('request');

var twitter = require('./twitter.js');
var sensors = ['twitterUserTimeLine','twitterHashTagStream', 'twitterDirectMessage', 'twitterRetweet', 'twitterFavorite'];

var DATABOX_STORE_BLOB_ENDPOINT = process.env.DATABOX_DRIVER_TWITTER_STREAM_DATABOX_STORE_BLOB_ENDPOINT;

var HASH_TAGS_TO_TRACK = ['#raspberrypi', '#mozfest', '#databox', '#iot', '#NobelPrize'];
var TWITER_USER = 'databox_mozfest';

var SENSOR_TYPE_IDs = [];
var SENSOR_IDs = {};
var VENDOR_ID = null;
var DRIVER_ID = null;
var DATASTORE_ID = null;


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.header('Content-Type', 'application/json');
    next();
};


var app = express();
app.use(session({resave: false, saveUninitialized: false,  secret: 'databox'}));
app.use(express.static('src/static'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(allowCrossDomain);

app.get("/status", function(req, res) {
    res.send("active");
});

app.get("/connect", twitter.connect);

app.get("/callback", twitter.auth);
app.get("/databox-driver-twitter-stream/callback", twitter.auth); //fake endpoint for debugging outside of databox

app.get("/is-signed-in", function(req, res) {
    res.end('' + twitter.isSignedIn());
});

var T = null;

databox_directory.register_driver('databox','databox-driver-twitter-stream', 'A Databox driver to stream data from twitter')
   .then((ids) => {
    console.log(ids);
    VENDOR_ID = ids['vendor_id'];
    DRIVER_ID = ids['driver_id'];
    
    console.log("VENDOR_ID", VENDOR_ID);
    console.log("DRIVER_ID", DRIVER_ID);

    return databox_directory.get_datastore_id('databox-driver-twitter-stream-databox-store-blob');
  })
  .then ((datastore_id) => {
    DATASTORE_ID = datastore_id;
    console.log("DATASTORE_ID", DATASTORE_ID);
    proms = [
      databox_directory.register_sensor_type('twitterUserTimeLine'),
      databox_directory.register_sensor_type('twitterHashTagStream'),
      databox_directory.register_sensor_type('twitterDirectMessage'),
      databox_directory.register_sensor_type('twitterRetweet'),
      databox_directory.register_sensor_type('twitterFavorite'),
    ]
    return Promise.all(proms);
  })
  .then ((sensorTypeIds) => {
    console.log('sensorTypeIds::', sensorTypeIds);
    SENSOR_TYPE_IDs = sensorTypeIds;
    proms = [
      databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[0].id, DATASTORE_ID, VENDOR_ID, 'twitterUserTimeLine', '', '', 'Twitter user timeline data', 'The Internet'),
      databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[1].id, DATASTORE_ID, VENDOR_ID, 'twitterHashTagStream', '', '', 'Twitter hashtag data', 'The Internet'),
      databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[2].id, DATASTORE_ID, VENDOR_ID, 'twitterDirectMessage', '', '', 'Twitter users direct messages', 'The Internet'),
      databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[3].id, DATASTORE_ID, VENDOR_ID, 'twitterRetweet', '', '', 'Twitter users retweets', 'The Internet'),
      databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[4].id, DATASTORE_ID, VENDOR_ID, 'twitterFavorite', '', '', 'Twitter users favorite tweets', 'The Internet'),
    ]
    return Promise.all(proms);
  })
  .then((sensorIds) => {
    console.log("sensorIds::", sensorIds); 
    for(var i = 0; i < SENSOR_TYPE_IDs.length; i++) {
      SENSOR_IDs[sensors[i]] = sensorIds[i].id;
    }

    console.log("SENSOR_IDs", SENSOR_IDs);

    app.listen(8080);

    var waitForTwitterAuth = function () {
      return new Promise((resolve, reject)=>{
        
        var waitForIt = function() {
          if(twitter.isSignedIn() == true) {
            resolve();
          } else {
            console.log("Waiting to twitter auth .....")
            setTimeout(waitForIt,2000);
          }

        }
        waitForIt();
      })
    }
    return waitForTwitterAuth();
  })
  .then(()=>{

    T = twitter.Twit();

    var HashtagStream = T.stream('statuses/filter', { track: HASH_TAGS_TO_TRACK , language:'en'});
    HashtagStream.on('tweet', function (tweet) {
      save('twitterHashTagStream', tweet);
    })

    var UserStream = T.stream('user', { stringify_friend_ids: true, with: 'followings', replies:'all' })
    
    UserStream.on('tweet', function (event) {
      save('twitterUserTimeLine',event)
    })

    UserStream.on('favorite', function (event) {
      save('twitterFavorite',event)
    })

    UserStream.on('quoted_tweet', function (event) {
      save('twitterRetweet',event)
    })

    UserStream.on('retweeted_retweet', function (event) {
      save('twitterRetweet',event)
    })

    UserStream.on('direct_message', function (event) {
      save('twitterDirectMessage',event);
    })
    
  })
  .catch((err) => {
    console.log(err)
  });


module.exports = app;


function save(type,data) {
      console.log("Saving data::", type, data.text);
      if(VENDOR_ID != null) {
        var options = {
            uri: DATABOX_STORE_BLOB_ENDPOINT + '/data',
            method: 'POST',
            json: 
            {
              'sensor_id': SENSOR_IDs[type], 
              'vendor_id': VENDOR_ID, 
              'data': data   
            }
        };
        request.post(options, (error, response, body) => { if(error) console.log(error, body);});
      }
    }
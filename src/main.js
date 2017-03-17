/*jshint esversion: 6 */
var https = require('https');
var express = require("express");
var bodyParser = require("body-parser");
var session = require("express-session");

const databox = require('node-databox');

var twitter = require('./twitter.js');

var DATABOX_STORE_BLOB_ENDPOINT = process.env.DATABOX_DRIVER_TWITTER_STREAM_DATABOX_STORE_BLOB_ENDPOINT;

var HTTPS_SERVER_CERT = process.env.HTTPS_SERVER_CERT || '';
var HTTPS_SERVER_PRIVATE_KEY = process.env.HTTPS_SERVER_PRIVATE_KEY || '';
var credentials = {
	key:  HTTPS_SERVER_PRIVATE_KEY,
	cert: HTTPS_SERVER_CERT,
};


var PORT = process.env.port || '8080';

var HASH_TAGS_TO_TRACK = ['#raspberrypi', '#mozfest', '#databox', '#iot', '#NobelPrize'];
var TWITER_USER = 'databox_mozfest';


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

var T = null;

var vendor = "databox";

  //databox.waitForStoreStatus(DATABOX_STORE_BLOB_ENDPOINT,'active',10)
  new Promise((resolve,reject)=>{
    setTimeout(resolve,1000);
  })
  .then(() => {
    
    proms = [
      databox.catalog.registerDatasource(DATABOX_STORE_BLOB_ENDPOINT, {
        description: 'Twitter user timeline data',
        contentType: 'text/json',
        vendor: 'Databox Inc.',
        type: 'twitterUserTimeLine',
        datasourceid: 'twitterUserTimeLine',
        storeType: 'databox-store-blob'
      }),

      databox.catalog.registerDatasource(DATABOX_STORE_BLOB_ENDPOINT, {
        description: 'Twitter hashtag data',
        contentType: 'text/json',
        vendor: 'Databox Inc.',
        type: 'twitterHashTagStream',
        datasourceid: 'twitterHashTagStream',
        storeType: 'databox-store-blob'
      }),

      databox.catalog.registerDatasource(DATABOX_STORE_BLOB_ENDPOINT, {
        description: 'Twitter users direct messages',
        contentType: 'text/json',
        vendor: 'Databox Inc.',
        type: 'twitterDirectMessage',
        datasourceid: 'twitterDirectMessage',
        storeType: 'databox-store-blob'
      }),

      databox.catalog.registerDatasource(DATABOX_STORE_BLOB_ENDPOINT, {
        description: 'Twitter users retweets',
        contentType: 'text/json',
        vendor: 'Databox Inc.',
        type: 'twitterRetweet',
        datasourceid: 'twitterRetweet',
        storeType: 'databox-store-blob'
      }),

      databox.catalog.registerDatasource(DATABOX_STORE_BLOB_ENDPOINT, {
        description: 'Twitter users favorite tweets',
        contentType: 'text/json',
        vendor: 'Databox Inc.',
        type: 'twitterFavorite',
        datasourceid: 'twitterFavorite',
        storeType: 'databox-store-blob'
      }),

      databox.catalog.registerDatasource(DATABOX_STORE_BLOB_ENDPOINT, {
        description: 'Test Actuator',
        contentType: 'text/json',
        vendor: 'Databox Inc.',
        type: 'testActuator',
        datasourceid: 'testActuator',
        storeType: 'databox-store-blob',
        isActuator:true
      })
    ];
    
    return Promise.all(proms);
  })
  .then(()=>{
    console.log("[Creating server] and twitter Auth");
    https.createServer(credentials, app).listen(PORT);
    return twitter.waitForTwitterAuth();
  })
  .then(()=>{

    //deal with the actuator
    var actuationEmitter = null; 
    databox.subscriptions.connect(DATABOX_STORE_BLOB_ENDPOINT)
    .catch((err)=>{
      console.log("[Actuation connect error]",err);
    })
    .then((eventEmitter)=>{
      actuationEmitter = eventEmitter;
      return databox.subscriptions.subscribe(DATABOX_STORE_BLOB_ENDPOINT,'testActuator','ts');
    })
    .catch((err)=>{
      console.log("[Actuation subscribe error]",err);
    })
    .then(()=>{
      actuationEmitter.on('data',(endpointHost, actuatorId, data)=>{
        console.log("[Actuation] data received",endpointHost, actuatorId, data);
      });
    })
    .catch((err)=>{
      console.log("[Actuation error]",err);
    });


    //deal with twitter events 
    T = twitter.Twit();

    console.log('Start event handlers:', T);
    var stream = T.stream('statuses/filter', { track: '#apple', language: 'en' })
 
     stream.on('tweet', function (tweet) {
        console.log(tweet)  
      });


    var HashtagStream = T.stream('statuses/filter', { track: HASH_TAGS_TO_TRACK , language:'en'});

    HashtagStream.on('tweet', function (tweet) {
      save('twitterHashTagStream', tweet);
    });

    var UserStream = T.stream('user', { stringify_friend_ids: true, with: 'followings', replies:'all' });
    UserStream.on('tweet', function (event) {
      save('twitterUserTimeLine',event);
    });

    UserStream.on('favorite', function (event) {
      save('twitterFavorite',event);
    });

    UserStream.on('quoted_tweet', function (event) {
      save('twitterRetweet',event);
    });

    UserStream.on('retweeted_retweet', function (event) {
      save('twitterRetweet',event);
    });

    UserStream.on('direct_message', function (event) {
      save('twitterDirectMessage',event);
    });
    
  })
  .catch((err) => {
    console.log("[ERROR]",err);
  });

module.exports = app;

function save(datasourceid,data) {
      console.log("Saving data::", datasourceid, data.text);
      
      databox.timeseries.write(DATABOX_STORE_BLOB_ENDPOINT, datasourceid, data)
      .catch((error)=>{
        console.log("[Error writing to store]", error);
      });
    }
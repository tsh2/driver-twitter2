var Flutter = require('flutter');
var Twit = require('twit')
var twitConfigPath = './src/twitter-secret.json';
var twitConfig = require('./twitter-secret.json');
var fs = require('fs');
var ip = '127.0.0.1';

var T = null;

var accessToken = null;
var secret = null;
var isSignedIn = false;

//try to connect with stored creds
T = new Twit({
      consumer_key:         twitConfig.consumer_key,
      consumer_secret:      twitConfig.consumer_secret,
      access_token:         twitConfig.access_token,
      access_token_secret:  twitConfig.access_token_secret,
      timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests. 
    })

new Promise((resolve, reject) => {
  T.get('account/verify_credentials', { }, function (err, data, response) {
    console.log(err, data);
    if(err) {
      reject(err)
      return;
    }
    resolve(data);
  });
})
.then((result) => {
  isSignedIn = true;
  console.log('Creds OK', result.data);
})
.catch((err) => {
  console.log('twitter-secret.json has wrong creds', err);
  isSignedIn = false;
});


flutter = new Flutter({
  consumerKey:    twitConfig.consumer_key,
  consumerSecret: twitConfig.consumer_secret,
  loginCallback: "http://" + ip + ":8080/databox-driver-twitter-stream/callback",
  cache: false,
  authCallback: function (req, res, next) { 
    //Authentication failed, req.error contains details
    
    if(req.error) {
      console.log(req.error);
      return;
    }

    console.log('req.session',req.session);
    console.log('req.query',req.query);

    accessToken = req.session.oauthAccessToken
    secret = req.session.oauthAccessTokenSecret

    twitConfig = {
      consumer_key:         twitConfig.consumer_key,
      consumer_secret:      twitConfig.consumer_secret,
      access_token:         accessToken,
      access_token_secret:  secret,
      timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests. 
    }
    T = new Twit(twitConfig);

    isSignedIn = true;

    //Store to file here
    fs.writeFile(twitConfigPath,JSON.stringify(twitConfig));

    res.redirect('close');
  }});


exports.Twit = function () {return T};
exports.connect = flutter.connect;
exports.auth = flutter.auth;
exports.isSignedIn = function () { return isSignedIn};

//export fetch = (url, data, callback) -> flutter.API.fetch url, data, access-token, secret, callback

//export is-signed-in = -> access-token? and secret?
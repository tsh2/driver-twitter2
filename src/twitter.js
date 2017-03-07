var Twit = require('twit')
var twitConfigPath = './src/twitter-secret.json';
var twitConfig = require('./twitter-secret.json');

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
    //console.log(err, data);
    if(err) {
      reject(err)
      return;
    }
    resolve(data);
  });
})
.then((result) => {
  isSignedIn = true;
  console.log('Creds OK');
})
.catch((err) => {
  console.log('twitter-secret.json has wrong creds', err);
  isSignedIn = false;
});

exports.Twit = function () {return T};
exports.isSignedIn = function () { return isSignedIn};

exports.waitForTwitterAuth = function () {
  return new Promise((resolve, reject)=>{
    
    var waitForIt = function() {
      if(isSignedIn === true) {
        resolve();
      } else {
        console.log("Waiting to twitter auth .....");
        setTimeout(waitForIt,2000);
      }

    };
    waitForIt();
  });
};




module.exports = function (options,callback) {

  const request = require('request');
  const https = require('https');
  const url = require('url');

  const ARBITER_TOKEN   = process.env.ARBITER_TOKEN;
  const DATABOX_ARBITER_ENDPOINT = process.env.DATABOX_ARBITER_ENDPOINT || "https://databox-arbiter:8080";

  //
  // Trust the CM https cert if one is provided
  //
  const CM_HTTPS_CA_ROOT_CERT = process.env.CM_HTTPS_CA_ROOT_CERT || '';
  var agentOptions = {};
  if(CM_HTTPS_CA_ROOT_CERT === '') {
    console.log("WARNING[databox-request]:: no https root cert provided not checking https certs.");
    agentOptions.rejectUnauthorized = false;
  } else {
     agentOptions.ca = CM_HTTPS_CA_ROOT_CERT;
  }
  var httpsAgent = new https.Agent(agentOptions);
  
  options.agent = httpsAgent;

  //
  // Workout the host and path of the request
  //
  var urlObject = url.parse(options.uri);
  var path = urlObject.pathname;
  var host = urlObject.hostname;
  
  //request to arbiter do not need a macaroon but do need the ARBITER_TOKEN
  var isRequestToArbiter = DATABOX_ARBITER_ENDPOINT.indexOf(host) !== -1;

  //
  // request and cache macaroon if needed
  //
  if(isRequestToArbiter) {
      options.headers = {'X-Api-Key': ARBITER_TOKEN};
      
      //do the request and call back when done
      request(options,callback);

  } else {
      //we are talking to another databox component so we need a macaroon!
      //for now just request one every time but these should be cached until they expire. 
      var opts = {
          uri: DATABOX_ARBITER_ENDPOINT+'/token',
          method: 'POST',
          form: {
                    target: host,
                    path: path
                },
          headers: {'X-Api-Key': ARBITER_TOKEN},
          agent: httpsAgent
      };
      request(opts, function (error, response, body) {
          if(error !== null) {
              callback(error,response,null);
              return;
          } else if (response.statusCode != 200) {
              //API responded with an error
              callback(body,response,null);
              return;
          }
          
          //do the request and call back when done
          request(options,callback);
      });
  }

};
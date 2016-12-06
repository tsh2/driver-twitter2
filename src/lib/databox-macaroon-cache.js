
const request = require('request');
const httpsAgent = require('./databox-https-agent.js');


const DATABOX_ARBITER_ENDPOINT = process.env.DATABOX_ARBITER_ENDPOINT || "https://databox-arbiter:8080";
const ARBITER_TOKEN   = process.env.ARBITER_TOKEN;

var macaroonCache = {};

/**
 * Gets a macaroon form the cache if one exists else it requests one from the arbiter. 
 *
 * @param {host} The host name of the end point to request the macaroon
 * @return {Promise} A promise that resolves with a shared secret gotten from the arbiter
 * 
 */
function getMacaroon(host) {
    return new Promise((resolve, reject) => {

        if(macaroonCache[host]) {
            console.log("returning cashed mac",macaroonCache);
            //TODO check if the macaroon has expired? for now if a request fails we invalidate the macaroon
            resolve(macaroonCache[host]);
            return;
        }

        //
        // Macroon has not been requested. Get a new one.
        //
        var opts = {
                uri: DATABOX_ARBITER_ENDPOINT+'/token',
                method: 'POST',
                form: {
                            target: host,
                        },
                headers: {'X-Api-Key': ARBITER_TOKEN},
                agent: httpsAgent
            };
        request(opts,function (error, response, body) {
            if(error !== null) {
                reject(error);
                return;
            } else if (response.statusCode != 200) {
                //API responded with an error
                reject(body);
                return;
            }
            macaroonCache[host] = body;
            resolve(macaroonCache[host]);
        });
    });
}

/**
 * Gets a macaroon form the cache if one exists else it requests one from the arbiter. 
 * @param {host} The host name of the end point to request the macaroon
 * @return void
 */
function invalidateMacaroon(host) {
    macaroonCache[host] = null;
}

module.exports = {
    'getMacaroon':getMacaroon,
    'invalidateMacaroon':invalidateMacaroon
};
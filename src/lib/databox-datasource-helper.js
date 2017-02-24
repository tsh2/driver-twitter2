
var databoxRequest = require('./databox-request-promise.js');
//var request = require('request');
const WebSocketClient = require('ws');
const httpsAgent = require('./databox-https-agent.js');
const macaroonCache = require('./databox-macaroon-cache.js');
const url = require('url');

/**
 *  Build a valid hypercat item for a databox Datasource and register it with a datastore
 * 
 * @param {string} storeEndPoint The datastore uri
 * @param {string} driverName The name of the driver registering the datasource 
 * @param {string} datasourceName The name of the datasource (must be unique within a driver datastore pair)
 * @param {string} type The urn:X-databox:rels:sensortype
 * @param {string} unit The measurements unit if applicable 
 * @param {string} description Human readable description
 * @param {string} location A location for the device as a human readable string 
 * @returns {Promise} an Hypercat item 
 */
module.exports.registerDatasource = function (storeEndPoint, storeType, driverName, datasourceName, 
                                                          type, unit, description, location) {
  
  return register(
                    storeEndPoint, 
                    buildHypercatItem(  storeEndPoint, 
                                        storeType, 
                                        driverName, 
                                        datasourceName, 
                                        type, 
                                        unit, 
                                        description, 
                                        location
                                      )
                 );
};

/**
 *  Build a valid hypercat item for a databox actuator and register it with a datastore
 * 
 * @param {string} storeEndPoint The datastore uri
 * @param {string} driverName The name of the driver registering the datasource 
 * @param {string} datasourceName The name of the datasource (must be unique within a driver datastore pair)
 * @param {string} type The urn:X-databox:rels:sensortype
 * @param {string} unit The measurements unit if applicable 
 * @param {string} description Human readable description
 * @param {string} location A location for the device as a human readable string 
 * @returns {Promise} an Hypercat item 
 */
module.exports.registerActuator = function (storeEndPoint, storeType, driverName, datasourceName, 
                                                          type, unit, description, location, callback) {
  var item = buildHypercatItem(   storeEndPoint, 
                                  storeType, 
                                  driverName, 
                                  datasourceName, 
                                  type, 
                                  unit, 
                                  description, 
                                  location
                               );
    
  item["item-metadata"].push({
    "rel": "urn:X-databox:rels:isActuator",
    "val": true
  });

  return register(storeEndPoint,item);
};


/**
 *  Build a valid hypercat item for databox
 * 
 * @param {string} storeEndPoint The datastore uri
 * @param {string} driverName The name of the driver registering the datasource 
 * @param {string} datasourceName The name of the datasource (must be unique within a driver datastore pair)
 * @param {string} type The urn:X-databox:rels:sensortype
 * @param {string} unit The measurements unit if applicable 
 * @param {string} description Human readable description
 * @param {string} location A location for the device as a human readable string 
 * @returns {object} an Hypercat item 
 */
var buildHypercatItem = function ( storeEndPoint, storeType, driverName, datasourceName, 
                                    type, unit, description, location) {
  item = {
    "item-metadata": [
      {
        // NOTE: Required
        "rel": "urn:X-hypercat:rels:hasDescription:en",
        "val": description
      }, {
        // NOTE: Required
        "rel": "urn:X-hypercat:rels:isContentType",
        "val": "text/json"
      },
      {
        // NOTE: Required
        "rel": "urn:X-databox:rels:hasVendor",
        "val": driverName
      },
      {
        // NOTE: Required
        "rel": "urn:X-databox:rels:hasType",
        "val": type
      },
      {
        // NOTE: Required
        "rel": "urn:X-databox:rels:hasLocation",
        "val": location
      },
      {
				"rel": "urn:X-databox:rels:hasDatasourceid",
				"val": datasourceName
			},
      {
        // NOTE: Required
        "rel": "urn:X-databox:rels:hasStoreType",
        "val": storeType
      }
    ],
    "href": storeEndPoint + '/' + datasourceName
  };

  //
  // optional 
  //
  if (description !== null || description !== '') {
    item["item-metadata"].push({
      "rel": "urn:X-databox:rels:hasDescription",
      "val": description
    });
  }
  if (unit !== null || unit !== '') {
    item["item-metadata"].push({
      "rel": "urn:X-databox:rels:hasUnit",
      "val": unit
    });
  }

  return item;
};

/**
 *  Function to register a datasource or actuator with a datastore
 *  @param {Object} an hypercat Item to register
 *  @returns {Promise}
 */
var register = function (storeEndPoint, hypercatItems) {

  var options = {
    uri: storeEndPoint + '/cat',
    method: 'POST',
    json: hypercatItems
  };

  return new Promise((resolve, reject) => {

    var register_datasource_callback = function (error, response, body) {
      if (error) {
        console.log("[ERROR] Can not register with datastore! waiting 5s before retrying", error);
        setTimeout(databoxRequest, 5000, options, register_datasource_callback);
        return;
      } else if (response && response.statusCode != 200) {
        console.log("[ERROR] Can not register with datastore! waiting 5s before retrying", response.statusCode, body);
        setTimeout(databoxRequest, 5000, options, register_datasource_callback);
        return;
      }
      resolve(body);
    };
    console.log("Trying to register with datastore.", options);
    databoxRequest(options, register_datasource_callback);
  });
};

/**
 * Waits for a datastore to become active by checking its /status endpoint
 * 
 * @param {string} storeEndPoint uri of the datastore to connect to
 * @returns Promise
 */
module.exports.waitForDatastore = function (storeEndPoint) {
  return new Promise((resolve, reject) => {
    var untilActive = function (error, response, body) {
      if (error) {
        console.log(error);
      } else if (response && response.statusCode != 200) {
        console.log("Error::", body);
      }
      if (body === 'active') {
        resolve();
      }
      else {
        var options = {
          uri: storeEndPoint + "/status",
          method: 'GET',
          agent: httpsAgent
        };
        setTimeout(() => {
          databoxRequest(options, untilActive);
        }, 1000);
        console.log("Waiting for datastore ....", error, body, options);
      }
    };
    untilActive({});
  });
};


/*
* Web sockets to handle actuator monitoring 
*/
var ws = null;
var wsCallbacks = {};

/**
 * Open a WebSocket to the datastore if one dose not exist.
 * 
 * @param {string} storeEndPoint uri of the datastore to connect to
 * @returns Promise
 * 
 * TODO: This will not handle multiple datastores! 
 */
function openWS(storeEndPoint) {
  return new Promise((resolve, reject) => {

    if (ws === null) {

      var wsEndPoint = storeEndPoint + '/ws';

      var urlObject = url.parse(wsEndPoint);
      var path = urlObject.pathname;
      var host = urlObject.hostname;

      console.log("[WS] trying to open WS at" + wsEndPoint);
      macaroonCache.getMacaroon(host)
        .then((macaroon) => {
          ws = new WebSocketClient(wsEndPoint, { 'agent': httpsAgent, headers: { 'X-Api-Key': macaroon } });
          ws.on('open', function open() {
            console.log("[WS] for actuator callbacks opened");
            resolve();
          });

          ws.on('message', function (data, flags) {
            console.log("[WS] data received", data, flags);
          });

          ws.on('error', function (data, flags) {
            console.log("[WS] ERROR", data, flags);
          });

        })
        .catch((error) => {
          console.log("[WS] ERROR");
          reject(error);
        });
    } else {
      resolve();
    }
  });
}
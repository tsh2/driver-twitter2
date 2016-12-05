
var databoxRequest = require('./databox-request.js');

module.exports.registerDatasource = function (STORE_ENDPOINT, driverName, datasourceName, type, unit, description, location) {
  var options = {
        uri: STORE_ENDPOINT+'/cat/add/'+datasourceName,
        method: 'POST',
        json: 
        {
          "vendor": driverName,
          "sensor_type": type,
          "unit": unit,
          "description": description,
          "location": location,
        },
    };

  return new Promise((resolve, reject) => {
    
    var register_datasource_callback = function (error, response, body) {
        if (error) {
          console.log("[ERROR] Can not register sensor with datastore! waiting 5s before retrying", error);
          setTimeout(databoxRequest, 5000, options, register_datasource_callback);
          return;
        } else if(response.statusCode != 200) {
          console.log("[ERROR] Can not register sensor with datastore! waiting 5s before retrying", body, error);
          setTimeout(databoxRequest, 5000, options, register_datasource_callback);
          return;
        }
        resolve(body);
    };
    console.log("Trying to register sensor with datastore.", options);
    databoxRequest(options,register_datasource_callback);
  
  });
};

module.exports.waitForDatastore = function (STORE_ENDPOINT) {
  return new Promise((resolve, reject)=>{
    var untilActive = function (error, response, body) {
      if(error) {
        console.log(error);
      } else if(response && response.statusCode != 200) {
        console.log("TOSH 3");
        console.log("Error::", body);
      }
      if (body === 'active') {
        resolve();
      }
      else {
        setTimeout(() => {
          var options = {
              uri: STORE_ENDPOINT + "/status",
              method: 'GET',
          };
          databoxRequest(options, untilActive);
        }, 1000);
        console.log("Waiting for datastore ....");
      }
    };
    untilActive({});
  });
};
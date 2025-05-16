'use strict';


//
const util = require('util');

// Requires a query string within the request
const querystring = require('querystring');

// The name of this header has to match the one configured over the origin function
const HEADERNAME = '{{HEADERNAME}}';


exports.handler = (event, context, callback) => {
  console.log(util.inspect(event, { depth: 10 }));
 
  // Retrieving Viewer request from cloudfront.
  let request = event.Records[0].cf.request;

  function clientId (params) {

    // Extracting the query string from the cloudfront viewer request.
    // Each possibile written "client_id" has been added as a whitelisted query over the Cloudfront distribution. 
    
    let clientID = null;
    
    clientID = params['clientID'] || 
               params['client_id'] || 
               params['clientId'] || 
               params['client_ID'] || 
               params['clientid'] || 
               params['client_Id'];

    return clientID;
   
  }
  
  // Saving the client_id as a variable 
  let clientID = clientId (querystring.parse(request.querystring));
  
  // Adding the client_id as a header to the origin request in order to be analyzed by the origin lambda function
  request.headers[HEADERNAME.toLowerCase()] = [{ key: HEADERNAME, value: clientID }];
  
  // console.log (clientID);

  callback(null, request);
  
};
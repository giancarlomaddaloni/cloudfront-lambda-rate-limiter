'use strict'

// The region of the lambda functions and dynamoDB table.
const TABLE_REGION = '{{TABLES_REGION}}';

// The name of the dynamo DB table storing the tokens available for each client_id request.
// Table created within the cdk 'dynamoDB-Stack'
// tableName: `${projectName}-Origin-${environment}`,
const TABLE_NAME = '{{ORIGIN_TABLE_NAME}}';

// The name of the dynamo DB table storing the registries for email notifications.
// Table created within the cdk 'dynamoDB-Stack'
// tableName: `${projectName}-Notifications-${environment}`,
const TABLE_NAME_NOTIFICATIONS = '{{NOTIFICATIONS_TABLE_NAME}}';


// Maximum amount of same client_id requests per period.
const MAX_REQUESTS_PER_PERIOD = Number({{MAX_REQUESTS_PER_PERIOD}});

// How often the tokens per client_id request will be refilled. (Seconds to Miliseconds)
const REFILL_PERIOD_IN_MILISECONDS = Number({{REFILL_PERIOD_IN_SECONDS}}) * 1000;


const REFILL_PERIOD_IN_SECONDS = Number({{REFILL_PERIOD_IN_SECONDS}});

// Amount of tokens added to the bucket for a client_id every new period.
const REFILL_AMOUNT_PER_PERIOD = Number({{REFILL_AMOUNT_PER_PERIOD}});

// The name of this header have to match the one configured over the origin function
const HEADERNAME = '{{HEADERNAME}}';

const AWS = require('aws-sdk');
const https = require('https');
AWS.config.update({ region: TABLE_REGION });

// Opening a socket for the dynamoDB table.
const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-10-08',
  httpOptions: {
    agent: new https.Agent({
      keepAlive: true,
    }),
  },});

// Adding attributes to the function response in case the client_id request reach the maximum amount of request permited.   
function OverLimitError() {}
OverLimitError.prototype = Object.create(Error.prototype);
OverLimitError.constructor = OverLimitError;

// HTTPS Response when the client_id request surpass the limit allowed per requests. 
const rateLimitResponse = {
  status: '429',
  statusDescription: 'Too Many Requests from the same ClientID',
  body: '<html><head><title>KanuTech 429 HTTP Error Code</title></head><body><h1>Too many requests from the same client_id</h1><p>Retry in 60 seconds</p></body></html>'
};


const scanTable = async () => {
  const params = {
      TableName: TABLE_NAME,
  };
  const scanResults = [];
  let items;

  do{
      items =  await ddb.scan(params).promise();
      items.Items.forEach((item) => scanResults.push(item));
      params.ExclusiveStartKey  = items.LastEvaluatedKey;
  }while(typeof items.LastEvaluatedKey !== "undefined");
  
  return scanResults;

};

function analyzeDB (scanResults) {
  let lastUpdate= null;
  let timeSince = null;
  let allowed = false;
  let counter = 0;

  for(let i = 0; i < scanResults.length;i++){
      
      lastUpdate = scanResults[i]['lastUpdate'];
      timeSince =  Math.floor((Date.now() - lastUpdate) / 1000);
      
      if ( timeSince < REFILL_PERIOD_IN_SECONDS ){
        counter = counter + 1;
      }

  }

  if ( counter < MAX_REQUESTS_PER_PERIOD) {
    allowed = true;
  }

  console.log ("counter --> "+counter);

  return allowed; 

}



// Extracting the client_id from the header added at the viewer request function. 
function clientID (request) {
  let clientIDheader = null;
  let headers = request.headers;

  if (headers[HEADERNAME] && headers[HEADERNAME].length > 0) {
    clientIDheader = headers[HEADERNAME][0].value;
  }
  
  return clientIDheader;
}

// Counter of time left before the new period
function _refillCount (bucket) {
  
  // date.now -->  19:56:55 1671566220 -- 5 seconds before --> 1671566215 19:56:50 lastUpdate
  // Date.now() - bucket.lastUpdate = 5 sec
  let timeSince = Date.now() - bucket.lastUpdate;
  let timeStamp = new Date(Date.now());

  console.log ("Table last update --> "+bucket.lastUpdate);
  console.log ("Time since--> "+bucket.lastUpdate);
  console.log (`Bucket last update -->  Date.now () - bucket.lastUpdate --> ${Date.now()} - ${bucket.lastUpdate}`);
  console.log (`Bucket last update -->  Date.now () - bucket.lastUpdate --> ${timeStamp} - ${new Date(bucket.lastUpdate)}`);

  console.log (`Time since last request: ${timeSince} / 60000 seconds. --> Conversion -->  ${Math.floor(timeSince / 1000)} seconds`);
  // Date.now() - bucket.lastUpdate = 5 sec /  REFILL_PERIOD_IN_MILISECONDS * 1000;
  // timeSince / REFILL_PERIOD_IN_MILISECONDS x 1000 --> 5/(60*1000) = 
  return Math.floor(timeSince / REFILL_PERIOD_IN_MILISECONDS);
}

// Addding a new request(client_id) into the dynamoDB table.
function _updateBucket (bucket) {
  console.log (JSON.stringify(bucket));
  let params = {
    TableName: TABLE_NAME,
    Item: {
      clientID: bucket.clientID,
      value: bucket.value,
      lastUpdate: bucket.lastUpdate,
      expiresAt: Math.floor(bucket.lastUpdate / 1000) + (60 * 60 * 24)
    }
  };
  
 
  console.log("updating dynamo db params--> "+JSON.stringify(params));

  return ddb.put(params).promise();
}

// Addding a record into a dynamoDB table in order to retrieve the information and send an scheduled email
function _updatenotificationsBucket (key,deniedAT) {

  // Create a new "unique ID" for each item(s) denied. This can include the same client-id but with different uID, meaning that during the time-range configure, meaning the denial got triggered more than once. 
  let uID = AWS.util.uuid.v4();

  
  let params = {
    TableName: TABLE_NAME_NOTIFICATIONS,
    Item: {
      uID : uID,
      clientID: key,
      deniedAT: deniedAT,
    }
  };
  
  console.log("updating bucket db put params for notifying denials--> "+JSON.stringify(params));

  return ddb.put(params).promise();
}

function reduce (bucket, tokens) {

    
    // Counter of last client_id request

    // lastUpdate --> from last request
    let refillCount = _refillCount(bucket);
    console.log ("refillCount from function at reduce " + refillCount);

    // date.now - lastUpdate --> calculated with the lastUpdate value from last request
    bucket.value += refillCount * REFILL_AMOUNT_PER_PERIOD;
    console.log ("bucket.valuee --> "+bucket.value+" += " +  refillCount + " x " + REFILL_AMOUNT_PER_PERIOD);

    // lastUpdate --> renewed for next request
    bucket.lastUpdate += refillCount * REFILL_PERIOD_IN_MILISECONDS;
    console.log ("bucket.lastUpdate --> "+ bucket.lastUpdate +" += " +  refillCount + " x " + REFILL_PERIOD_IN_MILISECONDS);

    // Setting footprints for clientID denials.
    let currentTime = Date.now();
    
    // If the same client_id have passed over the period configured.
    if (bucket.value >= MAX_REQUESTS_PER_PERIOD) {
      console.log("Step2");
      console.log (bucket.value + " >= " +MAX_REQUESTS_PER_PERIOD);
      bucket.value = MAX_REQUESTS_PER_PERIOD;
      bucket.lastUpdate = Date.now();
      console.log(`Resetting to ${MAX_REQUESTS_PER_PERIOD} tokens in the bucket`);
    } else {
      console.log(`Adding ${refillCount * REFILL_AMOUNT_PER_PERIOD} tokens to the bucket`);
    }
    
    // If the same client_id have consumed the entire tokens available.
    if (tokens > bucket.value) {
      console.log("Step3");
      console.log (tokens + " >= " +bucket.value);
      console.log('Not enough tokens remaining in bucket for this client_id request!!');
      return _updateBucket(bucket).then(() => {
        throw new OverLimitError();
      });
    }
    
    // If none of the prior conditions, deducting tokens for the client_id
    console.log(`Deducting ${tokens} tokens from the bucket - ${bucket.value-1} tokens remaining`);
    console.log ("Bucket value before reducing --> "+ bucket.value);

    if (bucket.value === 1 ) {
      _updatenotificationsBucket(bucket.clientID,currentTime);
    }

    bucket.value -= tokens;

    console.log ("Bucket value after reducing --> "+ bucket.value);
    return _updateBucket(bucket);

}

function loadBucket (key) {
  let params = {
    TableName: TABLE_NAME,
    Key: { clientID: key }
  };

  // Creating a socket in order to retrieve the bucket(dynamoDB) client_id tokens available.
  return ddb.get(params).promise()
    .then((data) => {
      if (data.Item) {
        return data.Item;
      }

      return {
        clientID: key,
        value: MAX_REQUESTS_PER_PERIOD,
        lastUpdate: Date.now()
      };
    });
}

exports.handler = (event, context, callback) => {

  // Setting the cloudfront origin request as a variable
  let request = event.Records[0].cf.request;

  // Extracting the client_id from the header added at the viewer request function. 
  let key = clientID(request);



  // If no client_id query string parameter found within the viewer request and added as a header, the origin function will be bypassed.
  if (!key) {
    callback(null, request);
  }

  let allowed = false;

  scanTable()
  .then((scanResults) => { 
    allowed = analyzeDB(scanResults);
    if ( allowed == false){
      console.log ("allowed by time--> "+allowed);
      callback(null, rateLimitResponse);
    } else {
      console.log ("allowed by time--> "+allowed);
    }
  });
  
  loadBucket(key)
    .then((bucket) => {
      console.log ("load bucket --> " + JSON.stringify(bucket));
      return reduce(bucket, 1);
    })
    .then(() => callback(null, request))
    .catch((error) => {
      if (error instanceof OverLimitError) {
        callback(null, rateLimitResponse);
      }
      else {
        callback(error);
      }
    });
};

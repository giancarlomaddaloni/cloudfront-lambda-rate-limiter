'use strict'

// The region of the lambda functions and dynamoDB table.
const TABLE_REGION = '{{TABLES_REGION}}';

// The name of the dynamo DB table storing the registries for email notifications.
// Table created within the cdk 'dynamoDB-Stack'
// tableName: `${projectName}-Notifications-${environment}`,
const TABLE_NAME_NOTIFICATIONS = '{{NOTIFICATIONS_TABLE_NAME}}';

// This cycle has to match the cycle configured for the trigger of this lambda function
const REFILL_PERIOD_IN_SECONDS = Number({{REFILL_PERIOD_IN_SECONDS}});

const AWS = require('aws-sdk');
const https = require('https');
const SES = new AWS.SES({ region: TABLE_REGION });
const registrieslastHour = [];

let uID = null;
let clientID = null; 
let deniedAT = null;

AWS.config.update({ region: TABLE_REGION });

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-10-08',
  httpOptions: {
    agent: new https.Agent({
      keepAlive: true,
    }),
  },});
  
  
const dbDelete = new AWS.DynamoDB();
  

const scanTable = async () => {
    const params = {
        TableName: TABLE_NAME_NOTIFICATIONS,
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


function deleteItem (uID)  {
  let params = {
    TableName: TABLE_NAME_NOTIFICATIONS,
    Key: {
          "uID": { 
              S: `${uID}` 
          }
        },};
  return dbDelete.deleteItem(params).promise().then(console.log(`clientID ${clientID} removed.`));
}



function sendEmail (message) {
  
  
  let params = {
      Destination: {
        ToAddresses: ["example@aws.com",],
      },
      Message: {
        Body: {
          Text: { Data: JSON.stringify(message) },
        },
  
        Subject: { Data: "Test Email" },
      },
      Source: "example@aws.com",
    };
    
  let sendEmail = SES.sendEmail(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
  });
   
  return sendEmail;
}


exports.handler = (event, context, callback) => {


  console.log (scanTable());
  let currentTime = Date.now();

  scanTable()
    .then((bucket) => {
      console.log ("load bucket --> " + JSON.stringify(bucket));
      for (let i = 0; i < bucket.length; i++) {
           clientID = JSON.stringify(bucket[i].clientID);
           deniedAT = bucket[i].deniedAT;
           uID = bucket[i].uID;
           let timesinceSec = Math.floor((currentTime - deniedAT) / 1000);
           if (timesinceSec < REFILL_PERIOD_IN_SECONDS ) {
            registrieslastHour.push(`Client ID --> ${clientID} denied --> ${timesinceSec} seconds(s) ago.`);
           } else { deleteItem(uID);};
           }})
    .then(() => (sendEmail(registrieslastHour)));
};
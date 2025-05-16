Rate Limit
This project is intended to block requests from differente sources, based on parameters give in order to maintain the functionality for the  APIs
Rate Limiting project.
This project is intended to limit the amount of request per client_id,ip_address, path or any identifiable behaivior for  services.
How ?
Lambda functions(node.js), in conjunction with a Cloudfront distribution in order to set up a viewer and origin request manipulation.
Besides those services, a dynamoDB table is available to be utilized as a register bucket resource  for the lambda@edge functions.
Step - to - Step (Viewer -- CF -- Lambda -- Origin -- Lambda -- CF -- Response) --> An example with a kanu Scenario
Viewer Request (A client requesting https://ratelimit.kanutech-aws.com/assets/kanu.js?client_id=kanu-service )
Cloudfront recevies the client request and send it to a Lambda Function.
The lambda function (rateLimiting-viewer-kanu) extracts the client_id 'kanu-service' based on the query string whitelisted over the cloudfront distibution behaivior.
rateLimiting-viewer-kanu adds the client_id from step 3 as a header to new origin request.
Cloudfront receives the origin request with the new header added, and sends the request to the Lambda rateLimiting-origin-kanu, to be analyzed.
rateLimiting-viewer-kanu extracts the client_id from the header, adds it as a key to a dynamoDB table and sets a timeset. Then, the request is either discarded if the set amount of requests per client_id were reached or redirected and listed for the next request.
The response of https://ratelimit.kanutech-aws.com/assets/kanu.js?client_id=kanu-service is successfull and counted or denied, based on the amount of requests per client_id done during the last period.(Also configurable)
Paths
Cloudfront ORIGIN request function
cdk/lib/lambda-functions/origin-request/index.js
Cloudfront VIEWER request function
cdk/lib/lambda-functions/viewer-request/index.js
Cloudfront NOTIFICATIONS request function
cdk/lib/lambda-functions/notifications/index.js
CDK Information
The AWS CDK Toolkit is a command line tool for interacting with CDK apps. Developers can use the AWS CDK Toolkit to synthesize artifacts such as AWS CloudFormation templates and to deploy stacks to development AWS accounts. You can also diff against a deployed stack to understand the impact of a code change.
The AWS Construct Library offers constructs for each AWS service, many with "rich" APIs that provide high-level abstractions. The aim of the AWS Construct Library is to reduce the complexity and glue logic required when integrating various AWS services to achieve your goals on AWS.
FROM --> https://docs.aws.amazon.com/cdk/v2/guide/home.html
In this project, CDK is intended to set up a cloudformation stack and a pipeline over GITLAB in order to provide a fast uploader for lambda@edge functions.
In order to run this project you need to commit a message specifying the action that you want gitlab to execute.
deploylambdaOrigin --> $CI_COMMIT_MESSAGE =~ /deploylambda-origin/
deploylambdaViewer --> $CI_COMMIT_MESSAGE =~ /deploylambda-viewer/
deploylambdaNotifications --> COMMIT MESSAGE == $CI_COMMIT_MESSAGE =~ /deploylambda-notifications/
deployDynamo --> $CI_COMMIT_MESSAGE =~ /deployDynamo/
deploylambdaOrigin
This function will deploy any changes done at 'cdk/lib/lambda-functions/origin/index.js'
A new version will be published.
A new config set is created and uploaded to cloudfront, based on the existent functions.
A '/*' invalidation is made over the distribution
Configurable variables within gitlab-ci pipeline
Modify the following variables at your own requirements

GENERAL variables

- export PROJECT_NAME="ratelimiting-<KANU Service>"
- export ENVIRONMENT=['stg','prod','uat']
- export AWS_REGION=['us-east-1','us-east-2','us-west-1','us-west-2']
- export ACCOUNT="aws-account#"
- export CF_DISTRO_ID=""
- export CF_DOMAIN_NAME="example.com"



ORIGIN - Dynamo DB variables

# Dynamo Table utilized for the main logic of the function. 
- export ORIGIN_TABLE_NAME="$PROJECT_NAME-origin-$ENVIRONMENT"
    # Each ITEM within this table contains:
        clientID: bucket.clientID --> Extracted from the query of the request
        value: bucket.value --> Tokens available per period. $MAX_CLIENTID_REQUESTS_PER_PERIOD == $REFILL_TOKENS_PER_PERIOD
        lastUpdate: bucket.lastUpdate --> Date.Now() at the moment of analysis
        expiresAt: Math.floor(bucket.lastUpdate / 1000) + (60 * 60 * 24)

# Dynamo Table utilized for saving clientID denied requests and other metadata for notification process.
- export NOTIFICATIONS_TABLE_NAME="$PROJECT_NAME-notifications-$ENVIRONMENT"
    # Each ITEM within this table contains:
        uID : uID --> An unique identifier per request given by 
        clientID: bucket.clientID --> Extracted from the query of the request 'let uID = AWS.util.uuid.v4()'
        deniedAT: deniedAT --> Setting a footprint by 'let currentTime = Date.now()'



ORIGIN - Function Logic variables

# Maximum amount of request permitted per cycle --> Tokens available per clientID within $PERIOD_IN_SECONDS
- export MAX_CLIENTID_REQUESTS_PER_PERIOD="5"

# Period of time in seconds, setting the cycle of the function. How often new tokens will be added to the pool per clientID
- export PERIOD_IN_SECONDS="60"

# Maximum amount of tokens added every $PERIOD_IN_SECONDS
- export REFILL_TOKENS_PER_PERIOD="5"



NOTIFICATIONS - Dynamo DB variables

# Dynamo Table utilized for saving clientID denied requests and other metadata for notification process.
- export NOTIFICATIONS_TABLE_NAME="$PROJECT_NAME-notifications-$ENVIRONMENT"
    # Each ITEM within this table contains:
        uID : uID --> An unique identifier per request given by 
        clientID: bucket.clientID --> Extracted from the query of the request 'let uID = AWS.util.uuid.v4()'
        deniedAT: deniedAT --> Setting a footprint by 'let currentTime = Date.now()'



NOTIFICATIONS - Function Logic variables

# Period of time in seconds, setting the cycle of the function. How often new tokens will be added to the pool per clientID
- export PERIOD_IN_SECONDS="60"

# Cycle of time setting how often an audit of denials over the $NOTIFICATIONS_TABLE_NAME is executed
- export CYCLE_PERIOD_NOTIFICATIONS_CHECKUP="300"


Steps of execution
git clone git@git.com:kanu-tools//-rate-limit.git --> Clone repository in local environment
git add . /or/  --> Add changes made over the following functions -->  ['cdk/lib/lambda-functions/notifications/index.js','cdk/lib/lambda-functions/origin/index.js','cdk/lib/lambda-functions/viewer/index.js']
git commit options:
Updating the following paths --> ['cdk/lib/lambda-functions/origin/index.js','cdk/lib/lambda-origin-stack.ts']

git commit -m "deploylambda-origin" --allow-empty
Updating the following paths --> ['cdk/lib/lambda-functions/viewer/index.js','cdk/lib/lambda-viewer-stack.ts']

git commit -m "deploylambda-viewer" --allow-empty
Updating the following paths --> ['cdk/lib/lambda-functions/notifications/index.js','cdk/lib/lambda-notifications-stack.ts']

git commit -m "deploylambda-notifications" --allow-empty
Updating the following paths --> ['cdk/lib/dynamoDB-stack.ts']

git commit -m "deployDynamo" --allow-empty

git push
Rate-Limiting request behaviors.
Review the functions in lambda-functions/ directory based on the following information,
Resources,
Lambda
notifications.js
origin-request.js
viewer-request.js
DynamoDB
NOTIFICATIONS_TABLE_NAME
ORIGIN_TABLE_NAME
Limiting the number of HTTP requests per clientID that can reach certain origin(kanu endpoints).
Once the request has been received by AWS DNS servers, it'll be modified by viewer-request.js, and a header will be added to the request.
The request will be redirected to the origin network and analyzed by origin-request.js, which will take into count two dynamoDB tables.
ORIGIN_TABLE_NAME, will be used for a constant real-time record of HTTP requests and to compare the historical behaivior per clientID, in order to deny or allow the request to reach its origin.
NOTIFICATIONS_TABLE_NAME, it'll be used for keeping track of the clientID denied during a certain period of time(PERIOD_IN_SECONDS). An email will be sent every CYCLE_PERIOD_NOTIFICATIONS_CHECKUP notifying which requests pertaining to a specific clientID have been denied.
The variables utilized within these scripts are as follows and intended for testing purposes.

export ENVIRONMENT="stg"
export ACCOUNT="aws-account"
export AWS_REGION="us-east-1"
export PROJECT_NAME="ratelimitkanu"
export CF_DISTRO_ID="DISTRO-CODE"
export CF_DOMAIN_NAME="ratelimit.kanutech-aws.com"
export ORIGIN_TABLE_NAME="$PROJECT_NAME-origin-$ENVIRONMENT"
export NOTIFICATIONS_TABLE_NAME="$PROJECT_NAME-notifications-$ENVIRONMENT"
export MAX_CLIENTID_REQUESTS_PER_PERIOD="5"
export MAX_CLIENTIDS_DENIED_PER_PERIOD="5"
export MAX_TOTAL_REQUESTS_PER_PERIOD="15"
export PERIOD_IN_SECONDS="120"
export REFILL_TOKENS_PER_PERIOD="5"
export CYCLE_PERIOD_NOTIFICATIONS_CHECKUP="300"

There is a CloudFront(DISTRO-CODE) distribution created for the purpose of testing(aws-account-stg), https://ratelimit.kanutech-aws.com/.
Intended to BLOCK requests by the following rules,


Every clientID request will have a limit of MAX_CLIENTID_REQUESTS_PER_PERIOD, per request, the allowance will be renewed in PERIOD_IN_SECONDS and by REFILL_TOKENS_PER_PERIOD. Meaning that the number of requests permitted will be the same as they were before getting blocked. As well as non-accumulative, after every PERIOD_IN_SECONDS every request is taken as a new one, looping the logic.


If the amount of total clientID requests denied is major than MAX_CLIENTIDS_DENIED_PER_PERIOD within the last PERIOD_IN_SECONDS, every new clientID request will be denied. For this rule, quantity of clientID denials will be acummulative.


All the requests within the last PERIOD_IN_SECONDS, regardless of the clientID will be SUM and evaluated against MAX_TOTAL_REQUESTS_PER_PERIOD. If they are surpassing the maximum, any new requests will be denied for the rest of the PERIOD_IN_SECONDS. For this rule, requests will be accumulative.


The values MAX_CLIENTID_REQUESTS_PER_PERIOD, PERIOD_IN_SECONDS, REFILL_TOKENS_PER_PERIOD, MAX_CLIENTIDS_DENIED_PER_PERIOD, MAX_TOTAL_REQUESTS_PER_PERIOD and CYCLE_PERIOD_NOTIFICATIONS_CHECKUP, can be modifed for the application convenience.



This project is also deployed by a gitlab pipeline and a CDK.ts AWS package, which is analyzed by KANU team and utilized for the benefit of continuous deployment of the AWS resources. -->  .gitlab-ci.yml. The full deployment solution can be accessed at ETO-1949 branch.


In order to test functionality you can try the following,

Access https://ratelimit.kanutech-aws.com/assets/kanu.js?client_id=kanu-service MAX_CLIENTID_REQUESTS_PER_PERIOD times, and validate that (MAX_CLIENTID_REQUESTS_PER_PERIOD + 1) will return a 404 HTTP Code.
Access https://ratelimit.kanutech-aws.com/assets/kanu.js?client_id=kanu-service after PERIOD_IN_SECONDS, and validate that the client_id=kanu-service is not getting blocked anymore.
Access https://ratelimit.kanutech-aws.com/assets/kanu.js?[client_id=kanu-service, client_id=kanu-service, client_id=kanu-service,  client_id=kanu-service and client_id=kanu-service] (MAX_CLIENTID_REQUESTS_PER_PERIOD + 1) times, and validate that client_id=kanu-service will get blocked eventhought it's a new client_id. This is due to MAX_CLIENTIDS_DENIED_PER_PERIOD. Meaning that after MAX_CLIENTIDS_DENIED_PER_PERIOD is blocked within PERIOD_IN_SECONDS, a new clientID request will be blocked as well.
Access https://ratelimit.kanutech-aws.com/assets/kanu.js?[client_id=kanu-service, client_id=kanu-service, client_id=kanu-service,  client_id=kanu-service and client_id=kanu-service] MAX_TOTAL_REQUESTS_PER_PERIOD times and less than MAX_CLIENTID_REQUESTS_PER_PERIOD per client_id, and validate that a new client_id will be blocked. This is due to MAX_TOTAL_REQUESTS_PER_PERIOD+1, and blocking any new request during the PERIOD_IN_SECONDS value.






#!/usr/bin/env node

import * as cdk from "aws-cdk-lib";

import { lambdaOrigin } from '../lib/lambda-origin-stack';
import { lambdaViewer } from '../lib/lambda-viewer-stack';
import { lambdaNotifications } from '../lib/lambda-notifications-stack';

import { dynamoResources } from '../lib/dynamoDB-stack';


const app = new cdk.App();


function validate(parameter: string){
  let variable = `${app.node.tryGetContext(parameter)}`
  if (variable === undefined || !(typeof(variable) === 'string') || variable.trim() === '') {
    throw new Error(`Must pass a '-c parameter=<parameter>' context ${parameter}`);
  }
  return variable;
  
};

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
};


// General Variables
let region = validate("region");
let account = validate("account");
let projectName = validate("projectName");
let environment = validate("environment");
let cfDistributionID = validate("cfDistributionID");
let cfDomainName = validate("cfDomainName");
let eventsNotifications = validate("eventsNotifications");





function stacktenant() {

  let stacktenant = `${capitalizeFirstLetter(projectName)}-${capitalizeFirstLetter(environment)}`;
  return stacktenant;

};

const lambda_originUploader = new lambdaOrigin(app, `${projectName}-originFunction-${environment}`, {
  stackName:`lambda-Origin-${stacktenant()}`,
  projectName: projectName,
  environment: environment,
  cfDistributionID: cfDistributionID,
  cfDomainName: cfDomainName,
  env: {
    region: region,
    account: account,
  },
});

const lambda_viewerUploader = new lambdaViewer(app, `${projectName}-viewerFunction-${environment}`, {
  stackName:`lambda-Viewer-${stacktenant()}`,
  projectName: projectName,
  environment: environment,
  cfDistributionID: cfDistributionID,
  cfDomainName: cfDomainName,
  env: {
    region: region,
    account: account,
  },
});


const lambda_notificationsUploader = new lambdaNotifications(app, `${projectName}-notificationsFunction-${environment}`, {
  stackName:`lambda-Notifications-${stacktenant()}`,
  eventsNotifications: eventsNotifications,
  projectName: projectName,
  environment: environment,
  cfDistributionID: cfDistributionID,
  cfDomainName: cfDomainName,
  env: {
    region: region,
    account: account,
  },
});



const dynamo_Resources = new dynamoResources(app, `${projectName}-tables-${environment}`, {
  stackName:`dynamoResources-${stacktenant()}`,
  projectName: projectName,
  environment: environment,
  env: {
    region: region,
    account: account,
  },
});


app.synth();

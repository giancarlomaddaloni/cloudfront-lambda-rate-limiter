
import * as cdk from 'aws-cdk-lib';
import { aws_cloudfront as cloudfront } from 'aws-cdk-lib';
import { aws_iam as iam  } from 'aws-cdk-lib';
import { aws_lambda as lambda  } from 'aws-cdk-lib';
import { aws_events as events } from 'aws-cdk-lib';
import { aws_events_targets as targets } from 'aws-cdk-lib';


import { Size, Duration } from 'aws-cdk-lib';
import * as path from 'path';


export interface lambdanotificationsProps extends cdk.StackProps {
  readonly environment: string;
  readonly projectName: string;
  readonly cfDistributionID: string;
  readonly cfDomainName: string;
  readonly eventsNotifications: string;


};

export class lambdaNotifications extends cdk.Stack {
    
    private notificationslambdaFunction: lambda.IFunction;



    constructor(scope: cdk.App, id: string, props: lambdanotificationsProps ) {
       
      super(scope, id, props);

      const { environment } = props;
      const { projectName }  = props;
      const { cfDistributionID }  = props;
      const { cfDomainName }  = props;
      const { eventsNotifications }  = props;

      const eventsnotificationNumber: number = +eventsNotifications;
      let eventsNotification = Math.floor(eventsnotificationNumber / 60);
      
      const lambdaPolicy = new iam.PolicyStatement();
      lambdaPolicy.addActions("s3:*");
      lambdaPolicy.addActions("dynamodb:*");
      lambdaPolicy.addActions("logs:*");
      lambdaPolicy.addActions("cloudwatch:*");
      lambdaPolicy.addActions("cloudfront:*");
      lambdaPolicy.addActions("ses:*");
      lambdaPolicy.addResources("*");
      
      const cfDistro = cloudfront.Distribution.fromDistributionAttributes(this,`${projectName}-cfDistro-${environment}`, 
      {
        distributionId: `${cfDistributionID}`,
        domainName: `${cfDomainName}`
       
      });

      const lambdaRole = new iam.Role(this,`${projectName}-role-${environment}`, 
      {
        roleName: `${projectName}-Role-${environment}`,
        assumedBy: new iam.CompositePrincipal(
          new iam.ServicePrincipal("events.amazonaws.com"),
          new iam.ServicePrincipal("lambda.amazonaws.com"),),
        description: 'A role intended to be utilized by Lambda for lambda@edge operations',
      });

      lambdaRole.addToPolicy(lambdaPolicy);

      lambdaRole.grantAssumeRole(new iam.ServicePrincipal('edgelambda.amazonaws.com'));


      const NotificationslambdaFunction = () => {

        let lambdaFunction = new lambda.Function(this, `lambdaNotifications-kanu-${environment}`, {
          code: lambda.Code.fromAsset('lib/lambda-functions/notifications',),
          functionName: `${projectName}-Notifications-${environment}`,
          handler: 'index.handler',
          role: lambdaRole,
          memorySize: 128,
          ephemeralStorageSize: Size.mebibytes(512),
          runtime: lambda.Runtime.NODEJS_16_X,
          timeout: cdk.Duration.seconds(30),
          logRetention: 14,
        });

        return lambdaFunction;

      };

      this.notificationslambdaFunction = NotificationslambdaFunction();

      const notificationslambdaFunctionVersion = new lambda.Version(this, `${projectName}-notificationslambdaVersion-${environment}`, {
        lambda: this.notificationslambdaFunction
      });

      const eventsBus = new events.EventBus(this, `${projectName}-notificationsBus-${environment}`, {
        eventBusName: `${projectName}-Notifications-${environment}`
      });

      const notificationsRule = new events.Rule(this, `${projectName}-notificationsRule-${environment}`, {
        schedule: events.Schedule.cron( {minute: `${eventsNotification}`}, )
      });
      
      notificationsRule.addTarget( new targets.LambdaFunction( this.notificationslambdaFunction, {
        maxEventAge: cdk.Duration.hours(2),
        retryAttempts: 2, 
      }));

    };
};


// -----------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------
// --------------------------------- KanuTech - SRE - KanuTech ---------------------------------------

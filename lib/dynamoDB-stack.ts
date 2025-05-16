
import * as cdk from 'aws-cdk-lib';
import { aws_dynamodb as dynamodb  } from 'aws-cdk-lib';
import { aws_iam as iam  } from 'aws-cdk-lib';
import { aws_ec2 as ec2  } from 'aws-cdk-lib';

export interface dynamoResourcesProps extends cdk.StackProps {
  readonly environment: string;
  readonly projectName: string;
};



export class dynamoResources extends cdk.Stack {
    
    private dynamoDBrateLimitRegistries: dynamodb.Table;
    private dynamoDBrateLimitNotifications: dynamodb.Table;



    constructor(scope: cdk.App, id: string, props: dynamoResourcesProps ) {
       
       super(scope, id, props);

       const { environment } = props;
       const { projectName }  = props;

      // ----------------------------------------------------------------

      // -----------------------    DYNAMODB   --------------------------
      // ----------------------------------------------------------------


      // DynamoDB table for Registring same ClientIDs from https://URL(kanu)?@queryString
      // @queryString == [params['clientID'] || 
              //  params['client_id'] || 
              //  params['clientId'] || 
              //  params['client_ID'] || 
              //  params['clientid'] || 
              //  params['client_Id']; ]

      // Saved as header over the origin functions
      // The lambda function on a session for this table is named 'rateLimiting-origin-kanu'. 

      this.dynamoDBrateLimitRegistries = new dynamodb.Table(this, `${projectName}-dynamoOrigin-${environment}`, {
        partitionKey: {
          name: 'clientID',
          type: dynamodb.AttributeType.STRING
        },
        // sortKey: {name: 'lastUpdate', type: dynamodb.AttributeType.NUMBER},
        tableName: `${projectName}-origin-${environment}`,
        billingMode: dynamodb.BillingMode.PROVISIONED,

        // Global table for redundancy, enable multiregion.
        // Adding all regions where lambda functions(rateLimiting-notifications-kanu) are being triggered --> global table for redundancy
        // replicationRegions: ['us-east-1', 'us-east-2', 'us-west-2'],

      });

      this.dynamoDBrateLimitRegistries.autoScaleWriteCapacity({
        minCapacity: 1,
        maxCapacity: 10,
      }).scaleOnUtilization({ targetUtilizationPercent: 75 });



      this.dynamoDBrateLimitRegistries.autoScaleReadCapacity({
        minCapacity: 1,
        maxCapacity: 10,
      }).scaleOnUtilization({ targetUtilizationPercent: 75 });

      // DynamoDB table for Rate Limit Notifications Process
      // The lambda function on a session for this table is named 'rateLimiting-notifications-kanu'.

      this.dynamoDBrateLimitNotifications = new dynamodb.Table(this, `${projectName}-dynamoNotifications-${environment}`, {
        partitionKey: {
          name: 'uID',
          type: dynamodb.AttributeType.STRING
        },
        // sortKey: {name: 'deniedAT', type: dynamodb.AttributeType.NUMBER},
        tableName: `${projectName}-notifications-${environment}`,
        billingMode: dynamodb.BillingMode.PROVISIONED,

        // Global table for redundancy, enable multiregion.
        // Adding all regions where lambda functions(rateLimiting-notifications-kanu) are being triggered --> global table for redundancy
        // replicationRegions: ['us-east-1', 'us-east-2', 'us-west-2'],

      });
      
      this.dynamoDBrateLimitNotifications.autoScaleWriteCapacity({
        minCapacity: 1,
        maxCapacity: 10,
      }).scaleOnUtilization({ targetUtilizationPercent: 75 });

      this.dynamoDBrateLimitNotifications.autoScaleReadCapacity({
        minCapacity: 1,
        maxCapacity: 10,
      }).scaleOnUtilization({ targetUtilizationPercent: 75 });


    };
};


// -----------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------
// --------------------------------- KanuTech - SRE - KanuTech ---------------------------------------

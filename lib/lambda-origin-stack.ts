
import * as cdk from 'aws-cdk-lib';
import { aws_cloudfront as cloudfront } from 'aws-cdk-lib';
import { aws_iam as iam  } from 'aws-cdk-lib';
import { aws_lambda as lambda  } from 'aws-cdk-lib';
import { Size } from 'aws-cdk-lib';
import * as path from 'path';


export interface lambdaOriginProps extends cdk.StackProps {
  readonly environment: string;
  readonly projectName: string;
  readonly cfDistributionID: string;
  readonly cfDomainName: string;


};

export class lambdaOrigin extends cdk.Stack {
    
    private originlambdaFunction: lambda.IFunction;

    constructor(scope: cdk.App, id: string, props: lambdaOriginProps ) {
       
       super(scope, id, props);

       const { environment } = props;
       const { projectName }  = props;
       const { cfDistributionID }  = props;
       const { cfDomainName }  = props;

      const lambdaPolicy = new iam.PolicyStatement();

      lambdaPolicy.addActions("s3:*");
      lambdaPolicy.addActions("dynamodb:*");
      lambdaPolicy.addActions("logs:*");
      lambdaPolicy.addActions("lambda:*");
      lambdaPolicy.addActions("cloudwatch:*");
      lambdaPolicy.addActions("cloudfront:*");
      lambdaPolicy.addResources("*");
      
      const cfDistro = cloudfront.Distribution.fromDistributionAttributes(this,`${projectName}-cfDistro-${environment}`, 
      {
        distributionId: `${cfDistributionID}`,
        domainName: `${cfDomainName}`
       
      });

      const lambdaRole = new iam.Role(this,`${projectName}-originRole-${environment}`, 
      {
        roleName: `${projectName}-originRole-${environment}`,
        assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("edgelambda.amazonaws.com"),
        new iam.ServicePrincipal("lambda.amazonaws.com"),),
        description: 'A role intended to be utilized by Lambda for lambda@edge operations',
      });

      lambdaRole.addToPolicy(lambdaPolicy);

      const OriginlambdaFunction = () => {

        let lambdaFunction = new lambda.Function(this, `lambdaOrigin-kanu-${environment}`, {
          code: lambda.Code.fromAsset('././lambda-functions/origin',),
          functionName: `${projectName}-Origin-${environment}`,
          handler: 'index.handler',
          role: lambdaRole,
          memorySize: 128,
          ephemeralStorageSize: Size.mebibytes(512),
          runtime: lambda.Runtime.NODEJS_16_X,
          timeout: cdk.Duration.seconds(5),
          logRetention: 14,
        });

        return lambdaFunction;

      };

      this.originlambdaFunction = OriginlambdaFunction();

      const originlambdaFunctionVersion = new lambda.Version(this, `${projectName}-originlambdaVersion-${environment}`, {
        lambda: this.originlambdaFunction,
        
      });


    };
};


// -----------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------
// --------------------------------- KanuTech - SRE - KanuTech ---------------------------------------

import {
  Stack,
  StackProps,
  aws_lambda_nodejs as lambda,
  aws_stepfunctions_tasks as tasks,
  aws_stepfunctions as sfn,
  Duration,
} from 'aws-cdk-lib'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'
import * as path from 'path'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class StepFunctionsParamValidationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const lambdaFunc = new lambda.NodejsFunction(this, 'my-handler', {
      entry: path.join(__dirname, '../src/index.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_16_X,
    })

    const isNotValidParams = sfn.Condition.isNotPresent('$.lambdaInput')

    const lambdaInvoke = new tasks.LambdaInvoke(
      this,
      'Invoke Lambda Function',
      {
        lambdaFunction: lambdaFunc,
        payload: sfn.TaskInput.fromJsonPathAt('$.lambdaInput'),
      }
    )

    const jobFailed = new sfn.Fail(this, 'Notify Job Failure', {
      cause: 'Job Failed',
    })

    const definition = new sfn.Choice(this, 'Validate Params')
      .when(isNotValidParams, jobFailed)
      .otherwise(
        lambdaInvoke.addCatch(jobFailed, {
          errors: [sfn.Errors.ALL],
        })
      )

    new sfn.StateMachine(this, 'StateMachine', {
      definition: definition,
      timeout: Duration.minutes(3),
    })
  }
}

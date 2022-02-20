import { App } from 'aws-cdk-lib';
import { Asterisk } from './asterisk-instance';

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new Asterisk(app, 'Asterisk', { env: devEnv });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();

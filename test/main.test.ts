import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Asterisk } from '../src/asterisk-instance';

test('Snapshot', () => {
  const app = new App();
  const stack = new Asterisk(app, 'test');
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

  const definedVpcApp = new App({
    context: { vpcId: 'vpc-002564a387b4811c4' },
  });
  const definedVPCStack = new Asterisk(definedVpcApp, 'DefinedVPC', {
    env: {
      region: 'us-east-1',
      account: '1234567890123',
    },
  });
  const definedTemplate = Template.fromStack(definedVPCStack);
  expect(definedTemplate.toJSON()).toMatchSnapshot();
});

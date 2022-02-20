import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Asterisk } from '../src/asterisk-instance';

test('Snapshot', () => {
  const app = new App();
  const stack = new Asterisk(app, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});

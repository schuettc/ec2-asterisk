const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  author: 'Court Schuett',
  authorAddress: 'https://subaud.io',
  cdkVersion: '2.70.0',
  workflowNodeVersion: '16.x',
  defaultReleaseBranch: 'main',
  name: 'ec2-asterisk',
  deps: ['@aws-sdk/client-ec2'],
  // context: { vpcId: 'vpc-xxxxxxxx' }, //TO ADD ASTERISK TO EXISTING VPC - UNCOMMENT
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['schuettc'],
  },
  depsUpgradeOptions: {
    ignoreProjen: false,
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
    },
  },
  repositoryUrl: 'https://github.com/schuettc/ec2-asterisk.git',
});
project.synth();

const common_include = [
  'cdk.out',
  'cdk.context.json',
  'yarn-error.log',
  'dependabot.yml',
];

project.gitignore.include(...common_include);

const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  author: 'Court Schuett',
  authorAddress: 'https://subaud.io',
  cdkVersion: '2.13.0',
  defaultReleaseBranch: 'main',
  name: 'ec2-asterisk',
  deps: ['@aws-sdk/client-ec2', 'inquirer'],
  eslintOptions: {
    ignorePatterns: ['deploy.mjs'],
  },
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

const common_exclude = [
  'cdk.out',
  'cdk.context.json',
  'yarn-error.log',
  'dependabot.yml',
];

project.gitignore.exclude(...common_exclude);

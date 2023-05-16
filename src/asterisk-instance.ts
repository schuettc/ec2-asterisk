/* eslint-disable @typescript-eslint/indent */
import path from 'path';
import { Duration, Stack } from 'aws-cdk-lib';
import {
  Vpc,
  SubnetType,
  CfnEIP,
  Instance,
  MachineImage,
  InstanceType,
  InstanceClass,
  InstanceSize,
  CloudFormationInit,
  InitConfig,
  InitFile,
  InitCommand,
  CfnEIPAssociation,
  UserData,
} from 'aws-cdk-lib/aws-ec2';
import {
  Role,
  ServicePrincipal,
  PolicyDocument,
  PolicyStatement,
  ManagedPolicy,
} from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class Asterisk extends Stack {
  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id, props);

    if (this.node.tryGetContext('vpcId')) {
      var vpc = Vpc.fromLookup(this, 'VPC', {
        vpcId: this.node.tryGetContext('vpcId'),
      });
    } else {
      vpc = new Vpc(this, 'VPC', {
        vpcName: 'Asterisk VPC',
        natGateways: 0,
        maxAzs: 1,
        subnetConfiguration: [
          {
            cidrMask: 24,
            name: 'AsteriskSubnet',
            subnetType: SubnetType.PUBLIC,
          },
        ],
      });
    }

    const ec2Eip = new CfnEIP(this, 'ec2Eip');

    const parameterName =
      '/aws/service/canonical/ubuntu/server/jammy/stable/current/arm64/hvm/ebs-gp2/ami-id';
    const ubuntuAmiId = StringParameter.valueForStringParameter(
      this,
      parameterName,
    );

    const ubuntuAmi = MachineImage.genericLinux({
      'us-east-1': ubuntuAmiId,
    });

    const userData = UserData.forLinux();
    userData.addCommands(
      'apt-get update',
      'mkdir -p /opt/aws/bin',
      'apt-get install python3-pip unzip jq asterisk -y',
      'pip install https://s3.amazonaws.com/cloudformation-examples/aws-cfn-bootstrap-py3-latest.tar.gz',
      'ln -s /root/aws-cfn-bootstrap-latest/init/ubuntu/cfn-hup /etc/init.d/cfn-hup',
      'ln -s /usr/local/bin/cfn-* /opt/aws/bin/',
      'curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"',
      'unzip -q awscliv2.zip',
      './aws/install',
    );

    const ec2Instance = new Instance(this, 'Asterisk', {
      vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.C6G, InstanceSize.MEDIUM),
      machineImage: ubuntuAmi,
      userData: userData,
      init: CloudFormationInit.fromConfigSets({
        configSets: {
          default: ['install', 'config'],
        },
        configs: {
          config: new InitConfig([
            InitFile.fromObject('/etc/config.json', {
              IP: ec2Eip.ref,
            }),
            InitFile.fromFileInline(
              '/etc/asterisk/pjsip.conf',
              path.join(__dirname, '../resources/asteriskConfig/pjsip.conf'),
            ),
            InitFile.fromFileInline(
              '/etc/asterisk/asterisk.conf',
              path.join(__dirname, '../resources/asteriskConfig/asterisk.conf'),
            ),
            InitFile.fromFileInline(
              '/etc/asterisk/logger.conf',
              path.join(__dirname, '../resources/asteriskConfig/logger.conf'),
            ),
            InitFile.fromFileInline(
              '/etc/asterisk/modules.conf',
              path.join(__dirname, '../resources/asteriskConfig/modules.conf'),
            ),
            InitFile.fromFileInline(
              '/etc/config_asterisk.sh',
              path.join(
                __dirname,
                '../resources/asteriskConfig/config_asterisk.sh',
              ),
            ),
            InitCommand.shellCommand('chmod +x /etc/config_asterisk.sh'),
            InitCommand.shellCommand(
              '/etc/config_asterisk.sh 2>&1 | tee /var/log/asterisk_config.log',
            ),
          ]),
        },
      }),
      initOptions: {
        timeout: Duration.minutes(15),
      },
      role: new Role(this, 'ec2Role', {
        assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
        inlinePolicies: {
          ['cloudwatchLogs']: new PolicyDocument({
            statements: [
              new PolicyStatement({
                resources: ['*'],
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                  'logs:DescribeLogStreams',
                ],
              }),
            ],
          }),
          ['cloudformationPolicy']: new PolicyDocument({
            statements: [
              new PolicyStatement({
                resources: ['*'],
                actions: [
                  'cloudformation:SignalResource',
                  'cloudformation:DescribeStackResource',
                ],
              }),
            ],
          }),
        },
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            'AmazonSSMManagedInstanceCore',
          ),
        ],
      }),
    });

    new CfnEIPAssociation(this, 'EIP Association', {
      eip: ec2Eip.ref,
      instanceId: ec2Instance.instanceId,
    });
  }
}

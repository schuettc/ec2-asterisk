import path from 'path';
import { Stack, Duration } from 'aws-cdk-lib';
import {
  Vpc,
  SubnetType,
  CfnEIP,
  Instance,
  AmazonLinuxImage,
  InstanceType,
  InstanceClass,
  InstanceSize,
  AmazonLinuxGeneration,
  AmazonLinuxCpuType,
  CloudFormationInit,
  InitConfig,
  InitFile,
  InitCommand,
  CfnEIPAssociation,
} from 'aws-cdk-lib/aws-ec2';
import {
  Role,
  ServicePrincipal,
  PolicyDocument,
  PolicyStatement,
  ManagedPolicy,
} from 'aws-cdk-lib/aws-iam';
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

    const ec2Instance = new Instance(this, 'Asterisk', {
      vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
      machineImage: new AmazonLinuxImage({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: AmazonLinuxCpuType.ARM_64,
      }),
      init: CloudFormationInit.fromConfigSets({
        configSets: {
          default: ['install', 'config'],
        },
        configs: {
          install: new InitConfig([
            InitFile.fromObject('/etc/config.json', {
              IP: ec2Eip.ref,
            }),
            InitFile.fromFileInline(
              '/tmp/amazon-cloudwatch-agent.json',
              path.join(
                __dirname,
                '../resources/asteriskConfig/amazon-cloudwatch-agent.json',
              ),
            ),
            InitFile.fromFileInline(
              '/etc/install.sh',
              path.join(__dirname, '../resources/asteriskConfig/install.sh'),
            ),
            InitCommand.shellCommand('chmod +x /etc/install.sh'),
            InitCommand.shellCommand('cd /tmp'),
            InitCommand.shellCommand(
              '/etc/install.sh 2>&1 | tee /var/log/asterisk_install.log',
            ),
          ]),
          config: new InitConfig([
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

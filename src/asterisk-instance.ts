import path from 'path';
import { Stack, Duration } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class Asterisk extends Stack {
  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      vpcName: 'Asterisk VPC',
      natGateways: 0,
      maxAzs: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'AsteriskSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const ec2Eip = new ec2.CfnEIP(this, 'ec2Eip');

    const ec2Instance = new ec2.Instance(this, 'Asterisk', {
      vpc,
      vpcSubnets: { subnetGroupName: 'AsteriskSubnet' },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      init: ec2.CloudFormationInit.fromConfigSets({
        configSets: {
          default: ['install', 'config'],
        },
        configs: {
          install: new ec2.InitConfig([
            ec2.InitFile.fromObject('/etc/config.json', {
              IP: ec2Eip.ref,
            }),
            ec2.InitFile.fromFileInline(
              '/etc/install.sh',
              path.join(__dirname, '../resources/asteriskConfig/install.sh'),
            ),
            ec2.InitCommand.shellCommand('chmod +x /etc/install.sh'),
            ec2.InitCommand.shellCommand('cd /tmp'),
            ec2.InitCommand.shellCommand(
              '/etc/install.sh 2>&1 | tee /var/log/asterisk_install.log',
            ),
          ]),
          config: new ec2.InitConfig([
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/pjsip.conf',
              path.join(__dirname, '../resources/asteriskConfig/pjsip.conf'),
            ),
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/asterisk.conf',
              path.join(__dirname, '../resources/asteriskConfig/asterisk.conf'),
            ),
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/logger.conf',
              path.join(__dirname, '../resources/asteriskConfig/logger.conf'),
            ),
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/modules.conf',
              path.join(__dirname, '../resources/asteriskConfig/modules.conf'),
            ),
            ec2.InitFile.fromFileInline(
              '/etc/config_asterisk.sh',
              path.join(
                __dirname,
                '../resources/asteriskConfig/config_asterisk.sh',
              ),
            ),
            ec2.InitCommand.shellCommand('chmod +x /etc/config_asterisk.sh'),
            ec2.InitCommand.shellCommand('/etc/config_asterisk.sh'),
          ]),
        },
      }),
      initOptions: {
        timeout: Duration.minutes(15),
      },
      role: new iam.Role(this, 'ec2Role', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'AmazonSSMManagedInstanceCore',
          ),
        ],
      }),
    });

    new ec2.CfnEIPAssociation(this, 'EIP Association', {
      eip: ec2Eip.ref,
      instanceId: ec2Instance.instanceId,
    });
  }
}

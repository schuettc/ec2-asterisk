'use strict';

import { spawn } from 'child_process';
import {
  DescribeInstanceTypeOfferingsCommand,
  DescribeVpcsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import inquirer from 'inquirer';

const ec2 = new EC2Client();

async function listRegions() {
  try {
    const { Regions } = await ec2.send(new DescribeRegionsCommand());
    let regionList = Regions.map((item) => item.RegionName);
    return regionList;
  } catch (error) {
    console.log(error);
  }
}

async function listVPCs() {
  const params = {
    Filters: {
      state: 'available',
    },
  };
  console.log(params);
  try {
    const { Vpcs } = await ec2.send(new DescribeVpcsCommand(params));
    console.log('Vpcs: ', Vpcs);
    let vpcList = Vpcs.map((item) => item.VpcId);
    console.log('vpcList: ', vpcList);
    return vpcList;
  } catch (error) {
    console.log('listVpc Error: ', error);
  }
}

async function listSizes(selectedRegion) {
  const params = {
    Filters: {
      location: selectRegion,
    },
  };
  try {
    const { InstanceTypeOfferings } = await ec2.send(
      new DescribeInstanceTypeOfferingsCommand(params),
    );
    let sizeList = InstanceTypeOfferings.maps((item) => item.InstanceType);
  } catch (error) {
    console.log(error);
  }
}

async function selectRegion() {
  const regions = await listRegions();
  const regionSelected = await inquirer.prompt({
    type: 'list',
    loop: false,
    name: 'selectedRegion',
    message: 'Region to deploy Asterisk server to: ',
    choices: regions,
  });
  return regionSelected;
}

async function createNewVPC() {
  const answers = await inquirer.prompt({
    type: 'confirm',
    name: 'createVPC',
    message: `Would you like to use an existing VPC?`,
    default: false,
  });
  if (answers.createVPC) {
    return true;
  } else {
    return false;
  }
}

async function selectVpc(vpcs) {
  const vpcSelected = await inquirer.prompt({
    type: 'list',
    loop: false,
    name: 'selectedVpc',
    message: 'Select VPC to deploy Asterisk server to: ',
    choices: vpcs,
  });
  return vpcSelected;
}

async function getSize(selectedRegion) {
  const sizes = await listSizes(selectedRegion);
  const sizeSelected = await inquirer.prompt({
    type: 'list',
    loop: false,
    name: 'selectedSize',
    message: 'Instance size to deploy Asterisk server to: ',
    choices: sizes,
  });
  return sizeSelected;
}

async function shellSpawn(command, args, options) {
  let cmd = spawn(command, args, options);
  cmd.stdout.on('data', (data) => {
    console.log(`${data}`);
  });

  cmd.stderr.on('data', (data) => {
    console.error(`${data}`);
  });
}

async function main() {
  console.log('Creating Asterisk Server');
  const newVpc = await createNewVPC();
  console.log(newVpc);
  if (newVpc) {
    const vpcs = await listVPCs();
    console.log(vpcs);
    const vpc = await selectVpc(vpcs);
    console.log(vpc);
  }
}

await main();

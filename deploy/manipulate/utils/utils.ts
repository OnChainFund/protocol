import { promises as fsPromises } from 'fs';
import { join, resolve } from 'path';
import { ethers } from 'ethers';

export async function getContractAddress(ContractName: string): Promise<string> {
  const result = await fsPromises.readFile(
    join(resolve(resolve(__dirname, '..'), '..'), '/deployments/localhost/' + ContractName + '.json'),
    'utf-8',
  );

  return JSON.parse(result)['address'];
}

export async function getContractAbi(ContractName: string): Promise<string> {
  const result = await fsPromises.readFile(
    join(resolve(resolve(__dirname, '..'), '..'), '/deployments/localhost/' + ContractName + '.json'),
    'utf-8',
  );
  return JSON.parse(result)['abi'];
}

export async function getContract(ContractName: string, provider: any): Promise<ethers.Contract> {
  const result = await fsPromises.readFile(
    join(resolve(resolve(resolve(__dirname, '..'), '..'), '..'), '/deployments/localhost/' + ContractName + '.json'),
    'utf-8',
  );
  const address = JSON.parse(result)['address'];
  const abi = JSON.parse(result)['abi'];
  const contract = new ethers.Contract(address, abi, provider);
  return contract;
}

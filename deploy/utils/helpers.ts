import { providers } from 'ethers';

export function nonOptional<T>(array: (T | undefined)[]): T[] {
  return array.filter((item) => item !== undefined) as T[];
}

function getNetwork(id: number | string) {
  return providers.getNetwork(Number(id));
}

function isNetwork(id: number | string, name: string) {
  return getNetwork(id).name === name;
}

export enum Network {
  'HOMESTEAD' = 'homestead',
  'KOVAN' = 'kovan',
  'RINKEBY' = 'rinkeby',
  'ROPSTEN' = 'ropsten',
  'MATIC' = 'matic',
  'MATICMUM' = 'maticmum',
  'AVALANCHE' = 'avalanche',
}

export function isHomestead(id: number | string) {
  return isNetwork(id, Network.HOMESTEAD);
}

export function isKovan(id: number | string) {
  return isNetwork(id, Network.KOVAN);
}

export function isRopsten(id: number | string) {
  return isNetwork(id, Network.ROPSTEN);
}

export function isRinkeby(id: number | string) {
  return isNetwork(id, Network.RINKEBY);
}

export function isMatic(id: number | string) {
  return isNetwork(id, Network.MATIC);
}

export function isMaticMumbai(id: number | string) {
  return isNetwork(id, Network.MATICMUM);
}

export function isAvalanche(id: number | string) {
  return true;
}
export function isOneOfNetworks(id: number | string, networks: Network[]) {
  const network = getNetwork(id).name;

  return networks.includes(network as Network);
}

import { cryptoWaitReady, encodeAddress } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import { hexToU8a } from '@polkadot/util';

  // switch (network) {
  //   case 'dev':
  //     return encodeAddress(addr, 42);
  //   case 'test':
  //     return encodeAddress(addr, 21);
  //   case 'main':
  //     return encodeAddress(addr, 22);
  //   default:
  //     throw new Error(`Network can be either test or main or dev but was passed as ${network}`);
  // }
const ss58Format = 42;

const curveToTypeMap = {
  'secp256k1': 'ecdsa',
  'secp256r1': 'ecdsa',
  'edwards25519': 'ed25519',
};

// Keyrings mapped by type (ecdsa, sr25519 etc)
const keyrings = {};

export async function getKeyring(curve) {
  await cryptoWaitReady();
  const keypairType = curveToTypeMap[curve] || curve;
  if (!keypairType) {
    throw new Error(`Unsupported curve type: ${curve}`);
  }
  if (!keyrings[keypairType]) {
    keyrings[keypairType] = new Keyring({ ss58Format, type: keypairType });
  }
  return keyrings[keypairType];
}

export async function publicKeyToAddress(hexStr, curve) {
  // const keyring = await getKeyring(curve);
  // const seed = hexToU8a(hexStr);
  const address = encodeAddress(hexStr, ss58Format);
  return address;
}

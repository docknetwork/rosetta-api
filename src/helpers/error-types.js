import RosettaSDK from 'rosetta-node-sdk';

export const ERROR_NOT_IMPLEMENTED = 0;
export const ERROR_UNAVAILABLE_OFFLINE = 1;
export const ERROR_POLKADOT_ERROR = 2;
export const ERROR_PUBLIC_KEY_DECOMPRESS = 3;
export const ERROR_PARSE_INTENT = 4;
export const ERROR_PARSE_INTERMEDIATE_RESULT = 5;
export const ERROR_SIGNATURE_INVALID = 6;
export const ERROR_BROADCAST_TRANSACTION = 7;
export const ERROR_INVALID_ADDRESS = 8;
export const ERROR_TX_INVALID = 9;

export const errorTypes = [
  {
    code: 0,
    message: 'Endpoint not implemented',
    retriable: false,
  },
  {
    code: 1,
    message: 'Endpoint unavailable offline',
    retriable: false,
  },
  {
    code: 2,
    message: 'Polkadot error',
    retriable: false,
  },
  {
    code: 3,
    message: 'Unable to decompress public key',
    retriable: false,
  },
  {
    code: 4,
    message: 'Unable to parse intent',
    retriable: false,
  },
  {
    code: 5,
    message: 'Unable to parse intermediate result',
    retriable: false,
  },
  {
    code: 6,
    message: 'Signature invalid',
    retriable: false,
  },
  {
    code: 7,
    message: 'Unable to broadcast transaction',
    retriable: false,
  },
  {
    code: 8,
    message: 'Invalid address',
    retriable: false,
  },
  {
    code: 9,
    message: 'Transaction invalid',
    retriable: false,
  },
];

export function throwError(type, description) {
  const error = errorTypes[type];
  throw new RosettaSDK.Client.Error(error.code, error.message, error.retriable, description);
}

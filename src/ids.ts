import { PublicKey, AccountInfo } from '@solana/web3.js';
import { Store } from './sdk/programs/plex/Store';

export const batchFile: string = './batch.json'


export const METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);

export const VAULT_ID = new PublicKey(
  'yvaUJxtAiuphyL7JiVMMdY7uTJe1ekb4LmHXtBv5SFd'
);

export const AUCTION_ID = new PublicKey(
  'yauNkf2KVyLp9YBQb4mNeiwFCCWu1Vei9Tx3EsgCESG'
);

export const METAPLEX_ID = new PublicKey(
  'yp1ZrQ2ghLMDNdaGdYLiwi8QRFyws2tAHNa7JG2VuTq'
);

/* wallet Package */
export const WALLET_PACKAGE = new PublicKey(
  'BsfNMxeoxUwQCV1zb1h5x1S6WCXeSDkzWaHMspuUj5UB'
);

/* metaplex program */
export const STORE_OWNER = new PublicKey(
  "2W5E5DF5r296bGvCqNCQs7jrSoaenLW8SMPUuZGCVXHY"
);


export const AUCTION_HOUSE_PROGRAM_ID = new PublicKey(
  "hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk"
);

export const AUCTION_HOUSE = new PublicKey(
  "CDByH24u5jioHVuupQeCVtHWhbge1gxQx1BHQgQQRaL"
);

export const AUCTION_HOUSE_FEE_PAYER = new PublicKey(
  "DpjQNASFoVyN5Erg6SanKoAYSicPc7Hug7XgpVBtirqa"
);

export const AUCTION_HOUSE_TREASURY = new PublicKey(
  "BbEFAb7tsyhJxuHzFsY1y6c7y23KXSSXHcHbactGqnTp"
);

export const AUCTION_HOUSE_AUTHORITY = new PublicKey(
  "2W5E5DF5r296bGvCqNCQs7jrSoaenLW8SMPUuZGCVXHY"
);

export const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112',
);

export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

export const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

export const MAX_RETRIES = 15;
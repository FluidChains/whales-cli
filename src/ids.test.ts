import { PublicKey, AccountInfo } from '@solana/web3.js';
import { Store } from './sdk/programs/plex/Store';

export const batchFile: string = './batch.json'


export const METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);

export const VAULT_ID = new PublicKey(
  '4CJLCFj8dhHmAC3TJizaN2BqkzW6hDeviZwH9qsSBjwH'
);

export const AUCTION_ID = new PublicKey(
  '2bhX9H5dAYaNqCHWVuJphto8eAwAxSQVRzvT5KJDs6eW'
);

export const METAPLEX_ID = new PublicKey(
  'Fr6ufqFxV3AuYEPYDvRjR2ghaCg6RyzvU3k9pC5z6x94'
);

/* wallet Package */
export const WALLET_PACKAGE = new PublicKey(
  '2W5E5DF5r296bGvCqNCQs7jrSoaenLW8SMPUuZGCVXHY'
);

/* metaplex program */
export const STORE_OWNER = new PublicKey(
  "5DvPxSWrMMJozx216tGBLrqwxDQ5o2iX7PakKaSreo6Z"
);

export const AUCTION_HOUSE_PROGRAM_ID = new PublicKey(
  "hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk"
);

export const AUCTION_HOUSE = new PublicKey(
  "GvH97dakw2FsJE8RHndfTUuMZKcSJX6cjvn66Ax9hEJ7"
);

export const AUCTION_HOUSE_FEE_PAYER = new PublicKey(
  "8Lg9ku7YRsNKnWgMkDVGmE6cgbF3ok6oJfXztRFoAVM4"
);

export const AUCTION_HOUSE_TREASURY = new PublicKey(
  "5ExvxcvkzQZeATdSy2oAEyfrbYP69nohmxPesvidYLGe"
);

export const AUCTION_HOUSE_AUTHORITY = new PublicKey(
  "8B3MJVBuWPKy7VjSawd2mgTXRNRbc6zVByoR2ifiEphT"
);

export const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112',
);

export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

export const MAX_RETRIES = 10;

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
  'FChaBfkLC15XNUGUc1JcTACBEozcfiWqqLVo4jcPdiKp'
);

/* metaplex program */
export const STORE_OWNER = new PublicKey(
  "5DvPxSWrMMJozx216tGBLrqwxDQ5o2iX7PakKaSreo6Z"
);


export const MAX_RETRIES = 15;
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Wallet } from './wallet';

import { sendTransaction } from './transactions';
import { Metadata, MetadataDataData } from '../programs/metadata/Metadata';
import { UpdateMetadata } from '../programs/metadata/UpdateMetadata';

/** Parameters for {@link updateMetadata} **/
export interface UpdateMetadataParams {
  connection: Connection;
  /** Must be the wallet of the current `updateAuthority` **/
  wallet: Wallet;
  /** Mint address for the NFT token  **/
  editionMint: PublicKey;
  /** An optional new {@link MetadataDataData} object to replace the current data. This will completely overwrite the data so all fields must be set explicitly. **/
  newMetadataData?: MetadataDataData;
  newUpdateAuthority?: PublicKey;
  /** This parameter can only be set to true once after which it can't be reverted to false **/
  primarySaleHappened?: boolean;
}

/**
 * Can be used to update any of the following parameters:
 * 1. Data inside {@link Metadata} as long as it remains mutable (which is only possible for a {@link MasterEdition})
 * 2. updateAuthority
 * 3. Whether the primary sale has happened (can only be set to true once after which it can't be reverted to false)
 */
export const updateMetadata = async (
  {
    connection,
    wallet,
    editionMint,
    newMetadataData,
    newUpdateAuthority,
    primarySaleHappened,
  } = {} as UpdateMetadataParams,
): Promise<Transaction> => {
  const metadata = await Metadata.getPDA(editionMint);

  const blockhash =  await connection.getLatestBlockhash();

  const updateTx = new UpdateMetadata(
    { feePayer: wallet.publicKey,
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight
     },
    {
      metadata,
      updateAuthority: wallet.publicKey,
      metadataData: newMetadataData,
      newUpdateAuthority,
      primarySaleHappened,
    },
  );
  return updateTx;
};
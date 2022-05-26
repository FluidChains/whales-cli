import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Transaction } from '../sdk/programs/core';
import { CreateAssociatedTokenAccount, CreateMint, MintTo } from '../sdk/transactions';

interface MintTxs {
  mint: Keypair;
  // recipient ATA
  recipient: PublicKey;
  createMintTx: Transaction;
  createAssociatedTokenAccountTx: Transaction;
  mintToTx: Transaction;
}

export async function prepareTokenAccountAndMintTxs(
  connection: Connection,
  owner: PublicKey,
  mintRent?: number,
): Promise<MintTxs> {
  const mint = Keypair.generate();

  const blockhash = await connection.getLatestBlockhash()    
  if(!mintRent)
  {
    mintRent = await connection.getMinimumBalanceForRentExemption(MintLayout.span);

  }
  const createMintTx = new CreateMint(
    {    
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight, 
        feePayer: owner
     },
    {
      newAccountPubkey: mint.publicKey,
      lamports: mintRent,
    },
  );

  const recipient = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint.publicKey,
    owner,
  );

  const createAssociatedTokenAccountTx = new CreateAssociatedTokenAccount(
    { 
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight, 
        feePayer: owner 
    },
    {
      associatedTokenAddress: recipient,
      splTokenMintAddress: mint.publicKey,
    },
  );

  const mintToTx = new MintTo(
    { 
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight, 
        feePayer: owner
     },
    {
      mint: mint.publicKey,
      dest: recipient,
      amount: 1,
    },
  );

  return { mint, createMintTx, createAssociatedTokenAccountTx, mintToTx, recipient };
}
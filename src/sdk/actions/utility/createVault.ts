import { Transaction } from '../../programs/core';
import { AccountLayout, MintLayout, NATIVE_MINT } from '@solana/spl-token';
import { Keypair, PublicKey, SystemProgram, TransactionSignature } from '@solana/web3.js';

import { Wallet } from '../wallet';
import { Connection } from '../Connection';
import { sendTransaction } from '../transactions';
import { CreateMint, CreateTokenAccount } from '../../transactions';
import { TransactionsBatch } from '../../utils/transactions-batch';
import { Vault } from '../../programs/vault/Vault';
import { VaultProgram } from '../../programs/vault/VaultProgram';
import { InitVault } from '../../programs/vault/InitVault';
import { VAULT_ID } from '../../../ids';

interface CreateVaultParams {
  connection: Connection;
  wallet: Wallet;
  priceMint: PublicKey;
  externalPriceAccount: PublicKey;
}

interface CreateVaultResponse {
  txId: TransactionSignature;
  vault: PublicKey;
  fractionMint: PublicKey;
  redeemTreasury: PublicKey;
  fractionTreasury: PublicKey;
}

// This command creates the external pricing oracle a vault
// This gets the vault ready for adding the tokens.
export const createVault = async ({
  connection,
  wallet,
  priceMint = NATIVE_MINT,
  externalPriceAccount,
}: CreateVaultParams): Promise<CreateVaultResponse> => {
  const accountRent = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);

  const mintRent = await connection.getMinimumBalanceForRentExemption(MintLayout.span);

  const vaultRent = await connection.getMinimumBalanceForRentExemption(Vault.MAX_VAULT_SIZE);

  const vault = Keypair.generate();

  const vaultAuthority = await Vault.getPDA(vault.publicKey);

  const txBatch = new TransactionsBatch({ transactions: [] });

  const fractionMint = Keypair.generate();
  const fractionMintTx = new CreateMint(
    { feePayer: wallet.publicKey },
    {
      newAccountPubkey: fractionMint.publicKey,
      lamports: mintRent,
      owner: vaultAuthority,
      freezeAuthority: vaultAuthority,
    },
  );
  txBatch.addTransaction(fractionMintTx);
  txBatch.addSigner(fractionMint);

  const redeemTreasury = Keypair.generate();
  const redeemTreasuryTx = new CreateTokenAccount(
    { feePayer: wallet.publicKey },
    {
      newAccountPubkey: redeemTreasury.publicKey,
      lamports: accountRent,
      mint: priceMint,
      owner: vaultAuthority,
    },
  );
  txBatch.addTransaction(redeemTreasuryTx);
  txBatch.addSigner(redeemTreasury);

  const fractionTreasury = Keypair.generate();
  const fractionTreasuryTx = new CreateTokenAccount(
    { feePayer: wallet.publicKey },
    {
      newAccountPubkey: fractionTreasury.publicKey,
      lamports: accountRent,
      mint: fractionMint.publicKey,
      owner: vaultAuthority,
    },
  );
  txBatch.addTransaction(fractionTreasuryTx);
  txBatch.addSigner(fractionTreasury);

  const uninitializedVaultTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: vault.publicKey,
      lamports: vaultRent,
      space: Vault.MAX_VAULT_SIZE,
      programId: VAULT_ID,
    }),
  );
  txBatch.addTransaction(uninitializedVaultTx);
  txBatch.addSigner(vault);

  const initVaultTx = new InitVault(
    { feePayer: wallet.publicKey },
    {
      vault: vault.publicKey,
      vaultAuthority: wallet.publicKey,
      fractionalTreasury: fractionTreasury.publicKey,
      pricingLookupAddress: externalPriceAccount,
      redeemTreasury: redeemTreasury.publicKey,
      fractionalMint: fractionMint.publicKey,
      allowFurtherShareCreation: true,
    },
  );
  txBatch.addTransaction(initVaultTx);

  const txId = await sendTransaction({
    connection,
    signers: txBatch.signers,
    txs: txBatch.transactions,
    wallet,
  });

  return {
    txId,
    vault: vault.publicKey,
    fractionMint: fractionMint.publicKey,
    redeemTreasury: redeemTreasury.publicKey,
    fractionTreasury: fractionTreasury.publicKey,
  };
};

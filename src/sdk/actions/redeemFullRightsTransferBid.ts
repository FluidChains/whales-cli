import { Keypair, PublicKey } from '@solana/web3.js';
import { AccountLayout } from '@solana/spl-token';
import { Wallet } from './wallet';
import { Connection } from './Connection';
import { sendTransaction } from './transactions';
import { TransactionsBatch } from '../utils/transactions-batch';
import { CreateTokenAccount } from '../transactions';
import { SafetyDepositConfig } from '../../context/safety-deposit-config';
import { AuctionExtended } from '../programs/auction/AuctionExtended';
import { BidderMetadata } from '../programs/auction/BidderMetadata';
import { Metadata } from '../programs/metadata/Metadata';
import { AuctionManager } from '../programs/plex/AuctionManager';
import { MetaplexProgram } from '../programs/plex/MetaplexProgram';
import { Vault } from '../programs/vault/Vault';
import { RedeemFullRightsTransferBid } from '../programs/plex/RedeemFullRightsTransferBid';
import { UpdatePrimarySaleHappenedViaToken } from '../programs/metadata/UpdatePrimarySaleHappenedViaToken';
import { METAPLEX_ID } from '../../ids';

export interface RedeemFullRightsTransferBidParams {
  connection: Connection;
  wallet: Wallet;
  auction: PublicKey;
  store: PublicKey;
}

export interface RedeemFullRightsTransferBidResponse {
  txId: string;
}

export const redeemFullRightsTransferBid = async ({
  connection,
  wallet,
  store,
  auction,
}: RedeemFullRightsTransferBidParams): Promise<RedeemFullRightsTransferBidResponse> => {
  // get data for transactions
  const bidder = wallet.publicKey;
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
  const auctionManager = await AuctionManager.getPDA(auction);
  const manager = await AuctionManager.load(connection, auctionManager);
  const vault = await Vault.load(connection, manager.data.vault);
  const fractionMint = new PublicKey(vault.data.fractionMint);
  const auctionExtended = await AuctionExtended.getPDA(vault.pubkey);
  // assuming we have 1 item
  const [safetyDepositBox] = await vault.getSafetyDepositBoxes(connection);
  const tokenMint = new PublicKey(safetyDepositBox.data.tokenMint);
  const safetyDepositTokenStore = new PublicKey(safetyDepositBox.data.store);
  const bidderMeta = await BidderMetadata.getPDA(auction, bidder);
  const bidRedemption = await getBidRedemptionPDA(auction, bidderMeta);
  const safetyDepositConfig = await SafetyDepositConfig.getPDA(
    auctionManager,
    safetyDepositBox.pubkey,
  );
  const transferAuthority = await Vault.getPDA(vault.pubkey);
  const metadata = await Metadata.getPDA(tokenMint);
  ////

  const txBatch = await getRedeemFRTBidTransactions({
    connection,
    accountRentExempt,
    tokenMint,
    bidder,
    bidderMeta,
    store,
    vault: vault.pubkey,
    auction,
    auctionExtended,
    auctionManager,
    fractionMint,
    safetyDepositTokenStore,
    safetyDeposit: safetyDepositBox.pubkey,
    bidRedemption,
    safetyDepositConfig,
    transferAuthority,
    metadata,
  });

  const txId = await sendTransaction({
    connection,
    wallet,
    txs: txBatch.toTransactions(),
    signers: txBatch.signers,
  });

  return { txId };
};

interface RedeemFRTBidTransactionsParams {
  connection: Connection,
  bidder: PublicKey;
  accountRentExempt: number;
  bidderPotToken?: PublicKey;
  bidderMeta: PublicKey;
  auction: PublicKey;
  auctionExtended: PublicKey;
  tokenMint: PublicKey;
  vault: PublicKey;
  store: PublicKey;
  auctionManager: PublicKey;
  bidRedemption: PublicKey;
  safetyDepositTokenStore: PublicKey;
  safetyDeposit: PublicKey;
  fractionMint: PublicKey;
  safetyDepositConfig: PublicKey;
  transferAuthority: PublicKey;
  metadata: PublicKey;
}

export const getRedeemFRTBidTransactions = async ({
  connection,
  accountRentExempt,
  bidder,
  tokenMint,
  store,
  vault,
  auction,
  auctionManager,
  auctionExtended,
  bidRedemption,
  bidderMeta: bidMetadata,
  safetyDepositTokenStore,
  safetyDeposit,
  fractionMint,
  safetyDepositConfig,
  transferAuthority,
  metadata,
}: RedeemFRTBidTransactionsParams) => {
  const txBatch = new TransactionsBatch({ transactions: [] });

  
  // create a new account for redeeming
  const account = Keypair.generate();
  const blockhash = await connection.getLatestBlockhash()
  const createDestinationTransaction = new CreateTokenAccount(
    { 
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      feePayer: bidder
     },
    {
      newAccountPubkey: account.publicKey,
      lamports: accountRentExempt,
      mint: tokenMint,
    },
  );
  txBatch.addSigner(account);
  txBatch.addTransaction(createDestinationTransaction);
  ////

  // create redeem bid
  const redeemBidTransaction = new RedeemFullRightsTransferBid(
    {
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
       feePayer: bidder
    },
    {
      store,
      vault,
      auction,
      auctionManager,
      bidRedemption,
      bidMetadata,
      safetyDepositTokenStore,
      destination: account.publicKey,
      safetyDeposit,
      fractionMint,
      bidder,
      safetyDepositConfig,
      auctionExtended,
      transferAuthority,
      newAuthority: bidder,
      masterMetadata: metadata,
    },
  );
  txBatch.addTransaction(redeemBidTransaction);
  ////


  // update primary sale happened via token
  const updatePrimarySaleHappenedViaTokenTransaction = new UpdatePrimarySaleHappenedViaToken(
    { 
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      feePayer: bidder },
    {
      metadata,
      owner: bidder,
      tokenAccount: account.publicKey,
    },
  );
  txBatch.addTransaction(updatePrimarySaleHappenedViaTokenTransaction);
  ////

  return txBatch;
};

export const getBidRedemptionPDA = async (auction: PublicKey, bidderMeta: PublicKey) => {
  return (
    await PublicKey.findProgramAddress(
      [Buffer.from(MetaplexProgram.PREFIX), auction.toBuffer(), bidderMeta.toBuffer()],
      METAPLEX_ID,
    )
  )[0];
};

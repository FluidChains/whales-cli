import { Borsh, Transaction } from '../core';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionBlockhashCtor,
  TransactionInstruction,
} from '@solana/web3.js';
import { VAULT_ID, METADATA_PROGRAM_ID, METAPLEX_ID } from '../../../ids';
import { MetadataProgram } from '../metadata/MetadataProgram';
import { ParamsWithStore } from '../vault/types';
import { VaultProgram } from '../vault/VaultProgram';
import { MetaplexProgram } from './MetaplexProgram';
import { ProxyCallAddress, RedeemUnusedWinningConfigItemsAsAuctioneerArgs } from './RedeemBid';

export class RedeemFullRightsTransferBidArgs extends Borsh.Data {
  static readonly SCHEMA = this.struct([['instruction', 'u8']]);

  instruction = 3;
}

type RedeemFullRightsTransferBidParams = {
  vault: PublicKey;
  auction: PublicKey;
  auctionManager: PublicKey;
  bidRedemption: PublicKey;
  bidMetadata: PublicKey;
  safetyDepositTokenStore: PublicKey;
  destination: PublicKey;
  safetyDeposit: PublicKey;
  fractionMint: PublicKey;
  bidder: PublicKey;
  safetyDepositConfig: PublicKey;
  auctionExtended: PublicKey;
  transferAuthority: PublicKey;
  masterMetadata: PublicKey;
  newAuthority: PublicKey;
  auctioneerReclaimIndex?: number;
};

export class RedeemFullRightsTransferBid extends Transaction {
  constructor(
    options: TransactionBlockhashCtor,
    params: ParamsWithStore<RedeemFullRightsTransferBidParams>,
  ) {
    super(options);
    const { feePayer } = options;
    const {
      store,
      vault,
      auction,
      auctionExtended,
      auctionManager,
      bidRedemption,
      bidMetadata,
      safetyDepositTokenStore,
      destination,
      safetyDeposit,
      fractionMint,
      bidder,
      safetyDepositConfig,
      transferAuthority,
      masterMetadata,
      newAuthority,
      auctioneerReclaimIndex,
    } = params;

    const data = auctioneerReclaimIndex
      ? RedeemUnusedWinningConfigItemsAsAuctioneerArgs.serialize({
          winningConfigItemIndex: auctioneerReclaimIndex,
          proxyCall: ProxyCallAddress.RedeemFullRightsTransferBid,
        })
      : RedeemFullRightsTransferBidArgs.serialize();

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: auctionManager,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: safetyDepositTokenStore,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: destination,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: bidRedemption,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: safetyDeposit,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: vault,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: fractionMint,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: auction,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: bidMetadata,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: bidder,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: feePayer,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: VAULT_ID,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: METADATA_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: store,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: masterMetadata,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: newAuthority,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: transferAuthority,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: safetyDepositConfig,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: auctionExtended,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: METAPLEX_ID,
        data,
      }),
    );
  }
}
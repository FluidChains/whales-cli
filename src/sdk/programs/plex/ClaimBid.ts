import { Borsh, Transaction } from '../core';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  TransactionBlockhashCtor,
  TransactionInstruction,
} from '@solana/web3.js';
import { AUCTION_ID, METAPLEX_ID } from '../../../ids';
import { AuctionProgram } from '../auction/AuctionProgram';
import { ParamsWithStore } from '../vault/types';
import { MetaplexProgram } from './MetaplexProgram';

export class ClaimBidArgs extends Borsh.Data {
  static readonly SCHEMA = this.struct([['instruction', 'u8']]);

  instruction = 6;
}

type ClaimBidParams = {
  vault: PublicKey;
  auction: PublicKey;
  auctionExtended: PublicKey;
  auctionManager: PublicKey;
  acceptPayment: PublicKey;
  bidder: PublicKey;
  bidderPot: PublicKey;
  bidderPotToken: PublicKey;
  tokenMint: PublicKey;
};

export class ClaimBid extends Transaction {
  constructor(options: TransactionBlockhashCtor, params: ParamsWithStore<ClaimBidParams>) {
    super(options);
    const {
      store,
      vault,
      auction,
      auctionExtended,
      auctionManager,
      bidder,
      bidderPot,
      bidderPotToken,
      acceptPayment,
      tokenMint,
    } = params;

    const data = ClaimBidArgs.serialize();

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: acceptPayment,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: bidderPotToken,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: bidderPot,
            isSigner: false,
            isWritable: true,
          },

          {
            pubkey: auctionManager,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: auction,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: bidder,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: tokenMint,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: vault,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: store,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: AUCTION_ID,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: SYSVAR_CLOCK_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: TOKEN_PROGRAM_ID,
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
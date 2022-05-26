import { Borsh, Transaction } from '../core';
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  TransactionBlockhashCtor,
  TransactionInstruction,
} from '@solana/web3.js';
import { AuctionProgram } from '../auction/AuctionProgram';
import { ParamsWithStore } from '../vault/types';
import { MetaplexProgram } from './MetaplexProgram';
import { AUCTION_ID, METAPLEX_ID } from '../../../ids';


export class StartAuctionArgs extends Borsh.Data {
  static readonly SCHEMA = this.struct([['instruction', 'u8']]);

  instruction = 5;
}

type StartAuctionParams = {
  auction: PublicKey;
  auctionManager: PublicKey;
  auctionManagerAuthority: PublicKey;
};

export class StartAuction extends Transaction {
  constructor(options: TransactionBlockhashCtor, params: ParamsWithStore<StartAuctionParams>) {
    super(options);
    const { store, auction, auctionManager, auctionManagerAuthority } = params;

    const data = StartAuctionArgs.serialize();

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: auctionManager,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: auction,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: auctionManagerAuthority,
            isSigner: true,
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
        ],
        programId: METAPLEX_ID,
        data,
      }),
    );
  }
}
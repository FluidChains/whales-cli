import { Borsh, TupleNumericType, Transaction } from '../core';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionBlockhashCtor,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { ParamsWithStore } from '../vault/types';
import { MetaplexProgram } from './MetaplexProgram';
import { METAPLEX_ID } from '../../../ids';


export class InitAuctionManagerV2Args extends Borsh.Data<{
  amountType: TupleNumericType;
  lengthType: TupleNumericType;
  maxRanges: BN;
}> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['amountType', 'u8'],
    ['lengthType', 'u8'],
    ['maxRanges', 'u64'],
  ]);

  instruction = 17;
  amountType: TupleNumericType = TupleNumericType.U8;
  lengthType: TupleNumericType = TupleNumericType.U8;
  maxRanges: BN = new BN(1);
}

type InitAuctionManagerV2Params = {
  vault: PublicKey;
  auction: PublicKey;
  auctionManager: PublicKey;
  auctionManagerAuthority: PublicKey;
  acceptPaymentAccount: PublicKey;
  tokenTracker: PublicKey;
  amountType: TupleNumericType;
  lengthType: TupleNumericType;
  maxRanges: BN;
};

export class InitAuctionManagerV2 extends Transaction {
  constructor(options: TransactionBlockhashCtor, params: ParamsWithStore<InitAuctionManagerV2Params>) {
    super(options);
    const { feePayer } = options;
    const {
      store,
      vault,
      auction,
      auctionManager,
      auctionManagerAuthority,
      acceptPaymentAccount,
      tokenTracker,
      amountType,
      lengthType,
      maxRanges,
    } = params;

    const data = InitAuctionManagerV2Args.serialize({ amountType, lengthType, maxRanges });

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: auctionManager,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: tokenTracker,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: vault,
            isSigner: false,
            isWritable: false,
          },

          {
            pubkey: auction,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: auctionManagerAuthority,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: feePayer,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: acceptPaymentAccount,
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
        ],
        programId: METAPLEX_ID,
        data,
      }),
    );
  }
}
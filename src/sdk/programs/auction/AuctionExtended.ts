import {
    Account,
    Borsh,
    ERROR_INVALID_ACCOUNT_DATA,
    ERROR_INVALID_OWNER,
    AnyPublicKey,
  } from '../core';
  import BN from 'bn.js';
  import { AuctionProgram } from './AuctionProgram';
  import { Buffer } from 'buffer';
  import { AccountInfo, PublicKey } from '@solana/web3.js';
import { AUCTION_ID } from '../../../ids';
  
  type Args = {
    totalUncancelledBids: BN;
    tickSize: BN | null;
    gapTickSizePercentage: number | null;
    instantSalePrice: BN | null;
    name: number[] | null;
  };
  export class AuctionDataExtended extends Borsh.Data<Args> {
    static readonly SCHEMA = AuctionDataExtended.struct([
      ['totalUncancelledBids', 'u64'],
      ['tickSize', { kind: 'option', type: 'u64' }],
      ['gapTickSizePercentage', { kind: 'option', type: 'u8' }],
      ['instantSalePrice', { kind: 'option', type: 'u64' }],
      ['name', { kind: 'option', type: [32] }],
    ]);
  
    totalUncancelledBids: BN;
    tickSize: BN | null;
    gapTickSizePercentage: number | null;
    instantSalePrice: BN | null;
    name: number[] | null;
  }
  
  export class AuctionExtended extends Account<AuctionDataExtended> {
    static readonly DATA_SIZE = 8 + 9 + 2 + 200;
  
    constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
      super(pubkey, info);
  
      if (!this.assertOwner(AUCTION_ID)) {
        throw ERROR_INVALID_OWNER();
      }
  
      if (!AuctionExtended.isCompatible(this.info.data)) {
        throw ERROR_INVALID_ACCOUNT_DATA();
      }
  
      this.data = AuctionDataExtended.deserialize(this.info.data);
    }
  
    static override isCompatible(data: Buffer) {
      return data.length === AuctionExtended.DATA_SIZE;
    }
  
    static getPDA(vault: AnyPublicKey) {
      return AuctionProgram.findProgramAddress([
        Buffer.from(AuctionProgram.PREFIX),
        AUCTION_ID.toBuffer(),
        new PublicKey(vault).toBuffer(),
        Buffer.from(AuctionProgram.EXTENDED),
      ]);
    }
  }
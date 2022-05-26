import {
    Account,
    Borsh,
    ERROR_INVALID_ACCOUNT_DATA,
    ERROR_INVALID_OWNER,
    AnyPublicKey,
    StringPublicKey,
  } from '../core';
  import { AuctionProgram } from './AuctionProgram';
  import { AccountInfo, PublicKey } from '@solana/web3.js';
  import { Buffer } from 'buffer';
import { AUCTION_ID } from '../../../ids';
  
  type Args = {
    bidderPot: StringPublicKey;
    bidderAct: StringPublicKey;
    auctionAct: StringPublicKey;
    emptied: boolean;
  };
  export class BidderPotData extends Borsh.Data<Args> {
    static readonly SCHEMA = BidderPotData.struct([
      ['bidderPot', 'pubkeyAsString'],
      ['bidderAct', 'pubkeyAsString'],
      ['auctionAct', 'pubkeyAsString'],
      ['emptied', 'u8'],
    ]);
  
    /// Points at actual pot that is a token account
    bidderPot: StringPublicKey;
    /// Originating bidder account
    bidderAct: StringPublicKey;
    /// Auction account
    auctionAct: StringPublicKey;
    /// emptied or not
    emptied: boolean;
  }
  
  export class BidderPot extends Account<BidderPotData> {
    static readonly DATA_SIZE = 32 + 32 + 32 + 1;
  
    constructor(key: AnyPublicKey, info: AccountInfo<Buffer>) {
      super(key, info);
  
      if (!this.assertOwner(AUCTION_ID)) {
        throw ERROR_INVALID_OWNER();
      }
  
      if (!BidderPot.isCompatible(this.info.data)) {
        throw ERROR_INVALID_ACCOUNT_DATA();
      }
  
      this.data = BidderPotData.deserialize(this.info.data);
    }
  
    static override isCompatible(data: Buffer) {
      return data.length === BidderPot.DATA_SIZE;
    }
  
    static getPDA(auction: AnyPublicKey, bidder: AnyPublicKey) {
      return AuctionProgram.findProgramAddress([
        Buffer.from(AuctionProgram.PREFIX),
        AUCTION_ID.toBuffer(),
        new PublicKey(auction).toBuffer(),
        new PublicKey(bidder).toBuffer(),
      ]);
    }
  }
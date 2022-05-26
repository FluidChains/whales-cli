import {
    Account,
    AnyPublicKey,
    ERROR_INVALID_ACCOUNT_DATA,
    ERROR_INVALID_OWNER,
    TupleNumericType,
    getBNFromData,
  } from '../core';
  import { AccountInfo, PublicKey } from '@solana/web3.js';
  import BN from 'bn.js';
  import { Buffer } from 'buffer';
import { METAPLEX_ID } from '../../../ids';
  import { MetaplexKey, MetaplexProgram } from './MetaplexProgram';
  import { AmountRange } from './SafetyDepositConfig';
  
  export interface AuctionWinnerTokenTypeTrackerData {
    key: MetaplexKey;
    amountType: TupleNumericType;
    lengthType: TupleNumericType;
    amountRanges: AmountRange[];
  }
  
  export class AuctionWinnerTokenTypeTracker extends Account<AuctionWinnerTokenTypeTrackerData> {
    constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
      super(pubkey, info);
  
      if (!this.assertOwner(METAPLEX_ID)) {
        throw ERROR_INVALID_OWNER();
      }
  
      if (!AuctionWinnerTokenTypeTracker.isCompatible(this.info.data)) {
        throw ERROR_INVALID_ACCOUNT_DATA();
      }
  
      this.data = deserialize(this.info.data);
    }
  
    static override isCompatible(data: Buffer) {
      return data[0] === MetaplexKey.AuctionWinnerTokenTypeTrackerV1;
    }
  
    static async getPDA(auctionManager: AnyPublicKey) {
      return MetaplexProgram.findProgramAddress([
        Buffer.from(MetaplexProgram.PREFIX),
        METAPLEX_ID.toBuffer(),
        new PublicKey(auctionManager).toBuffer(),
        Buffer.from(MetaplexProgram.TOTALS),
      ]);
    }
  }
  
  const deserialize = (buffer: Buffer) => {
    const data: AuctionWinnerTokenTypeTrackerData = {
      key: MetaplexKey.SafetyDepositConfigV1,
      amountType: buffer[1],
      lengthType: buffer[2],
      amountRanges: [],
    };
  
    const lengthOfArray = new BN(buffer.slice(3, 7), 'le');
    let offset = 7;
  
    for (let i = 0; i < lengthOfArray.toNumber(); i++) {
      const amount = getBNFromData(buffer, offset, data.amountType);
      offset += data.amountType;
      const length = getBNFromData(buffer, offset, data.lengthType);
      offset += data.lengthType;
      data.amountRanges.push({ amount, length });
    }
  
    return data;
  };
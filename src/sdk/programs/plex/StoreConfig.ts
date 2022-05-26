import {
    ERROR_INVALID_ACCOUNT_DATA,
    ERROR_INVALID_OWNER,
    AnyPublicKey,
    Borsh,
    Account,
  } from '../core';
  import { AccountInfo, PublicKey } from '@solana/web3.js';
  import { Buffer } from 'buffer';
import { METAPLEX_ID } from '../../../ids';
  import { MetaplexKey, MetaplexProgram } from './MetaplexProgram';
  
  type Args = {
    settingsUri: string;
  };
  export class StoreConfigData extends Borsh.Data<Args> {
    static readonly SCHEMA = this.struct([
      ['key', 'u8'],
      ['settingsUri', { kind: 'option', type: 'string' }],
    ]);
  
    key: MetaplexKey = MetaplexKey.StoreConfigV1;
    settingsUri: string;
  
    constructor(args: Args) {
      super(args);
      this.key = MetaplexKey.StoreConfigV1;
    }
  }
  
  export class StoreConfig extends Account<StoreConfigData> {
    constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
      super(pubkey, info);
  
      if (!this.assertOwner(METAPLEX_ID)) {
        throw ERROR_INVALID_OWNER();
      }
  
      if (!StoreConfig.isCompatible(this.info.data)) {
        throw ERROR_INVALID_ACCOUNT_DATA();
      }
  
      this.data = StoreConfigData.deserialize(this.info.data);
    }
  
    static override isCompatible(data: Buffer) {
      return data[0] === MetaplexKey.StoreConfigV1;
    }
  
    static async getPDA(store: AnyPublicKey) {
      return MetaplexProgram.findProgramAddress([
        Buffer.from(MetaplexProgram.PREFIX),
        METAPLEX_ID.toBuffer(),
        Buffer.from(MetaplexProgram.CONFIG),
        new PublicKey(store).toBuffer(),
      ],
      );
    }
  }
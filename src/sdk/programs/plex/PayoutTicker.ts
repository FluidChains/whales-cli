import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import bs58 from 'bs58';
import {
  AnyPublicKey,
  StringPublicKey,
  Account,
  Borsh,
  ERROR_INVALID_ACCOUNT_DATA,
  ERROR_INVALID_OWNER,
} from '../core';
import { MetaplexKey, MetaplexProgram } from './MetaplexProgram';
import { Buffer } from 'buffer';
import { METAPLEX_ID } from '../../../ids';


type Args = { recipient: StringPublicKey; amountPaid: BN };
export class PayoutTicketData extends Borsh.Data<Args> {
  static readonly SCHEMA = this.struct([
    ['key', 'u8'],
    ['recipient', 'pubkeyAsString'],
    ['amountPaid', 'u64'],
  ]);

  key: MetaplexKey;
  recipient: StringPublicKey;
  amountPaid: BN;

  constructor(args: Args) {
    super(args);
    this.key = MetaplexKey.PayoutTicketV1;
  }
}

export class PayoutTicket extends Account<PayoutTicketData> {
  constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
    super(pubkey, info);

    if (!this.assertOwner(METAPLEX_ID)) {
      throw ERROR_INVALID_OWNER();
    }

    if (!PayoutTicket.isCompatible(this.info.data)) {
      throw ERROR_INVALID_ACCOUNT_DATA();
    }

    this.data = PayoutTicketData.deserialize(this.info.data);
  }

  static override isCompatible(data: Buffer) {
    return data[0] === MetaplexKey.PayoutTicketV1;
  }

  static async getPayoutTicketsByRecipient(connection: Connection, recipient: AnyPublicKey) {
    return (
      await MetaplexProgram.getProgramAccounts(connection, {
        filters: [
          // Filter for PayoutTicketV1 by key
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(Buffer.from([MetaplexKey.PayoutTicketV1])),
            },
          },
          // Filter for assigned to recipient
          {
            memcmp: {
              offset: 1,
              bytes: new PublicKey(recipient).toBase58(),
            },
          },
        ],
      })
    ).map((account) => PayoutTicket.from(account));
  }
}
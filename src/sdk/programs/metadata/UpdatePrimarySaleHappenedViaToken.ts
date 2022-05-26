import { Borsh, Transaction } from '../core';
import { PublicKey, TransactionBlockhashCtor, TransactionInstruction } from '@solana/web3.js';
import { METADATA_PROGRAM_ID } from '../../../ids';
import { MetadataProgram } from './MetadataProgram';

export class UpdatePrimarySaleHappenedViaTokenArgs extends Borsh.Data {
  static readonly SCHEMA = UpdatePrimarySaleHappenedViaTokenArgs.struct([['instruction', 'u8']]);

  instruction = 4;
}

type UpdatePrimarySaleHappenedViaTokenParams = {
  metadata: PublicKey;
  owner: PublicKey;
  tokenAccount: PublicKey;
};

export class UpdatePrimarySaleHappenedViaToken extends Transaction {
  constructor(options: TransactionBlockhashCtor, params: UpdatePrimarySaleHappenedViaTokenParams) {
    super(options);
    const { metadata, owner, tokenAccount } = params;

    const data = UpdatePrimarySaleHappenedViaTokenArgs.serialize();

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: metadata,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: owner,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: tokenAccount,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: METADATA_PROGRAM_ID,
        data,
      }),
    );
  }
}
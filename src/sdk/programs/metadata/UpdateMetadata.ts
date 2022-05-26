import { Borsh, Transaction } from '../core';
import { PublicKey, TransactionBlockhashCtor, TransactionInstruction } from '@solana/web3.js';
import { METADATA_PROGRAM_ID } from '../../../ids';
import { MetadataDataData } from './Metadata';
import { MetadataProgram } from './MetadataProgram';

export class UpdateMetadataArgs extends Borsh.Data<{
  data?: MetadataDataData;
  updateAuthority?: string;
  primarySaleHappened: boolean | null;
}> {
  static readonly SCHEMA = new Map([
    ...MetadataDataData.SCHEMA,
    ...UpdateMetadataArgs.struct([
      ['instruction', 'u8'],
      ['data', { kind: 'option', type: MetadataDataData }],
      ['updateAuthority', { kind: 'option', type: 'pubkeyAsString' }],
      ['primarySaleHappened', { kind: 'option', type: 'u8' }],
    ]),
  ]);

  instruction = 1;
  // NOTE: do not add "=null". This breaks serialization.
  data: MetadataDataData | null;
  updateAuthority: string | null;
  primarySaleHappened: boolean | null;
}

type UpdateMetadataParams = {
  metadata: PublicKey;
  updateAuthority: PublicKey;
  metadataData?: MetadataDataData;
  newUpdateAuthority?: PublicKey;
  primarySaleHappened?: boolean | null;
};

export class UpdateMetadata extends Transaction {
  constructor(options: TransactionBlockhashCtor, params: UpdateMetadataParams) {
    super(options);
    const { metadata, metadataData, updateAuthority, newUpdateAuthority, primarySaleHappened } =
      params;

    const data = UpdateMetadataArgs.serialize({
      data: metadataData,
      updateAuthority: newUpdateAuthority && newUpdateAuthority.toString(),
      primarySaleHappened: primarySaleHappened || null,
    });

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: metadata,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: updateAuthority,
            isSigner: true,
            isWritable: false,
          },
        ],
        programId: METADATA_PROGRAM_ID,
        data,
      }),
    );
  }
}
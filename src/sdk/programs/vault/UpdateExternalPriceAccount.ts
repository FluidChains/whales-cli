import { Borsh, Transaction } from '../core';
import { PublicKey, TransactionBlockhashCtor, TransactionInstruction } from '@solana/web3.js';
import { VaultInstructions } from './VaultProgram';
import { ExternalPriceAccountData } from './ExternalPriceAccount';
import { VaultProgram } from './VaultProgram';
import { VAULT_ID } from '../../../ids';

export class UpdateExternalPriceAccountArgs extends Borsh.Data<{
  externalPriceAccount: ExternalPriceAccountData;
}> {
  static readonly SCHEMA = new Map([
    ...ExternalPriceAccountData.SCHEMA,
    ...this.struct([
      ['instruction', 'u8'],
      ['externalPriceAccount', ExternalPriceAccountData],
    ]),
  ]);

  instruction = VaultInstructions.UpdateExternalPriceAccount;
  externalPriceAccount: ExternalPriceAccountData;
}

type UpdateExternalPriceAccountParams = {
  externalPriceAccount: PublicKey;
  externalPriceAccountData: ExternalPriceAccountData;
};

export class UpdateExternalPriceAccount extends Transaction {
  constructor(options: TransactionBlockhashCtor, params: UpdateExternalPriceAccountParams) {
    super(options);
    const { externalPriceAccount, externalPriceAccountData } = params;

    const data = UpdateExternalPriceAccountArgs.serialize({
      externalPriceAccount: externalPriceAccountData,
    });

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: externalPriceAccount,
            isSigner: false,
            isWritable: true,
          },
        ],
        programId: VAULT_ID,
        data,
      }),
    );
  }
}
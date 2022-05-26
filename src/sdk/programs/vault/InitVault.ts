import { Borsh, Transaction } from '../core';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionBlockhashCtor,
  TransactionInstruction,
} from '@solana/web3.js';
import { VAULT_ID } from '../../../ids';
import { VaultInstructions } from './VaultProgram';
import { VaultProgram } from './VaultProgram';

export class InitVaultArgs extends Borsh.Data<{ allowFurtherShareCreation: boolean }> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['allowFurtherShareCreation', 'u8'],
  ]);

  instruction = VaultInstructions.InitVault;
  allowFurtherShareCreation = false;
}

type InitVaultParams = {
  vault: PublicKey;
  vaultAuthority: PublicKey;
  fractionalMint: PublicKey;
  redeemTreasury: PublicKey;
  fractionalTreasury: PublicKey;
  pricingLookupAddress: PublicKey;
  allowFurtherShareCreation: boolean;
};

export class InitVault extends Transaction {
  constructor(options: TransactionBlockhashCtor, params: InitVaultParams) {
    super(options);
    const {
      vault,
      vaultAuthority,
      fractionalMint,
      redeemTreasury,
      fractionalTreasury,
      pricingLookupAddress,
      allowFurtherShareCreation,
    } = params;

    const data = InitVaultArgs.serialize({ allowFurtherShareCreation });

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: fractionalMint,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: redeemTreasury,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: fractionalTreasury,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: vault,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: vaultAuthority,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: pricingLookupAddress,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },

          {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: VAULT_ID,
        data,
      }),
    );
  }
}
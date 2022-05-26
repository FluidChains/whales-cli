import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, TransactionBlockhashCtor, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { VaultInstructions } from './VaultProgram';
import { NumberOfShareArgs, Vault } from './Vault';
import { VaultProgram } from './VaultProgram';
import { Transaction } from '../core';
import { VAULT_ID } from '../../../ids';

type ActivateVaultParams = {
  vault: PublicKey;
  fractionMint: PublicKey;
  fractionTreasury: PublicKey;
  fractionMintAuthority: PublicKey;
  vaultAuthority: PublicKey;
  numberOfShares: BN;
};

export class ActivateVault extends Transaction {
  constructor(options: TransactionBlockhashCtor, params: ActivateVaultParams) {
    super(options);
    const {
      vault,
      vaultAuthority,
      fractionMint,
      fractionTreasury,
      fractionMintAuthority,
      numberOfShares,
    } = params;

    const data = NumberOfShareArgs.serialize({
      instruction: VaultInstructions.ActivateVault,
      numberOfShares,
    });

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: vault,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: fractionMint,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: fractionTreasury,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: fractionMintAuthority,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: vaultAuthority,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: VaultProgram.PUBKEY,
        data,
      }),
    );
  }
}
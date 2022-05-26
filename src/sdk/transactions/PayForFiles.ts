import { Transaction } from '../programs/core';
import {
  PublicKey,
  SystemProgram,
  TransactionBlockhashCtor,
  TransactionInstruction,
} from '@solana/web3.js';
import { config } from '../programs/core';
import { Buffer } from 'buffer';

type PayForFilesParams = {
  lamports: number;
  fileHashes: Buffer[];
  arweaveWallet?: PublicKey;
};

export class PayForFiles extends Transaction {
  constructor(options: TransactionBlockhashCtor, params: PayForFilesParams) {
    const { feePayer } = options;
    const { lamports, fileHashes, arweaveWallet } = params;

    super(options);

    this.add(
      SystemProgram.transfer({
        fromPubkey: feePayer,
        toPubkey: arweaveWallet ?? new PublicKey(config.arweaveWallet),
        lamports,
      }),
    );

    fileHashes.forEach((data) => {
      this.add(
        new TransactionInstruction({
          keys: [],
          programId: new PublicKey(config.programs.memo),
          data,
        }),
      );
    });
  }
}

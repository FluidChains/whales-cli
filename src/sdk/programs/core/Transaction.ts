import { Transaction as SolanaTransaction, TransactionBlockhashCtor } from '@solana/web3.js';

export class Transaction extends SolanaTransaction {
  constructor(options?: TransactionBlockhashCtor) {
    super(options);
  }

  static fromCombined(transactions: Transaction[], options: TransactionBlockhashCtor = {
    blockhash: '',
    lastValidBlockHeight: 0
  }) {
    const combinedTransaction = new Transaction(options);
    transactions.forEach((transaction) =>
      transaction.instructions.forEach((instruction) => {
        combinedTransaction.add(instruction);
      }),
    );
    return combinedTransaction;
  }
}
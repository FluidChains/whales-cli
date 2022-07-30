
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import os from 'os';
import fs from 'mz/fs';
import path from 'path';
import yaml from 'yaml';
import {Connection, Keypair, PublicKey, sendAndConfirmRawTransaction} from '@solana/web3.js';
import { Transaction } from './sdk/programs/core';
import { BatchMint, MetadataJson, TransactionsBatchParams } from './types';

import axios, { AxiosResponse } from "axios";
import { AUCTION_HOUSE_PROGRAM_ID, MAX_RETRIES, SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID, TOKEN_PROGRAM_ID } from './ids';
import base58 from 'bs58';
import moment from 'moment';
import BN from 'bn.js';
import { AccountLayout, MintLayout } from '@solana/spl-token';


/**
 * @private
 */
export async function getConfig(): Promise<any> {
  // Path to Solana CLI config file
  const CONFIG_FILE_PATH = path.resolve(
    os.homedir(),
    '.config',
    'solana',
    'cli',
    'config.yml',
  );
  const configYml = await fs.readFile(CONFIG_FILE_PATH, {encoding: 'utf8'});
  return yaml.parse(configYml);
}

/**
 * Load and parse the Solana CLI config file to determine which RPC url to use
 */
export async function getRpcUrl(): Promise<string> {
  try {
    const config = await getConfig();
    if (!config.json_rpc_url) throw new Error('Missing RPC URL');
    return config.json_rpc_url;
  } catch (err) {
    console.warn(
      'Failed to read RPC url from CLI config file, falling back to localhost',
    );
    return 'http://127.0.0.1:8899';
  }
}

/**
 * Load and parse the Solana CLI config file to determine which payer to use
 */
export async function getPayer(): Promise<Keypair> {
  try {
    const config = await getConfig();
    if (!config.keypair_path) throw new Error('Missing keypair path');
    return await createKeypairFromFile(config.keypair_path);
  } catch (err) {
    console.warn(
      'Failed to create keypair from CLI config file, falling back to new random keypair',
    );
    return Keypair.generate();
  }
}

/**
 * Create a Keypair from a secret key stored in file as bytes' array
 */
export async function createKeypairFromFile(
  filePath: string,
): Promise<Keypair> {
  const secretKeyString = await fs.readFile(filePath, {encoding: 'utf8'});
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return Keypair.fromSecretKey(secretKey);
}

export class TransactionsBatch {
    beforeTransactions: Transaction[];
    transactions: Transaction[];
    afterTransactions: Transaction[];
  
    signers: Keypair[] = [];
  
    constructor(
      {
      beforeTransactions = [],
      transactions,
      afterTransactions = [],
    }: TransactionsBatchParams) {
      this.beforeTransactions = beforeTransactions;
      this.transactions = transactions;
      this.afterTransactions = afterTransactions;
      
    }
  
    addSigner(signer: Keypair) {
      this.signers.push(signer);
    }
  
    addBeforeTransaction(transaction: Transaction) {
      this.beforeTransactions.push(transaction);
    }
  
    addTransaction(transaction: Transaction) {
      this.transactions.push(transaction);
    }
  
    addAfterTransaction(transaction: Transaction) {
      this.afterTransactions.push(transaction);
    }
  
    toTransactions() {
      return [...this.beforeTransactions, ...this.transactions, ...this.afterTransactions];
    }
  
    toInstructions() {
      return this.toTransactions().flatMap((t) => t.instructions);
    }
  }

  export async function retrieveMetadata(batch: BatchMint[]) {
  

    const completeBatch: BatchMint[] = []
    for(let mintBach of batch)
    {
      try {
            
        const data = await axios.get<string, AxiosResponse<MetadataJson>>(mintBach.uri);
          completeBatch.push({
            maxSupply: mintBach.maxSupply,
            price: mintBach.price,
            reserved: mintBach.reserved,
            uri: mintBach.uri,
            metadata: {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              attributes: data.data.attributes!,
              creators: data.data.properties.creators,
              name: data.data.name,
              seller_fee_basis_points: data.data.seller_fee_basis_points,
              symbol: data.data.symbol
             }
          })
  
    
      } catch(e) {
        throw new Error(`unable to get metadata json from url ${mintBach.uri}: ${e} `);
      }
    }
    
    return completeBatch;
  
  
  }

  export async function confirmTransactions( connection: Connection, tx: Transaction) {
    let confirmedTx: string = null
    for (let tries = 0; tries < MAX_RETRIES; tries++) {
      const blockhash = await connection.getLatestBlockhash()
      confirmedTx = await sendAndConfirmRawTransaction(connection, tx.serialize(),{
         blockhash: blockhash.blockhash,
         lastValidBlockHeight: blockhash.lastValidBlockHeight,
         signature: base58.encode(tx.signature)
      });


      const blockhashConfirmTx = await connection.getLatestBlockhash()
      const txBase58 = base58.encode(tx.signature)
      const confirmTr = await connection.confirmTransaction({
        blockhash: blockhashConfirmTx.blockhash,
        lastValidBlockHeight: blockhashConfirmTx.lastValidBlockHeight,
        signature: txBase58
      })

      console.log(`${formatteDate()}: Confirmed: Context ${confirmTr.context.slot}. Value ${confirmTr.value.err} `)


      console.log(`${formatteDate()}: Validating ${confirmedTx}`)
      console.log(`${formatteDate()}: Tries ${tries} for TxIns: ${tx}`)
      console.log(`${formatteDate()}: TransactionIns: ${tx.instructions.toString()}`)

  
      if (confirmedTx) break
      await sleep(30000)
    }
    if (!confirmedTx)
    {
      console.log("ValidateFailed ",confirmedTx)
      throw new Error("Could not find requested transaction")
    } 
  
    return confirmedTx;
  
  }
  


  export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  export function formatteDate () {
    return (moment(new Date())).format('YYYY-MM-DD HH:mm:ss')
  }

  export async function getAuctionHouseTradeState (
    auctionHouse: PublicKey,
    wallet: PublicKey,
    tokenAccount: PublicKey,
    treasuryMint: PublicKey,
    tokenMint: PublicKey,
    tokenSize: BN,
    buyPrice: BN,
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from('auction_house'),
        wallet.toBuffer(),
        auctionHouse.toBuffer(),
        tokenAccount.toBuffer(),
        treasuryMint.toBuffer(),
        tokenMint.toBuffer(),
        buyPrice.toBuffer('le', 8),
        tokenSize.toBuffer('le', 8),
      ],
      AUCTION_HOUSE_PROGRAM_ID,
    );
  };

  export const getAtaForMint = async (
    mint: PublicKey,
    buyer: PublicKey,
  ): Promise<[PublicKey, number]> => {
    return await PublicKey.findProgramAddress(
      [buyer.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    );
  };

  export async function checkMinimumBalances(connection, wallet) {
    let fees = 0;
    const feeCalculator = await connection.getMinimumBalanceForRentExemption(MintLayout.span);
    fees += await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
    fees += feeCalculator * 100; // wag
    
    let lamports = await connection.getBalance(wallet.publicKey);

    if (lamports < fees) {
      // If current balance is not enough to pay for fees, request an airdrop
      return false
    }
    else {
      return true
    }

  }
  
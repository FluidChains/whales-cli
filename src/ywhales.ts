/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
    Keypair,
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
    SystemProgram,
    TransactionInstruction,
    Transaction,
    sendAndConfirmTransaction,
  } from '@solana/web3.js';
  import fs from 'mz/fs';
  import path from 'path';
  import * as borsh from 'borsh';
  import { AccountLayout, MintLayout } from '@solana/spl-token';

  

  
  import {getPayer, getRpcUrl, createKeypairFromFile} from './utils';
  
  /**
   * Connection to the network
   */
  let connection: Connection;
  
  /**
   * Keypair associated to the fees' payer
   */
  let payer: Keypair;
  
  /**
   * Establish a connection to the cluster
   */
  export async function establishConnection(): Promise<Connection> {
    const rpcUrl = await getRpcUrl();
    connection = new Connection(rpcUrl, {commitment: 'confirmed', confirmTransactionInitialTimeout: 60000});
    const version = await connection.getVersion();
    console.log('Connection to cluster established:', rpcUrl, version);
    return connection;
  }
  
  /**
   * Establish an account to pay for everything
   */
  export async function establishPayer(): Promise<Keypair> {
    let fees = 0;
    if (!payer) {
      const feeCalculator = await connection.getMinimumBalanceForRentExemption(MintLayout.span);
  
      // Calculate the cost to fund the greeter account
      fees += await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
  
      // Calculate the cost of sending transactions
      fees += feeCalculator * 100; // wag
  
      payer = await getPayer();
    }
  
    let lamports = await connection.getBalance(payer.publicKey);
    if (lamports < fees) {
      // If current balance is not enough to pay for fees, request an airdrop
      
    }
  
    console.log(
      'Using account',
      payer.publicKey.toBase58(),
      'containing',
      lamports / LAMPORTS_PER_SOL,
      'SOL to pay for fees',
    );

    return payer;
  }
  
  export async function readJSON(filePath: String) {}
  
  
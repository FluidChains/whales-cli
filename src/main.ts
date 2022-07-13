import {
  establishConnection,
  establishPayer,
} from './ywhales';

import fs from 'mz/fs';
import { batchFile, STORE_OWNER, WALLET_PACKAGE, WRAPPED_SOL_MINT } from './ids';
import { AuctionPreStage, BatchMint, MintedResponse } from './types';
import { confirmTransactions, formatteDate, getAtaForMint, getPayer, retrieveMetadata, sleep } from './utils';
import { Connection } from './sdk/actions/Connection';
import { Transaction } from './sdk/programs/core';
import { ASSOCIATED_TOKEN_PROGRAM_ID, MintLayout, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { mintEditionFromMaster, mintNFT, sendToken } from './services/mint.service';
import { Keypair, sendAndConfirmRawTransaction } from '@solana/web3.js';
import { NodeWallet } from './sdk/actions/wallet';
import base58 from 'bs58';
import { preAuctionBatch, startAuctionBatch, validateAuctionBatch } from './services/auction.service';
import moment from 'moment';
import { sellNftTransaction } from './sdk/actions/auction-house/sellNft';




async function main() {
  console.log(`${formatteDate()}: Starting to mint`);


  const connection = await establishConnection();

  const payer = await establishPayer();

  const wallet = new NodeWallet(payer)

  console.log(`${formatteDate()} WalletInfo`, wallet.publicKey.toBase58())



  // JSON Proccess
  let rawdata = fs.readFileSync(batchFile, 'utf-8');
  let validateJson: BatchMint[];
  let completeJSON: BatchMint[];
  try {
    validateJson = JSON.parse(rawdata) as BatchMint[];
    if (validateJson.length > 200) throw new Error("Limit batch exceded: Max 200");
    const retrieveData = await retrieveMetadata(validateJson);

    completeJSON = retrieveData;
  } catch (e) {
    throw new Error("InvalidJSON")
  }


  const mintRent = await connection.getMinimumBalanceForRentExemption(MintLayout.span);

  const initialFifty = completeJSON.splice(0, 200)
  //Init Mint from JSONFile
  const mintBatchTx: Transaction[] = [];
  let mintedInfo: MintedResponse[] = [];
  try {

    let mintStatus = 1;
    for (let mintSingle of initialFifty) {
      console.log(`${formatteDate()}: ======= Minting Master  ${mintStatus} of ${initialFifty.length} ====== `)
      console.log(`${formatteDate()}: ======= Minting:  ${mintSingle.uri} ====== `)


      const mintTx = await mintNFT({
        connection: connection,
        wallet: wallet,
        uri: mintSingle.uri,
        maxSupply: mintSingle.maxSupply,
        metadata: mintSingle.metadata,
        mintRent: mintRent,
      });


      const blockhash = await connection.getLatestBlockhash()
      const combinedTx = Transaction.fromCombined(mintTx.transactionBatch.transactions, {
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        feePayer: wallet.publicKey
      })

      combinedTx.partialSign(...mintTx.transactionBatch.signers);
      await wallet.signTransaction(combinedTx)
      const mintTxId = await confirmTransactions(connection, combinedTx)
      console.log(`${formatteDate()}: MintTx: ${mintTxId}`)



      const mintedResponse: MintedResponse = {
        maxSupply: mintSingle.maxSupply,
        mint: mintTx,
        price: mintSingle.price,
        reserved: mintSingle.reserved,
        type: mintTx.type,
        uri: mintSingle.uri,
      }

      mintedInfo.push(mintedResponse)

      mintStatus++;

    }
  } catch (e) {
    console.log("Error", e)
  }

  console.log("===================================")
  console.log("=====+++++MINT FINISHED+++++++++===")
  console.log("===================================")
  console.log(`========${formatteDate()}: ==========`)



  // Get Only Commons
  const commonOnly = mintedInfo.filter(a => {
    return a.type == '1'
  });

  console.log(`${formatteDate()}: Master Copies #: ${commonOnly.length}`)
  let commons = 1;
  const editionMint = []

  for (let reservedSingle of commonOnly) {
    console.log(`${formatteDate()}: ======= Minting Edition for Asset ${commons} of ${commonOnly.length} ====== `)
    console.log(`${formatteDate()}: ======= Common Id: ${reservedSingle.uri} =========== `)

    if (reservedSingle.maxSupply - reservedSingle.reserved > 0) {
      const copiesToMint = reservedSingle.maxSupply - reservedSingle.reserved

      let reservedEdition = 1;
      for (let i = 0; i < copiesToMint; i++) {
        console.log(`${formatteDate()}: Copy: ${reservedEdition} of ${copiesToMint}`)

        const mintEditions = await mintEditionFromMaster(
          connection,
          wallet,
          reservedSingle.mint.mint,
          STORE_OWNER,
          1
        );

        const blockhashEdition = await connection.getLatestBlockhash()


        const combinedEditionTx = Transaction.fromCombined(mintEditions.txBatch.toTransactions(), {
          blockhash: blockhashEdition.blockhash,
          lastValidBlockHeight: blockhashEdition.lastValidBlockHeight,
          feePayer: wallet.publicKey
        })
        combinedEditionTx.partialSign(...mintEditions.txBatch.signers);

        await wallet.signTransaction(combinedEditionTx)
        const combinedEditionTxId = await confirmTransactions(connection, combinedEditionTx)
        const blockhashReservedCon = await connection.getLatestBlockhash()
        const reservedEdiBase58 = base58.encode(combinedEditionTx.signature)
        const confirmedEditionCpyTx = await connection.confirmTransaction({
          blockhash: blockhashReservedCon.blockhash,
          lastValidBlockHeight: blockhashReservedCon.lastValidBlockHeight,
          signature: reservedEdiBase58
        })

        console.log(`${formatteDate()}: Minted Edition Confirm ${confirmedEditionCpyTx}`)

        console.log(`${formatteDate()}: Minted Edition OK`)



        editionMint.push({ mintEditions, reservedSingle })

        reservedEdition++;
      }
    }

    commons++;

  }

  console.log("===================================")
  console.log("=======  SELL START  ===========")
  console.log("===================================")

  let editionsToSell = 1;
  for (let sellEdition of editionMint) {
    console.log("=============================")
    console.log(`${formatteDate()}: Copies to sell: ${editionsToSell} of ${editionMint.length}`)

    const tokenAccount = await getAtaForMint(sellEdition.mintEditions.mint, wallet.publicKey)


    await sellNftTransaction(
      connection,
      wallet,
      sellEdition.reservedSingle.price,
      sellEdition.mintEditions,
      tokenAccount[0],
    );

    editionsToSell++;

  }

  console.log("===================================")
  console.log("=======  PACKAGES MINT  ===========")
  console.log("===================================")

  // Get Only Commons
  const tokenPackages = mintedInfo.filter(a => {
    return a.type == '4' || a.type == '5' || a.type == '6'
  });

  console.log(`${formatteDate()}: Packages Copies #: ${tokenPackages.length}`)
  let packages = 1;
  const packagesEditionMint = []

  for (let packageSingle of tokenPackages) {
    console.log(`${formatteDate()}: ======= Minting Packages ${packages} of ${tokenPackages.length} ====== `)
    console.log(`${formatteDate()}: ======= Package Id: ${packageSingle.uri} =========== `)

    const copiesToMint = packageSingle.maxSupply

    let packageMintCo = 1;
    for (let i = 0; i < copiesToMint; i++) {
      console.log(`${formatteDate()}: Copy: ${packageMintCo} of ${copiesToMint}`)

      const mintEditions = await mintEditionFromMaster(
        connection,
        wallet,
        packageSingle.mint.mint,
        WALLET_PACKAGE,
        1
      );

      const blockhashEdition = await connection.getLatestBlockhash()


      const combinedEditionTx = Transaction.fromCombined(mintEditions.txBatch.toTransactions(), {
        blockhash: blockhashEdition.blockhash,
        lastValidBlockHeight: blockhashEdition.lastValidBlockHeight,
        feePayer: wallet.publicKey
      })
      combinedEditionTx.partialSign(...mintEditions.txBatch.signers);

      await wallet.signTransaction(combinedEditionTx)
      const combinedEditionTxId = await confirmTransactions(connection, combinedEditionTx)
      const blockhashReservedCon = await connection.getLatestBlockhash()
      const reservedEdiBase58 = base58.encode(combinedEditionTx.signature)
      const confirmedEditionCpyTx = await connection.confirmTransaction({
        blockhash: blockhashReservedCon.blockhash,
        lastValidBlockHeight: blockhashReservedCon.lastValidBlockHeight,
        signature: reservedEdiBase58
      })

      console.log(`${formatteDate()}: Package Edition Confirm ${combinedEditionTxId}`)

      console.log(`${formatteDate()}: Package Edition OK`)



      packagesEditionMint.push({ mintEditions, packageSingle })

      packageMintCo++;

    }

    commons++;

  }

  console.log("===================================")
  console.log("=======  SELL PACKAGES  ===========")
  console.log("===================================")

  let editionsPackagesToSell = 1;
  for (let packageEdition of packagesEditionMint)
  {
    console.log("=============================")
    console.log(`${formatteDate()}: Copies packages to sell: ${editionsPackagesToSell} of ${packagesEditionMint.length}`)

    const tokenAccount = await getAtaForMint(packageEdition.mintEditions.mint, wallet.publicKey)


    await sellNftTransaction(
      connection,
      wallet,
      packageEdition.packageSingle.price,
      packageEdition.mintEditions,
      tokenAccount[0],
    );

    

    editionsPackagesToSell++;

  }

  console.log("===================================")
  console.log("===  SENDING TO WALLET PACKAGE  ===")
  console.log("===================================")

  let masterEditionToWP = 1;

  for (let masterEditionToken of mintedInfo)
  {

    console.log("=============================")
    console.log(`${formatteDate()}: Sending MasterEdition to Wallet Package: ${WALLET_PACKAGE.toBase58()} || ${masterEditionToWP} of ${mintedInfo.length}`)


    const tokenAccountPDA = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      masterEditionToken.mint.mint,
      wallet.publicKey,
    );

    const sendTokenTx = await sendToken({
      connection: connection,
      wallet: wallet,
      amount: 1,
      destination: WALLET_PACKAGE,
      mint: masterEditionToken.mint.mint,
      source: tokenAccountPDA

    });

    const blockhashEdition = await connection.getLatestBlockhash()


    const combinedEditionTx = Transaction.fromCombined(sendTokenTx, {
      blockhash: blockhashEdition.blockhash,
      lastValidBlockHeight: blockhashEdition.lastValidBlockHeight,
      feePayer: wallet.publicKey
    })

    await wallet.signTransaction(combinedEditionTx)
    const combinedEditionTxId = await confirmTransactions(connection, combinedEditionTx)
    const blockhashReservedCon = await connection.getLatestBlockhash()
    const reservedEdiBase58 = base58.encode(combinedEditionTx.signature)
    const confirmedEditionCpyTx = await connection.confirmTransaction({
      blockhash: blockhashReservedCon.blockhash,
      lastValidBlockHeight: blockhashReservedCon.lastValidBlockHeight,
      signature: reservedEdiBase58
    })

    console.log(`${formatteDate()}: MasterEdition Sent Confirm ${confirmedEditionCpyTx}`)

    console.log(`${formatteDate()}: Master Edition Sent OK`)


    masterEditionToWP++;
  }

  console.log("===================================")
  console.log("==========  PACKAGE INFO  =========")
  console.log("===================================")
  console.log(`******** SAVE THIS INFO ON YOUR RECORDS TO CONFIGURE THE API`)
  
  for (let tokenPackage of tokenPackages)
  {

    let packageType = '';

    switch (tokenPackage.type) {
      case '4':
        packageType = 'COMMON'
        break;
      case '5':
        packageType = 'RARE'
        
        break;
      case '6':
        packageType = 'LEGENDARY'
        
        break;
        
      default:
        break;
    }
    
    console.log(`${formatteDate()}: Package Type: ${packageType}`)
    console.log(`${formatteDate()}: Mint Address: ${tokenPackage.mint.mint.toBase58()}`)
    console.log(`=======================================================================`)

  }

  const collectionPackage = mintedInfo.filter(a => {
    return a.type == '7' 
  });

  console.log("===================================")
  console.log("========  COLLECTION INFO  ========")
  console.log("===================================")
  console.log(`******** SAVE THIS INFO ON YOUR RECORDS TO CONFIGURE THE API`)
  
  for (let collectionToken of collectionPackage)
  {

    let packageType = '';

    switch (collectionToken.type) {
      case '7':
        packageType = 'Collection Token'
        break;
      default:
        break;
    }
    
    console.log(`${formatteDate()}: Token Type: ${packageType}`)
    console.log(`${formatteDate()}: Mint Address: ${collectionToken.mint.mint.toBase58()}`)
    console.log(`=======================================================================`)

  }

  console.log(`${formatteDate()}: `)




  //Finish send Master Edition  
  console.log(`Finish send Master Edition`)
  console.log(`Finish OK`)

}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
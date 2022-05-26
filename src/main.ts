import {
  establishConnection,
  establishPayer,
} from './ywhales';

import fs from 'mz/fs';
import { batchFile, STORE_OWNER, WALLET_PACKAGE } from './ids';
import { AuctionPreStage, BatchMint, MintedResponse } from './types';
import { confirmTransactions, formatteDate, getPayer, retrieveMetadata, sleep } from './utils';
import { Connection } from './sdk/actions/Connection';
import { Transaction } from './sdk/programs/core';
import { ASSOCIATED_TOKEN_PROGRAM_ID, MintLayout, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { mintEditionFromMaster, mintNFT, sendToken } from './services/mint.service';
import { Keypair, sendAndConfirmRawTransaction } from '@solana/web3.js';
import { NodeWallet } from './sdk/actions/wallet';
import base58 from 'bs58';
import { preAuctionBatch, startAuctionBatch, validateAuctionBatch } from './services/auction.service';
import moment from 'moment';



const keypair: string = './mainnet.json'



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
    if (validateJson.length > 200) throw new Error("Limit batch exceded: Max 25");
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

  // Get Only Rares
  const raritys = mintedInfo.filter(a => {
    return a.type != '1'
  });

  console.log("===================================")
  console.log("=====STARTING TO MINT ONLY RARES===")
  console.log("===================================")
  console.log(`${formatteDate()}:  Raritys to sent: ${raritys.length}`)

  let rarityTx = 1;
  for (let rarityType of raritys) {
    console.log(`${formatteDate()}: =====Sending rarity ${rarityTx} of ${raritys.length}===`)
    console.log(`${formatteDate()}: ===== Rarity ID: ${rarityType.uri}  ===`)

    const tokenAccountPDA = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      rarityType.mint.mint,
      wallet.publicKey,
    );

    const sendTokenTx = await sendToken({
      connection: connection,
      wallet: wallet,
      amount: 1,
      destination: WALLET_PACKAGE,
      mint: rarityType.mint.mint,
      source: tokenAccountPDA

    })

    const blockhash = await connection.getLatestBlockhash()

    const combinedTokenSendTx = Transaction.fromCombined(sendTokenTx, { blockhash: blockhash.blockhash, lastValidBlockHeight: blockhash.lastValidBlockHeight, feePayer: wallet.publicKey })
    await wallet.signTransaction(combinedTokenSendTx)
    const tokenSent = await confirmTransactions(connection, combinedTokenSendTx)
    console.log(`${formatteDate()}: TokenSent OK: ${tokenSent}`)

    rarityTx++;

  }

  console.log("===================================")
  console.log("=====++++++FINISHED RARITYS+++++===")
  console.log("===================================")
  console.log(`=======${formatteDate()} ========`)

  // Get Only Commons
  const commonOnly = mintedInfo.filter(a => {
    return a.type == '1'
  });

  console.log("===================================")
  console.log("==========SENT RESERVED============")
  console.log("===================================")


  console.log(`${formatteDate()}: Common Reserved #: ${commonOnly.length}`)
  let commons = 1;
  for (let reservedSingle of commonOnly) {
    console.log(`${formatteDate()}: ======= Minting Edition for Asset ${commons} of ${commonOnly.length} ====== `)
    console.log(`${formatteDate()}: ======= Common Id: ${reservedSingle.uri} =========== `)

    if (reservedSingle.reserved > 0) {

      const editionMint = []
      let reservedEdition = 1;
      for (let i = 0; i < reservedSingle.reserved; i++) {


        const mintEditions = await mintEditionFromMaster(
          connection,
          wallet,
          reservedSingle.mint.mint,
          STORE_OWNER,
          reservedEdition
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

        /// Sending Edition 
        const tokenAccountPDA = await Token.getAssociatedTokenAddress(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          mintEditions.mint,
          wallet.publicKey,
        );

        const sendTokenTx = await sendToken({
          connection: connection,
          wallet: wallet,
          amount: 1,
          destination: WALLET_PACKAGE,
          mint: mintEditions.mint,
          source: tokenAccountPDA

        });



        const blockhashSentEdition = await connection.getLatestBlockhash()

        const combinedSentTokenTx = Transaction.fromCombined(sendTokenTx, {
          blockhash: blockhashSentEdition.blockhash,
          lastValidBlockHeight: blockhashSentEdition.lastValidBlockHeight,
          feePayer: wallet.publicKey
        })

        await wallet.signTransaction(combinedSentTokenTx)
        const sentEditiontxId = await confirmTransactions(connection, combinedSentTokenTx)

        console.log(`${formatteDate()}: Reserved OK ${reservedEdition} of ${reservedSingle.reserved} `)


        await sleep(5000)


        reservedEdition++;

      }
    }

    commons++;

  }


  console.log("===================================")
  console.log("=======SENT RESERVED OK============")
  console.log("===================================")


  console.log("===================================")
  console.log("=======PRE AUCTION START===========")
  console.log("===================================")


  const preAuctionInfo: AuctionPreStage[] = []
  // Create Auction
  let preAuctionIndex = 1
  for (let preAuc of commonOnly) {

    console.log(`${formatteDate()}: ======= PreAuction ${preAuctionIndex} of ${commonOnly.length} ====== `)
    console.log(`${formatteDate()}: ======= Common Id: ${preAuc.uri} =========== `)
    if (preAuc.reserved < preAuc.maxSupply && preAuc.type === '1') {
      const preAuctionResult = await preAuctionBatch(connection, wallet, preAuc)
      preAuctionInfo.push(preAuctionResult)
    }

    preAuctionIndex++;

  }


  // Validate Auctions
  let validateTransactions = 1;
  for (let preAuctionIndividual of preAuctionInfo) {

    console.log(`${formatteDate()}: ======= Validating Auction ${validateTransactions} of ${preAuctionInfo.length} ====== `)
    console.log(`${formatteDate()}: ======= Common Id: ${preAuctionIndividual.uri} =========== `)

    if (preAuctionIndividual) {
      if (preAuctionIndividual.minted.type === '1') {
        const validateAuction = await validateAuctionBatch(connection, wallet, preAuctionIndividual.vault, preAuctionIndividual.minted, preAuctionIndividual.addedToken, preAuctionIndividual.auctionManager, preAuctionIndividual.minted.maxSupply, preAuctionIndividual.reserved)
        console.log("Validate OK")
        const startAuction = await startAuctionBatch(connection, wallet, preAuctionIndividual.auction, preAuctionIndividual.auctionManager)

        const blockhash = await connection.getLatestBlockhash()
        const combinedValidate = Transaction.fromCombined([validateAuction, startAuction], {
          blockhash: blockhash.blockhash,
          lastValidBlockHeight: blockhash.lastValidBlockHeight,
          feePayer: wallet.publicKey
        })

        await wallet.signTransaction(combinedValidate)
        const validateAndInit = await confirmTransactions(connection, combinedValidate)

        console.log(`${formatteDate()}: Validate and Init Tx: ${validateAndInit}`)




      }
    }

    validateTransactions++;
  }

  // if (validateTransactions.length > 0) {
  //   if (validateTransactions !== undefined) {
  //     await wallet.signAllTransactions(validateTransactions)

  //     const validateTxId = []
  //     try {

  //       for (let tx of validateTransactions) {
  //         console.log("ValidateTx", tx)
  //         const txId = await connection.sendRawTransaction(tx.serialize());

  //         validateTxId.push(txId)
  //       }

  //       console.log("Validate Transactions OK")

  //     } catch (e) {
  //       console.log(e)

  //     }
  //   }
  // }




  // // Determine who pays for the fees

  console.log(`${formatteDate()} Success`)

}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
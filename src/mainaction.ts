import {
  establishConnection,
  establishPayer,
} from './ywhales';

import { STORE_OWNER, WRAPPED_SOL_MINT } from './ids';
import { checkMinimumBalances, confirmTransactions, formatteDate } from './utils';
import { Transaction } from './sdk/programs/core';
import { NodeWallet } from './sdk/actions/wallet';
import base58 from 'bs58';
import { AuctionHouseProgram } from '@holaplex/marketplace-js-sdk';




async function main() {
  console.log(`${formatteDate()}: Starting to mint`);


  const connection = await establishConnection();

  const payer = await establishPayer();

  const wallet = new NodeWallet(payer)

  console.log(`${formatteDate()} WalletInfo`, wallet.publicKey.toBase58())

  const buyerBalance = await checkMinimumBalances(connection, wallet)

  if(buyerBalance === false)
  {
    console.error(`Your balance is too low, please fund your wallet before start this process`)
    return
  }


  const AHPDA = await AuctionHouseProgram.findAuctionHouseAddress(wallet.publicKey, WRAPPED_SOL_MINT)
  const AHInfo = await connection.getAccountInfo(AHPDA[0])
  if(STORE_OWNER.toBase58() != wallet.publicKey.toBase58())
  {
    console.error(`${formatteDate()}: Invalid wallet or STORE_OWNER please check your configuration`)
    return
  }

  if(AHInfo === null)
  {
    console.log(`${formatteDate()}: AuctionHouse no detected, starting creation`)

    const auctionHouseFeeAcc = await AuctionHouseProgram.findAuctionHouseFeeAddress(AHPDA[0])
    const auctionHouseTreasuryAcc = await AuctionHouseProgram.findAuctionHouseTreasuryAddress(AHPDA[0])
 

    const createInstruction = await AuctionHouseProgram.instructions.createCreateAuctionHouseInstruction({
      auctionHouse: AHPDA[0],
      auctionHouseFeeAccount:auctionHouseFeeAcc[0],
      auctionHouseTreasury: auctionHouseTreasuryAcc[0],
      authority: wallet.publicKey,
      feeWithdrawalDestination: wallet.publicKey,
      payer: wallet.publicKey,
      treasuryMint: WRAPPED_SOL_MINT,
      treasuryWithdrawalDestination: wallet.publicKey,
      treasuryWithdrawalDestinationOwner: wallet.publicKey

    },
    {
      bump: AHPDA[1],
      canChangeSalePrice: false,
      feePayerBump: auctionHouseFeeAcc[1],
      requiresSignOff: false,
      sellerFeeBasisPoints: 0,
      treasuryBump: auctionHouseTreasuryAcc[1]
    })

    const blockhash = await connection.getLatestBlockhash()


    const createTx = new Transaction({
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
    feePayer: wallet.publicKey
    })

    createTx.add(createInstruction)
    await wallet.signTransaction(createTx)
    const creatreTxId = await confirmTransactions(connection, createTx)
    const reservedEdiBase58 = base58.encode(createTx.signature)
    const confirmedEditionCpyTx = await connection.confirmTransaction({
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      signature: reservedEdiBase58
    })

    console.log(`${formatteDate()}: Create Transaction Confirm ${confirmedEditionCpyTx}`)

    console.log(`=============================== `)
    console.log(`====== AUCTION HOUSE INFO ===== `)
    console.log(`=============================== `)
    console.log()
    console.log(`Auction House: ${AHPDA[0].toBase58()}`)
    console.log(`Mint: ${WRAPPED_SOL_MINT.toBase58()}`)
    console.log(`Authority: ${wallet.publicKey.toBase58()}`)
    console.log(`Creator: ${wallet.publicKey.toBase58()}`)
    console.log(`Fee Payer Acc: ${auctionHouseFeeAcc[0].toBase58()}`)
    console.log(`Treasuty: ${auctionHouseTreasuryAcc[0].toBase58()}`)
    console.log(`Fee Payer Withdrawal Acct: ${wallet.publicKey.toBase58()}`)
    console.log(`Treasury Withdrawal Acct: ${wallet.publicKey.toBase58()}`)
    console.log(`Seller Fee Basis Points: 0`)
    console.log(`Requires Sign Off: false`)
    console.log(`Can Change Sale Price: false`)
    console.log(`AH Bump: ${AHPDA[1]}`)
    console.log(`AH Fee Bump: ${auctionHouseFeeAcc[1]}`)
    console.log(`AH Treasury Bump: ${auctionHouseTreasuryAcc[1]}`)

  }

  

}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
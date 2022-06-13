import { AuctionHouseProgram } from '../../programs/auction-house/AuctionHouseProgram';
import { createSellInstruction } from '../../programs/auction-house/Sell';

import {
    Connection,
    Transaction,
    PublicKey,
    LAMPORTS_PER_SOL,
    SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import { createPrintListingReceiptInstruction } from '../../programs/auction-house/PrintListingReceipt';
import { TokenMetadataProgram } from '../../programs/token-metadata/TokenMetadataProgram';
import { confirmTransactions,  formatteDate,  getAuctionHouseTradeState } from '../../../utils';
import { AUCTION_HOUSE, AUCTION_HOUSE_AUTHORITY, AUCTION_HOUSE_FEE_PAYER, WRAPPED_SOL_MINT } from '../../../ids';
import { Wallet } from '../wallet';
import BN from 'bn.js';

export const sellNftTransaction = async (
    connection: Connection,
    wallet: Wallet,
    amount: number,
    nft: any,
    tokenAccount: PublicKey
) => {
    const auctionHouseProgram = new AuctionHouseProgram();
    const tokenMetadataProgram = new TokenMetadataProgram();

    const auctionHouseId = AUCTION_HOUSE;
    const auctionHouseAuthority = AUCTION_HOUSE_AUTHORITY;
    const auctionHouseFeePayer = AUCTION_HOUSE_FEE_PAYER;

    if (!wallet.publicKey || !nft) {
        return;
    }
    const buyerPrice = Number(amount) * LAMPORTS_PER_SOL;
    const auctionHouse = auctionHouseId;
    const authority = auctionHouseAuthority;
    const auctionHouseFeeAccount = auctionHouseFeePayer;
    const treasuryMint = WRAPPED_SOL_MINT;
    const tokenMint = new PublicKey(nft.mint);
    const associatedTokenAccount = tokenAccount;
    console.log(`${formatteDate()}: auctionHouse: ${auctionHouse.toBase58()}`);
    console.log(`${formatteDate()}: wallet.publicKey: ${wallet.publicKey.toBase58()}`);
    console.log(`${formatteDate()}: associatedTokenAccount: ${associatedTokenAccount.toBase58()}`);
    console.log(`${formatteDate()}: treasuryMint: ${treasuryMint.toBase58()}`);
    console.log(`${formatteDate()}: tokenMint: ${tokenMint.toBase58()}`);
    console.log(`${formatteDate()}: buyPrice: ${buyerPrice} `);

    const [sellerTradeState, tradeStateBump] =
        await auctionHouseProgram.findTradeStateAddress(
            wallet.publicKey,
            auctionHouse,
            associatedTokenAccount,
            treasuryMint,
            tokenMint,
            buyerPrice,
            1
        );

    const [metadata] = await tokenMetadataProgram.findMetadataAccount(tokenMint);

    const [programAsSigner, programAsSignerBump] =
        await auctionHouseProgram.findAuctionHouseProgramAsSignerAddress();

    const [freeTradeState, freeTradeBump] =
        await auctionHouseProgram.findTradeStateAddress(
            wallet.publicKey,
            auctionHouse,
            associatedTokenAccount,
            treasuryMint,
            tokenMint,
            0,
            1
    );

    const tx = new Transaction();

    const sellInstructionArgs = {
        tradeStateBump,
        freeTradeStateBump: freeTradeBump,
        programAsSignerBump: programAsSignerBump,
        buyerPrice,
        tokenSize: 1,
    };

    const sellInstructionAccounts = {
        wallet: wallet.publicKey,
        tokenAccount: associatedTokenAccount,
        metadata: metadata,
        authority: authority,
        auctionHouse: auctionHouse,
        auctionHouseFeeAccount: auctionHouseFeeAccount,
        sellerTradeState: sellerTradeState,
        freeSellerTradeState: freeTradeState,
        programAsSigner: programAsSigner,
    };

    const sellInstruction = createSellInstruction(
        sellInstructionAccounts,
        sellInstructionArgs
    );
    const [receipt, receiptBump] =
        await auctionHouseProgram.findListingReceiptAddress(sellerTradeState);

    const printListingReceiptInstruction = createPrintListingReceiptInstruction(
        {
            receipt,
            bookkeeper: wallet.publicKey,
            instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        {
            receiptBump,
        }
    );
    console.log(`${formatteDate()}: Receipt: ${receipt.toBase58()}`);

    tx.add(sellInstruction).add(printListingReceiptInstruction);

    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = wallet.publicKey;

    try {
        await wallet.signTransaction(tx);
        const combinedTxResponse = await confirmTransactions( connection, tx);
        console.log(`${formatteDate()}: TransactionId: ${combinedTxResponse}`);
    } catch (e) {
        console.error(e)
        return;
    }
}

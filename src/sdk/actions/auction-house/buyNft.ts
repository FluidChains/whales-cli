import {
    PublicKey,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    Transaction,
} from "@solana/web3.js";
import BN from "bn.js";

import { AUCTION_HOUSE_AUTHORITY, AUCTION_HOUSE_FEE_PAYER, TOKEN_PROGRAM_ID, WRAPPED_SOL_MINT } from "../../../ids";
import { confirmTransactions, getAuctionHouseTradeState } from "../../../utils";
import { AuctionHouseProgram } from "../../programs/auction-house/AuctionHouseProgram";
import { createPrintBidReceiptInstruction } from "../../programs/auction-house/PrintBidReceipt";
import { createBuyInstruction } from "../../programs/auction-house/Buy";
import { TokenMetadataProgram } from "../../programs/token-metadata/TokenMetadataProgram";
import { Connection } from "../Connection";

export default async function buyNftTransaction(
    connection: Connection,
    wallet,
    discord,
    nft,
    listing,
    ah: PublicKey,
) {
    const buyerPublicKey: PublicKey = wallet.publicKey;
    console.log("nft: ", nft);
    console.log("listing: ", listing);
    console.log("ah: ", ah);
    const auctionHouseProgram = new AuctionHouseProgram();
    const auctionProgramId = auctionHouseProgram.PUBKEY;
    console.log("auctionProgramId: ", auctionProgramId);
    const tokenMetadataProgram = new TokenMetadataProgram();


    const auctionHouse = ah;
    const authority = AUCTION_HOUSE_AUTHORITY;
    const auctionHouseFeeAccount = AUCTION_HOUSE_FEE_PAYER;
    const treasuryMint = WRAPPED_SOL_MINT;

    const tokenMint = new PublicKey(nft.mint);

    const buyerPrice = listing.price;
    const tokenAccounts = await connection.getTokenAccountsByOwner(
        new PublicKey(nft.updateAuthority),
        {
            mint: new PublicKey(nft.mint),
            programId: TOKEN_PROGRAM_ID
        });
    const tokenAccount = tokenAccounts.value[0].pubkey;
    const [metadata] = await tokenMetadataProgram.findMetadataAccount(tokenMint);

    const [escrowPaymentAccount, escrowPaymentBump] =
        await auctionHouseProgram.findEscrowPaymentAccountAddress(
            auctionHouse,
            buyerPublicKey
        );

    const [buyerTradeState, tradeStateBump] = await getAuctionHouseTradeState(
        auctionHouse,
        buyerPublicKey,
        tokenAccount,
        //@ts-ignore
        treasuryMint,
        tokenMint,
        new BN(1),
        new BN(buyerPrice),
    );

    const [bidReceipt, bidReceiptBump] =
        await auctionHouseProgram.findBidReceiptAddress(buyerTradeState);

    console.log("BUY NFT")
    console.log("ARGS")
    console.log("tradeStateBump: ", tradeStateBump);
    console.log("escrowPaymentBump: ", escrowPaymentBump);
    console.log("buyerPrice: ", buyerPrice);
    console.log("tokenSize: ", 1);

    console.log("ACCOUNTS");
    console.log("wallet: ", buyerPublicKey.toBase58());
    console.log("paymentAccount: ", buyerPublicKey.toBase58());
    console.log("transferAuthority: ", buyerPublicKey.toBase58());
    console.log("treasuryMint: ", treasuryMint.toBase58());
    console.log("tokenAccount: ", tokenAccount.toBase58());
    console.log("metadata: ", metadata.toBase58());
    console.log("escrowPaymentAccount: ", escrowPaymentAccount.toBase58());
    console.log("authority: ", authority.toBase58());
    console.log("auctionHouse: ", auctionHouse.toBase58());
    console.log("auctionHouseFeeAccount: ", auctionHouseFeeAccount.toBase58());
    console.log("buyerTradeState: ", buyerTradeState.toBase58());

    const publicBuyInstructionAccounts = {
        wallet: buyerPublicKey,
        paymentAccount: buyerPublicKey,
        transferAuthority: buyerPublicKey,
        treasuryMint,
        tokenAccount,
        metadata,
        escrowPaymentAccount,
        authority,
        auctionHouse,
        auctionHouseFeeAccount,
        buyerTradeState,
    };

    const publicBuyInstructionArgs = {
        tradeStateBump,
        escrowPaymentBump,
        buyerPrice: new BN(buyerPrice),
        tokenSize: new BN(1),
    };

    console.log("Bid Receipt")
    console.log("Args")
    console.log("receiptBump: ", bidReceiptBump)
    console.log("Accounts")
    console.log("bookkeeper: ", buyerPublicKey.toBase58())
    console.log("receipt: ", bidReceipt.toBase58())
    console.log("instruction: ", SYSVAR_INSTRUCTIONS_PUBKEY)

    const printBidReceiptAccounts = {
        bookkeeper: buyerPublicKey,
        receipt: bidReceipt,
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    };

    const printBidReceiptArgs = {
        receiptBump: bidReceiptBump,
    };

    console.log("publicBuyInstructionArgs: ", publicBuyInstructionArgs);
    const publicBuyInstruction = createBuyInstruction(
        publicBuyInstructionAccounts,
        publicBuyInstructionArgs
    );

    const printBidReceiptInstruction = createPrintBidReceiptInstruction(
        printBidReceiptAccounts,
        printBidReceiptArgs
    );

    const tx = new Transaction();

    tx
        .add(publicBuyInstruction)
        .add(printBidReceiptInstruction)

    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = buyerPublicKey;

    console.log("TX: ", tx);

    try {
        const signed = await wallet.signTransaction(tx);
        console.log("signed: ", signed)
        const combinedTxResponse = await confirmTransactions(connection, tx);
        console.log("combinedTxResponse: ", combinedTxResponse);
        return true;
    } catch (e) {
        console.error(e);
        return;
    }
}

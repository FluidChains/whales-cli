import {
    Connection,
    PublicKey,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";

import { concat } from "ramda";
import { AUCTION_HOUSE_AUTHORITY, AUCTION_HOUSE_FEE_PAYER, AUCTION_HOUSE_TREASURY, TOKEN_PROGRAM_ID, WRAPPED_SOL_MINT } from "../../../ids";
import { confirmTransactions,  getAuctionHouseTradeState } from "../../../utils";
import { AuctionHouseProgram } from "../../programs/auction-house/AuctionHouseProgram";
import { createExecuteSaleInstruction } from "../../programs/auction-house/ExecuteSale";
import { createPrintBidReceiptInstruction } from "../../programs/auction-house/PrintBidReceipt";
import { createPrintPurchaseReceiptInstruction } from "../../programs/auction-house/PrintPurchaseReceipt";
import { createBuyInstruction } from "../../programs/auction-house/Buy";
import { TokenMetadataProgram } from "../../programs/token-metadata/TokenMetadataProgram";

export default async function executeNFTSale(
    connection: Connection,
    wallet,
    discord,
    nft,
    listing,
    ah: PublicKey,
) {
    // const buyerPublicKey: PublicKey = wallet.publicKey;
    const buyerPublicKey: PublicKey = new PublicKey("3kxj94HnUgyrKgitxHc9PCMF59Qirm7tMXjqqAJTT41J");;
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

    const seller = new PublicKey(listing.seller);
    const tokenMint = new PublicKey(nft.mint);

    const auctionHouseTreasury = AUCTION_HOUSE_TREASURY;

    const listingReceipt = new PublicKey(listing.address);
    const sellerPaymentReceiptAccount = new PublicKey(listing.seller);
    const sellerTradeState = new PublicKey(listing.tradeState);
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

    const [freeTradeState, freeTradeStateBump] =
        await auctionHouseProgram.findTradeStateAddress(
            seller,
            auctionHouse,
            tokenAccount,
            treasuryMint,
            tokenMint,
            0,
            1
        );

    const [programAsSigner, programAsSignerBump] =
        await auctionHouseProgram.findAuctionHouseProgramAsSignerAddress();

    const [buyerReceiptTokenAccount] =
        await auctionHouseProgram.findAssociatedTokenAccountAddress(
            tokenMint,
            buyerPublicKey
        );

    const [bidReceipt, bidReceiptBump] =
        await auctionHouseProgram.findBidReceiptAddress(buyerTradeState);

    const [purchaseReceipt, purchaseReceiptBump] =
        await auctionHouseProgram.findPurchaseReceiptAddress(
            sellerTradeState,
            buyerTradeState
        );

    console.log("EXECUTE SALE")
    console.log("ARGS")
    console.log("escrowPaymentBump: ", escrowPaymentBump);
    console.log("freeTradeStateBump: ", freeTradeStateBump);
    console.log("programAsSignerBump: ", programAsSignerBump);
    console.log("buyerPrice: ", buyerPrice);
    console.log("tokenSize: ", 1);

    console.log("ACCOUNTS");
    console.log("buyer: ", buyerPublicKey.toBase58());
    console.log("seller: ", seller.toBase58());
    console.log("tokenAccount: ", tokenAccount.toBase58());
    console.log("tokenMint: ", tokenMint.toBase58());
    console.log("metadata: ", metadata.toBase58());
    console.log("treasuryMint: ", treasuryMint.toBase58());
    console.log("escrowPaymentAccount: ", escrowPaymentAccount.toBase58());
    console.log("sellerPaymentReceiptAccount: ", sellerPaymentReceiptAccount.toBase58());
    console.log("buyerReceiptTokenAccount: ", buyerReceiptTokenAccount.toBase58());
    console.log("authority: ", authority.toBase58());
    console.log("auctionHouse: ", auctionHouse.toBase58());
    console.log("auctionHouseFeeAccount: ", auctionHouseFeeAccount.toBase58());
    console.log("auctionHouseTreasury: ", auctionHouseTreasury.toBase58());
    console.log("buyerTradeState: ", buyerTradeState.toBase58());
    console.log("sellerTradeState: ", sellerTradeState.toBase58());
    console.log("freeTradeState: ", freeTradeState.toBase58());
    console.log("programAsSigner: ", programAsSigner.toBase58());

    const executeSaleInstructionAccounts = {
        buyer: buyerPublicKey,
        seller,
        tokenAccount,
        tokenMint,
        metadata,
        treasuryMint,
        escrowPaymentAccount,
        sellerPaymentReceiptAccount,
        buyerReceiptTokenAccount,
        authority,
        auctionHouse,
        auctionHouseFeeAccount,
        auctionHouseTreasury,
        buyerTradeState,
        sellerTradeState,
        freeTradeState,
        programAsSigner,
    };

    const executeSaleInstructionArgs = {
        escrowPaymentBump,
        freeTradeStateBump,
        programAsSignerBump,
        buyerPrice,
        tokenSize: 1,
    };

    console.log("Purchase Receipt")
    console.log("Args")
    console.log("purchaseReceiptBump: ", purchaseReceiptBump)
    console.log("Accounts")
    console.log("bookkeeper: ", buyerPublicKey.toBase58())
    console.log("purchaseReceipt: ", purchaseReceipt.toBase58())
    console.log("listingReceipt: ", listingReceipt.toBase58())
    console.log("instruction: ", SYSVAR_INSTRUCTIONS_PUBKEY)

    const printPurchaseReceiptAccounts = {
        bookkeeper: buyerPublicKey,
        purchaseReceipt,
        bidReceipt,
        listingReceipt,
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    };

    const printPurchaseReceiptArgs = {
        purchaseReceiptBump,
    };

    const executeSaleInstruction = createExecuteSaleInstruction(
        executeSaleInstructionAccounts,
        executeSaleInstructionArgs
    );

    const printPurchaseReceiptInstruction = createPrintPurchaseReceiptInstruction(
        printPurchaseReceiptAccounts,
        printPurchaseReceiptArgs
    );

    const tx = new Transaction();

    console.log("nft.data.creators: ", nft.data.creators)

    tx
        .add(
            new TransactionInstruction({
                programId: auctionProgramId,
                data: executeSaleInstruction.data,
                keys: concat(
                    executeSaleInstruction.keys,
                    nft.data.creators.map((creator) => ({
                        pubkey: new PublicKey(creator.address),
                        isSigner: false,
                        isWritable: true,
                    }))
                ),
            })
        )
        .add(printPurchaseReceiptInstruction);

    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = wallet.publicKey;

    console.log("TX: ", tx);

    try {
        const signed = await wallet.signTransaction(tx);
        console.log("signed: ", signed)
        const combinedTxResponse = await confirmTransactions( connection, tx);
        console.log("combinedTxResponse: ", combinedTxResponse);
        return true
    } catch (e) {
        console.error(e);
        return;
    }
}

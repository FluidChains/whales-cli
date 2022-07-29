import {
    Connection,
    PublicKey,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";

import { concat } from "ramda";
import { TOKEN_PROGRAM_ID, WRAPPED_SOL_MINT } from "../../../ids";
import { confirmTransactions,  getAuctionHouseTradeState } from "../../../utils";
import { AuctionHouseProgram, initMarketplaceSDK } from "@holaplex/marketplace-js-sdk";
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
    const auctionProgramId = AuctionHouseProgram.PUBKEY;
    console.log("auctionProgramId: ", auctionProgramId);
    const tokenMetadataProgram = new TokenMetadataProgram();


    const auctionHouse = ah;

    const authority = buyerPublicKey;
    const auctionHouseFeePayer = await AuctionHouseProgram.findAuctionHouseFeeAddress(auctionHouse);
    const auctionHouseTreasuryAcc = await AuctionHouseProgram.findAuctionHouseTreasuryAddress(auctionHouse)

    
    const auctionHouseFeeAccount = auctionHouseFeePayer[0];
    const treasuryMint = WRAPPED_SOL_MINT;

    const seller = new PublicKey(listing.seller);
    const tokenMint = new PublicKey(nft.mint);

    const auctionHouseTreasury = auctionHouseTreasuryAcc[0];

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
        await AuctionHouseProgram.findEscrowPaymentAccountAddress(
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
        await AuctionHouseProgram.findTradeStateAddress(
            seller,
            auctionHouse,
            tokenAccount,
            treasuryMint,
            tokenMint,
            0,
            1
        );

    const [programAsSigner, programAsSignerBump] =
        await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress();

    const [buyerReceiptTokenAccount] =
        await AuctionHouseProgram.findAssociatedTokenAccountAddress(
            tokenMint,
            buyerPublicKey
        );

    const [bidReceipt, bidReceiptBump] =
        await AuctionHouseProgram.findBidReceiptAddress(buyerTradeState);

    const [purchaseReceipt, purchaseReceiptBump] =
        await AuctionHouseProgram.findPurchaseReceiptAddress(
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
        escrowPaymentBump: escrowPaymentBump,
        freeTradeStateBump: freeTradeStateBump,
        programAsSignerBump: programAsSignerBump,
        buyerPrice: buyerPrice,
        tokenSize: 1,
        partialOrderSize: null,
        partialOrderPrice: null
        
       
    };

    const initSdk = initMarketplaceSDK(connection, wallet)

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


    const executeSaleInstruction = AuctionHouseProgram.instructions.createExecuteSaleInstruction(
        executeSaleInstructionAccounts,
        executeSaleInstructionArgs
    );

    const printPurchaseReceiptInstruction = AuctionHouseProgram.instructions.createPrintPurchaseReceiptInstruction(
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

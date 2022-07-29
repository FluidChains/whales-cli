import {
    Connection,
    Transaction,
    PublicKey,
    LAMPORTS_PER_SOL,
    SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import { TokenMetadataProgram } from '../../programs/token-metadata/TokenMetadataProgram';
import { confirmTransactions,  formatteDate } from '../../../utils';
import { STORE_OWNER, WRAPPED_SOL_MINT } from '../../../ids';
import { Wallet } from '../wallet';
import BN from 'bn.js';
import { AuctionHouseProgram } from "@holaplex/marketplace-js-sdk"

export const sellNftTransaction = async (
    connection: Connection,
    wallet: Wallet,
    amount: number,
    nft: any,
    tokenAccount: PublicKey
) => {
    const tokenMetadataProgram = new TokenMetadataProgram();



    const auctionHouseId = await AuctionHouseProgram.findAuctionHouseAddress(STORE_OWNER, WRAPPED_SOL_MINT);
    const auctionHouseAuthority = await AuctionHouseProgram.findAuctionHouseTreasuryAddress(auctionHouseId[0]);
    const auctionHouseFeePayer = await AuctionHouseProgram.findAuctionHouseFeeAddress(auctionHouseId[0]);

    if (!wallet.publicKey || !nft) {
        return;
    }
    const buyerPrice = Number(amount) * LAMPORTS_PER_SOL;
    const auctionHouse = auctionHouseId[0];
    const authority = auctionHouseAuthority[0];
    const auctionHouseFeeAccount = auctionHouseFeePayer[0];
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
        await AuctionHouseProgram.findTradeStateAddress(
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
        await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress();

    const [freeTradeState, freeTradeBump] =
        await AuctionHouseProgram.findTradeStateAddress(
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

    const sellInstruction = AuctionHouseProgram.instructions.createSellInstruction(
    sellInstructionAccounts,
    sellInstructionArgs
    );
    const [receipt, receiptBump] =
        await AuctionHouseProgram.findListingReceiptAddress(sellerTradeState);

    const printListingReceiptInstruction = AuctionHouseProgram.instructions.createPrintListingReceiptInstruction(
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

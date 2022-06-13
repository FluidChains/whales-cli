import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { config, Program } from '../core';

export class AuctionHouseProgram extends Program {
    public PREFIX = 'auction_house';
    public FEE_PAYER = 'fee_payer';
    public TREASURY = 'treasury';
    public SIGNER = 'signer';
    public LISTINE_RECEIPT = 'listing_receipt';
    public BID_RECEIPT = 'bid_receipt';
    public PURCHASE_RECEIPT = 'purchase_receipt';

    public PUBKEY = new PublicKey(config.programs.auctionHouse);

    public TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    public SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    );

    public async findAssociatedTokenAccountAddress(
        mint: PublicKey,
        wallet: PublicKey,
    ): Promise<[PublicKey, number]> {
        return await PublicKey.findProgramAddress(
            [wallet.toBuffer(), this.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            this.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        );
    }

    public async findAuctionHouseAddress(
        creator: PublicKey,
        treasuryMint: PublicKey,
    ): Promise<[PublicKey, number]> {
        return PublicKey.findProgramAddress(
            [
                Buffer.from(this.PREFIX, 'utf8'),
                creator.toBuffer(),
                treasuryMint.toBuffer(),
            ],
            this.PUBKEY,
        );
    }

    public async findthisAsSignerAddress(): Promise<[PublicKey, number]> {
        return await PublicKey.findProgramAddress(
            [
                Buffer.from(this.PREFIX, 'utf8'),
                Buffer.from(this.SIGNER, 'utf8'),
            ],
            this.PUBKEY,
        );
    }

    public async findAuctionHouseTreasuryAddress(
        auctionHouse: PublicKey,
    ): Promise<[PublicKey, number]> {
        return await PublicKey.findProgramAddress(
            [
                Buffer.from(this.PREFIX, 'utf8'),
                auctionHouse.toBuffer(),
                Buffer.from(this.TREASURY, 'utf8'),
            ],
            this.PUBKEY,
        );
    }

    public async findEscrowPaymentAccountAddress(
        auctionHouse: PublicKey,
        wallet: PublicKey,
    ): Promise<[PublicKey, number]> {
        return PublicKey.findProgramAddress(
            [Buffer.from(this.PREFIX, 'utf8'), auctionHouse.toBuffer(), wallet.toBuffer()],
            this.PUBKEY,
        );
    }

    public async findTradeStateAddress(
        wallet: PublicKey,
        auctionHouse: PublicKey,
        tokenAccount: PublicKey,
        treasuryMint: PublicKey,
        tokenMint: PublicKey,
        price: number,
        tokenSize: number,
    ): Promise<[PublicKey, number]> {
        return PublicKey.findProgramAddress(
            [
                Buffer.from(this.PREFIX, 'utf8'),
                wallet.toBuffer(),
                auctionHouse.toBuffer(),
                tokenAccount.toBuffer(),
                treasuryMint.toBuffer(),
                tokenMint.toBuffer(),
                new BN(price).toArrayLike(Buffer, 'le', 8),
                new BN(tokenSize).toArrayLike(Buffer, 'le', 8),
            ],
            this.PUBKEY,
        );
    }

    public async findAuctionHouseProgramAsSignerAddress(): Promise<[PublicKey, number]> {
        return await PublicKey.findProgramAddress(
            [
                Buffer.from(this.PREFIX, 'utf8'),
                Buffer.from(this.SIGNER, 'utf8'),
            ],
            this.PUBKEY,
        );
    }

    public async findPublicBidTradeStateAddress(
        wallet: PublicKey,
        auctionHouse: PublicKey,
        treasuryMint: PublicKey,
        tokenMint: PublicKey,
        price: number,
        tokenSize: number,
    ): Promise<[PublicKey, number]> {
        return PublicKey.findProgramAddress(
            [
                Buffer.from(this.PREFIX, 'utf8'),
                wallet.toBuffer(),
                auctionHouse.toBuffer(),
                treasuryMint.toBuffer(),
                tokenMint.toBuffer(),
                new BN(price).toArrayLike(Buffer, 'le', 8),
                new BN(tokenSize).toArrayLike(Buffer, 'le', 8),
            ],
            this.PUBKEY,
        );
    }

    public async findAuctionHouseFeeAddress(auctionHouse: PublicKey) {
        return PublicKey.findProgramAddress(
            [
                Buffer.from(this.PREFIX, 'utf8'),
                auctionHouse.toBuffer(),
                Buffer.from(this.FEE_PAYER, 'utf8'),
            ],
            this.PUBKEY,
        );
    }

    public async findListingReceiptAddress(sellerTradeState: PublicKey) {
        return PublicKey.findProgramAddress(
            [Buffer.from(this.LISTINE_RECEIPT, 'utf8'), sellerTradeState.toBuffer()],
            this.PUBKEY,
        );
    }

    public async findBidReceiptAddress(buyerTradeState: PublicKey) {
        return PublicKey.findProgramAddress(
            [Buffer.from(this.BID_RECEIPT, 'utf8'), buyerTradeState.toBuffer()],
            this.PUBKEY,
        );
    }

    public async findPurchaseReceiptAddress(sellerTradeState: PublicKey, buyerTradeState: PublicKey) {
        return PublicKey.findProgramAddress(
            [
                Buffer.from(this.PURCHASE_RECEIPT, 'utf8'),
                sellerTradeState.toBuffer(),
                buyerTradeState.toBuffer(),
            ],
            this.PUBKEY,
        );
    }
}

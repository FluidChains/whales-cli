import { PublicKey } from "@solana/web3.js";
import { METADATA_PROGRAM_ID } from "../../../ids";
import { Program } from "../core";

export class TokenMetadataProgram extends Program {

    public metadataBuffer = Buffer.from("metadata");

    public async findMetadataAccount(mint: PublicKey) {
        const metadataKey = METADATA_PROGRAM_ID;
        const mintAddress = mint.toBase58();

        return PublicKey.findProgramAddress(
            [
                this.metadataBuffer,
                metadataKey.toBuffer(),
                new PublicKey(mintAddress).toBuffer(),
            ],
            metadataKey
        );
    }
}
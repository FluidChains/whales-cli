import { PublicKey } from '@solana/web3.js';
import { config, Program } from '../core';
import { AUCTION_ID } from '../../../ids';

export class AuctionProgram extends Program {
  static readonly PREFIX = 'auction';
  static readonly EXTENDED = 'extended';
  static override readonly PUBKEY = new PublicKey(config.programs.auction);
}
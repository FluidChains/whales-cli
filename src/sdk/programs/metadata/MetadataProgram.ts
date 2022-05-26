import { PublicKey } from '@solana/web3.js';
import { Program, config } from '../core';
import { METADATA_PROGRAM_ID } from '../../../ids';

export enum MetadataKey {
  Uninitialized = 0,
  MetadataV1 = 4,
  EditionV1 = 1,
  MasterEditionV1 = 2,
  MasterEditionV2 = 6,
  EditionMarker = 7,
}

export class MetadataProgram extends Program {
  static readonly PREFIX = 'metadata';
  static override readonly PUBKEY = new PublicKey(config.programs.metadata);
}
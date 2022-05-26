import { PublicKey } from '@solana/web3.js';
import { config } from '../core/config';
import { Program } from '../core/Program';

export enum VaultKey {
  Uninitialized = 0,
  VaultV1 = 3,
  SafetyDepositBoxV1 = 1,
  ExternalPriceAccountV1 = 2,
}

export enum VaultInstructions {
  InitVault,
  AddTokenToInactiveVault,
  ActivateVault,
  CombineVault,
  RedeemShares,
  WithdrawTokenFromSafetyDepositBox,
  MintFractionalShares,
  WithdrawSharesFromTreasury,
  AddSharesToTreasury,
  UpdateExternalPriceAccount,
  SetVaultAuthority,
}

export class VaultProgram extends Program {
  static readonly PREFIX = 'vault';
  static override readonly PUBKEY = new PublicKey(config.programs.vault);
}
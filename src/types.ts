import { Keypair, PublicKey, Transaction, AccountInfo, Connection, TransactionSignature, SendOptions } from "@solana/web3.js"
import { AccountInfo as TokenAccountInfo } from '@solana/spl-token';;
import { TransactionsBatch } from "./utils";
import { CreateAuctionV2Args } from "./sdk/programs/auction/CreateAuctionV2";
import { NodeWallet, Wallet } from "./sdk/actions/wallet";

export interface WalletContextState {
  wallets: Wallet[];
  autoConnect: boolean;
  wallet: Wallet | undefined;
  select: (walletName: any) => void;
  publicKey: PublicKey | null;
  ready: boolean;
  connecting: boolean;
  disconnecting: boolean;
  connected: boolean;
  autoApprove: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transaction: Transaction[]) => Promise<Transaction[]>;
}

export interface Artist {
  address?: string;
  name: string;
  link: string;
  image: string;
  itemsAvailable?: number;
  itemsSold?: number;
  about?: string;
  verified?: boolean;
  background?: string;
  share?: number;
}

export enum ArtType {
  Master,
  Print,
  NFT,
}
export interface Art {
  uri: string | undefined;
  mint: string | undefined;
  link: string;
  title: string;
  artist: string;
  seller_fee_basis_points?: number;
  creators?: Artist[];
  type: ArtType;
  edition?: number;
  supply?: number;
  maxSupply?: number;
}

export interface TokenAccount {
  pubkey: string;
  account: AccountInfo<Buffer>;
  info: TokenAccountInfo;
}

export type StringPublicKey = string;

export type AccountAndPubkey = {
  pubkey: string;
  account: AccountInfo<Buffer>;
};


//Mint Types
/** Parameters for {@link mintNFT} **/
export interface MintNFTParams {
  connection: Connection;
  /** Wallet of the NFT creator and fee payer for the minting action **/
  wallet: NodeWallet;
  /** URI for a json file compatible with the {@link MetadataJson} format. Note that the `properties` field has to contain at least one creator and one of the provided creators must have the same public key as the provided {@link wallet} **/
  uri: string;
  /** Maximum supply of limited edition prints that can be created from the master edition of the minted NFT **/
  maxSupply?: number;

  metadata?: MetadataPreFlight;

  mintRent?: number;
}

/** Parameters for {@link sendTransaction} **/
export interface SendTransactionParams {
  connection: Connection;
  wallet: WalletContextState;
  txs: Transaction[];
  signers?: Keypair[];
  options?: SendOptions;
}

/** Parameters for {@link sendTransaction} **/
export interface SendTransactionParamsBatch {
  connection: Connection;
  wallet: WalletContextState;
  txs: TransactionsBatch[];
  signers?: Keypair[];
  options?: SendOptions;
}

export interface MintNFTResponse {
  signers: Keypair;
  createMintTx: Transaction;
  createMetadataTx: Transaction;
  createAssociatedTokenAccountTx: Transaction;
  mintToTx: Transaction;
  masterEditionTx: Transaction;

}

export interface MintInfo {
  transactionBatch: TransactionsBatch;
    mint: PublicKey;
    recipient: PublicKey;
    metadata: PublicKey;
}

export interface MintedResponse {
  mint: MintInfo;
  price: number; 
  maxSupply: number;
  reserved: number;
  type: string;
  uri: string;
}



export type MetaDataJsonCategory = 'image' | 'video' | 'audio' | 'vr' | 'html';

export type MetadataJsonAttribute = {
  trait_type: string;
  value: string;
};

export type MetadataJsonCollection = {
  name: string;
  family: string;
};

export type MetadataJsonFile = {
  uri: string;
  type: string;
  cdn?: boolean;
};

export type MetadataJsonCreator = {
  address: StringPublicKey;
  verified: boolean;
  share: number;
};

export type MetadataJsonProperties = {
  files: MetadataJsonFile[];
  category: MetaDataJsonCategory;
  creators: MetadataJsonCreator[];
};

export type MetadataJson = {
  name: string;
  symbol: string;
  description: string;
  seller_fee_basis_points: number;
  image: string;
  animation_url?: string;
  external_url?: string;
  attributes?: MetadataJsonAttribute[];
  collection?: MetadataJsonCollection;
  properties: MetadataJsonProperties;
};

export enum instructionFile {
  cover,
  file,
  json
  
}

export class SetAuthorityArgs {
  instruction = 5;
}

export interface MakeAuctionParams {
  connection: Connection;
  wallet: Wallet;
  vault: PublicKey;
  auctionSettings: Omit<CreateAuctionV2Args, 'resource' | 'authority'>;
}

export interface MakeAuctionResponse {
  txId: TransactionSignature;
  auction: PublicKey;
}

export interface TransactionsBatchParams {
  beforeTransactions?: Transaction[];
  transactions: Transaction[];
  afterTransactions?: Transaction[];
}

export interface ParsedAccountBase {
  pubkey: StringPublicKey;
  account: AccountInfo<Buffer>;
  info: any; // TODO: change to unknown
}

export type AccountParser = (
  pubkey: StringPublicKey,
  data: AccountInfo<Buffer>,
) => ParsedAccountBase | undefined;
//Auction Types

export interface SafetyDepositTokenStoreBatch {
  txBatch: TransactionsBatch;
  tokenAccount: PublicKey;
  tokenStoreAccount: PublicKey;
  tokenMint: PublicKey;
}


export interface AuctionPreStage {
  epaAccount: PublicKey;
  vault: PublicKey;
  addedToken: SafetyDepositTokenStoreBatch[];
  auction: PublicKey;
  auctionManager: AuthorityAccountInfo; 
  minted: MintedResponse;
  reserved: number;
  uri: string;
}

export interface AuthorityAccountInfo {
  txBatch: TransactionsBatch;
  auctionManager: PublicKey;
  tokenTracker: PublicKey;
  acceptPaymentAccount: PublicKey;
}

export interface ParsedAccount<T> extends ParsedAccountBase {
  info: T;
}

export interface AuctionView {
  auction: StringPublicKey;
  auctionManager: StringPublicKey;
  vault: StringPublicKey;
}

export class WhitelistedCreator {
  key = 4;
  public address: PublicKey;
  public activated: boolean;

  constructor({ address, activated }: { address: PublicKey; activated: boolean }) {
    this.address = address;
    this.activated = activated;
  }
}

export class SetWhitelistedCreatorArgs {
  instruction = 9;
  activated;
  constructor(args: { activated: boolean; }) {
    this.activated = args.activated;
  }
}


export interface BatchMint {
  uri: string;
  maxSupply: number;
  price: number;
  reserved: number;
  metadata?: MetadataPreFlight;
}


export interface MetadataPreFlight {
  name: string;
  symbol: string;
  seller_fee_basis_points: number;
  creators: MetadataJsonCreator[];
  attributes: MetadataJsonAttribute[];

}

export interface CreatorPreFlight {
  address: string;
  share: number;
}

export enum MetadataCategory {
  Audio = 'audio',
  Video = 'video',
  Image = 'image',
  VR = 'vr',
  HTML = 'html',
}

export interface NFTProperties {
  files: object[];
  category: MetadataCategory;
  creators: object[];
}

export interface NFTData {
  name: string;
  symbol: string;
  description: string;
  seller_fee_basis_points: number;
  animation_url: string;
  attributes: MetadataJsonAttribute[];
  external_url: string;
  properties: NFTProperties;
  image: string;
}

export interface attributeData {
  type: string;
  value: string;
}

export interface whaleData {
  animation_url: string;
  attributes: MetadataJsonAttribute[];
  description: string;
  external_url: string;
  image: string;
  name: string;
  properties: object;
  seller_fee_basis_points: number;
  symbol: string;
}


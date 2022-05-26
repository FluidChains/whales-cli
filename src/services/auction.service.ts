import { AccountLayout, MintLayout, NATIVE_MINT, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { AUCTION_ID, VAULT_ID, METAPLEX_ID, METADATA_PROGRAM_ID, STORE_OWNER } from '../ids';
import { confirmTransactions, formatteDate, sleep, TransactionsBatch } from '../utils';
import { serialize } from 'borsh';
import { SetAuthorityArgs, WalletContextState, SafetyDepositTokenStoreBatch, AuctionPreStage, MintedResponse } from '../types';
import { AmountRange, SafetyDepositConfig, SafetyDepositConfigData, ValidateSafetyDepositBoxV2Args } from '../context/safety-deposit-config';
import { Transaction, TupleNumericType } from '../sdk/programs/core';
import { Vault } from '../sdk/programs/vault/Vault';
import { ExternalPriceAccountData } from '../sdk/programs/vault/ExternalPriceAccount';
import { UpdateExternalPriceAccount } from '../sdk/programs/vault/UpdateExternalPriceAccount';
import { createExternalPriceAccount } from '../sdk/actions/utility';
import { CreateMint, CreateTokenAccount } from '../sdk/transactions';
import { InitVault } from '../sdk/programs/vault/InitVault';
import { SafetyDepositBox } from '../sdk/programs/vault/SafetyDepositBox';
import { createApproveTxs } from '../sdk/actions/shared';
import { AddTokenToInactiveVault } from '../sdk/programs/vault/AddTokenToInactiveVault';
import { ActivateVault } from '../sdk/programs/vault/ActivateVault';
import { CombineVault } from '../sdk/programs/vault/CombineVault';
import { Auction, PriceFloor, PriceFloorType } from '../sdk/programs/auction/Auction';
import { AuctionExtended } from '../sdk/programs/auction/AuctionExtended';
import { CreateAuctionV2, CreateAuctionV2Args } from '../sdk/programs/auction/CreateAuctionV2';
import { AuctionManager } from '../sdk/programs/plex/AuctionManager';
import { AuctionWinnerTokenTypeTracker } from '../sdk/programs/plex/AuctionWinnerTokenTypeTracker';
import { InitAuctionManagerV2 } from '../sdk/programs/plex/InitAuctionManagerV2';
import { WinnerLimit, WinnerLimitType } from '../sdk/programs/auction/CreateAuction';
import { MetaplexProgram } from '../sdk/programs/plex/MetaplexProgram';
import { PrizeTrackingTicket } from '../sdk/programs/plex/PrizeTrackingTicket';
import { WhitelistedCreator } from '../sdk/programs/plex/WhiteListedCreator';
import { Edition } from '../sdk/programs/metadata/Edition';
import { StartAuction } from '../sdk/programs/plex/StartAuction';
import { PayoutTicket } from '../sdk/programs/plex/PayoutTicker';
import { Store } from '../sdk/programs/plex/Store';
import { MetadataProgram } from '../sdk/programs/metadata/MetadataProgram';
import base58 from 'bs58';

/*
  Creates an external payment account
*/

// This command creates the external pricing oracle
export async function createExternalPriceAccountBatch({
  connection,
  wallet,
}: { connection: Connection, wallet: WalletContextState }): Promise<{ txBatch: TransactionsBatch, externalPriceAccount: PublicKey }> {
  const txBatch = new TransactionsBatch({ transactions: [] });
  const blockhash = await connection.getLatestBlockhash()
  const txOptions = { blockhash: blockhash.blockhash, lastValidBlockHeight: blockhash.lastValidBlockHeight, feePayer: wallet.publicKey };

  const epaRentExempt = await connection.getMinimumBalanceForRentExemption(
    Vault.MAX_EXTERNAL_ACCOUNT_SIZE,
  );

  const externalPriceAccount = Keypair.generate();

  const externalPriceAccountData = new ExternalPriceAccountData({
    pricePerShare: new BN(0),
    priceMint: NATIVE_MINT.toBase58(),
    allowedToCombine: true,
  });

  const uninitializedEPA = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: externalPriceAccount.publicKey,
      lamports: epaRentExempt,
      space: Vault.MAX_EXTERNAL_ACCOUNT_SIZE,
      programId: VAULT_ID,
    }),
  );
  txBatch.addTransaction(uninitializedEPA);
  txBatch.addSigner(externalPriceAccount);

  const updateEPA = new UpdateExternalPriceAccount(txOptions, {
    externalPriceAccount: externalPriceAccount.publicKey,
    externalPriceAccountData,
  });
  txBatch.addTransaction(updateEPA);




  return {
    txBatch,
    externalPriceAccount: externalPriceAccount.publicKey,
  };
};

export async function createEPA(connection, wallet) {
  try {
    const EPA = await createExternalPriceAccount({
      connection: connection,
      wallet: wallet
    });

    return EPA;

  } catch (e) {
    throw new Error(`Error creating externalPaymentAccount ${e}`);
  }


}

export async function createVaultBatch(connection: Connection, wallet: WalletContextState, epa: PublicKey) {
  try {
    const accountRent = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
    const mintRent = await connection.getMinimumBalanceForRentExemption(MintLayout.span);
    const vaultRent = await connection.getMinimumBalanceForRentExemption(Vault.MAX_VAULT_SIZE);

    const vault = Keypair.generate();

    const vaultAuthority = await Vault.getPDA(vault.publicKey);

    const txBatch = new TransactionsBatch({ transactions: [] });

    const fractionMint = Keypair.generate();
    const blockhash = await connection.getLatestBlockhash()

    const fractionMintTx = new CreateMint(
      {
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        feePayer: wallet.publicKey
      },
      {
        newAccountPubkey: fractionMint.publicKey,
        lamports: mintRent,
        owner: vaultAuthority,
        freezeAuthority: vaultAuthority,
      },
    );
    txBatch.addTransaction(fractionMintTx);
    txBatch.addSigner(fractionMint);

    const redeemTreasury = Keypair.generate();
    const redeemTreasuryTx = new CreateTokenAccount(
      {
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        feePayer: wallet.publicKey
      },
      {
        newAccountPubkey: redeemTreasury.publicKey,
        lamports: accountRent,
        mint: NATIVE_MINT,
        owner: vaultAuthority,
      },
    );
    txBatch.addTransaction(redeemTreasuryTx);
    txBatch.addSigner(redeemTreasury);
    const fractionTreasury = Keypair.generate();
    const fractionTreasuryTx = new CreateTokenAccount(
      {
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        feePayer: wallet.publicKey
      },
      {
        newAccountPubkey: fractionTreasury.publicKey,
        lamports: accountRent,
        mint: fractionMint.publicKey,
        owner: vaultAuthority,
      },
    );
    txBatch.addTransaction(fractionTreasuryTx);
    txBatch.addSigner(fractionTreasury);

    const uninitializedVaultTx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: vault.publicKey,
        lamports: vaultRent,
        space: Vault.MAX_VAULT_SIZE,
        programId: VAULT_ID,
      }),
    );
    txBatch.addTransaction(uninitializedVaultTx);
    txBatch.addSigner(vault);

    const initVaultTx = new InitVault(
      {
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        feePayer: wallet.publicKey
      },
      {
        vault: vault.publicKey,
        vaultAuthority: wallet.publicKey,
        fractionalTreasury: fractionTreasury.publicKey,
        pricingLookupAddress: epa,
        redeemTreasury: redeemTreasury.publicKey,
        fractionalMint: fractionMint.publicKey,
        allowFurtherShareCreation: true,
      },
    );
    txBatch.addTransaction(initVaultTx);

    return {
      txBatch,
      vault: vault.publicKey,
      fractionMint: fractionMint.publicKey,
      redeemTreasury: redeemTreasury.publicKey,
      fractionTreasury: fractionTreasury.publicKey,
    };

  } catch (e) {
    throw new Error(`Error creating vault Batch ${e}`);
  }
}

export async function addTokensToVaultBatch({
  connection,
  wallet,
  vault,
  nfts,
}: { connection: Connection, wallet: WalletContextState, vault: PublicKey, nfts: [{ tokenAccount: PublicKey, tokenMint: PublicKey, amount: BN }] }): Promise<SafetyDepositTokenStoreBatch[]> {
  const blockhash = await connection.getLatestBlockhash()
  const txOptions = { blockhash: blockhash.blockhash, lastValidBlockHeight: blockhash.lastValidBlockHeight, feePayer: wallet.publicKey };
  const safetyDepositTokenStores: SafetyDepositTokenStoreBatch[] = [];

  const vaultAuthority = await Vault.getPDA(vault);
  const accountRent = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);

  for (const nft of nfts) {
    const tokenTxBatch = new TransactionsBatch({ transactions: [] });
    const safetyDepositBox = await SafetyDepositBox.getPDA(vault, nft.tokenMint);

    const tokenStoreAccount = Keypair.generate();
    const tokenStoreAccountTx = new CreateTokenAccount(txOptions, {
      newAccountPubkey: tokenStoreAccount.publicKey,
      lamports: accountRent,
      mint: nft.tokenMint,
      owner: vaultAuthority,
    });
    tokenTxBatch.addTransaction(tokenStoreAccountTx);
    tokenTxBatch.addSigner(tokenStoreAccount);

    const { authority: transferAuthority, createApproveTx } = createApproveTxs({
      account: nft.tokenAccount,
      owner: wallet.publicKey,
      amount: nft.amount.toNumber(),
    });
    tokenTxBatch.addTransaction(createApproveTx);
    tokenTxBatch.addSigner(transferAuthority);

    const addTokenTx = new AddTokenToInactiveVault(txOptions, {
      vault,
      vaultAuthority: wallet.publicKey,
      tokenAccount: nft.tokenAccount,
      tokenStoreAccount: tokenStoreAccount.publicKey,
      transferAuthority: transferAuthority.publicKey,
      safetyDepositBox: safetyDepositBox,
      amount: nft.amount,
    });
    tokenTxBatch.addTransaction(addTokenTx);

    safetyDepositTokenStores.push({
      txBatch: tokenTxBatch,
      tokenStoreAccount: tokenStoreAccount.publicKey,
      tokenMint: nft.tokenMint,
      tokenAccount: nft.tokenAccount,
    });
  }

  return safetyDepositTokenStores;
}

export async function closeVaultBatch(connection, wallet, vault, fractionMint, fractionTreasury, redeemTreasury, pricingLookupAddress) {

  try {
    const accountRent = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);

    const fractionMintAuthority = await Vault.getPDA(vault);

    const txBatch = new TransactionsBatch({ transactions: [] });

    const blockhash = await connection.getLatestBlockhash()
    const txOptions = { blockhash: blockhash.blockhash, lastValidBlockHeight: blockhash.lastValidBlockHeight, feePayer: wallet.publicKey };

    const fractionMintKey = new PublicKey(fractionMint);
    const fractionTreasuryKey = new PublicKey(fractionTreasury);
    const redeemTreasuryKey = new PublicKey(redeemTreasury);
    const pricingLookupAddressKey = new PublicKey(pricingLookupAddress);

    const activateVaultTx = new ActivateVault(txOptions, {
      vault,
      numberOfShares: new BN(1),
      fractionMint: fractionMintKey,
      fractionTreasury: fractionTreasuryKey,
      fractionMintAuthority,
      vaultAuthority: wallet.publicKey,
    });
    txBatch.addTransaction(activateVaultTx);

    const outstandingShareAccount = Keypair.generate();
    const outstandingShareAccountTx = new CreateTokenAccount(txOptions, {
      newAccountPubkey: outstandingShareAccount.publicKey,
      lamports: accountRent,
      mint: fractionMintKey,
      owner: wallet.publicKey,
    });
    txBatch.addTransaction(outstandingShareAccountTx);
    txBatch.addSigner(outstandingShareAccount);

    const payingTokenAccount = Keypair.generate();
    const payingTokenAccountTx = new CreateTokenAccount(txOptions, {
      newAccountPubkey: payingTokenAccount.publicKey,
      lamports: accountRent,
      mint: NATIVE_MINT,
      owner: wallet.publicKey,
    });
    txBatch.addTransaction(payingTokenAccountTx);
    txBatch.addSigner(payingTokenAccount);

    const transferAuthority = Keypair.generate();

    const createApproveTx = (account: Keypair) =>
      new Transaction().add(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          account.publicKey,
          transferAuthority.publicKey,
          wallet.publicKey,
          [],
          0,
        ),
      );

    txBatch.addTransaction(createApproveTx(payingTokenAccount));
    txBatch.addTransaction(createApproveTx(outstandingShareAccount));
    txBatch.addSigner(transferAuthority);

    const combineVaultTx = new CombineVault(txOptions, {
      vault,
      outstandingShareTokenAccount: outstandingShareAccount.publicKey,
      payingTokenAccount: payingTokenAccount.publicKey,
      fractionMint: fractionMintKey,
      fractionTreasury: fractionTreasuryKey,
      redeemTreasury: redeemTreasuryKey,
      burnAuthority: fractionMintAuthority,
      externalPriceAccount: pricingLookupAddressKey,
      transferAuthority: transferAuthority.publicKey,
      vaultAuthority: wallet.publicKey,
      newVaultAuthority: wallet.publicKey,
    });
    txBatch.addTransaction(combineVaultTx);

    console.log("Closed vault OK")

    return txBatch;


  } catch (e) {
    throw new Error(`Error closing vault ${e}`);

  }
}

export async function initAuctionBatch(connection, wallet, vault, auctionSettings) {

  try {
    const blockhash = await connection.getLatestBlockhash()
    const txOptions = { blockhash: blockhash.blockhash, lastValidBlockHeight: blockhash.lastValidBlockHeight, feePayer: wallet.publicKey };

    const [auctionKey, auctionExtended] = await Promise.all([
      Auction.getPDA(vault),
      AuctionExtended.getPDA(vault),
    ]);


    const fullSettings = new CreateAuctionV2Args({
      ...auctionSettings,
      authority: wallet.publicKey.toBase58(),
      resource: vault.toBase58(),
    });


    const auctionTx: Transaction = new CreateAuctionV2(txOptions, {
      args: fullSettings,
      auction: auctionKey,
      creator: wallet.publicKey,
      auctionExtended,
    });

    return { auctionTx, auction: auctionKey };

  } catch (e) {
    throw new Error(`Error initializing auction ${e}`);

  }
}

export async function createAuthorityAuctionBatch(connection: Connection, wallet, auction, vault) {

  try {

    const auctionManagerPDA = await AuctionManager.getPDA(auction);
    const newTokenTracker = await AuctionWinnerTokenTypeTracker.getPDA(auctionManagerPDA);
    const rentExempt = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);

    const txBatch = new TransactionsBatch({ transactions: [] })

    const blockhash = await connection.getLatestBlockhash()


    const createAccountTx = new Transaction({
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      feePayer: wallet.publicKey

    })
    const account = Keypair.generate();

    createAccountTx.add(SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: account.publicKey,
      lamports: rentExempt,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID
    }));

    createAccountTx.add(Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      NATIVE_MINT,
      account.publicKey,
      auctionManagerPDA,
    ));

    txBatch.addBeforeTransaction(createAccountTx)
    txBatch.addSigner(account)

    const storeId = await Store.getPDA(STORE_OWNER)

    const txInitAuction = new InitAuctionManagerV2({
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      feePayer: wallet.publicKey
    }, {
      vault: vault,
      auction: auction,
      store: storeId,
      auctionManager: auctionManagerPDA,
      auctionManagerAuthority: wallet.publicKey,
      acceptPaymentAccount: account.publicKey,
      tokenTracker: newTokenTracker,
      amountType: TupleNumericType.U8,
      lengthType: TupleNumericType.U8,
      maxRanges: new BN(10)

    });

    txBatch.addTransaction(txInitAuction)

    return {
      txBatch: txBatch,
      auctionManager: auctionManagerPDA,
      tokenTracker: newTokenTracker,
      acceptPaymentAccount: account.publicKey
    }

  } catch (e) {
    throw new Error(`Error creating Authority  ${e}`);

  }
}


export async function updateVaultAuthorityBatch(connection, wallet, vault, auctionManager) {

  try {
    const blockhash = await connection.getLatestBlockhash()


    let manualTransaction = new Transaction({
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      feePayer: wallet.publicKey
    });

    const data = Buffer.from([10]);
    const keys = [
      {
        pubkey: vault,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: wallet.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: auctionManager,
        isSigner: false,
        isWritable: false,
      },
    ];

    manualTransaction.add(
      new TransactionInstruction({
        keys,
        programId: new PublicKey(VAULT_ID),
        data: data,
      })
    );

    return { tx: manualTransaction };;

  } catch (e) {
    throw new Error(`Error updating vault authority  ${e}`);

  }


}

export async function updateAuctionAuthorityBatch(connection, wallet, auction, auctionManager) {
  try {
    const blockhash = await connection.getLatestBlockhash()


    const AUCTION_SCHEMA = new Map([
      [
        SetAuthorityArgs,
        {
          kind: 'struct',
          fields: [['instruction', 'u8']],
        },
      ]
    ]);

    let manualTransaction = new Transaction({
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      feePayer: wallet.publicKey
    });

    const data = Buffer.from(serialize(AUCTION_SCHEMA, new SetAuthorityArgs()));

    const keys = [
      {
        pubkey: auction,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: wallet.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: auctionManager,
        isSigner: false,
        isWritable: false,
      },
    ];

    manualTransaction.add(
      new TransactionInstruction({
        keys,
        programId: new PublicKey(AUCTION_ID),
        data: data,
      })
    );


    return { tx: manualTransaction };

  } catch (e) {
    throw new Error(`Error updating authority auction ${e}`);

  }

}

export async function preAuctionBatch(connection: Connection, wallet, mintedInfo: MintedResponse) {

  const transactionsAuction: TransactionsBatch[] = [];

  if (mintedInfo.type === '1') {

    //EPA
    const epaAccount = await createExternalPriceAccountBatch({ connection: connection, wallet: wallet });
    const epaBlockhash = await connection.getLatestBlockhash();
    const combinedEpaTx = Transaction.fromCombined(epaAccount.txBatch.transactions, { blockhash: epaBlockhash.blockhash, lastValidBlockHeight: epaBlockhash.lastValidBlockHeight, feePayer: wallet.publicKey });
    combinedEpaTx.partialSign(...epaAccount.txBatch.signers)
    await wallet.signTransaction(combinedEpaTx)
    const epaTx = await confirmTransactions(connection, combinedEpaTx)
    console.log("EPA Tx: ", epaTx)


    //Vault
    const vaultAccount = await createVaultBatch(connection, wallet, epaAccount.externalPriceAccount);
    const vaultBlockHash = await connection.getLatestBlockhash();
    const combinedVaultTx = Transaction.fromCombined(vaultAccount.txBatch.transactions, { blockhash: vaultBlockHash.blockhash, lastValidBlockHeight: vaultBlockHash.lastValidBlockHeight, feePayer: wallet.publicKey });
    combinedVaultTx.partialSign(...vaultAccount.txBatch.signers)
    await wallet.signTransaction(combinedVaultTx)
    const vaultTx = await confirmTransactions(connection, combinedVaultTx)
    console.log("Vault Tx: ", vaultTx)

    //Add Tokens to Vault
    const addTokensInstruction = await addTokensToVaultBatch({
      connection: connection,
      wallet: wallet,
      vault: vaultAccount.vault,
      nfts: [{
        amount: new BN(1),
        tokenAccount: mintedInfo.mint.recipient,
        tokenMint: mintedInfo.mint.mint
      }]
    });

    const addTokensBlockHash = await connection.getLatestBlockhash();
    const combinedAddTokenTx = Transaction.fromCombined(addTokensInstruction[0].txBatch.transactions, { blockhash: addTokensBlockHash.blockhash, lastValidBlockHeight: addTokensBlockHash.lastValidBlockHeight, feePayer: wallet.publicKey });
    combinedAddTokenTx.partialSign(...addTokensInstruction[0].txBatch.signers)
    await wallet.signTransaction(combinedAddTokenTx)
    const addTokenTx = await confirmTransactions(connection, combinedAddTokenTx)
    console.log("AddTokens Tx: ", addTokenTx)


    //Close vault
    const closeVaultInstruction = await closeVaultBatch(connection, wallet, vaultAccount.vault, vaultAccount.fractionMint, vaultAccount.fractionTreasury, vaultAccount.redeemTreasury, epaAccount.externalPriceAccount)
    const closeVaultBlockHash = await connection.getLatestBlockhash();
    const combinedCloseVaultTx = Transaction.fromCombined(closeVaultInstruction.transactions, { blockhash: closeVaultBlockHash.blockhash, lastValidBlockHeight: closeVaultBlockHash.lastValidBlockHeight, feePayer: wallet.publicKey });
    combinedCloseVaultTx.partialSign(...closeVaultInstruction.signers)
    await wallet.signTransaction(combinedCloseVaultTx)
    const closeVaultTx = await confirmTransactions(connection, combinedCloseVaultTx)
    console.log("CloseVault Tx: ", closeVaultTx)


    // Create Auction
    const auctionSettings = {
      instruction: 1,
      winners: new WinnerLimit({
        type: WinnerLimitType.Capped,
        usize: new BN(mintedInfo.maxSupply),
      }),
      endAuctionAt: null,
      auctionGap: null,
      tokenMint: NATIVE_MINT.toBase58(),
      priceFloor: new PriceFloor({ type: PriceFloorType.Minimum, minPrice: new BN(mintedInfo.price * LAMPORTS_PER_SOL) }),
      tickSize: null,
      gapTickSizePercentage: null,
      instantSalePrice: new BN(mintedInfo.price * LAMPORTS_PER_SOL),
      name: null
    };

    const auctionInitAccount = await initAuctionBatch(connection, wallet, vaultAccount.vault, auctionSettings);
    await wallet.signTransaction(auctionInitAccount.auctionTx)
    const auctionInitTx = await confirmTransactions(connection, auctionInitAccount.auctionTx)
    console.log("CreateAuc Tx: ", auctionInitTx)
  
    await sleep(500)  

    // Create Authority Auction
    const authorityAccount = await createAuthorityAuctionBatch(connection, wallet, auctionInitAccount.auction, vaultAccount.vault)
    const authorityBlockHash = await connection.getLatestBlockhash();
    const combinedAuthority = await Transaction.fromCombined(authorityAccount.txBatch.toTransactions(), { blockhash: authorityBlockHash.blockhash, lastValidBlockHeight: authorityBlockHash.lastValidBlockHeight, feePayer: wallet.publicKey })
    combinedAuthority.partialSign(...authorityAccount.txBatch.signers)
    await wallet.signTransaction(combinedAuthority)
    const authorityTx = await confirmTransactions(connection, combinedAuthority)
    console.log(`${formatteDate()}: Confirmed Authority Auction creaate Result: ${authorityTx}`)
    console.log("CreateAuth Tx: ", authorityTx)


    //Confirm Auth
    const blockhashAuthConfirm = await connection.getLatestBlockhash()
    const authTxBase58 = base58.encode(combinedAuthority.signature)
    const confirmedAuth = await connection.confirmTransaction({
      blockhash: blockhashAuthConfirm.blockhash,
      lastValidBlockHeight: blockhashAuthConfirm.lastValidBlockHeight,
      signature: authTxBase58
    })    
    console.log(`${formatteDate()}: Confirmed Auth Result: ${confirmedAuth}`)
    console.log("CreateAuth Tx: ", authorityTx)


    // Update Auction Authority
    const auctionAuthority = await updateAuctionAuthorityBatch(connection, wallet, auctionInitAccount.auction, authorityAccount.auctionManager)
    await wallet.signTransaction(auctionAuthority.tx)
    const authAuctTx = await confirmTransactions(connection, auctionAuthority.tx)
    console.log("UpdateAucAuth Tx: ", authAuctTx)
    

    // Update Vault Authority
    const vaultAuthority = await updateVaultAuthorityBatch(connection, wallet, vaultAccount.vault, authorityAccount.auctionManager)
    await wallet.signTransaction(vaultAuthority.tx)
    const authVaultTx = await confirmTransactions(connection, vaultAuthority.tx)
    console.log("UpdateVaultAuth Tx: ", authVaultTx)


    const auctionPreStageSingle: AuctionPreStage = {
      minted: mintedInfo,
      epaAccount: epaAccount.externalPriceAccount,
      vault: vaultAccount.vault,
      addedToken: addTokensInstruction,
      auction: auctionInitAccount.auction,
      auctionManager: authorityAccount,
      reserved: mintedInfo.reserved,
      uri: mintedInfo.uri
    }

    return auctionPreStageSingle;


    // const combinedPreAuctionTx = []

    // for (let tx of transactionsAuction) {
    //   const blockhash = await connection.getLatestBlockhash()

    //   const combinedAuthority = await Transaction.fromCombined(tx.transactions, {
    //     blockhash: blockhash.blockhash,
    //     lastValidBlockHeight: blockhash.lastValidBlockHeight,
    //     feePayer: wallet.publicKey
    //   })
    //   if (tx.signers.length > 0) {
    //     combinedAuthority.partialSign(...tx.signers)
    //   }
    //   combinedPreAuctionTx.push(combinedAuthority)
    // }

    // await wallet.signAllTransactions(combinedPreAuctionTx)

    // try {

    //   for (let tx of combinedPreAuctionTx) {

    //     const txTokensSigned = await confirmTransactions(connection, tx)
    //   }

    //   console.log("AuctionTransactionBatch OK",)
    //   return auctionPreStageSingle;


    // } catch (e) {
    //   console.log(e)
    // }
  }
}

export async function validateAuctionBatch(connection, wallet, vault: PublicKey, mintTx, addedToken, authorityAuction, maxSupply, reserved?: number) {


  if (typeof reserved == 'undefined' || reserved == null) {
    reserved = 0
  }



  try {

    const store = await Store.getPDA(STORE_OWNER);
    //const storeId = await Store.getPDA(wallet.publicKey);
    const auctionPDA = await Auction.getPDA(vault);
    const auctionManagerPDA = await AuctionManager.getPDA(auctionPDA);
    const loadedVault = await Vault.load(connection, vault);
    const sdb = await loadedVault.getSafetyDepositBoxes(connection);
    const whitelistedCreator = await WhitelistedCreator.getPDA(store, wallet.publicKey);
    const safetyDepositConfigKey = await SafetyDepositConfig.getPDA(
      auctionManagerPDA,
      sdb[0].pubkey,
    );

    const edition = await Edition.getPDA(mintTx.mint.mint)
    const originalAuthority = await PublicKey.findProgramAddress([
      Buffer.from('metaplex'),
      auctionPDA.toBuffer(),
      mintTx.mint.metadata.toBuffer(),
    ],
      new PublicKey(METAPLEX_ID));

    const safetyDepositConfigArgs = new SafetyDepositConfigData({
      auctionManager: SystemProgram.programId.toBase58(),
      order: new BN(0),
      winningConfigType: 3, //PrintingV2
      amountType: TupleNumericType.U8,
      lengthType: TupleNumericType.U8,
      amountRanges: [new AmountRange({ amount: new BN(1), length: new BN(maxSupply - reserved) })],
      participationConfig: null,
      participationState: null,
    });


    const data = ValidateSafetyDepositBoxV2Args.serialize({ safetyDepositConfig: safetyDepositConfigArgs })
    const blockhash = await connection.getLatestBlockhash()


    let manualTransaction = new Transaction({
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      feePayer: wallet.publicKey
    });

    const keys = [
      {
        pubkey: safetyDepositConfigKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: authorityAuction.tokenTracker,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: auctionManagerPDA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: mintTx.mint.metadata,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: originalAuthority[0],
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: whitelistedCreator,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: store,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: sdb[0].pubkey,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: addedToken[0].tokenStoreAccount,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: mintTx.mint.mint,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: edition,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: vault,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: wallet.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: wallet.publicKey,
        isSigner: true,
        isWritable: false,
      },

      {
        pubkey: wallet.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: METADATA_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ];

    manualTransaction.add(
      new TransactionInstruction({
        keys,
        programId: METAPLEX_ID,
        data,
      })
    );

    return manualTransaction;

  } catch (e) {
    throw new Error(`Error activating auction Batch ${e}`);
  }
}


export async function startAuctionBatch(connection, wallet, auction, auctionManager) {

  try {

    const blockhash = await connection.getLatestBlockhash()

    const startAuctionTx = new StartAuction({
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      feePayer: wallet.publicKey
    },
      {
        store: (await Store.getPDA(STORE_OWNER)),
        auction: auction,
        auctionManager: auctionManager.auctionManager,
        auctionManagerAuthority: wallet.publicKey
      });

    return startAuctionTx;



  } catch (e) {
    throw new Error(`Error starting auction ${e}`);
  }
}



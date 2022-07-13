import { PublicKey } from '@solana/web3.js';
import { MetadataJson, MintNFTParams } from '../types';
import { TransactionsBatch } from '../utils';
import axios, { AxiosResponse } from 'axios';
import BN from 'bn.js';
import { prepareTokenAccountAndMintTxs } from '../context/mint';
import { Account, Transaction } from '../sdk/programs/core';
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID, MintLayout } from '@solana/spl-token';
import { Creator, DataV2, Metadata } from '../sdk/programs/metadata/Metadata';
import { UpdateMetadata } from '../sdk/programs/metadata/UpdateMetadata';
import { MasterEdition } from '../sdk/programs/metadata/MasterEdition';
import { MetadataJsonAttribute } from '../sdk/types';
import { CreateMetadataV2 } from '../sdk/programs/metadata/CreateMetadataV2';
import { CreateMasterEditionV3 } from '../sdk/programs/metadata/CreateMasterEditionV3';
import { EditionMarker } from '../sdk/programs/metadata/EditionMarker';
import { Edition } from '../sdk/programs/metadata/Edition';
import { MintNewEditionFromMasterEditionViaToken } from '../sdk/programs/metadata/MintNewEditionFromMasterEditionViaToken';
import { CreateAssociatedTokenAccount } from '../sdk/transactions';


export  async  function lookup(url: string): Promise<MetadataJson> {
    try {
      const { data } = await axios.get<string, AxiosResponse<MetadataJson>>(url);
      return data;
    } catch(e) {
      throw new Error(`unable to get metadata json from url ${url}: ${e} `);
    }
  };

export async function mintNFT({ connection, wallet, uri, maxSupply, metadata, mintRent}: MintNFTParams): Promise<{transactionBatch: TransactionsBatch, mint: PublicKey, recipient: PublicKey, metadata: PublicKey, type: string }> {
    
    if(!mintRent)
    {
        
      mintRent = await connection.getMinimumBalanceForRentExemption(MintLayout.span);

    }

    try {

    const blockhash = await connection.getLatestBlockhash()
    const txBatch = new TransactionsBatch({transactions: []})
    const { mint, createMintTx, createAssociatedTokenAccountTx, mintToTx, recipient } =
      await prepareTokenAccountAndMintTxs(connection, wallet.publicKey, mintRent);
    
    const metadataPDA = await Metadata.getPDA(mint.publicKey);
    const editionPDA = await MasterEdition.getPDA(mint.publicKey);
    const typeNFT: MetadataJsonAttribute = {trait_type: "p", value: "1"};
    
    txBatch.addSigner(mint);


    if(!metadata)
    {
      const {
        name,
        symbol,
        seller_fee_basis_points,
        properties: { creators },
        attributes
        
      } = await lookup(uri);

      metadata = {
        attributes: attributes!,
        name: name,
        symbol: symbol, 
        creators: creators,
        seller_fee_basis_points: seller_fee_basis_points
      }
    }
    
    if(metadata.attributes){
      const attributeCom  = metadata.attributes.find(a => a.trait_type === 'p')
      if (attributeCom)
      {
        typeNFT.value = attributeCom.value
      }
    }

    let supply;

    if(typeNFT.value == '4' || typeNFT.value == '5' || typeNFT.value == '6' || typeNFT.value == '7')
    {
      supply = null
    } else {
      supply = new BN(maxSupply)
    } 

   

    const creatorsData = metadata.creators.reduce<Creator[]>((memo, { address, share }) => {
      const verified = address === wallet.toString();
  
      const creator = new Creator({
        address,
        share,
        verified,
      });
  
      memo = [...memo, creator];
  
      return memo;
    }, []);

    const metadataData = new DataV2({
      name: metadata.name,
      symbol: metadata.symbol,
      uri: uri,
      sellerFeeBasisPoints: metadata.seller_fee_basis_points,
      creators: creatorsData,
      collection: null,
      uses: null
    });


    const createMetadataTx = new CreateMetadataV2(
      {
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight, 
        feePayer: wallet.publicKey,
      },
      {
        metadata: metadataPDA,
        metadataData,
        updateAuthority: wallet.publicKey,
        mint: mint.publicKey,
        mintAuthority: wallet.publicKey,
      },
    );

  
    const masterEditionTx = new CreateMasterEditionV3(
      { 
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight, 
          feePayer: wallet.publicKey
         },
      {
        edition: editionPDA,
        metadata: metadataPDA,
        updateAuthority: wallet.publicKey,
        mint: mint.publicKey,
        mintAuthority: wallet.publicKey,
        maxSupply: supply,
      },
    );


    txBatch.addTransaction(createMintTx)
    txBatch.addTransaction(createMetadataTx)
    txBatch.addTransaction(createAssociatedTokenAccountTx)
    txBatch.addTransaction(mintToTx)
    txBatch.addTransaction(masterEditionTx)

 
    return {transactionBatch: txBatch, mint: mint.publicKey, recipient: recipient, metadata: metadataPDA, type: typeNFT.value };
    
    } catch (e) {
      throw new Error(`Minting error ${e}`);
    }

    
  }

  export  async function sendToken({
    connection,
    wallet,
    source,
    destination,
    mint,
    amount,
  }): Promise<Transaction[]> {
    const txs = [];
    const destAta = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint,
      destination,
    );

    const blockhash = connection.getLatestBlockhash()
    const transactionCtorFields = {
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      feePayer: wallet.publicKey,
    };
  
    try {
      // check if the account exists
      await Account.load(connection, destAta);
    } catch {
      txs.push(
        new CreateAssociatedTokenAccount(transactionCtorFields, {
          associatedTokenAddress: destAta,
          splTokenMintAddress: mint,
          walletAddress: destination,
        }),
      );
    }
  
    txs.push(
      new Transaction(transactionCtorFields).add(
        Token.createTransferInstruction(
          TOKEN_PROGRAM_ID,
          source,
          destAta,
          wallet.publicKey,
          [],
          amount,
        ),
      ),
    );
  
    // const txId = await sendTransaction({ connection, wallet, txs });
  
    return txs;
  };

  export async function mintEditionFromMaster(connection, wallet, masterEditionMint, updateAuthority,edition) {
  
    const txBatch = new TransactionsBatch({transactions: []})

    
    const masterPDA = await MasterEdition.getPDA(masterEditionMint);
    const masterMetaPDA = await Metadata.getPDA(masterEditionMint);
    const masterInfo = await Account.getInfo(connection, masterPDA);
    const masterData = new MasterEdition(masterPDA, masterInfo).data;

     //take the current outstanding supply and increment by 1
    const editionValue = masterData.supply.add(new BN(1));

    const { mint, createMintTx, createAssociatedTokenAccountTx, mintToTx } =
    await prepareTokenAccountAndMintTxs(connection, wallet.publicKey);

    txBatch.addSigner(mint);

    const blockhash = await connection.getLatestBlockhash()


    const tokenAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      masterEditionMint,
      wallet.publicKey,
    );

    const metadataPDA = await Metadata.getPDA(mint.publicKey);
    const editionMarker = await EditionMarker.getPDA(masterEditionMint, editionValue);
    const editionPDA = await Edition.getPDA(mint.publicKey);

    const newEditionFromMasterTx = new MintNewEditionFromMasterEditionViaToken(
      { 
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        feePayer: wallet.publicKey },
      {
        edition: editionPDA, //empty, created inside program
        metadata: metadataPDA, //empty, created inside program
        updateAuthority: updateAuthority,
        mint: mint.publicKey,
        mintAuthority: wallet.publicKey,
        masterEdition: masterPDA,
        masterMetadata: masterMetaPDA,
        editionMarker, // empty if this is the 1st limited edition being created
        tokenOwner: wallet.publicKey,
        tokenAccount,
        editionValue,
      },
    );

    txBatch.addBeforeTransaction(createMintTx)
    txBatch.addBeforeTransaction(createAssociatedTokenAccountTx)
    txBatch.addBeforeTransaction(mintToTx)
    txBatch.addTransaction(newEditionFromMasterTx)
    
    return {
      txBatch,
      mint: mint.publicKey,
      metadata: metadataPDA,
      edition: editionPDA,
    }
  }

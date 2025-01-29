import { useState } from 'react';
import { AddressPurpose, request, MessageSigningProtocols } from 'sats-connect';
import { generatePrivateKey, generatePubkeyFromPrivateKey, hexToUint8Array } from '../utlis/cryptoHelper';
import * as Bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import * as wif from "wif";
import { Signer } from 'bip322-js'
import { MessageUtil } from "@saturnbtcio/arch-sdk";
import { Buffer } from 'buffer';
import { bytesToHexString } from '../utlis/cryptoHelper';
// import { Buffer } from "buffer";
// import process from 'process';

// window.process = process;

// if (!window.Buffer) {
//   window.Buffer = Buffer;
// }

const ECPair = ECPairFactory(ecc);

export function useWallet() {
  const NETWORK = import.meta.env.VITE_NETWORK || 'regtest';
  const [state, setState] = useState(() => {
    const savedState = localStorage.getItem('walletState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      console.log(`Parsed: ${JSON.stringify(parsed)}`);
      return {
        isConnected: parsed.isConnected,
        publicKey: parsed.publicKey,
        privateKey: parsed.privateKey,
        address: parsed.address,
      };
    }
    return {
      isConnected: false,
      publicKey: null,
      privateKey: null,
      address: null,
    };
  });

  const connectRegtest = async () => {
    const privateKey = generatePrivateKey();
    const publicKey = generatePubkeyFromPrivateKey(privateKey);
    
    // Create keyPair for generating the address
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, "hex"), {
      compressed: true,
      network: Bitcoin.networks.testnet,
    });

    // Generate P2TR address
    const internalPubkey = Buffer.from(keyPair.publicKey.slice(1, 33));
    const { address } = Bitcoin.payments.p2tr({
      internalPubkey,
      network: Bitcoin.networks.testnet,
    });
    
    const newState = {
      isConnected: true,
      privateKey,
      publicKey: publicKey.toString(),
      address: address, 
    };
    setState(newState);
    localStorage.setItem('walletState', JSON.stringify(newState));
  };

  const connectWallet = async () => {    
    try {
      const result = await request('getAddresses', {
        purposes: [AddressPurpose.Ordinals],
        message: 'Connect to Graffiti Wall',
      });
      console.log(`Addresses: ${JSON.stringify(result.result.addresses)}`);

      if (result.result.addresses && result.result.addresses.length > 0) {
        const newState = {
          isConnected: true,
          address: result.result.addresses[0].address,
          publicKey: result.result.addresses[0].publicKey,
          privateKey: null,
        };
        setState(newState);
        localStorage.setItem('walletState', JSON.stringify(newState));
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  const connect = async () => {
    if (NETWORK === 'regtest') {
      await connectRegtest();
    } else {
      await connectWallet();
    }
  };

  const disconnect = () => {
    localStorage.removeItem('walletState');
    setState({
      isConnected: false,
      publicKey: null,
      privateKey: null,
      address: null,
    });
  };

  const signMessage = async (messageObj) => {
    try {
        // Sanity checks
        if (!state.isConnected) throw new Error('Wallet not connected');
        if (!messageObj) throw new Error('Message object is required');
        if (!state.privateKey) throw new Error('Private key not available');

        // Hash the message using MessageUtil
        const messageHash = MessageUtil.hash(messageObj);
        if (!messageHash) throw new Error('Failed to hash message');

        // Convert message hash to hex string
        const messageString = Buffer.from(messageHash).toString('hex');

        console.log(`Message String: ${messageString}`);

        const signature = await window.unisat.signMessage(messageString, "bip322-simple");
        console.log(`Signature: ${signature}`);
        
        // // Create keyPair from private key with proper network settings
        // const keyPair = ECPair.fromPrivateKey(Buffer.from(state.privateKey, "hex"), {
        //     compressed: true,
        //     network: Bitcoin.networks.testnet,
        // });

        // if (!keyPair || !keyPair.publicKey) {
        //     throw new Error("Invalid keyPair or publicKey is undefined");
        // }

        // // Extract the internal public key for P2TR address
        // const internalPubkey = Buffer.from(keyPair.publicKey.slice(1, 33));
        // if (internalPubkey.length !== 32) {
        //     throw new Error("Invalid internal public key length");
        // }

        // // Generate P2TR address
        // const { address } = Bitcoin.payments.p2tr({
        //     internalPubkey,
        //     network: Bitcoin.networks.testnet,
        // });

        // if (!address) {
        //     throw new Error("Failed to generate P2TR address");
        // }

        // // Convert private key to WIF format
        // const privateKeyWIF = wif.encode({
        //     version: 239,
        //     privateKey: Buffer.from(state.privateKey, "hex"),
        //     compressed: true
        // });

        // // Sign the message using BIP322
        // const signature = Signer.sign(
        //     privateKeyWIF,
        //     address.toString(),
        //     messageString
        // );

        // if (!signature) {
        //     throw new Error("Failed to generate signature");
        // }
        const signatureBytes = new Uint8Array(Buffer.from(signature, 'base64')).slice(2);        
        console.log("Signature created successfully");

        return signatureBytes;
    } catch (error) {
        console.error("Signature creation error:", error);
        throw error;
    }
};

  return {
    ...state,
    connect,
    disconnect,
    signMessage,
  };
}

export default useWallet;
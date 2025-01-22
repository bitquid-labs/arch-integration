import { useState } from 'react';
import { AddressPurpose, request, MessageSigningProtocols } from 'sats-connect';
import { generatePrivateKey, generatePubkeyFromPrivateKey, hexToUint8Array } from '../utlis/cryptoHelper';
import * as Bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import * as wif from "wif";
import { Signer } from 'bip322-js'
import { MessageUtil } from "@saturnbtcio/arch-sdk";
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
    
    const newState = {
      isConnected: true,
      privateKey,
      publicKey: publicKey.toString(),
      address: null,
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
        if (!state.isConnected) throw new Error('Wallet not connected');

        let messageHash;
        let privateKeyHex;

        messageHash = MessageUtil.hash(messageObj);
        privateKeyHex = state.privateKey;
        console.log('private key', privateKeyHex);

        // Create keyPair from the provided privateKeyHex
        const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKeyHex, "hex"), {
            compressed: true,
            network: Bitcoin.networks.regtest,
        });
        console.log("key pair  ",keyPair);
        console.log("key pair pubkey  ",keyPair.publicKey);

        if (!keyPair || !keyPair.publicKey) {
            throw new Error("Invalid keyPair or publicKey is undefined");
        }

        // Extract the internal public key
        const internalPubkey = Buffer.from(keyPair.publicKey.slice(1, 33));
        console.log("key pair internal pubkey  ",internalPubkey);

        if (internalPubkey.length !== 32) {
            throw new Error("Invalid internal public key length");
        }

        // Generate a P2TR address
        const { address } = Bitcoin.payments.p2tr({
            internalPubkey,
            network: Bitcoin.networks.regtest,
        });
        console.log("generated P2TR address  ",address);

        // Convert message hash to hex string
        const messageString = Buffer.from(messageHash).toString("hex");
        console.log("messageString" ,messageString)

        // const bufferPkey = Buffer.from(privateKeyHex, "hex")
        // console.log("bufferPkey" ,bufferPkey)

        // Encode the private key to WIF
        const privateKeyWIF = wif.encode({
          version: 239, 
          privateKey: Buffer.from(privateKeyHex, "hex"), 
          compressed: true
        });
        console.log("privateKeyWIF" ,privateKeyWIF)
        
        // Sign the message
        console.log(`Address: ${address?.toString()}`);
        const signature = Signer.sign(
            privateKeyWIF,
            address?.toString() || '',
            messageString
        );
        // console.log("signature" ,signature)

        // Ensure the signature is a string before converting it to a Buffer
        const signatureString = typeof signature === 'string' ? signature : signature.toString();

        // Extract the Schnorr signature from the base64 encoded signature
        const signatureBuffer = Buffer.from(signatureString, "base64");

        // Convert the Buffer to a Uint8Array to slice the last 64 bytes for the Schnorr signature
        const schnorrSignature = new Uint8Array(signatureBuffer).slice(-64);
        // console.log("schnorrSignature" ,schnorrSignature)

        return { signature: schnorrSignature };

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
import { useState } from 'react';
import { AddressPurpose, request, MessageSigningProtocols } from 'sats-connect';
import { generatePrivateKey, generatePubkeyFromPrivateKey, hexToUint8Array } from '../utlis/cryptoHelper';
import * as Bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import * as wif from "wif";
import bip322 from "bip322-js";
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

        let messageHash = MessageUtil.hash(messageObj);
        let privateKeyHex = state.privateKey;

        // Create keyPair from the provided privateKeyHex
        const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKeyHex, "hex"), {
            compressed: true,
            network: Bitcoin.networks.regtest,
        });

        if (!keyPair || !keyPair.publicKey) {
            throw new Error("Invalid keyPair or publicKey is undefined");
        }

        // Extract the internal public key
        const internalPubkey = Buffer.from(keyPair.publicKey.slice(1, 33));

        if (internalPubkey.length !== 32) {
            throw new Error("Invalid internal public key length");
        }

        // Generate a P2TR address
        const { address } = Bitcoin.payments.p2tr({
            internalPubkey,
            network: Bitcoin.networks.regtest,
        });

        // Encode the private key to WIF
        const privateKeyWIF = wif.encode({
            version: 239,
            privateKey: Buffer.from(privateKeyHex, "hex"),
            compressed: true
        });
        // Sign the message using BIP322
        const signature = bip322.Signer.sign(
          privateKeyWIF,
          address?.toString() || '',
          Buffer.from(messageHash).toString('hex')  // Convert hash to hex string
      );

      // Take last 64 bytes of base64 decoded signature
      const signatureBytes = new Uint8Array(
          Buffer.from(signature.toString(), 'base64')
      ).slice(2);

      return { signature: signatureBytes };

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

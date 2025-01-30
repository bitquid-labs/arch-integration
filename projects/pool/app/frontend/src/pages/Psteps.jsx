import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { RpcConnection, PubkeyUtil, MessageUtil } from "@saturnbtcio/arch-sdk";
import { Buffer } from 'buffer';
import * as borsh from "borsh";
import { useWallet } from "../hooks/useWallet";
import { bytesToHexString } from '../utlis/cryptoHelper';

const Pools = () => {
  const [error, setError] = useState(null);
  const [instruction, setInstruction] = useState(null);
  const [messageObj, setMessageObj] = useState(null);
  const [signature, setSignature] = useState(null);
  const [result, setResult] = useState(null);
  const wallet = useWallet();
  const [isProgramDeployed, setIsProgramDeployed] = useState(false);
  const [isAccountCreated, setIsAccountCreated] = useState(false);

  const client = new RpcConnection(
    import.meta.env.VITE_RPC_URL || "http://localhost:9002",
    { headers: { "Access-Control-Allow-Origin": "*" } } // CORS configuration
  );

  const PROGRAM_PUBKEY = import.meta.env.VITE_PROGRAM_PUBKEY;
  const VITE_OWNER_ACCOUNT_PUBKEY = import.meta.env.VITE_OWNER_ACCOUNT_PUBKEY;
  const VITE_POOL_ACCOUNT_PUBKEY = import.meta.env.VITE_POOL_ACCOUNT_PUBKEY;
  const VITE_POOL_LIST_ACCOUNT_PUBKEY = import.meta.env.VITE_POOL_LIST_ACCOUNT_PUBKEY;
  const PROGRAM_PUBKEY_OBJ = PubkeyUtil.fromHex(PROGRAM_PUBKEY);

// Check if the program is deployed
const checkProgramDeployed = async () => {
    try {
      const pubkeyBytes = PubkeyUtil.fromHex(PROGRAM_PUBKEY);
      const accountInfo = await client.readAccountInfo(pubkeyBytes);
      if (accountInfo) {
        setIsProgramDeployed(true);
        setError(null);
      }
      console.log('Program deployed:', accountInfo);
    } catch (error) {
      console.error("Error checking program:", error);
      setError(
        "The Arch Graffiti program has not been deployed to the network yet. Please run `arch-cli deploy`."
      );
    }
  };
  
  // Check if the account is created
  const checkAccountCreated = async () => {
    try {
      const pubkeyBytes = PubkeyUtil.fromHex(OWNER_ACCOUNT_PUBKEY);
      const accountInfo = await client.readAccountInfo(pubkeyBytes);
      if (accountInfo) {
        setIsAccountCreated(true);
        setError(null);
      }
      console.log("Owner account created:", accountInfo);
    } catch (error) {
      console.error("Error checking account:", error);
      setIsAccountCreated(false);
      setError(
        "The owner account has not been created yet. Please run the account creation command."
      );
    }
  };
  

  const serializePoolData = () => {
    const predefinedPool = {
      name: "BQ Pool",
      risk_type: 0,
      apy: 3,
      min_period: 120,
      asset_pubkey:
        "57b5d5642018e666dd181dcf153a9ea5530ea0fe88d4067a47ffd4a73a8f6d07",
      asset_type: 1,
      investment_arm: 10,
    };

    const nameArray = new Uint8Array(32).fill(0);
    const nameBytes = new TextEncoder().encode(predefinedPool.name);
    nameArray.set(nameBytes.slice(0, 32));

    const pubkeyBytes = Uint8Array.from(
      predefinedPool.asset_pubkey
        .match(/.{1,2}/g)
        .map((byte) => parseInt(byte, 16))
    );

    const params = {
      pool_name: Array.from(nameArray),
      risk_type: predefinedPool.risk_type,
      apy: BigInt(predefinedPool.apy),
      min_period: BigInt(predefinedPool.min_period),
      asset_pubkey: Array.from(pubkeyBytes),
      asset_type: predefinedPool.asset_type,
      investment_arm: BigInt(predefinedPool.investment_arm),
    };

    const schema = {
      struct: {
        pool_name: { array: { type: "u8", len: 32 } },
        risk_type: "u8",
        apy: "u64",
        min_period: "u64",
        asset_pubkey: { array: { type: "u8", len: 32 } },
        asset_type: "u8",
        investment_arm: "u64",
      },
    };

    const serializedData = Array.from(borsh.serialize(schema, params));
    console.log("Serialized Data:", serializedData);
    return Buffer.concat([
        Buffer.from([0]), //0 for calling create_pool
        Buffer.from(serializedData),   
      ]);
  };

  /**
   * This function creates an instruction for the blockchain transaction.
   * It fetches the wallet's public key, prepares the predefined pool data,
   * and constructs the instruction object with the necessary details.
   * 
   * @returns {void} Sets the instruction state with the created instruction.
   */
  const createInstruction = async () => {
    try {
      // Fetch the wallet's public key from the window.unisat API
      const walletPubkey = await window.unisat.getPublicKey();
      console.log("Wallet Public Key:", walletPubkey);

      // Serialize the predefined pool data for the transaction
      const predefinedPoolData = serializePoolData();

      // Construct the instruction object with the necessary details
      const instruction = {
        // Program ID for the blockchain program
        program_id: PROGRAM_PUBKEY_OBJ,
        // Accounts involved in the transaction
        accounts: [
          {
            // Pool account's public key, not a signer but writable
            //pool_account
            pubkey: PubkeyUtil.fromHex(VITE_POOL_ACCOUNT_PUBKEY),
            is_signer: false,
            is_writable: false,
          },
          {
            // Owner acc public key, marked as a signer but not writable, strip the network prefix
            //owner_account
            pubkey: PubkeyUtil.fromHex(VITE_OWNER_ACCOUNT_PUBKEY),
            is_signer: true,
            is_writable: true,
          },
          {
            // poolList account's public key, not a signer but writable
            //poolList_account
            pubkey: PubkeyUtil.fromHex(VITE_POOL_LIST_ACCOUNT_PUBKEY),
            is_signer: false,
            is_writable: false,
          },
        ],
        // Data for the transaction, converted to a Uint8Array
        data: new Uint8Array(predefinedPoolData),
      };

      // Log the created instruction for debugging purposes
      console.log("Created Instruction:", instruction);
      // Set the instruction state with the created instruction
      setInstruction(instruction);
    } catch (error) {
      // Log any errors that occur during the instruction creation process
      console.error("Error creating instruction:", error);
    }
  };

  /**
   * This function creates a message object for the blockchain transaction.
   * It fetches the wallet's public key, converts it to a hex string, and constructs
   * the message object with the necessary details, including the signer and instructions.
   * 
   * @returns {void} Sets the message object state with the created message object.
   */
  const createMessageObj = async () => {
    try {
      // Fetch the wallet's public key from the window.unisat API
      const walletPubkey = await window.unisat.getPublicKey();
      console.log(`Wallet Public Key: ${walletPubkey}`);

      // Convert the wallet's public key to a hex string, excluding the network prefix
      const publicKeyHex = bytesToHexString(walletPubkey.slice(2));
      console.log(`Signer Public Key (hex string): ${publicKeyHex}`);

      // Construct the message object with the signer and instructions
      const messageObj = {
        // Array of signers, in this case, the wallet's public key
        signers: [PubkeyUtil.fromHex(publicKeyHex)],
        // Array of instructions for the transaction
        instructions: [instruction],
      };

      // Log the created message object for debugging purposes
      console.log("Created Message Object:", messageObj);
      // Set the message object state with the created message object
      setMessageObj(messageObj);
    } catch (error) {
      // Log any errors that occur during the message object creation process
      console.error("Error creating message object:", error);
    }
  };

  const handleSignMessage = async () => {
    try {
      console.log("Attempting to sign message...");
      
      if (!messageObj) {
        throw new Error("Message Object is missing");
      }
  
      const signature = await wallet.signMessage(messageObj);
      console.log("Message signed successfully!");
      console.log("Signature:", signature);
  
      // Convert signature to proper format for next steps
      const signatureBuffer = signature;
      setSignature(signatureBuffer);
    } catch (error) {
      console.error("Error signing message:", error.message || error);
    }
  };
  
  const handleGetResult = async () => {
    try {
      if (!messageObj || !signature) {
        throw new Error("Message Object or Signature is missing.");
      }
      
      console.log("Signature", signature);
      //Convert signature to bytes from
      console.log("MessageObj", messageObj);
      // Assuming 'randomVersion' is a variable that needs to be defined or imported
      // For demonstration, let's define a random version as a placeholder
      const randomVersion = Math.floor(Math.random() * 1000); // Generates a random version number
      const result = await client.sendTransaction({
        version: randomVersion, // Using the defined randomVersion
        signatures: [signature],
        message: messageObj,
        timestamp: new Date().getTime(), // Adding a random timestamp
      });
  
      console.log("Transaction result:", result);
      setResult(result);
    } catch (error) {
      console.error("Error sending transaction:", error);
    }
  };


  return (
    <div className="bg-gradient-to-t from-black via-black to-blue-950 min-h-screen">
      <div className="flex justify-center items-center pt-6">
        <Navbar />
      </div>
      <div className="flex justify-center items-center text-5xl pt-12 text-blue-300 font-bold">
        Pools
      </div>
      <div className="flex justify-center mt-6">
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded ml-4"
          onClick={checkProgramDeployed}
        >
          Check Deployed
        </button>
        <button
          className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded ml-4"
          onClick={checkAccountCreated}
        >
          Check account created
        </button>
      </div>

      <div className="flex justify-center mt-6">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          onClick={serializePoolData}
        >
          Serialize Predefined Pool
        </button>
        <button
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded ml-4"
          onClick={createInstruction}
        >
          Create Instruction
        </button>
        <button
          className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded ml-4"
          onClick={createMessageObj}
        >
          Create Message Object
        </button>
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded ml-4"
          onClick={handleSignMessage}
        >
          Sign Message
        </button>
        <button
          className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded ml-4"
          onClick={handleGetResult}
        >
          Get Result
        </button>
      </div>
    </div>
  );
};

export default Pools;

import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { RpcConnection, PubkeyUtil, MessageUtil } from "@saturnbtcio/arch-sdk";
// import { Buffer } from "buffer";
import * as borsh from "borsh";
import { useWallet } from "../hooks/useWallet";
// import process from 'process';

// window.process = process;

// if (!window.Buffer) {
//   window.Buffer = Buffer;
// }

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
  );

  const PROGRAM_PUBKEY = import.meta.env.VITE_PROGRAM_PUBKEY;
  const WALL_ACCOUNT_PUBKEY = import.meta.env.VITE_WALL_ACCOUNT_PUBKEY;
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
      const pubkeyBytes = PubkeyUtil.fromHex(WALL_ACCOUNT_PUBKEY);
      const accountInfo = await client.readAccountInfo(pubkeyBytes);
      if (accountInfo) {
        setIsAccountCreated(true);
        setError(null);
      }
      console.log("Wall account created:", accountInfo);
    } catch (error) {
      console.error("Error checking account:", error);
      setIsAccountCreated(false);
      setError(
        "The wall account has not been created yet. Please run the account creation command."
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

  const createInstruction = async () => {
    try {
      let walletKey;
      if (!wallet.publicKey) {
        await wallet.connect();
      }

      console.log("Wallet obj:", wallet);
      console.log("Wallet Public Key:", wallet.publicKey);

      if (typeof wallet.publicKey === "string") {
        walletKey = wallet.publicKey;
      } else if (wallet.publicKey instanceof Buffer) {
        walletKey = wallet.publicKey.toString("hex");
      } else {
        throw new Error("Invalid wallet public key type.");
      }

      if (!walletKey) {
        throw new Error("Wallet public key is empty.");
      }

      const predefinedPoolData = serializePoolData();
      const instruction = {
        program_id: PROGRAM_PUBKEY_OBJ,
        accounts: [
          {
            pubkey: PubkeyUtil.fromHex(walletKey),
            is_signer: true,
            is_writable: false,
          },
          {
            pubkey: PubkeyUtil.fromHex(WALL_ACCOUNT_PUBKEY),
            is_signer: false,
            is_writable: true,
          },
        ],
        data: new Uint8Array(predefinedPoolData),
      };

      console.log("Created Instruction:", instruction);
      setInstruction(instruction);
    } catch (error) {
      console.error("Error creating instruction:", error);
    }
  };

  const createMessageObj = () => {
    try {
      if (!instruction || !wallet.publicKey) {
        throw new Error("Instruction or Wallet Public Key is missing.");
      }

      const messageObj = {
        signers: [PubkeyUtil.fromHex(wallet.publicKey)],
        instructions: [instruction],
      };

      console.log("Created Message Object:", messageObj);
      setMessageObj(messageObj);
    } catch (error) {
      console.error("Error creating message object:", error);
    }
  };

  const handleSignMessage = async () => {
    try {
      console.log("Attempting to sign message...");
      
      if (!messageObj) {
        throw new Error("Message Object is missing");
      }
  
      const { signature } = await wallet.signMessage(messageObj);
      // const { signature } = await wallet.signMessage(Buffer.from(MessageUtil.hash(messageObj)).toString('hex'))
      console.log("Message signed successfully!");
      console.log("Signature:", signature);
  
      // Convert signature to proper format for next steps
      const signatureBuffer = new Uint8Array(Buffer.from(signature));
      setSignature(signatureBuffer);
      
      //const signatureBytes = new Uint8Array(Buffer.from(signature, 'base64')).slice(2);
      //setSignature(signatureBytes);
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
      console.log("MessageObj", messageObj)
      const result = await client.sendTransaction({
        version: 239,
        signatures: [signature],
        message: messageObj,
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

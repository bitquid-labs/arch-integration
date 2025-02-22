import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { RpcConnection, PubkeyUtil, MessageUtil } from "@saturnbtcio/arch-sdk";
// import { Buffer } from "buffer";
import * as borsh from "borsh";
import { useWallet } from "../hooks/useWallet";

// if (!window.Buffer) {
//   window.Buffer = Buffer;
// }

const Pools = () => {
  const [pools, setPools] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [instruction, setInstruction] = useState(null);
  const [messageObj, setMessageObj] = useState(null);
  const [signature, setSignature] = useState(null);
  const [result, setResult] = useState(null);
  const wallet = useWallet();
  const [isProgramDeployed, setIsProgramDeployed] = useState(false);
  const [isAccountCreated, setIsAccountCreated] = useState(false);

  const client = new RpcConnection(
    import.meta.env.VITE_RPC_URL || "http://localhost:9002"
  );

  const PROGRAM_PUBKEY = import.meta.env.VITE_PROGRAM_PUBKEY;
  const WALL_ACCOUNT_PUBKEY = import.meta.env.VITE_WALL_ACCOUNT_PUBKEY;
  const PROGRAM_PUBKEY_OBJ = PubkeyUtil.fromHex(PROGRAM_PUBKEY);

// Check if the program is deployed
const createPool = async () => {
    try {
      // Step 1: Check if the program is deployed
      const programPubkeyBytes = PubkeyUtil.fromHex(PROGRAM_PUBKEY);
      const programAccountInfo = await client.readAccountInfo(programPubkeyBytes);
      if (programAccountInfo) {
        setIsProgramDeployed(true);
        setError(null);
      } else {
        throw new Error("The Arch Graffiti program has not been deployed to the network yet. Please run `arch-cli deploy`.");
      }
      console.log("Program deployed:", programAccountInfo);
  
      // Step 2: Check if the account is created
      const wallAccountPubkeyBytes = PubkeyUtil.fromHex(WALL_ACCOUNT_PUBKEY);
      const wallAccountInfo = await client.readAccountInfo(wallAccountPubkeyBytes);
      if (wallAccountInfo) {
        setIsAccountCreated(true);
        setError(null);
      } else {
        throw new Error("The wall account has not been created yet. Please run the account creation command.");
      }
      console.log("Wall account created:", wallAccountInfo);
  
      // Step 3: Serialize pool data
      const predefinedPool = {
        name: "BQ Pool",
        risk_type: 0,
        apy: 3,
        min_period: 120,
        asset_pubkey: "57b5d5642018e666dd181dcf153a9ea5530ea0fe88d4067a47ffd4a73a8f6d07",
        asset_type: 1,
        investment_arm: 10,
      };
  
      const nameArray = new Uint8Array(32).fill(0);
      const nameBytes = new TextEncoder().encode(predefinedPool.name);
      nameArray.set(nameBytes.slice(0, 32));
  
      const pubkeyBytes = Uint8Array.from(predefinedPool.asset_pubkey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
  
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
  
      const serializedDataa = Array.from(borsh.serialize(schema, params));
      const serializedData = Buffer.concat([
              Buffer.from([0]), //0 for calling create_pool
              Buffer.from(serializedDataa),   
            ]);
      console.log("Serialized Data:", serializedData);
  
      // Step 4: Create instruction
      if (!wallet.publicKey) {
        await wallet.connect();
      }
      const walletKey = wallet.publicKey instanceof Buffer ? wallet.publicKey.toString("hex") : wallet.publicKey;
  
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
        data: new Uint8Array(serializedData),
      };
      console.log("Created Instruction:", instruction);
      setInstruction(instruction);
  
      // Step 5: Create message object
      const messageObj = {
        signers: [PubkeyUtil.fromHex(wallet.publicKey)],
        instructions: [instruction],
      };
      console.log("Created Message Object:", messageObj);
      setMessageObj(messageObj);
  
      // Step 6: Sign message
      const signature = await wallet.signMessage(messageObj);
      console.log("Message signed successfully!", signature);
      setSignature(signature);
  
      // Step 7: Send transaction and get result
      const signatureBytes = new Uint8Array(Buffer.from(signature, "base64")).slice(2);

      const result = await client.sendTransaction({
        version: 0,
        signatures: [signatureBytes],
        message: messageObj,
      });
  
      console.log("Transaction result:", result);
      return result;
    } catch (error) {
      console.error("Error in createPool function:", error.message || error);
      setError(error.message || error);
      throw error;
    }
  };
  
  useEffect(() => {
    const fetchPools = async () => {
      setIsLoading(true);
      try {
        if (!wallet.isConnected) {
          await wallet.connect();
        }

        // console.log("Wallet obj:", wallet);
        // console.log("Wallet Public Key:", wallet.publicKey);
        // console.log("Wallet isConnected:", wallet.isConnected);

        const poolListAccount = await client.readAccountInfo(
          PROGRAM_PUBKEY_OBJ
        );

        if (poolListAccount) {
          console.log("Pool List Account:", poolListAccount);

          if (poolListAccount.pools && poolListAccount.pools.length > 0) {
            const accountDetails = await Promise.all(
              poolListAccount.pools.map((poolPubkey) =>
                client.readAccountInfo(poolPubkey)
              )
            );

            const poolsData = accountDetails
              .map((account, index) => {
                try {
                  const pool = JSON.parse(account.data);
                  return { ...pool, id: poolListAccount.pools[index] };
                } catch (err) {
                  console.error("Error parsing pool data:", err);
                  return null;
                }
              })
              .filter(Boolean);

            console.log("Fetched Pools Data:", poolsData);
            setPools(poolsData);
          } else {
            setPools([]);
          }
        } else {
          throw new Error("Failed to fetch pool list account.");
        }
      } catch (err) {
        console.error("Error fetching pools:", err);
        setError(
          err.message || "Failed to fetch pools. Please try again later."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPools();
  }, []);

  return (
    <div className="bg-gradient-to-t from-black via-black to-blue-950 min-h-screen">
      <div className="flex justify-center items-center pt-6">
        <Navbar />
      </div>
      <div className="flex justify-center items-center text-5xl pt-12 text-blue-300 font-bold">
        Pools
      </div>

      <div className="flex justify-center items-center mt-8">
        {isLoading ? (
          <div className="text-blue-300">Loading pools...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : pools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {pools.map((pool, index) => (
              <div
                key={index}
                className="bg-blue-800 p-4 rounded-lg shadow-md text-white"
              >
                <h2 className="text-xl font-bold">Pool {index + 1}</h2>
                <p>
                  <strong>ID:</strong> {pool.id}
                </p>
                <p>
                  <strong>Name:</strong> {pool.name || "Unknown"}
                </p>
                <p>
                  <strong>Liquidity:</strong> {pool.liquidity || "N/A"}
                </p>
                <p>
                  <strong>Status:</strong> {pool.status || "Inactive"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-blue-300">No pools found.</div>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded ml-4"
          onClick={createPool}
        >
          Create
        </button>
      </div>
    </div>
  );
};

export default Pools;

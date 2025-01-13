import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { RpcConnection, PubkeyUtil, MessageUtil } from '@saturnbtcio/arch-sdk';
import { Buffer } from 'buffer';
import * as borsh from 'borsh';
import { useWallet } from '../hooks/useWallet';

if (!window.Buffer) {
  window.Buffer = Buffer;
}

const Pools = () => {
  const [pools, setPools] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const wallet = useWallet();

  const client = new RpcConnection(
    import.meta.env.VITE_RPC_URL || 'http://localhost:9002'
  );

  const PROGRAM_PUBKEY = import.meta.env.VITE_PROGRAM_PUBKEY;
  const WALL_ACCOUNT_PUBKEY = import.meta.env.VITE_WALL_ACCOUNT_PUBKEY;
  const PROGRAM_PUBKEY_OBJ = PubkeyUtil.fromHex(PROGRAM_PUBKEY);
  const walletPublicKey = import.meta.env.VITE_WALLET_SECRET_KEY;

  const serializePoolData = () => {
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

    const pubkeyBytes = Uint8Array.from(
      predefinedPool.asset_pubkey.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
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
        pool_name: { array: { type: 'u8', len: 32 } },
        risk_type: 'u8',
        apy: 'u64',
        min_period: 'u64',
        asset_pubkey: { array: { type: 'u8', len: 32 } },
        asset_type: 'u8',
        investment_arm: 'u64',
      },
    };

    const serializedData = Array.from(borsh.serialize(schema, params));
    console.log('Serialized Data:', serializedData);
    return serializedData;
  };

  const createInstruction = async () => {
    try {
        let walletKey;
        if (!wallet.publicKey) {
            await wallet.connect();  
        }

        console.log("Wallet obj:", wallet);
        console.log("Wallet Public Key:", wallet.publicKey);  // Debugging step

        if (typeof wallet.publicKey === 'string') {
            walletKey = wallet.publicKey;
        } else if (wallet.publicKey instanceof Buffer) {
            walletKey = wallet.publicKey.toString('hex');
        } else {
            throw new Error('Invalid wallet public key type.');
        }

        if (!walletKey) {
            throw new Error('Wallet public key is empty.');
        }

        const predefinedPoolData = serializePoolData();
        const instruction = {
            program_id: PROGRAM_PUBKEY_OBJ,
            accounts: [
                { 
                    pubkey: PubkeyUtil.fromHex(walletKey),
                    is_signer: true, 
                    is_writable: false 
                },
                { 
                    pubkey: PubkeyUtil.fromHex(WALL_ACCOUNT_PUBKEY),
                    is_signer: false, 
                    is_writable: true 
                },
            ],
            data: new Uint8Array(predefinedPoolData),
        };

        console.log('Created Instruction:', instruction);  // Debugging step
        return instruction;
    } catch (error) {
        console.error('Error creating instruction:', error);
    }
};

  

  const createMessageObj = () => {
    try {
      const instruction = createInstruction();

      if (!instruction || !wallet.publicKey) {
        throw new Error('Instruction or Wallet Public Key is missing.');
      }

      const messageObj = {
        signers: [PubkeyUtil.fromHex(wallet.publicKey)],
        instructions: [instruction],
      };

      console.log('Created Message Object:', messageObj);
    } catch (error) {
      console.error('Error creating message object:', error);
    }
  };

  const handleSignMessage = async () => {
    try {
      console.log("Attempting to sign message...");

      const signature = await wallet.signMessage(createMessageObj);
  
      console.log("Message signed successfully!");
      console.log("Signature:", signature);
    } catch (error) {
      console.error("Error signing message:", error.message || error);
    }
  };
  

  useEffect(() => {
    const fetchPools = async () => {
      setIsLoading(true);
      try {
        // Ensure wallet is connected
        if (!wallet.isConnected) {
          await wallet.connect();  
        }

        console.log("Wallet obj:", wallet);
        console.log("Wallet Public Key:", wallet.publicKey);  // Debugging step
        console.log("Wallet isConnected:", wallet.isConnected);  // Debugging step

        const poolListAccount = await client.readAccountInfo(PROGRAM_PUBKEY_OBJ);

        if (poolListAccount) {
          console.log('Pool List Account:', poolListAccount);

          if (poolListAccount.pools && poolListAccount.pools.length > 0) {
            const accountDetails = await Promise.all(
              poolListAccount.pools.map((poolPubkey) =>
                client.readAccountInfo(poolPubkey)
              )
            );

            const poolsData = accountDetails.map((account, index) => {
              try {
                const pool = JSON.parse(account.data);
                return { ...pool, id: poolListAccount.pools[index] };
              } catch (err) {
                console.error('Error parsing pool data:', err);
                return null;
              }
            }).filter(Boolean);

            console.log('Fetched Pools Data:', poolsData);
            setPools(poolsData);
          } else {
            setPools([]);
          }
        } else {
          throw new Error('Failed to fetch pool list account.');
        }
      } catch (err) {
        console.error('Error fetching pools:', err);
        setError(err.message || 'Failed to fetch pools. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPools();
  }, []);

  return (
    <div className='bg-gradient-to-t from-black via-black to-blue-950 min-h-screen'>
      <div className='flex justify-center items-center pt-6'>
        <Navbar />
      </div>
      <div className='flex justify-center items-center text-5xl pt-12 text-blue-300 font-bold'>
        Pools
      </div>

      <div className='flex justify-center items-center mt-8'>
        {isLoading ? (
          <div className='text-blue-300'>Loading pools...</div>
        ) : error ? (
          <div className='text-red-500'>{error}</div>
        ) : pools.length > 0 ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6'>
            {pools.map((pool, index) => (
              <div
                key={index}
                className='bg-blue-800 p-4 rounded-lg shadow-md text-white'
              >
                <h2 className='text-xl font-bold'>Pool {index + 1}</h2>
                <p><strong>ID:</strong> {pool.id}</p>
                <p><strong>Name:</strong> {pool.name || 'Unknown'}</p>
                <p><strong>Liquidity:</strong> {pool.liquidity || 'N/A'}</p>
                <p><strong>Status:</strong> {pool.status || 'Inactive'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-blue-300'>No pools found.</div>
        )}
      </div>
      <div className='flex justify-center mt-6'>
        <button
          className='bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded'
          onClick={serializePoolData}
        >
          Serialize Predefined Pool
        </button>
        <button
          className='bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded ml-4'
          onClick={createInstruction}
        >
          Create Instruction
        </button>
        <button
          className='bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded ml-4'
          onClick={createMessageObj}
        >
          Create Message Object
        </button>
        <button
          className='bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded ml-4'
          onClick={handleSignMessage}
        >
          Sign Message
        </button>
      </div>
    </div>
  );
};

export default Pools;

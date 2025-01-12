import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { RpcConnection, PubkeyUtil } from '@saturnbtcio/arch-sdk';
import { Buffer } from 'buffer';

if (!window.Buffer) {
  window.Buffer = Buffer;
}

const Pools = () => {
  const [pools, setPools] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const client = new RpcConnection(
    import.meta.env.VITE_RPC_URL || 'http://localhost:9002'
  );

  const PROGRAM_PUBKEY = import.meta.env.VITE_PROGRAM_PUBKEY;
  const PROGRAM_PUBKEY_OBJ = PubkeyUtil.fromHex(PROGRAM_PUBKEY);

  useEffect(() => {
    const fetchPools = async () => {
      setIsLoading(true);
      try {
        const poolListAccount = await client.readAccountInfo(PROGRAM_PUBKEY_OBJ);
        if (!poolListAccount || !poolListAccount.data) {
          throw new Error('Pool list account not found or data is missing.');
        }

        console.log('Raw Pool List Account Data:', poolListAccount.data);

        let poolListData;
        try {
          const decodedData = Buffer.from(poolListAccount.data).toString('utf-8');
          poolListData = JSON.parse(decodedData);
        } catch (err) {
          console.error('JSON parsing error:', err);
          throw new Error('Error parsing pool list data from JSON.');
        }

        console.log('Decoded Pool List:', poolListData);

        if (Array.isArray(poolListData.pools) && poolListData.pools.length > 0) {
          const poolDetails = await Promise.all(
            poolListData.pools.map(poolPubkeyHex => {
              const poolPubkey = PubkeyUtil.fromHex(poolPubkeyHex);
              return client.readAccountInfo(poolPubkey);
            })
          );

          const parsedPools = poolDetails
            .map(poolAccount => {
              try {
                return JSON.parse(poolAccount.data.toString());
              } catch (err) {
                console.error('Error decoding pool data:', err);
                return null;
              }
            })
            .filter(Boolean);

          setPools(parsedPools);
        } else {
          setPools([]);
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
                <p><strong>Name:</strong> {pool.name}</p>
                <p><strong>Liquidity:</strong> {pool.liquidity}</p>
                <p><strong>Status:</strong> {pool.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-blue-300'>No pools found.</div>
        )}
      </div>
    </div>
  );
};

export default Pools;

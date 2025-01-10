import React, { useEffect, useState, useCallback } from 'react';
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
    import.meta.env.VITE_RPC_URL || "http://localhost:9002"
  );
  const PROGRAM_PUBKEY = import.meta.env.VITE_PROGRAM_PUBKEY;

  const fetchPools = useCallback(async () => {
    setIsLoading(true); 
    try {
      const poolsData = await client.get_all_pools(PubkeyUtil.fromHex(PROGRAM_PUBKEY));
      setPools(poolsData);
    } catch (error) {
      console.error('Error fetching pools:', error);
      setError('Failed to fetch pools. Please try again later.');
    } finally {
      setIsLoading(false); 
    }
  }, [client, PROGRAM_PUBKEY]);
  
  useEffect(() => {
    fetchPools();
  }, [fetchPools]);
  

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return (
    <div className='bg-gradient-to-t from-black via-black to-blue-950 min-h-screen'>
      <div className='flex justify-center items-center pt-6'>
        <Navbar />
      </div>
      <div className='flex justify-center items-center text-5xl pt-12 text-blue-300 font-bold'>Pools</div>

      <div className='flex justify-center items-center mt-8'>
        {isLoading ? (
          <div className='text-blue-300'>Loading pools...</div>
        ) : error ? (
          <div className='text-red-500'>{error}</div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6'>
            {pools.map((pool, index) => (
              <div
                key={index}
                className='bg-blue-800 p-4 rounded-lg shadow-md text-white'
              >
                <h2 className='text-xl font-bold'>Pool {index + 1}</h2>
                <p><strong>ID:</strong> {pool.id}</p>
                <p><strong>Name:</strong> {pool.name}</p>
                <p><strong>Liquidity:</strong> {pool.liquidity}</p>
                <p><strong>Status:</strong> {pool.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pools;

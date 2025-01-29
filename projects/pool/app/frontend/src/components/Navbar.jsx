import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet'

const Navbar = () => {
  const { isConnected, address, connect, disconnect } = useWallet();
  const [error, setError] = useState(null);

  // Function to truncate the wallet address
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Function to handle wallet connection
  const handleConnectWallet = async () => {
    try {
      await connect();
      setError(null);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(error.message || 'Failed to connect wallet. Please try again.');
    }
  };

  // Function to handle wallet disconnection
  const handleDisconnectWallet = () => {
    disconnect();
    setError(null);
  };

  // Restore wallet state on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('walletState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (parsed.isConnected) {
        setError(null);
      }
    }
  }, []);

  return (
    <div className="flex justify-between items-center px-10 rounded-[36px] bg-black/50 backdrop-blur-md border border-white/20 shadow-lg h-[3.4rem] w-[65rem]">
      <div className="text-white">ArchYeild</div>
      <div className="text-white">Pools</div>
      <div>
        {isConnected ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDisconnectWallet}
              className="px-6 py-1 bg-red-600 text-white rounded-3xl hover:bg-red-700"
            >
              {truncateAddress(address)}
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectWallet}
            className="px-6 py-1 bg-blue-900 rounded-3xl text-gray-100"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
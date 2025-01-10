import React, { useState, useEffect } from 'react';

const Navbar = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [error, setError] = useState(null);

  // Function to truncate the wallet address
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Function to connect Unisat Wallet
  const connectUnisatWallet = async () => {
    try {
      if (!window.unisat) {
        throw new Error('Unisat Wallet is not installed. Please install it first.');
      }
      const accounts = await window.unisat.requestAccounts();
      const address = accounts[0];
      const network = await window.unisat.getNetwork();

      if (network !== 'testnet') {
        throw new Error('Please switch your Unisat Wallet to Bitcoin Testnet.');
      }

      setWalletConnected(true);
      setWalletAddress(address);
      setError(null);

      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletAddress', address);
    } catch (error) {
      console.error('Error connecting Unisat Wallet:', error);
      setWalletConnected(false);
      setWalletAddress(null);
      setError(error.message || 'Failed to connect Unisat Wallet. Please try again.');
    }
  };

  // Function to disconnect Unisat Wallet
  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setError(null);

    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    console.log('Wallet disconnected.');
  };

  // Restore wallet state on component mount
  useEffect(() => {
    const connected = localStorage.getItem('walletConnected') === 'true';
    const address = localStorage.getItem('walletAddress');

    if (connected && address) {
      setWalletConnected(true);
      setWalletAddress(address);
    }
  }, []);

  return (
    <div className="flex justify-between items-center px-10 rounded-[36px] bg-black/50 backdrop-blur-md border border-white/20 shadow-lg h-[3.4rem] w-[65rem]">
      <div className="text-white">ArchYeild</div>
      <div className="text-white">Pools</div>
      <div>
        {walletConnected ? (
          <div className="flex items-center gap-2">
            <button
              onClick={disconnectWallet}
              className="px-6 py-1 bg-red-600 text-white rounded-3xl hover:bg-red-700"
            >
              {truncateAddress(walletAddress)}
            </button>
          </div>
        ) : (
          <button
            onClick={connectUnisatWallet}
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

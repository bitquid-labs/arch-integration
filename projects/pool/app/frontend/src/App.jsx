import React, { useState, useCallback, useEffect } from "react";
import { RpcConnection, PubkeyUtil } from "@saturnbtcio/arch-sdk";
import { Buffer } from "buffer";

if (!window.Buffer) {
  window.Buffer = Buffer;
}

const App = () => {
  const [isProgramDeployed, setIsProgramDeployed] = useState(false);
  const [isAccountCreated, setIsAccountCreated] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [error, setError] = useState(null);

  // Initialize the RPC client
  const client = new RpcConnection(
    import.meta.env.VITE_RPC_URL || "http://localhost:9002"
  );
  const PROGRAM_PUBKEY = import.meta.env.VITE_PROGRAM_PUBKEY;
  const WALL_ACCOUNT_PUBKEY = import.meta.env.VITE_WALL_ACCOUNT_PUBKEY;

  // Check if the program is deployed
  const checkProgramDeployed = useCallback(async () => {
    try {
      const pubkeyBytes = PubkeyUtil.fromHex(PROGRAM_PUBKEY);
      const accountInfo = await client.readAccountInfo(pubkeyBytes);
      if (accountInfo) {
        setIsProgramDeployed(true);
        setError(null);
      }
    } catch (error) {
      console.error("Error checking program:", error);
      setError(
        "The Arch Graffiti program has not been deployed to the network yet. Please run `arch-cli deploy`."
      );
    }
  }, [client, PROGRAM_PUBKEY]);

  // Check if the account is created
  const checkAccountCreated = useCallback(async () => {
    try {
      const pubkeyBytes = PubkeyUtil.fromHex(WALL_ACCOUNT_PUBKEY);
      const accountInfo = await client.readAccountInfo(pubkeyBytes);
      if (accountInfo) {
        setIsAccountCreated(true);
        setError(null);
      }
    } catch (error) {
      console.error("Error checking account:", error);
      setIsAccountCreated(false);
      setError(
        "The wall account has not been created yet. Please run the account creation command."
      );
    }
  }, [client, WALL_ACCOUNT_PUBKEY]);

  // Function to connect OKX wallet
  const connectOKXWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("OKX Wallet is not installed. Please install it first.");
      }
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWalletConnected(true);
      setWalletAddress(accounts[0]); 
      setError(null);
    } catch (error) {
      console.error("Error connecting OKX wallet:", error);
      setWalletConnected(false);
      setWalletAddress(null); 
      setError("Failed to connect OKX wallet. Please try again.");
    }
  };

  // Function to disconnect OKX wallet
  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setError(null);
    console.log("Wallet disconnected.");
  };

  useEffect(() => {
    // console.log("VITE_RPC_URL:", import.meta.env.VITE_RPC_URL);
    // console.log("VITE_PROGRAM_PUBKEY:", import.meta.env.VITE_PROGRAM_PUBKEY);
    // console.log(
    //   "VITE_WALL_ACCOUNT_PUBKEY:",
    //   import.meta.env.VITE_WALL_ACCOUNT_PUBKEY
    // );

    checkProgramDeployed();
    checkAccountCreated();
  }, [checkProgramDeployed, checkAccountCreated]);

  return (
    <div className="arch-status-container p-6 bg-gray-100 rounded-md shadow-md">
      <h1 className="text-2xl font-bold mb-4">Arch Network Integration</h1>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Program Status:</h2>
        {isProgramDeployed ? (
          <p className="text-green-500">Program is deployed to the Arch Network. {PROGRAM_PUBKEY}</p>
        ) : (
          <p className="text-red-500">Program is not deployed.</p>
        )}
      </div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Account Status:</h2>
        {isAccountCreated ? (
          <p className="text-green-500">Wall account is created. {WALL_ACCOUNT_PUBKEY}</p>
        ) : (
          <p className="text-red-500">Wall account is not created.</p>
        )}
      </div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Wallet Status:</h2>
        {walletConnected ? (
          <>
            <p className="text-green-500">Wallet connected successfully.</p>
            <p className="text-gray-700">Address: {walletAddress}</p>
            <button
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
              onClick={disconnectWallet}
            >
              Disconnect Wallet
            </button>
          </>
        ) : (
          <>
            <p className="text-red-500">Wallet is not connected.</p>
            <button
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
              onClick={connectOKXWallet}
            >
              Connect Wallet
            </button>
          </>
        )}
      </div>
      {error && <p className="text-red-500">Error: {error}</p>}
    </div>
  );
};

export default App;

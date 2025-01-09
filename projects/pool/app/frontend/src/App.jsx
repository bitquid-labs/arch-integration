import React, { useState, useCallback, useEffect } from "react";
import { RpcConnection, PubkeyUtil } from "@saturnbtcio/arch-sdk";
import { Buffer } from "buffer";

if (!window.Buffer) {
  window.Buffer = Buffer;
}

const App = () => {
  const [isProgramDeployed, setIsProgramDeployed] = useState(false);
  const [isAccountCreated, setIsAccountCreated] = useState(false);
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

  // Use Effect to check deployment status on mount
  useEffect(() => {
    console.log("VITE_RPC_URL:", import.meta.env.VITE_RPC_URL);
    console.log("VITE_PROGRAM_PUBKEY:", import.meta.env.VITE_PROGRAM_PUBKEY);
    console.log(
      "VITE_WALL_ACCOUNT_PUBKEY:",
      import.meta.env.VITE_WALL_ACCOUNT_PUBKEY
    );

    checkProgramDeployed();
    checkAccountCreated();
  }, [checkProgramDeployed, checkAccountCreated]);

  return (
    <div className="arch-status-container">
      <h1>Arch Network Integration</h1>
      <div>
        <h2>Program Status:</h2>
        {isProgramDeployed ? (
          <p style={{ color: "green" }}>
            Program is deployed to the Arch Network.
          </p>
        ) : (
          <p style={{ color: "red" }}>Program is not deployed.</p>
        )}
      </div>
      <div>
        <h2>Account Status:</h2>
        {isAccountCreated ? (
          <p style={{ color: "green" }}>Wall account is created.</p>
        ) : (
          <p style={{ color: "red" }}>Wall account is not created.</p>
        )}
      </div>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
};

export default App;

const { request, AddressPurpose, BitcoinNetworkType } = require('sats-connect');
const { Pubkey, ArchRpcClient } = require('arch-typescript-sdk');

const client = new ArchRpcClient(import.meta.env.VITE_RPC_URL);

export async function getAccountAddress(pubkey) {
  console.log("pubkey", pubkey.toString());
  
  try {
    const address = await client.getAccountAddress(pubkey);
    return address;
  } catch (error) {
    console.error('Error getting account address:', error);
    throw new Error(`Failed to get account address: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function requestAddressFromWallet() {
  try {
    const result = await request('getAddresses', {
      purposes: [AddressPurpose.Payment],
      message: 'Address for Arch App',
    });

    if (result.status === 'success') {
      const paymentAddress = result.result.addresses.find(addr => addr.purpose === AddressPurpose.Payment);
      if (paymentAddress) {
        return paymentAddress.address;
      } else {
        throw new Error("Payment address not found in response");
      }
    } else {
      throw new Error(result.error.message || "Unknown error occurred");
    }
  } catch (err) {
    console.error("Error in requestAddressFromWallet:", err);
    throw err;
  }
}

export async function sendBitcoinTransaction(toAddress, satoshis) {
  try {
    const result = await request('sendTransfer', {
      recipients: [
        {
          address: toAddress,
          amount: Number(satoshis)
        }
      ],
    });

    if (result.status === 'success') {
      return {
        txid: result.result.txid,
        vout: 0, // Assuming the first output is always ours
        satoshis: satoshis
      };
    } else {
      throw new Error(result.error.message || "Unknown error occurred");
    }
  } catch (err) {
    console.error("Error in sendBitcoinTransaction:", err);
    throw err;
  }
}

export async function getBalance() {
  try {
    const result = await request('getBalance', null);

    if (result.status === 'success') {
      return result.result.total;
    } else {
      throw new Error(result.error.message || "Unknown error occurred");
    }
  } catch (err) {
    console.error("Error in getBalance:", err);
    throw err;
  }
}

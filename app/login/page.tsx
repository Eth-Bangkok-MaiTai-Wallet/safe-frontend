'use client';

import { WebAuthnP256 } from 'ox';
import { useState } from 'react';
import { createWalletClient, custom, type WalletClient } from 'viem';
import { mainnet } from 'viem/chains';

type LoginResult = {
  safes: Record<string, {
    safeAddress: string;
    safeLegacyOwners: string[];
    safeModuleOwners: string[];
    safeModulePasskey?: string;
  }>;
};

export default function Login() {
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const handlePasskeyLogin = async () => {
    try {
      // First get challenge from server
      const challengeResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/passkey/challenge`);
      const { challenge } = await challengeResponse.json();

      const { metadata, signature } = await WebAuthnP256.sign({
        challenge
      });

      // Send signature back for verification
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/passkey/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata,
          signature,
          challenge
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to login with passkey');
      }

      const data = await response.json();
      setLoginResult(data);
    } catch (error) {
      console.error('Error logging in with passkey:', error);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    const client = createWalletClient({
      chain: mainnet,
      transport: custom(window.ethereum)
    });

    const [address] = await client.requestAddresses();
    setWalletClient(client);
    setAddress(address);
    return { client, address };
  };

  const handleEthereumLogin = async () => {
    try {
      if (!walletClient || !address) {
        await connectWallet();
      }
      
      if (!walletClient || !address) return;

      const message = `Sign in to access your Safe\n\nURI: ${window.location.origin}\nVersion: 1\nChain ID: 1\nNonce: ${Math.random().toString(36).slice(2)}`;

      const signature = await walletClient.signMessage({
        account: address as `0x${string}`,
        message
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/ethereum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          message,
          signature,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to login with Ethereum');
      }

      const data = await response.json();
      setLoginResult(data);
    } catch (error) {
      console.error('Error logging in with Ethereum:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300">
      <div className="card w-[400px] bg-base-100 shadow-2xl">
        <div className="card-body">
          <h1 className="text-3xl font-bold text-center mb-8">Login to Safe</h1>
          
          <div className="flex flex-col gap-4">
            <button 
              className="btn btn-primary btn-lg normal-case font-bold"
              onClick={handlePasskeyLogin}
            >
              Login with Passkey
            </button>

            <div className="divider">OR</div>

            <button 
              className="btn btn-primary btn-lg normal-case font-bold"
              onClick={handleEthereumLogin}
            >
              {address ? 'Sign Message' : 'Connect Wallet'}
            </button>
          </div>

          {loginResult && (
            <div className="mt-8 pt-8 border-t border-base-300">
              <h2 className="text-xl font-bold mb-4">Your Safes</h2>
              <div className="bg-base-200 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(loginResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
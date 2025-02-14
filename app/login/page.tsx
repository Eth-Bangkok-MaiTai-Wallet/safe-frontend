'use client';

import { WebAuthnP256 } from 'ox';
import { useState } from 'react';
import { createWalletClient, custom, Hex, type WalletClient } from 'viem';
import { mainnet } from 'viem/chains';
import base64url from 'base64url';
import { PublicKey } from 'ox';

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
  const [username, setUsername] = useState('');

  const handlePasskeyLogin = async () => {
    try {
      // First get challenge from server
      const challengeResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/passkey/challenge`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const { challenge } = await challengeResponse.json();

      const decodedChallenge = base64url.decode(challenge, 'hex') as Hex;

      const { metadata, raw } = await WebAuthnP256.sign({
        challenge: `0x${decodedChallenge}`
      });


      const body = {
        id: raw.id,
        response: {
            clientDataJSON: base64url.encode(
                metadata.clientDataJSON
            ),
            authenticatorData: base64url.encode(
              Buffer.from(metadata.authenticatorData.replace(/^0x/, ''), 'hex')
            ),
            signature: base64url.encode(
              // @ts-expect-error signature exists
              raw.response.signature
            ),
            // @ts-expect-error userHandle exists
            userHandle: raw.response.userHandle
        },
    }

    // if (metadata.authenticatorAttachment) {
    //     body.authenticatorAttachment =
    //           userCredentials.authenticatorAttachment
    // }

      // Send signature back for verification
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/passkey/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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

  const handlePasskeySignup = async () => {
    try {
      // Step 1: Request a challenge from the server
      const challengeResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/passkey/challenge`, 
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username
          }),
        }
      );
      const { user, challenge } = await challengeResponse.json();

      console.log('User:', user);
      console.log('Challenge:', challenge);
      const decodedChallenge = base64url.decode(challenge, 'hex');
      console.log('decodedChallenge:', decodedChallenge);
      const bufferChallengeHex = Buffer.from(decodedChallenge, 'hex');
      // const bufferChallenge = base64url.toBuffer(challenge);
      const arrayBufferChallenge = bufferChallengeHex.buffer.slice(
        bufferChallengeHex.byteOffset,
        bufferChallengeHex.byteOffset + bufferChallengeHex.byteLength
      );

      console.log('decodedChallenge:', decodedChallenge);

      const credential = await WebAuthnP256.createCredential({ 
        name: username || base64url.decode(user.id),
        challenge: arrayBufferChallenge,
        // rp: {
        //   id: 'localhost',
        //   name: 'Create Next App'
        // }
      });

      console.log('credential:', credential);

      // Create a TextDecoder instance
      const decoder = new TextDecoder('utf-8');

      // Decode the Uint8Array to a string
      const strClientDataJSON = decoder.decode(credential.raw.response.clientDataJSON);
      // const strAttestationObject = decoder.decode((credential.raw.response as AuthenticatorAttestationResponse).attestationObject);


      // Now you can parse the JSON string if needed
      // const jsonObject = JSON.parse(jsonString);

      console.log(strClientDataJSON); // Logs the JSON string
      // console.log(jsonObject); // L

 
      const publicKey = PublicKey.from(credential.publicKey);

      console.log('PUBLIC KEY', publicKey);

      // Step 3: Send the signed challenge to the verify endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/passkey/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response: {
              clientDataJSON: base64url.encode(
                strClientDataJSON
                  // Buffer.from(credential.raw.response.clientDataJSON)
                  // metadata.clientDataJSON
              ),
              attestationObject: base64url.encode(
                Buffer.from((credential.raw.response as AuthenticatorAttestationResponse).attestationObject)
                // strAttestationObject
              ),
          },
          publicKeyHex: PublicKey.toHex(publicKey)
        }),
      });

      console.log('response:', response);

      if (!response.ok) {
        console.error('Failed to sign up with passkey');
      }

      alert('Passkey signup successful!');
    } catch (error) {
      console.error('Error signing up with passkey:', error);
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

            <div className="form-control">
              <label className="label">
                <span className="label-text">Username</span>
              </label>
              <input
                type="text"
                placeholder="Enter username"
                className="input input-bordered"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <button 
              className="btn btn-secondary btn-lg normal-case font-bold"
              onClick={handlePasskeySignup}
            >
              Sign up with Passkey
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
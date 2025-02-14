'use client';

import { useState } from 'react';
import { sign } from 'ox/WebAuthnP256';
import { Hex } from 'viem';
import { getWebauthnValidatorSignature } from '@rhinestone/module-sdk';

export default function StrategiesPage() {
  const [strategyName, setStrategyName] = useState('');
  const [strategyConfig, setStrategyConfig] = useState('');
  const [safeAddress, setSafeAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [sessionHash, setSessionHash] = useState<{hash: Hex, passkeyId: string}>({hash: '0x0' as Hex, passkeyId: ''});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/strategies`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: strategyName, config: strategyConfig }),
      });

      if (!response.ok) {
        throw new Error('Failed to create strategy');
      }

      // Reset form fields on successful submission
      setStrategyName('');
      setStrategyConfig('');

      alert('Strategy created successfully');
    } catch (error) {
      console.error('Error creating strategy:', error);
      alert('Failed to create strategy');
    }
  };

  const handleConfigure = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/safe/configure-session`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          safeAddress,
          chainId: parseInt(chainId),
          sessionConfig: {
            name: strategyName,
            config: strategyConfig,
          },
        }),
      });

      console.log('Response', response);

      if (!response.ok) {
        throw new Error('Failed to configure session');
      }

      const data = await response.json();

      console.log('Session configured successfully', data);

      setSessionHash({ hash: data.hash, passkeyId: data.passkeyId });

      alert('Session configured successfully');
    } catch (error) {
      console.error('Error configuring session:', error);
      alert('Failed to configure session');
    }
  };

  const handleSignSessionCreation = async () => {
    try {
      // TODO: Implement the logic to sign the session creation
      console.log('Signing session creation with hash:', sessionHash);


      const {metadata, signature} = await sign({
        challenge: sessionHash.hash,
        credentialId: sessionHash.passkeyId,
      });

      console.log('Signature', signature);

      const encodedSignature = getWebauthnValidatorSignature({
        webauthn: metadata,
        signature,
        usePrecompiled: false,
      });

      console.log('Encoded signature', encodedSignature);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/safe/sign-session-creation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hash: sessionHash.hash,
          safeAddress,
          chainId: Number(chainId),
          encodedSignature,
        }),
      });

      console.log('Response', response);

      // Add your signing logic here
    } catch (error) {
      console.error('Error signing session creation:', error);
      alert('Failed to sign session creation');
    }
  };

  return (
    <div className="min-h-screen bg-base-300 p-8">
      <h1 className="text-3xl font-bold mb-8">Configure Rhinestone Smart Sessions</h1>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Strategy Name</span>
          </label>
          <input
            type="text"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            className="input input-bordered"
            required
          />
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Strategy Config</span>
          </label>
          <textarea
            value={strategyConfig}
            onChange={(e) => setStrategyConfig(e.target.value)}
            className="textarea textarea-bordered h-24"
            required
          ></textarea>
        </div>

        <button type="submit" className="btn btn-primary">
          Create Strategy
        </button>
      </form>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Configure Session</h2>
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Safe Address</span>
          </label>
          <input
            type="text"
            value={safeAddress}
            onChange={(e) => setSafeAddress(e.target.value)}
            className="input input-bordered"
            required
          />
        </div>
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Chain ID</span>
          </label>
          <input
            type="number"
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
            className="input input-bordered"
            required
          />
        </div>
        <button onClick={handleConfigure} className="btn btn-secondary">
          Configure
        </button>

        {sessionHash && (
          <div className="mt-4">
            <p>Session Hash: {sessionHash.hash}</p>
            <button onClick={handleSignSessionCreation} className="btn btn-primary mt-2">
              Sign Session Creation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

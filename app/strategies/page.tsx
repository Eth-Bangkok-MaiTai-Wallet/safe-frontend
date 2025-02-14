'use client';

import { useState } from 'react';

export default function StrategiesPage() {
  const [strategyName, setStrategyName] = useState('');
  const [strategyConfig, setStrategyConfig] = useState('');
  const [safeAddress, setSafeAddress] = useState('');
  const [chainId, setChainId] = useState('');

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

      if (!response.ok) {
        throw new Error('Failed to configure session');
      }

      alert('Session configured successfully');
    } catch (error) {
      console.error('Error configuring session:', error);
      alert('Failed to configure session');
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
      </div>
    </div>
  );
}

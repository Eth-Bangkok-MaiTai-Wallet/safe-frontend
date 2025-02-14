'use client';

import { useState } from 'react';

export default function StrategiesPage() {
  const [strategyName, setStrategyName] = useState('');
  const [strategyConfig, setStrategyConfig] = useState('');

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
    </div>
  );
}

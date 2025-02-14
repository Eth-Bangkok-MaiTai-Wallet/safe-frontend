'use client';

import { useState, useEffect } from 'react';
import CreateTransactionButton from '../../components/CreateTransactionButton';

type User = {
  id: string;
  username: string;
  safesByChain: Array<{
    chainId: number;
    safes: Array<{
      safeAddress: string;
      safeLegacyOwners: string[];
      safeModuleOwners?: string[];
      safeModulePasskey?: string;
    }>;
  }>;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/user`, {
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);

          console.log('USER', userData);
        } else {
          console.error('Failed to fetch user');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  if (!user) {
    return <div>Loading...</div>;
  }

  const safes = user.safesByChain || [];

  return (
    <div className="min-h-screen bg-base-300 p-8">
      <h1 className="text-3xl font-bold mb-8">Welcome, {user.username}!</h1>

      <h2 className="text-2xl font-bold mb-4">Your Safes</h2>

      {safes.map(({ chainId, safes }) => (
        <div key={chainId}>
          <h3 className="text-xl font-bold mb-2">Chain {chainId}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safes.map((safe, index) => (
              <div key={index} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h4 className="card-title">Safe {index + 1}</h4>
                  <p>Safe Address: {safe.safeAddress}</p>
                  <p>Legacy Owners: {safe.safeLegacyOwners ? safe.safeLegacyOwners.join(', ') : 'N/A'}</p>
                  {safe.safeModuleOwners && safe.safeModuleOwners.length > 0 && (
                    <p>Module Owners: {safe.safeModuleOwners.join(', ')}</p>
                  )}
                  {safe.safeModulePasskey && (
                    <p>Passkey: {safe.safeModulePasskey}</p>
                  )}
                  <CreateTransactionButton
                    safeAddress={safe.safeAddress}
                    chainId={chainId}
                    passkeyId={safe.safeModulePasskey ? JSON.parse(safe.safeModulePasskey).id : undefined}
                    safeLegacyOwners={safe.safeLegacyOwners || []}
                    safeModuleOwners={safe.safeModuleOwners}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

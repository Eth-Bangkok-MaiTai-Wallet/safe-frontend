'use client';

import { useState, useEffect } from 'react';
import CreateTransactionButton from '../../components/CreateTransactionButton';
import CreateDCAButton from '@/components/CreateDCAButton';

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
    <div className="min-h-screen bg-base-300 p-8 text-base-content">
      <h1 className="text-4xl font-bold mb-8 text-primary">Welcome, {user.username}!</h1>

      <h2 className="text-3xl font-bold mb-6">Your Safes</h2>

      {safes.map(({ chainId, safes }) => (
        <div key={chainId} className="mb-8">
          <h3 className="text-2xl font-semibold mb-4 text-secondary">Chain {chainId}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safes.map((safe, index) => (
              <div key={index} className="card bg-base-100 shadow-xl border border-base-200">
                <div className="card-body">
                  <h4 className="card-title text-lg font-semibold text-accent">Safe {index + 1}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="break-words">
                      <span className="font-semibold">Address:</span><br />
                      {safe.safeAddress}
                    </div>
                    <div className="break-words">
                      <span className="font-semibold">Legacy Owners:</span><br />
                      {safe.safeLegacyOwners?.join(', ') || 'N/A'}
                    </div>
                    {safe.safeModuleOwners && safe.safeModuleOwners.length > 0 && (
                      <div className="break-words">
                        <span className="font-semibold">Module Owners:</span><br />
                        {safe.safeModuleOwners.join(', ')}
                      </div>
                    )}
                    {safe.safeModulePasskey && (
                      <div className="break-words">
                        <span className="font-semibold">Passkey ID:</span><br />
                        {JSON.parse(safe.safeModulePasskey).id}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <CreateTransactionButton
                      safeAddress={safe.safeAddress}
                      chainId={chainId}
                      passkeyId={safe.safeModulePasskey ? JSON.parse(safe.safeModulePasskey).id : undefined}
                      safeLegacyOwners={safe.safeLegacyOwners || []}
                      safeModuleOwners={safe.safeModuleOwners}
                    />
                  </div>

                  <div className="mt-4">
                    <CreateDCAButton
                      safeAddress={safe.safeAddress}
                      chainId={chainId}
                      passkeyId={safe.safeModulePasskey ? JSON.parse(safe.safeModulePasskey).id : undefined}
                      safeLegacyOwners={safe.safeLegacyOwners || []}
                      safeModuleOwners={safe.safeModuleOwners}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

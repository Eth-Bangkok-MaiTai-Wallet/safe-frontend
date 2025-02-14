'use client';

import { WebAuthnP256, Signature, PublicKey } from 'ox';
import { useState } from 'react';
import base64url from 'base64url';
import { Hex } from 'viem';
import CreateTransactionButton from '../../components/CreateTransactionButton';

type SafeConfig = {
  passkey?: {
    name: string;
    id: string;
    publicKey: Hex
  };
  multisig?: {
    owners: string[];
    threshold: number;
  };
  chains: string[];
};

const SUPPORTED_CHAINS = [
  // Mainnets
  { id: '1', name: 'Ethereum', icon: '🔷' },
  { id: '10', name: 'Optimism', icon: '🔴' },
  { id: '100', name: 'Gnosis Chain', icon: '🟣' },
  { id: '137', name: 'Polygon', icon: '🟣' },
  { id: '42161', name: 'Arbitrum', icon: '🔵' },
  { id: '43114', name: 'Avalanche', icon: '🔺' },
  { id: '8453', name: 'Base', icon: '🔷' },
  // Testnets
  { id: '11155111', name: 'Sepolia', icon: '🔷' },
  { id: '11155420', name: 'Optimism Sepolia', icon: '🔴' },
  { id: '84532', name: 'Base Sepolia', icon: '🔷' },
  { id: '421614', name: 'Arbitrum Sepolia', icon: '🔵' },
];

export default function Home() {
  const [owners, setOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState(1);
  const [passkeyName, setPasskeyName] = useState('');
  const [config, setConfig] = useState<SafeConfig | null>(null);
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [deploymentResult, setDeploymentResult] = useState<Record<string, {
    safeAddress: string;
    safeLegacyOwners: string[];
    safeModuleOwners: string[];
    safeModulePasskey: string | undefined;
  }> | null>(null);
  const [useExistingPasskey, setUseExistingPasskey] = useState(false);
  const [isCreatingSafe, setIsCreatingSafe] = useState(false);

  const handleRegister = async () => {
    try {
      const credential = await WebAuthnP256.createCredential({ 
        name: passkeyName 
      });
      console.log('Created credential:', credential);
      
      updateConfig('register', {
        name: passkeyName,
        id: credential.id,
        publicKey: PublicKey.toHex(credential.publicKey)
      });
    } catch (error) {
      console.error('Failed to create credential:', error);
    }
  };

  const handleUseExistingPasskey = async () => {
    try {
      // Get challenge from server
      const challengeResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/passkey/challenge`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const { challenge } = await challengeResponse.json();

      // decode and sign
      const decodedChallenge = base64url.decode(challenge);
       
      const { metadata, raw, signature } = await WebAuthnP256.sign({
        challenge: decodedChallenge as Hex,
      })

      // send verification request
      const verifyData = {
        metadata: metadata,
        challenge: decodedChallenge as Hex,
        signature: Signature.toHex(signature),
        credentialId: raw.id
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/safe/verify-passkey-signer`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifyData),
      });

      if (!response.ok) {
        throw new Error('Failed to verify existing passkey');
      }

      const user = await response.json();

      updateConfig('register', {
        name: user.username,
        id: user.passkey.id,
        publicKey: user.passkey.publicKeyHex
    });
    
    } catch (error) {
      console.error('Error using existing passkey:', error);
    }
  };

  const handleAddOwners = () => {
    updateConfig('owners');
  };

  const handleChainToggle = (chainId: string) => {
    setSelectedChains(prev => {
      const newChains = prev.includes(chainId) 
        ? prev.filter(id => id !== chainId)
        : [...prev, chainId];
      
      // Update config with new chains
      setConfig(prevConfig => prevConfig ? {
        ...prevConfig,
        chains: newChains,
      } : null);
      
      return newChains;
    });
  };

  const updateConfig = (trigger: 'register' | 'owners', credential?: { name?: string, id: string, publicKey: Hex }) => {
    setConfig(prevConfig => {
      const baseConfig = {
        ...prevConfig,
        chains: selectedChains,
      };

      if (trigger === 'register' && credential) {
        return {
          ...baseConfig,
          passkey: { 
            name: credential.name || passkeyName,
            id: credential.id,
            publicKey: credential.publicKey
          },
        };
      } else {
        return {
          ...baseConfig,
          multisig: {
            owners,
            threshold,
          },
        };
      }
    });
  };

  const addOwner = () => {
    setOwners([...owners, '']);
  };

  const removeOwner = (index: number) => {
    setOwners(owners.filter((_, i) => i !== index));
    // Adjust threshold if it would exceed the new number of owners
    const newOwnersCount = owners.length - 1;
    if (threshold > newOwnersCount) {
      setThreshold(Math.max(1, newOwnersCount));
    }
  };

  const updateOwner = (index: number, value: string) => {
    const newOwners = [...owners];
    newOwners[index] = value;
    setOwners(newOwners);
  };

  const handleThresholdChange = (value: string) => {
    const newValue = parseInt(value);
    if (!isNaN(newValue) && newValue >= 1 && newValue <= owners.length) {
      setThreshold(newValue);
    }
  };

  const createSafe = async () => {
    try {
      setIsCreatingSafe(true);
      const createDto = {
        chains: selectedChains,
        passkey: config?.passkey ? {
          name: config.passkey.name,
          id: config.passkey.id,
          publicKey: config.passkey.publicKey,
        } : undefined,
        multisig: config?.multisig ? {
          owners: config.multisig.owners,
          threshold: config.multisig.threshold,
        } : undefined,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/safe/create`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createDto),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create safe');
      }

      const data = await response.json();
      setDeploymentResult(data);
      console.log('Safe created:', data);
    } catch (error) {
      console.error('Error creating safe:', error);
    } finally {
      setIsCreatingSafe(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300">
      <div className="card w-[800px] bg-base-100 shadow-2xl">
        <div className="card-body">
          <h1 className="text-3xl font-bold text-center mb-8">Configure New Safe</h1>
          
          <div className="flex flex-col md:flex-row gap-8">
            {/* Passkey Section */}
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                Add Passkey Signer
                <div className="tooltip" data-tip="Register a passkey to use as a signer for your Safe. Important: If you don't add owners, the passkey will be the only signer for your Safe. if you lose your passkey you will lose access to your safe.">
                  <span className="text-base-content/60 cursor-help">ⓘ</span>
                </div>
              </h2>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Use existing passkey</span> 
                  <input
                    type="checkbox"
                    checked={useExistingPasskey}
                    onChange={() => setUseExistingPasskey(!useExistingPasskey)}
                    className="checkbox"
                  />
                </label>
              </div>
              {!useExistingPasskey ? (
                <>
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text text-base font-medium">Passkey name</span>
                    </label>
                    <input 
                      type="text" 
                      value={passkeyName}
                      onChange={(e) => setPasskeyName(e.target.value)}
                      placeholder="Enter passkey name" 
                      className="input input-bordered input-md bg-base-200 w-full focus:outline-none focus:border-primary" 
                    />
                  </div>
                  <button 
                    className="btn btn-primary btn-md normal-case font-bold mt-4"
                    onClick={handleRegister}
                  >
                    Register
                  </button>
                </>
              ) : (
                <button 
                  className="btn btn-primary btn-md normal-case font-bold mt-4"
                  onClick={handleUseExistingPasskey}
                >
                  Use Existing
                </button>
              )}
            </div>

            {/* Owners Section - remove left border on mobile */}
            <div className="flex-1 md:border-l md:pl-8 border-base-300">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                Add Owners
                <div className="tooltip" data-tip="Add Ethereum addresses as additional signers, if you add more than one owner, you can set a threshold for confirmations (multisig)">
                  <span className="text-base-content/60 cursor-help">ⓘ</span>
                </div>
              </h2>
              
              <div className="flex flex-col gap-4">
                {owners.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {owners.map((owner, index) => (
                      <div key={index} className="flex gap-2">
                        <input 
                          type="text" 
                          value={owner}
                          onChange={(e) => updateOwner(index, e.target.value)}
                          placeholder="Enter owner address" 
                          className="input input-bordered input-md bg-base-200 flex-1 focus:outline-none focus:border-primary" 
                        />
                        <button 
                          className="btn btn-circle btn-sm btn-error"
                          onClick={() => removeOwner(index)}
                        >
                          <span className="text-lg">×</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {owners.length > 0 && (
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Required confirmations</span>
                    </label>
                    <input 
                      type="number"
                      value={threshold}
                      onChange={(e) => handleThresholdChange(e.target.value)}
                      min={1}
                      max={owners.length}
                      className="input input-bordered input-md bg-base-200 w-32 text-center" 
                    />
                  </div>
                )}

                <div className="flex justify-center flex-col items-center gap-4">
                  <button 
                    className="btn btn-circle btn-primary"
                    onClick={addOwner}
                  >
                    <span className="text-xl">+</span>
                  </button>

                  <button 
                    className="btn btn-primary btn-md normal-case font-bold w-full"
                    onClick={handleAddOwners}
                  >
                    Add owners
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chain Selection Section - Always visible */}
          <div className="mt-8 pt-8 border-t border-base-300">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              Select Chains
              <div className="tooltip" data-tip="Choose the networks where you want to deploy your Safe">
                <span className="text-base-content/60 cursor-help">ⓘ</span>
              </div>
            </h2>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_CHAINS.map(chain => (
                <label 
                  key={chain.id} 
                  className={`
                    btn btn-sm normal-case
                    ${selectedChains.includes(chain.id) ? 'btn-primary' : 'btn-outline'}
                  `}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedChains.includes(chain.id)}
                    onChange={() => handleChainToggle(chain.id)}
                  />
                  <span className="mr-1">{chain.icon}</span>
                  {chain.name}
                </label>
              ))}
            </div>
          </div>

          {/* Configuration Overview Section */}
          {config && (config.passkey?.name || config.multisig?.owners.length) && (
            <div className="mt-8 pt-8 border-t border-base-300">
              <h2 className="text-xl font-bold mb-4">Configuration Overview</h2>
              <div className="bg-base-200 p-4 rounded-lg">
                {config.passkey?.name && (
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <span className="font-bold">passkey: </span>
                      {JSON.stringify({
                        name: config.passkey.name,
                        id: config.passkey.id,
                        publicKey: config.passkey.publicKey
                      }, null, 2)}
                    </div>
                    <button 
                      className="btn btn-circle btn-sm btn-error"
                      onClick={() => setConfig(prev => prev ? {
                        ...prev,
                        passkey: undefined,
                      } : null)}
                    >
                      <span className="text-lg">×</span>
                    </button>
                  </div>
                )}
                
                {config.multisig && config.multisig.owners.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <span className="font-bold">multisig: </span>
                      {JSON.stringify({
                        owners: config.multisig.owners,
                        threshold: config.multisig.threshold
                      }, null, 2)}
                    </div>
                    <button 
                      className="btn btn-circle btn-sm btn-error"
                      onClick={() => setConfig(prev => prev ? {
                        ...prev,
                        multisig: undefined,
                      } : null)}
                    >
                      <span className="text-lg">×</span>
                    </button>
                  </div>
                )}

                {selectedChains.length > 0 && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <span className="font-bold">chains: </span>
                      {JSON.stringify(selectedChains, null, 2)}
                    </div>
                  </div>
                )}
              </div>

              <button 
                className="btn btn-primary btn-md normal-case font-bold w-full mt-8"
                onClick={createSafe}
                disabled={selectedChains.length === 0 || isCreatingSafe}
              >
                {isCreatingSafe ? 'Creating Safe...' : 'Create Safe'}
              </button>
            </div>
          )}

          {deploymentResult && (
            <div className="mt-8 pt-8 border-t border-base-300">
              <h2 className="text-xl font-bold mb-4">Deployment Result</h2>
              <div className="bg-base-200 p-4 rounded-lg">
                {Object.entries(deploymentResult).map(([chainId, result]) => (
                  <div key={chainId} className="mb-4">
                    <h3 className="font-bold">Chain {chainId}</h3>
                    <div className="ml-4">
                      <div>Safe Address: {result.safeAddress}</div>
                      <div>Legacy Owners: {JSON.stringify(result.safeLegacyOwners)}</div>
                      <div>Module Owners: {JSON.stringify(result.safeModuleOwners)}</div>
                      {result.safeModulePasskey && (
                        <div>Passkey: {result.safeModulePasskey}</div>
                      )}
                    </div>
                    <CreateTransactionButton
                      safeAddress={result.safeAddress}
                      chainId={parseInt(chainId)}
                      passkeyId={config?.passkey?.id}
                      safeLegacyOwners={result.safeLegacyOwners || []}
                      safeModuleOwners={result.safeModuleOwners}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

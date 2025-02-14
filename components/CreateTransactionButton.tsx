import { useState } from 'react';
import ReactJson from 'react-json-view';
import { sign } from 'ox/WebAuthnP256';
import { getWebauthnValidatorSignature } from '@rhinestone/module-sdk';

type Props = {
  safeAddress: string;
  chainId: number;
  passkeyId?: string;
  safeLegacyOwners: string[];
  safeModuleOwners?: string[];
};

export default function CreateTransactionButton({ safeAddress, chainId, passkeyId, safeLegacyOwners, safeModuleOwners }: Props) {
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [transactionData, setTransactionData] = useState<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userOperation: any;
    userOpHashToSign: string;
  } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserOpSigned, setIsUserOpSigned] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [signedUserOpReceipt, setSignedUserOpReceipt] = useState<any>(null);
  const [isExecutingUserOp, setIsExecutingUserOp] = useState(false);

  const createTransaction = async () => {
    try {
      setIsCreatingTransaction(true);
      const calls = [
        {
          to: '0x6D7A849791a8E869892f11E01c2A5f3b25a497B6',
          functionName: 'greet',
          abi: [
            {
              inputs: [],
              name: 'greet', 
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
          ],
          args: [],
        },
      ];

      console.log('Creating transaction with passkeyId:', passkeyId);
      console.log('Safe address:', safeAddress);
      console.log('Chain ID:', chainId);
      console.log('Calls:', calls);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/safe/create-safe-passkey-user-operation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: safeAddress, chainId, calls, passkeyId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }

      const data = await response.json();
      console.log('Transaction created:', data);
      const userOperation = JSON.parse(data.userOperation);
      setTransactionData({ userOperation, userOpHashToSign: data.userOpHashToSign });
    } catch (error) {
      console.error('Error creating transaction:', error);
    } finally {
      setIsCreatingTransaction(false);
    }
  };

  const handleSignTransaction = () => {
    setIsModalOpen(true);
  };

  const handleSignWithPasskey = async () => {
    try {
      setIsExecutingUserOp(true);

      const { metadata: webauthn, signature } = await sign({
        credentialId: passkeyId,
        challenge: transactionData?.userOpHashToSign as `0x${string}`,
      });
      console.log('Signing with passkey');
      console.log('Webauthn:', webauthn);
      console.log('Signature:', signature);

      const encodedSignature = getWebauthnValidatorSignature({
        webauthn,
        signature,
        usePrecompiled: false,
      });
       
    //   if (transactionData) {
    //     transactionData.userOperation.signature = encodedSignature;
    //   }

      console.log('Transaction data:', transactionData);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/safe/execute-signed-passkey-user-operation`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ encodedSignature, userOpHashToSign: transactionData?.userOpHashToSign, safeAddress, chainId }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute user op');
      }

      const data = await response.json();
      console.log('User op executed:', data);
      setIsUserOpSigned(true);
      setSignedUserOpReceipt(data);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error signing with passkey:', error);
    } finally {
      setIsExecutingUserOp(false);
    }
  };

  const handleSignWithLegacyOwner = async (ownerAddress: string) => {
    try {
      // TODO: Implement signing with legacy owner
      console.log('Signing with legacy owner:', ownerAddress);
    } catch (error) {
      console.error('Error signing with legacy owner:', error);
    }
  };

  const handleSignWithModuleOwner = async (ownerAddress: string) => {
    try {
      // TODO: Implement signing with module owner
      console.log('Signing with module owner:', ownerAddress);
    } catch (error) {
      console.error('Error signing with module owner:', error);
    }
  };

  return (
    <div>
      <button
        className="btn btn-primary btn-sm normal-case font-bold mt-4"
        onClick={createTransaction}
        disabled={isCreatingTransaction}
      >
        {isCreatingTransaction ? 'Creating User Op...' : 'Create User Op'}
      </button>

      {transactionData && (
        <div className="mt-4">
          <div className="collapse">
            <input
              type="checkbox"
              className="peer"
              checked={!isCollapsed}
              onChange={() => setIsCollapsed(!isCollapsed)}
            />
            <div className="collapse-title text-xl font-medium bg-base-300 rounded-box">
              Review Transaction Data
            </div>
            <div className="collapse-content bg-base-100 rounded-box">
              <ReactJson
                src={transactionData.userOperation}
                theme="monokai"
                style={{ backgroundColor: 'transparent' }}
                collapsed={1}
                displayDataTypes={false}
                displayObjectSize={false}
                enableClipboard={false}
                sortKeys
              />
            </div>
          </div>
          <p className="mt-2">User Op Hash to Sign: {transactionData.userOpHashToSign}</p>
          <button
            className="btn btn-secondary btn-sm normal-case font-bold mt-4"
            onClick={handleSignTransaction}
            disabled={isUserOpSigned}
          >
            Sign User Op
          </button>
        </div>
      )}

      {signedUserOpReceipt && (
        <div className="mt-4">
          <h3 className="text-xl font-bold">Receipt</h3>
          <ReactJson
            src={signedUserOpReceipt}
            theme="monokai"
            style={{ backgroundColor: 'transparent' }}
            collapsed={1}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            sortKeys
          />
        </div>
      )}

      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Select Signing Method</h3>
            {passkeyId && (
              <div className="mt-4">
                <button
                  className="btn btn-primary btn-sm normal-case font-bold"
                  onClick={handleSignWithPasskey}
                  disabled={isExecutingUserOp}
                >
                  {isExecutingUserOp ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    'Sign with Passkey'
                  )}
                </button>
              </div>
            )}
            {safeLegacyOwners.length > 0 && (
              <div className="mt-4">
                {/* <h4 className="font-bold">Legacy Owners</h4> */}
                {safeLegacyOwners
                  .filter((ownerAddress) => ownerAddress !== '0x5380c7b7Ae81A58eb98D9c78de4a1FD7fd9535FC')
                  .map((ownerAddress) => (
                    <div key={ownerAddress} className="mt-2">
                      <button
                        className="btn btn-primary btn-sm normal-case font-bold"
                        onClick={() => handleSignWithLegacyOwner(ownerAddress)}
                      >
                        Sign with {ownerAddress}
                      </button>
                    </div>
                  ))
                }
              </div>
            )}
            {safeModuleOwners && safeModuleOwners.length > 0 && (
              <div className="mt-4">
                <h4 className="font-bold">Module Owners</h4>
                {safeModuleOwners.map((ownerAddress) => (
                  <div key={ownerAddress} className="mt-2">
                    <button
                      className="btn btn-primary btn-sm normal-case font-bold"
                      onClick={() => handleSignWithModuleOwner(ownerAddress)}
                    >
                      Sign with {ownerAddress}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-action">
              <button className="btn" onClick={() => setIsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
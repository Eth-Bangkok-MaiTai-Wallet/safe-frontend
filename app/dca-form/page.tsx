"use client"
import React, { useState, useEffect } from 'react';
import { ArrowLeft, HelpCircle, Settings } from 'lucide-react';
import { Client, createPublicClient, createWalletClient, custom, decodeAbiParameters, encodeAbiParameters, encodeFunctionData, encodePacked, http, HttpTransport, parseAbi, parseAbiParameters, parseEther, verifyMessage } from 'viem';
import { arbitrum, mainnet, sepolia } from 'viem/chains';
import truncateEthAddress from 'truncate-eth-address';

///// SAFE RELATED IMPORTS
import {
  toSafeSmartAccount,
  ToSafeSmartAccountReturnType
} from 'permissionless/accounts'
import { createSmartAccountClient } from 'permissionless';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { Erc7579Actions, erc7579Actions } from 'permissionless/actions/erc7579';
import { SendUserOperationParameters } from 'viem/account-abstraction';
import { getBalance } from 'viem/actions';
import { SafeSelector } from '@/components/SafeSelector'

const DeFiInterface = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [walletClient, setWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null);
  const [loading, setLoading] = useState(false);
  const [safeAddress, setSafeAddress] = useState<string | null>(null)
  const [safeIsDeployed, setSafeIsDeployed] = useState(false)
  const [safeAccount, setSafeAccount] =
    useState<ToSafeSmartAccountReturnType<'0.7'> | null>(null)
  const [smartAccountClient, setSmartAccountClient] = useState<
    | (Client<HttpTransport, typeof arbitrum> &
        Erc7579Actions<ToSafeSmartAccountReturnType<'0.7'>> & {
          sendUserOperation: (
            params: SendUserOperationParameters
          ) => Promise<string>
        })
    | null
  >(null)
  const [moduleIsInstalled, setModuleIsInstalled] = useState(false)
  const [moduleIsUninstalled, setModuleIsUninstalled] = useState(false)
  
  // Add new state variables
  const [tokenIn, setTokenIn] = useState<`0x${string}`>('0x0000000000000000000000000000000000000000')
  const [tokenOut, setTokenOut] = useState<`0x${string}`>('0x0000000000000000000000000000000000000000')
  const [amountIn, setAmountIn] = useState<bigint>(0n)
  const [sqrtPriceLimitX96, setSqrtPriceLimitX96] = useState<bigint>(4295128740n)
  const [executorTransactionIsSent, setExecutorTransactionIsSent] = useState(false)
  const [balance, setBalance] = useState<bigint | null>(null);
  const [selectedSafe, setSelectedSafe] = useState<string | null>(null)

  // Initialize wallet client
  useEffect(() => {
    const walletClient = createWalletClient({
      chain: arbitrum,
      // @ts-expect-error MetaMask is required
      transport: custom(typeof window !== 'undefined' ? window.ethereum! : null)
    });
    setWalletClient(walletClient);
  }, []);

  // Check for connected accounts on page load
  useEffect(() => {
    checkAddresses();
  }, [walletClient]);

  const checkAddresses = async () => {
    if (!walletClient) return;
    const addresses = await walletClient.getAddresses();
    setOwnerAddress(addresses[0]);
  };

  const connectWallet = async () => {
    setLoading(true);
    await walletClient!.requestAddresses();
    await checkAddresses();
    setLoading(false);
  };

  const steps = [
    { number: 1, title: 'Choose Funding & Assets' },
    { number: 2, title: 'Configure Strategy' },
    { number: 3, title: 'Post Purchase' },
    { number: 4, title: 'Confirm & Sign' }
  ];

  const renderStepIndicator = () => (
    <div className="flex items-center space-x-2 mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div 
            className={`w-2 h-2 rounded-full ${
              currentStep >= step.number ? 'bg-green-400' : 'bg-gray-600'
            }`}
          />
          {index < steps.length - 1 && (
            <div 
              className={`w-8 h-0.5 ${
                currentStep > step.number ? 'bg-green-400' : 'bg-gray-600'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  //////// SAFE ACCOUNT CREATION /////////
  // The public client is required for the safe account creation:
  const publicClient = createPublicClient({  
    transport: http(),
    chain: arbitrum
  })
  const pimlicoUrl = `https://api.pimlico.io/v2/42161/rpc?apikey=${process.env.NEXT_PUBLIC_PILMICO_API}`
  // The Pimlico client is used as a paymaster:
  const pimlicoClient = createPimlicoClient({
    transport: http(pimlicoUrl),
    chain: arbitrum
  })
  const scheduledOrdersModule = "0x40dc90d670c89f322fa8b9f685770296428dcb6b"

  const init = async (safeAddress?: string) => {
    const safeAccount = await toSafeSmartAccount<
      '0.7', 
      '0xEBe001b3D534B9B6E2500FB78E67a1A137f561CE'
    >({
      client: publicClient,
      owners: [walletClient!],
      version: '1.4.1',
      safe4337ModuleAddress: '0x3Fdb5BC686e861480ef99A6E3FaAe03c0b9F32e2',
      erc7579LaunchpadAddress: '0xEBe001b3D534B9B6E2500FB78E67a1A137f561CE',
      ...(safeAddress && { address: safeAddress })
    })
  
    const isSafeDeployed = await safeAccount.isDeployed()
  
    setSafeAddress(safeAccount.address)
    setSafeIsDeployed(isSafeDeployed)
  
    // Remove paymaster configuration and simplify the smart account client
    const smartAccountClient = createSmartAccountClient({
      account: safeAccount,
      chain: arbitrum,
      bundlerTransport: http(pimlicoUrl),
      // paymaster: pimlicoClient,
      userOperation: {
        estimateFeesPerGas: async () => {
          return (await pimlicoClient.getUserOperationGasPrice()).fast
        }
      }
    }).extend(erc7579Actions())

    console.log("Smart Account Client: ", smartAccountClient)
  
    // Check whether the module has been installed already:
    const isModuleInstalled =
      isSafeDeployed &&
      (await smartAccountClient.isModuleInstalled({
        address: scheduledOrdersModule,
        type: 'executor',
        context: '0x'
    }))
  
    setModuleIsInstalled(isModuleInstalled)
  
    // We store the clients in the state to use them in the following steps:
    setSafeAccount(safeAccount)
    setSmartAccountClient(smartAccountClient)
  
    console.log('setup done')
  }

  // uint48 executeInterval;
  // uint16 numberOfExecutions;
  // uint16 numberOfExecutionsCompleted;
  // uint48 startDate;
  // bool isEnabled;
  // uint48 lastExecutionTime;
  // bytes executionData;

  const installModule = async () => {
    setLoading(true)
    console.log('Installing module...')

    console.log("Safe address: ", safeAddress)
    
    if(safeAddress){
      const balance = await publicClient.getBalance({
          address: safeAddress as `0x${string}`,
      });
      console.log("Safe Balance: ", balance)
    }
    // Test values for Uniswap V3 SwapRouter on Sepolia
    const swapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    const weth = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
    const usdc = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    const initialAmount = 1000000n
    setTokenIn(usdc)
    setTokenOut(weth)
    setAmountIn(1000000n)
    console.log("tokenIn: ", tokenIn)
    console.log("tokenOut: ", tokenOut)
    console.log("amountIn: ", amountIn)

    const executionData = encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "uint256" }
      ],
      [usdc, weth, initialAmount]
    );

    console.log("Execution data: ", executionData)

    // const result = decodeAbiParameters([
    //   { type: "address" },
    //   { type: "address" },
    //   { type: "uint256" }
    // ], executionData)
    
    // console.log("Decoded execution data: ", result)

    // Test values for the module parameters:
    // executeInterval: 1 day in seconds (86400)
    // numberOfExecutions: 10
    // numberOfExecutionsCompleted: 0
    // startDate: current timestamp + 1 hour
    // isEnabled: true
    // lastExecutionTime: 0
    // executionData: empty bytes
    const calldata = encodePacked(
      ['address', 'uint48', 'uint16', 'uint48', 'bytes'], 
      [
        swapRouterAddress,
        86400,                          
        8,                               
        Number((await publicClient.getBlock()).timestamp),
        executionData
      ]
    )

    console.log("Before install module: ", calldata)

    const userOpHash = await smartAccountClient?.installModule({
      type: 'executor',
      address: scheduledOrdersModule,
      context: calldata
    })
  
    console.log('User operation hash:', userOpHash, '\nwaiting for receipt...')
  
    // After we sent the user operation, we wait for the transaction to be settled:
    const transactionReceipt = await pimlicoClient.waitForUserOperationReceipt({
      hash: userOpHash as `0x${string}`
    })
  
    console.log('Module installed:', transactionReceipt)

    //read job count
    const jobCount = await publicClient.readContract({
      address: scheduledOrdersModule,
      abi: parseAbi(['function accountJobCount(address) view returns (uint256)']),
      functionName: 'accountJobCount',
      args: [safeAddress as `0x${string}`]
    })

    console.log("Job count: ", jobCount)
  
    setModuleIsInstalled(true)
    setSafeIsDeployed((await safeAccount?.isDeployed()) ?? false)
    setLoading(false)
  }

  const readExecutionConfig = async () => {
    const executionConfigAbi = parseAbi([
      'function executionLog(address, uint256) view returns ' +
      '(uint48 executeInterval, ' +
      'uint16 numberOfExecutions, ' +
      'uint16 numberOfExecutionsCompleted, ' +
      'uint48 startDate, ' +
      'bool isEnabled, ' +
      'uint48 lastExecutionTime, ' +
      'bytes executionData)'
    ])
    //read config
    const executionConfig = await publicClient.readContract({
      address: scheduledOrdersModule,
      abi: executionConfigAbi,
      functionName: 'executionLog',
      args: ["0x0f462982B410FE97634f2b85D2ada4637edd387C" as `0x${string}`, 1n]
    })

    console.log('Execution config:', executionConfig)
  }

  const uninstallModule = async () => {
    setLoading(true)
    console.log('Uninstalling module...')

    const init_calldata = encodePacked(
      ['address', 'uint48', 'uint16', 'uint48', 'bytes'], 
      [
        '0x0000000000000000000000000000000000000000' as `0x${string}`,
        0,                           // execute every 10s
        0,                               // 10 total executions
        0, // start in 1 minute
        '0x'                              // empty execution data
      ]
    )
  
    // To uninstall the module, use the `uninstallModule`.
    // You have to pack the abi parameter yourself:
    // - previousEntry (address): The address of the previous entry in the module sentinel list.
    // - deInitData (bytes): The data that is passed to the deInit function of the module.
    // As this is the only module, the previous entry is the sentinel address 0x1. The deInitData is empty for the
    // OwnableExecutor.
    const userOp = await smartAccountClient?.uninstallModule({
      type: 'executor',
      address: scheduledOrdersModule,
      context: encodeAbiParameters(
        parseAbiParameters('address prevEntry, bytes memory deInitData'),
        ['0x0000000000000000000000000000000000000001', init_calldata]
      )
    })
  
    console.log('User operation:', userOp, '\nwaiting for tx receipt...')
  
    // We wait for the transaction to be settled:
    const receipt = await pimlicoClient.waitForUserOperationReceipt({
      hash: userOp as `0x${string}`
    })
  
    console.log('Module uninstalled, tx receipt:', receipt)
    setModuleIsUninstalled(true)
    setLoading(false)
  }

  // function executeOrder(
  //   uint256 jobId,
  //   uint160 sqrtPriceLimitX96,
  //   uint256 amountOutMinimum,
  //   uint24 fee
  // )
  const executeOrder2 = async () => {
    setLoading(true)
    console.log('Executing order...')

    // // Read accountJobCount from contract
    // const jobCount = await publicClient.readContract({
    //   address: scheduledOrdersModule,
    //   abi: parseAbi(['function accountJobCount(address) view returns (uint256)']),
    //   functionName: 'accountJobCount',
    //   args: [safeAddress as `0x${string}`]
    // })

    // console.log('Job count for safe account:', jobCount)

    // // First define the ABI for the ExecutionConfig struct and the getter function
    // const executionConfigAbi = parseAbi([
    //   'function executionLog(address, uint256) view returns ' +
    //   '(uint48 executeInterval, ' +
    //   'uint16 numberOfExecutions, ' +
    //   'uint16 numberOfExecutionsCompleted, ' +
    //   'uint48 startDate, ' +
    //   'bool isEnabled, ' +
    //   'uint48 lastExecutionTime, ' +
    //   'bytes executionData)'
    // ])

    // // Read the execution config for the first job (jobId = 1)
    // const executionConfig = await publicClient.readContract({
    //   address: scheduledOrdersModule,
    //   abi: executionConfigAbi,
    //   functionName: 'executionLog',
    //   args: [safeAddress as `0x${string}`, 1n]
    // })

    // console.log('Execution config:', executionConfig)

    // const block = await publicClient.getBlock();
    // console.log('Current block timestamp:', Number(block.timestamp));
    // console.log('Current block timestamp in seconds:', Number(block.timestamp));
    // console.log('Current block timestamp as date:', new Date(Number(block.timestamp) * 1000));


    // Create the raw transaction
    // const { request } = await publicClient.simulateContract({
    //   chain: arbitrum,
    //   account: ownerAddress as `0x${string}`,
    //   address: scheduledOrdersModule,
    //   abi: parseAbi(['function executeOrder(uint256, uint160, uint256, uint24)']),
    //   functionName: 'executeOrder',
    //   args: [1n, 4295128740n, 0n, 3000]
    // })

    // console.log("Raw request: ", request)

    // walletClient?.writeContract()

    // Now, we call the `executeOnOwnedAccount` function of the `ownableExecutorModule` with the address of the safe
    // account and the data we want to execute. This will make our smart account send the transaction that is encoded above.
    const hash = await walletClient!.writeContract({
      chain: arbitrum,
      account: ownerAddress as `0x${string}`,
      abi: parseAbi(['function executeOrder(uint256, uint160, uint256, uint24)']),
      functionName: 'executeOrder',
      args: [1n, 4295128740n, 0n, 3000],
      address: scheduledOrdersModule
    })
  
    console.log('Executed on owned account, transaction hash:', hash)
  
    await publicClient?.waitForTransactionReceipt({ hash })
  
    setExecutorTransactionIsSent(true)
    setLoading(false)
  }

  const checkBalance = async (address: string) => {
    try {
      const balance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      setBalance(balance);
      return balance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return null;
    }
  };

  const sendUsdc = async () => {
    setLoading(true);
    try {
      // USDC contract address on Arbitrum
      const usdcAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

      console.log("Safe address: ", safeAddress)
      
      // Encode USDC transfer function call
      const transferData = encodeFunctionData({
        abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
        functionName: 'transfer',
        args: [
          '0xcb44ccFbC39bd7E3095641D2A710501A0ED0c960', // Replace with actual recipient address
          1000000n // 1 USDC (6 decimals)
        ]
      });

      // Create user operation to send USDC
      const userOpHash = await smartAccountClient?.sendUserOperation({
        calls: [{
          to: usdcAddress as `0x${string}`,
          value: 0n,
          data: transferData
        }]
      });

      // Wait for transaction receipt
      const receipt = await pimlicoClient.waitForUserOperationReceipt({
        hash: userOpHash as `0x${string}`
      });

      console.log('USDC transfer successful:', receipt);
    } catch (error) {
      console.error('USDC transfer failed:', error);
    } finally {
      setLoading(false);
    }
  }

  const executeOrder = async () => {
    setLoading(true)
    console.log('Executing order...')

    const jobCount = await publicClient.readContract({
      address: scheduledOrdersModule,
      abi: parseAbi(['function accountJobCount(address) view returns (uint256)']),
      functionName: 'accountJobCount',
      args: [safeAddress as `0x${string}`]
    })

    console.log("Job count: ", jobCount)
  
    // The addOwner function is part of the OwnableExecutorModule. We encode the function data using the viem library:
    const executeOrderData = encodeFunctionData({
      abi: parseAbi(['function executeOrder(uint256, uint160, uint256, uint24)']),
      functionName: 'executeOrder',
      args: [1n, 1461446703485210103287273052203988822378723970341n, 0n, 3000],
    })
    // 1461446703485210103287273052203988822378723970341
    // 4295128740n
  
    // We use the smart account client to send the user operation: In this call, our smart account calls the `addOwner`
    // function at the `ownableExecutorModule` with the new owner's address.
    const userOp = await smartAccountClient?.sendUserOperation({
      calls: [
        {
          to: scheduledOrdersModule,
          value: parseEther('0'),
          data: executeOrderData
        }
      ],
    })
  
    console.log('User operation:', userOp, '\nwaiting for tx receipt...')
  
    // Again, we wait for the transaction to be settled:
    const receipt = await pimlicoClient.waitForUserOperationReceipt({
      hash: userOp as `0x${string}`
    })
  
    console.log('Order executed, tx receipt:', receipt)
  }

  useEffect(() => {
    if (safeAddress) {
      checkBalance(safeAddress);
    }
  }, [safeAddress]);

  const renderBalance = () => {
    if (balance === null) return null;
    
    const ethBalance = Number(balance) / 1e18;
    return (
      <div className="mb-6 p-4 bg-gray-800 rounded-lg text-sm">
        Balance: {ethBalance.toFixed(4)} ETH
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-300">Buy strategies</span>
          <HelpCircle size={16} className="text-gray-500" />
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300">DCA in</button>
        </div>
      </div>

      <div>
        <label className="block text-gray-300 mb-2">
          How will you fund your first investment?
        </label>
        <div className="relative">
          <select className="w-full bg-gray-800 text-gray-300 rounded-lg px-4 py-3 appearance-none">
            <option>Choose asset</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-gray-300 mb-2">
          What asset do you want to invest in?
        </label>
        <div className="relative">
          <select className="w-full bg-gray-800 text-gray-300 rounded-lg px-4 py-3 appearance-none">
            <option>Choose asset</option>
          </select>
        </div>
      </div>

      <button 
        onClick={() => setCurrentStep(2)}
        className="w-full bg-yellow-500 text-black font-medium py-3 rounded-lg"
      >
        Next
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full" />
          <span className="text-gray-300">200 USDC</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-yellow-500 rounded-full" />
          <span className="text-gray-300">BTC</span>
        </div>
      </div>

      <div>
        <label className="block text-gray-300 mb-2">
          Start strategy immediately?
        </label>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg">Yes</button>
          <button className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg">No</button>
        </div>
      </div>

      <button 
        onClick={() => setCurrentStep(3)}
        className="w-full bg-yellow-500 text-black font-medium py-3 rounded-lg"
      >
        Next
      </button>
    </div>
  );

  if (!ownerAddress) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="card">
            <div className="title">Connect Wallet</div>
            <div className="text-gray-400 mb-4">
              Please connect your wallet to access the DCA strategy form.
            </div>
            <div className="actions">
              <button 
                onClick={connectWallet}
                className={loading ? 'button--loading' : ''}
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (ownerAddress && !selectedSafe) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="card">
            <div className="title">Select Safe Wallet</div>
            <div className="text-gray-400 mb-4">
              Choose a Safe wallet to use for this strategy:
            </div>
            <SafeSelector 
              onSafeSelected={async (safeAddress: string) => {
                setSelectedSafe(safeAddress)
                await init(safeAddress)
              }} 
            />
          </div>
        </div>
      </div>
    );
  }

  if (!moduleIsInstalled) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="card">
            <div className="title">Setup Required</div>
            <div className="text-gray-400 mb-4">
              Your Safe ({truncateEthAddress(selectedSafe!)}) needs to install the DCA module.
            </div>
            <div className="text-gray-400 mb-4">
              You can now install the module. MetaMask will ask you to sign a
              message with the first account after clicking the button.
            </div>
            <div className='actions'>
              <button
                onClick={installModule}
                className={loading ? 'button--loading' : ''}
              >
                Install Module
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="mb-6 p-4 bg-gray-800 rounded-lg text-sm">
          Connected wallet: {truncateEthAddress(ownerAddress)}
        </div>
        <div className="mb-6 p-4 bg-gray-800 rounded-lg text-sm">
          Safe account: {truncateEthAddress(selectedSafe!)}
        </div>
        {renderBalance()}
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            {currentStep > 1 && (
              <button onClick={() => setCurrentStep(currentStep - 1)}>
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-xl font-medium">
              {steps.find(s => s.number === currentStep)?.title}
            </h1>
          </div>
          <Settings size={20} className="text-yellow-500" />
        </div>

        {renderStepIndicator()}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}

        <div className='actions'>
          <button
            onClick={uninstallModule}
            className={loading ? 'button--loading' : ''}
          >
            Uninstall Module
          </button>
        </div>

        <div className='actions'>
          <button
            onClick={executeOrder}
            className={loading ? 'button--loading' : ''}
          >
            Execute Order
          </button>
        </div>

        <div className='actions'>
          <button
            onClick={sendUsdc}
            className={loading ? 'button--loading' : ''}
          >
            Send USDC
          </button>
        </div>

        <div className='actions'>
          <button
            onClick={readExecutionConfig}
            className={loading ? 'button--loading' : ''}
          >
            Read Execution Config
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = `
  .card {
    @apply bg-gray-800 p-6 rounded-xl;
  }
  .title {
    @apply text-xl font-medium mb-4;
  }
  .actions {
    @apply mt-6;
  }
  button {
    @apply w-full bg-yellow-500 text-black font-medium py-3 rounded-lg transition-all hover:bg-yellow-400;
  }
  .button--loading {
    @apply opacity-50 cursor-not-allowed;
  }
`;

export default DeFiInterface;
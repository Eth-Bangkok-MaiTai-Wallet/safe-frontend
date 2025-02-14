"use client"
import { TSetBalanceRpc, virtual_arbitrum_one } from "@/tenderly.config";
import { useEffect, useState } from "react";
import { createPublicClient, createWalletClient, custom, encodeAbiParameters, encodePacked, http, parseAbi, parseEther } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export default function TestEncoding() {
    const encodingContract = "0x43CfE4a91F0786FBCC87243eae83604d93CFdBA5"; 
    const [address, setAddress] = useState<`0x${string}` | null>(null);
    const [walletClient, setWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null);
    const account = privateKeyToAccount(generatePrivateKey());
    useEffect(() => {
        const walletClient = createWalletClient({
            account,
            chain: virtual_arbitrum_one,
            // transport: custom(typeof window !== 'undefined' ? window.ethereum! : null), // @ts-expect-error MetaMask is required
            transport: http(virtual_arbitrum_one.rpcUrls.default.http[0]),
        });
        setWalletClient(walletClient);
    }, []);

    const publicClient = createPublicClient({  
        transport: http(),
        chain: virtual_arbitrum_one
    })

    useEffect(() => {
        checkAddresses();
      }, [walletClient]);
    
      const checkAddresses = async () => {
        if (!walletClient) return;
        const addresses = await walletClient.getAddresses();
        setAddress(addresses[0]);
    };

    const handleTestEncoding = async () => {
        await walletClient!.request<TSetBalanceRpc>({
            method: "tenderly_setBalance",
            params: [
              [account.address],
              "0xDE0B6B3A7640000",
            ],
        });
        
        const txHash = await walletClient!.sendTransaction({
            account,
            chain: virtual_arbitrum_one,
            to: "0xa5cc3c03994DB5b0d9A5eEdD10CabaB0813678AC",
            value: parseEther("0.01"),
        });
        
        console.log(`${virtual_arbitrum_one.blockExplorers.default.url}/tx/${txHash}`);


        const weth = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
        const usdc = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
        const initialAmount = 1000000n
        const executionData = encodeAbiParameters(
            [
              { type: "address" },
              { type: "address" },
              { type: "uint256" }
            ],
            [usdc, weth, initialAmount]
        );
      
        console.log("Execution data: ", executionData)

        const calldata = encodePacked(
            ['uint48', 'uint16', 'uint48', 'bytes'], 
            [
              86400,                          
              10,                               
              Number((await publicClient.getBlock()).timestamp),
              executionData
            ]
        )

        const hash = await walletClient!.writeContract({
            chain: virtual_arbitrum_one,
            account: address,
            abi: parseAbi(['function supplyData(bytes calldata orderData) public']),
            functionName: 'supplyData',
            args: [calldata],
            address: encodingContract
        })

        console.log("Hash: ", hash)

        //call decode
        const hash2 = await walletClient!.writeContract({
            chain: virtual_arbitrum_one,
            account: address,
            abi: parseAbi(['function decode() public']),
            functionName: 'decode',
            args: [],
            address: encodingContract
        })
    }

    

    return (
        <div>
            <button onClick={handleTestEncoding}>
                test encoding
            </button>
        </div>
    )
}
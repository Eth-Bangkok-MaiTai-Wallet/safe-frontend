'use client'

// config/index.tsx
import { http, createConfig } from 'wagmi'
import { arbitrum, mainnet, sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [arbitrum, mainnet, sepolia],
  transports: {
    [arbitrum.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
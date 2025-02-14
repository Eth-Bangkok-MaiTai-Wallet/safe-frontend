import { defineChain, Hex } from "viem";

export const virtual_arbitrum_one = defineChain({
  id: 42161,
  name: 'Virtual Arbitrum One',
  nativeCurrency: { name: 'VETH', symbol: 'vETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://virtual.arbitrum.rpc.tenderly.co/3272a4aa-5e8b-4a45-abce-83c42492c392'] }
  },
  blockExplorers: {
    default: {
      name: 'Tenderly Explorer',
      url: 'https://virtual.arbitrum.rpc.tenderly.co/e3a22c9d-0e7b-4745-93f0-7301e2ed07a4'
    }
  },
});

export type TSetBalanceRpc = {
  method: "tenderly_setBalance",
  Parameters: [addresses: Hex[], value: Hex],
  ReturnType: Hex
}

export type TSetErc20BalanceRpc = {
  method: "tenderly_setErc20Balance",
  Parameters: [erc20: Hex, to: Hex, value: Hex],
  ReturnType: Hex
}
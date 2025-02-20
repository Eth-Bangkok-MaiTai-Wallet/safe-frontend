// Supported networks and their Safe Transaction Service URLs
// See https://docs.safe.global/services/transaction-service#transaction-service-urls
export const TRANSACTION_SERVICE_URLS: Record<string, string> = {
  '1': 'https://safe-transaction-mainnet.safe.global',         // Ethereum Mainnet
  '5': 'https://safe-transaction-goerli.safe.global',         // Goerli Testnet
  '100': 'https://safe-transaction-gnosis-chain.safe.global', // Gnosis Chain
  '137': 'https://safe-transaction-polygon.safe.global',      // Polygon
  '10': 'https://safe-transaction-optimism.safe.global',      // Optimism
  '42161': 'https://safe-transaction-arbitrum.safe.global',    // Arbitrum
  '11155111': 'https://safe-transaction-sepolia.safe.global', // Sepolia Testnet
  '1313161554': 'https://safe-transaction-aurora.safe.global',// Aurora
  // Add other networks as needed...
}

// Optional: You might also want to export network names
export const NETWORK_NAMES: Record<string, string> = {
  '1': 'Mainnet',
  '5': 'Goerli',
  '100': 'Gnosis Chain',
  '137': 'Polygon',
  '42161': 'Arbitrum'
  // ...etc
} 
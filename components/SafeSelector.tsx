// packages/api-kit/src/SafeSelector.tsx
import { useEffect, useState } from 'react'
import SafeApiKit from '@safe-global/api-kit'
import { useAccount, useChainId } from 'wagmi'
import { TRANSACTION_SERVICE_URLS } from '@/utils/config'

export const SafeSelector = ({ onSafeSelected }: any) => {
  const { address } = useAccount()
  const chainId = useChainId()
  const [safes, setSafes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSafes = async () => {
      if (!address || !chainId) return
      
      try {
        setLoading(true)
        console.log("ChainId: ", chainId.toString())
        // const txServiceUrl = TRANSACTION_SERVICE_URLS[chainId.toString()]
        const safeService = new SafeApiKit({chainId: chainId})
        
        const response = await safeService.getSafesByOwner(address)
        setSafes(response.safes)
        setError('')
      } catch (err) {
        setError('Failed to fetch Safes')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchSafes()
  }, [address, chainId])

  if (!address) return null
  if (loading) return <div>Loading Safes...</div>
  if (error) return <div>{error}</div>

  return (
    <div className="safe-selector">
      <h3>Your Safe Wallets</h3>
      {safes.length === 0 ? (
        <p>No Safes found for this address</p>
      ) : (
        <select 
          onChange={(e) => onSafeSelected(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Select a Safe</option>
          {safes.map(safe => (
            <option key={safe} value={safe}>
              {safe}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
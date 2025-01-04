// app/launchpad/create/page.tsx
'use client'

import { useState,
   useEffect } from 'react'
import styles from './page.module.css'
import { ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTonConnectUI } from '@tonconnect/ui-react'

interface FormData {
  name: string
  ticker: string
  description: string
  imageUrl: string
  website?: string
  twitter?: string
  telegram?: string
}

interface UserData {
  id: string
  telegramId: number
  firstName: string
  lastName?: string
  username?: string
  zoaBalance: number
}

const CREATION_FEE = 300000000 // 0.3 TON in nanoTONs

export default function CreateTokenPage() {
  const router = useRouter()
  const [tonConnectUI] = useTonConnectUI()
  const connected = tonConnectUI.connected

  const [user, setUser] = useState<UserData | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    ticker: '',
    description: '',
    imageUrl: ''
  })
  const [showOptional, setShowOptional] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 3

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    // Add event listeners for transaction events
    const handleTransactionSent = (event: any) => {
      console.log('Transaction sent for signature:', event.detail);
    };

    const handleTransactionSigned = (event: any) => {
      console.log('Transaction signed:', event.detail);
    };

    const handleTransactionFailed = (event: any) => {
      console.log('Transaction signing failed:', event.detail);
    };

    window.addEventListener('ton-connect-transaction-sent-for-signature', handleTransactionSent);
    window.addEventListener('ton-connect-transaction-signed', handleTransactionSigned);
    window.addEventListener('ton-connect-transaction-signing-failed', handleTransactionFailed);

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener('ton-connect-transaction-sent-for-signature', handleTransactionSent);
      window.removeEventListener('ton-connect-transaction-signed', handleTransactionSigned);
      window.removeEventListener('ton-connect-transaction-signing-failed', handleTransactionFailed);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      const webApp = window.Telegram.WebApp
      if (!webApp?.initDataUnsafe?.user?.id) {
        throw new Error('User not found in WebApp')
      }

      const response = await fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`)
      const data = await response.json()
      if (response.ok) {
        setUser(data)
      } else {
        throw new Error('Failed to fetch user data')
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      setError('Failed to load user data')
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB')
        return
      }
      setImageFile(file)
      setFormData(prev => ({ ...prev, imageUrl: URL.createObjectURL(file) }))
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) return 'Token name is required'
    if (!formData.ticker.trim()) return 'Token ticker is required'
    if (!imageFile && !formData.imageUrl) return 'Token image is required'
    if (!process.env.NEXT_PUBLIC_WALLET_ADDRESS) return 'Platform configuration error'
    if (!connected) return 'Please connect your wallet first'
    return null
  }

  const verifyTransaction = async (txHash: string): Promise<boolean> => {
    try {
      console.log('Starting verification for hash:', txHash)
      
      const response = await fetch('/api/ton/verify-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash,
          expectedAmount: CREATION_FEE
        })
      })
  
      console.log('Verification response status:', response.status)
      
      const data = await response.json()
      console.log('Verification response data:', data)
  
      if (!response.ok) {
        console.error('Verification failed:', data)
        return false
      }
  
      return data.verified === true
    } catch (error) {
      console.error('Verification error:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Process payment
      const txResult = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: process.env.NEXT_PUBLIC_WALLET_ADDRESS!,
            amount: CREATION_FEE.toString(),
            payload: ''
          }
        ]
      })

      // 2. Verify transaction with retries
      let verified = false
      for (let i = 0; i < MAX_RETRIES && !verified; i++) {
        setRetryCount(i + 1)
        verified = await verifyTransaction(txResult.boc)
        if (!verified && i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3s between retries
        }
      }

      if (!verified) {
        throw new Error('Transaction verification failed after multiple attempts')
      }

      // 3. Upload image if exists
      let imageUrl = formData.imageUrl
      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image')
        }
        const { url } = await uploadResponse.json()
        imageUrl = url
      }

      // 4. Create token
      const tokenResponse = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          imageUrl,
          creatorId: user?.id,
          paymentTxHash: txResult.boc
        })
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to create token')
      }

      const token = await tokenResponse.json()
      
      // Show success message
      window.Telegram.WebApp.showPopup({
        title: 'Success!',
        message: 'Your token has been created successfully.',
        buttons: [{
          type: 'ok'
        }]
      })

      // Redirect to token page
      router.push(`/launchpad/tokens/${token.id}`)

    } catch (error: any) {
      console.error('Token creation error:', error)
      
      if (error.message?.includes('TON_CONNECT_SDK_ERROR')) {
        if (error.message.includes('User rejects')) {
          setError('Transaction was cancelled in your wallet')
        } else if (error.message.includes('Unable to verify')) {
          setError('Please try again and confirm quickly to avoid timeout')
        } else {
          setError('Wallet error occurred. Please try again')
        }
      } else {
        setError(error.message || 'Failed to create token')
      }
    } finally {
      setIsSubmitting(false)
      setRetryCount(0)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          onClick={() => router.back()} 
          className={styles.backButton}
        >
          <ArrowLeft size={20} />
        </button>
        <h1>Create Token</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.imageUpload}>
          {formData.imageUrl ? (
            <img src={formData.imageUrl} alt="Token" />
          ) : (
            <div className={styles.uploadPlaceholder}>
              <ImageIcon size={32} />
              <span>Upload Image</span>
              <span className={styles.small}>PNG, JPG, or GIF format only
                Max 10MB</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className={styles.fileInput}
          />
        </div>

        <div className={styles.field}>
          <label>Token Name*</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. My Awesome Token"
          />
        </div>

        <div className={styles.field}>
          <label>Token Ticker*</label>
          <input
            type="text"
            value={formData.ticker}
            onChange={e => setFormData(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
            placeholder="e.g. ZOA"
            maxLength={10}
          />
        </div>

        <div className={styles.field}>
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your token..."
            rows={4}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className={styles.moreButton}
        >
          {showOptional ? 'Less Details' : 'Add More Details'}
        </button>

        {showOptional && (
          <div className={styles.optionalFields}>
            <div className={styles.field}>
              <label>Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://"
              />
            </div>

            <div className={styles.field}>
              <label>Twitter</label>
              <input
                type="text"
                value={formData.twitter}
                onChange={e => setFormData(prev => ({ ...prev, twitter: e.target.value }))}
                placeholder="@username"
              />
            </div>

            <div className={styles.field}>
              <label>Telegram</label>
              <input
                type="text"
                value={formData.telegram}
                onChange={e => setFormData(prev => ({ ...prev, telegram: e.target.value }))}
                placeholder="t.me/group"
              />
            </div>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Token'}
        </button>

        <p className={styles.disclaimer}>
          By creating a token, you agree to pay the creation fee of 0.3 TON.
          Token will be listed on the platform after payment confirmation.
        </p>
      </form>
    </div>
  )
}
// app/launchpad/create/page.tsx
'use client'

import { useState } from 'react'
import styles from './page.module.css'
import { ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'

interface FormData {
  name: string
  ticker: string
  description: string
  imageUrl: string
  website?: string
  twitter?: string
  telegram?: string
  linkedin?: string
}

export default function CreateTokenPage() {
  const router = useRouter()
  const wallet = useTonWallet()
  const [tonConnectUI] = useTonConnectUI()
  const [user, setUser] = useState<any>(null)
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
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
    if (!imageFile && !formData.imageUrl) return 'Token image/video is required'
    return null
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
      // First check if wallet is connected
      if (!wallet) {
        throw new Error('Please connect your TON wallet first')
      }

      try {
        // Request payment of 0.3 TON
        const result = await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 600,
          messages: [
            {
              address: process.env.WALLET_ADDRESS || '',
              amount: "300000000", // 0.3 TON in nanoTONs
            }
          ]
        })

        const verifyResponse = await fetch('/api/ton/verify-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash: result.boc
          })
        });
    
        if (!verifyResponse.ok) {
          throw new Error('Transaction verification failed');
        }

        // Get payment transaction hash
        const paymentTxHash = result.boc

        // Upload image if exists
        let imageUrl = formData.imageUrl
        if (imageFile) {
          const formData = new FormData()
          formData.append('file', imageFile)
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })
          if (!uploadResponse.ok) throw new Error('Failed to upload image')
          const { url } = await uploadResponse.json()
          imageUrl = url
        }

        // Create token with payment proof
        const tokenResponse = await fetch('/api/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            imageUrl,
            creatorId: user?.id,
            paymentTxHash
          })
        })

        if (!tokenResponse.ok) {
          throw new Error('Failed to create token')
        }

        const token = await tokenResponse.json()
        router.push(`/launchpad/tokens/${token.id}`)
      } catch (error: any) {
        // Handle TON Connect specific errors
        if (error.message?.includes('TON_CONNECT_SDK_ERROR')) {
          if (error.message.includes('User rejects')) {
            throw new Error('Transaction was cancelled in your wallet')
          } else if (error.message.includes('Unable to verify')) {
            throw new Error('Transaction verification failed. Please try again')
          } else if (error.message.includes('Transaction was not sent')) {
            throw new Error('Transaction failed. Please check your wallet and try again')
          } else {
            throw new Error('Wallet error occurred. Please try again')
          }
        }
        throw error
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create token')
    } finally {
      setIsSubmitting(false)
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
              <span>Upload Image/Video</span>
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

        <span className={styles.small}>* Required Fields</span>

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
              <label>Twitter/X</label>
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
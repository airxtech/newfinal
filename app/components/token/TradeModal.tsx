// app/components/token/TradeModal.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Settings, ArrowLeft, ToggleLeft, ToggleRight } from 'lucide-react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import styles from './TradeModal.module.css'

interface TradeModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'buy' | 'sell'
  token: {
    id: string
    name: string
    ticker: string
    currentPrice: number
  }
  userBalance: {
    ton: number
    token: number
    zoa: number
  }
}

interface ErrorResponse {
  error: string;
  message?: string;
  priceMovement?: string;
  allowedSlippage?: number;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  type,
  token,
  userBalance
}) => {
  const [tonConnectUI] = useTonConnectUI()
  const connected = tonConnectUI.connected
  const inputRef = useRef<HTMLInputElement>(null)
  const quoteTimestampRef = useRef<number>(Date.now())

  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(2)
  const [showSlippageSettings, setShowSlippageSettings] = useState(false)
  const [useZoaBonus, setUseZoaBonus] = useState(false)
  const [zoaBonus, setZoaBonus] = useState({ tokens: 0, usdValue: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tonAmount = parseFloat(amount) || 0
  const tokenAmount = type === 'buy' 
    ? tonAmount / token.currentPrice 
    : parseFloat(amount) || 0

  const transactionFee = tonAmount * 0.01
  const maxSlippage = (tonAmount * slippage) / 100

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      quoteTimestampRef.current = Date.now()
    }
  }, [isOpen])

  useEffect(() => {
    if (type === 'buy' && tonAmount > 0 && useZoaBonus) {
      const baseTokenValue = tonAmount * 0.83
      const maxBonusValue = baseTokenValue * 0.2
      const actualBonus = Math.min(maxBonusValue, userBalance.zoa)
      const bonusTokens = actualBonus / token.currentPrice

      setZoaBonus({
        tokens: bonusTokens,
        usdValue: actualBonus
      })
    } else {
      setZoaBonus({ tokens: 0, usdValue: 0 })
    }
  }, [amount, type, token.currentPrice, userBalance.zoa, useZoaBonus])

  const validateTransaction = () => {
    if (!connected) return 'Connect Wallet'
    
    if (type === 'buy') {
      const totalRequired = tonAmount + transactionFee
      if (totalRequired > userBalance.ton) return 'Not enough TON'
    } else if (tokenAmount > userBalance.token) {
      return `Not enough ${token.ticker}`
    }

    return null
  }

  const handleAction = async () => {
    const validationError = validateTransaction()
    if (validationError) {
      if (validationError === 'Connect Wallet') {
        tonConnectUI.connectWallet?.()
      } else if (validationError === 'Not enough TON') {
        try {
          await tonConnectUI.sendTransaction({
            validUntil: Math.floor(Date.now() / 1000) + 20, // 20 seconds validity
            messages: [
              {
                address: process.env.NEXT_PUBLIC_WALLET_ADDRESS || '',
                amount: "0"
              }
            ]
          })
        } catch (error: any) {
          // Handle TON Connect specific errors
          if (error.message?.includes('TON_CONNECT_SDK_ERROR')) {
            if (error.message.includes('User rejects')) {
              setError('Transaction was cancelled in your wallet')
            } else if (error.message.includes('Unable to verify')) {
              setError('Please try again and confirm quickly to avoid price changes')
            } else if (error.message.includes('Transaction was not sent')) {
              setError('Transaction failed. Please confirm quickly in your wallet')
            } else {
              setError('Wallet error occurred. Please try again')
            }
          } else {
            setError(error.message || 'Transaction failed')
          }
        }
      }
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check quote expiry first
      if (Date.now() - quoteTimestampRef.current > 60000) {
        throw new Error('QUOTE_EXPIRED')
      }

      const priceWithSlippage = type === 'buy'
        ? token.currentPrice * (1 + slippage / 100)
        : token.currentPrice * (1 - slippage / 100)

      try {
        // Send blockchain transaction
        const txResult = await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 20,
          messages: [
            {
              address: process.env.NEXT_PUBLIC_WALLET_ADDRESS || '',
              amount: `${(tonAmount * 1e9).toFixed(0)}`,
            }
          ]
        })

        // Execute trade if blockchain transaction successful
        const response = await fetch(`/api/tokens/${token.id}/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: type === 'buy' ? tonAmount : tokenAmount,
            maxPrice: priceWithSlippage,
            slippage,
            timestamp: quoteTimestampRef.current,
            useZoaBonus
          })
        })

        if (!response.ok) {
          const errorData = await response.json() as ErrorResponse

          if (errorData.error === 'PRICE_IMPACT_TOO_HIGH') {
            window.Telegram.WebApp.showPopup({
              title: 'Price Movement Too High',
              message: `The price moved by ${errorData.priceMovement}%, which is more than your slippage tolerance of ${slippage}%. Either increase your slippage tolerance or try to process your transaction faster.`,
              buttons: [
                {
                  id: 'increase_slippage',
                  type: 'default',
                  text: 'Increase Slippage'
                },
                {
                  id: 'try_again',
                  type: 'default',
                  text: 'Try Again'
                }
              ]
            }, (buttonId: string) => {
              if (buttonId === 'increase_slippage') {
                setSlippage(prev => prev + 1)
                setShowSlippageSettings(true)
              }
            })
            throw new Error(errorData.message)
          }

          if (errorData.error === 'QUOTE_EXPIRED') {
            window.Telegram.WebApp.showPopup({
              title: 'Quote Expired',
              message: 'Your price quote has expired. Please try again with updated prices.',
              buttons: [{
                type: 'default',
                text: 'Try Again'
              }]
            })
            throw new Error('Price quote expired')
          }

          throw new Error(errorData.message || 'Transaction failed')
        }

        onClose()
        window.location.reload()
      } catch (error: any) {
        if (error.message?.includes('TON_CONNECT_SDK_ERROR')) {
          if (error.message.includes('User rejects')) {
            throw new Error('Transaction was cancelled in your wallet')
          } else if (error.message.includes('Unable to verify')) {
            throw new Error('Please try again and confirm quickly to avoid price changes')
          } else if (error.message.includes('Transaction was not sent')) {
            throw new Error('Transaction failed. Please confirm quickly in your wallet')
          } else {
            throw new Error('Wallet error occurred. Please try again')
          }
        }
        throw error
      }
    } catch (error: any) {
      console.error('Trade error:', error)
      setError(error.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const validationError = validateTransaction()

  return (
    <div className={styles.fullscreenPage}>
      {/* Rest of the JSX remains the same */}
      <div className={styles.content}>
        {/* ... other content ... */}
        <div className={styles.slippageSection}>
          <div className={styles.sectionHeader}>
            <span>Slippage Tolerance</span>
            <button 
              onClick={() => setShowSlippageSettings(!showSlippageSettings)}
              className={styles.settingsButton}
            >
              <Settings size={20} />
            </button>
          </div>
          
          {showSlippageSettings && (
            <div className={styles.slippageOptions}>
              {[0.5, 1, 2, 3].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippage(value)}
                  className={`${styles.slippageOption} ${
                    slippage === value ? styles.active : ''
                  }`}
                >
                  {value}%
                </button>
              ))}
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(Number(e.target.value))}
                className={styles.slippageInput}
                placeholder="Custom"
              />
            </div>
          )}
          <div className={styles.slippageInfo}>
            <div className={styles.slippageWarning}>
              ⚡ Transaction must complete within 20 seconds
            </div>
            <div className={styles.slippageHint}>
              Higher slippage = higher chance of success, but worse price
            </div>
            <div className={styles.maxSlippage}>
              Max price movement allowed: {slippage}%
            </div>
          </div>
        </div>
        {/* ... rest of the content ... */}
      </div>
    </div>
  )
}
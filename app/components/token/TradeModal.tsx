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
            validUntil: Math.floor(Date.now() / 1000) + 600,
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
              setError('Transaction verification failed. Please try again')
            } else if (error.message.includes('Transaction was not sent')) {
              setError('Transaction failed. Please check your wallet and try again')
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
      const priceWithSlippage = type === 'buy'
        ? token.currentPrice * (1 + slippage / 100)
        : token.currentPrice * (1 - slippage / 100)

      const response = await fetch(`/api/tokens/${token.id}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: type === 'buy' ? tonAmount : tokenAmount,
          maxPrice: priceWithSlippage,
          useZoaBonus
        })
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.error === 'PRICE_IMPACT_TOO_HIGH') {
          throw new Error(
            'Price impact too high. Please increase slippage tolerance or reduce order size.'
          )
        }
        throw new Error(data.error || 'Transaction failed')
      }

      onClose()
      window.location.reload()
    } catch (error: any) {
      // Handle TON Connect specific errors
      if (error.message?.includes('TON_CONNECT_SDK_ERROR')) {
        if (error.message.includes('User rejects')) {
          setError('Transaction was cancelled in your wallet')
        } else if (error.message.includes('Unable to verify')) {
          setError('Transaction verification failed. Please try again')
        } else if (error.message.includes('Transaction was not sent')) {
          setError('Transaction failed. Please check your wallet and try again')
        } else {
          setError('Wallet error occurred. Please try again')
        }
      } else {
        setError(error.message || 'Transaction failed')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const validationError = validateTransaction()

  return (
    <div className={styles.fullscreenPage}>
      <div className={styles.header}>
        <button onClick={onClose} className={styles.backButton}>
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.title}>
          {type === 'buy' ? 'Buy' : 'Sell'} {token.ticker}
        </h1>
      </div>

      <div className={styles.content}>
        <div className={styles.amountSection}>
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={styles.amountInput}
          />
          <span className={styles.currency}>
            {type === 'buy' ? 'TON' : token.ticker}
          </span>
          <div className={styles.conversionRate}>
            ≈ {type === 'buy' 
              ? `${tokenAmount.toFixed(6)} ${token.ticker}` 
              : `${tonAmount.toFixed(6)} TON`}
          </div>
        </div>

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
            Max slippage: {maxSlippage.toFixed(6)} TON
          </div>
        </div>

        {type === 'buy' && (
          <div className={styles.bonusSection}>
            <div className={styles.sectionHeader}>
              <span>ZOA Bonus</span>
              <button
                onClick={() => setUseZoaBonus(!useZoaBonus)}
                className={styles.toggleButton}
              >
                {useZoaBonus ? (
                  <ToggleRight size={24} className={styles.toggleActive} />
                ) : (
                  <ToggleLeft size={24} />
                )}
              </button>
            </div>
            {useZoaBonus ? (
              userBalance.zoa > 0 ? (
                <div className={styles.bonusInfo}>
                  <span>+{zoaBonus.tokens.toFixed(6)} {token.ticker}</span>
                  <span className={styles.bonusValue}>
                    (≈${zoaBonus.usdValue.toFixed(2)})
                  </span>
                </div>
              ) : (
                <div className={styles.bonusError}>
                  Not enough ZOA
                </div>
              )
            ) : (
              <div className={styles.bonusDisabled}>
                Enable to use ZOA for bonus tokens
              </div>
            )}
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.transactionInfo}>
            {error ? (
              <span className={styles.error}>{error}</span>
            ) : validationError ? (
              <span className={styles.error}>{validationError}</span>
            ) : (
              <span className={styles.fee}>
                Transaction Fee: {transactionFee.toFixed(2)} TON
              </span>
            )}
          </div>

          <button
            onClick={handleAction}
            disabled={loading}
            className={`${styles.actionButton} ${
              validationError === 'Not enough TON' ? styles.warningButton : ''
            } ${type === 'buy' ? styles.buyButton : styles.sellButton}`}
          >
            {loading ? 'Processing...' : (
              validationError === 'Not enough TON' ? 'Get more TON' :
              validationError === 'Connect Wallet' ? 'Connect Wallet' :
              type === 'buy' ? 'Buy' : 'Sell'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
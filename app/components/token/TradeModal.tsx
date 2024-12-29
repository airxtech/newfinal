// app/components/token/TradeModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Settings, ExternalLink } from 'lucide-react'
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
  const { connected } = tonConnectUI

  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState(2) // Default 2%
  const [showSlippageSettings, setShowSlippageSettings] = useState(false)
  const [zoaBonus, setZoaBonus] = useState({ tokens: 0, usdValue: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tonAmount = parseFloat(amount) || 0
  const tokenAmount = type === 'buy' 
    ? tonAmount / token.currentPrice 
    : parseFloat(amount) || 0

  const transactionFee = tonAmount * 0.01 // 1% fee
  const maxSlippage = (tonAmount * slippage) / 100

  useEffect(() => {
    if (type === 'buy' && tonAmount > 0) {
      // Calculate ZOA bonus
      const baseTokenValue = tonAmount * 0.83 // 83% of payment
      const maxBonusValue = baseTokenValue * 0.2 // 20% bonus potential
      const actualBonus = Math.min(maxBonusValue, userBalance.zoa)
      const bonusTokens = actualBonus / token.currentPrice

      setZoaBonus({
        tokens: bonusTokens,
        usdValue: actualBonus
      })
    } else {
      setZoaBonus({ tokens: 0, usdValue: 0 })
    }
  }, [amount, type, token.currentPrice, userBalance.zoa])

  const validateTransaction = () => {
    if (!connected) return 'Connect Wallet'
    
    if (type === 'buy') {
      const totalRequired = tonAmount + transactionFee
      if (totalRequired > userBalance.ton) return 'Not enough TON'
    } else {
      if (tokenAmount > userBalance.token) return `Not enough ${token.ticker}`
    }

    return null
  }

  const handleAction = async () => {
    const validationError = validateTransaction()
    if (validationError) {
      if (validationError === 'Connect Wallet') {
        tonConnectUI.connectWallet()
      } else if (validationError === 'Not enough TON') {
        window.Telegram.WebApp.openTelegramLink('https://t.me/wallet')
      }
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Calculate price with slippage
      const priceWithSlippage = type === 'buy'
        ? token.currentPrice * (1 + slippage / 100)
        : token.currentPrice * (1 - slippage / 100)

      const response = await fetch(`/api/tokens/${token.id}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: type === 'buy' ? tonAmount : tokenAmount,
          maxPrice: priceWithSlippage,
        })
      })

      if (!response.ok) {
        throw new Error('Transaction failed')
      }

      onClose()
      window.location.reload() // Refresh to show updated state
    } catch (error) {
      setError('Transaction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {type === 'buy' ? 'Buy' : 'Sell'} {token.ticker}
          </h3>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              {type === 'buy' ? 'TON Amount' : `${token.ticker} Amount`}
            </label>
            <div className={styles.inputWrapper}>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={styles.input}
              />
              <span className={styles.inputSuffix}>
                {type === 'buy' ? 'TON' : token.ticker}
              </span>
            </div>
            <div className={styles.conversionRate}>
              ≈ {type === 'buy' 
                ? `${tokenAmount.toFixed(6)} ${token.ticker}` 
                : `${tonAmount.toFixed(6)} TON`}
            </div>
          </div>

          <div className={styles.slippageSettings}>
            <div className={styles.slippageHeader}>
              <span>Slippage Tolerance</span>
              <button 
                onClick={() => setShowSlippageSettings(!showSlippageSettings)}
                className={styles.settingsButton}
              >
                <Settings size={16} />
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

          {type === 'buy' && zoaBonus.tokens > 0 && (
            <div className={styles.bonusBox}>
              <div className={styles.bonusContent}>
                ZOA Bonus: +{zoaBonus.tokens.toFixed(6)} {token.ticker}
                <span className={styles.bonusValue}>
                  (≈${zoaBonus.usdValue.toFixed(2)})
                </span>
              </div>
            </div>
          )}

          <div className={styles.transactionInfo}>
            {error ? (
              <span className={styles.error}>{error}</span>
            ) : (
              <span className={styles.fee}>
                Transaction Fee: {transactionFee.toFixed(6)} TON
              </span>
            )}
          </div>

          <button
            onClick={handleAction}
            disabled={loading}
            className={`${styles.actionButton} ${
              validateTransaction() ? styles.warningButton : ''
            } ${type === 'buy' ? styles.buyButton : styles.sellButton}`}
          >
            {loading ? 'Processing...' : (
              validateTransaction() || (type === 'buy' ? 'Buy' : 'Sell')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
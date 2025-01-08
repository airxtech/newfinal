// app/components/token/TradeModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Settings, ArrowLeft, ToggleLeft, ToggleRight } from 'lucide-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import styles from './TradeModal.module.css';
import { TonPriceService } from '@/lib/services/tonPriceService';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'buy' | 'sell';
  token: {
    id: string;
    name: string;
    ticker: string;
    currentPrice: number;
    currentStepNumber: number;
    currentTokensSold: number;
  };
  userBalance: {
    ton: number;
    token: number;
    zoa: number;
  };
}

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  type,
  token,
  userBalance
}) => {
  const [tonConnectUI] = useTonConnectUI();
  const connected = tonConnectUI.connected;
  const inputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(2);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [useZoaBonus, setUseZoaBonus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tonPrice, setTonPrice] = useState<number>(0);
  const [tokenAmount, setTokenAmount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      fetchTonPrice();
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const updateTonPrice = async () => {
      const price = await TonPriceService.getCurrentPrice();
      setTonPrice(price);
    };
    updateTonPrice();
  }, []);

  const fetchTonPrice = async () => {
    try {
      const response = await fetch('/api/ton/price');
      if (response.ok) {
        const data = await response.json();
        setTonPrice(data.price);
      }
    } catch (error) {
      console.error('Error fetching TON price:', error);
    }
  };

  // Calculate token amounts based on current step in bonding curve
  const calculateTokenAmount = async (tonAmount: number) => {
    try {
      const response = await fetch(`/api/tokens/${token.id}/calculate-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: tonAmount,
          currentStep: token.currentStepNumber,
          currentTokensSold: token.currentTokensSold
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTokenAmount(data.tokenAmount);
        return data.tokenAmount;
      }
    } catch (error) {
      console.error('Error calculating token amount:', error);
    }
    return 0;
  };

  const handleAmountChange = async (value: string) => {
    setAmount(value);
    if (value && !isNaN(parseFloat(value))) {
      await calculateTokenAmount(parseFloat(value));
    } else {
      setTokenAmount(0);
    }
  };

  const handlePercentageClick = async (percentage: number) => {
    if (type === 'buy') {
      const maxTon = userBalance.ton * (percentage / 100);
      setAmount(maxTon.toString());
      await calculateTokenAmount(maxTon);
    } else {
      const maxTokens = userBalance.token * (percentage / 100);
      setAmount(maxTokens.toString());
      await calculateTokenAmount(maxTokens);
    }
  };

  const validateTransaction = () => {
    if (!connected) return 'Connect Wallet';
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return 'Enter valid amount';

    if (type === 'buy') {
      const totalRequired = parsedAmount * (1 + 0.01); // Include 1% fee
      if (totalRequired > userBalance.ton) return 'Insufficient TON balance';
    } else {
      if (parsedAmount > userBalance.token) return `Insufficient ${token.ticker} balance`;
    }

    return null;
  };

  const handleTrade = async () => {
    const validationError = validateTransaction();
    if (validationError) {
      if (validationError === 'Connect Wallet') {
        tonConnectUI.connectWallet?.();
      }
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tokens/${token.id}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          slippage,
          useZoaBonus
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Transaction failed');
      }

      onClose();
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tonUsdValue = parseFloat(amount || '0') * tonPrice;
  const validationError = validateTransaction();

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
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            className={styles.amountInput}
          />
          <span className={styles.currency}>
            {type === 'buy' ? 'TON' : token.ticker}
          </span>
          <div className={styles.conversionRate}>
            ≈ ${tonUsdValue.toFixed(2)} USD
          </div>

          <div className={styles.percentageButtons}>
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => handlePercentageClick(percent)}
                className={styles.percentButton}
              >
                {percent}%
              </button>
            ))}
          </div>
        </div>

        <div className={styles.estimatedReceived}>
          <span>You will {type === 'buy' ? 'receive' : 'pay'}:</span>
          <span>
            {tokenAmount.toFixed(6)} {token.ticker}
          </span>
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
            {useZoaBonus && userBalance.zoa > 0 && (
              <div className={styles.bonusInfo}>
              <span>+{(tokenAmount * 0.2).toFixed(6)} {token.ticker}</span>
              <span className={styles.bonusValue}>
                (≈${(tokenAmount * 0.2 * token.currentPrice).toFixed(2)})
              </span>
            </div>
          )}
          {useZoaBonus && userBalance.zoa === 0 && (
            <div className={styles.bonusError}>
              Not enough ZOA
            </div>
          )}
          {!useZoaBonus && (
            <div className={styles.bonusDisabled}>
              Enable to use ZOA for bonus tokens
            </div>
          )}
        </div>
      )}

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
          Maximum price impact: {slippage}%
        </div>
      </div>

      <div className={styles.priceInfo}>
        <div className={styles.priceRow}>
          <span>Price Impact</span>
          <span className={type === 'buy' ? styles.positive : styles.negative}>
            {((tokenAmount / parseFloat(amount || '0')) * 100 - 100).toFixed(2)}%
          </span>
        </div>
        <div className={styles.priceRow}>
          <span>Transaction Fee</span>
          <span>{(parseFloat(amount || '0') * 0.01).toFixed(6)} TON</span>
        </div>
        <div className={styles.priceRow}>
          <span>Current Price</span>
          <span>
            1 {token.ticker} = ${token.currentPrice.toFixed(6)}
            <br />
            <small className={styles.tonPrice}>
              ({(token.currentPrice / tonPrice).toFixed(6)} TON)
            </small>
          </span>
        </div>
      </div>

      <div className={styles.footer}>
        {error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.transactionInfo}>
            {validationError || (
              <span className={styles.fee}>
                Network fee: {(parseFloat(amount || '0') * 0.01).toFixed(6)} TON
              </span>
            )}
          </div>
        )}

        <button
          onClick={handleTrade}
          disabled={loading || !!validationError}
          className={`${styles.actionButton} ${
            type === 'buy' ? styles.buyButton : styles.sellButton
          }`}
        >
          {loading ? 'Processing...' : (
            validationError === 'Connect Wallet' ? 'Connect Wallet' :
            validationError === 'Insufficient TON balance' ? 'Get more TON' :
            type === 'buy' ? 'Buy' : 'Sell'
          )}
        </button>
      </div>
    </div>
  </div>
);
}
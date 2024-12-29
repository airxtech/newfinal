// app/components/token/PriceChart.tsx
'use client'

import { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid 
} from 'recharts';
import styles from './PriceChart.module.css';

interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
}

interface PriceChartProps {
  tokenId: string;
  currentPrice: number;
}

export const PriceChart: React.FC<PriceChartProps> = ({ tokenId, currentPrice }) => {
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '7D' | '1M'>('24H');
  const [data, setData] = useState<PriceData[]>([]);
  const [priceChange, setPriceChange] = useState({ value: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPriceData();
    // Set up real-time updates
    const interval = setInterval(fetchPriceData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [tokenId, timeframe]);

  const fetchPriceData = async () => {
    try {
      const response = await fetch(
        `/api/tokens/${tokenId}/prices?timeframe=${timeframe}`
      );
      const newData = await response.json();
      setData(newData);

      // Calculate price change
      if (newData.length > 0) {
        const firstPrice = newData[0].price;
        const change = currentPrice - firstPrice;
        const percentage = (change / firstPrice) * 100;
        setPriceChange({ value: change, percentage });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching price data:', error);
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    switch (timeframe) {
      case '1H':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case '24H':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case '7D':
        return date.toLocaleDateString([], { weekday: 'short' });
      case '1M':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      default:
        return '';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={styles.tooltip}>
          <div className={styles.tooltipTime}>
            {formatTime(data.timestamp)}
          </div>
          <div className={styles.tooltipPrice}>
            {formatPrice(data.price)}
          </div>
          <div className={styles.tooltipVolume}>
            Vol: {formatPrice(data.volume)}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className={styles.loading}>Loading chart data...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.priceInfo}>
          <div className={styles.currentPrice}>{formatPrice(currentPrice)}</div>
          <div className={`${styles.priceChange} ${priceChange.value >= 0 ? styles.positive : styles.negative}`}>
            {priceChange.value >= 0 ? '+' : ''}{formatPrice(priceChange.value)}
            ({priceChange.percentage.toFixed(2)}%)
          </div>
        </div>
        <div className={styles.timeframes}>
          {(['1H', '24H', '7D', '1M'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`${styles.timeframeButton} ${timeframe === tf ? styles.active : ''}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false}
              stroke="rgba(255, 255, 255, 0.1)"
            />
            <XAxis 
              dataKey="timestamp"
              tickFormatter={formatTime}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--tg-theme-hint-color, #999999)' }}
            />
            <YAxis 
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--tg-theme-hint-color, #999999)' }}
              tickFormatter={(value) => formatPrice(value)}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke={priceChange.value >= 0 ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
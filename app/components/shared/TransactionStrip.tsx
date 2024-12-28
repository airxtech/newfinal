// app/components/shared/TransactionStrip.tsx
'use client'

import React from 'react'
import styles from './TransactionStrip.module.css'

export interface Transaction {
  wallet: string
  type: 'bought' | 'sold' | 'created'
  amount?: number
  tokenLogo: string
  ticker: string
}

const TransactionStrip = () => {
  return (
    <div className={styles.strip}>
      <div className={styles.marquee}>
        {/* Duplicate the transactions for seamless loop */}
        {[...Array(2)].map((_, outerIndex) => (
          <div key={outerIndex} className={styles.transactions}>
            <div className={styles.transaction}>
              <span className={styles.address}>0x1234...567</span>
              <span className={styles.type}>bought</span>
              <span className={styles.amount}>$1,500 of</span>
              <span className={styles.token}>🚀 PEPE</span>
            </div>

            <div className={styles.transaction}>
              <span className={styles.address}>0x8901...234</span>
              <span className={styles.type}>sold</span>
              <span className={styles.amount}>$2,300 of</span>
              <span className={styles.token}>🌙 MOON</span>
            </div>

            <div className={styles.transaction}>
              <span className={styles.address}>0x5678...901</span>
              <span className={styles.type}>created</span>
              <span className={styles.token}>🔥 DOGE</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TransactionStrip
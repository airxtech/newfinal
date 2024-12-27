// app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.homePage}>
      <section className={styles.hero}>
        <h1>Welcome to ZOA.fund</h1>
        <p className={styles.subtitle}>Zero-to-One Accelerator</p>
      </section>

      <section className={styles.about}>
        <h2>About ZOA.fund</h2>
        <p>
          ZOA.fund is a revolutionary platform combining centralized order matching
          with on-chain settlement. Our hybrid model ensures efficient trading while
          maintaining the security and transparency of blockchain technology.
        </p>

        <div className={styles.featureGrid}>
          <div className={styles.feature}>
            <h3>Pre-Listing Phase</h3>
            <ul>
              <li>Centralized order matching</li>
              <li>Real-time price updates</li>
              <li>Efficient trading experience</li>
            </ul>
          </div>

          <div className={styles.feature}>
            <h3>Listing Phase</h3>
            <ul>
              <li>On-chain settlement</li>
              <li>STON.fi integration</li>
              <li>Smart contract deployment</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.zoaCoin}>
        <h2>ZOA Coin</h2>
        <p>
          ZOA Coin is the native token of our platform, offering unique benefits
          and opportunities:
        </p>
        <ul>
          <li>Enhanced token allocations on new launches</li>
          <li>Platform fee discounts</li>
          <li>Exclusive access to ZOA Guaranteed tokens</li>
        </ul>
      </section>
    </div>
  )
}
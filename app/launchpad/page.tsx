// app/launchpad/page.tsx
'use client'

import { useState } from 'react'
import styles from './page.module.css'
import TransactionStrip from '../components/shared/TransactionStrip'
import TokenCard from '../components/token/TokenCard'
import { Plus } from 'lucide-react'

type ViewType = 'all' | 'hot' | 'new' | 'listed' | 'marketcap' | 'my'

export default function LaunchpadPage() {
  const [activeView, setActiveView] = useState<ViewType>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const handleViewChange = (view: ViewType) => {
    setActiveView(view)
  }

  return (
    <div className={styles.launchpadPage}>
      <div className={styles.header}>
        <h1>Launchpad</h1>
        <button 
          className={styles.createButton}
          onClick={() => setShowCreateForm(true)}
        >
          <Plus size={20} />
          Create Token
        </button>
      </div>

      <div className={styles.transactionStripContainer}>
        <TransactionStrip />
      </div>

      <section className={styles.guaranteedSection}>
        <h2>ZOA Guaranteed Tokens</h2>
        <div className={styles.comingSoon}>
          <button
            className={styles.learnMoreButton}
            onClick={() => {
              // Show popup explaining ZOA Guaranteed tokens
            }}
          >
            Coming Soon - Learn More
          </button>
        </div>
      </section>

      <section className={styles.memeSection}>
        <h2>Meme Coins</h2>
        
        <div className={styles.viewSelector}>
          <button 
            className={`${styles.viewButton} ${activeView === 'all' ? styles.active : ''}`}
            onClick={() => handleViewChange('all')}
          >
            All
          </button>
          <button 
            className={`${styles.viewButton} ${activeView === 'hot' ? styles.active : ''}`}
            onClick={() => handleViewChange('hot')}
          >
            Hot 🔥
          </button>
          <button 
            className={`${styles.viewButton} ${activeView === 'new' ? styles.active : ''}`}
            onClick={() => handleViewChange('new')}
          >
            New
          </button>
          <button 
            className={`${styles.viewButton} ${activeView === 'listed' ? styles.active : ''}`}
            onClick={() => handleViewChange('listed')}
          >
            Listed
          </button>
          <button 
            className={`${styles.viewButton} ${activeView === 'marketcap' ? styles.active : ''}`}
            onClick={() => handleViewChange('marketcap')}
          >
            Market Cap
          </button>
          <button 
            className={`${styles.viewButton} ${activeView === 'my' ? styles.active : ''}`}
            onClick={() => handleViewChange('my')}
          >
            My Tokens
          </button>
        </div>

        <div className={styles.tokenGrid}>
          {/* Token cards will be mapped here */}
          <TokenCard
            name="Sample Token"
            ticker="SMPL"
            logo="🚀"
            transactions={150}
            daysListed={2}
            priceChange={12.5}
            bondingProgress={65}
            marketCap={25000}
            onClick={() => {}}
          />
        </div>
      </section>

      {showCreateForm && (
        <div className={styles.modal}>
          {/* Token creation form will go here */}
        </div>
      )}
    </div>
  )
}
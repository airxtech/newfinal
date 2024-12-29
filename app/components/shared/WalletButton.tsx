// app/components/WalletButton.tsx
import React, { useState } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { LogOut, SwitchCamera } from 'lucide-react';
import styles from './WalletButton.module.css';

export const WalletButton = () => {
  const [tonConnectUI] = useTonConnectUI();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const handleDisconnect = () => {
    setShowConfirmDialog(true);
  };

  const confirmDisconnect = () => {
    tonConnectUI.disconnect();
    setShowConfirmDialog(false);
  };

  const handleSwitchWallet = () => {
    tonConnectUI.disconnect().then(() => {
      setTimeout(() => {
        tonConnectUI.connectWallet();
      }, 100);
    });
  };

  if (!tonConnectUI.wallet) {
    return (
      <button
        onClick={() => tonConnectUI.connectWallet()}
        className={styles.connectButton}
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <>
      <div className={styles.walletActions}>
        <button
          onClick={handleSwitchWallet}
          className={styles.actionButton}
        >
          <SwitchCamera size={20} />
          Switch Wallet
        </button>
        <button
          onClick={handleDisconnect}
          className={`${styles.actionButton} ${styles.disconnectButton}`}
        >
          <LogOut size={20} />
          Disconnect
        </button>
      </div>

      {showConfirmDialog && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Disconnect Wallet</h3>
            <p>Are you sure you want to disconnect your wallet?</p>
            <div className={styles.modalButtons}>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={confirmDisconnect}
                className={styles.confirmButton}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
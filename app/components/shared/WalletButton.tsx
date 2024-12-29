// app/components/shared/WalletButton.tsx
import React, { useState } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { LogOut, SwitchCamera } from 'lucide-react';
import styles from './WalletButton.module.css';

type ModalType = 'disconnect' | 'switch' | null;

export const WalletButton = () => {
  const [tonConnectUI] = useTonConnectUI();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  const handleDisconnect = () => {
    setActiveModal('disconnect');
  };

  const handleSwitchWallet = () => {
    setActiveModal('switch');
  };

  const confirmDisconnect = () => {
    tonConnectUI.disconnect();
    setActiveModal(null);
  };

  const confirmSwitch = () => {
    tonConnectUI.disconnect().then(() => {
      setTimeout(() => {
        tonConnectUI.connectWallet();
      }, 100);
    });
    setActiveModal(null);
  };

  const ConfirmationModal = ({ 
    title, 
    message, 
    confirmText, 
    onConfirm 
  }: { 
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }) => (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className={styles.modalButtons}>
          <button
            onClick={() => setActiveModal(null)}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={styles.confirmButton}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

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
          Switch-Wallet
        </button>
        <button
          onClick={handleDisconnect}
          className={`${styles.actionButton} ${styles.disconnectButton}`}
        >
          <LogOut size={20} />
          Disconnect
        </button>
      </div>

      {activeModal === 'disconnect' && (
        <ConfirmationModal
          title="Disconnect Wallet"
          message="Are you sure you want to disconnect your wallet?"
          confirmText="Disconnect"
          onConfirm={confirmDisconnect}
        />
      )}

      {activeModal === 'switch' && (
        <ConfirmationModal
          title="Switch Wallet"
          message="Are you sure you want to switch to a different wallet? Your current wallet will be disconnected."
          confirmText="Switch"
          onConfirm={confirmSwitch}
        />
      )}
    </>
  );
};
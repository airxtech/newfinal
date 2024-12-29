// app/components/shared/WalletButton.tsx
import { useTonConnectUI } from '@tonconnect/ui-react';
import { LogOut, SwitchCamera } from 'lucide-react';
import styles from './WalletButton.module.css';

export const WalletButton = () => {
  const [tonConnectUI] = useTonConnectUI();
  
  const handleDisconnect = () => {
    tonConnectUI.disconnect();
  };

  const handleSwitchWallet = () => {
    tonConnectUI.disconnect().then(() => {
      // Short delay to ensure proper disconnection
      setTimeout(() => {
        tonConnectUI.connectWallet();
      }, 100);
    });
  };

  if (!tonConnectUI.connected) {
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
  );
};
'use client';

import Image from 'next/image';
import styles from './index.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logoContainer}>
          <Image
            src="/logo.png"
            alt="Logo"
            fill
            className={styles.logo}
            priority
          />
        </div>
      </div>
    </header>
  );
}
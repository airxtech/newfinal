// app/components/ui/spinner.tsx
import React from 'react';
import styles from './spinner.module.css';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'white';
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'medium',
  color = 'primary'
}) => {
  return (
    <div 
      className={`${styles.spinner} ${styles[size]} ${styles[color]}`} 
      role="status"
    >
      <span className={styles.visuallyHidden}>Loading...</span>
    </div>
  );
};
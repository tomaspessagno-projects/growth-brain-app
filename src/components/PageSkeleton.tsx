"use client";
import React from 'react';
import styles from './PageSkeleton.module.css';

export default function PageSkeleton() {
  return (
    <div className={`animate-fade-in ${styles.wrap}`}>
      <div className={styles.headRow}>
        <div style={{ flex: 1 }}>
          <div className={`${styles.sk} ${styles.title}`} />
          <div className={`${styles.sk} ${styles.sub}`} />
        </div>
        <div className={`${styles.sk} ${styles.badge}`} />
      </div>

      <div className={styles.kpis}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${styles.sk} ${styles.kpi}`} />
        ))}
      </div>

      <div className={`${styles.sk} ${styles.block}`} />

      <div className={styles.grid}>
        <div className={`${styles.sk} ${styles.cardBig}`} />
        <div className={`${styles.sk} ${styles.cardSmall}`} />
      </div>
    </div>
  );
}

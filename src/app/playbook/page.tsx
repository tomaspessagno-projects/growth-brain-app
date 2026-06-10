"use client";
import React, { useState } from 'react';
import styles from '../funnel/funnel.module.css';
import {
  PLAYBOOK_RULES,
  RULE_CATEGORIES,
  STATUS_META,
  PLAYBOOK_UPDATED,
  playbookToMarkdown,
} from '@/lib/mixpanel/playbook';

export default function PlaybookPage() {
  const [copied, setCopied] = useState(false);
  const [showMd, setShowMd] = useState(false);
  const md = playbookToMarkdown(PLAYBOOK_RULES);

  const counts = {
    validado: PLAYBOOK_RULES.filter((r) => r.status === 'validado').length,
    observacion: PLAYBOOK_RULES.filter((r) => r.status === 'observacion').length,
    guardrail: PLAYBOOK_RULES.filter((r) => r.status === 'guardrail').length,
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowMd(true);
    }
  };

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Aprendizajes</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            El Playbook de Medicus — cada cosa que el motor aprende, anotada como regla. La memoria que compone.
          </p>
        </div>
        <div className={styles.copyWrap}>
          {copied && <span className={styles.copied}>Copiado ✓</span>}
          <button className={`${styles.recBtn} ${styles.recBtnPrimary}`} onClick={copy}>Copiar como Markdown</button>
          <button className={styles.recBtn} onClick={() => setShowMd((s) => !s)}>{showMd ? 'Ocultar MD' : 'Ver MD'}</button>
        </div>
      </header>

      <div className={styles.progress}>
        <span className={styles.progressLabel}>
          {PLAYBOOK_RULES.length} reglas · {counts.observacion} observaciones · {counts.guardrail} guardrails · {counts.validado} validadas
        </span>
        <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: '100%' }} /></div>
        <span className={styles.progressLabel}>Actualizado {PLAYBOOK_UPDATED}</span>
      </div>

      {showMd && <pre className={styles.mdBlock}>{md}</pre>}

      {RULE_CATEGORIES.map((cat) => {
        const rules = PLAYBOOK_RULES.filter((r) => r.category === cat);
        if (!rules.length) return null;
        return (
          <section key={cat}>
            <h3 className={styles.sectionTitle}>{cat}</h3>
            <div className={styles.recsGrid}>
              {rules.map((r) => (
                <div key={r.id} className={`glass-panel ${styles.rec}`}>
                  <div className={styles.recTop}>
                    <span className={`${styles.statusBadge} ${styles['rule_' + r.status]}`}>
                      {STATUS_META[r.status].emoji} {STATUS_META[r.status].label}
                    </span>
                    <span className={styles.recOwner} style={{ marginLeft: 'auto' }}>{r.source}</span>
                  </div>
                  <div className={styles.recTitle}>{r.statement}</div>
                  <div className={styles.recDetail}>{r.evidence} · {r.date}</div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

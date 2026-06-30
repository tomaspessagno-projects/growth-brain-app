import { describe, it, expect } from 'vitest';
import {
  PLAYBOOK_RULES,
  RULE_CATEGORIES,
  STATUS_META,
  playbookToMarkdown,
} from '../src/lib/mixpanel/playbook';

describe('Playbook / Aprendizajes — integridad', () => {
  it('los ids son únicos', () => {
    const ids = PLAYBOOK_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('toda regla tiene statement, evidencia (fuente) y fecha', () => {
    for (const r of PLAYBOOK_RULES) {
      expect(r.statement.length, r.id).toBeGreaterThan(10);
      expect(r.evidence.length, r.id).toBeGreaterThan(3); // observación = dato; principio = cita
      expect(r.date, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('toda categoría usada está declarada en RULE_CATEGORIES', () => {
    for (const r of PLAYBOOK_RULES) {
      expect(RULE_CATEGORIES, r.id).toContain(r.category);
    }
  });

  it('todo status usado tiene meta (label + emoji)', () => {
    for (const r of PLAYBOOK_RULES) {
      expect(STATUS_META[r.status], r.id).toBeDefined();
    }
  });

  it('la base de conocimiento existe y viene de investigación con fuente', () => {
    const principios = PLAYBOOK_RULES.filter((r) => r.status === 'principio');
    expect(principios.length).toBeGreaterThanOrEqual(15); // se sumó un KB sustancial
    for (const p of principios) {
      expect(p.source, p.id).toBe('investigacion'); // todo principio declara que es externo
      expect(p.id.startsWith('kb-'), p.id).toBe(true);
    }
  });

  it('el markdown export incluye cada regla', () => {
    const md = playbookToMarkdown(PLAYBOOK_RULES);
    for (const r of PLAYBOOK_RULES) expect(md).toContain(r.statement);
  });
});

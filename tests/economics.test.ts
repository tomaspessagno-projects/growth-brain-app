import { describe, it, expect } from 'vitest';
import { MARKETING, channelEconomics } from '../src/lib/marketing/unitEconomics';
import { ltvArs } from '../src/lib/economics/model';

describe('unit economics — meticulosidad con la plata (datos reales mayo 2026)', () => {
  it('Programática: $44M son PLANIFICADOS y excluidos — gasto REAL computado = 0', () => {
    const prog = MARKETING.channels.find((c) => c.label.toLowerCase().includes('program'))!;
    expect(prog.spendArs).toBe(0); // <- no entra como gasto recuperable
    expect(prog.plannedArs).toBe(44_000_000); // queda como planificado, no como real
    expect(prog.excluded).toBe(true);
  });

  it('el canal "display" del cotizador NO trae un gasto medido (spend 0)', () => {
    // antes mapeaba display → $44M; ahora display no aporta pesos recuperables
    expect(channelEconomics('display')?.spendArs).toBe(0);
    expect(channelEconomics('Programatica369')?.spendArs).toBe(0);
  });

  it('los canales reales suman el all-in ($149,66M): Meta + Google + YouTube', () => {
    const real = MARKETING.channels.reduce((a, c) => a + c.spendArs, 0);
    expect(real).toBe(MARKETING.totalSpendAllArs); // 149,66M — sin contar la programática planificada
    // lead-gen (Meta + Google) = 135M
    const leadGen = MARKETING.channels
      .filter((c) => ['Meta Ads', 'Google Search'].includes(c.label))
      .reduce((a, c) => a + c.spendArs, 0);
    expect(leadGen).toBe(MARKETING.totalSpendArs); // 135M
  });

  it('LTV de contribución se mantiene en los supuestos declarados', () => {
    expect(ltvArs()).toBe(90_000 * 24 * 0.18); // 388.800
  });
});

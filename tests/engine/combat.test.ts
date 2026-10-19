import { describe, expect, it } from 'vitest';
import { CRISIS } from '../../src/data/champions';
import { endTeamTurn, intentValue, startCombat, type CombatSetup } from '../../src/engine/combat';
import type { ChampionId, Pos } from '../../src/engine/types';
import { CARDS, ENEMIES, u } from './fixtures';

const ORDER: ChampionId[] = ['leona', 'yasuo', 'lux', 'soraka'];

function setup(over: Partial<CombatSetup> = {}): CombatSetup {
  return {
    seed: 11,
    allies: ORDER.map((id, i) => ({ id, name: id[0].toUpperCase() + id.slice(1), pos: (i + 1) as Pos, hp: 40, maxHp: 40, stress: 0, crisis: CRISIS[id] })),
    enemies: [{ uid: 'e1', defId: 'wolf', pos: 1 }, { uid: 'e2', defId: 'gromp', pos: 2 }],
    deck: ['strike', 'guard', 'zenith', 'sweep', 'tempest', 'bind', 'barrier', 'spark', 'touch', 'calm'],
    cards: CARDS,
    enemyDefs: ENEMIES,
    omen: 'lament',
    mods: { intentStressBonus: 0, startShadowMark: false, hpMultiplier: 1, bossExtraIntent: false },
    belt: [null, null, null],
    ...over,
  };
}

describe('inicio de combate', () => {
  it('roba 5 con 3 de energía y es reproducible con la misma semilla', () => {
    const a = startCombat(setup());
    const b = startCombat(setup());
    expect(a.hand).toHaveLength(5);
    expect(a.energy).toBe(3);
    expect(a.turn).toBe(1);
    expect(a.hand).toEqual(b.hand);
  });

  it('muestra la primera intención de cada enemigo', () => {
    const s = startCombat(setup());
    expect(s.intents.e1).toEqual([ENEMIES.wolf.script[0]]);
  });

  it('aplica los modificadores de la niebla', () => {
    const s = startCombat(setup({ mods: { intentStressBonus: 3, startShadowMark: true, hpMultiplier: 1.2, bossExtraIntent: false } }));
    expect(u(s, 'e1').maxHp).toBe(36);
    expect(u(s, 'e1').statuses.shadowMark).toBe(1);
  });

  it('el jefe gana una intención extra en su primer turno', () => {
    const s = startCombat(setup({
      enemies: [{ uid: 'v', defId: 'viego', pos: 1, boss: true }],
      mods: { intentStressBonus: 0, startShadowMark: false, hpMultiplier: 1, bossExtraIntent: true },
    }));
    expect(s.intents.v).toHaveLength(2);
  });

  it('un campeón que llega con 100 de estrés empieza en crisis', () => {
    const cfg = setup();
    cfg.allies[0].stress = 100;
    expect(u(startCombat(cfg), 'leona').crisisActive).toBe(true);
  });
});

describe('fin de turno: intenciones enemigas', () => {
  it('ataque con bonus de posición, crítico telegrafiado y nueva intención', () => {
    const s = startCombat(setup());
    endTeamTurn(s);
    expect(u(s, 'leona').hp).toBe(30);
    expect(u(s, 'lux').hp).toBe(33);
    expect(u(s, 'lux').stress).toBe(5);
    expect(s.intents.e1).toEqual([ENEMIES.wolf.script[1]]);
    expect(s.turn).toBe(2);
  });

  it('la intención de estrés suma el bonus de niebla y la Marca de Sombra +2 al golpear', () => {
    const s = startCombat(setup({ mods: { intentStressBonus: 3, startShadowMark: true, hpMultiplier: 1, bossExtraIntent: false } }));
    endTeamTurn(s);
    expect(u(s, 'leona').stress).toBe(2);
    endTeamTurn(s);
    expect(u(s, 'yasuo').stress).toBe(13);
  });

  it('reposición: el enemigo cambia de posición intercambiando', () => {
    const s = startCombat(setup());
    endTeamTurn(s);
    endTeamTurn(s);
    expect(u(s, 'e2').pos).toBe(1);
    expect(u(s, 'e1').pos).toBe(2);
  });

  it('un enemigo aturdido pierde su turno', () => {
    const s = startCombat(setup());
    u(s, 'e1').statuses.stun = 1;
    endTeamTurn(s);
    expect(u(s, 'leona').hp).toBe(40);
    expect(u(s, 'e1').statuses.stun).toBe(0);
  });

  it('el bloqueo aliado se reinicia y la mano se renueva al empezar el turno', () => {
    const s = startCombat(setup());
    u(s, 'soraka').block = 9;
    const first = s.hand.map((c) => c.uid);
    endTeamTurn(s);
    expect(u(s, 'soraka').block).toBe(0);
    expect(s.hand).toHaveLength(5);
    expect(s.hand.map((c) => c.uid)).not.toEqual(first);
  });
});

describe('crisis y virtud al empezar el turno', () => {
  it('Ira: +5 de estrés a los demás aliados', () => {
    const cfg = setup();
    cfg.allies[0].stress = 100;
    const s = startCombat(cfg);
    expect(u(s, 'yasuo').stress).toBe(5);
  });

  it('Pánico: se desplaza una posición hacia atrás', () => {
    const cfg = setup();
    cfg.allies[2].stress = 100;
    const s = startCombat(cfg);
    expect(u(s, 'lux').pos).toBe(4);
    expect(u(s, 'soraka').pos).toBe(3);
  });

  it('Virtud (Firmeza): +4 de bloqueo cada turno', () => {
    const s = startCombat(setup());
    u(s, 'soraka').virtueActive = true;
    endTeamTurn(s);
    expect(u(s, 'soraka').block).toBe(4);
  });
});

describe('valor de intención para la UI', () => {
  it('suma la bonificación de posición ideal al ataque', () => {
    const s = startCombat(setup());
    expect(intentValue(s, u(s, 'e1'), ENEMIES.wolf.script[0])).toBe(10);
    u(s, 'e1').pos = 2;
    u(s, 'e2').pos = 1;
    expect(intentValue(s, u(s, 'e1'), ENEMIES.wolf.script[0])).toBe(8);
  });

  it('aplica el multiplicador de crítico', () => {
    const s = startCombat(setup());
    expect(intentValue(s, u(s, 'e2'), ENEMIES.gromp.script[0])).toBe(7);
  });

  it('suma el extra de estrés de la niebla', () => {
    const s = startCombat(setup({ mods: { intentStressBonus: 3, startShadowMark: false, hpMultiplier: 1, bossExtraIntent: false } }));
    expect(intentValue(s, u(s, 'e1'), ENEMIES.wolf.script[1])).toBe(13);
  });
});

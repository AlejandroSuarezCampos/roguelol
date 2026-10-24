import { describe, expect, it } from 'vitest';
import { buildCatalog, missingItemIds, type DdChampion, type DdItem } from '../../scripts/catalog';

const champ = (id: string, key: string, name: string): DdChampion => ({
  id, key, name, title: 't', tags: ['Mage'], info: { attack: 1, defense: 2, magic: 9, difficulty: 5 },
  stats: { hp: 500, armor: 20, spellblock: 30, attackdamage: 55, movespeed: 330, attackrange: 550 },
});

describe('catálogo de Data Dragon', () => {
  const champs = { Zed: champ('Zed', '238', 'Zed'), Aatrox: champ('Aatrox', '266', 'Aatrox'), Ahri: champ('Ahri', '103', 'Ahri') };
  const items: Record<string, DdItem> = {
    '3031': { name: 'Filo infinito', gold: { total: 3400 }, maps: { '11': true }, tags: ['Damage'] },
    '1036': { name: 'Espada larga', gold: { total: 350 }, maps: { '11': true }, into: ['3031'] },
    '3070': { name: 'Lágrima', gold: { total: 400 }, maps: { '12': true } }, // solo ARAM
    '9999': { name: 'Exclusivo', gold: { total: 500 }, maps: { '11': true }, requiredChampion: 'Viego' },
    '8888': { name: 'Gratis', gold: { total: 0 }, maps: { '11': true } },
    '7777': { name: 'Retirado', gold: { total: 500, purchasable: false }, maps: { '11': true } },
  };
  const cat = buildCatalog('16.20.1', champs, items, () => new Date('2026-10-24T00:00:00Z'));

  it('ordena los campeones por nombre y convierte la clave a número', () => {
    expect(cat.champions.map((c) => c.name)).toEqual(['Aatrox', 'Ahri', 'Zed']);
    expect(cat.champions[2]).toMatchObject({ key: 238, roles: ['Mage'], hp: 500, mr: 30, ad: 55, range: 550 });
  });
  it('solo deja objetos de la Grieta, comprables, no exclusivos y con precio; marca los finales', () => {
    expect(cat.items.map((i) => i.id)).toEqual([1036, 3031]);
    expect(cat.items.find((i) => i.id === 3031)!.final).toBe(true);
    expect(cat.items.find((i) => i.id === 1036)!.final).toBe(false);
  });
  it('lleva versión y fecha', () => {
    expect(cat.version).toBe('16.20.1');
    expect(cat.generatedAt).toBe('2026-10-24T00:00:00.000Z');
  });
  it('detecta ids de objeto que no existen', () => {
    expect(missingItemIds([3031, 1234, 1036], items)).toEqual([1234]);
  });
});

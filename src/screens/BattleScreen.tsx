import { useEffect, useMemo, useState } from 'react';
import { Belt } from '../components/Belt';
import { RelicBar } from '../components/RelicBar';
import { Card } from '../components/Card';
import { Fighter, type TargetMode } from '../components/Fighter';
import { Hud } from '../components/Hud';
import { RetreatButton } from '../components/RetreatButton';
import { Icon } from '../components/Icon';
import { deckCardDef, isUpgradedId } from '../data/cards';
import { CHAMPIONS } from '../data/champions';
import { bonusActive, cardOf, forcedTarget } from '../engine/cards';
import { CONFIG } from '../engine/config';
import { byPos, canSwap, living } from '../engine/formation';
import { POTIONS } from '../engine/potions';
import type { CardInstance, Pos, Unit } from '../engine/types';
import { cardAvailability } from '../state/selectors';
import { game, useGame } from '../state/gameStore';

const KIND_TITLE = { combat: 'Combate', elite: 'Combate de élite', boss: 'Jefe' } as const;

type Unitish = { mode: TargetMode; tag?: string };

export function BattleScreen() {
  const { combat: s, expedition: e, combatKind, selectedUid, selectedPotion, fx, hint, activeRelics } = useGame();
  const [swapMode, setSwapMode] = useState(false);
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const [pile, setPile] = useState<'draw' | 'discard' | null>(null);

  const selected: CardInstance | undefined = s?.hand.find((c) => c.uid === selectedUid);
  const selectedCard = s && selected ? cardOf(s, selected) : null;
  const avail = s && selectedCard ? cardAvailability(s, selectedCard) : null;
  const over = s?.outcome !== 'ongoing';

  useEffect(() => {
    if (!s) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || over) return;
      // Con una ventana abierta (retirada, mazos…) los atajos no actúan por detrás; y Enter sobre un botón enfocado es de ese botón.
      if (document.querySelector('[aria-modal="true"]') && ev.key !== 'Escape') return;
      const interactive = (ev.target as HTMLElement | null)?.closest?.('button, input, textarea, select, [role="button"]');
      if (interactive && (ev.key === 'Enter' || ev.key === ' ')) {
        // Con una carta ya elegida, Enter sobre una carta de la mano la juega (y se evita que el clic nativo la deseleccione).
        if (ev.key === 'Enter' && selected && interactive.closest('.hand')) {
          ev.preventDefault();
          game.playSelected();
        }
        return;
      }
      if (ev.key === 'Escape') {
        game.selectCard(null);
        game.selectPotion(null);
        setSwapMode(false);
        setSwapFrom(null);
        setPile(null);
      } else if (/^[1-9]$/.test(ev.key)) {
        const inst = s.hand[Number(ev.key) - 1];
        if (inst) pickCard(inst);
      } else if (ev.key === 'Enter' && selected) game.playSelected();
      else if (ev.key.toLowerCase() === 'e' && !selected) game.endTurn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!s || !e || !combatKind) return null;

  function pickCard(inst: CardInstance) {
    const card = cardOf(s!, inst);
    const a = cardAvailability(s!, card);
    setSwapMode(false);
    if (!a.playable) {
      game.selectCard(null);
      game.notify(`${card.name}: ${a.reason}`);
      return;
    }
    game.selectCard(inst.uid);
  }

  const allies = byPos(s.units.filter((u) => u.side === 'ally'));
  const enemies = byPos(s.units.filter((u) => u.side === 'enemy'));
  const potionDef = selectedPotion !== null ? s.belt[selectedPotion] : null;
  const potionNeedsTarget = potionDef ? POTIONS[potionDef.id].target === 'ally' : false;

  function unitMode(u: Unit): Unitish {
    if (over) return { mode: 'none' };
    if (swapMode) {
      if (u.side !== 'ally') return { mode: 'none' };
      if (swapFrom === u.id) return { mode: 'swap-from', tag: 'Elegido' };
      if (!swapFrom) return { mode: 'swap-legal', tag: 'Intercambiar' };
      const from = s!.units.find((x) => x.id === swapFrom)!;
      const why = canSwap(s!, from.pos, u.pos);
      return why ? { mode: 'illegal', tag: why } : { mode: 'swap-legal', tag: `Cambiar con ${from.name}` };
    }
    if (selectedCard && avail) {
      if (u.id in avail.targets) {
        const why = avail.targets[u.id];
        if (why) return { mode: 'illegal', tag: why };
        return { mode: 'legal', tag: forcedTarget(s!, selectedCard)?.id === u.id ? 'Objetivo forzado' : 'Objetivo válido' };
      }
      if (avail.affects.includes(u.id)) return { mode: 'affected', tag: 'Afectado' };
    } else if (potionDef && potionNeedsTarget && u.side === 'ally') {
      return u.downed ? { mode: 'illegal', tag: 'Derribado: no recibe curación normal' } : { mode: 'legal', tag: 'Usar aquí' };
    }
    return { mode: 'none' };
  }

  function clickUnit(u: Unit) {
    if (swapMode) {
      if (!swapFrom) return setSwapFrom(u.id);
      const from = s!.units.find((x) => x.id === swapFrom)!;
      if (from.id === u.id) return setSwapFrom(null);
      game.swap(from.pos, u.pos);
      setSwapMode(false);
      setSwapFrom(null);
      return;
    }
    const m = unitMode(u);
    if (m.mode === 'illegal') return game.notify(m.tag ?? 'Objetivo no válido');
    game.clickUnit(u.id);
  }

  const context = hint
    ? hint
    : swapMode
      ? swapFrom
        ? 'Elige un aliado adyacente con el que intercambiar (Esc cancela).'
        : 'Elige el primer aliado para intercambiar.'
      : selectedCard
        ? avail && Object.keys(avail.targets).length
          ? `${selectedCard.name}: elige un objetivo (Esc cancela).`
          : `${selectedCard.name}: pulsa «Jugar carta» o Enter.`
        : potionDef
          ? potionNeedsTarget
            ? `${POTIONS[potionDef.id].name}: elige un aliado.`
            : `${POTIONS[potionDef.id].name}: pulsa «Usar poción».`
          : 'Elige una carta (teclas 1–5) o termina el turno.';

  const hand = s.hand;
  const mid = (hand.length - 1) / 2;
  const ended = s.outcome;

  return (
    <div className="cb screen">
      <Hud
        icon={combatKind === 'boss' ? 'boss' : combatKind === 'elite' ? 'elite' : 'card'}
        title={KIND_TITLE[combatKind]}
        subtitle="Islas de la Sombra"
        e={e}
        center={
          <span className="turnb">
            Turno <b>{s.turn}</b>
          </span>
        }
      >
        <RetreatButton e={e} disabled={over} />
      </Hud>

      <div className="cbtop">
        <RelicBar relics={s.relics} active={activeRelics} />
        <Belt belt={s.belt} selected={selectedPotion} onSelect={(i) => game.selectPotion(i)} />
        {potionDef && !potionNeedsTarget && (
          <button className="btn pri sm" onClick={() => game.usePotion(selectedPotion!)}>
            Usar poción
          </button>
        )}
      </div>

      {e.difficulty === 'nightmare' && !over && allies.some((a) => a.downed) && (
        <p className="warnbox red deathwarn" role="alert">
          <Icon name="down" />
          <span>
            <b>Pesadilla:</b> {allies.filter((a) => a.downed).map((a) => a.name).join(' y ')} {allies.filter((a) => a.downed).length > 1 ? 'están derribados' : 'está derribado'}. Si{' '}
            {allies.filter((a) => a.downed).length > 1 ? 'siguen' : 'sigue'} así al terminar el combate, {allies.filter((a) => a.downed).length > 1 ? 'morirán' : 'morirá'} para siempre. Reanimar (Renacer) los salva con una herida grave.
          </span>
        </p>
      )}
      <main className="stage" aria-label="Escenario de combate">
        <div className="scene" aria-hidden />
        <div className="team">
          {([4, 3, 2, 1] as Pos[]).map((p) => {
            const u = allies.find((a) => a.pos === p);
            if (u) {
              const m = unitMode(u);
              return <Fighter key={u.id} unit={u} s={s} mode={m.mode} tag={m.tag} fx={fx.filter((f) => f.unitId === u.id)} onClick={() => clickUnit(u)} />;
            }
            // Hueco dejado por un campeón muerto (Pesadilla): en modo intercambio se puede avanzar o retroceder a él.
            const from = swapMode && swapFrom ? s.units.find((x) => x.id === swapFrom) : undefined;
            if (!from || over) return null;
            const why = canSwap(s, from.pos, p);
            return (
              <button key={`empty-${p}`} className={`ftr slotempty ${why ? 'illegal' : 'swap-legal'}`} disabled={!!why} onClick={() => { game.swap(from.pos, p); setSwapMode(false); setSwapFrom(null); }}
                aria-label={`Posición ${p} vacía${why ? `: ${why}` : ': mover aquí'}`}>
                <span className="pn" aria-hidden>{p}</span> {why ?? 'Mover aquí'}
              </button>
            );
          })}
        </div>
        <div className="team">
          {enemies.map((u) => {
            const m = unitMode(u);
            return <Fighter key={u.id} unit={u} s={s} mode={m.mode} tag={m.tag} fx={fx.filter((f) => f.unitId === u.id)} onClick={() => clickUnit(u)} />;
          })}
        </div>
      </main>

      <section className="cbb" aria-label="Mano y acciones">
        <p className="hint" role="status">{context}</p>
        <button className="pile draw" onClick={() => setPile('draw')} aria-label={`Mazo de robo: ${s.drawPile.length} cartas`}>
          <Icon name="card" />
          <b>{s.drawPile.length}</b>
          <small>Robo</small>
        </button>
        <div className="orb" role="img" aria-label={`Energía ${s.energy} de ${CONFIG.energyPerTurn}`}>
          <b>
            {s.energy}/{CONFIG.energyPerTurn}
          </b>
          <small>Energía</small>
        </div>
        <button
          className={`btn swapbtn ${swapMode ? 'on' : ''}`}
          disabled={over}
          onClick={() => {
            setSwapMode(!swapMode);
            setSwapFrom(null);
            game.selectCard(null);
          }}
          title={`Intercambia a dos aliados adyacentes: ${CONFIG.swapCost} de energía, una vez por turno.`}
        >
          <Icon name="swap" /> Intercambiar ({CONFIG.swapCost}⚡)
        </button>
        <div className="hand" role="group" aria-label="Mano">
          {hand.map((inst, i) => {
            const card = cardOf(s, inst);
            const a = cardAvailability(s, card);
            const off = i - mid;
            return (
              <div key={inst.uid} className="slot" style={{ ['--r' as string]: `${off * 4}deg`, ['--y' as string]: `${Math.abs(off) ** 2 * 3}px` }}>
                <Card
                  card={card}
                  cost={a.cost}
                  upgraded={inst.upgraded}
                  selected={inst.uid === selectedUid}
                  reason={a.playable ? null : a.reason}
                  bonus={bonusActive(s, card)}
                  hotkey={i + 1}
                  onClick={() => (inst.uid === selectedUid ? game.selectCard(null) : pickCard(inst))}
                />
              </div>
            );
          })}
        </div>
        {selectedCard && avail && !Object.keys(avail.targets).length && (
          <button className="btn pri playbtn" onClick={() => game.playSelected()}>
            Jugar carta
          </button>
        )}
        <button className="btn pri endbtn" disabled={over} onClick={() => game.endTurn()}>
          Terminar turno
        </button>
        <button className="pile disc" onClick={() => setPile('discard')} aria-label={`Descarte: ${s.discard.length} cartas`}>
          <Icon name="card" />
          <b>{s.discard.length}</b>
          <small>Descarte</small>
        </button>
      </section>

      {pile && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={pile === 'draw' ? 'Mazo de robo' : 'Descarte'} onClick={() => setPile(null)}>
          <div className="panel" onClick={(ev) => ev.stopPropagation()}>
            <h3>
              <Icon name="card" /> {pile === 'draw' ? 'Mazo de robo (orden oculto)' : 'Descarte'}
            </h3>
            <PileList cards={pile === 'draw' ? s.drawPile : s.discard} />
            <button className="btn" onClick={() => setPile(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {ended !== 'ongoing' && (
        <div className="modal over" role="dialog" aria-modal="true" aria-label={ended === 'won' ? 'Victoria' : 'Derrota'}>
          <div className="panel">
            <h1 className={ended}>{ended === 'won' ? 'Victoria' : 'Derrota'}</h1>
            <p className="sub">
              {ended === 'won'
                ? `Combate ganado en ${s.turn} turnos. ${living(s, 'ally').length} de ${allies.length} campeones en pie.`
                : 'Todo el equipo ha caído.'}
            </p>
            <button className="btn pri" onClick={() => game.concludeCombat()} autoFocus>
              {ended === 'won' ? 'Recoger botín' : 'Continuar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PileList({ cards }: { cards: CardInstance[] }) {
  const rows = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) m.set(c.upgraded ? `${c.defId}+` : c.defId, (m.get(c.upgraded ? `${c.defId}+` : c.defId) ?? 0) + 1);
    return [...m.entries()].map(([id, n]) => ({ id, def: deckCardDef(id), up: isUpgradedId(id), n })).sort((a, b) => a.def.owner.localeCompare(b.def.owner) || a.def.name.localeCompare(b.def.name));
  }, [cards]);
  if (!rows.length) return <p className="sub">Vacío.</p>;
  return (
    <ul className="pilelist">
      {rows.map(({ id, def, up, n }) => (
        <li key={id}>
          <span className="dot" style={{ background: CHAMPIONS[def.owner].color }} aria-hidden />
          <b>{def.name}{up ? ' +' : ''}</b> <small>{CHAMPIONS[def.owner].name} · coste {def.cost}</small> <span className="n">×{n}</span>
        </li>
      ))}
    </ul>
  );
}

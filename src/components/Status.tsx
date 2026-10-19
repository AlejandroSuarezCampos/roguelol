import { STATUS_INFO } from '../data/glossary';
import type { StatusId } from '../engine/types';
import { Icon } from './Icon';

const TONE: Record<StatusId, string> = {
  mark: 'mark', stun: 'stun', shadowMark: 'mark', burn: 'burn', charge: 'charge', vulnerable: 'burn',
};

export function StatusChip({ id, stacks }: { id: StatusId; stacks: number }) {
  const info = STATUS_INFO[id];
  return (
    <span className={`st ${TONE[id]}`} title={`${info.name}: ${info.text}`}>
      <Icon name={info.icon} />
      <b>{info.name}</b>
      <i>{stacks > 0 ? ` ${stacks}` : ''}</i>
    </span>
  );
}

export function statusEntries(statuses: Partial<Record<StatusId, number>>): [StatusId, number][] {
  return (Object.entries(statuses) as [StatusId, number][]).filter(([, n]) => n > 0);
}

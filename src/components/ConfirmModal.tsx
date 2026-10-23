import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Acción destructiva o irreversible: el botón de confirmar va en rojo y el foco empieza en «Cancelar». */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmación en la propia interfaz (spec §15): explica la consecuencia antes de actuar. Esc cancela. */
export function ConfirmModal({ title, children, confirmLabel, cancelLabel = 'Volver', danger, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="modal" role="alertdialog" aria-modal="true" aria-label={title} onClick={onCancel}>
      <div className="panel" onClick={(ev) => ev.stopPropagation()}>
        <h2 className="sh">
          <Icon name="warn" /> {title}
        </h2>
        <div className="col">{children}</div>
        <div className="row">
          <button className="btn" onClick={onCancel} autoFocus={danger}>
            {cancelLabel}
          </button>
          <button className={`btn ${danger ? 'dng' : 'pri'}`} onClick={onConfirm} autoFocus={!danger}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

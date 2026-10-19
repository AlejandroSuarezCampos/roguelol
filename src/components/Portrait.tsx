import { useState } from 'react';

interface Props {
  src?: string;
  /** Texto del monograma de respaldo (si la imagen no carga). */
  mono: string;
  color: string;
  bg?: string;
  alt?: string;
  className?: string;
  /** `monster`: encuadre centrado de los iconos de monstruos. */
  fit?: 'face' | 'monster';
}

/** Retrato enlazado con respaldo a monograma, como el prototipo. */
export function Portrait({ src, mono, color, bg = '#10192a', alt = '', className = '', fit = 'face' }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`port ${fit === 'monster' ? 'mon' : ''} ${className}`} style={{ background: `linear-gradient(135deg,${bg},#05060a)` }}>
      <span className="mono" style={{ color }} aria-hidden>
        {mono}
      </span>
      {src && !failed && <img src={src} alt={alt} referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} />}
    </div>
  );
}

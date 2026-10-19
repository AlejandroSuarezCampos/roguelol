import { ICONS } from './icons';

export type IconName = keyof typeof ICONS | (string & {});

/** Icono SVG en línea. Decorativo por defecto: el significado lo lleva siempre una etiqueta de texto. */
export function Icon({ name, className = '', title }: { name: IconName; className?: string; title?: string }) {
  const ic = ICONS[name];
  if (!ic) return null;
  return (
    <svg
      className={`ic ${className}`}
      viewBox={ic.viewBox}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: ic.body }}
    />
  );
}

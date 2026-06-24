// Renders a Material Symbols glyph (Outlined, weight 300 — see index.html for
// the font-face setup). `name` is the Material Symbols ligature name, e.g.
// "edit", "delete", "expand_more", "chevron_right".
export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined select-none ${className}`}>
      {name}
    </span>
  );
}

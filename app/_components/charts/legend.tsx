export type LegendItem = { label: string; color: string; dashed?: boolean };

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-4 rounded-sm"
            style={
              i.dashed
                ? { backgroundImage: `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)` }
                : { backgroundColor: i.color }
            }
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

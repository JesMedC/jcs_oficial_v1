import { GlassCard } from '../GlassCard';

/*
 * p1c — Pricing feature comparison table.
 *
 * 10 rows × 3 columns (Starter / Pro / Elite). Tick = cyan SVG, X = cyan
 * muted 40% opacity. Pro gets the visual emphasis as middle column.
 */
export function ComparisonTable() {
  return (
    <GlassCard variant="elevated" className="overflow-x-auto p-0">
      <table className="w-full text-sm md:text-base">
        <thead>
          <tr className="border-b border-primary/20">
            <th
              scope="col"
              className="text-left font-display uppercase tracking-wide text-text-muted text-xs md:text-sm px-4 md:px-6 py-4"
            >
              Caracteristica
            </th>
            <th
              scope="col"
              className="text-center font-display uppercase tracking-wide text-text-secondary text-xs md:text-sm px-4 py-4"
            >
              Starter
            </th>
            <th
              scope="col"
              className="text-center font-display uppercase tracking-wide text-primary text-xs md:text-sm px-4 py-4"
            >
              Pro
            </th>
            <th
              scope="col"
              className="text-center font-display uppercase tracking-wide text-text-secondary text-xs md:text-sm px-4 md:px-6 py-4"
            >
              Elite
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.feature}
              className={index % 2 === 0 ? 'bg-surface/20' : 'bg-surface-el/20'}
            >
              <th
                scope="row"
                className="text-left font-body text-text-primary text-sm px-4 md:px-6 py-3 font-normal"
              >
                {row.feature}
              </th>
              <td className="text-center px-4 py-3">
                <Cell value={row.starter} />
              </td>
              <td className="text-center px-4 py-3 bg-primary/5">
                <Cell value={row.pro} />
              </td>
              <td className="text-center px-4 md:px-6 py-3">
                <Cell value={row.elite} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
}

function Cell({ value }: { readonly value: CellValue }) {
  if (value === true) return <Tick />;
  if (value === false) return <Cross />;
  return <span className="font-mono text-text-primary text-sm">{value}</span>;
}

type CellValue = boolean | string;

interface Row {
  readonly feature: string;
  readonly starter: CellValue;
  readonly pro: CellValue;
  readonly elite: CellValue;
}

const rows: ReadonlyArray<Row> = [
  { feature: 'Cuentas', starter: '1', pro: '5', elite: 'Ilimitadas' },
  {
    feature: 'Registro de operaciones',
    starter: 'Ilimitado',
    pro: 'Ilimitado',
    elite: 'Ilimitado',
  },
  { feature: 'Reportes', starter: 'Basicos', pro: 'Personalizados', elite: 'Avanzado' },
  { feature: 'Metricas avanzadas', starter: false, pro: true, elite: true },
  { feature: 'Filtros', starter: false, pro: true, elite: true },
  { feature: 'Exportacion CSV', starter: false, pro: true, elite: true },
  { feature: 'Backtesting', starter: false, pro: false, elite: true },
  { feature: 'Alertas personalizadas', starter: false, pro: false, elite: true },
  { feature: 'Soporte', starter: 'Email', pro: 'Prioritario', elite: 'VIP' },
  { feature: 'Acceso API', starter: false, pro: false, elite: true },
];

function Tick() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00FFFF"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary inline-block"
      aria-label="Incluido"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Cross() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00FFFF"
      strokeOpacity="0.4"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary inline-block opacity-40"
      aria-label="No incluido"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

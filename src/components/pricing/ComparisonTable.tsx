import { GlassCard } from '../GlassCard';

/*
 * p0b.1b — Pricing feature comparison table.
 *
 * 10 rows × 3 columns (Starter / Plus / Elite). STARTER is now the
 * highlighted left column (free 7-day trial, then downgrade). Plus
 * and Elite get the upgrade CTAs in p0c via the dashboard.
 *
 * Tick = cyan SVG, X = cyan muted 40% opacity. Plus gets the visual
 * emphasis as middle column.
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
              className="text-center font-display uppercase tracking-wide text-primary text-xs md:text-sm px-4 py-4"
            >
              Starter
            </th>
            <th
              scope="col"
              className="text-center font-display uppercase tracking-wide text-text-secondary text-xs md:text-sm px-4 py-4"
            >
              Plus
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
              <td className="text-center px-4 py-3 bg-primary/5">
                <Cell value={row.starter} />
              </td>
              <td className="text-center px-4 py-3">
                <Cell value={row.plus} />
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
  readonly plus: CellValue;
  readonly elite: CellValue;
}

/*
 * p0b.1b — STARTER row reflects the trial (7 dias gratis, then card
 * oculto o downgrade). Pricing columns renamed Starter/Plus/Elite.
 * Plus $9.99 / mes and Elite $29.99 / mes match the backend
 * PlanTierPrice rows seeded by p0b.1a migrations.
 */
const rows: ReadonlyArray<Row> = [
  { feature: 'Cuentas', starter: '1', plus: '5', elite: 'Ilimitadas' },
  {
    feature: 'Periodo de prueba',
    starter: '7 dias',
    plus: 'X',
    elite: 'X',
  },
  {
    feature: 'Registro de operaciones',
    starter: 'Ilimitado',
    plus: 'Ilimitado',
    elite: 'Ilimitado',
  },
  { feature: 'Reportes', starter: 'Basicos', plus: 'Personalizados', elite: 'Avanzado' },
  { feature: 'Metricas avanzadas', starter: false, plus: true, elite: true },
  { feature: 'Filtros', starter: false, plus: true, elite: true },
  { feature: 'Exportacion CSV', starter: false, plus: true, elite: true },
  { feature: 'Backtesting', starter: false, plus: false, elite: true },
  { feature: 'Alertas personalizadas', starter: false, plus: false, elite: true },
  { feature: 'Soporte', starter: 'Email', plus: 'Prioritario', elite: 'VIP' },
  { feature: 'Acceso API', starter: false, plus: false, elite: true },
];

function Tick() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00FF9D" /* Wave 3c (T3c.1): cyan checkmark stroke → neon jade hex. */
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
      stroke="#00FF9D" /* Wave 3c (T3c.1): cyan cross stroke → neon jade hex (opacity 0.4 preserved). */
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

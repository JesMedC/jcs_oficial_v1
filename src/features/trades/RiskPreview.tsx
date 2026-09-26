import type { TradeFormValues } from './schemas';

type RiskPreviewType = Extract<TradeFormValues['type'], 'BINARY' | 'FOREX'>;

export interface RiskPreviewProps {
  readonly selectedType: RiskPreviewType;
  readonly accountBalance: string | number | null | undefined;
  readonly binaryInvestment: number | null;
  readonly forexLotSize: string | number | null | undefined;
  readonly forexEntryPrice: string | number | null | undefined;
  readonly forexStopLoss: string | number | null | undefined;
}

interface RiskPreviewModel {
  readonly balance: number;
  readonly exposure: number | null;
  readonly estimatedRisk: number | null;
  readonly postOpenBalance: number | null;
  readonly riskPending: boolean;
  readonly exposurePending: boolean;
  readonly insufficientBalance: boolean;
}

export function RiskPreview({
  selectedType,
  accountBalance,
  binaryInvestment,
  forexLotSize,
  forexEntryPrice,
  forexStopLoss,
}: RiskPreviewProps) {
  const model = buildRiskPreview({
    selectedType,
    accountBalance,
    binaryInvestment,
    forexLotSize,
    forexEntryPrice,
    forexStopLoss,
  });
  const status = getStatus(model);

  return (
    <section
      data-testid="risk-preview"
      aria-label="Vista previa de riesgo"
      className="rounded-xl border border-primary/30 bg-surface-el/50 p-4 shadow-glow-jade/10"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xs uppercase tracking-[0.18em] text-primary">
            Vista previa de riesgo
          </h3>
          <p className="mt-1 font-body text-xs text-text-secondary">
            Revisión profesional antes de abrir la operación.
          </p>
        </div>
        <span
          data-testid="risk-preview-status"
          className={`rounded-full border px-2.5 py-1 font-display text-[10px] uppercase tracking-wide ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 font-body text-sm">
        <Metric label="Balance" value={formatUsd(model.balance)} testId="risk-preview-balance" />
        <Metric
          label="Exposición"
          value={model.exposurePending ? 'Pendiente' : formatUsd(model.exposure)}
          testId="risk-preview-exposure"
        />
        <Metric
          label="Riesgo estimado"
          value={model.riskPending ? 'Pendiente: agregá stop loss' : formatUsd(model.estimatedRisk)}
          testId="risk-preview-risk"
        />
        <Metric
          label="Balance post-apertura"
          value={model.postOpenBalance === null ? 'Pendiente' : formatUsd(model.postOpenBalance)}
          testId="risk-preview-post-balance"
        />
      </dl>

      {model.insufficientBalance ? (
        <div
          role="alert"
          data-testid="risk-preview-insufficient"
          className="mt-3 rounded-lg border border-loss/40 bg-loss/15 px-3 py-2 font-body text-xs text-loss"
        >
          Exposición mayor al balance disponible. Revisá el tamaño antes de enviar.
        </div>
      ) : model.riskPending ? (
        <div
          data-testid="risk-preview-pending"
          className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 font-body text-xs text-warning"
        >
          Riesgo pendiente: completá el stop loss para estimar la pérdida máxima.
        </div>
      ) : null}
    </section>
  );
}

function buildRiskPreview({
  selectedType,
  accountBalance,
  binaryInvestment,
  forexLotSize,
  forexEntryPrice,
  forexStopLoss,
}: RiskPreviewProps): RiskPreviewModel {
  const balance = parseFinite(accountBalance) ?? 0;

  if (selectedType === 'BINARY') {
    const investment = binaryInvestment !== null ? parseFinite(binaryInvestment) : null;
    const exposure = investment !== null && investment > 0 ? roundUsd(investment) : null;
    return {
      balance,
      exposure,
      estimatedRisk: exposure,
      postOpenBalance: exposure === null ? null : roundUsd(balance - exposure),
      riskPending: exposure === null,
      exposurePending: exposure === null,
      insufficientBalance: exposure !== null && exposure > balance,
    };
  }

  const lot = parseFinite(forexLotSize);
  const entry = parseFinite(forexEntryPrice);
  const stop = parseFinite(forexStopLoss);
  const hasExposureInputs = lot !== null && lot > 0 && entry !== null && entry > 0;
  const exposure = hasExposureInputs ? roundUsd(lot * entry * 100) : null;
  const hasStop = stop !== null && stop > 0;
  const estimatedRisk = hasExposureInputs && hasStop
    ? roundUsd(Math.abs(entry - stop) * lot * 100)
    : null;

  return {
    balance,
    exposure,
    estimatedRisk,
    postOpenBalance: exposure === null ? null : roundUsd(balance - exposure),
    riskPending: estimatedRisk === null,
    exposurePending: exposure === null,
    insufficientBalance: exposure !== null && exposure > balance,
  };
}

function Metric({
  label,
  value,
  testId,
}: {
  readonly label: string;
  readonly value: string;
  readonly testId: string;
}) {
  return (
    <div className="rounded-lg border border-primary/15 bg-bg/60 px-3 py-2">
      <dt className="font-display text-[10px] uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd data-testid={testId} className="mt-1 text-text-primary">
        {value}
      </dd>
    </div>
  );
}

function getStatus(model: RiskPreviewModel): { readonly label: string; readonly className: string } {
  if (model.insufficientBalance) {
    return { label: 'Balance insuficiente', className: 'border-loss/40 bg-loss/15 text-loss' };
  }
  if (model.riskPending) {
    return { label: 'Riesgo pendiente', className: 'border-warning/40 bg-warning/10 text-warning' };
  }
  return { label: 'Listo para revisar', className: 'border-profit/40 bg-profit/15 text-profit' };
}

function parseFinite(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatUsd(value: number | null): string {
  if (value === null) return 'Pendiente';
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

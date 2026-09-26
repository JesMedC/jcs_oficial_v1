/*
 * p0e.3 — Cuentas detail panel.
 *
 * Route: ``/portal/cuentas/:accountId`` (nested under ``PortalShell``
 * so it inherits the sidebar). Layout:
 *   - H1 with the account name (Orbitron uppercase, jade glow)
 *   - Broker chip + "← Volver a Cuentas" link
 *   - 4 tabs: Resumen, Saldo, Operaciones, Zona de peligro
 *   - Active tab: jade border-bottom + jade text (matches portal
 *     sidebar active pattern from ``PortalSidebar.tsx``)
 *   - Tab state via ``useState<string>('resumen')`` + ``useSearchParams``
 *     so the URL persists the active tab (``?tab=saldo``)
 *
 * Tab content:
 *   - Resumen → GlassCard with broker / type / name / balance / created
 *   - Saldo → GlassCard with current balance + Fondear / Retirar buttons
 *     that open ``FundWithdrawModal``. After success, refetch account
 *     and update state.
 *   - Operaciones → GlassCard placeholder ("Próximamente") until Module C.
 *   - Zona de peligro → red-tinted GlassCard + delete button → opens
 *     ``DeleteAccountDialog``.
 *
 * 404 from ``getAccountById`` renders "Cuenta no encontrada" + back
 * link. Loading shows a small "Cargando cuenta..." message (the page
 * is dense enough that a skeleton would just be visual noise).
 *
 * Per mem #68, UI copy is Spanish. Per mem #70, visual language
 * matches the jade + Orbitron + glassmorphism used elsewhere.
 */
import React, { useContext, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { SeoHead } from '../../components/SeoHead';
import { GlassCard } from '../../components/GlassCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { FundWithdrawModal } from '../../components/portal/FundWithdrawModal';
import { DeleteAccountDialog } from '../../components/portal/DeleteAccountDialog';
import { WinrateBySessionCard } from '../../components/dashboard/WinrateBySessionCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAccount, useAccountMovements } from '../../features/accounts/hooks';
import {
  ACCOUNT_MOVEMENT_TYPE_LABEL,
  ACCOUNT_TYPE_BADGE,
  type AccountOut,
} from '../../features/accounts/types';
import { AuthContext } from '../../features/auth/AuthProvider';
import type { ErrorEnvelope } from '../../features/auth/types';

type TabId = 'resumen' | 'saldo' | 'operaciones' | 'peligro';

const TAB_IDS: ReadonlyArray<TabId> = ['resumen', 'saldo', 'operaciones', 'peligro'];
const TAB_LABELS: Record<TabId, string> = {
  resumen: 'Resumen',
  saldo: 'Saldo',
  operaciones: 'Operaciones',
  peligro: 'Zona de peligro',
};

function isTabId(value: string | null): value is TabId {
  return value !== null && (TAB_IDS as ReadonlyArray<string>).includes(value);
}

function formatUsd(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatSignedMovementAmount(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  const abs = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Math.abs(n),
  );
  if (n > 0) return `+${abs}`;
  if (n < 0) return `-${abs}`;
  return abs;
}

function formatLedgerTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
}

export function CuentasDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab: TabId = isTabId(tabParam) ? tabParam : 'resumen';

  const resolvedAccountId = accountId ?? '';
  const accountQuery = useAccount(resolvedAccountId);
  const movementsQuery = useAccountMovements(resolvedAccountId);
  const account = accountQuery.data ?? null;
  const loading = accountQuery.isLoading;
  const queryError = accountQuery.error as ErrorEnvelope | null;
  const notFound = accountQuery.error !== null
    ? (accountQuery.error as { code?: string }).code === 'NOT_FOUND'
    : false;
  const [error, setError] = useState<ErrorEnvelope | null>(null);
  const [fundOpen, setFundOpen] = useState<boolean>(false);
  const [withdrawOpen, setWithdrawOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const displayedError = error ?? (notFound ? null : queryError);

  const handleTabChange = (next: TabId) => {
    if (next === activeTab) return;
    const newParams = new URLSearchParams(searchParams);
    if (next === 'resumen') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', next);
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleSuccess = (updated: AccountOut) => {
    queryClient.setQueryData(['account', updated.id], updated);
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['accountMovements', updated.id] });
    setFundOpen(false);
    setWithdrawOpen(false);
  };

  const handleDeleted = () => {
    setDeleteOpen(false);
    navigate('/portal/cuentas', { replace: true });
  };

  if (loading) {
    return (
      <>
        <SeoHead title="Cuenta" noindex />
        <div className="w-full px-2 md:px-4 py-3 md:py-4">
          <p className="text-text-muted font-body">Cargando cuenta...</p>
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <SeoHead title="Cuenta no encontrada" noindex />
        <div className="w-full px-2 md:px-4 py-3 md:py-4">
          <Link
            to="/portal/cuentas"
            className="text-primary font-display uppercase tracking-wide text-xs hover:underline inline-block mb-4"
          >
            ← Volver a Cuentas
          </Link>
          <PageHeader
            subLabel="Cuenta no encontrada"
            title="Sin resultados"
            subtitle="La cuenta que buscás no existe o ya fue eliminada."
          />
        </div>
      </>
    );
  }

  if (account === null) {
    return null;
  }

  const badge = ACCOUNT_TYPE_BADGE[account.type];

  return (
    <>
      <SeoHead title={account.name} noindex />
      <div className="w-full px-2 md:px-4 py-3 md:py-4">
        <Link
          to="/portal/cuentas"
          className="text-primary font-display uppercase tracking-wide text-xs hover:underline"
        >
          ← Volver a Cuentas
        </Link>

        <PageHeader
          subLabel="Cuenta"
          title={account.name}
          subtitle={`${badge.label} · ${account.broker_name}`}
        />

        <ErrorBanner error={displayedError} onDismiss={() => setError(null)} className="mt-6 mb-2" />

        <nav
          className="mt-6 border-b border-primary/20 flex gap-1 overflow-x-auto"
          aria-label="Secciones de la cuenta"
        >
          {TAB_IDS.map((id) => {
            const isActive = id === activeTab;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'px-4 py-2 font-display uppercase tracking-wide text-sm border-b-2 -mb-px transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-b-primary text-primary'
                    : 'border-b-transparent text-text-secondary hover:text-primary hover:border-b-primary/40',
                ].join(' ')}
              >
                {TAB_LABELS[id]}
              </button>
            );
          })}
        </nav>

        <div className="mt-6">
          {activeTab === 'resumen' ? <ResumenTab account={account} /> : null}
          {activeTab === 'saldo' ? (
            <SaldoTab
              account={account}
              onFund={() => setFundOpen(true)}
              onWithdraw={() => setWithdrawOpen(true)}
            />
          ) : null}
          {activeTab === 'operaciones' ? <OperacionesTab query={movementsQuery} /> : null}
          {activeTab === 'peligro' ? (
            <ZonaPeligroTab account={account} onDelete={() => setDeleteOpen(true)} />
          ) : null}
        </div>
      </div>

      <FundWithdrawModal
        open={fundOpen}
        mode="fund"
        account={account}
        onClose={() => setFundOpen(false)}
        onSuccess={handleSuccess}
      />
      <FundWithdrawModal
        open={withdrawOpen}
        mode="withdraw"
        account={account}
        onClose={() => setWithdrawOpen(false)}
        onSuccess={handleSuccess}
      />
      <DeleteAccountDialog
        open={deleteOpen}
        account={account}
        onClose={() => setDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </>
  );
}

interface ResumenTabProps {
  readonly account: AccountOut;
}

function ResumenTab({ account }: ResumenTabProps) {
  const badge = ACCOUNT_TYPE_BADGE[account.type];
  // PR-2: workspaceId drives the WinrateBySessionCard fetch. Read
  // via `useContext(AuthContext)` directly (not the strict useAuth
  // hook) so the page still renders when the test harness doesn't
  // mount an AuthProvider — workspaceId falls back to '' and the
  // hook's ``enabled`` guard keeps the fetch silent.
  const authCtx = useContext(AuthContext);
  const workspaceId = authCtx?.user?.workspaces[0]?.id ?? '';
  return (
    <div className="flex flex-col gap-4">
      <GlassCard variant="default">
        <h2 className="font-display uppercase tracking-wide text-base md:text-lg mb-4">
          Resumen
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <Row label="Broker" value={account.broker_name} />
          <Row
            label="Tipo"
            value={
              <span
                className={`inline-block border rounded-full px-2 py-0.5 text-xs font-display uppercase tracking-wide ${badge.className}`}
              >
                {badge.label}
              </span>
            }
          />
          <Row label="Nombre" value={account.name} />
          <Row label="Balance" value={formatUsd(account.balance_usd)} accent />
          <Row label="Creada" value={formatLongDate(account.created_at)} />
        </dl>
      </GlassCard>
      {/* one-by-one-thousand-discipline PR-2 — winrate-by-session
          card. Per REQ-WRS-007 the card is reusable across pages;
          here we mount it scoped to the current account so the
          trader sees WHERE they win on this specific account.
          ``workspaceId`` falls back to '' when auth hasn't resolved
          yet — the hook's ``enabled`` guard keeps the fetch silent. */}
      <WinrateBySessionCard
        workspaceId={workspaceId}
        initialAccountId={account.id}
      />
    </div>
  );
}

interface RowProps {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly accent?: boolean;
}

function Row({ label, value, accent = false }: RowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-display uppercase tracking-wide text-xs text-text-muted">{label}</dt>
      <dd
        className={`font-body text-sm md:text-base ${
          accent ? 'text-primary text-2xl font-display tracking-wide' : 'text-text-primary'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

interface SaldoTabProps {
  readonly account: AccountOut;
  readonly onFund: () => void;
  readonly onWithdraw: () => void;
}

function SaldoTab({ account, onFund, onWithdraw }: SaldoTabProps) {
  return (
    <GlassCard variant="default">
      <h2 className="font-display uppercase tracking-wide text-base md:text-lg mb-4">
        Saldo
      </h2>
      <div className="flex items-baseline gap-3">
        <span className="font-display uppercase tracking-wide text-xs text-text-muted">
          Balance actual
        </span>
        <span
          className="font-display text-primary text-3xl tracking-wide"
          style={{ textShadow: '0 0 16px rgba(0,212,216,0.3)' }} // design-system-v1 (Wave 3d, T3d.1) — old-jade rgba swapped for neon jade rgba(0,212,216,*).
        >
          {formatUsd(account.balance_usd)}
        </span>
      </div>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onFund}
          className="inline-flex items-center justify-center bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,212,216,0.5)] transition-shadow text-sm" // design-system-v1 (Wave 3d, T3d.1) — old-jade hover-shadow swapped for neon jade rgba(0,212,216,*).
        >
          Fondear
        </button>
        <button
          type="button"
          onClick={onWithdraw}
          className="inline-flex items-center justify-center border border-primary/40 text-primary font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm"
        >
          Retirar
        </button>
      </div>
      <p className="mt-4 text-text-muted font-body text-xs">
        Tip: usá valores con 2 decimales (0.01 — 99999999.99). El backend rechaza montos ≤ 0.
      </p>
    </GlassCard>
  );
}

interface OperacionesTabProps {
  readonly query: ReturnType<typeof useAccountMovements>;
}

function OperacionesTab({ query }: OperacionesTabProps) {
  const movements = [...(query.data?.items ?? [])].sort((a, b) => {
    const dateDelta = new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
    return dateDelta !== 0 ? dateDelta : b.id.localeCompare(a.id);
  });

  return (
    <GlassCard variant="default" className="overflow-hidden">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-5">
        <div>
          <h2 className="font-display uppercase tracking-wide text-base md:text-lg">
            Libro de cuenta
          </h2>
          <p className="mt-1 text-text-secondary font-body text-sm">
            Movimientos de capital y operaciones, ordenados del más reciente al más antiguo.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-display text-[11px] uppercase tracking-widest text-primary">
          {query.data?.total ?? movements.length} movimientos
        </span>
      </div>

      {query.isLoading ? (
        <div
          className="rounded-xl border border-primary/15 bg-surface/40 p-6 text-text-secondary font-body text-sm"
          data-testid="account-movements-loading"
        >
          Cargando movimientos...
        </div>
      ) : null}

      {query.isError ? (
        <div
          className="rounded-xl border border-loss/35 bg-loss/10 p-5"
          role="alert"
          data-testid="account-movements-error"
        >
          <p className="font-display uppercase tracking-wide text-sm text-loss">
            No pudimos cargar el libro
          </p>
          <p className="mt-1 font-body text-sm text-text-secondary">
            Reintentá en unos segundos. Si persiste, conservá el código de error del banner.
          </p>
        </div>
      ) : null}

      {!query.isLoading && !query.isError && movements.length === 0 ? (
        <div
          className="rounded-xl border border-primary/15 bg-surface/40 p-8 text-center"
          data-testid="account-movements-empty"
        >
          <p className="font-display uppercase tracking-wide text-sm text-text-primary">
            Sin movimientos todavía
          </p>
          <p className="mt-2 font-body text-sm text-text-secondary">
            Cuando fondees, retires o cierres operaciones, el historial va a aparecer acá.
          </p>
        </div>
      ) : null}

      {!query.isLoading && !query.isError && movements.length > 0 ? (
        <div className="overflow-x-auto" data-testid="account-movements-table">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 font-body text-sm">
            <thead>
              <tr className="border-b border-primary/15 text-left font-display text-[10px] uppercase tracking-widest text-text-muted">
                <th className="border-b border-primary/15 px-3 py-3">Fecha</th>
                <th className="border-b border-primary/15 px-3 py-3">Movimiento</th>
                <th className="border-b border-primary/15 px-3 py-3 text-right">Monto</th>
                <th className="border-b border-primary/15 px-3 py-3 text-right">Balance previo</th>
                <th className="border-b border-primary/15 px-3 py-3 text-center">→</th>
                <th className="border-b border-primary/15 px-3 py-3 text-right">Balance final</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => {
                const amount = Number(movement.amount);
                const amountTone = amount > 0
                  ? 'text-profit'
                  : amount < 0
                    ? 'text-loss'
                    : 'text-text-muted';
                return (
                  <tr
                    key={movement.id}
                    className="border-b border-primary/10 transition-colors hover:bg-primary/5"
                    data-testid={`account-movement-row-${movement.id}`}
                  >
                    <td className="border-b border-primary/10 px-3 py-3 text-text-secondary whitespace-nowrap">
                      {formatLedgerTimestamp(movement.occurred_at)}
                    </td>
                    <td className="border-b border-primary/10 px-3 py-3">
                      <span className="font-display text-xs uppercase tracking-wide text-text-primary">
                        {ACCOUNT_MOVEMENT_TYPE_LABEL[movement.movement_type]}
                      </span>
                    </td>
                    <td className={`border-b border-primary/10 px-3 py-3 text-right font-mono font-semibold tabular-nums ${amountTone}`}>
                      {formatSignedMovementAmount(movement.amount)}
                    </td>
                    <td className="border-b border-primary/10 px-3 py-3 text-right font-mono text-text-secondary tabular-nums">
                      {formatUsd(movement.previous_balance)}
                    </td>
                    <td className="border-b border-primary/10 px-3 py-3 text-center text-primary/70">
                      →
                    </td>
                    <td className="border-b border-primary/10 px-3 py-3 text-right font-mono text-text-primary tabular-nums">
                      {formatUsd(movement.post_balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </GlassCard>
  );
}

interface ZonaPeligroTabProps {
  readonly account: AccountOut;
  readonly onDelete: () => void;
}

function ZonaPeligroTab({ account, onDelete }: ZonaPeligroTabProps) {
  return (
    <GlassCard variant="default" className="border-loss/40">
      <h2 className="font-display uppercase tracking-wide text-loss text-base md:text-lg mb-2">
        Eliminar cuenta permanentemente
      </h2>
      <p className="text-text-secondary font-body text-sm md:text-base">
        Una vez eliminada, la cuenta ya no aparecerá en el listado ni podrá recibir
        fondeos o retiros. El historial de operaciones se conserva para tu journal.
      </p>
      <button
        type="button"
        onClick={onDelete}
        className="mt-6 inline-flex items-center justify-center bg-loss text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(255,92,92,0.5)] transition-shadow text-sm"
      >
        Eliminar cuenta "{account.name}"
      </button>
    </GlassCard>
  );
}

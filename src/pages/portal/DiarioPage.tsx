import { useContext, useMemo, useState } from 'react';

import { AccountSelector } from '../../components/dashboard/AccountSelector';
import { PnLCalendar } from '../../components/dashboard/PnLCalendar';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { AuthContext } from '../../features/auth/AuthProvider';
import { useAccounts } from '../../features/accounts/hooks';
import type { TradeOut } from '../../features/trades/types';
import { useTradesAll } from '../../features/trades/useTradesAll';

function sumClosedPnl(trades: ReadonlyArray<TradeOut>): number {
  return trades.reduce((total, trade) => {
    if (trade.pnl_usd === null || trade.pnl_usd === undefined) return total;
    const value = Number(trade.pnl_usd);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatScope(accountName: string | undefined, fallbackName: string | undefined): string {
  if (accountName) return accountName;
  if (fallbackName) return `Todas · ${fallbackName}`;
  return 'Todas las cuentas';
}

export function DiarioPage() {
  const authCtx = useContext(AuthContext);
  const accountsQuery = useAccounts();
  const accounts = useMemo(
    () => accountsQuery.data?.items ?? [],
    [accountsQuery.data?.items],
  );
  const firstAccountWorkspaceId = accounts[0]?.workspace_id;
  const workspaceId =
    firstAccountWorkspaceId ?? authCtx?.user?.workspaces[0]?.id ?? '';

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  const tradesAll = useTradesAll(
    selectedAccountId !== null ? { account_id: selectedAccountId } : {},
  );

  const tradesForDayPanel = useMemo(() => {
    const ids = new Set<string>();
    for (const account of accounts) ids.add(account.id);
    return (tradesAll.trades ?? []).filter((trade) => ids.has(trade.account_id));
  }, [tradesAll.trades, accounts]);

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const closedTrades = tradesForDayPanel.filter((trade) => trade.status !== 'OPEN');
  const openTrades = tradesForDayPanel.length - closedTrades.length;
  const netPnl = sumClosedPnl(closedTrades);
  const winningTrades = closedTrades.filter((trade) => trade.status === 'CLOSED_WIN').length;
  const winRate = closedTrades.length === 0 ? 0 : winningTrades / closedTrades.length;

  if (workspaceId === '') {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 p-2 sm:p-4 lg:p-6">
        <PageHeader
          subLabel="Diario · Calendario"
          title="Calendario P&L"
          subtitle="Necesitás un workspace activo para ver el calendario."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 p-2 sm:p-4 lg:p-6">
      <PageHeader
        subLabel="Diario · Calendario"
        title="Calendario P&L"
        subtitle="Revisá el mes con contexto operativo: alcance de cuenta, P&L, consistencia y detalle diario sin perder el calendario."
        actions={
          <SurfacePanel as="div" variant="outline" padding="sm">
            <AccountSelector
              value={selectedAccountId}
              onChange={setSelectedAccountId}
            />
          </SurfacePanel>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Métricas del diario">
        <MetricCard
          label="Alcance"
          value={formatScope(selectedAccount?.name, accounts.length === 1 ? accounts[0]?.name : undefined)}
          detail="Filtro aplicado al calendario y al panel del día."
          variant="elevated"
        />
        <MetricCard
          label="P&L registrado"
          value={formatUsd(netPnl)}
          detail="Suma de operaciones cerradas cargadas en el diario."
          tone={netPnl < 0 ? 'risk' : 'positive'}
        />
        <MetricCard
          label="Operaciones"
          value={`${tradesForDayPanel.length}`}
          detail={`${openTrades} abiertas · ${closedTrades.length} cerradas`}
          tone={openTrades > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          label="Win rate"
          value={new Intl.NumberFormat('es-AR', {
            style: 'percent',
            maximumFractionDigits: 0,
          }).format(winRate)}
          detail="Calculado sobre operaciones cerradas visibles."
          tone={winRate >= 0.5 ? 'positive' : 'warning'}
        />
      </section>

      <SurfacePanel as="section" variant="elevated" padding="lg" className="motion-reveal">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <span data-portal-kicker className="text-[10px]">
              Calendario operativo
            </span>
            <h2 className="mt-2 font-display text-xl uppercase tracking-wide text-text-primary">
              Lectura mensual y detalle diario
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-text-secondary">
              El calendario conserva el selector de día y el panel de operaciones; el encabezado superior solo agrega contexto para revisar la sesión con criterio profesional.
            </p>
          </div>
          {tradesAll.isLoading || accountsQuery.isFetching ? (
            <span className="text-sm text-text-secondary">Actualizando datos...</span>
          ) : null}
        </div>

        <PnLCalendar
          workspaceId={workspaceId}
          accountId={selectedAccountId}
          tradesForDayPanel={tradesForDayPanel}
        />
      </SurfacePanel>
    </div>
  );
}

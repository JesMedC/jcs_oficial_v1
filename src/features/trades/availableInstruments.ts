/*
 * availableInstruments.ts — Single source of truth for the pairs /
 * instruments the platform supports per market.
 *
 * Right now this is a static, hand-curated list (the portal doesn't
 * expose a server-managed allowlist yet). The structure is shaped so
 * that the day the backend publishes a per-workspace instrument
 * catalog, swapping this module for a query is a one-line change:
 *
 *   - `getAvailableInstruments('FOREX' | 'BINARY')` — the contract the
 *     form + filter UIs consume
 *   - `AVAILABLE_FOREX_INSTRUMENTS` / `AVAILABLE_BINARY_INSTRUMENTS` —
 *     raw lists, keyed by category for the "Activos permitidos"
 *     settings panel
 *   - `INSTRUMENT_CATEGORY_LABEL` — human labels for the categories
 *
 * Until a real allowlist ships, the settings panel just RENDERS this
 * list so the admin knows which pairs the picker will offer.
 */

export type InstrumentCategory =
  | 'Major'
  | 'Minor'
  | 'Exotic'
  | 'Crypto'
  | 'Commodities'
  | 'Indices';

export interface InstrumentInfo {
  /** Pair / symbol exactly as it must be stored on a Trade (e.g. "EURUSD"). */
  readonly symbol: string;
  /** Spanish label for the dashboard / settings panel. */
  readonly name: string;
  readonly category: InstrumentCategory;
  /** Whether the platform actively quotes this pair. Disabled pairs
   *  show in the settings panel as muted but the form still allows
   *  picking them — they fall back to a manual price until quotes
   *  are wired in. */
  readonly enabled: boolean;
}

export const AVAILABLE_FOREX_INSTRUMENTS: ReadonlyArray<InstrumentInfo> = [
  // Major pairs (USD on one side)
  { symbol: 'EURUSD', name: 'Euro / Dolar estadounidense', category: 'Major', enabled: true },
  { symbol: 'GBPUSD', name: 'Libra esterlina / Dolar', category: 'Major', enabled: true },
  { symbol: 'AUDUSD', name: 'Dolar australiano / Dolar', category: 'Major', enabled: true },
  { symbol: 'NZDUSD', name: 'Dolar neozelandes / Dolar', category: 'Major', enabled: true },
  { symbol: 'USDJPY', name: 'Dolar / Yen japones', category: 'Major', enabled: true },
  { symbol: 'USDCAD', name: 'Dolar / Dolar canadiense', category: 'Major', enabled: true },
  { symbol: 'USDCHF', name: 'Dolar / Franco suizo', category: 'Major', enabled: true },
  // Cross pairs
  { symbol: 'EURJPY', name: 'Euro / Yen japones', category: 'Minor', enabled: true },
  { symbol: 'GBPJPY', name: 'Libra / Yen japones', category: 'Minor', enabled: true },
  { symbol: 'EURGBP', name: 'Euro / Libra esterlina', category: 'Minor', enabled: true },
  { symbol: 'AUDJPY', name: 'Dolar australiano / Yen', category: 'Minor', enabled: true },
  { symbol: 'EURCHF', name: 'Euro / Franco suizo', category: 'Minor', enabled: true },
  // Exotic
  { symbol: 'USDTRY', name: 'Dolar / Lira turca', category: 'Exotic', enabled: true },
  { symbol: 'USDZAR', name: 'Dolar / Rand sudafricano', category: 'Exotic', enabled: true },
];

export const AVAILABLE_BINARY_INSTRUMENTS: ReadonlyArray<InstrumentInfo> = [
  // Forex pairs (binary brokers offer these as OTC)
  { symbol: 'EURUSD', name: 'Euro / Dolar', category: 'Major', enabled: true },
  { symbol: 'GBPUSD', name: 'Libra / Dolar', category: 'Major', enabled: true },
  { symbol: 'USDJPY', name: 'Dolar / Yen', category: 'Major', enabled: true },
  { symbol: 'GBPJPY', name: 'Libra / Yen', category: 'Minor', enabled: true },
  { symbol: 'AUDUSD', name: 'Dolar australiano / Dolar', category: 'Major', enabled: true },
  { symbol: 'NZDUSD', name: 'Dolar neozelandes / Dolar', category: 'Major', enabled: true },
  { symbol: 'USDCAD', name: 'Dolar / Dolar canadiense', category: 'Major', enabled: true },
  { symbol: 'USDCHF', name: 'Dolar / Franco suizo', category: 'Major', enabled: true },
  // Crypto
  { symbol: 'BTCUSD', name: 'Bitcoin / Dolar', category: 'Crypto', enabled: true },
  { symbol: 'ETHUSD', name: 'Ethereum / Dolar', category: 'Crypto', enabled: true },
  { symbol: 'SOLUSD', name: 'Solana / Dolar', category: 'Crypto', enabled: true },
  { symbol: 'XRPUSD', name: 'XRP / Dolar', category: 'Crypto', enabled: true },
  // Commodities
  { symbol: 'XAUUSD', name: 'Oro / Dolar', category: 'Commodities', enabled: true },
  { symbol: 'XAGUSD', name: 'Plata / Dolar', category: 'Commodities', enabled: true },
  { symbol: 'OILUSD', name: 'Petroleo WTI / Dolar', category: 'Commodities', enabled: true },
  // Indices
  { symbol: 'SPX500', name: 'S&P 500', category: 'Indices', enabled: true },
  { symbol: 'NAS100', name: 'Nasdaq 100', category: 'Indices', enabled: true },
  { symbol: 'DJI30', name: 'Dow Jones 30', category: 'Indices', enabled: true },
];

export const INSTRUMENT_CATEGORY_LABEL: Record<InstrumentCategory, string> = {
  Major: 'Mayores',
  Minor: 'Cruzados',
  Exotic: 'Exoticos',
  Crypto: 'Criptomonedas',
  Commodities: 'Materias primas',
  Indices: 'Indices',
};

export type MarketKind = 'FOREX' | 'BINARY';

/**
 * Returns the instruments the form picker should offer for the
 * given market. Filters out anything not yet `enabled` so the picker
 * never offers a pair the platform can't quote (manual fallback not
 * implemented yet).
 */
export function getAvailableInstruments(kind: MarketKind): ReadonlyArray<InstrumentInfo> {
  const list = kind === 'FOREX' ? AVAILABLE_FOREX_INSTRUMENTS : AVAILABLE_BINARY_INSTRUMENTS;
  return list.filter((i) => i.enabled);
}

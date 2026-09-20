// tvSymbol — mapping between Dukascopy slash-notation symbols (used by
// the scanner backend) and TradingView widget symbols (the Advanced
// Chart widget reads symbols as ``{EXCHANGE}:{NAME}``).
//
// The scanner backend emits symbols like ``EUR/USD`` (see
// ``backend/app/core/config.py`` — ``scanner_symbol`` default). The
// TradingView widget renders symbols like ``FX:EURUSD``. These two
// conventions must be reconciled at one well-tested boundary so the
// rest of the UI never has to reason about both at once.
//
// The exact exchange prefix (``FX`` for forex pairs) is verified from
// the TradingView widget docs and pinned as a fixture. If TradingView
// ever changes its prefix scheme, this is the single file that
// changes — the fixtures in the test suite will catch the regression.

/** Exchange prefix TradingView uses for forex pairs. */
export const TV_FOREX_EXCHANGE_PREFIX = "FX" as const;

/**
 * Map a Dukascopy slash-notation symbol (``EUR/USD``) to its
 * TradingView widget form (``FX:EURUSD``).
 *
 * Whitespace is trimmed and the upper-cased base/quote pair is
 * concatenated with the ``FX:`` prefix. Unknown characters are passed
 * through verbatim — TradingView's symbol search will surface a
 * "symbol not found" error in the iframe if the pair is not a known
 * forex ticker, which is the right failure mode here.
 *
 * @example
 *   tvSymbolFromDukascopy("EUR/USD"); // "FX:EURUSD"
 *   tvSymbolFromDukascopy("eur/usd"); // "FX:EURUSD"
 */
export function tvSymbolFromDukascopy(dukascopySymbol: string): string {
  const trimmed = dukascopySymbol.trim();
  if (trimmed.length === 0) {
    return `${TV_FOREX_EXCHANGE_PREFIX}:`;
  }
  const compact = trimmed.replace(/[\s/]+/g, "").toUpperCase();
  // If the input already looks like a TradingView symbol (contains a
  // colon), pass it through unchanged — calling this twice must be
  // idempotent and round-trippable.
  if (compact.includes(":")) {
    return compact;
  }
  return `${TV_FOREX_EXCHANGE_PREFIX}:${compact}`;
}

/**
 * Map a TradingView widget symbol back to its Dukascopy slash
 * notation. Used when a user clicks a chart-driven symbol (e.g. the
 * widget's "full-size chart URL" payload) and we want to look the
 * pair up in the scanner pipeline.
 *
 * Unknown prefixes are returned verbatim without the slash so the
 * caller can decide what to do — failing loud here would mask valid
 * crypto / equity symbols that are not Dukascopy forex pairs.
 *
 * @example
 *   dukascopyFromTvSymbol("FX:EURUSD"); // "EUR/USD"
 *   dukascopyFromTvSymbol("BINANCE:BTCUSDT"); // "BINANCE:BTCUSDT"
 */
export function dukascopyFromTvSymbol(tvSymbol: string): string {
  const trimmed = tvSymbol.trim();
  if (trimmed.length === 0) return "";
  const colonIndex = trimmed.indexOf(":");
  if (colonIndex === -1) return trimmed;
  const prefix = trimmed.slice(0, colonIndex);
  const name = trimmed.slice(colonIndex + 1);
  if (prefix.toUpperCase() !== TV_FOREX_EXCHANGE_PREFIX) {
    return trimmed;
  }
  // Strip any slash the input might already carry (round-trips from
  // ``tvSymbolFromDukascopy`` carry ``EUR/USD``-style names into the
  // widget prefix) so we always produce exactly one canonical slash.
  const collapsed = name.replace(/\//g, "").toUpperCase();
  return insertSlashAfterThreeChars(collapsed);
}

/**
 * Insert a ``/`` between the two three-letter currency codes that
 * make up a forex pair (``EURUSD`` → ``EUR/USD``). Falls back to a
 * mid-point split when the name is not exactly six letters.
 */
function insertSlashAfterThreeChars(upperName: string): string {
  if (upperName.length === 6) {
    return `${upperName.slice(0, 3)}/${upperName.slice(3)}`;
  }
  const mid = Math.floor(upperName.length / 2);
  return `${upperName.slice(0, mid)}/${upperName.slice(mid)}`;
}

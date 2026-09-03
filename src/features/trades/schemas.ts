/*
 * portal-fase0a-base — Zod discriminated union for the create-trade
 * form. Mirrors `CreateTradePayload` from `src/features/trades/types.ts`
 * (which itself mirrors backend Pydantic `CreateTradeIn`) so a successful
 * validation is wire-format-correct without further coercion.
 *
 * Because the backend serialises ``Decimal`` as JSON strings, we coerce
 * numeric inputs to ``number`` for validation (positive, bounded) and
 * then transform back to string at submit time via ``.toString()``.
 * The transform layer preserves banker's-round semantics — if the
 * user typed 1.5000 it lands on the wire as "1.5".
 */
import { z } from 'zod';

const Uuid = z.string().uuid({ message: 'account_id debe ser un UUID' });

const DecimalString = (opts: {
  readonly min?: number;
  readonly max?: number;
  readonly maxLen?: number;
  readonly label: string;
}) =>
  z
    .union([z.string(), z.number()])
    .transform((value, ctx) => {
      const n = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${opts.label} invalido` });
        return z.NEVER;
      }
      if (opts.min !== undefined && n < opts.min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${opts.label} debe ser >= ${opts.min}` });
        return z.NEVER;
      }
      if (opts.max !== undefined && n > opts.max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${opts.label} debe ser <= ${opts.max}` });
        return z.NEVER;
      }
      return n.toString();
    });

/**
 * FASE 4A / Ola 6 — EmotionalTag enum mirror.
 *
 * Kept in lockstep with the `EmotionalTag` union in `./types.ts` (which
 * mirrors the backend Pydantic enum). The chip selector in
 * `NewTradeForm` rejects anything outside this set at the form layer
 * before the backend ever sees the payload.
 */
const EmotionalTagSchema = z.enum(['FOMO', 'REVENGE', 'PATIENCE', 'DISCIPLINE', 'OTHER']);

export const ForexFormSchema = z.object({
  account_id: Uuid,
  type: z.literal('FOREX'),
  pair: z.string().min(1, 'Par requerido').max(16),
  direction: z.enum(['LONG', 'SHORT']),
  entry_price: DecimalString({ min: 0.00001, label: 'Precio de entrada' }),
  lot_size: DecimalString({ min: 0.01, max: 100, label: 'Lotaje' }),
  stop_loss: z
    .union([z.literal(''), z.string(), z.number()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : Number(value).toString())),
  take_profit: z
    .union([z.literal(''), z.string(), z.number()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : Number(value).toString())),
  pre_trade_notes: z.string().max(2000).optional(),
  emotional_tags: z.array(EmotionalTagSchema).optional(),
});

export const BinaryFormSchema = z.object({
  account_id: Uuid,
  type: z.literal('BINARY'),
  direction: z.enum(['CALL', 'PUT']),
  investment_usd: DecimalString({ min: 1, max: 10000, label: 'Inversion USD' }),
  payout_pct: DecimalString({ min: 70, max: 1000, label: 'Payout %' }),
  expiration_seconds: z
    .union([z.string(), z.number()])
    .transform((value) => Number(value))
    .pipe(
      z
        .number()
        .int()
        .positive()
        .max(86400, 'Expiracion maxima 24h'),
    ),
  pre_trade_notes: z.string().max(2000).optional(),
  emotional_tags: z.array(EmotionalTagSchema).optional(),
});

export const TradeFormSchema = z.discriminatedUnion('type', [
  ForexFormSchema,
  BinaryFormSchema,
]);

export type ForexFormValues = z.infer<typeof ForexFormSchema>;
export type BinaryFormValues = z.infer<typeof BinaryFormSchema>;
export type TradeFormValues = z.infer<typeof TradeFormSchema>;

/*
 * portal-fase0a-base / FASE 4A — Close-trade form schemas.
 *
 * Discriminated by `type` so the UI can branch on it (FOREX vs BINARY).
 * The `type` literal here is **internal to the form** — it is used by
 * the Zod schema to validate the right field shape and by the React
 * component to pick the right branch. It is NOT part of the wire
 * payload: `CloseTradePayload` in `types.ts` (which mirrors backend
 * Pydantic `TradeCloseIn`) omits `type` because the backend already
 * knows the trade's type from the loaded row and `TradeCloseIn` has
 * `model_config=extra="forbid"`. `CloseTradeModal.onSubmit` destructures
 * `type` out before forwarding to `closeTradeApi`.
 *
 * FOREX branch carries `exit_price`, BINARY branch carries
 * `outcome: 'WIN'|'LOSS'` (no BREAK — the backend computes
 * CLOSED_BREAK server-side from the payout when relevant, so the wire
 * format only exposes the two outcomes the user actually decides on).
 *
 * The journal triple (`post_trade_notes`, `followed_plan`,
 * `mistakes`) is optional on both branches and round-trips through
 * the backend unchanged.
 */
export const CloseForexPayloadSchema = z.object({
  type: z.literal('FOREX'),
  exit_price: z
    .union([z.string(), z.number()])
    .transform((value, ctx) => {
      const n = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(n) || n <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Precio de salida invalido' });
        return z.NEVER;
      }
      return n.toString();
    }),
  post_trade_notes: z.string().max(2000).optional(),
  followed_plan: z.boolean().optional(),
  mistakes: z.string().max(2000).optional(),
});

export const CloseBinaryPayloadSchema = z.object({
  type: z.literal('BINARY'),
  outcome: z.enum(['WIN', 'LOSS']),
  post_trade_notes: z.string().max(2000).optional(),
  followed_plan: z.boolean().optional(),
  mistakes: z.string().max(2000).optional(),
});

export const CloseTradeFormSchema = z.discriminatedUnion('type', [
  CloseForexPayloadSchema,
  CloseBinaryPayloadSchema,
]);

export type CloseForexFormValues = z.infer<typeof CloseForexPayloadSchema>;
export type CloseBinaryFormValues = z.infer<typeof CloseBinaryPayloadSchema>;
export type CloseTradeFormInput = z.infer<typeof CloseTradeFormSchema>;

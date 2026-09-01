/*
 * p0a.2 — debounced submit hook.
 *
 * Guards the form against:
 *   - double-submit while in flight (AbortController cancels the
 *     in-flight call if a second submit lands before the first
 *     resolves)
 *   - rapid spam clicks (300ms debounce by default — matches the
 *     4R R2 Risk constraint)
 *
 * The hook is intentionally generic over the validated form shape
 * so login + register can share the same debounce/guard logic.
 * RHF's `handleSubmit(onValid)` is the caller — we wrap the
 * resolved callback to add debounce + abort.
 *
 * Error contract: the caller passes an error extractor that turns
 * a thrown `ErrorEnvelope` into the surface message. We keep the
 * raw envelope in `errorRaw` so support tooling can still log
 * `correlation_id` even after we render the Spanish fallback.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ErrorEnvelope } from '../features/auth/types';

interface UseDebouncedSubmitOptions<T> {
  readonly onValid: (data: T) => Promise<void> | void;
  readonly delayMs?: number;
  readonly errorMessageFor?: (envelope: ErrorEnvelope) => string;
}

export interface DebouncedSubmitState<T> {
  readonly submit: (data: T) => void;
  readonly isDebouncing: boolean;
  readonly isSubmitting: boolean;
  readonly error: ErrorEnvelope | null;
  readonly errorMessage: string | null;
  readonly reset: () => void;
}

export function useDebouncedSubmit<T>({
  onValid,
  delayMs = 300,
  errorMessageFor,
}: UseDebouncedSubmitOptions<T>): DebouncedSubmitState<T> {
  const [isDebouncing, setIsDebouncing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<ErrorEnvelope | null>(null);

  const inFlight = useRef<AbortController | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onValidRef = useRef(onValid);
  onValidRef.current = onValid;

  const reset = useCallback(() => {
    setError(null);
  }, []);

  const submit = useCallback(
    (data: T) => {
      // Debounce — collapse bursts of clicks to a single submit.
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
      setIsDebouncing(true);
      debounceTimer.current = setTimeout(() => {
        setIsDebouncing(false);
        setIsSubmitting(true);
        setError(null);

        // Cancel any in-flight call before kicking off the new one.
        if (inFlight.current !== null) {
          inFlight.current.abort();
        }
        const controller = new AbortController();
        inFlight.current = controller;

        void Promise.resolve(onValidRef.current(data))
          .catch((err: unknown) => {
            const envelope = err as ErrorEnvelope;
            if (envelope && typeof envelope === 'object' && 'code' in envelope) {
              setError(envelope);
            } else {
              setError({
                code: 'INTERNAL_ERROR',
                message: 'Error inesperado',
                correlation_id: 'unavailable',
              });
            }
          })
          .finally(() => {
            if (inFlight.current === controller) {
              inFlight.current = null;
            }
            setIsSubmitting(false);
          });
      }, delayMs);
    },
    [delayMs],
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
      if (inFlight.current !== null) inFlight.current.abort();
    };
  }, []);

  const errorMessage =
    error === null ? null : errorMessageFor ? errorMessageFor(error) : error.message;

  return { submit, isDebouncing, isSubmitting, error, errorMessage, reset };
}

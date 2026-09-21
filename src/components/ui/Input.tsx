/*
 * design-system-v1 — Input primitive (Wave 4a, T4a.2).
 *
 * Foundational text input. Wraps the underlying `<input>` in a
 * `<div>` that owns the label / hint / error chrome so each control
 * shares the same field semantics.
 *
 * Composition (per `design.md` §4.2):
 *   - input:  `bg-input border border-primary/30 rounded-lg px-3
 *     py-2 text-text-primary font-body w-full transition-shadow
 *     focus:border-primary focus:shadow-[0_0_5px_rgba(0,255,157,0.5)]
 *     focus:outline-none`
 *   - error:  `border-loss focus:border-loss
 *     focus:shadow-[0_0_5px_rgba(255,42,85,0.5)]`
 *   - disabled: `opacity-50 cursor-not-allowed`
 *   - label:  `text-text-secondary text-xs uppercase tracking-wide
 *     font-display mb-1`
 *   - hint:   `text-text-muted text-xs mt-1`
 *   - error message:  `text-loss text-xs mt-1`
 *
 * Accessibility:
 *   - `htmlFor` ↔ `id` association (id auto-generated via React's
 *     `useId()` when caller omits it)
 *   - `aria-invalid` mirrors `error !== undefined`
 *   - `aria-describedby` targets `${id}-error` when error present,
 *     otherwise `${id}-hint` when hint present
 *
 * `forwardRef<HTMLInputElement>` so React Hook Form's
 * `register('fieldName')` (which spreads a `ref` onto the control)
 * can target the underlying element directly.
 */
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
} from 'react';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'> {
  readonly label?: string;
  readonly hint?: string;
  readonly error?: string;
  readonly inputClassName?: string;
}

const BASE_INPUT_CLASSES =
  'w-full bg-input border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body transition-shadow focus:outline-none focus:border-primary focus:shadow-[0_0_5px_rgba(0,255,157,0.5)]';

const ERROR_INPUT_CLASSES =
  'border-loss focus:border-loss focus:shadow-[0_0_5px_rgba(255,42,85,0.5)]';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  props,
  ref,
) {
  const {
    id,
    label,
    hint,
    error,
    disabled,
    inputClassName,
    ...rest
  } = props;

  const reactId = useId();
  const fieldId = id ?? `input-${reactId}`;
  const hasError = error !== undefined && error !== '';

  const describedBy = hasError
    ? `${fieldId}-error`
    : hint !== undefined && hint !== ''
      ? `${fieldId}-hint`
      : undefined;

  const inputClasses = [
    BASE_INPUT_CLASSES,
    hasError ? ERROR_INPUT_CLASSES : null,
    disabled ? 'opacity-50 cursor-not-allowed' : null,
    inputClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col">
      {label !== undefined && label !== '' ? (
        <label
          htmlFor={fieldId}
          className="text-text-secondary text-xs uppercase tracking-wide font-display mb-1"
        >
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={fieldId}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        data-testid={`input-${fieldId}`}
        className={inputClasses}
        {...rest}
      />
      {hasError ? (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="text-loss text-xs mt-1"
        >
          {error}
        </p>
      ) : hint !== undefined && hint !== '' ? (
        <p id={`${fieldId}-hint`} className="text-text-muted text-xs mt-1">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
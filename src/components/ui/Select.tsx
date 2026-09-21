/*
 * design-system-v1 — Select primitive (Wave 4a, T4a.3).
 *
 * Foundational native-<select> primitive. Wraps the underlying
 * `<select>` in a `<div>` that owns label / hint / error chrome
 * (same FieldShell pattern as Input) plus a chevron affordance so
 * the visual signal matches the rest of the design system without
 * sacrificing native keyboard / mobile picker behaviour.
 *
 * Composition (per `design.md` §4.3):
 *   - select: identical to Input (bg-input + border-primary/30 +
 *     rounded-lg + px-3 py-2 + text-text-primary + font-body +
 *     focus:border-primary + focus:shadow jade + outline-none)
 *   - chevron: inline <svg aria-hidden="true"> with stroke-current
 *     text-primary, sits to the right of the select inside the
 *     wrapper
 *   - error:  `border-loss focus:border-loss
 *     focus:shadow-[0_0_5px_rgba(255,42,85,0.5)]`
 *   - disabled: `opacity-50 cursor-not-allowed`
 *
 * Accessibility:
 *   - label / hint / error wiring identical to Input
 *   - chevron is aria-hidden — it is decorative, not interactive
 *   - native <select> retains its platform keyboard semantics
 *     (Tab focus, arrow keys to traverse, Enter to commit)
 *
 * `forwardRef<HTMLSelectElement>` so React Hook Form's
 * `register('fieldName')` can target the select element.
 */
import {
  forwardRef,
  useId,
  type SelectHTMLAttributes,
} from 'react';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'size'> {
  readonly label?: string;
  readonly hint?: string;
  readonly error?: string;
  readonly options: ReadonlyArray<SelectOption>;
  readonly inputClassName?: string;
}

const BASE_SELECT_CLASSES =
  'w-full appearance-none bg-input border border-primary/30 rounded-lg px-3 py-2 pr-9 text-text-primary font-body transition-shadow focus:outline-none focus:border-primary focus:shadow-[0_0_5px_rgba(0,255,157,0.5)]';

const ERROR_SELECT_CLASSES =
  'border-loss focus:border-loss focus:shadow-[0_0_5px_rgba(255,42,85,0.5)]';

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  props,
  ref,
) {
  const {
    id,
    label,
    hint,
    error,
    options,
    disabled,
    inputClassName,
    ...rest
  } = props;

  const reactId = useId();
  const fieldId = id ?? `select-${reactId}`;
  const hasError = error !== undefined && error !== '';

  const describedBy = hasError
    ? `${fieldId}-error`
    : hint !== undefined && hint !== ''
      ? `${fieldId}-hint`
      : undefined;

  const selectClasses = [
    BASE_SELECT_CLASSES,
    hasError ? ERROR_SELECT_CLASSES : null,
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
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          data-testid={`select-${fieldId}`}
          className={selectClasses}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <Chevron />
      </div>
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

/**
 * Decorative chevron rendered absolutely-positioned to the right of
 * the native <select>. We cannot style the native dropdown arrow
 * consistently across browsers, so a chevron SVG sits over the
 * select's right edge. `aria-hidden` keeps it out of the
 * accessibility tree; the visual signal is purely decorative.
 */
function Chevron(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      data-testid="select-chevron"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary"
    >
      <polyline points="5 8 10 13 15 8" />
    </svg>
  );
}
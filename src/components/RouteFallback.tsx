interface RouteFallbackProps {
  readonly label?: string;
}

export function RouteFallback({ label = 'Cargando' }: RouteFallbackProps) {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-status-dot-pulse" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

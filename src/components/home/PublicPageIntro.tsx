interface PublicPageIntroProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description: string;
}

export function PublicPageIntro({
  eyebrow,
  title,
  description,
}: PublicPageIntroProps): JSX.Element {
  return (
    <section
      data-public-page-intro
      data-testid="public-page-intro"
      className="relative mx-auto max-w-7xl overflow-hidden px-4 py-16 text-center md:px-8 md:py-24"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="motion-reveal absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-[var(--color-brand-primary)]/10 blur-3xl" />
      </div>
      {eyebrow ? (
        <span className="motion-reveal font-display text-xs uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="motion-reveal mt-3 font-display text-3xl uppercase leading-tight tracking-wide text-[var(--color-text-primary)] md:text-5xl">
        {title}
      </h1>
      <p className="motion-reveal mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] md:text-lg">
        {description}
      </p>
    </section>
  );
}

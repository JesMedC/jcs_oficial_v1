import { GlassCard } from '../GlassCard';

/*
 * p1c — Feature card.
 *
 * GlassCard wrapper with cyan SVG icon, H3 Inter 600, P Inter
 * text-secondary. Used both in the Home features grid and the
 * Features page top section.
 */
interface FeatureCardProps {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <GlassCard variant="interactive" className="h-full">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#00FFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
        aria-hidden="true"
      >
        <path d={icon} />
      </svg>
      <h3 className="font-body font-semibold text-text-primary text-lg md:text-xl mt-4">{title}</h3>
      <p className="text-text-secondary font-body text-sm md:text-base mt-2 leading-relaxed">
        {description}
      </p>
    </GlassCard>
  );
}

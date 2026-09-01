import { Helmet } from 'react-helmet-async';
import { JsonLd, type JsonLdNode } from './JsonLd';

/*
 * Inline SEO defaults — extracted to `src/lib/seo/defaults.ts` in p1f.
 * Kept here in p1b so the SeoHead contract is self-contained.
 */
const SITE_NAME = 'JadeCapitalSuite';
const TITLE_TEMPLATE = '%s · ' + SITE_NAME;
const DEFAULT_DESCRIPTION =
  'JadeCapitalSuite es el sistema operativo del trader: centralizá cuentas, operaciones, riesgo, journal y estrategia en una sola plataforma.';
const CANONICAL_BASE = 'https://jadecapitalsuite.com';
const DEFAULT_OG_IMAGE = CANONICAL_BASE + '/og.png';

interface SeoHeadProps {
  readonly title: string;
  readonly description?: string;
  readonly image?: string;
  readonly canonicalPath?: string;
  readonly type?: 'website' | 'article';
  readonly jsonLd?: JsonLdNode | readonly JsonLdNode[];
  readonly noindex?: boolean;
}

export function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_OG_IMAGE,
  canonicalPath,
  type = 'website',
  jsonLd,
  noindex = false,
}: SeoHeadProps) {
  const fullTitle = TITLE_TEMPLATE.replace('%s', title);
  const canonicalUrl =
    canonicalPath === undefined
      ? undefined
      : CANONICAL_BASE + (canonicalPath.startsWith('/') ? canonicalPath : '/' + canonicalPath);

  return (
    <>
      <Helmet>
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
        {canonicalUrl !== undefined ? <link rel="canonical" href={canonicalUrl} /> : null}

        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="es_ES" />
        <meta property="og:type" content={type} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        {canonicalUrl !== undefined ? <meta property="og:url" content={canonicalUrl} /> : null}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
      </Helmet>
      {jsonLd !== undefined ? <JsonLd data={jsonLd} /> : null}
    </>
  );
}

interface JsonLdNode {
  readonly [key: string]: unknown;
}

interface JsonLdProps {
  readonly data: JsonLdNode | readonly JsonLdNode[];
}

export function JsonLd({ data }: JsonLdProps) {
  const nodes = Array.isArray(data) ? data : [data];
  return (
    <>
      {nodes.map((node, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}
    </>
  );
}

export type { JsonLdNode };

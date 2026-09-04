/** JSON-LD injector (server components only). Escapes `<` to kill the XSS vector. */
export function JsonLd({ data }: { data: unknown }) {
  const safe = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safe }} />;
}

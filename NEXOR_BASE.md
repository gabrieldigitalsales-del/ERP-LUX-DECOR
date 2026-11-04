# Base NEXOR aplicada

Estrutura mínima aplicada ao projeto:

- `robots.txt`
- `sitemap.xml`
- `site.webmanifest`
- favicon / ícone de aplicação
- metatags principais e Open Graph
- `noindex,nofollow` por se tratar de ERP interno
- rewrite SPA para Vercel
- headers básicos de segurança
- `.gitignore`
- `.env.example`
- responsividade e viewport mobile
- fallback `<noscript>`

## Importante
O ERP está configurado para **não ser indexado por buscadores**. Quando houver uma área pública real da Home Interiores, SEO e sitemap público devem ser configurados separadamente.

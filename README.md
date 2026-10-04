# Pristine Custom Wheels & Trailer Parts

Website for Pristine Custom: scroll-driven showroom film, 15-category parts catalog with part # lookup and cart,
quote requests, contact form, request tracking, and a small admin page.

Stack: TanStack Start (React 19, SSR) + Nitro, deployed on Vercel. Data in Supabase.

## Environment variables (Vercel > Project > Settings > Environment Variables)

| Name | What |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase secret (service role) key. Server-only. |
| `ADMIN_KEY` | Password for `/admin` |

## Database

Supabase project `pristine-custom`. Schema in `supabase/migrations/`. Product photos live in the public Storage bucket `pristine-products`. Visit `/healthz` to check the database settings.

## Local development

```bash
npm install
cp .env.example .env   # fill in values
npm run dev
```

## Editing content

- Catalog, prices and part numbers: `src/lib/catalog.ts`
- Scroll film chapters: `src/scroll-scrub-scenes.ts` (clips in `public/assets/world/`)
- Styles: `src/components/site/site.css`
- Page metadata: `src/app-meta.json`

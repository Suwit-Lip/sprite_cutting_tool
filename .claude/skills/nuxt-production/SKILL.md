---
name: nuxt-production
description: Nuxt 4 production optimization — hydration, performance, testing with Vitest, deployment to Cloudflare/Vercel/Netlify, and v3→v4 migration. Use when debugging hydration mismatches, optimizing Core Web Vitals, writing tests, deploying, or migrating.
---

# Nuxt 4 Production

## Hydration
- A hydration mismatch means SSR output ≠ client first render. Common causes: `Date.now()`/`Math.random()` in setup, `window`/`document` access without guards, conditional rendering on `process.client`, locale-dependent formatting.
- Wrap client-only UI in `<ClientOnly>`; provide a `#fallback` slot to avoid layout shift.
- Use `import.meta.client` / `import.meta.server` guards inside composables.
- For genuinely client-only state, defer with `onMounted` rather than running it in setup.

## Performance
- Lazy-load heavy components with `defineAsyncComponent` or the `Lazy` prefix (`<LazyHeavyChart />`).
- Lazy hydration: `<LazyHeavyChart hydrate-on-visible />` (Nuxt 4 supports `hydrate-on-visible`, `hydrate-on-idle`, `hydrate-on-interaction`).
- Use `<NuxtImg>` / `<NuxtPicture>` from `@nuxt/image` — automatic format, sizing, lazy loading.
- Prefer `useFetch` cache keys over refetching; `getCachedData` for cross-route reuse.
- Audit with `nuxi analyze` to inspect bundle composition.

## Testing
- `@nuxt/test-utils` + Vitest. `await setup({ ... })` boots a real Nuxt instance for E2E-style tests.
- Component tests: `mountSuspended(Component)` (handles `<Suspense>` and async setup).
- Mock composables with `mockNuxtImport('useFoo', () => ...)`.

## Deployment
- Cloudflare: `nitro.preset: 'cloudflare-pages'` or `'cloudflare-module'`. Beware Node-only APIs.
- Vercel: zero config; `nitro.preset: 'vercel'` only if overriding.
- Netlify: `nitro.preset: 'netlify'` for SSR, `'netlify-static'` for prerendered.
- Static: `nuxi generate` → outputs `.output/public`.
- Set `NITRO_PRESET` env var to override at build time without editing config.

## Nuxt 3 → 4 migration
- Move source into `app/` (or set `srcDir: 'app/'` — already the v4 default).
- Singleton data fetching: `useAsyncData` keys are now strictly required for dynamic URLs.
- `definePageMeta` is compile-time only — no dynamic values.
- Run `npx codemod@latest nuxt/4/migration-recipe` for automated rewrites.

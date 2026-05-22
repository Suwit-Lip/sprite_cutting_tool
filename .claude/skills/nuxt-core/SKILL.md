---
name: nuxt-core
description: Nuxt 4 core framework fundamentals — project setup, configuration, routing, SEO, error handling, and directory structure. Use when creating new Nuxt 4 projects, configuring nuxt.config.ts, setting up routing/middleware, implementing SEO with useHead/useSeoMeta, or handling errors.
---

# Nuxt 4 Core

## Project structure (Nuxt 4)
- App code lives under `app/` (not the repo root like Nuxt 3): `app/pages/`, `app/components/`, `app/composables/`, `app/layouts/`, `app/middleware/`, `app/plugins/`.
- `server/` (sibling of `app/`) holds Nitro routes: `server/api/`, `server/routes/`, `server/middleware/`.
- `public/` is served at the site root verbatim. `assets/` is processed by the bundler.
- `nuxt.config.ts` at the repo root.

## Routing
- File-based: `app/pages/users/[id].vue` → `/users/:id`. Use `[...slug].vue` for catch-all.
- `definePageMeta({ middleware: 'auth', layout: 'admin' })` inside `<script setup>` configures the page.
- Navigate programmatically with `navigateTo('/path')` (await it in middleware). Use `<NuxtLink>` for in-app links — never raw `<a>` for internal routes.

## Data fetching
- `useFetch(url)` for SSR-friendly fetch with caching. `useAsyncData(key, fn)` for arbitrary async data.
- Always provide a stable `key` when the URL is dynamic so SSR ↔ client hydration matches.
- `$fetch` is the imperative form — use it inside event handlers, not setup.

## SEO
- `useSeoMeta({ title, description, ogImage, ... })` is the typed, ergonomic API. Prefer it over raw `useHead` for meta tags.
- `useHead({ link: [...], script: [...] })` for `<link>` and `<script>` injection.

## Error handling
- `app/error.vue` (sibling of `app.vue`) renders for top-level errors. Receives an `error` prop.
- `<NuxtErrorBoundary>` for inline boundaries inside a page — exposes `#error` slot and `clearError`.
- `throw createError({ statusCode: 404, message: 'Not found', fatal: true })` from server or page setup.

## Configuration
- `runtimeConfig.public.*` is exposed to the client; everything else stays server-side. Read with `useRuntimeConfig()`.
- Override via env vars: `NUXT_PUBLIC_FOO_BAR` → `runtimeConfig.public.fooBar`.

---
name: vue-best-practices
description: Vue 3 Composition API best practices — script setup, reactivity, composables, props/emits, performance, and component design. Use when writing or reviewing Vue 3 single-file components.
---

# Vue 3 Best Practices

## Script setup
- Default to `<script setup lang="ts">`. It's the most concise and best-typed form.
- Don't mix Options API and Composition API in the same component.

## Reactivity
- `ref()` for primitives and single values; `reactive()` for objects you'll mutate in place. Pick one per piece of state — don't wrap a `reactive` in a `ref`.
- Destructuring a `reactive` loses reactivity. Use `toRefs()` or keep the proxy.
- `computed()` for derived state — never duplicate state you can compute.
- `watch(source, cb)` for explicit reactions; `watchEffect()` when you want auto-tracked deps. Prefer `watch` — it's clearer about what triggers what.
- Don't `watch` what `computed` can express.

## Props and emits
- Always declare prop types: `defineProps<{ id: string; count?: number }>()`.
- Default values via `withDefaults(defineProps<...>(), { count: 0 })`.
- Declare emits with payload types: `defineEmits<{ update: [value: string] }>()`.
- Props are read-only. To "update" a prop, emit an event and let the parent change it. For two-way binding use `defineModel()`.

## Composables
- Extract reusable stateful logic into `useXxx()` composables under `composables/`.
- A composable returns refs/computeds/functions — never raw mutable state.
- Composables can call other composables. Side effects (`onMounted`, `watch`) inside a composable attach to the calling component's lifecycle.

## Components
- One component per file. PascalCase filename matches the component name: `UserCard.vue`.
- Keep `<template>` declarative. Move logic into computeds or composables, not inline expressions.
- `v-for` always needs `:key`. Never use index as key when the list reorders.
- Don't use `v-if` and `v-for` on the same element — wrap or precompute.

## Performance
- `shallowRef` / `shallowReactive` for large immutable-ish data (big lists, third-party instances).
- `v-once` for static subtrees rendered many times. `v-memo` for expensive lists with stable keys.
- `defineAsyncComponent` for route-level or modal-level code splitting.
- Avoid creating new objects/functions in template props — they bust child memoization.

## TypeScript
- Type props, emits, slots, and component refs (`ref<HTMLInputElement | null>(null)`).
- `defineExpose({ ... })` to surface a typed imperative API to parent refs.

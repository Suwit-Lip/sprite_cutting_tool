<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { WorkspaceMode } from '@/types'

const route = useRoute()
const mode = computed<WorkspaceMode>(() => (route.params.mode as WorkspaceMode) || 'cut')
</script>

<template>
  <section class="p-6">
    <h1 class="mb-4 text-base font-medium">Workspace · {{ mode }}</h1>
    <p class="text-[13px] text-text-muted">
      Phase 1 lands the Cut mode (preview canvas + SVG overlay + live slider).
      Phase 2 adds Prompt, Phase 3 adds Tileset.
    </p>
  </section>
</template>

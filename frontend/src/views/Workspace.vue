<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CutMode from '@/components/workspace/CutMode.vue'
import PromptMode from '@/components/workspace/PromptMode.vue'
import TilesetMode from '@/components/workspace/TilesetMode.vue'
import type { WorkspaceMode } from '@/types'

const route = useRoute()
const mode = computed<WorkspaceMode>(() => (route.params.mode as WorkspaceMode) || 'cut')
const image = computed(() => (route.query.image as string) || '')
</script>

<template>
  <div class="h-full min-h-0">
    <CutMode v-if="mode === 'cut'" :image="image" />
    <PromptMode v-else-if="mode === 'prompt'" :image="image" />
    <TilesetMode v-else-if="mode === 'tileset'" :image="image" />
  </div>
</template>

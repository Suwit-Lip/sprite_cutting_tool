<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppTopBar from './AppTopBar.vue'
</script>

<template>
  <div class="grid h-screen" style="grid-template-columns: var(--side-w) 1fr">
    <AppSidebar />
    <div class="flex min-h-0 flex-col">
      <AppTopBar />
      <main class="min-h-0 flex-1 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

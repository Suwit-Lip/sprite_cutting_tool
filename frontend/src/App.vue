<script setup lang="ts">
import AppShell from '@/components/shell/AppShell.vue'
import ToastContainer from '@/components/shell/ToastContainer.vue'
import { useTheme } from '@/composables/useTheme'

useTheme()
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
  <ToastContainer />
</template>

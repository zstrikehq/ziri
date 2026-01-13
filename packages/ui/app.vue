<script setup lang="ts">
import { useConfigStore } from '~/stores/config'
import { useAdminAuthStore } from '~/stores/admin-auth'

console.log('[APP.VUE] App.vue setup running, client:', import.meta.client)

const configStore = useConfigStore()
const adminAuthStore = useAdminAuthStore()

console.log('[APP.VUE] Config store initial state:', {
    projectId: configStore.projectId,
    isConfigured: configStore.isConfigured
})

// Load auth and config immediately on client side (before pages mount)
if (import.meta.client) {
  console.log('[APP.VUE] Loading auth and config from storage...')
  adminAuthStore.loadFromStorage()
  configStore.loadFromStorage()
  console.log('[APP.VUE] After load - Auth:', adminAuthStore.isAuthenticated, 'Config:', configStore.isConfigured)
}

onMounted(() => {
  console.log('[APP.VUE] onMounted - Auth:', adminAuthStore.isAuthenticated, 'Config:', {
    projectId: configStore.projectId,
    isConfigured: configStore.isConfigured
  })
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

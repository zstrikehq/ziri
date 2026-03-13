<script setup lang="ts">
import { useAdminAuth } from '~/composables/useAdminAuth'
import { useUserAuth } from '~/composables/useUserAuth'
import { useAdminAuthStore } from '~/stores/admin-auth'
import { useUserAuthStore } from '~/stores/user-auth'
import { useNavigation } from '~/composables/useNavigation'
import ziriLogo from '~/assets/logo/ziri.png'

const route = useRoute()
const adminAuth = useAdminAuth()
const userAuth = useUserAuth()

const handleLogout = async () => {
 
  if (adminAuth.isAuthenticated.value) {
    await adminAuth.logout()
  }
  if (userAuth.isAuthenticated.value) {
    await userAuth.logout()
  }
}

 
const adminAuthStore = useAdminAuthStore()
const userAuthStore = useUserAuthStore()

 
 

const userRole = computed(() => {
  return userAuthStore.user?.role || adminAuthStore.user?.role || null
})

const isAdmin = computed(() => userRole.value === 'admin')
const isDashboardUser = computed(() => userRole.value && userRole.value !== 'user')


const { dashboardItem, getNavSections, getIcon, isActive } = useNavigation()

const navSections = computed(() => getNavSections(isDashboardUser.value))

 
const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/config': 'Configuration',
    '/analytics': 'Analytics',
    '/logs': 'Logs',
    '/schema': 'Schema',
    '/rules': 'Policies',
    '/policies': 'Policies',
    '/users': 'Users',
    '/keys': 'API Keys',
    '/providers': 'LLM Providers',
    '/me': 'My Profile',
    '/settings/manage-users': 'Manage Users',
    '/settings/internal-audit': 'Internal Logs'
  }
  
 
  if (route.path.startsWith('/keys/') && route.params.id) {
    return `Key: ${route.params.id}`
  }
  
  
 
  if (route.path === '/providers') {
    return 'LLM Providers'
  }
  
  return titles[route.path] || 'LLM Gateway'
})
</script>

<template>
  <div class="flex h-screen bg-[rgb(var(--surface-elevated))] bg-texture">
    <!-- Desktop Sidebar - Wrap in ClientOnly to prevent SSR/hydration mismatch -->
    <ClientOnly>
      <LayoutSidebar />
      <template #fallback>
        <!-- Loading skeleton for sidebar during SSR -->
        <aside class="hidden md:flex flex-shrink-0 flex-col border-r-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))] w-64 h-screen">
          <div class="h-14 px-4 py-2 border-b-2 border-[rgb(var(--border))] flex items-center">
            <div class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
          </div>
          <nav class="flex-1 p-4 space-y-4 overflow-y-auto">
            <div class="space-y-2">
              <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </nav>
        </aside>
      </template>
    </ClientOnly>
    
    <!-- Mobile Sidebar (always collapsed) - Wrap in ClientOnly -->
    <ClientOnly>
      <aside 
        class="md:hidden flex-shrink-0 flex flex-col border-r-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))] w-16 h-screen"
      >
        <div class="h-14 px-2 py-2 border-b-2 border-[rgb(var(--border))] flex items-center justify-center">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-lime-500 to-lime-600 dark:from-lime-300 dark:to-lime-400 p-1.5 flex items-center justify-center shadow-md shadow-lime-500/25 dark:shadow-lime-400/20 ring-1 ring-lime-500/20 dark:ring-lime-300/20">
            <img 
              :src="ziriLogo" 
              alt="Ziri Logo" 
              class="w-full h-full object-contain invert brightness-0 contrast-200"
            />
          </div>
        </div>
        <nav class="flex-1 p-2 space-y-4 overflow-y-auto flex flex-col">
          <!-- Dashboard (independent, always at top) - Dashboard users only -->
          <div v-if="isDashboardUser" class="mb-2">
            <NuxtLink
              :to="dashboardItem.path"
              class="nav-item justify-center"
              :class="{ 'active': isActive(dashboardItem.path) }"
              :title="dashboardItem.name"
            >
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getIcon(dashboardItem.icon)" />
              </svg>
            </NuxtLink>
          </div>

          <!-- Separator -->
          <div v-if="isDashboardUser && navSections.length > 0" class="h-px bg-[rgb(var(--border))] mx-2" />

          <!-- Sections -->
          <div class="flex-1 space-y-4">
            <div v-for="section in navSections" :key="section.title" v-show="!section.adminOnly || isAdmin" class="space-y-1">
              <NuxtLink
                v-for="item in section.items"
                :key="item.path"
                v-show="!(item.requiresAdmin && userRole !== 'admin')"
                :to="item.path"
                class="nav-item justify-center"
                :class="{ 'active': isActive(item.path) }"
                :title="item.name"
              >
                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getIcon(item.icon)" />
                </svg>
              </NuxtLink>
            </div>
          </div>
        </nav>
      </aside>
      <template #fallback>
        <!-- Loading skeleton for mobile sidebar during SSR -->
        <aside class="md:hidden flex-shrink-0 flex flex-col border-r-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))] w-16 h-screen">
          <div class="h-14 px-2 py-2 border-b-2 border-[rgb(var(--border))] flex items-center justify-center">
            <div class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
          </div>
          <nav class="flex-1 p-2 space-y-4">
            <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </nav>
        </aside>
      </template>
    </ClientOnly>
    
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="h-14 flex-shrink-0 border-b-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))] flex items-center justify-between px-4 md:px-6">
        <div class="flex items-center gap-3">
          <h1 class="text-lg font-bold text-[rgb(var(--text))]">
            {{ pageTitle }}
          </h1>
        </div>
        
        <div class="flex items-center gap-2">
          <slot name="actions" />
          <UiButton
            variant="ghost"
            size="sm"
            @click="handleLogout"
            title="Logout"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </UiButton>
          <LayoutThemeToggle />
        </div>
      </header>
      
      <!-- Main Content -->
      <main class="flex-1 overflow-auto p-4 md:p-6">
        <slot />
      </main>
    </div>
    
    <UiToast />
  </div>
</template>

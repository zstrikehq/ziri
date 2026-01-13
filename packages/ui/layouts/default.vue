<script setup lang="ts">
const route = useRoute()

// Dashboard (independent, always at top)
const dashboardItem = { name: 'Dashboard', path: '/', icon: 'dashboard' }

// Navigation sections (same as Sidebar)
const navSections = [
  {
    title: 'Analytics & Monitoring',
    icon: 'chart',
    items: [
      { name: 'Analytics', path: '/analytics', icon: 'analytics' },
      { name: 'Logs', path: '/logs', icon: 'logs' }
    ]
  },
  {
    title: 'Authorization',
    icon: 'lock',
    items: [
      { name: 'Schema', path: '/schema', icon: 'schema' },
      { name: 'Rules', path: '/rules', icon: 'rules' }
    ]
  },
  {
    title: 'Access Management',
    icon: 'key',
    items: [
      { name: 'Users', path: '/users', icon: 'users' },
      { name: 'API Keys', path: '/keys', icon: 'keys' }
    ]
  },
  {
    title: 'LLM Providers',
    icon: 'providers',
    items: [
      { name: 'Providers', path: '/providers', icon: 'providers' }
    ]
  },
  {
    title: 'Settings',
    icon: 'settings',
    items: [
      { name: 'Configuration', path: '/config', icon: 'config' }
    ]
  }
]

// Icon helper (same as Sidebar)
const getIcon = (iconName: string) => {
  const icons: Record<string, string> = {
    dashboard: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    analytics: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    logs: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    schema: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    rules: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    keys: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    users: 'M12 4.354a4 4 0 100 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    providers: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
    settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    config: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    key: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
  }
  return icons[iconName] || icons.dashboard
}

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// Get page title from route
const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/config': 'Configuration',
    '/analytics': 'Analytics',
    '/logs': 'Logs',
    '/schema': 'Schema',
    '/rules': 'Rules',
    '/users': 'Users',
    '/keys': 'API Keys',
    '/providers': 'LLM Providers'
  }
  
  // Check for key detail page
  if (route.path.startsWith('/keys/') && route.params.id) {
    return `Key: ${route.params.id}`
  }
  
  // Check for providers page
  if (route.path === '/providers') {
    return 'LLM Providers'
  }
  
  return titles[route.path] || 'LLM Gateway'
})
</script>

<template>
  <div class="flex h-screen bg-[rgb(var(--surface-elevated))]">
    <!-- Desktop Sidebar -->
    <LayoutSidebar />
    
    <!-- Mobile Sidebar (always collapsed) -->
    <aside 
      class="md:hidden flex-shrink-0 flex flex-col border-r-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))] w-16 h-screen"
    >
      <div class="h-14 px-2 py-2 border-b-2 border-[rgb(var(--border))] flex items-center justify-center">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
      <nav class="flex-1 p-2 space-y-4 overflow-y-auto flex flex-col">
        <!-- Dashboard (independent, always at top) -->
        <div class="mb-2">
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
        <div class="h-px bg-[rgb(var(--border))] mx-2" />

        <!-- Sections -->
        <div class="flex-1 space-y-4">
          <div v-for="section in navSections" :key="section.title" class="space-y-1">
            <NuxtLink
              v-for="item in section.items"
              :key="item.path"
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

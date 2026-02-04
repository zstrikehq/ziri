<script setup lang="ts">
import { useAdminAuthStore } from '~/stores/admin-auth'
import { useUserAuthStore } from '~/stores/user-auth'

const route = useRoute()

 
const isCollapsed = useState('sidebar-collapsed', () => false)

 
const adminAuthStore = useAdminAuthStore()
const userAuthStore = useUserAuthStore()

if (process.client) {
  adminAuthStore.loadFromStorage()
  userAuthStore.loadFromStorage()
}

const userRole = computed(() => {
  return userAuthStore.user?.role || adminAuthStore.user?.role || null
})

const isAdmin = computed(() => userRole.value === 'admin')
const isUser = computed(() => userRole.value === 'user' || userRole.value === undefined)

const isDashboardUser = computed(() => userRole.value && userRole.value !== 'user')

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

 
defineExpose({ toggleSidebar, isCollapsed })

 
const tooltipState = ref<{
  visible: boolean
  text: string
  x: number
  y: number
}>({
  visible: false,
  text: '',
  x: 0,
  y: 0
})

 
const showTooltip = (event: MouseEvent, text: string) => {
  if (!isCollapsed.value) return
  
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  
 
  tooltipState.value = {
    visible: true,
    text,
    x: rect.right + 6,
    y: rect.top + rect.height / 2
  }
}

const hideTooltip = () => {
  tooltipState.value.visible = false
}

 
const dashboardItem = { name: 'Dashboard', path: '/', icon: 'dashboard', adminOnly: true }

 
const navSections = computed(() => {
  const sections = []
  

  if (isDashboardUser.value) {
    sections.push(
      {
        title: 'Analytics & Monitoring',
        icon: 'chart',
        adminOnly: false,
        items: [
          { name: 'Analytics', path: '/analytics', icon: 'analytics', adminOnly: false },
          { name: 'Logs', path: '/logs', icon: 'logs', adminOnly: false }
        ]
      },
      {
        title: 'Authorization',
        icon: 'lock',
        adminOnly: false,
        items: [
          { name: 'Schema', path: '/schema', icon: 'schema', adminOnly: false },
          { name: 'Rules', path: '/rules', icon: 'rules', adminOnly: false }
        ]
      },
      {
        title: 'Access Management',
        icon: 'key',
        adminOnly: false,
        items: [
          { name: 'Users', path: '/users', icon: 'users', adminOnly: false },
          { name: 'API Keys', path: '/keys', icon: 'keys', adminOnly: false }
        ]
      },
      {
        title: 'LLM Providers',
        icon: 'providers',
        adminOnly: false,
        items: [
          { name: 'Providers', path: '/providers', icon: 'providers', adminOnly: false }
        ]
      },
      {
        title: 'Settings',
        icon: 'settings',
        adminOnly: true, // Only admins can see Settings section (includes Config and Manage Users)
        items: [
          { name: 'Configuration', path: '/config', icon: 'config', adminOnly: true },
          { name: 'Manage Users', path: '/settings/manage-users', icon: 'users', adminOnly: true, requiresAdmin: true },
          { name: 'Internal Logs', path: '/settings/internal-audit', icon: 'logs', adminOnly: true }
        ]
      }
    )
  }
  
 
  sections.push({
    title: 'My Account',
    icon: 'user',
    adminOnly: false,
    items: [
      { name: 'My Profile', path: '/me', icon: 'user', adminOnly: false }
    ]
  })
  
  return sections
})

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

 
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
</script>

<template>
  <aside 
    class="flex-shrink-0 flex flex-col border-r-2 transition-all duration-300 ease-out h-screen overflow-hidden"
    :class="[
      isCollapsed ? 'w-16' : 'w-56',
      'bg-[rgb(var(--surface))] border-[rgb(var(--border))]',
      'hidden md:flex'
    ]"
  >
    <!-- Logo Section -->
    <div 
      class="h-14 py-2 border-b-2 border-[rgb(var(--border))] flex-shrink-0 min-w-0"
      :class="isCollapsed ? 'px-2' : 'px-4'"
    >
        <div class="flex items-center gap-3 min-w-0">
          <!-- Logo Icon -->
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25 ring-1 ring-white/10">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div v-if="!isCollapsed" class="overflow-hidden min-w-0 flex-1">
            <h1 class="text-sm font-black tracking-tight text-[rgb(var(--text))] truncate uppercase">LLM Gateway</h1>
            <p class="text-[10px] font-bold text-[rgb(var(--text-muted))] truncate tracking-widest uppercase opacity-70">AI Gateway Management</p>
          </div>
        </div>
    </div>
    
    <!-- Navigation -->
    <nav class="flex-1 p-2 overflow-y-auto overflow-x-hidden flex flex-col min-w-0" style="scrollbar-width: none; -ms-overflow-style: none;">
      <!-- Dashboard (independent, always at top) - Dashboard users only -->
      <div v-if="isDashboardUser" class="mb-4 min-w-0">
        <NuxtLink
          :to="dashboardItem.path"
          class="nav-item group relative min-w-0 w-full"
          :class="{ 
            'active': isActive(dashboardItem.path), 
            'justify-center': isCollapsed
          }"
          @mouseenter="(e) => showTooltip(e, dashboardItem.name)"
          @mouseleave="hideTooltip"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getIcon(dashboardItem.icon)" />
          </svg>
          <span v-if="!isCollapsed" class="truncate min-w-0">{{ dashboardItem.name }}</span>
        </NuxtLink>
      </div>

      <!-- Sections -->
      <div class="flex-1">
        <div v-for="(section, sectionIdx) in navSections" :key="section.title" v-show="!section.adminOnly || isAdmin" class="mb-4 last:mb-0">
          <!-- Separator line when collapsed (before each section) -->
          <div 
            v-if="isCollapsed"
            class="h-px bg-[rgb(var(--border))] mx-2 mb-2"
          />
          
          <!-- Section Header -->
          <div 
            v-if="!isCollapsed"
            class="px-2 py-1.5 mb-1.5 mt-1"
          >
            <div class="flex items-center gap-1.5">
              <svg class="w-3 h-3 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getIcon(section.icon)" />
              </svg>
              <h2 class="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] leading-tight">
                {{ section.title }}
              </h2>
            </div>
          </div>
          
          <!-- Section Items (indented) -->
          <div class="space-y-1 min-w-0" :class="{ 'pl-0': isCollapsed, 'pl-1': !isCollapsed }">
            <NuxtLink
              v-for="item in section.items"
              :key="item.path"
              v-show="!(item.requiresAdmin && userRole !== 'admin')"
              :to="item.path"
              class="nav-item group relative min-w-0 w-full"
              :class="{ 
                'active': isActive(item.path), 
                'justify-center': isCollapsed
              }"
              @mouseenter="(e) => showTooltip(e, item.name)"
              @mouseleave="hideTooltip"
            >
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getIcon(item.icon)" />
              </svg>
              <span v-if="!isCollapsed" class="truncate min-w-0 flex-1">{{ item.name }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Collapse Toggle -->
    <div 
      class="border-t-2 border-[rgb(var(--border))] flex-shrink-0 min-w-0"
      :class="isCollapsed ? 'p-2' : 'p-2'"
    >
      <button
        @click="toggleSidebar"
        class="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))] relative min-w-0"
        :class="isCollapsed ? 'px-2' : 'px-3'"
        @mouseenter="(e) => showTooltip(e, 'Expand sidebar')"
        @mouseleave="hideTooltip"
      >
        <svg 
          class="w-5 h-5 transition-transform duration-300 flex-shrink-0" 
          :class="{ 'rotate-180': isCollapsed }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
        <span v-if="!isCollapsed" class="truncate min-w-0">Collapse</span>
      </button>
    </div>
  </aside>

  <!-- Tooltip (rendered outside sidebar using Teleport) -->
  <Teleport to="body">
    <Transition name="tooltip-fade">
      <div
        v-if="tooltipState.visible && isCollapsed"
        class="sidebar-tooltip"
        :style="{
          left: `${tooltipState.x}px`,
          top: `${tooltipState.y}px`,
          transform: 'translateY(-50%)'
        }"
      >
        <span class="sidebar-tooltip-arrow"></span>
        <span class="sidebar-tooltip-text">{{ tooltipState.text }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.nav-item {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200;
  @apply text-[rgb(var(--text-secondary))];
  @apply hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))];
}

.nav-item.active {
  @apply bg-[rgb(var(--primary))/0.1] text-[rgb(var(--primary))] font-semibold;
}
</style>

<style scoped>
/* Tooltip fade transition */
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}

/* Hide scrollbar for Chrome, Safari and Opera */
nav::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
nav {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

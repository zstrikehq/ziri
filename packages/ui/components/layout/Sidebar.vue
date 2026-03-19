<script setup lang="ts">
import { useAdminAuthStore } from '~/stores/admin-auth'
import { useUserAuthStore } from '~/stores/user-auth'
import { useNavigation } from '~/composables/useNavigation'
import ziriLogo from '~/assets/logo/ziri.png'

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


const { dashboardItem, getNavSections, getIcon, isActive } = useNavigation()

const navSections = computed(() => getNavSections(isDashboardUser.value))
</script>

<template>
  <aside 
    class="terminal-frame relative z-10 flex-shrink-0 flex flex-col transition-all duration-300 ease-out h-screen overflow-hidden"
    :class="[
      isCollapsed ? 'w-16' : 'w-56',
      'hidden md:flex'
    ]"
  >
    <!-- Logo Section -->
    <div 
      class="h-14 py-2 border-b border-[rgb(var(--border))] flex-shrink-0 min-w-0"
      :class="isCollapsed ? 'px-2' : 'px-4'"
    >
        <div class="flex items-center gap-3 min-w-0">
          <!-- Logo Icon -->
          <div class="w-8 h-8 flex-shrink-0 border border-lime-500/60 bg-lime-300/85 p-1.5 flex items-center justify-center shadow-[0_0_14px_rgba(212,245,51,0.22)]">
            <img 
              :src="ziriLogo" 
              alt="Ziri Logo" 
              class="w-full h-full object-contain brightness-0"
            />
          </div>
          <div v-if="!isCollapsed" class="overflow-hidden min-w-0 flex-1">
            <h1 class="text-xs font-black tracking-[0.16em] truncate uppercase text-[rgb(var(--color-text-accent))]">ZIRI</h1>
            <p class="text-[10px] font-bold text-[rgb(var(--text-muted))] truncate tracking-[0.14em] uppercase">control interface</p>
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
        <div v-for="section in navSections" :key="section.title" v-show="!section.adminOnly || isAdmin" class="mb-4 last:mb-0">
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
      class="border-t border-[rgb(var(--border))] flex-shrink-0 min-w-0"
      :class="isCollapsed ? 'p-2' : 'p-2'"
    >
      <button
        @click="toggleSidebar"
        class="w-full flex items-center justify-center gap-2 py-2.5 border border-transparent text-xs font-bold uppercase tracking-[0.1em] transition-all duration-200 text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--text))] relative min-w-0"
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

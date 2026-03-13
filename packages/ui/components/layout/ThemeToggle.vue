<script setup lang="ts">
const { setTheme } = useMonacoEditor();
 
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

const setCookie = (name: string, value: string, days: number = 365) => {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

const isDark = ref(false)

onMounted(() => {
  if (import.meta.client) {
    const stored = getCookie('theme')
    if (stored) {
      isDark.value = stored === 'dark'
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    applyTheme()
  }
})

const toggle = () => {
  isDark.value = !isDark.value
  applyTheme()
}

const applyTheme = () => {
  if (import.meta.client) {
    const themeValue = isDark.value ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', isDark.value)
    setCookie('theme', themeValue, 365)

    localStorage.setItem('theme', themeValue)
    setTheme()
  }
}
</script>

<template>
  <button
    @click="toggle"
    class="icon-btn relative overflow-hidden"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <Transition name="theme-icon" mode="out-in">
      <!-- Sun icon (show when dark mode is active) -->
      <svg v-if="isDark" key="sun" class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <!-- Moon icon (show when light mode is active) -->
      <svg v-else key="moon" class="w-5 h-5 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </Transition>
  </button>
</template>

<style scoped>
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: all 0.2s ease;
}

.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}
</style>

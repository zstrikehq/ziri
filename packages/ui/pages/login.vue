<template>
  <div class="min-h-screen flex flex-col bg-[rgb(var(--surface))] bg-texture">
    <!-- Header with theme toggle -->
    <header class="h-14 flex-shrink-0 border-b-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))] flex items-center justify-between px-4 md:px-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-lime-500 to-lime-600 p-1.5 flex items-center justify-center shadow-md shadow-lime-500/25 ring-1 ring-lime-500/20">
          <img
            :src="ziriLogo"
            alt="Ziri Logo"
            class="w-full h-full object-contain brightness-0"
          />
        </div>
        <h1 class="text-xl font-black tracking-wider uppercase text-lime-600 dark:text-lime-400 drop-shadow-sm">
          ZIRI
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <LayoutThemeToggle />
      </div>
    </header>

    <!-- Login Form -->
    <div class="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full">
        <!-- Card with subtle glassmorphism -->
        <div class="card relative overflow-hidden login-card-glass">
          <div class="space-y-8">
            <div>
              <h2 class="text-center text-4xl font-black text-[rgb(var(--text))] tracking-tight">
                Login
              </h2>
              <p class="mt-4 text-center text-sm text-[rgb(var(--text-secondary))] max-w-xs mx-auto">
                Enter your credentials to access the gateway
              </p>
            </div>
            
            <form class="space-y-6" @submit.prevent="handleLogin">
              <div class="space-y-4">
                <!-- Username/User ID Input -->
                <div class="group relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <svg class="h-5 w-5 text-[rgb(var(--text-muted))] group-focus-within:text-[rgb(var(--color-text-accent))] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    v-model="form.username"
                    name="username"
                    type="text"
                    required
                    class="input w-full pl-12 pr-4 py-3.5"
                    placeholder="admin or user-abc123"
                    :disabled="isLoading"
                  />
                </div>
                
                <!-- Password Input -->
                <div class="group relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <svg class="h-5 w-5 text-[rgb(var(--text-muted))] group-focus-within:text-[rgb(var(--color-text-accent))] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    v-model="form.password"
                    name="password"
                    type="password"
                    required
                    class="input w-full pl-12 pr-4 py-3.5"
                    placeholder="••••••••••••••••"
                    :disabled="isLoading"
                  />
                </div>
              </div>

              <div v-if="error" class="rounded-xl bg-[rgb(var(--danger))]/10 border-2 border-[rgb(var(--danger))]/20 p-4 animate-shake">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5 text-[rgb(var(--danger))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 class="text-sm font-bold text-[rgb(var(--danger))]">
                    {{ error }}
                  </h3>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  :disabled="isLoading"
                  class="btn btn-primary w-full"
                >
                  <span v-if="!isLoading" class="flex items-center gap-2">
                    Sign in to Gateway
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <span v-else class="flex items-center gap-2">
                    <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </span>
                </button>
              </div>

              <!-- <div class="pt-4 flex flex-col items-center gap-3">
                <div class="px-4 py-2 rounded-lg bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border))] text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] shadow-sm">
                  Login Credentials
                </div>
                <div class="text-xs text-[rgb(var(--text-secondary))] text-center space-y-1 font-medium">
                  <p><strong>Admin:</strong> Username: <span class="text-[rgb(var(--primary))] font-bold">ziri</span>, Password: <span class="italic text-[rgb(var(--text-muted))]">Your root key</span></p>
                  <p><strong>User:</strong> User ID: <span class="text-[rgb(var(--primary))] font-bold">user-xxx</span>, Password: <span class="italic text-[rgb(var(--text-muted))]">Provided by administrator</span></p>
                </div>
              </div> -->
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import ziriLogo from '~/assets/logo/ziri.png'

definePageMeta({
  layout: false
})

const { login, isLoading, error } = useAuth()

const form = reactive({
  username: '',
  password: ''
})

const handleLogin = async () => {
  await login(form.username, form.password)
 
}
</script>

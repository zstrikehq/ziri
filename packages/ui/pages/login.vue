<template>
  <div class="terminal-shell min-h-screen flex flex-col">
    <header class="terminal-frame relative z-10 h-14 flex-shrink-0 flex items-center justify-between px-4 md:px-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 flex-shrink-0 border border-lime-500/60 bg-lime-300/85 p-1.5 flex items-center justify-center shadow-[0_0_14px_rgba(212,245,51,0.22)]">
          <img
            :src="ziriLogo"
            alt="Ziri Logo"
            class="w-full h-full object-contain brightness-0"
          />
        </div>
        <div class="flex items-center gap-2">
          <h1 class="text-sm md:text-base font-black tracking-[0.16em] uppercase text-[rgb(var(--color-text-accent))]">
            Ziri
          </h1>
          <span class="hidden md:inline-flex px-2 py-1 border border-[rgb(var(--border-strong))] text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">
            Access Console
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <LayoutThemeToggle />
      </div>
    </header>

    <div class="relative z-10 flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div class="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section class="terminal-frame lg:col-span-3 p-6 md:p-8">
          <div class="space-y-7">
            <div class="space-y-3">
              <p class="terminal-section-title">authentication required</p>
              <h2 class="text-3xl md:text-4xl font-black uppercase tracking-[0.14em] text-[rgb(var(--text))]">
                operator login
              </h2>
              <p class="text-sm text-[rgb(var(--text-secondary))] max-w-lg">
                Enter your assigned credentials to initialize a secure session with the Ziri gateway.
              </p>
            </div>
            
            <form class="space-y-5" @submit.prevent="handleLogin">
              <div class="space-y-4">
                <div class="group relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <svg class="h-4 w-4 text-[rgb(var(--text-muted))] group-focus-within:text-[rgb(var(--color-text-accent))] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    v-model="form.username"
                    name="username"
                    type="text"
                    required
                    class="input w-full pl-10 pr-3"
                    placeholder="admin or user-abc123"
                    :disabled="isLoading"
                  />
                </div>
                
                <div class="group relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <svg class="h-4 w-4 text-[rgb(var(--text-muted))] group-focus-within:text-[rgb(var(--color-text-accent))] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    v-model="form.password"
                    name="password"
                    type="password"
                    required
                    class="input w-full pl-10 pr-3"
                    placeholder="enter password"
                    :disabled="isLoading"
                  />
                </div>
              </div>

              <div v-if="error" class="border border-[rgb(var(--danger))]/60 bg-[rgb(var(--danger))]/10 p-3 animate-shake">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-[rgb(var(--danger))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-[rgb(var(--danger))]">
                    {{ error }}
                  </h3>
                </div>
              </div>

              <button
                type="submit"
                :disabled="isLoading"
                class="btn btn-primary w-full"
              >
                <span v-if="!isLoading" class="flex items-center gap-2">
                  Authenticate Session
                </span>
                <span v-else class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </span>
              </button>
            </form>
          </div>
        </section>

        <aside class="terminal-frame lg:col-span-2 p-6 space-y-6">
          <div class="space-y-2">
            <p class="terminal-section-title">system signal</p>
            <p class="text-xs uppercase tracking-[0.1em] text-[rgb(var(--text-secondary))]">
              Secure gateway handshake is active.
            </p>
          </div>

          <div class="space-y-3 text-xs">
            <div class="flex items-center justify-between border border-[rgb(var(--border))] px-3 py-2">
              <span class="uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">encryption</span>
              <span class="font-bold uppercase tracking-[0.1em] text-[rgb(var(--color-text-accent))]">enabled</span>
            </div>
            <div class="flex items-center justify-between border border-[rgb(var(--border))] px-3 py-2">
              <span class="uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">channel</span>
              <span class="font-bold uppercase tracking-[0.1em] text-[rgb(var(--color-text-accent))]">private</span>
            </div>
            <div class="flex items-center justify-between border border-[rgb(var(--border))] px-3 py-2">
              <span class="uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">session</span>
              <span class="font-bold uppercase tracking-[0.1em] text-[rgb(var(--color-text-accent))]">awaiting auth</span>
            </div>
          </div>

          <div class="border-t border-[rgb(var(--border))] pt-4 text-xs text-[rgb(var(--text-muted))]">
            Access is restricted to authorized operators and approved dashboard users.
          </div>
        </aside>
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

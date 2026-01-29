 
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],

  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.ts'
  },

  runtimeConfig: {
    public: {
      backendUrl: process.env.NUXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
      proxyUrl: process.env.NUXT_PUBLIC_PROXY_URL || 'http://localhost:3100'
    }
  },

  app: {
    head: {
      title: 'ZIRI',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'ZIRI Management Interface with Cedar Authorization' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

 
 
  nitro: {
    prerender: {
      routes: ['/']
    },
    experimental: {
      wasm: true
    }
  },
  
  vite: {
    plugins: [wasm(), topLevelAwait()],
		assetsInclude: ["**/*.wasm"],
    optimizeDeps: {
      exclude: ['@cedar-policy/cedar-wasm']
    },
    ssr: {
      noExternal: []
    }
  },
  
 
  ssr: true,
  
 
  router: {
    options: {
 
      hashMode: false
    }
  }
})

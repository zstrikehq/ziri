import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const certPath = resolve(__dirname, '../../certs/cert.pem')
const keyPath = resolve(__dirname, '../../certs/key.pem')
const hasCerts = existsSync(certPath) && existsSync(keyPath)

// Only read cert files for the dev server — in production the proxy serves the UI directly
const devHttps = hasCerts && process.env.NODE_ENV !== 'production'
  ? { cert: readFileSync(certPath, 'utf-8'), key: readFileSync(keyPath, 'utf-8') }
  : undefined

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  experimental: {
    appManifest: false
  },
  devServer: devHttps ? { https: devHttps } : {},

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', 'nuxt-monaco-editor'],

  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.ts'
  },

  runtimeConfig: {
    public: {



      proxyUrl: process.env.NUXT_PUBLIC_PROXY_URL || (hasCerts ? 'https://localhost:3100' : 'http://localhost:3100')
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
        { rel: 'icon', type: 'image/png', href: '/logo/ziri.png' }
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
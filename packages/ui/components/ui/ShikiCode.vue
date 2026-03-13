<script setup lang="ts">
import { createHighlighter, type Highlighter } from 'shiki'

const props = defineProps<{
  code: string
  lang?: string
}>()

const html = ref('')
let highlighter: Highlighter | null = null

const getTheme = () => {
  if (typeof document === 'undefined') return 'min-light'
  const stored = localStorage.getItem('theme')
  if (stored) return stored === 'dark' ? 'github-dark-default' : 'min-light'
  if (document.documentElement.classList.contains('dark')) return 'github-dark-default'
  return 'min-light'
}

const highlight = async () => {
  if (!props.code) {
    html.value = ''
    return
  }

  try {
    if (!highlighter) {
      const cedarSyntax = await $fetch('/syntax/cedar.tmLanguage.json')
      const cedarGrammar = {
        scopeName: 'source.cedar',
        patterns: [],
        repository: {},
        ...(cedarSyntax as any),
        name: 'cedar-policy',
      }

      highlighter = await createHighlighter({
        langs: [cedarGrammar],
        themes: ['min-light', 'catppuccin-latte', 'catppuccin-mocha', 'vitesse-dark', 'vesper', 'material-theme-ocean', 'github-dark-high-contrast', 'github-dark-default'],
      })
    }

    html.value = highlighter.codeToHtml(props.code, {
      lang: props.lang || 'cedar-policy',
      theme: getTheme(),
    })
  } catch (e) {
    html.value = `<pre class="shiki"><code>${props.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
  }
}

watch(() => props.code, highlight, { immediate: true })

onMounted(() => {
  if (typeof window === 'undefined') return

  const observer = new MutationObserver(() => {
    highlight()
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  onUnmounted(() => observer.disconnect())
})
</script>

<template>
  <div class="shiki-wrapper" v-html="html" />
</template>

<style scoped>
.shiki-wrapper {
  overflow: hidden;
}

.shiki-wrapper :deep(pre) {
  margin: 0;
  padding: 0.5rem 0.75rem;
  overflow-x: auto;
}

.shiki-wrapper :deep(pre)::-webkit-scrollbar {
  height: 3px;
}

.shiki-wrapper :deep(pre)::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.25);
  border-radius: 2px;
}

.shiki-wrapper :deep(code) {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

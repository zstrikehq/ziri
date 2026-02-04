<script setup lang="ts">
import { nextTick } from 'vue'
import { useAIPolicyGeneration, type ChatMessage } from '~/composables/useAIPolicyGeneration'
import { useProviders } from '~/composables/useProviders'
import { useSchema } from '~/composables/useSchema'
import { useToast } from '~/composables/useToast'

interface ExtendedChatMessage extends ChatMessage {
  timestamp?: Date
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'usePolicy': [policy: string]
}>()

const { generatePolicy } = useAIPolicyGeneration()
const { providers, listProviders: loadProviders } = useProviders()
const { getSchema } = useSchema()
const toast = useToast()


const AVAILABLE_MODELS = {
  openai: [
    { value: 'gpt-5.1', label: 'GPT-5.1' },
    { value: 'gpt-4', label: 'GPT-4' }
  ],
  anthropic: [
    { value: 'claude-opus-4-5-20251101', label: 'Claude Opus 4.5' },
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' }
  ]
}

const selectedProvider = ref<string>('')
const selectedModel = ref<string>('')
const messages = ref<ExtendedChatMessage[]>([])
const currentMessage = ref('')
const isLoading = ref(false)
const generatedPolicy = ref<string>('')
const schemaText = ref<string>('')


const availableModels = computed(() => {
  const models: Array<{ value: string; label: string; provider: string }> = []
  
  const openaiProvider = providers.value.find(p => p.name.toLowerCase() === 'openai')
  const anthropicProvider = providers.value.find(p => p.name.toLowerCase() === 'anthropic')
  
  if (openaiProvider) {
    AVAILABLE_MODELS.openai.forEach(model => {
      models.push({ ...model, provider: 'openai' })
    })
  }
  
  if (anthropicProvider) {
    AVAILABLE_MODELS.anthropic.forEach(model => {
      models.push({ ...model, provider: 'anthropic' })
    })
  }
  
  return models
})


watch(availableModels, (models) => {
  if (models.length > 0 && !selectedProvider.value) {
    selectedProvider.value = models[0].provider
    selectedModel.value = models[0].value
  }
}, { immediate: true })


watch(selectedProvider, (provider) => {
  const providerModels = availableModels.value.filter(m => m.provider === provider)
  if (providerModels.length > 0) {
    selectedModel.value = providerModels[0].value
  }
})


onMounted(async () => {
  try {
    const schemaData = await getSchema('cedar')
    schemaText.value = schemaData.schemaCedarText || JSON.stringify(schemaData.schema, null, 2)
  } catch (e: any) {
    console.error('Failed to load schema:', e)
  }
  
  try {
    await loadProviders()
  } catch (e: any) {
    console.error('Failed to load providers:', e)
  }
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const resetChat = () => {
  messages.value = []
  currentMessage.value = ''
  generatedPolicy.value = ''
}

watch(isOpen, (open) => {
  if (!open) {
    resetChat()
  }
})

const sendMessage = async () => {
  if (!currentMessage.value.trim() || !selectedProvider.value || !selectedModel.value) {
    return
  }

  const userMessage: ExtendedChatMessage = {
    role: 'user',
    content: currentMessage.value.trim(),
    timestamp: new Date()
  }

  messages.value.push(userMessage)
  const messageToSend = currentMessage.value.trim()
  currentMessage.value = ''
  isLoading.value = true

  try {
    const response = await generatePolicy({
      provider: selectedProvider.value,
      model: selectedModel.value,
      messages: messages.value.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      cedarSchema: schemaText.value
    })

    const assistantMessage: ExtendedChatMessage = {
      role: 'assistant',
      content: response.policy,
      timestamp: new Date()
    }

    messages.value.push(assistantMessage)
    generatedPolicy.value = response.policy
  } catch (e: any) {
    toast.error(e.message || 'Failed to generate rule')
  } finally {
    isLoading.value = false
  }
}

const handleUsePolicy = (policyText?: string) => {
  const policy = policyText || generatedPolicy.value
  if (policy) {

    const url = `/rules?create=true&policy=${encodeURIComponent(policy)}`
    window.open(url, '_blank')
  }
}

const copyPolicy = async (policyText?: string) => {
  const textToCopy = policyText || generatedPolicy.value
  if (textToCopy) {
    try {
      await navigator.clipboard.writeText(textToCopy)
      toast.success('Policy copied to clipboard')
    } catch (e) {
      toast.error('Failed to copy policy')
    }
  }
}

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}


const messagesContainer = ref<HTMLElement>()

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch([messages, isLoading], () => {
  scrollToBottom()
})
</script>

<template>
  <UiModal v-model="isOpen" title="" size="xl" :noPadding="true">
    <div class="ai-chat-container">
      <!-- Chat Header -->
      <div class="chat-header">
        <div class="header-content">
          <div class="ai-avatar-large">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div class="header-info">
            <h3 class="assistant-name">AI Rules Generator</h3>
            <div class="header-controls">
              <select 
                v-model="selectedModel"
                class="model-select"
                :disabled="availableModels.length === 0"
              >
                <option value="" disabled>Select a model</option>
                <optgroup 
                  v-for="provider in ['openai', 'anthropic']" 
                  :key="provider"
                  :label="provider === 'openai' ? 'OpenAI' : 'Anthropic'"
                >
                  <option
                    v-for="model in availableModels.filter(m => m.provider === provider)"
                    :key="model.value"
                    :value="model.value"
                  >
                    {{ model.label }}
                  </option>
                </optgroup>
              </select>
              <p v-if="availableModels.length === 0" class="status-text">
                No providers configured
              </p>
              <p v-else-if="isLoading" class="status-text typing-status">
                <span class="status-dot"></span>
                Generating...
              </p>
              <p v-else class="status-text">Ready to help</p>
            </div>
          </div>
          <button 
            @click="isOpen = false"
            class="close-button"
            title="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Chat Messages -->
      <div class="chat-messages" ref="messagesContainer">
        <!-- Welcome Message -->
        <div v-if="messages.length === 0" class="message-wrapper ai-message">
          <div class="avatar ai-avatar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div class="message-content">
            <div class="message-bubble ai-bubble">
              <p class="message-text">
                Hi! I'm here to help you create Cedar rules. Describe what you need in natural language, and I'll generate the appropriate rule for you.
              </p>
              <p class="example-text">
                For example: "Create a rule that allows users to read their own profile"
              </p>
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div
          v-for="(message, idx) in messages"
          :key="idx"
          class="message-wrapper"
          :class="message.role === 'user' ? 'user-message' : 'ai-message'"
        >
          <div class="avatar" :class="message.role === 'user' ? 'user-avatar' : 'ai-avatar'">
            <svg v-if="message.role === 'user'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div class="message-content">
            <div class="message-bubble" :class="message.role === 'user' ? 'user-bubble' : 'ai-bubble'">
              <!-- Code Editor Section for AI messages with policy -->
              <div v-if="message.role === 'assistant'" class="code-editor-wrapper">
                <div class="code-editor-section">
                  <div class="code-editor-header">
                    <div class="editor-title">
                      <svg class="code-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span>Cedar Rule</span>
                    </div>
                    <button
                      @click="copyPolicy(message.content)"
                      class="copy-button"
                      title="Copy code"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <div class="code-editor-content">
                    <pre class="cedar-code"><code>{{ message.content }}</code></pre>
                  </div>
                </div>
                <!-- Action button - full width of code block -->
                <button
                  @click="handleUsePolicy(message.content)"
                  class="btn btn-primary w-full mt-3 text-xs py-2 gap-1.5"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Use this rule
                </button>
              </div>
              <div v-else class="message-text">{{ message.content }}</div>
            </div>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div v-if="isLoading" class="message-wrapper ai-message typing-message">
          <div class="avatar ai-avatar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div class="message-content">
            <div class="message-bubble ai-bubble">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>


      <!-- Input area -->
      <div class="border-t border-[rgb(var(--border))] p-3">
        <div class="flex gap-2">
          <textarea
            v-model="currentMessage"
            @keypress="handleKeyPress"
            placeholder="Describe the rule you want to create..."
            class="input flex-1 resize-none text-xs py-2"
            rows="2"
            :disabled="isLoading || !selectedModel || availableModels.length === 0"
          ></textarea>
          <button
            @click="sendMessage"
            :disabled="!currentMessage.trim() || isLoading || !selectedModel || availableModels.length === 0"
            class="px-3 py-2 rounded bg-[rgb(var(--primary))] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </UiModal>
</template>

<style scoped>
/* Chat Container */
.ai-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 80vh;
  min-height: 500px;
  background: rgb(var(--surface));
  overflow: hidden;
}

/* Chat Header */
.chat-header {
  background: rgb(var(--surface));
  border-bottom: 1px solid rgb(var(--border));
  padding: 16px 20px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar-large {
  width: 40px;
  height: 40px;
  background: rgb(var(--primary));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.assistant-name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--text));
  margin: 0 0 6px 0;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-select {
  padding: 4px 8px;
  border: 1px solid rgb(var(--border));
  border-radius: 6px;
  background: rgb(var(--surface));
  color: rgb(var(--text));
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.model-select:hover {
  border-color: rgb(var(--border-strong));
}

.model-select:focus {
  outline: none;
  border-color: rgb(var(--primary));
  box-shadow: 0 0 0 2px rgba(var(--primary), 0.1);
}

.status-text {
  font-size: 10px;
  color: rgb(var(--text-muted));
  margin: 0;
}

.typing-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  background: rgb(var(--success));
  border-radius: 50%;
  animation: pulse 2s infinite;
}

/* Chat Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: rgb(var(--surface));
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  animation: slideIn 0.3s ease-out;
}

.user-message {
  flex-direction: row-reverse;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-avatar {
  background: rgb(var(--primary));
  color: white;
}

.user-avatar {
  background: rgb(var(--text-muted));
  color: white;
}

.message-content {
  max-width: 75%;
  min-width: 120px;
}

.message-bubble {
  border-radius: 8px;
  padding: 12px 16px;
  position: relative;
  width: 100%;
}

.ai-bubble {
  background: rgb(var(--surface));
  border: 2px solid rgb(var(--border));
}

.user-bubble {
  background: rgb(var(--primary));
  color: white;
}

.message-text {
  font-size: 12px;
  line-height: 1.6;
  margin: 0;
  word-wrap: break-word;
  color: rgb(var(--text));
}

.user-bubble .message-text {
  color: white;
}

.example-text {
  font-size: 10px;
  opacity: 0.8;
  margin-top: 8px;
  font-style: italic;
  color: rgb(var(--text-secondary));
}


/* Code Editor Section */
.code-editor-wrapper {
  width: 100%;
}

.code-editor-section {
  margin: 0;
  border: 1px solid rgb(var(--border));
  border-radius: 8px;
  overflow: hidden;
  background: rgb(var(--bg));
}

.code-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgb(var(--surface));
  border-bottom: 1px solid rgb(var(--border));
}

.editor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--text-secondary));
}

.code-icon {
  width: 14px;
  height: 14px;
  color: rgb(var(--primary));
}

.copy-button {
  color: rgb(var(--text-muted));
  background: transparent;
  border: none;
  padding: 6px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-button:hover {
  color: rgb(var(--primary));
  background: rgb(var(--surface-elevated));
}

.code-editor-content {
  padding: 0;
  background: rgb(var(--bg));
  overflow-x: auto;
}

.cedar-code {
  display: block;
  padding: 14px;
  margin: 0;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: rgb(var(--text));
  background: transparent;
  white-space: pre-wrap;
  word-break: break-word;
  tab-size: 2;
}

.code-editor-content::-webkit-scrollbar {
  height: 8px;
}

.code-editor-content::-webkit-scrollbar-track {
  background: rgb(var(--surface-elevated));
}

.code-editor-content::-webkit-scrollbar-thumb {
  background: rgb(var(--border-strong));
  border-radius: 4px;
}

.code-editor-content::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--text-muted));
}

/* Message Actions */
.message-actions {
  margin-top: 12px;
  width: 100%;
  display: flex;
}

.builder-button {
  background: rgb(var(--primary));
  border: none;
  color: white;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.builder-button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.builder-button:active {
  transform: translateY(0);
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: rgb(var(--text-muted));
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

/* Chat Input */
.chat-input {
  background: rgb(var(--surface));
  border-top: 1px solid rgb(var(--border));
  padding: 16px 20px;
}

.input-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.input-content {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  border: 1px solid rgb(var(--border));
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  background: rgb(var(--surface-elevated));
  color: rgb(var(--text));
  resize: none;
  transition: all 0.2s ease;
  font-family: inherit;
}

.message-input:focus {
  outline: none;
  border-color: rgb(var(--primary));
  background: rgb(var(--surface));
  box-shadow: 0 0 0 2px rgba(var(--primary), 0.1);
}

.message-input::placeholder {
  color: rgb(var(--text-muted));
}

.send-button {
  width: 36px;
  height: 36px;
  padding: 0;
  background: rgb(var(--primary));
  border: none;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.send-button:hover:not(:disabled) {
  opacity: 0.9;
  transform: scale(1.05);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-hint {
  font-size: 11px;
  color: rgb(var(--text-muted));
}

.clear-button {
  background: transparent;
  border: none;
  color: rgb(var(--text-muted));
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
}

.clear-button:hover {
  background: rgb(var(--surface-elevated));
  color: rgb(var(--text));
}

/* Scrollbar */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgb(var(--border-strong));
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--text-muted));
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-6px);
  }
}

/* Dark Mode Adjustments */
:global(.dark) .code-editor-section {
  border-color: rgb(var(--border));
  background: rgb(var(--bg));
}

:global(.dark) .code-editor-header {
  background: rgb(var(--surface-elevated));
  border-bottom-color: rgb(var(--border));
}

:global(.dark) .cedar-code {
  background: rgb(var(--bg));
  color: rgb(var(--text));
}

:global(.dark) .code-editor-content {
  background: rgb(var(--bg));
}
</style>

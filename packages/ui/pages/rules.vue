<script setup lang="ts">
import AIPolicyChatModal from '~/components/AIPolicyChatModal.vue'
import RuleFormModal from '~/components/rules/RuleFormModal.vue'
import { useRulesPageState } from '~/composables/useRulesPageState'

const {
  permissionsLoading,
  canCreatePolicy,
  canUpdatePolicy,
  canDeletePolicy,
  canGeneratePolicyWithAI,
  showCreateModal,
  showEditModal,
  showDeleteModal,
  showTemplateModal,
  showAIChatModal,
  templates,
  templatesLoading,
  searchQuery,
  filterEffect,
  currentPage,
  itemsPerPage,
  totalRules,
  sortBy,
  sortOrder,
  newRule,
  validationErrors,
  validationWarnings,
  isValidating,
  groupedTemplates,
  rules,
  loading,
  columns,
  policyCursorPos,
  monacoEditor,
  handleSort,
  useTemplate,
  handleOpenTemplateModal,
  onPolicyEditorLoad,
  onPolicyMarkerChanges,
  handleCreateRule,
  handleEditRule,
  handleUpdateRule,
  handleCancelCreate,
  handleCancelEdit,
  confirmDelete,
  handleDeleteRule,
  formatValidationMessage
} = useRulesPageState()
</script>

<template>
  <div class="space-y-4">
    <!-- Permissions Loading Skeleton -->
    <div v-if="permissionsLoading" class="space-y-4">
      <!-- Toolbar Skeleton -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex-1 flex items-center gap-3">
          <div class="relative flex-1 max-w-md">
            <div class="skeleton-shimmer h-10 rounded-lg" style="width: 100%;"></div>
          </div>
          <div class="skeleton-shimmer h-10 w-32 rounded-lg"></div>
        </div>
        <div class="flex gap-2">
          <div class="skeleton-shimmer h-10 w-24 rounded-lg"></div>
          <div class="skeleton-shimmer h-10 w-32 rounded-lg"></div>
          <div class="skeleton-shimmer h-10 w-28 rounded-lg"></div>
        </div>
      </div>
      <!-- Table Skeleton -->
      <div class="overflow-x-auto rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b-2 border-[rgb(var(--border))]">
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-16 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-20 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-12 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-16 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-20 rounded"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in 5" :key="i" class="border-b border-[rgb(var(--border))]">
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${60 + Math.random() * 30}%` }"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${70 + Math.random() * 20}%` }"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-6 w-16 rounded-full"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-6 w-20 rounded-full"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${50 + Math.random() * 20}%` }"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Main Content (only show after permissions load) -->
    <template v-else>
      <!-- Toolbar - Always show if there's data OR if there's a search query -->
      <div class="flex items-center justify-between gap-4" v-if="totalRules > 0 || searchQuery || filterEffect">
      <div class="flex-1 flex items-center gap-3">
        <div class="relative flex-1 max-w-md">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search policies..."
            class="input pl-10"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
            title="Clear search"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <select 
          v-model="filterEffect"
          class="input"
        >
          <option value="">All Effects</option>
          <option value="permit">Permit</option>
          <option value="forbid">Forbid</option>
        </select>
      </div>
      <div class="flex gap-2">
        <UiButton variant="outline" @click="handleOpenTemplateModal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Templates
        </UiButton>
        <UiButton v-if="canGeneratePolicyWithAI" variant="outline" @click="showAIChatModal = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Create with AI
        </UiButton>
        <UiButton v-if="canCreatePolicy" @click="showCreateModal = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Policy
        </UiButton>
      </div>
    </div>

    <!-- Empty state toolbar (when no rules at all) -->
    <div class="flex items-center justify-end gap-2" v-if="totalRules === 0 && !loading && !searchQuery && !filterEffect">
      <UiButton variant="outline" @click="showTemplateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Templates
      </UiButton>
      <UiButton v-if="canGeneratePolicyWithAI" variant="outline" @click="showAIChatModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Create with AI
      </UiButton>
      <UiButton v-if="canCreatePolicy" @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Policy
      </UiButton>
    </div>

    <!-- Policies Table -->
    <UiTable 
      :columns="columns" 
      :data="rules" 
      :loading="loading" 
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      :total-items="totalRules"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :empty-message="searchQuery || filterEffect ? 'No policies match your search criteria.' : 'No policies found. Create your first policy to get started.'"
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
      @update:sort="handleSort"
    >
      <template #empty-action>
        <UiButton v-if="canCreatePolicy && !searchQuery" @click="showCreateModal = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Policy
        </UiButton>
        <UiButton v-if="canGeneratePolicyWithAI && !searchQuery" @click="showAIChatModal = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Create with AI
        </UiButton>
      </template>
      <template #effect="{ row }">
        <span :class="row.effect === 'permit' ? 'badge-success' : 'badge-danger'" class="badge">
          {{ row.effect }}
        </span>
      </template>
      
      <template #description="{ row }">
        <div>
          <p class="text-[rgb(var(--text))] font-medium truncate max-w-md">{{ row.description }}</p>
          <p class="text-[rgb(var(--text-muted))] text-xs font-mono mt-1 truncate max-w-lg">
            {{ row.policy.substring(0, 70) }}...
          </p>
        </div>
      </template>

      <template #status="{ row }">
        <!-- Status pill with improved styling -->
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border-2 shadow-sm"
          :class="row.isActive
            ? 'border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-500/60 shadow-emerald-500/10'
            : 'border-amber-500/50 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-500/60 shadow-amber-500/10'"
        >
          <span
            class="h-2 w-2 rounded-full animate-pulse"
            :class="row.isActive ? 'bg-emerald-500' : 'bg-amber-500'"
          />
          <span>{{ row.isActive ? 'Enabled' : 'Disabled' }}</span>
        </span>
      </template>
      
      <template #actions="{ row }">
        <div class="flex gap-1">
          <button 
            v-if="canUpdatePolicy"
            @click="handleEditRule(row)"
            class="icon-btn text-[rgb(var(--text-muted))] hover:text-indigo-500"
            title="Edit policy"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button 
            v-if="canDeletePolicy"
            @click="confirmDelete(row)"
            class="icon-btn text-[rgb(var(--text-muted))] hover:text-red-500"
            title="Delete policy"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </template>
    </UiTable>

    <!-- Create Modal -->
    <RuleFormModal
      v-model="showCreateModal"
      title="Create Policy"
      submit-label="Create Policy"
      :loading="loading"
      :is-validating="isValidating"
      :validation-errors="validationErrors"
      :validation-warnings="validationWarnings"
      :policy-cursor-pos="policyCursorPos"
      :monaco-options="monacoEditor.options"
      :form-state="newRule"
      :on-policy-editor-load="onPolicyEditorLoad"
      :on-policy-marker-changes="onPolicyMarkerChanges"
      :format-validation-message="formatValidationMessage"
      @submit="handleCreateRule"
      @cancel="handleCancelCreate"
    />

    <!-- Template Selector Modal -->
    <UiModal v-model="showTemplateModal" title="Policy Templates" size="lg">
      <div v-if="templatesLoading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
      <div v-else-if="templates.length === 0" class="text-center py-8 text-[rgb(var(--text-muted))]">
        No templates available
      </div>
      <div v-else class="space-y-6 max-h-[70vh] overflow-y-auto">
        <div v-for="(categoryTemplates, category) in groupedTemplates" :key="category" class="space-y-3">
          <h3 class="text-sm font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wide border-b border-[rgb(var(--border))] pb-2">
            {{ category }}
          </h3>
          <div class="space-y-3">
            <div 
              v-for="template in categoryTemplates" 
              :key="template.id"
              class="p-4 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] hover:border-indigo-400 transition-colors"
            >
              <div class="space-y-3">
                <div>
                  <h4 class="font-semibold text-[rgb(var(--text))] mb-1">{{ template.title }}</h4>
                  <p class="text-sm text-[rgb(var(--text-muted))] mb-3">{{ template.description }}</p>
                </div>
                <div class="rounded bg-[rgb(var(--surface))] border border-[rgb(var(--border))] max-h-32 overflow-y-auto">
                  <UiShikiCode :code="template.policy" lang="cedar-policy" />
                </div>
                <div class="flex justify-end pt-2 border-t border-[rgb(var(--border))]">
                  <UiButton 
                    v-if="canCreatePolicy"
                    size="sm" 
                    @click="useTemplate(template)"
                  >
                    Use Template
                  </UiButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UiButton variant="outline" @click="showTemplateModal = false">
            Close
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Edit Modal -->
    <RuleFormModal
      v-model="showEditModal"
      title="Edit Policy"
      submit-label="Update Policy"
      :loading="loading"
      :is-validating="isValidating"
      :validation-errors="validationErrors"
      :validation-warnings="validationWarnings"
      :policy-cursor-pos="policyCursorPos"
      :monaco-options="monacoEditor.options"
      :form-state="newRule"
      :on-policy-editor-load="onPolicyEditorLoad"
      :on-policy-marker-changes="onPolicyMarkerChanges"
      :format-validation-message="formatValidationMessage"
      @submit="handleUpdateRule"
      @cancel="handleCancelEdit"
    />

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Delete Policy" size="sm">
      <div class="space-y-4">
        <div class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
          <p class="text-sm text-red-700 dark:text-red-300">
            Are you sure you want to delete this policy? This action cannot be undone.
          </p>
        </div>
        <div class="flex gap-3 justify-end">
          <UiButton variant="outline" @click="showDeleteModal = false">
            Cancel
          </UiButton>
          <UiButton variant="danger" :loading="loading" @click="handleDeleteRule">
            Delete
          </UiButton>
        </div>
      </div>
    </UiModal>

      <!-- AI Policy Chat Modal -->
      <AIPolicyChatModal v-model="showAIChatModal" />
    </template>
  </div>
</template>

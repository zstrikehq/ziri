<script setup lang="ts">
import { useRoles, type RoleItem } from '~/composables/useRoles'
import { useToast } from '~/composables/useToast'
import { useApiError } from '~/composables/useApiError'
import { useInternalAuth } from '~/composables/useInternalAuth'

definePageMeta({
  layout: 'default'
})

const { roles, loading, loadRoles, createRole, deleteRole } = useRoles()
const toast = useToast()
const { getUserMessage } = useApiError()
const { checkActions } = useInternalAuth()

const permissionsLoading = ref(true)
const canCreateRole = ref(false)
const canDeleteRole = ref(false)

const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const newRoleId = ref('')
const roleToDelete = ref<RoleItem | null>(null)
const isCreating = ref(false)
const isDeleting = ref(false)

const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(20)
const totalRoles = ref(0)
const sortBy = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

const debouncedSearchQuery = useDebounce(searchQuery, 300)

const columns = [
  { key: 'id', header: 'Role ID', sortable: true },
  { key: 'usageCount', header: 'Used by', sortable: false },
  { key: 'actions', header: '', class: 'w-24' }
]

const fetchRoles = async () => {
  try {
    const result = await loadRoles({
      search: debouncedSearchQuery.value || undefined,
      limit: itemsPerPage.value,
      offset: (currentPage.value - 1) * itemsPerPage.value,
      usage: true,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })
    totalRoles.value = result.total || 0
  } catch (e: any) {
    toast.error(getUserMessage(e))
  }
}

const handleSort = (newSortBy: string | null, newSortOrder: 'asc' | 'desc' | null) => {
  sortBy.value = newSortBy
  sortOrder.value = newSortOrder
  currentPage.value = 1
}

const handleCreate = async () => {
  const id = newRoleId.value?.trim()
  if (!id) {
    toast.error('Role ID is required')
    return
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    toast.error('Role ID can only contain letters, numbers, underscores and hyphens')
    return
  }
  isCreating.value = true
  try {
    await createRole(id)
    toast.success('Role created')
    showCreateModal.value = false
    newRoleId.value = ''
    await fetchRoles()
  } catch (e: any) {
    toast.error(getUserMessage(e))
  } finally {
    isCreating.value = false
  }
}

const openDeleteModal = (role: RoleItem) => {
  roleToDelete.value = role
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!roleToDelete.value) return
  isDeleting.value = true
  try {
    await deleteRole(roleToDelete.value.id)
    toast.success('Role deleted')
    showDeleteModal.value = false
    roleToDelete.value = null
    await fetchRoles()
    const total = totalRoles.value
    const maxIndex = (currentPage.value - 1) * itemsPerPage.value
    if (currentPage.value > 1 && maxIndex >= total) {
      currentPage.value = currentPage.value - 1
    }
  } catch (e: any) {
    toast.error(getUserMessage(e))
  } finally {
    isDeleting.value = false
  }
}

watch([debouncedSearchQuery, currentPage, itemsPerPage, sortBy, sortOrder], () => {
  fetchRoles()
})

onMounted(async () => {
  permissionsLoading.value = true
  try {
    const permissions = await checkActions([
      { action: 'create_role', resourceType: 'roles' },
      { action: 'delete_role', resourceType: 'roles' }
    ])
    canCreateRole.value = permissions.results.find(r => r.action === 'create_role')?.allowed ?? false
    canDeleteRole.value = permissions.results.find(r => r.action === 'delete_role')?.allowed ?? false
  } finally {
    permissionsLoading.value = false
  }
  await fetchRoles()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4" v-if="roles.length > 0 || searchQuery">
      <div class="flex-1 flex items-center gap-3">
        <div class="relative flex-1 max-w-md">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search by role ID..."
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
      </div>
      <UiButton
        v-if="canCreateRole && !permissionsLoading"
        @click="showCreateModal = true"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Role
      </UiButton>
    </div>

    <!-- Empty toolbar -->
    <div
      class="flex items-center justify-end gap-4"
      v-if="roles.length === 0 && !loading && !searchQuery"
    >
      <UiButton
        v-if="canCreateRole && !permissionsLoading"
        @click="showCreateModal = true"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Role
      </UiButton>
    </div>

    <UiTable
      :columns="columns"
      :data="roles"
      :loading="loading"
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      :total-items="totalRoles"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :empty-message="searchQuery ? 'No roles match your search criteria.' : 'No roles yet. Create one to assign to users.'"
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
      @update:sort="handleSort"
    >
      <template #id="{ value }">
        <code class="px-2 py-0.5 rounded bg-[rgb(var(--surface-elevated))] text-[rgb(var(--text))] font-mono text-sm">{{ value }}</code>
      </template>
      <template #usageCount="{ row }">
        <span v-if="row.usageCount !== undefined" class="text-[rgb(var(--text-muted))]">
          {{ row.usageCount }} user{{ row.usageCount === 1 ? '' : 's' }}
        </span>
        <span v-else class="text-[rgb(var(--text-muted))]">-</span>
      </template>
        <template #actions="{ row }">
          <UiButton
            v-if="canDeleteRole"
            variant="ghost"
            size="sm"
            class="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            :disabled="(row.usageCount ?? 0) > 0"
            @click="openDeleteModal(row)"
            title="Delete Role"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </UiButton>
          <span
            v-else-if="(row.usageCount ?? 0) > 0"
            class="text-xs text-[rgb(var(--text-muted))]"
          >
            In use
          </span>
        </template>
        <template #empty-action>
          <UiButton
            v-if="canCreateRole && !searchQuery"
            @click="showCreateModal = true"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Role
          </UiButton>
        </template>
    </UiTable>
  </div>

  <UiModal v-model="showCreateModal" title="Create role">
    <form @submit.prevent="handleCreate" class="flex flex-col gap-4 max-h-[min(70vh,360px)]">
      <div class="flex-1 overflow-y-auto space-y-3 pr-1">
        <div>
          <label class="block text-sm font-medium text-[rgb(var(--text))] mb-1">Role ID</label>
          <input
            v-model="newRoleId"
            type="text"
            placeholder="e.g. editor, viewer"
            class="w-full px-3 py-2 rounded-lg border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-lime-400"
            autocomplete="off"
          />
          <p class="text-xs text-[rgb(var(--text-muted))] mt-1">
            Letters, numbers, underscores and hyphens only.
          </p>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2 border-t border-[rgb(var(--border))]">
        <UiButton type="button" variant="outline" @click="showCreateModal = false">Cancel</UiButton>
        <UiButton type="submit" :disabled="isCreating">Create</UiButton>
      </div>
    </form>
  </UiModal>

  <UiModal v-model="showDeleteModal" title="Delete role">
    <div v-if="roleToDelete" class="space-y-4">
      <p class="text-sm text-[rgb(var(--text))]">
        Are you sure you want to delete role
        <code class="px-1.5 py-0.5 rounded bg-[rgb(var(--surface-elevated))] font-mono">{{ roleToDelete.id }}</code>?
      </p>
      <p v-if="(roleToDelete.usageCount ?? 0) > 0" class="text-xs text-amber-600 dark:text-amber-400">
        This role is used by {{ roleToDelete.usageCount }} user(s). Reassign or remove the role from those users first.
      </p>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" @click="showDeleteModal = false">Cancel</UiButton>
        <UiButton
          variant="danger"
          :disabled="(roleToDelete.usageCount ?? 0) > 0"
          :loading="isDeleting"
          @click="handleDelete"
        >
          Delete Role
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>

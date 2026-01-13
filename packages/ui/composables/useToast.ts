import { ref, reactive } from 'vue'

interface Toast {
    id: number
    type: 'success' | 'error' | 'info' | 'warning'
    message: string
}

const toasts = reactive<Toast[]>([])
let toastId = 0

export function useToast() {
    const add = (type: Toast['type'], message: string, duration = 3000) => {
        const id = ++toastId
        toasts.push({ id, type, message })

        if (duration > 0) {
            setTimeout(() => {
                remove(id)
            }, duration)
        }

        return id
    }

    const remove = (id: number) => {
        const index = toasts.findIndex(t => t.id === id)
        if (index !== -1) {
            toasts.splice(index, 1)
        }
    }

    const success = (message: string) => add('success', message)
    const error = (message: string) => add('error', message, 5000)
    const info = (message: string) => add('info', message)
    const warning = (message: string) => add('warning', message, 4000)

    return {
        toasts,
        add,
        remove,
        success,
        error,
        info,
        warning
    }
}

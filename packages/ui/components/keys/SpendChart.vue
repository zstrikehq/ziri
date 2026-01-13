<script setup lang="ts">
import { Line, Bar } from 'vue-chartjs'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
)

interface Props {
  type: 'line' | 'bar'
  data: { labels: string[], values: number[] }
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue'
})

const colorMap = {
  blue: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgb(59, 130, 246)' },
  green: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgb(34, 197, 94)' },
  purple: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgb(168, 85, 247)' }
}

const chartData = computed(() => ({
  labels: props.data.labels,
  datasets: [
    {
      data: props.data.values,
      backgroundColor: colorMap[props.color as keyof typeof colorMap]?.bg || colorMap.blue.bg,
      borderColor: colorMap[props.color as keyof typeof colorMap]?.border || colorMap.blue.border,
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 4
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: { size: 10 },
      bodyFont: { size: 10 },
      padding: 8,
      displayColors: false,
      callbacks: {
        label: (context: any) => `$${context.parsed.y.toFixed(2)}`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { 
        font: { size: 9 },
        color: '#9CA3AF'
      }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(156, 163, 175, 0.1)' },
      ticks: { 
        font: { size: 9 },
        color: '#9CA3AF',
        callback: (value: number) => `$${value}`
      }
    }
  }
}
</script>

<template>
  <div class="h-40">
    <Line v-if="type === 'line'" :data="chartData" :options="chartOptions" />
    <Bar v-else :data="chartData" :options="chartOptions" />
  </div>
</template>

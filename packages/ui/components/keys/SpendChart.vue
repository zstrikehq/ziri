<script setup lang="ts">
import { Line, Bar, Pie } from 'vue-chartjs'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js'
import { CATEGORICAL_COLOR_MAP, LINE_COLOR_MAP, type ChartColorKey } from '~/constants/chart-colors'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
)

interface Props {
  type: 'line' | 'bar' | 'pie'
  data: { labels: string[], values: number[] }
  color?: ChartColorKey
  tone?: 'solid' | 'outlined'
  fillArea?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'lime',
  tone: 'solid',
  fillArea: true
})

const activeColorMap = computed(() => (
  LINE_COLOR_MAP[props.tone]
))

const activeCategoricalColors = computed(() => (
  CATEGORICAL_COLOR_MAP[props.tone]
))

const chartData = computed(() => ({
  labels: props.data.labels,
  datasets: [
    {
      data: props.data.values,
      backgroundColor: props.type === 'pie'
        ? props.data.values.map((_, idx) => activeCategoricalColors.value[idx % activeCategoricalColors.value.length].bg)
        : props.type === 'bar'
          ? props.data.values.map((_, idx) => activeCategoricalColors.value[idx % activeCategoricalColors.value.length].bg)
          : activeColorMap.value[props.color as keyof typeof activeColorMap.value]?.bg || activeColorMap.value.lime.bg,
      borderColor: props.type === 'line'
        ? activeColorMap.value[props.color as keyof typeof activeColorMap.value]?.border || activeColorMap.value.lime.border
        : 'rgba(0, 0, 0, 0)',
      borderWidth: props.type === 'line' ? 2 : 0,
      fill: props.type === 'line' ? props.fillArea : props.type !== 'pie',
      tension: props.type === 'line' ? 0.4 : 0,
      pointRadius: props.type === 'line' ? 2 : 0,
      pointHoverRadius: props.type === 'line' ? 4 : 0,
      pointBackgroundColor: props.type === 'line'
        ? activeColorMap.value[props.color as keyof typeof activeColorMap.value]?.border || activeColorMap.value.lime.border
        : undefined,
      pointBorderColor: 'rgba(0, 0, 0, 0)',
      pointBorderWidth: 0
    }
  ]
}))

const chartOptions = computed(() => {
  if (props.type === 'pie') {
    return {
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
          callbacks: {
            label: (context: any) => {
              const value = Number(context.raw || 0)
              const total = context.dataset.data.reduce((sum: number, item: number) => sum + item, 0)
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
              return `${context.label}: ${pct}%`
            }
          }
        }
      }
    }
  }

  return {
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
})
</script>

<template>
  <div class="h-40">
    <Line v-if="type === 'line'" :data="chartData" :options="chartOptions" />
    <Bar v-else-if="type === 'bar'" :data="chartData" :options="chartOptions" />
    <Pie v-else :data="chartData" :options="chartOptions" />
  </div>
</template>

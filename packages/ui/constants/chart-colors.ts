export type ChartTone = 'solid' | 'outlined'
export type ChartColorKey = 'lime' | 'blue' | 'green' | 'purple'

export interface ChartColorPair {
  bg: string
  border: string
}

export const LINE_COLOR_MAP: Record<ChartTone, Record<ChartColorKey, ChartColorPair>> = {
  solid: {
    lime: { bg: 'rgba(250, 204, 21, 0.22)', border: 'rgb(202, 138, 4)' },
    blue: { bg: 'rgba(59, 130, 246, 0.22)', border: 'rgb(29, 78, 216)' },
    green: { bg: 'rgba(244, 63, 94, 0.22)', border: 'rgb(190, 24, 93)' },
    purple: { bg: 'rgba(139, 92, 246, 0.22)', border: 'rgb(109, 40, 217)' }
  },
  outlined: {
    lime: { bg: 'rgba(250, 204, 21, 0.12)', border: 'rgb(161, 98, 7)' },
    blue: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgb(30, 64, 175)' },
    green: { bg: 'rgba(244, 63, 94, 0.12)', border: 'rgb(159, 18, 57)' },
    purple: { bg: 'rgba(139, 92, 246, 0.12)', border: 'rgb(91, 33, 182)' }
  }
}

export const CATEGORICAL_COLOR_MAP: Record<ChartTone, ChartColorPair[]> = {
  solid: [
    { bg: 'rgba(29, 111, 234, 0.78)', border: 'rgb(14, 78, 184)' },   // blue
    { bg: 'rgba(255, 86, 48, 0.78)', border: 'rgb(191, 38, 0)' },     // orange-red
    { bg: 'rgba(255, 171, 0, 0.78)', border: 'rgb(179, 111, 0)' },    // yellow
    { bg: 'rgba(54, 179, 126, 0.78)', border: 'rgb(0, 135, 90)' },    // green
    { bg: 'rgba(0, 184, 217, 0.78)', border: 'rgb(0, 123, 145)' },    // cyan
    { bg: 'rgba(101, 84, 192, 0.78)', border: 'rgb(64, 50, 148)' },   // purple
    { bg: 'rgba(255, 116, 195, 0.76)', border: 'rgb(191, 38, 128)' }, // pink
    { bg: 'rgba(0, 82, 204, 0.78)', border: 'rgb(7, 71, 166)' }       // deep blue
  ],
  outlined: [
    { bg: 'rgba(29, 111, 234, 0.20)', border: 'rgb(14, 78, 184)' },   // blue
    { bg: 'rgba(255, 86, 48, 0.20)', border: 'rgb(191, 38, 0)' },     // orange-red
    { bg: 'rgba(255, 171, 0, 0.20)', border: 'rgb(179, 111, 0)' },    // yellow
    { bg: 'rgba(54, 179, 126, 0.20)', border: 'rgb(0, 135, 90)' },    // green
    { bg: 'rgba(0, 184, 217, 0.20)', border: 'rgb(0, 123, 145)' },    // cyan
    { bg: 'rgba(101, 84, 192, 0.20)', border: 'rgb(64, 50, 148)' },   // purple
    { bg: 'rgba(255, 116, 195, 0.20)', border: 'rgb(191, 38, 128)' }, // pink
    { bg: 'rgba(0, 82, 204, 0.20)', border: 'rgb(7, 71, 166)' }       // deep blue
  ]
}

export const TOP_MODEL_PROGRESS_COLORS = CATEGORICAL_COLOR_MAP.solid.map((entry) => entry.bg)

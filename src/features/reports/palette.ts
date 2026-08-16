/** Categorical chart palette (validated for CVD & contrast in both modes). Fixed order, never cycled. */
import { useTheme } from '@/shared/theme/ThemeProvider'

const LIGHT = ['#0f8f7a', '#d97706', '#4f6bd8', '#c2557f', '#7a9a1f', '#8b6cd6']
const DARK = ['#1fa38c', '#c4821c', '#6f88e0', '#d66d99', '#7f9f22', '#9a80e0']

export function useChartPalette(): string[] {
  const { resolved } = useTheme()
  return resolved === 'dark' ? DARK : LIGHT
}
export const OTHER_COLOR = 'var(--c-line-strong)'

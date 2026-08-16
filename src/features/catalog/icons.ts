import {
  Activity, Baby, Bone, Brain, Bug, CircleDot, Dna, Ear, Eye, FlaskConical, Folder, HeartPulse, Microscope, Pill, Smile, Stethoscope, Syringe, TestTubes,
  type LucideIcon,
} from 'lucide-react'
import type { WorkflowKind } from '@/domain'

/** Small curated set of lucide icons a clinic admin can pick for a category. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  FlaskConical, Bug, Microscope, Dna, TestTubes, Smile, CircleDot, Stethoscope, HeartPulse, Pill, Syringe, Activity, Baby, Eye, Ear, Bone, Brain,
}
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS)
export const categoryIcon = (name?: string): LucideIcon => (name && CATEGORY_ICONS[name]) || Folder

/** Preset colour swatches (presentational only, stored as hex on the category). */
export const COLOR_SWATCHES = ['#0f7a6b', '#5b8def', '#e6a23c', '#c2413f', '#8b5cf6', '#0ea5e9', '#2f8a4c', '#d9569b']

export const WORKFLOWS: WorkflowKind[] = ['lab', 'consultation', 'procedure', 'inpatient', 'pharmacy']

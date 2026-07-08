import { parseAllSessions } from '../parser.js'
import type { DateRange } from '../types.js'
import { evaluateSessions } from './git-success.js'
import { buildInsights, summarizeEffectiveness, summarizeProjects } from './insights.js'
import type { JarvisReport } from './types.js'

export type { JarvisReport } from './types.js'

export async function buildJarvisReport(range: DateRange): Promise<JarvisReport> {
  const projects = await parseAllSessions(range, 'claude')
  const sessions = await evaluateSessions(projects)
  const effectiveness = summarizeEffectiveness(sessions)
  const projectRows = summarizeProjects(sessions)
  return {
    generated: new Date().toISOString(),
    effectiveness,
    projects: projectRows,
    insights: buildInsights(sessions, effectiveness, projectRows),
  }
}

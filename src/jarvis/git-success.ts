import { execFile } from 'child_process'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { basename, join } from 'path'
import { promisify } from 'util'

import type { ProjectSummary, SessionSummary } from '../types.js'
import type { EvaluatedSession, SessionVerdict } from './types.js'

const execFileAsync = promisify(execFile)

// ADR-0003: a commit survives until the next session in the same repo or 48h,
// whichever comes first. Slack around the session window absorbs commits made
// moments after the last recorded API call (e.g. a manual `git commit` right
// after Claude finishes).
const REVERT_WINDOW_MS = 48 * 60 * 60 * 1000
const WINDOW_SLACK_MS = 5 * 60 * 1000

const STATE_DIR = process.env['JARVIS_STATE_DIR'] ?? join(homedir(), '.config', 'jarvis')
const VERDICTS_FILE = join(STATE_DIR, 'verdicts.json')

type StoredVerdict = { verdict: SessionVerdict; commitCount: number }
type VerdictStore = { version: 1; sessions: Record<string, StoredVerdict> }

async function loadStore(): Promise<VerdictStore> {
  try {
    const parsed = JSON.parse(await readFile(VERDICTS_FILE, 'utf8')) as VerdictStore
    if (parsed && parsed.version === 1 && parsed.sessions) return parsed
  } catch {
    /* first run or corrupt file — start fresh */
  }
  return { version: 1, sessions: {} }
}

async function saveStore(store: VerdictStore): Promise<void> {
  try {
    await mkdir(STATE_DIR, { recursive: true })
    await writeFile(VERDICTS_FILE, JSON.stringify(store))
  } catch {
    /* cache only — evaluation still works without it */
  }
}

async function git(repo: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', repo, ...args], {
      timeout: 10_000,
      maxBuffer: 4 * 1024 * 1024,
    })
    return stdout
  } catch {
    return null
  }
}

const repoCheckCache = new Map<string, Promise<boolean>>()

function isGitRepo(path: string): Promise<boolean> {
  let hit = repoCheckCache.get(path)
  if (!hit) {
    hit = git(path, ['rev-parse', '--is-inside-work-tree']).then((out) => out?.trim() === 'true')
    repoCheckCache.set(path, hit)
  }
  return hit
}

async function commitsInWindow(repo: string, startISO: string, endISO: string): Promise<string[]> {
  const since = new Date(new Date(startISO).getTime() - WINDOW_SLACK_MS).toISOString()
  const until = new Date(new Date(endISO).getTime() + WINDOW_SLACK_MS).toISOString()
  const out = await git(repo, ['log', '--all', `--since=${since}`, `--until=${until}`, '--format=%H'])
  if (!out) return []
  return out.split('\n').filter(Boolean)
}

// Standard `git revert` writes "This reverts commit <sha>." into the body, so
// a later commit whose message mentions the sha marks it reverted. History
// rewrites (rebase/reset) are not treated as reverts — the work usually
// survives under a new sha.
async function isReverted(repo: string, sha: string, afterISO: string, deadlineISO: string): Promise<boolean> {
  const out = await git(repo, ['log', '--all', `--since=${afterISO}`, `--until=${deadlineISO}`, `--grep=${sha}`, '--format=%H'])
  return !!out && out.trim().length > 0
}

function hasCodeActivity(session: SessionSummary): boolean {
  return session.turns.some((t) => t.hasEdits)
}

function revertDeadline(session: SessionSummary, sameRepoSessions: SessionSummary[]): number {
  const end = new Date(session.lastTimestamp).getTime()
  let deadline = end + REVERT_WINDOW_MS
  for (const other of sameRepoSessions) {
    const otherStart = new Date(other.firstTimestamp).getTime()
    if (otherStart > end && otherStart < deadline) deadline = otherStart
  }
  return deadline
}

export async function evaluateSessions(projects: ProjectSummary[]): Promise<EvaluatedSession[]> {
  const store = await loadStore()
  const results: EvaluatedSession[] = []
  let storeDirty = false

  for (const project of projects) {
    // Subagent transcripts are slices of a parent session; scoring them would
    // double-count the same commits.
    const sessions = project.sessions.filter((s) => !s.agentType)
    const repoOk = project.projectPath ? await isGitRepo(project.projectPath) : false
    // Prefer the real directory name over the sanitized ~/.claude slug
    // (-Users-me-Projects-foo) the parser falls back to.
    const displayName = project.projectPath?.includes('/') || project.projectPath?.includes('\\')
      ? basename(project.projectPath)
      : project.project

    for (const session of sessions) {
      const base = {
        sessionId: session.sessionId,
        project: displayName,
        projectPath: project.projectPath,
        startISO: session.firstTimestamp,
        endISO: session.lastTimestamp,
        costUSD: session.totalCostUSD,
      }

      if (!repoOk) {
        results.push({ ...base, verdict: 'no_repo', final: true, commitCount: 0 })
        continue
      }
      if (!hasCodeActivity(session)) {
        results.push({ ...base, verdict: 'chat', final: true, commitCount: 0 })
        continue
      }

      const cached = store.sessions[session.sessionId]
      if (cached) {
        results.push({ ...base, verdict: cached.verdict, final: true, commitCount: cached.commitCount })
        continue
      }

      const commits = await commitsInWindow(project.projectPath, session.firstTimestamp, session.lastTimestamp)
      const deadlineMs = revertDeadline(session, sessions)
      const windowClosed = Date.now() >= deadlineMs

      let verdict: SessionVerdict
      if (commits.length === 0) {
        verdict = 'no_commit'
      } else {
        const deadlineISO = new Date(deadlineMs).toISOString()
        let reverted = false
        for (const sha of commits) {
          if (await isReverted(project.projectPath, sha, session.lastTimestamp, deadlineISO)) {
            reverted = true
            break
          }
        }
        verdict = reverted ? 'reverted' : 'success'
      }

      // Only closed windows are immutable; a provisional success can still
      // flip to reverted, so it is re-evaluated next time.
      const final = windowClosed || verdict === 'reverted'
      if (final) {
        store.sessions[session.sessionId] = { verdict, commitCount: commits.length }
        storeDirty = true
      }
      results.push({ ...base, verdict, final, commitCount: commits.length })
    }
  }

  if (storeDirty) await saveStore(store)
  return results
}

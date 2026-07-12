import Foundation

/// Quantas sessões de hoje "aterrissaram" (tiveram commit dentro da janela
/// de trabalho) contra quantas editaram arquivo mas não geraram commit.
///
/// Simplificação da Fase 3 nativa vs a versão TypeScript (ver
/// docs/adr/0007): aqui só checamos "existe commit na janela?" — sem a
/// janela de revert de 48h nem o estado "pendente" (ver src/jarvis/git-success.ts
/// pra versão completa). Suficiente pra provar o conceito; se um commit for
/// revertido depois, esse número não vai refletir isso ainda.
struct EffectivenessResult {
    let evaluated: Int
    let landed: Int
}

enum GitEffectiveness {
    /// `async`: cada sessão dispara seu próprio `git log` ao mesmo tempo
    /// (não um esperando o outro terminar). `withTaskGroup` é o jeito do
    /// Swift de dizer "roda essas N tarefas em paralelo e junta o
    /// resultado quando todas terminarem" — antes eram 6 repos x ~1.2s
    /// cada, um atrás do outro (~7.5s); em paralelo, o tempo total fica
    /// perto do repo mais lento sozinho, não da soma de todos.
    static func todaySummary() async -> EffectivenessResult {
        let sessions = ClaudeSessions.today().filter { $0.hasEdits }

        let results = await withTaskGroup(of: Bool.self) { group in
            for session in sessions {
                group.addTask {
                    hasCommitInWindow(repoPath: session.cwd, start: session.firstTimestamp, end: session.lastTimestamp)
                }
            }
            var landedFlags: [Bool] = []
            for await landed in group {
                landedFlags.append(landed)
            }
            return landedFlags
        }

        return EffectivenessResult(evaluated: results.count, landed: results.filter { $0 }.count)
    }

    // `Process` é a API do Foundation pra rodar outro programa e ler a
    // saída — o mesmo conceito de "spawn" que o Echo já usa pra chamar o
    // whisper-cli. Aqui rodamos `git log` na pasta da sessão e olhamos se
    // veio algum commit no intervalo de tempo da sessão (com folga de 5min
    // pra cada lado, igual a versão TypeScript). `nonisolated`: essa função
    // não toca em nada de UI, então pode rodar fora da main thread — é o
    // que permite o paralelismo acima de verdade (senão o @MainActor da
    // AppDelegate forçaria tudo de volta pra uma thread só).
    private static func hasCommitInWindow(repoPath: String, start: Date, end: Date) -> Bool {
        let slack: TimeInterval = 5 * 60
        let since = ISO8601DateFormatter().string(from: start.addingTimeInterval(-slack))
        let until = ISO8601DateFormatter().string(from: end.addingTimeInterval(slack))

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/git")
        process.arguments = ["-C", repoPath, "log", "--all", "--since=\(since)", "--until=\(until)", "--format=%H"]

        let outputPipe = Pipe()
        process.standardOutput = outputPipe
        process.standardError = Pipe() // silencia "not a git repository" etc.

        do {
            try process.run()
        } catch {
            return false
        }
        process.waitUntilExit()

        guard process.terminationStatus == 0 else { return false }
        let data = outputPipe.fileHandleForReading.readDataToEndOfFile()
        let text = String(data: data, encoding: .utf8) ?? ""
        return !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

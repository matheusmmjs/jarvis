import AppKit
import Foundation

// Atalho de debug pra medir o tempo do cálculo isolado, sem abrir menu
// nenhum — mesmo padrão do Echo (`swift run Echo --test-stt`). Roda com:
//   swift run Jarvis --bench
if CommandLine.arguments.contains("--bench") {
    let start = Date()
    let sessions = ClaudeSessions.today()
    let parseElapsed = Date().timeIntervalSince(start)
    let editSessions = sessions.filter { $0.hasEdits }.count

    let gitStart = Date()
    let effectiveness = await GitEffectiveness.todaySummary()
    let gitElapsed = Date().timeIntervalSince(gitStart)

    print("Sessões de hoje: \(sessions.count) (com edição: \(editSessions))")
    print("Parse JSONL: \(String(format: "%.2f", parseElapsed))s")
    print("Checagem git (\(effectiveness.evaluated) repos): \(String(format: "%.2f", gitElapsed))s")
    print("Total: \(String(format: "%.2f", parseElapsed + gitElapsed))s")
    exit(0)
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate

// .accessory = agente de menu bar: sem ícone no Dock, sem janela principal.
app.setActivationPolicy(.accessory)

app.run()

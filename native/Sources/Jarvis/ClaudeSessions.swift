import Foundation

// Preço por token, em dólar, pra cada modelo — mesmos números que o Jarvis
// TypeScript usa (src/data/litellm-snapshot.json). MVP: só os 3 modelos
// Claude que o usuário realmente usa hoje; modelo desconhecido = custo
// zero (simplificação consciente, ver ADR-0007 — evita portar a tabela
// LiteLLM inteira só pra Fase 2).
private struct ModelPricing {
    let input: Double
    let output: Double
    let cacheWrite: Double
    let cacheRead: Double
}

private let pricing: [String: ModelPricing] = [
    "claude-sonnet-5": ModelPricing(input: 3e-6, output: 1.5e-5, cacheWrite: 3.75e-6, cacheRead: 3e-7),
    "claude-opus-4-8": ModelPricing(input: 5e-6, output: 2.5e-5, cacheWrite: 6.25e-6, cacheRead: 5e-7),
    "claude-haiku-4-5-20251001": ModelPricing(input: 1e-6, output: 5e-6, cacheWrite: 1.25e-6, cacheRead: 1e-7),
]

// Ferramentas que contam como "editou arquivo" — mesmo conceito do
// `hasEdits` no parser TypeScript (src/parser.ts), só que lá vem de uma
// classificação de turno inteira; aqui, pra MVP, olhamos direto se algum
// tool_use da sessão usou uma dessas ferramentas.
private let editToolNames: Set<String> = ["Edit", "Write", "MultiEdit"]

private struct JournalEntry: Codable {
    struct ContentBlock: Codable {
        let type: String
        let name: String?
    }
    struct Message: Codable {
        struct Usage: Codable {
            let input_tokens: Int?
            let output_tokens: Int?
            let cache_creation_input_tokens: Int?
            let cache_read_input_tokens: Int?
        }
        let id: String?
        let model: String?
        let usage: Usage?
        let content: [ContentBlock]?
    }
    let timestamp: String?
    let cwd: String?
    let sessionId: String?
    let message: Message?
}

/// Uma sessão de código de hoje, já agregada: quanto custou, quando
/// começou/terminou, em qual pasta, e se editou arquivo.
struct ClaudeSession {
    let sessionId: String
    let cwd: String
    let firstTimestamp: Date
    let lastTimestamp: Date
    let costUSD: Double
    let hasEdits: Bool
}

enum ClaudeSessions {
    /// Lê todos os arquivos JSONL do Claude Code, filtra só as entradas de
    /// hoje (calendário local), e devolve uma sessão agregada por
    /// sessionId. Uma única passada pelo disco — custo e efetividade são
    /// derivados dessa mesma lista depois, sem reler o arquivo.
    static func today() -> [ClaudeSession] {
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let projectsDir = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".claude/projects")

        guard let enumerator = FileManager.default.enumerator(
            at: projectsDir,
            // Pedir includingPropertiesForKeys pro enumerator já deixa a
            // data de modificação em cache no URL (resourceValues), sem
            // custo extra de I/O por arquivo na hora de checar.
            includingPropertiesForKeys: [.contentModificationDateKey]
        ) else { return [] }

        let calendar = Calendar.current

        // Acumuladores por sessionId, montados enquanto lemos as linhas.
        var cwdBySession: [String: String] = [:]
        var firstTsBySession: [String: Date] = [:]
        var lastTsBySession: [String: Date] = [:]
        var hasEditsBySession: [String: Bool] = [:]
        // Custo por (sessionId, message.id) — mesma técnica da Fase 2, só
        // que agora guardamos por sessão também, não um total único.
        var costByMessageId: [String: (session: String, cost: Double)] = [:]

        for case let fileURL as URL in enumerator {
            guard fileURL.pathExtension == "jsonl" else { continue }

            // Arquivo de sessão só é reescrito enquanto a sessão tá ativa
            // (Claude Code faz append). Se a última modificação não foi
            // hoje, é garantido que nenhuma linha dele é de hoje — pula
            // sem nem abrir o arquivo. Isso é o que elimina os 7s: sem
            // isso líamos meses de histórico só pra descartar linha por
            // linha depois.
            let modDate = try? fileURL.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate
            guard let modDate, calendar.isDateInToday(modDate) else { continue }

            guard let data = try? String(contentsOf: fileURL, encoding: .utf8) else { continue }

            for line in data.split(separator: "\n") {
                guard let lineData = line.data(using: .utf8),
                      let entry = try? JSONDecoder().decode(JournalEntry.self, from: lineData),
                      let timestampString = entry.timestamp,
                      let timestamp = isoFormatter.date(from: timestampString),
                      calendar.isDateInToday(timestamp),
                      let sessionId = entry.sessionId
                else { continue }

                if let cwd = entry.cwd, cwdBySession[sessionId] == nil {
                    cwdBySession[sessionId] = cwd
                }
                if firstTsBySession[sessionId] == nil || timestamp < firstTsBySession[sessionId]! {
                    firstTsBySession[sessionId] = timestamp
                }
                if lastTsBySession[sessionId] == nil || timestamp > lastTsBySession[sessionId]! {
                    lastTsBySession[sessionId] = timestamp
                }

                guard let message = entry.message else { continue }

                if let blocks = message.content,
                   blocks.contains(where: { $0.type == "tool_use" && editToolNames.contains($0.name ?? "") }) {
                    hasEditsBySession[sessionId] = true
                }

                guard let model = message.model,
                      let price = pricing[model],
                      let usage = message.usage
                else { continue }

                let cost =
                    Double(usage.input_tokens ?? 0) * price.input +
                    Double(usage.output_tokens ?? 0) * price.output +
                    Double(usage.cache_creation_input_tokens ?? 0) * price.cacheWrite +
                    Double(usage.cache_read_input_tokens ?? 0) * price.cacheRead

                if let id = message.id {
                    costByMessageId["\(sessionId)|\(id)"] = (sessionId, cost)
                } else {
                    // Sem message.id pra dedupar: soma direto na primeira
                    // ocorrência de custo daquela sessão sem streaming.
                    costByMessageId["\(sessionId)|\(UUID().uuidString)"] = (sessionId, cost)
                }
            }
        }

        var costBySession: [String: Double] = [:]
        for (_, entry) in costByMessageId {
            costBySession[entry.session, default: 0] += entry.cost
        }

        return cwdBySession.keys.compactMap { sessionId -> ClaudeSession? in
            guard let cwd = cwdBySession[sessionId],
                  let first = firstTsBySession[sessionId],
                  let last = lastTsBySession[sessionId]
            else { return nil }
            return ClaudeSession(
                sessionId: sessionId,
                cwd: cwd,
                firstTimestamp: first,
                lastTimestamp: last,
                costUSD: costBySession[sessionId] ?? 0,
                hasEdits: hasEditsBySession[sessionId] ?? false
            )
        }
    }
}

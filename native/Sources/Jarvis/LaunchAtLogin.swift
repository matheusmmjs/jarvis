import ServiceManagement

// SMAppService: API moderna do macOS (desde o macOS 13) pra registrar um
// app pra abrir sozinho no login, sem precisar escrever nenhum arquivo de
// configuração na mão (o jeito antigo era criar um .plist em
// ~/Library/LaunchAgents/). `.mainApp` diz "registra este mesmo app", não
// um processo auxiliar separado — é o caso mais simples e é o nosso caso.
// Doc: https://developer.apple.com/documentation/servicemanagement/smappservice
enum LaunchAtLogin {
    static var isEnabled: Bool {
        SMAppService.mainApp.status == .enabled
    }

    /// Liga ou desliga o registro de abrir no login. Lança erro se o
    /// macOS recusar (ex: app rodando de um lugar que o sistema não
    /// confia) — por enquanto só logamos, sem tratar de forma elaborada.
    static func toggle() {
        do {
            if isEnabled {
                try SMAppService.mainApp.unregister()
            } else {
                try SMAppService.mainApp.register()
            }
        } catch {
            debugLog("LaunchAtLogin.toggle falhou: \(error)")
        }
    }
}

// Mesmo padrão de log de debug que o Echo usa (Sources/Echo/DebugLog.swift)
// — imprime no console só quando rodando via `swift run`/Xcode, sem poluir
// nada quando é o .app final rodando sozinho.
func debugLog(_ message: String) {
    #if DEBUG
    print("[Jarvis] \(message)")
    #endif
}

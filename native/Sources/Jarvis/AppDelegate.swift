import AppKit

// NSApplicationDelegate: o "ponto de entrada" real de um app AppKit depois
// que o NSApplication sobe.
// NSMenuDelegate: nos avisa quando o menu tá prestes a abrir — é o gancho
// certo pra recalcular os números na hora, em vez de só uma vez no boot.
// Mais barato que um timer rodando em background: só computa quando você
// de fato clica no ícone.
// @MainActor: tudo que é UI no AppKit só pode ser tocado na thread
// principal — marcar a classe garante isso em tempo de compilação.
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private var statusItem: NSStatusItem!
    private var effectivenessItem: NSMenuItem!
    private var costItem: NSMenuItem!
    private var loginItem: NSMenuItem!

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        statusItem.button?.image = NSImage(
            systemSymbolName: "gauge.medium",
            accessibilityDescription: "Jarvis"
        )

        let menu = NSMenu()
        menu.delegate = self

        effectivenessItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        menu.addItem(effectivenessItem)

        costItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        menu.addItem(costItem)

        menu.addItem(.separator())

        loginItem = NSMenuItem(
            title: "Abrir no login",
            action: #selector(toggleLaunchAtLogin),
            keyEquivalent: ""
        )
        loginItem.target = self
        menu.addItem(loginItem)

        menu.addItem(NSMenuItem(
            title: "Sair",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        ))
        statusItem.menu = menu

        Task { await refresh() }
    }

    // Chamado automaticamente pelo AppKit toda vez que você clica no
    // ícone, antes do menu aparecer na tela.
    // Doc: https://developer.apple.com/documentation/appkit/nsmenudelegate/menuwillopen(_:)
    func menuWillOpen(_ menu: NSMenu) {
        // `Task { }` dispara o trabalho e devolve o controle na hora — o
        // menu aparece imediatamente com o valor antigo, e os itens se
        // atualizam sozinhos assim que o `await` terminar (NSMenuItem
        // aceita trocar o texto com o menu já aberto na tela).
        Task { await refresh() }
    }

    private func refresh() async {
        // GitEffectiveness.todaySummary() é `async` (roda os `git log` em
        // paralelo, fora da main thread) — por isso essa função também
        // precisa ser `async`, e o `await` aqui é o ponto onde a
        // AppDelegate "libera" a main thread até o resultado ficar pronto,
        // em vez de travar a UI esperando.
        let sessions = ClaudeSessions.today()
        let cost = sessions.reduce(0) { $0 + $1.costUSD }
        let effectiveness = await GitEffectiveness.todaySummary()

        effectivenessItem.attributedTitle = styledLine(
            bold: "\(effectiveness.landed) de \(effectiveness.evaluated)",
            rest: " sessões aterrissaram hoje"
        )
        costItem.attributedTitle = styledLine(
            bold: String(format: "$%.2f", cost),
            rest: "Gasto hoje: ",
            boldFirst: false
        )
        loginItem.state = LaunchAtLogin.isEnabled ? .on : .off
    }

    /// Monta um texto onde um pedaço vem em negrito e o resto em cinza —
    /// só hierarquia por peso da fonte, sem cor (preferência do usuário:
    /// "não gosto de colorido").
    private func styledLine(bold: String, rest: String, boldFirst: Bool = true) -> NSAttributedString {
        let boldPart = NSAttributedString(string: bold, attributes: [
            .font: NSFont.boldSystemFont(ofSize: 13),
            .foregroundColor: NSColor.labelColor,
        ])
        let restPart = NSAttributedString(string: rest, attributes: [
            .font: NSFont.systemFont(ofSize: 13),
            .foregroundColor: NSColor.secondaryLabelColor,
        ])
        let result = NSMutableAttributedString()
        if boldFirst {
            result.append(boldPart)
            result.append(restPart)
        } else {
            result.append(restPart)
            result.append(boldPart)
        }
        return result
    }

    @objc private func toggleLaunchAtLogin(_ sender: NSMenuItem) {
        LaunchAtLogin.toggle()
        sender.state = LaunchAtLogin.isEnabled ? .on : .off
    }
}

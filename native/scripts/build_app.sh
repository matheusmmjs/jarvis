#!/bin/bash
# Empacota o executável do SwiftPM num .app de verdade.
#
# Por quê: SwiftPM sozinho só gera um binário solto (.build/*/Jarvis). O
# macOS exige um bundle .app com Info.plist pra você conseguir dar
# duplo-clique nele como qualquer app (e pro Finder/Spotlight reconhecerem
# como um app de verdade, não um arquivo executável qualquer).
#
# Diferente do Echo: o Jarvis não pede Microfone nem Accessibility (só lê
# arquivo e roda `git log`, nenhum dos dois é protegido pelo TCC), então
# não precisa de identidade de assinatura estável no Keychain — assinatura
# "ad-hoc" (-) basta pra rodar localmente na sua própria máquina.
set -euo pipefail

CONFIG="${1:-debug}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="Jarvis"
APP_BUNDLE="$ROOT_DIR/$APP_NAME.app"

echo "==> Building ($CONFIG)..."
if [ "$CONFIG" = "release" ]; then
    swift build -c release --package-path "$ROOT_DIR"
    BIN_PATH="$ROOT_DIR/.build/release/$APP_NAME"
else
    swift build --package-path "$ROOT_DIR"
    BIN_PATH="$ROOT_DIR/.build/debug/$APP_NAME"
fi

echo "==> Montando $APP_BUNDLE ..."
rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

cp "$BIN_PATH" "$APP_BUNDLE/Contents/MacOS/$APP_NAME"
cp "$ROOT_DIR/Resources/Info.plist" "$APP_BUNDLE/Contents/Info.plist"

codesign --force --deep --sign - "$APP_BUNDLE"

echo "==> Pronto: $APP_BUNDLE"

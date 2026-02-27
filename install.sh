#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Blacksmith CLI — One-Line Installer
# curl -fsSL https://raw.githubusercontent.com/EolaFam1828/Blacksmith-Claude/main/install.sh | bash
# ─────────────────────────────────────────────

REPO_URL="https://github.com/EolaFam1828/Blacksmith-Claude.git"
INSTALL_DIR="${BLACKSMITH_INSTALL_DIR:-$HOME/.local/share/blacksmith-cli}"
MIN_NODE_MAJOR=25

# ── Colors ──────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}[+]${RESET} $1"; }
info() { echo -e "${CYAN}[*]${RESET} $1"; }
warn() { echo -e "${YELLOW}[!]${RESET} $1"; }
fail() { echo -e "${RED}[-]${RESET} $1"; exit 1; }

# ── Banner ──────────────────────────────────
echo -e "${CYAN}${BOLD}"
cat << 'BANNER'

  ██████╗ ██╗      █████╗  ██████╗██╗  ██╗███████╗███╗   ███╗██╗████████╗██╗  ██╗
  ██╔══██╗██║     ██╔══██╗██╔════╝██║ ██╔╝██╔════╝████╗ ████║██║╚══██╔══╝██║  ██║
  ██████╔╝██║     ███████║██║     █████╔╝ ███████╗██╔████╔██║██║   ██║   ███████║
  ██╔══██╗██║     ██╔══██║██║     ██╔═██╗ ╚════██║██║╚██╔╝██║██║   ██║   ██╔══██║
  ██████╔╝███████╗██║  ██║╚██████╗██║  ██╗███████║██║ ╚═╝ ██║██║   ██║   ██║  ██║
  ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝   ╚═╝   ╚═╝  ╚═╝

  Agents that build agents.

BANNER
echo -e "${RESET}"

# ── Required: Node.js >=25 ──────────────────
if ! command -v node &>/dev/null; then
  fail "Node.js is not installed. Install Node.js >= ${MIN_NODE_MAJOR}: https://nodejs.org"
fi

NODE_VERSION=$(node -v | sed 's/^v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  fail "Node.js ${NODE_VERSION} found, but >= ${MIN_NODE_MAJOR}.x is required. Upgrade: https://nodejs.org"
fi
ok "Node.js ${NODE_VERSION}"

# ── Required: npm ───────────────────────────
if ! command -v npm &>/dev/null; then
  fail "npm is not installed. It ships with Node.js: https://nodejs.org"
fi
ok "npm $(npm -v)"

# ── Required: git ───────────────────────────
if ! command -v git &>/dev/null; then
  fail "git is not installed. Install: https://git-scm.com"
fi
ok "git $(git --version | awk '{print $3}')"

# ── Optional: ollama ────────────────────────
if command -v ollama &>/dev/null; then
  ok "ollama found (local models available)"
else
  warn "ollama not found — local models will be unavailable. Install: https://ollama.ai"
fi

# ── Optional: gh ────────────────────────────
if command -v gh &>/dev/null; then
  ok "gh CLI found (GitHub operations available)"
else
  warn "gh CLI not found — GitHub operations will be unavailable. Install: https://cli.github.com"
fi

# ── Optional: gemini ────────────────────────
if command -v gemini &>/dev/null; then
  ok "gemini CLI found"
else
  warn "gemini CLI not found — Gemini backend will be unavailable"
fi

echo ""

# ── Clone or update ─────────────────────────
if [ -d "$INSTALL_DIR" ]; then
  info "Existing installation found at ${INSTALL_DIR}"
  info "Updating via git pull --ff-only..."
  cd "$INSTALL_DIR"
  git pull --ff-only || fail "Update failed. Resolve conflicts or delete ${INSTALL_DIR} and re-run."
  ok "Updated to latest"
else
  info "Cloning Blacksmith to ${INSTALL_DIR}..."
  git clone "$REPO_URL" "$INSTALL_DIR" || fail "Clone failed. Check your network and GitHub access."
  ok "Cloned successfully"
  cd "$INSTALL_DIR"
fi

# ── Install dependencies ────────────────────
info "Installing dependencies..."
npm install --production || fail "npm install failed"
ok "Dependencies installed"

# ── Link globally ───────────────────────────
info "Linking blacksmith globally..."
npm link || fail "npm link failed. You may need sudo or to configure npm prefix."
ok "Linked: $(which blacksmith 2>/dev/null || echo 'blacksmith')"

# ── Bootstrap home ──────────────────────────
info "Initializing ~/.blacksmith/..."
blacksmith brain init >/dev/null 2>&1 || warn "brain init had warnings (non-fatal)"
ok "Home directory bootstrapped"

echo ""
echo -e "${GREEN}${BOLD}Blacksmith installed successfully!${RESET}"
echo ""
echo -e "  Run ${CYAN}blacksmith${RESET}         — launch the interactive TUI"
echo -e "  Run ${CYAN}blacksmith ask <task>${RESET} — quick one-shot query"
echo -e "  Run ${CYAN}blacksmith --help${RESET}    — see all commands"
echo ""

#Requires -Version 5.1
<#
.SYNOPSIS
    Blacksmith CLI — Windows Installer
.DESCRIPTION
    One-line install: irm https://raw.githubusercontent.com/EolaFam1828/Blacksmith-Claude/main/install.ps1 | iex
#>

$ErrorActionPreference = 'Stop'

$RepoUrl = 'https://github.com/EolaFam1828/Blacksmith-Claude.git'
$InstallDir = if ($env:BLACKSMITH_INSTALL_DIR) { $env:BLACKSMITH_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'blacksmith-cli' }
$MinNodeMajor = 25

# ── Helpers ─────────────────────────────────
function Write-Ok   { param([string]$Msg) Write-Host "[+] $Msg" -ForegroundColor Green }
function Write-Info { param([string]$Msg) Write-Host "[*] $Msg" -ForegroundColor Cyan }
function Write-Warn { param([string]$Msg) Write-Host "[!] $Msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$Msg) Write-Host "[-] $Msg" -ForegroundColor Red; exit 1 }

# ── Banner ──────────────────────────────────
Write-Host ''
Write-Host '  ██████╗ ██╗      █████╗  ██████╗██╗  ██╗███████╗███╗   ███╗██╗████████╗██╗  ██╗' -ForegroundColor Cyan
Write-Host '  ██╔══██╗██║     ██╔══██╗██╔════╝██║ ██╔╝██╔════╝████╗ ████║██║╚══██╔══╝██║  ██║' -ForegroundColor Cyan
Write-Host '  ██████╔╝██║     ███████║██║     █████╔╝ ███████╗██╔████╔██║██║   ██║   ███████║' -ForegroundColor Cyan
Write-Host '  ██╔══██╗██║     ██╔══██║██║     ██╔═██╗ ╚════██║██║╚██╔╝██║██║   ██║   ██╔══██║' -ForegroundColor Cyan
Write-Host '  ██████╔╝███████╗██║  ██║╚██████╗██║  ██╗███████║██║ ╚═╝ ██║██║   ██║   ██║  ██║' -ForegroundColor Cyan
Write-Host '  ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝   ╚═╝   ╚═╝  ╚═╝' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Agents that build agents.' -ForegroundColor Cyan
Write-Host ''

# ── Required: Node.js >=25 ──────────────────
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Fail 'Node.js is not installed. Install Node.js >= 25: https://nodejs.org'
}

$nodeVersion = (node -v) -replace '^v', ''
$nodeMajor = [int]($nodeVersion -split '\.')[0]

if ($nodeMajor -lt $MinNodeMajor) {
    Write-Fail "Node.js $nodeVersion found, but >= $MinNodeMajor.x is required. Upgrade: https://nodejs.org"
}
Write-Ok "Node.js $nodeVersion"

# ── Required: npm ───────────────────────────
$npmPath = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmPath) {
    Write-Fail 'npm is not installed. It ships with Node.js: https://nodejs.org'
}
$npmVersion = npm -v
Write-Ok "npm $npmVersion"

# ── Required: git ───────────────────────────
$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath) {
    Write-Fail 'git is not installed. Install: https://git-scm.com'
}
$gitVersion = (git --version) -replace 'git version\s*', ''
Write-Ok "git $gitVersion"

# ── Optional: ollama ────────────────────────
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    Write-Ok 'ollama found (local models available)'
} else {
    Write-Warn 'ollama not found — local models will be unavailable. Install: https://ollama.ai'
}

# ── Optional: gh ────────────────────────────
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Ok 'gh CLI found (GitHub operations available)'
} else {
    Write-Warn 'gh CLI not found — GitHub operations will be unavailable. Install: https://cli.github.com'
}

# ── Optional: gemini ────────────────────────
if (Get-Command gemini -ErrorAction SilentlyContinue) {
    Write-Ok 'gemini CLI found'
} else {
    Write-Warn 'gemini CLI not found — Gemini backend will be unavailable'
}

Write-Host ''

# ── Clone or update ─────────────────────────
if (Test-Path $InstallDir) {
    Write-Info "Existing installation found at $InstallDir"
    Write-Info 'Updating via git pull --ff-only...'
    Push-Location $InstallDir
    try {
        git pull --ff-only
        if ($LASTEXITCODE -ne 0) { throw 'git pull failed' }
        Write-Ok 'Updated to latest'
    } catch {
        Pop-Location
        Write-Fail "Update failed. Resolve conflicts or delete $InstallDir and re-run."
    }
} else {
    Write-Info "Cloning Blacksmith to $InstallDir..."
    git clone $RepoUrl $InstallDir
    if ($LASTEXITCODE -ne 0) {
        Write-Fail 'Clone failed. Check your network and GitHub access.'
    }
    Write-Ok 'Cloned successfully'
    Push-Location $InstallDir
}

# ── Install dependencies ────────────────────
Write-Info 'Installing dependencies...'
npm install --production
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Fail 'npm install failed'
}
Write-Ok 'Dependencies installed'

# ── Link globally ───────────────────────────
Write-Info 'Linking blacksmith globally...'
npm link
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Fail 'npm link failed. Try running PowerShell as Administrator.'
}
Write-Ok 'Linked globally'

# ── Bootstrap home ──────────────────────────
Write-Info 'Initializing ~/.blacksmith/...'
try {
    blacksmith brain init 2>$null | Out-Null
    Write-Ok 'Home directory bootstrapped'
} catch {
    Write-Warn 'brain init had warnings (non-fatal)'
}

Pop-Location

Write-Host ''
Write-Host 'Blacksmith installed successfully!' -ForegroundColor Green
Write-Host ''
Write-Host '  Run ' -NoNewline; Write-Host 'blacksmith' -ForegroundColor Cyan -NoNewline; Write-Host '          — launch the interactive TUI'
Write-Host '  Run ' -NoNewline; Write-Host 'blacksmith ask <task>' -ForegroundColor Cyan -NoNewline; Write-Host ' — quick one-shot query'
Write-Host '  Run ' -NoNewline; Write-Host 'blacksmith --help' -ForegroundColor Cyan -NoNewline; Write-Host '     — see all commands'
Write-Host ''

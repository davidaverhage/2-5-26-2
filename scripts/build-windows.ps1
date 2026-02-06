<#
.SYNOPSIS
    Build and run Wagic the Homebrew on Windows.

.DESCRIPTION
    Automates cloning, building, and running Wagic on Windows.
    Requires Visual Studio 2019/2022 with C++ Desktop workload installed.

.PARAMETER Action
    One of: deps, build, run, all (default: all)

.EXAMPLE
    .\scripts\build-windows.ps1
    .\scripts\build-windows.ps1 -Action build
#>

param(
    [ValidateSet("deps", "build", "run", "all")]
    [string]$Action = "all"
)

$ErrorActionPreference = "Stop"

$RootDir   = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$WagicDir  = Join-Path $RootDir "wagic"
$CoreUrl   = "https://github.com/WagicProject/wagic/releases/download/wagic-v0.25.5/Wagic-core-0255.zip"
$WinUrl    = "https://github.com/WagicProject/wagic/releases/download/wagic-v0.25.5/Wagic-windows.zip"
$WagicRepo = "https://github.com/WagicProject/wagic.git"

function Write-Info  { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Err   { param($msg) Write-Host "[ERR]   $msg" -ForegroundColor Red }

function Install-Deps {
    Write-Info "Checking dependencies..."

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Err "git is not installed. Please install Git for Windows: https://git-scm.com/download/win"
        exit 1
    }

    # Check for Visual Studio MSBuild
    $msbuild = $null
    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vsWhere) {
        $installPath = & $vsWhere -latest -products * -requires Microsoft.Component.MSBuild -find "MSBuild\**\Bin\MSBuild.exe" | Select-Object -First 1
        if ($installPath) { $msbuild = $installPath }
    }

    if (-not $msbuild) {
        Write-Err "MSBuild not found. Install Visual Studio 2019/2022 with the 'Desktop development with C++' workload."
        Write-Info "Download: https://visualstudio.microsoft.com/downloads/"
        exit 1
    }

    Write-Ok "Dependencies satisfied (git + MSBuild found)."
}

function Clone-Source {
    if (Test-Path (Join-Path $WagicDir ".git")) {
        Write-Info "Wagic source already cloned. Pulling latest..."
        Push-Location $WagicDir
        git pull --ff-only 2>$null
        git lfs pull 2>$null
        Pop-Location
    } else {
        Write-Info "Cloning Wagic source..."
        git clone --depth 1 $WagicRepo $WagicDir
        Push-Location $WagicDir
        git lfs pull 2>$null
        Pop-Location
    }
    Write-Ok "Source ready at $WagicDir"
}

function Build-Wagic {
    Clone-Source

    Write-Info "Building Wagic with MSBuild (Release)..."

    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    $msbuild = & $vsWhere -latest -products * -requires Microsoft.Component.MSBuild -find "MSBuild\**\Bin\MSBuild.exe" | Select-Object -First 1

    if (-not $msbuild) {
        Write-Err "MSBuild not found."
        exit 1
    }

    $slnPath = Join-Path $WagicDir "projects\mtg\mtg_vs2010.sln"
    if (-not (Test-Path $slnPath)) {
        Write-Err "Solution file not found at $slnPath"
        exit 1
    }

    & $msbuild $slnPath /p:Configuration=Release /p:Platform=Win32 /m /verbosity:minimal
    Write-Ok "Build complete."
}

function Download-Core {
    $resDir = Join-Path $WagicDir "projects\mtg\bin\Res"
    if ((Test-Path $resDir) -and (Get-ChildItem $resDir -ErrorAction SilentlyContinue).Count -gt 0) {
        Write-Info "Resource directory already populated."
        return
    }

    Write-Info "Downloading Wagic core resources..."
    $coreZip = Join-Path $RootDir "Wagic-core.zip"
    if (-not (Test-Path $coreZip)) {
        Invoke-WebRequest -Uri $CoreUrl -OutFile $coreZip -UseBasicParsing
    }
    New-Item -ItemType Directory -Path $resDir -Force | Out-Null
    Expand-Archive -Path $coreZip -DestinationPath $resDir -Force
    Write-Ok "Core resources extracted to $resDir"
}

function Download-Prebuilt {
    Write-Info "Downloading pre-built Windows release..."
    $winZip  = Join-Path $RootDir "Wagic-windows.zip"
    $winDir  = Join-Path $RootDir "wagic-windows"

    if (-not (Test-Path $winZip)) {
        Invoke-WebRequest -Uri $WinUrl -OutFile $winZip -UseBasicParsing
    }
    if (-not (Test-Path $winDir)) {
        Expand-Archive -Path $winZip -DestinationPath $winDir -Force
    }
    Write-Ok "Pre-built release extracted to $winDir"
    return $winDir
}

function Run-Wagic {
    # Try built binary first
    $binDir = Join-Path $WagicDir "projects\mtg\bin"
    $exe    = Join-Path $binDir "Release\wagic.exe"

    if (-not (Test-Path $exe)) {
        $exe = Join-Path $binDir "wagic.exe"
    }

    if (-not (Test-Path $exe)) {
        Write-Info "Built binary not found. Falling back to pre-built release..."
        $winDir = Download-Prebuilt
        $exe = Get-ChildItem -Path $winDir -Recurse -Filter "wagic.exe" | Select-Object -First 1 -ExpandProperty FullName
        if (-not $exe) {
            Write-Err "wagic.exe not found in pre-built release."
            exit 1
        }
    } else {
        Download-Core
    }

    Write-Info "Launching Wagic..."
    & $exe
}

switch ($Action) {
    "deps"  { Install-Deps }
    "build" { Install-Deps; Build-Wagic }
    "run"   { Run-Wagic }
    "all"   {
        Install-Deps
        Build-Wagic
        Run-Wagic
    }
}

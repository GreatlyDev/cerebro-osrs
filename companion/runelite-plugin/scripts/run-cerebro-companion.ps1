$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$gradle = Join-Path $repoRoot "gradlew.bat"
$gradleHome = Join-Path $repoRoot ".gradle-home"
$gradleTmp = Join-Path $repoRoot ".gradle-tmp"

if (-not (Test-Path $gradle)) {
    throw "Gradle wrapper not found at $gradle"
}

New-Item -ItemType Directory -Force -Path $gradleHome | Out-Null
New-Item -ItemType Directory -Force -Path $gradleTmp | Out-Null

$env:GRADLE_USER_HOME = $gradleHome
$env:TEMP = $gradleTmp
$env:TMP = $gradleTmp
$env:GRADLE_OPTS = "-Djava.io.tmpdir=$gradleTmp"

Write-Host ""
Write-Host "Starting the Cerebro RuneLite companion dev client..." -ForegroundColor Cyan
Write-Host "Backend should usually be running at http://127.0.0.1:8000" -ForegroundColor DarkGray
Write-Host ""

Push-Location $repoRoot
try {
    & $gradle runLocalClient
}
finally {
    Pop-Location
}

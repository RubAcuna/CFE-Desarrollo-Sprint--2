param([string]$Credencial)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:NODE_OPTIONS = '--preserve-symlinks --preserve-symlinks-main'
if (-not $Credencial -and (Test-Path -LiteralPath '.servidor.json')) {
    $serverConfig = Get-Content -Raw -LiteralPath '.servidor.json' | ConvertFrom-Json
    $Credencial = $serverConfig.credentialPath
}
if ($Credencial) {
    $credentialPath = (Resolve-Path -LiteralPath $Credencial).Path
    if ($credentialPath.StartsWith($PSScriptRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'Guarda la credencial fuera de la carpeta del sitio y del repositorio.'
    }
    $credentialInfo = Get-Content -Raw -LiteralPath $credentialPath | ConvertFrom-Json
    if ($credentialInfo.type -ne 'service_account' -or $credentialInfo.project_id -ne 'robotech-8afa0') {
        throw 'La credencial debe pertenecer al proyecto robotech-8afa0.'
    }
    $env:GOOGLE_APPLICATION_CREDENTIALS = $credentialPath
}
if (-not $env:GOOGLE_APPLICATION_CREDENTIALS) {
    Write-Warning 'Sin credencial administrativa: se abrirá la página, pero no se habilitará la gestión de usuarios y productos.'
}
if (-not (Test-Path -LiteralPath 'scripts\node_modules\firebase-admin')) {
    & npm.cmd ci --prefix scripts --ignore-scripts
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }
}
Write-Host 'Conexión real: robotech-8afa0. Comprobando  servicio.'
& node scripts/iniciar-servidores.cjs

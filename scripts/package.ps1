param(
    [Parameter(Mandatory)][string]$BrowserResult,
    [Parameter(Mandatory)][string]$UnitResult
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectRoot
try {
    & node scripts/verify-browser.mjs $BrowserResult
    if ($LASTEXITCODE -ne 0) { throw 'La evidencia de navegador no está vigente.' }
    & node scripts/verify-unit.mjs $UnitResult
    if ($LASTEXITCODE -ne 0) { throw 'La evidencia unitaria no está vigente.' }

    $build = Get-Content -LiteralPath dist/build-manifest.json -Raw | ConvertFrom-Json
    $destination = Join-Path $projectRoot ('output/packages/' + $build.buildId)
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    $archivePath = Join-Path $destination 'Everett-reconstruccion-0.7.5.zip'
    if (Test-Path -LiteralPath $archivePath) { throw 'Ya existe un paquete para este build.' }

    $directories = @('src', 'tests', 'scripts', 'docs', 'dist', 'output/rebuild-0.7.5',
        (Split-Path -Parent $BrowserResult), (Split-Path -Parent $UnitResult))
    $files = @('AGENTS.md', 'Everett-0.7.5.html', 'index.html', 'package.json', 'package-lock.json',
        'tsconfig.json', 'playwright.config.ts', '.gitignore', '.gitattributes', '.prettierignore')
    $files += @(Get-ChildItem -LiteralPath $projectRoot -File -Filter '*prettier*' |
        ForEach-Object { $_.Name })
    foreach ($directory in $directories) {
        $files += @(Get-ChildItem -LiteralPath $directory -File -Recurse |
            ForEach-Object { [IO.Path]::GetRelativePath($projectRoot, $_.FullName) })
    }
    $entries = @($files | Sort-Object -Unique | ForEach-Object {
        $absolute = (Resolve-Path -LiteralPath $_).Path
        $relative = [IO.Path]::GetRelativePath($projectRoot, $absolute).Replace('\', '/')
        if ($relative.StartsWith('../') -or [IO.Path]::IsPathRooted($relative)) {
            throw "Archivo fuera del proyecto: $relative"
        }
        [ordered]@{
            path = $relative
            bytes = (Get-Item -LiteralPath $absolute).Length
            sha256 = (Get-FileHash -LiteralPath $absolute -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    })
    $inventory = [ordered]@{
        version = $build.version
        buildId = $build.buildId
        artifactSha256 = $build.sha256
        browserResult = $BrowserResult.Replace('\', '/')
        unitResult = $UnitResult.Replace('\', '/')
        report = 'output/rebuild-0.7.5/estado.md'
        files = $entries
    }
    $zip = [IO.Compression.ZipFile]::Open($archivePath, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($entry in $entries) {
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip, (Join-Path $projectRoot $entry.path), $entry.path,
                [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
        $stream = $zip.CreateEntry('package-manifest.json').Open()
        $writer = [IO.StreamWriter]::new($stream, [Text.UTF8Encoding]::new($false))
        try { $writer.Write(($inventory | ConvertTo-Json -Depth 8)) }
        finally { $writer.Dispose() }
    }
    finally { $zip.Dispose() }

    $zip = [IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        if ($zip.Entries.Count -ne $entries.Count + 1) { throw 'Inventario del ZIP inconsistente.' }
        foreach ($entry in $entries) {
            $compressed = $zip.GetEntry($entry.path)
            if (-not $compressed -or $compressed.Length -ne $entry.bytes) {
                throw "Archivo ausente o tamaño incorrecto: $($entry.path)"
            }
            $stream = $compressed.Open()
            try { $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)).ToLowerInvariant() }
            finally { $stream.Dispose() }
            if ($hash -ne $entry.sha256) { throw "Contenido incorrecto: $($entry.path)" }
        }
    }
    finally { $zip.Dispose() }
    $result = [ordered]@{
        archive = $archivePath
        bytes = (Get-Item -LiteralPath $archivePath).Length
        sha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
        verifiedEntries = $entries.Count
        artifactSha256 = $build.sha256
    }
    $result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destination 'verification.json') -Encoding utf8
    $result | ConvertTo-Json
}
finally { Pop-Location }

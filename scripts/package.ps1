param(
    [Parameter(Mandatory)][string]$BrowserResult,
    [Parameter(Mandatory)][string]$UnitResult
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
function Remove-GeneratedDirectory([string]$Path) {
    $target = [IO.Path]::GetFullPath($Path)
    $outputRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'output')) + [IO.Path]::DirectorySeparatorChar
    if (-not $target.StartsWith($outputRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Limpieza fuera de output: $target"
    }
    $cursor = $target
    while ($cursor -ne $projectRoot) {
        if (Test-Path -LiteralPath $cursor) {
            if ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "La limpieza rechaza enlaces: $cursor"
            }
        }
        $cursor = Split-Path -Parent $cursor
    }
    if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
}

$staging = Join-Path $projectRoot 'output/paquete-en-preparacion'
$destination = Join-Path $projectRoot 'output/paquete'
$lock = $null
$lockPath = Join-Path $projectRoot 'output/empaquetando.lock'
Push-Location -LiteralPath $projectRoot
try {
    New-Item -ItemType Directory -Path (Join-Path $projectRoot 'output') -Force | Out-Null
    $lock = [IO.File]::Open($lockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    foreach ($kind in @('unitarias', 'navegador')) {
        if (Test-Path -LiteralPath ('output/pruebas/' + $kind + '/en-curso.json')) {
            throw "Las pruebas de $kind siguen en curso."
        }
    }
    & node scripts/report.mjs $BrowserResult $UnitResult
    if ($LASTEXITCODE -ne 0) { throw 'La evidencia y el informe no están vigentes.' }

    $build = Get-Content -LiteralPath dist/build-manifest.json -Raw | ConvertFrom-Json
    $reviewPath = 'output/revision/' + $build.version + '/revision.md'
    if (-not (Test-Path -LiteralPath $reviewPath -PathType Leaf)) {
        throw "Falta la revisión visual y de alcance: $reviewPath"
    }
    $deliveryReport = 'output/informe'
    Remove-GeneratedDirectory $staging
    New-Item -ItemType Directory -Path $staging | Out-Null
    $archiveName = 'Everett-' + $build.version + '.zip'
    $archivePath = Join-Path $staging $archiveName

    $directories = @('src', 'tests', 'scripts', 'docs', 'dist', ('output/revision/' + $build.version),
        (Split-Path -Parent $BrowserResult), (Split-Path -Parent $UnitResult), $deliveryReport)
    $files = @('AGENTS.md', 'TAREAS.md', 'Everett-0.7.5.html', 'index.html', 'package.json', 'package-lock.json',
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
        report = $deliveryReport + '/informe.md'
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
        archive = $archiveName
        bytes = (Get-Item -LiteralPath $archivePath).Length
        sha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
        verifiedEntries = $entries.Count
        artifactSha256 = $build.sha256
    }
    $result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $staging 'verificacion.json') -Encoding utf8
    Remove-GeneratedDirectory $destination
    Move-Item -LiteralPath $staging -Destination $destination
    $result | ConvertTo-Json
}
finally {
    if ($lock) {
        try { Remove-GeneratedDirectory $staging }
        finally {
            $lock.Dispose()
            Remove-Item -LiteralPath $lockPath
        }
    }
    Pop-Location
}

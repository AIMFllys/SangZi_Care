param(
    [string]$DestinationDirectory = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$Arguments = @(),
        [switch]$Capture
    )

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = @(& $FilePath @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }

    $textOutput = @($output | ForEach-Object { $_.ToString() })
    if ($exitCode -ne 0) {
        $textOutput | ForEach-Object { Write-Host $_ }
        throw "External command failed (exit $exitCode): $([IO.Path]::GetFileName($FilePath)) $($Arguments -join ' ')"
    }
    if ($Capture) {
        return $textOutput
    }
    $textOutput | ForEach-Object { Write-Host $_ }
}

function Read-KeyValueFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    $values = @{}
    if (!(Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $values
    }
    foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
        $trimmed = $line.Trim()
        if (!$trimmed -or $trimmed.StartsWith('#')) { continue }
        $separator = $line.IndexOf('=')
        if ($separator -lt 1) { continue }
        $key = $line.Substring(0, $separator).Trim()
        $value = $line.Substring($separator + 1).Trim()
        $values[$key] = $value
    }
    return $values
}

function Find-BuildToolsDirectory {
    param([Parameter(Mandatory = $true)][string]$AndroidHome)

    $root = Join-Path $AndroidHome 'build-tools'
    if (!(Test-Path -LiteralPath $root -PathType Container)) {
        throw "Android build-tools directory was not found: $root"
    }
    $preferred = Join-Path $root '34.0.0'
    if (Test-Path -LiteralPath $preferred -PathType Container) {
        return $preferred
    }
    $candidates = @(Get-ChildItem -LiteralPath $root -Directory | Where-Object {
        $_.Name -match '^\d+\.\d+\.\d+$'
    } | Sort-Object { [version]$_.Name } -Descending)
    if ($candidates.Count -eq 0) {
        throw 'No stable Android build-tools version was found.'
    }
    return $candidates[0].FullName
}

function Assert-Apk {
    param(
        [Parameter(Mandatory = $true)][string]$ApkPath,
        [Parameter(Mandatory = $true)][string]$Zipalign,
        [Parameter(Mandatory = $true)][string]$Apksigner,
        [Parameter(Mandatory = $true)][string]$Aapt
    )

    $null = @(Invoke-Native -FilePath $Zipalign -Arguments @(
        '-c', '-v', '4', $ApkPath
    ) -Capture)
    $signature = @(Invoke-Native -FilePath $Apksigner -Arguments @(
        'verify', '--verbose', '--print-certs', $ApkPath
    ) -Capture)
    $badging = @(Invoke-Native -FilePath $Aapt -Arguments @('dump', 'badging', $ApkPath) -Capture)
    $permissions = @(Invoke-Native -FilePath $Aapt -Arguments @('dump', 'permissions', $ApkPath) -Capture)
    $manifest = @(Invoke-Native -FilePath $Aapt -Arguments @(
        'dump', 'xmltree', $ApkPath, 'AndroidManifest.xml'
    ) -Capture)
    $resources = @(Invoke-Native -FilePath $Aapt -Arguments @(
        'dump', '--values', 'resources', $ApkPath
    ) -Capture)

    $badgingText = $badging -join "`n"
    $permissionText = $permissions -join "`n"
    $manifestText = $manifest -join "`n"
    $resourceText = $resources -join "`n"
    $signatureText = $signature -join "`n"

    if ($badgingText -notmatch "package: name='com\.sangzi\.smartcare'") {
        throw 'APK package is not com.sangzi.smartcare.'
    }
    if ($permissionText -match 'android\.permission\.CALL_PHONE') {
        throw 'APK must not contain android.permission.CALL_PHONE.'
    }
    if ($manifestText -notmatch 'usesCleartextTraffic.*0x0') {
        throw 'Release APK does not explicitly disable cleartext traffic.'
    }
    if ($manifestText -match 'networkSecurityConfig') {
        throw 'Release APK unexpectedly contains a Debug network security exception.'
    }
    if ($resourceText -notmatch 'https://sangzicare\.husteread\.com') {
        throw 'APK resources do not contain the production URL.'
    }

    $versionMatch = [regex]::Match(
        $badgingText,
        "versionCode='(?<versionCode>[^']+)' versionName='(?<versionName>[^']+)'"
    )
    if (!$versionMatch.Success) { throw 'Unable to read versionCode/versionName from APK.' }
    $signerMatch = [regex]::Match(
        $signatureText,
        'Signer #1 certificate SHA-256 digest:\s*(?<signer>[0-9a-fA-F]+)'
    )
    if (!$signerMatch.Success) { throw 'Unable to read signer certificate SHA-256 digest.' }

    return [pscustomobject]@{
        versionCode = $versionMatch.Groups['versionCode'].Value
        versionName = $versionMatch.Groups['versionName'].Value
        signer = $signerMatch.Groups['signer'].Value.ToLowerInvariant()
    }
}

$androidRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = Split-Path -Parent $androidRoot
$gradleWrapper = Join-Path $androidRoot 'gradlew.bat'
$mainStrings = Join-Path $androidRoot 'app\src\main\res\values\strings.xml'
$propertiesPath = Join-Path $androidRoot 'keystore.properties'

if (!(Test-Path -LiteralPath $gradleWrapper -PathType Leaf)) {
    throw "Gradle Wrapper is missing: $gradleWrapper"
}
if (!$env:ANDROID_HOME -or !(Test-Path -LiteralPath $env:ANDROID_HOME -PathType Container)) {
    throw 'ANDROID_HOME is not configured or does not exist.'
}
$java = (Get-Command java.exe -ErrorAction Stop).Source
$git = (Get-Command git.exe -ErrorAction Stop).Source
$sourceStatus = @(Invoke-Native -FilePath $git -Arguments @(
    '-C', $repositoryRoot, 'status', '--porcelain'
) -Capture)
if ($sourceStatus.Count -gt 0) {
    throw 'Release APK builds require a clean Git working tree, including tracked and untracked files.'
}
$sourceCommit = @(Invoke-Native -FilePath $git -Arguments @(
    '-C', $repositoryRoot, 'rev-parse', 'HEAD'
) -Capture)[0].Trim()
$javaVersion = @(Invoke-Native -FilePath $java -Arguments @('-version') -Capture) -join "`n"
if ($javaVersion -notmatch 'version "17\.') {
    throw 'Release APK builds require JDK 17.'
}

[xml]$stringsDocument = Get-Content -LiteralPath $mainStrings -Raw -Encoding UTF8
$baseUrl = @($stringsDocument.resources.string | Where-Object {
    $_.name -eq 'app_base_url'
})[0].'#text'
if ($baseUrl -ne 'https://sangzicare.husteread.com') {
    throw 'Production app_base_url must be https://sangzicare.husteread.com.'
}

$properties = Read-KeyValueFile -Path $propertiesPath
$signingInputs = [ordered]@{
    storeFile = if ($properties['storeFile']) { $properties['storeFile'] } else { $env:SANGZI_STORE_FILE }
    storePassword = if ($properties['storePassword']) { $properties['storePassword'] } else { $env:SANGZI_STORE_PASSWORD }
    keyAlias = if ($properties['keyAlias']) { $properties['keyAlias'] } else { $env:SANGZI_KEY_ALIAS }
    keyPassword = if ($properties['keyPassword']) { $properties['keyPassword'] } else { $env:SANGZI_KEY_PASSWORD }
}
$missingInputs = @($signingInputs.Keys | Where-Object {
    [string]::IsNullOrWhiteSpace([string]$signingInputs[$_])
})
if ($missingInputs.Count -gt 0) {
    throw "Release signing configuration is missing: $($missingInputs -join ', ')."
}
$storeFile = [string]$signingInputs['storeFile']
$resolvedStoreFile = if ([IO.Path]::IsPathRooted($storeFile)) {
    $storeFile
} else {
    Join-Path $androidRoot $storeFile
}
if (!(Test-Path -LiteralPath $resolvedStoreFile -PathType Leaf)) {
    throw 'Release keystore file does not exist.'
}

$buildTools = Find-BuildToolsDirectory -AndroidHome $env:ANDROID_HOME
$zipalign = Join-Path $buildTools 'zipalign.exe'
$apksigner = Join-Path $buildTools 'apksigner.bat'
$aapt = Join-Path $buildTools 'aapt.exe'
foreach ($tool in @($zipalign, $apksigner, $aapt)) {
    if (!(Test-Path -LiteralPath $tool -PathType Leaf)) {
        throw "Android SDK tool is missing: $tool"
    }
}

Push-Location $androidRoot
try {
    Invoke-Native -FilePath $gradleWrapper -Arguments @(
        '--no-daemon', '--console', 'plain',
        'clean', 'lintRelease', 'testReleaseUnitTest',
        'validateSigningRelease', 'assembleRelease'
    )
} finally {
    Pop-Location
}

$sourceApk = Join-Path $androidRoot 'app\build\outputs\apk\release\app-release.apk'
if (!(Test-Path -LiteralPath $sourceApk -PathType Leaf)) {
    throw "Signed Release APK does not exist: $sourceApk"
}
$sourceMetadata = Assert-Apk -ApkPath $sourceApk -Zipalign $zipalign `
    -Apksigner $apksigner -Aapt $aapt

if ([string]::IsNullOrWhiteSpace($DestinationDirectory)) {
    $DestinationDirectory = Join-Path $androidRoot 'app\release'
} elseif (![IO.Path]::IsPathRooted($DestinationDirectory)) {
    $DestinationDirectory = Join-Path $androidRoot $DestinationDirectory
}
[void](New-Item -ItemType Directory -Path $DestinationDirectory -Force)
$destinationApk = Join-Path $DestinationDirectory (
    "sangzi-smart-care-$($sourceMetadata.versionName)-$($sourceMetadata.versionCode)-release.apk"
)
Copy-Item -LiteralPath $sourceApk -Destination $destinationApk -Force
$copiedMetadata = Assert-Apk -ApkPath $destinationApk -Zipalign $zipalign `
    -Apksigner $apksigner -Aapt $aapt
if ($copiedMetadata.signer -ne $sourceMetadata.signer) {
    throw 'Copied APK signer digest changed.'
}

$apkHash = (Get-FileHash -LiteralPath $destinationApk -Algorithm SHA256).Hash.ToLowerInvariant()
$apkFile = Get-Item -LiteralPath $destinationApk

Write-Output "APK path: $($apkFile.FullName)"
Write-Output "APK size: $($apkFile.Length) bytes"
Write-Output "Source commit: $sourceCommit"
Write-Output "versionCode: $($copiedMetadata.versionCode)"
Write-Output "versionName: $($copiedMetadata.versionName)"
Write-Output "signer certificate SHA-256: $($copiedMetadata.signer)"
Write-Output "APK SHA256: $apkHash"

#!/usr/bin/env pwsh

####
# Performs the last step of the build process, zipping the built files. For Mac, it also builds the safari extension.
####

param (
    [Parameter(Mandatory = $false)]
    [String] $browser
)

if (-not $browser) {
    $browser = $env:BROWSER
    if (-not $browser) {
        Write-Error "Missing mandatory Browser environment variable."
        exit 1
    }

    if ($browser -notin 'chrome', 'edge', 'firefox', 'opera', 'safari') {
        Write-Error "Invalid browser specified. Valid options are: chrome, edge, firefox, opera, safari."
        exit 1
    }
}

$buildDir = Join-Path $PSScriptRoot "..\build"
$distDir = Join-Path $PSScriptRoot "..\dist"

Write-Output $PSScriptRoot

if (-not (Test-Path $buildDir)) {
    Write-Output "No build directory found. Exiting..."
    exit
}

# Create dist directory if it doesn't exist
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir
}

if ($browser -ne 'safari') {
    $distPath = Join-Path $distDir "dist-$browser.zip"

    if (Test-Path $distPath) {
        Remove-Item $distPath
    }

    # Compress build directory
    if (Test-Path $buildDir) {
        Compress-Archive -Path $buildDir -DestinationPath $distPath
        Write-Output "Zipped $buildDir into $distPath"
    }
}

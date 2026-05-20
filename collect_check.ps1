$Root = "C:\atf\pharm_demand_system"
$LogDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stamp = Get-Date -Format "yyyy_MM_dd_HH_mm_ss"
$LogFile = Join-Path $LogDir "check_$Stamp.txt"

function Add-Log {
    param([string]$Text = "")
    Add-Content -Path $LogFile -Value $Text -Encoding UTF8
    Write-Host $Text
}

function Run-Step {
    param(
        [string]$Title,
        [string]$WorkDir,
        [string]$Command
    )

    Add-Log ""
    Add-Log "============================================================"
    Add-Log $Title
    Add-Log "Folder: $WorkDir"
    Add-Log "Command: $Command"
    Add-Log "============================================================"

    Push-Location $WorkDir
    $Output = cmd.exe /d /c "chcp 65001 > nul && $Command" 2>&1
    $ExitCode = $LASTEXITCODE
    Pop-Location

    foreach ($line in $Output) {
        Add-Log $line
    }

    Add-Log ""
    Add-Log "Exit code: $ExitCode"
}

"PHARM DEMAND SYSTEM QUICK CHECK LOG" | Set-Content -Path $LogFile -Encoding UTF8
Add-Log "Date: $(Get-Date)"
Add-Log "Root: $Root"

Run-Step "1. Backend views files check" "$Root\backend" "dir core\views*.py"
Run-Step "2. Backend manual backups check" "$Root\backend" "dir manual_backups"
Run-Step "3. Backend migrations check" "$Root\backend" "dir core\migrations"
Run-Step "4. Frontend pages check" "$Root\frontend" "dir src\pages"
Run-Step "5. Project docs check" "$Root" "dir project_docs"
Run-Step "6. Logs check" "$Root" "dir logs"

Add-Log ""
Add-Log "DONE"
Add-Log "Log file: $LogFile"

Write-Host ""
Write-Host "Текширув тугади. Шу файлни ChatGPT'га юборинг:"
Write-Host $LogFile
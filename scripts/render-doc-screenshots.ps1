$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$Repo = Resolve-Path (Join-Path $PSScriptRoot "..")
$OutDir = Join-Path $Repo "docs\screenshots"

function Invoke-CommandText {
  param(
    [string] $File,
    [string[]] $CommandArgs,
    [string] $WorkDir
  )

  Push-Location $WorkDir
  try {
    $output = & $File @CommandArgs 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed: $File $($CommandArgs -join ' ')`n$output"
    }
    return $output.TrimEnd()
  } finally {
    Pop-Location
  }
}

function Limit-Lines {
  param(
    [string] $Text,
    [int] $MaxLines
  )

  $lines = $Text -split "`r?`n"
  if ($lines.Length -le $MaxLines) {
    return $Text
  }

  return (($lines | Select-Object -First $MaxLines) + @("", "... output truncated for README preview ...")) -join "`n"
}

function Wrap-Line {
  param(
    [string] $Line,
    [int] $MaxChars
  )

  if ($Line.Length -le $MaxChars) {
    return @($Line)
  }

  $result = @()
  $current = $Line
  while ($current.Length -gt $MaxChars) {
    $break = $current.LastIndexOf(" ", [Math]::Min($MaxChars, $current.Length - 1))
    if ($break -lt 20) {
      $break = $MaxChars
    }

    $result += $current.Substring(0, $break)
    $current = $current.Substring($break).TrimStart()
  }

  if ($current.Length -gt 0) {
    $result += $current
  }

  return $result
}

function New-Brush {
  param([System.Drawing.Color] $Color)
  return New-Object System.Drawing.SolidBrush -ArgumentList $Color
}

function Save-TerminalImage {
  param(
    [string] $Title,
    [string] $Command,
    [string] $Text,
    [string] $Path
  )

  $maxChars = 104
  $wrapped = @()
  foreach ($line in ($Text -split "`r?`n")) {
    foreach ($part in (Wrap-Line -Line $line -MaxChars $maxChars)) {
      $wrapped += $part
    }
  }

  $width = 1480
  $padding = 34
  $top = 132
  $lineHeight = 24
  $height = [Math]::Min(2100, [Math]::Max(560, $top + 54 + ($wrapped.Length * $lineHeight)))

  $bitmap = New-Object System.Drawing.Bitmap -ArgumentList $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

  $background = [System.Drawing.Color]::FromArgb(12, 18, 25)
  $panel = [System.Drawing.Color]::FromArgb(20, 29, 39)
  $bar = [System.Drawing.Color]::FromArgb(31, 41, 55)
  $muted = [System.Drawing.Color]::FromArgb(148, 163, 184)
  $textColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
  $accent = [System.Drawing.Color]::FromArgb(34, 197, 94)
  $warn = [System.Drawing.Color]::FromArgb(251, 191, 36)

  $graphics.Clear($background)
  $graphics.FillRectangle((New-Brush $panel), 18, 18, $width - 36, $height - 36)
  $graphics.FillRectangle((New-Brush $bar), 18, 18, $width - 36, 58)
  $graphics.FillEllipse((New-Brush ([System.Drawing.Color]::FromArgb(239, 68, 68))), 42, 40, 13, 13)
  $graphics.FillEllipse((New-Brush ([System.Drawing.Color]::FromArgb(245, 158, 11))), 66, 40, 13, 13)
  $graphics.FillEllipse((New-Brush $accent), 90, 40, 13, 13)

  $fontTitle = New-Object System.Drawing.Font -ArgumentList "Microsoft YaHei UI", 16, ([System.Drawing.FontStyle]::Bold)
  $fontCommand = New-Object System.Drawing.Font -ArgumentList "Consolas", 13, ([System.Drawing.FontStyle]::Regular)
  $fontBody = New-Object System.Drawing.Font -ArgumentList "Microsoft YaHei UI", 12, ([System.Drawing.FontStyle]::Regular)
  $brushText = New-Brush $textColor
  $brushMuted = New-Brush $muted
  $brushAccent = New-Brush $accent
  $brushWarn = New-Brush $warn

  $graphics.DrawString($Title, $fontTitle, $brushText, 126, 33)
  $graphics.DrawString('$ ' + $Command, $fontCommand, $brushAccent, $padding, 96)

  $y = $top
  foreach ($line in $wrapped) {
    if ($y + $lineHeight -gt $height - 34) {
      break
    }

    $brush = $brushMuted
    if ($line -match "PASS|100%|0\.1\.7|ProofPR initialized|完成|通过") {
      $brush = $brushAccent
    } elseif ($line -match "高|风险|block-merge|pull_request_target|workflow-untrusted-checkout") {
      $brush = $brushWarn
    } elseif ($line -match "^#|^##|Review|证据|Finding|Summary") {
      $brush = $brushText
    }

    $graphics.DrawString($line, $fontBody, $brush, $padding, $y)
    $y += $lineHeight
  }

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

$initDir = Join-Path $env:TEMP "proofpr-doc-init"
if (Test-Path $initDir) {
  Remove-Item -LiteralPath $initDir -Recurse -Force
}
New-Item -ItemType Directory -Path $initDir | Out-Null

$initText = Invoke-CommandText `
  -File "node" `
  -CommandArgs @((Join-Path $Repo "packages\cli\dist\index.js"), "init", "--config-path", ".proofpr.yml", "--workflow-path", ".github\workflows\proofpr.yml", "--preset", "open-source-maintainer") `
  -WorkDir $initDir
Set-Content -LiteralPath (Join-Path $OutDir "proofpr-init-output.txt") -Value $initText -Encoding UTF8
Save-TerminalImage `
  -Title "ProofPR init output" `
  -Command "npx proof-pr@latest init --preset open-source-maintainer" `
  -Text $initText `
  -Path (Join-Path $OutDir "proofpr-init-output.png")
Remove-Item -LiteralPath $initDir -Recurse -Force

$workflowText = Invoke-CommandText `
  -File "node" `
  -CommandArgs @((Join-Path $Repo "packages\cli\dist\index.js"), "scan", "--diff-file", "examples\cases\workflow-untrusted-checkout.diff", "--locale", "zh-CN") `
  -WorkDir $Repo
Set-Content -LiteralPath (Join-Path $OutDir "proofpr-workflow-risk-output.txt") -Value $workflowText -Encoding UTF8
Save-TerminalImage `
  -Title "Workflow risk scan" `
  -Command "npx proof-pr@latest scan --diff-file examples/cases/workflow-untrusted-checkout.diff --locale zh-CN" `
  -Text (Limit-Lines -Text $workflowText -MaxLines 66) `
  -Path (Join-Path $OutDir "proofpr-workflow-risk-output.png")

$benchmarkText = Invoke-CommandText `
  -File "node" `
  -CommandArgs @((Join-Path $Repo "packages\cli\dist\index.js"), "benchmark", "--cases", "benchmarks\cases") `
  -WorkDir $Repo
Set-Content -LiteralPath (Join-Path $OutDir "proofpr-benchmark-output.txt") -Value $benchmarkText -Encoding UTF8
Save-TerminalImage `
  -Title "Benchmark output" `
  -Command "npx proof-pr@latest benchmark --cases benchmarks/cases" `
  -Text $benchmarkText `
  -Path (Join-Path $OutDir "proofpr-benchmark-output.png")

$visualHtmlPath = Join-Path $OutDir "proofpr-visual-report.html"
$visualPngPath = Join-Path $OutDir "proofpr-visual-report.png"
$visualHtml = Invoke-CommandText `
  -File "node" `
  -CommandArgs @((Join-Path $Repo "packages\cli\dist\index.js"), "scan", "--diff-file", "examples\cases\workflow-untrusted-checkout.diff", "--locale", "zh-CN", "--format", "html") `
  -WorkDir $Repo
Set-Content -LiteralPath $visualHtmlPath -Value $visualHtml -Encoding UTF8

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (Test-Path $edgePath) {
  & $edgePath `
    --headless `
    --disable-gpu `
    --window-size=1440,1800 `
    "--screenshot=$visualPngPath" `
    "file:///$($visualHtmlPath -replace '\\', '/')" *> $null
}

Write-Host "ProofPR doc screenshots generated."

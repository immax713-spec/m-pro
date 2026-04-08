$ErrorActionPreference = 'Stop'

$port = 4173
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Set-Location -LiteralPath $root

function Find-Python {
  $candidates = @(
    @{ cmd = 'py'; args = @('-3') },
    @{ cmd = 'python'; args = @() },
    @{ cmd = 'python3'; args = @() }
  )

  foreach ($candidate in $candidates) {
    try {
      $null = & $candidate.cmd @($candidate.args + @('--version')) 2>$null
      if ($LASTEXITCODE -eq 0) { return $candidate }
    } catch {
    }
  }

  return $null
}

$python = Find-Python
if (-not $python) {
  throw 'Python не найден. Установите Python или запустите любой статический HTTP-сервер из папки проекта.'
}

Write-Host ("Serving " + $root + " at http://127.0.0.1:" + $port)
& $python.cmd @($python.args + @('-m', 'http.server', $port))

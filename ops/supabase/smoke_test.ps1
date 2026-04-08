param(
  [string]$SupabaseUrl = 'https://lkflvchascdapzcbennf.supabase.co',
  [string]$AnonKey = 'sb_publishable_fzwXEWgtIkIjbZJ6WuXrNQ_FZ3c4kNg',
  [string]$Password = ''
)

$ErrorActionPreference = 'Stop'

$headers = @{
  apikey        = $AnonKey
  Authorization = "Bearer $AnonKey"
}

function Invoke-SupabaseRpc {
  param(
    [string]$Name,
    [object]$Body
  )

  Invoke-RestMethod `
    -Uri ($SupabaseUrl.TrimEnd('/') + '/rest/v1/rpc/' + $Name) `
    -Headers $headers `
    -Method Post `
    -ContentType 'application/json' `
    -Body ($Body | ConvertTo-Json -Depth 8 -Compress)
}

function Get-HttpErrorDetails {
  param($ErrorRecord)

  $body = ''
  try {
    if ($ErrorRecord.Exception.Response -and $ErrorRecord.Exception.Response.GetResponseStream) {
      $reader = New-Object System.IO.StreamReader($ErrorRecord.Exception.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
    }
  } catch {
  }

  $code = ''
  $message = ''

  if ($body) {
    try {
      $parsed = $body | ConvertFrom-Json
      $code = [string]$parsed.code
      if ($parsed.PSObject.Properties.Name -contains 'message' -and [string]$parsed.message) {
        $message = [string]$parsed.message
      } elseif ($parsed.PSObject.Properties.Name -contains 'error' -and [string]$parsed.error) {
        $message = [string]$parsed.error
      } else {
        $message = $body
      }
    } catch {
      $message = $body
    }
  }

  if (-not $message) {
    $message = [string]$ErrorRecord.Exception.Message
  }

  [pscustomobject]@{
    Code    = $code
    Message = $message
  }
}

function Test-RpcExists {
  param(
    [string]$Name,
    [object]$Body
  )

  try {
    $null = Invoke-SupabaseRpc $Name $Body
    Write-Host "[OK] rpc $Name responded" -ForegroundColor Green
    return $true
  } catch {
    $details = Get-HttpErrorDetails $_
    $message = $details.Message
    $code = [string]$details.Code
    if ($code -eq 'PGRST202' -or $message -match 'PGRST202|schema cache|Could not find the function') {
      Write-Host "[FAIL] rpc $Name is missing" -ForegroundColor Red
      return $false
    }
    Write-Host "[OK] rpc $Name responded" -ForegroundColor Green
    return $true
  }
}

Write-Host 'Checking protected RPC layer...' -ForegroundColor Cyan
$rpcChecks = @(
  @{ Name = 'sf_auth'; Ok = (Test-RpcExists 'sf_auth' @{ p_password = '__probe__'; p_remember = $false }) },
  @{ Name = 'sf_get_session_user'; Ok = (Test-RpcExists 'sf_get_session_user' @{ p_session_token = '__probe__' }) },
  @{ Name = 'sf_get_data_bundle'; Ok = (Test-RpcExists 'sf_get_data_bundle' @{ p_session_token = '__probe__'; p_if_version = $null }) },
  @{ Name = 'sf_get_shared_selections'; Ok = (Test-RpcExists 'sf_get_shared_selections' @{ p_session_token = '__probe__' }) },
  @{ Name = 'sf_save_shared_selection'; Ok = (Test-RpcExists 'sf_save_shared_selection' @{ p_session_token = '__probe__'; p_payload = @{} }) },
  @{ Name = 'sf_save_edits'; Ok = (Test-RpcExists 'sf_save_edits' @{ p_session_token = '__probe__'; p_payload = @{} }) }
)

$rpcOk = ($rpcChecks | Where-Object { -not $_.Ok }).Count -eq 0

if ($Password -and $rpcOk) {
  Write-Host ''
  Write-Host 'Checking auth flow...' -ForegroundColor Cyan
  try {
    $auth = Invoke-SupabaseRpc 'sf_auth' @{ p_password = $Password; p_remember = $false }
    $token = [string]$auth.sessionToken
    if (-not $token) { throw 'sessionToken not returned' }
    Write-Host '[OK] auth returned session token' -ForegroundColor Green

    $user = Invoke-SupabaseRpc 'sf_get_session_user' @{ p_session_token = $token }
    Write-Host ('[OK] session user: ' + [string]$user.user.name) -ForegroundColor Green

    $bundle = Invoke-SupabaseRpc 'sf_get_data_bundle' @{ p_session_token = $token; p_if_version = $null }
    $bundleRows = @($bundle.rows).Count
    Write-Host ("[OK] fast bundle returned " + $bundleRows + " row(s)") -ForegroundColor Green

    $fastCheck = Invoke-SupabaseRpc 'sf_get_data_bundle' @{ p_session_token = $token; p_if_version = $bundle.version }
    $changed = if ($fastCheck.changed -eq $false) { 'false' } else { 'true' }
    Write-Host ("[OK] version-aware bundle changed=" + $changed) -ForegroundColor Green

    $selections = Invoke-SupabaseRpc 'sf_get_shared_selections' @{ p_session_token = $token }
    $selectionCount = @($selections).Count
    Write-Host ("[OK] shared selections call returned " + $selectionCount + " item(s)") -ForegroundColor Green
  } catch {
    Write-Host ("[FAIL] auth flow: " + $_.Exception.Message) -ForegroundColor Red
    $rpcOk = $false
  }
} elseif (-not $Password) {
  Write-Host ''
  Write-Host '[INFO] Password not provided. Skipping full auth flow.' -ForegroundColor Yellow
}

Write-Host ''
if ($rpcOk) {
  Write-Host '[OK] Protected backend RPC smoke test passed.' -ForegroundColor Green
  exit 0
}

Write-Host '[FAIL] Smoke test failed.' -ForegroundColor Red
exit 1

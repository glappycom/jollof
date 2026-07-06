# Check network access needed for the first Tauri (Rust) build.
Write-Host "Jollof - Rust/Cargo network check" -ForegroundColor Cyan
Write-Host ""

$targets = @(
  @{ Name = "index.crates.io (Cargo index)"; Url = "https://index.crates.io/config.json" },
  @{ Name = "static.crates.io (crate downloads)"; Url = "https://static.crates.io/" },
  @{ Name = "github.com (fallback Cargo index)"; Url = "https://github.com" }
)

$allOk = $true

foreach ($target in $targets) {
  $hostname = ([uri]$target.Url).Host

  Write-Host "DNS: $($target.Name)" -NoNewline
  try {
    $null = Resolve-DnsName $hostname -ErrorAction Stop | Select-Object -First 1
    Write-Host " OK" -ForegroundColor Green
  } catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "  Could not resolve hostname. Try DNS 1.1.1.1 or 8.8.8.8." -ForegroundColor Yellow
    $allOk = $false
  }

  Write-Host "HTTP: $($target.Url)" -NoNewline
  try {
    $response = Invoke-WebRequest -Uri $target.Url -Method Head -TimeoutSec 15 -UseBasicParsing
    Write-Host " $($response.StatusCode)" -ForegroundColor Green
  } catch {
    $status = $null
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
    }
    # static.crates.io often returns 403 on HEAD; server is still reachable.
    if ($status -eq 403) {
      Write-Host " 403 (reachable)" -ForegroundColor Green
    } else {
      Write-Host " FAIL - $($_.Exception.Message)" -ForegroundColor Red
      $allOk = $false
    }
  }

  Write-Host ""
}

if ($allOk) {
  Write-Host "Network looks OK. Run: npm run tauri:app" -ForegroundColor Green
} else {
  Write-Host "Fix network/DNS, then retry. Browser dev still works: npm run dev" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Quick DNS fix (Windows 11):" -ForegroundColor Cyan
  Write-Host "  Settings -> Network -> Wi-Fi/Ethernet -> DNS -> Manual -> 1.1.1.1 and 1.0.0.1"
  Write-Host "  Then: ipconfig /flushdns"
  exit 1
}

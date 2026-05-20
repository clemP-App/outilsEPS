# Serveur HTTP local sans Node ni Python (PowerShell + .NET).
# Usage : powershell -ExecutionPolicy Bypass -File scripts\serve.ps1
# Puis ouvrir http://localhost:5173/index.html dans Cursor ou Chrome.

$Port = 5173
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Prefix = "http://localhost:$Port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Prefix)
$listener.Start()

Write-Host ""
Write-Host "  Outils EPS — serveur local" -ForegroundColor Green
Write-Host "  http://localhost:$Port/index.html" -ForegroundColor Cyan
Write-Host "  Racine : $Root" -ForegroundColor DarkGray
Write-Host "  Ctrl+C pour arreter" -ForegroundColor DarkGray
Write-Host ""

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".woff2" = "font/woff2"
}

function Send-File($ctx, $path) {
  if (-not (Test-Path $path -PathType Leaf)) {
    $ctx.Response.StatusCode = 404
    $buf = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
    $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
    $ctx.Response.Close()
    return
  }
  $ext = [IO.Path]::GetExtension($path).ToLower()
  $ctx.Response.ContentType = $mime[$ext]
  if (-not $ctx.Response.ContentType) { $ctx.Response.ContentType = "application/octet-stream" }
  $bytes = [IO.File]::ReadAllBytes($path)
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $ctx.Response.Close()
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $raw = $ctx.Request.Url.LocalPath.TrimStart("/")
    if ($raw -eq "" -or $raw -eq "/") { $raw = "index.html" }
    $path = Join-Path $Root ($raw -replace "/", [IO.Path]::DirectorySeparatorChar)
    $full = [IO.Path]::GetFullPath($path)
    if (-not $full.StartsWith([IO.Path]::GetFullPath($Root), [StringComparison]::OrdinalIgnoreCase)) {
      $ctx.Response.StatusCode = 403
      $ctx.Response.Close()
      continue
    }
    Send-File $ctx $full
  }
} finally {
  $listener.Stop()
}

# ==============================================================================
# AfricaWinners Scientific Journal (AWSJ) - Servidor de Desenvolvimento Local
# Fundador & Editor-Chefe: Valdimir Jacinto Esteves
# ==============================================================================

$port = 3000
$publicPath = Join-Path $PSScriptRoot "public"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " 🏆 AfricaWinners Scientific Journal (AWSJ)" -ForegroundColor Yellow
Write-Host " 🏛️ Fundador & Editor-Chefe: Valdimir Jacinto Esteves" -ForegroundColor White
Write-Host " 📧 E-mail: escritorioestevesemultisservic@gmail.com" -ForegroundColor Gray
Write-Host " 📞 Contacto: 976161521" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan

# Testar se Node.js está instalado
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "✅ Node.js detectado. A iniciar o servidor Express..." -ForegroundColor Green
    Set-Location $PSScriptRoot
    node server.js
} else {
    Write-Host "ℹ️ Node.js não detectado no PATH do Windows." -ForegroundColor Yellow
    Write-Host "🚀 A iniciar Servidor Web HTTP local embutido em PowerShell..." -ForegroundColor Green
    Write-Host "🌐 Aceda ao portal em: http://localhost:$port" -ForegroundColor Cyan
    Write-Host "💡 Dica: Para instalar o Node.js completo, execute: winget install OpenJS.NodeJS.LTS" -ForegroundColor DarkGray
    Write-Host "Prima CTRL+C para terminar o servidor.`n" -ForegroundColor Gray

    # Abrir navegador automaticamente
    Start-Process "http://localhost:$port"

    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()

    try {
        while ($listener.IsListening) {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $urlPath = $request.Url.LocalPath
            if ($urlPath -eq "/" -or $urlPath -eq "") {
                $urlPath = "/index.html"
            }

            # Tratar caminhos
            $filePath = Join-Path $publicPath $urlPath.TrimStart('/')
            if (-not (Test-Path $filePath)) {
                $filePath = Join-Path $publicPath "index.html"
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)

            # MIME Types
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".png"  { $response.ContentType = "image/png" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                ".json" { $response.ContentType = "application/json" }
                ".pdf"  { $response.ContentType = "application/pdf" }
                Default { $response.ContentType = "application/octet-stream" }
            }

            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
        }
    } finally {
        $listener.Stop()
    }
}

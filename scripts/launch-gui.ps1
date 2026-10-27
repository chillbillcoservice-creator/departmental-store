$port = 54321
$url = "http://127.0.0.1:$port"

# Check if node server is already listening
$conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if (-not $conn) {
    Start-Process -FilePath "node" -ArgumentList "scripts\license-app-server.mjs" -WorkingDirectory "C:\Users\admin\Desktop\CODING\departmental-store" -WindowStyle Hidden
    Start-Sleep -Milliseconds 700
}

# Launch borderless app window
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"

if (Test-Path $edge) {
    Start-Process -FilePath $edge -ArgumentList "--app=$url", "--window-size=1150,800"
} elseif (Test-Path $chrome) {
    Start-Process -FilePath $chrome -ArgumentList "--app=$url", "--window-size=1150,800"
} else {
    Start-Process $url
}

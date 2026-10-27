$wsh = New-Object -ComObject WScript.Shell

# 1. ChillBill Retail POS (Points directly to https://chillbill-store.vercel.app in Chrome standalone app mode)
$storeShortcut = $wsh.CreateShortcut("C:\Users\admin\Desktop\ChillBill Retail POS.lnk")
if (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe") {
    $storeShortcut.TargetPath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    $storeShortcut.Arguments = '--app="https://chillbill-store.vercel.app"'
    $storeShortcut.WorkingDirectory = "C:\Program Files\Google\Chrome\Application"
} elseif (Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") {
    $storeShortcut.TargetPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    $storeShortcut.Arguments = '--app="https://chillbill-store.vercel.app"'
    $storeShortcut.WorkingDirectory = "C:\Program Files (x86)\Microsoft\Edge\Application"
} else {
    $storeShortcut.TargetPath = "https://chillbill-store.vercel.app"
}

if (Test-Path "C:\Users\admin\Desktop\CODING\departmental-store\public\chillbill-retail-pos.ico") {
    $storeShortcut.IconLocation = "C:\Users\admin\Desktop\CODING\departmental-store\public\chillbill-retail-pos.ico,0"
}
$storeShortcut.Description = "ChillBill Store POS - Modern Retail & Grocery POS"
$storeShortcut.Save()

# 2. ChillBill License Manager
$licShortcut = $wsh.CreateShortcut("C:\Users\admin\Desktop\ChillBill License Manager.lnk")
$licShortcut.TargetPath = "C:\Users\admin\Desktop\CODING\departmental-store\launch-license-app.bat"
$licShortcut.WorkingDirectory = "C:\Users\admin\Desktop\CODING\departmental-store"
$licShortcut.IconLocation = "C:\Users\admin\Desktop\CODING\departmental-store\src\app\favicon.ico,0"
$licShortcut.WindowStyle = 7
$licShortcut.Description = "ChillBill Store POS - License & Whitelist Manager"
$licShortcut.Save()

Write-Host "Both Desktop Shortcuts (ChillBill Retail POS & ChillBill License Manager) updated successfully!"

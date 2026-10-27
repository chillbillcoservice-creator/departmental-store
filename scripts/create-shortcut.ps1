$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut("C:\Users\admin\Desktop\ChillBill License Manager.lnk")
$shortcut.TargetPath = "C:\Users\admin\Desktop\CODING\departmental-store\launch-license-app.bat"
$shortcut.WorkingDirectory = "C:\Users\admin\Desktop\CODING\departmental-store"
$shortcut.IconLocation = "C:\Users\admin\Desktop\CODING\departmental-store\src\app\favicon.ico,0"
$shortcut.WindowStyle = 7
$shortcut.Description = "ChillBill POS - Developer License & Store Manager App"
$shortcut.Save()

Write-Host "Desktop Shortcut updated successfully!"

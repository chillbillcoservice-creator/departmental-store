Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\admin\Desktop\CODING\departmental-store"
WshShell.Run """C:\Program Files\nodejs\node.exe"" ""C:\Users\admin\Desktop\CODING\departmental-store\scripts\license-app-server.mjs""", 0, False

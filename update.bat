@echo off
echo Updating Inorder...
copy /Y "%USERPROFILE%\Downloads\inorder_2026-05-30_1640.jsx" "C:\inorder\src\App.js"
if %errorlevel% == 0 (
    echo Done! App updated successfully.
) else (
    echo Error: Make sure you downloaded the latest file from Claude first.
)
pause

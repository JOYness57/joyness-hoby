@echo off
setlocal enabledelayedexpansion
title JOYNESSHOBY - Push to GitHub

echo ========================================================
echo       JOYNESSHOBY - Upload to GitHub Repository
echo       Target: https://github.com/JOYness57/joyness-hoby.git
echo ========================================================
echo.

:: Ensure MinGit is in PATH for this session
set "PATH=%LOCALAPPDATA%\MinGit\cmd;%PATH%"

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Git not found.
    pause
    exit /b
)

echo [*] Staging all files...
git add .

echo [*] Committing changes...
git commit -m "Update JOYNESSHOBY - Firebase Auth, Cloud Firestore & Responsive Vault" 2>nul

echo [*] Ensuring main branch and remote origin...
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/JOYness57/joyness-hoby.git

echo.
echo [*] Pushing to GitHub (https://github.com/JOYness57/joyness-hoby.git)...
echo.
echo NOTE: If GitHub prompts you to authenticate:
echo   - Click 'Sign in with your browser'
echo   - OR enter your GitHub username and Personal Access Token.
echo.
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo SUCCESS! Your repository is now fully live on GitHub:
    echo   https://github.com/JOYness57/joyness-hoby
    echo ========================================================
) else (
    echo.
    echo [!] Push encountered an error. If authentication was required,
    echo     please ensure you are logged in to GitHub.
)

pause

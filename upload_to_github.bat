@echo off
setlocal enabledelayedexpansion
title JOYNESSHOBY - GitHub Uploader

echo ========================================================
echo       JOYNESSHOBY - Upload to GitHub Repository
echo ========================================================
echo.

:: 1. Check if Git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Git is not detected on your computer.
    echo.
    echo Would you like to install Git now via Windows Package Manager? (Y/N)
    set /p INSTALL_GIT="Enter choice (Y/N): "
    if /i "!INSTALL_GIT!"=="Y" (
        echo.
        echo Installing Git for Windows...
        winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
        echo.
        echo Git installation completed!
        echo Please restart this script (or close and re-open this window) to proceed.
        pause
        exit /b
    ) else (
        echo.
        echo Please download and install Git from: https://git-scm.com/download/win
        echo Then run this script again.
        pause
        exit /b
    )
)

echo [OK] Git is installed.
echo.

:: 2. Initialize Git repository if not already done
if not exist ".git" (
    echo [*] Initializing Git repository...
    git init
) else (
    echo [*] Git repository already initialized.
)

:: 3. Configure Git user if not already configured
git config user.name >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    set /p GIT_NAME="Enter your GitHub Name / Username: "
    set /p GIT_EMAIL="Enter your GitHub Email: "
    git config user.name "!GIT_NAME!"
    git config user.email "!GIT_EMAIL!"
)

:: 4. Add files and commit
echo.
echo [*] Staging files (excluding temporary files via .gitignore)...
git add .

echo.
echo [*] Creating commit...
git commit -m "Initial commit - JOYNESSHOBY with Firebase Auth and Cloud Firestore"

echo.
echo [*] Setting default branch to 'main'...
git branch -M main

:: 5. Get GitHub repository URL
echo.
echo ========================================================
echo Almost done! Next step:
echo 1. Go to https://github.com/new in your browser.
echo 2. Create a new repository named "joyness-hoby" (leave it empty).
echo 3. Copy the repository URL (e.g. https://github.com/YourUsername/joyness-hoby.git).
echo ========================================================
echo.

set /p REPO_URL="Paste your GitHub repository URL: "

if "!REPO_URL!"=="" (
    echo [!] No URL entered. You can push manually later with:
    echo     git remote add origin YOUR_GITHUB_URL
    echo     git push -u origin main
    pause
    exit /b
)

:: Remove existing origin if any, then add new one
git remote remove origin >nul 2>nul
git remote add origin !REPO_URL!

echo.
echo [*] Pushing code to GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo SUCCESS! Your project has been uploaded to GitHub!
    echo You can now connect this repo to Render.com or share it!
    echo ========================================================
) else (
    echo.
    echo [!] If push failed due to authentication, you may need to
    echo     sign into GitHub or use a Personal Access Token (PAT).
)

pause

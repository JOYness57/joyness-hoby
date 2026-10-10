@echo off
setlocal enabledelayedexpansion
title JOYNESSHOBY - Firebase Hosting 24/7 Deployer

echo ======================================================================
echo          JOYNESSHOBY &mdash; 24/7 Firebase Hosting Deployment
echo          Project: joyness-hoby
echo ======================================================================
echo.

:: 1. Build and synchronize static web assets
echo [1/3] Preparing web assets and static distribution...
python build_static.py
if %errorlevel% neq 0 (
    echo [!] Build failed. Please ensure Python is installed.
    pause
    exit /b %errorlevel%
)
echo [*] Public assets updated in folder 'public/'.
echo.

:: 2. Check Firebase authentication status
echo [2/3] Checking Google Firebase login status...
call npx -y firebase-tools projects:list >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [*] Authentication needed.
    echo [*] Opening your browser to sign in to Google Firebase...
    echo [*] Please log in with the Google account that manages 'joyness-hoby'.
    echo.
    call npx -y firebase-tools login
    if !errorlevel! neq 0 (
        echo [!] Firebase login cancelled or failed.
        pause
        exit /b !errorlevel!
    )
) else (
    echo [*] Logged into Firebase successfully.
)
echo.

:: 3. Deploy to Firebase Hosting and Firestore Rules
echo [3/3] Deploying to Google Firebase Hosting (joyness-hoby)...
echo.
call npx -y firebase-tools deploy --only hosting,firestore:rules

if %errorlevel% equ 0 (
    echo.
    echo ======================================================================
    echo   🎉 SUCCESS! YOUR APP IS NOW LIVE 24/7 ON GOOGLE FIREBASE HOSTING!
    echo ======================================================================
    echo.
    echo   Your website links:
    echo   👉 https://joyness-hoby.web.app
    echo   👉 https://joyness-hoby.firebaseapp.com
    echo.
    echo   Anyone on any phone, tablet, or PC worldwide can now use it!
    echo ======================================================================
    echo.
    set /p OPEN_BROWSER="Would you like to open your live website in browser now? (Y/N): "
    if /i "!OPEN_BROWSER!"=="Y" (
        start https://joyness-hoby.web.app
    )
) else (
    echo.
    echo [!] Firebase deployment encountered an error.
    echo     Please check your internet connection or project permissions.
)

echo.
pause

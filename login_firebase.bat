@echo off
title JOYNESSHOBY - Firebase Account Login
echo ========================================================
echo Logging into your Google account for Firebase...
echo A browser window will open. Sign in with the Google account
echo that owns the 'joyness-hoby' project.
echo ========================================================
echo.
call npx -y firebase-tools login
echo.
echo Login completed! You can now run deploy_firebase.bat.
pause

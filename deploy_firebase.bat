@echo off
title JOYNESSHOBY - Firebase Hosting Deployer
echo ========================================================
echo JOYNESSHOBY - Deploying to Firebase Hosting (joyness-hoby)
echo ========================================================
echo.
echo 1. Updating public web assets...
python build_static.py
echo.
echo 2. Deploying to https://joyness-hoby.web.app ...
call npx -y firebase-tools deploy --only hosting
echo.
echo Done! Your website is live worldwide at:
echo   https://joyness-hoby.web.app
echo   https://joyness-hoby.firebaseapp.com
echo ========================================================
pause

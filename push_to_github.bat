@echo off
title GitHub-ga yuklash (VeritasEdu)
cd /d "%~dp0"
set "PATH=C:\Users\Zohid\AppData\Local\Programs\MinGit\cmd;%PATH%"

echo =========================================================
echo    VeritasEdu Loyihasini GitHub-ga yuklash
echo =========================================================
echo.
echo Loyiha GitHub-ga yuklanmoqda...
echo Iltimos kuting, agar oyna ochilsa "Sign in with your browser" ni bosing.
echo.
git push -u origin main
echo.
echo =========================================================
if %ERRORLEVEL% EQU 0 (
    echo [MUVAFFAQIYATLI!] Loyiha GitHub-ga yuklandi!
    echo Manzil: https://github.com/zohidabduhakimov/emotsiya_project
) else (
    echo Xatolik yuz berdi.
)
echo =========================================================
pause

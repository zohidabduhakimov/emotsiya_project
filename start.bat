@echo off
title VeritasEdu - O'quvchilar Emotsiyasi va Yolg'on/Rost Tahlili
echo =====================================================================
echo           VeritasEdu AI - Talabalar va O'quvchilar uchun
echo              Emotsiya va Haqiqiylik Tahlili Tizimi
echo =====================================================================
echo.
echo Server ishga tushirilmoqda...
echo Iltimos kuting, brauzer avtomatik ravishda ochiladi!
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause

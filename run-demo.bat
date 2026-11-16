@echo off
setlocal
cd /d "%~dp0"
set "PORT=8000"
set "URL=http://localhost:8000"

rem Prefer the Python launcher, then fall back to python.exe.
where py >nul 2>&1
if not errorlevel 1 goto UsePy
where python >nul 2>&1
if not errorlevel 1 goto UsePython

echo Python was not found on this computer.
echo Install Python from https://www.python.org/downloads/ and enable its PATH option,
echo then run this file again.
pause
exit /b 1

:UsePy
start "SolarSync Infra Local Server" /D "%~dp0" cmd.exe /k "py -3 -m http.server %PORT% --bind 127.0.0.1"
goto OpenBrowser

:UsePython
start "SolarSync Infra Local Server" /D "%~dp0" cmd.exe /k "python -m http.server %PORT% --bind 127.0.0.1"

:OpenBrowser
timeout /t 2 /nobreak >nul
start "" "%URL%"
echo SolarSync Infra should open at %URL%.
echo Keep the server window open while viewing the site.
endlocal

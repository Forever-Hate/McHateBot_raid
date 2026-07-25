@echo off
setlocal
cd /d "%~dp0.."

if exist out rd /S /Q out
if exist exe rd /S /Q exe

call pnpm exec tsc --pretty false
if errorlevel 1 exit /b 1

if not exist out\McHateBot.js (
	echo TypeScript build did not produce out\McHateBot.js
	exit /b 1
)

if not exist out\language mkdir out\language
xcopy .\language out\language /E /I /Y >nul
copy /Y config-orginal.json out\config.json >nul
copy /Y settings-orginal.json out\settings.json >nul
if exist swagger-output.json copy /Y swagger-output.json out\swagger-output.json >nul
if exist dist xcopy .\dist out\dist /E /I /Y >nul

if "%PKG_TARGET%"=="" set "PKG_TARGET=node24-win-x64"
call pnpm exec pkg .\out\McHateBot.js -t %PKG_TARGET% -c package.json
if errorlevel 1 exit /b 1

copy /Y config-orginal.json exe\config.json >nul
copy /Y settings-orginal.json exe\settings.json >nul
if exist swagger-output.json copy /Y swagger-output.json exe\swagger-output.json >nul
xcopy .\language exe\language /E /I /Y >nul
if exist .env copy /Y .env exe\.env >nul

exit /b 0
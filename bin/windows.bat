@setlocal
@echo off
REM
REM   Useful wrapper to set Windows Visual Studio environment variables and run a command
REM

if "%PROCESSOR_ARCHITECTURE%"=="" set PROCESSOR_ARCHITECTURE=%PA%
if "%PROCESSOR_ARCHITECTURE%"=="" set PROCESSOR_ARCHITECTURE=AMD64

if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set CC_ARCH=x64
) else if "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
    set CC_ARCH=arm64
) else if "%PROCESSOR_ARCHITECTURE%"=="ARM" (
    set CC_ARCH=arm
) else (
    set CC_ARCH=x86
)

if DEFINED VSINSTALLDIR GOTO :done

for %%e in (%VSEDITION%, Professional, Community) do (
    for /l %%v in (2028, -1, 2017) do (
        set VS=%%v
        IF EXIST "%PROGRAMFILES(x86)%\Microsoft Visual Studio\%%v\%%e\VC\Auxiliary\Build\vcvarsall.bat" call "%PROGRAMFILES(x86)%\Microsoft Visual Studio\%%v\%%e\VC\Auxiliary\Build\vcvarsall.bat" %CC_ARCH%
        IF EXIST "%PROGRAMFILES(x86)%\Microsoft Visual Studio\%%v\%%e\VC\Auxiliary\Build\vcvarsall.bat" goto :done
        IF EXIST "%PROGRAMFILES%\Microsoft Visual Studio\%%v\%%e\VC\Auxiliary\Build\vcvarsall.bat" call "%PROGRAMFILES%\Microsoft Visual Studio\%%v\%%e\VC\Auxiliary\Build\vcvarsall.bat" %CC_ARCH%
        IF EXIST "%PROGRAMFILES%\Microsoft Visual Studio\%%v\%%e\VC\Auxiliary\Build\vcvarsall.bat" goto :done
    )
)

set e=
for /l %%v in (18, -1, 9) do (
    set VS=%%v
    IF EXIST "%PROGRAMFILES(x86)%\Microsoft Visual Studio %%v.0\VC\vcvarsall.bat" call "%PROGRAMFILES(x86)%\Microsoft Visual Studio %%v.0\VC\vcvarsall.bat" %CC_ARCH%
    IF EXIST "%PROGRAMFILES(x86)%\Microsoft Visual Studio %%v.0\VC\vcvarsall.bat" goto :done
    IF EXIST "%PROGRAMFILES%\Microsoft Visual Studio %%v.0\VC\vcvarsall.bat" call "%PROGRAMFILES%\Microsoft Visual Studio %%v.0\VC\vcvarsall.bat" %CC_ARCH%
    IF EXIST "%PROGRAMFILES%\Microsoft Visual Studio %%v.0\VC\vcvarsall.bat" goto :done
)

:done

@echo.
@echo Using Visual Studio %VS% (v%VisualStudioVersion%) from %VSINSTALLDIR%
@echo.
@echo %2 %3 %4 %5 %6 %7 %8 %9
%2 %3 %4 %5 %6 %7 %8 %9

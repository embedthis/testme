@echo off
REM Batch script test example

echo Running batch script test...

REM Test basic arithmetic
set /a result=2+2
if %result% == 4 (
    echo [PASS] Math test passed
) else (
    echo [FAIL] Math test failed
    exit /b 1
)

REM Test environment variable access
if defined TESTME_VERBOSE (
    echo Verbose mode enabled
)

echo [PASS] All batch tests passed
exit /b 0

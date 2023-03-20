@echo off
setlocal enabledelayedexpansion

For /f %%i in ('dir /B /S /A:-D block*') do (

    For %%A in ("%%i") do (
        set p=%%~dpA
        @REM remove trailing slash
        if !p:~-1! equ \ set p=!p:~0,-1!
        @REM if path not equlat to current path echo
        if not !cd! equ !p! echo !p!
    )
   
)
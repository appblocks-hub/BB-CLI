@echo off

for /f %%i in ('dir /B /S block*') do (

    for %%A in ("%%i") do (
        echo %%~dpA
    )
    
)
@echo off

echo Initializing
setlocal
pushd
cd %~dp0
set PATH=%windir%/Microsoft.NET/Framework/v3.5;%PATH%

echo Compiling
csc /nologo /out:minimize.exe /target:exe /debug- minimize.cs

echo Minimizing
echo ~~~~~~~~~~
call minimize.exe ../dist/slick.grid-{0}.min.js "\"slickGridVersion\"\s*:\s*\"(.*?)\"" ../slick.grid.js
echo ~~~~~~~~~~
call minimize.exe ../dist/slick.grid-{0}.merged.min.js "\"slickGridVersion\"\s*:\s*\"(.*?)\"" ../lib/jquery.rule-1.0.1.1.js ../lib/jquery.event.drag.custom.js ../slick.grid.js
echo ~~~~~~~~~~

echo Cleaning up
del minimize.exe
popd
endlocal
pause
@echo off

where npm
if %ERRORLEVEL% neq 0 echo "NodeJS and NPM is required to build Sploit, downloads found at https://nodejs.org/en/download/" & goto :eof

echo Installing modules..

call npm install

echo Running index.js..

call node index.js -once
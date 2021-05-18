@echo off
echo [31mKilling zombie processes[0m
taskkill /F /IM "nw.exe"
echo [32mRunning NWJS[0m
node E:\sys\kru\client
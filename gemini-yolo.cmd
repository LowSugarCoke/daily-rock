@echo off
set GEMINI_CLI_TRUST_WORKSPACE=true
gemini --approval-mode=yolo --skip-trust %*

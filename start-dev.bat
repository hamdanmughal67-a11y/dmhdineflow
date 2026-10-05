@echo off
title DMH DineFlow SaaS Platform
echo ========================================================
echo   🍽️ Starting DMH DineFlow Restaurant SaaS Platform
echo ========================================================
echo.

echo Starting Backend Server on http://localhost:3001...
start cmd /k "cd server && npm run dev"

echo Starting Frontend UI on http://localhost:5173...
start cmd /k "cd client && npm run dev"

echo.
echo ========================================================
echo   ✅ DMH DineFlow is booting up!
echo   💻 Open in browser: http://localhost:5173
echo ========================================================
pause

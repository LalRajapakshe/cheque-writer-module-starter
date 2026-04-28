Write-Host "Starting Cheque Writer dev services..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/erp-integration-api; dotnet restore; dotnet run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps/web; npm install; npm run dev"

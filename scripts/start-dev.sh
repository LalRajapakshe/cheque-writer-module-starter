#!/usr/bin/env bash
set -e
(cd services/erp-integration-api && dotnet restore && dotnet run) &
(cd apps/web && npm install && npm run dev) &
wait

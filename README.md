# Cheque Writer Module Starter

Separate cheque writer system module for an existing live ERP payment voucher process.

This starter follows the same integration style used in the hotel system work:

- Next.js + React UI
- Next.js route handlers as the web/BFF layer
- C# ASP.NET Core API as the ERP integration middle layer
- MS SQL Server stored procedures/views for controlled ERP access
- Separate `cw.*` cheque writer tables; no structural changes to the existing ERP voucher table

## Main decision

Use **Login Option A**: the same ERP login/user table, but validate it through a controlled C# API + ERP stored procedure.

Do **not** let the Next.js frontend read ERP user/password tables directly. The recommended production flow is:

```text
User login screen
  -> Next.js /api/auth/login
  -> C# ERP Integration API
  -> ERP stored procedure cw.usp_CW_ValidateErpLogin
  -> JWT/session returned to Next.js
```

## Module responsibilities

ERP remains responsible for:

- payment voucher preparation
- payee, amount, bank account, cheque no, cheque date
- voucher approval
- accounting/posting
- ERP users and rights

Cheque Writer is responsible for:

- loading approved/pending cheque vouchers from ERP
- validating cheque number against Cheque Book Master
- selecting bank-specific cheque layout
- cheque preview and printing
- print confirmation
- print register
- audit log
- reprint/void permissions

## Package structure

```text
cheque-writer-module-starter/
  apps/web/                       Next.js + React app
  services/erp-integration-api/    C# ASP.NET Core ERP bridge API
  sql/                             SQL schema and stored procedure templates
  docs/                            architecture and API notes
  scripts/                         dev startup scripts
  .vscode/                         VS Code tasks
  cheque-writer.code-workspace     VS Code workspace
```

## Quick start in VS Code

1. Unzip this package.
2. Open `cheque-writer.code-workspace` in VS Code.
3. Install prerequisites:
   - Node.js 22+
   - .NET 8 SDK or newer
   - SQL Server / SQL Server Express
4. Run the SQL scripts in this order:

```text
sql/01_create_cw_schema.sql
sql/03_seed_sample_data.sql
```

5. Configure C# API:

```text
services/erp-integration-api/appsettings.Development.json
```

6. Configure Next.js app:

```text
apps/web/.env.local.example -> copy as apps/web/.env.local
```

7. Start C# API:

```powershell
cd services/erp-integration-api
dotnet restore
dotnet run
```

8. Start Next.js app:

```powershell
cd apps/web
npm install
npm run dev
```

9. Open:

```text
http://localhost:3000
```

## Demo login

The C# API runs in demo mode by default.

```text
User name: lal
Password: demo123
```

Set `ChequeWriter:DemoMode` to `false` when connecting to the actual ERP database and stored procedures.

## Production mapping required

Before going live, map these stored procedures to the actual ERP tables:

- `cw.usp_CW_ValidateErpLogin`
- `cw.usp_CW_GetPendingPaymentVouchers`
- `cw.usp_CW_GetVoucherForPrint`

The cheque writer should only retrieve approved cheque vouchers. The existing voucher table does not need new columns.

# ChequeWriter.ErpApi

C# ASP.NET Core middle layer for the Cheque Writer module.

## Purpose

- Validate same ERP login/user table through stored procedure.
- Retrieve approved cheque payment vouchers from ERP.
- Maintain cheque writer tables under `cw.*`.
- Enforce cheque book, layout, print, and audit validation.

## Run

```powershell
dotnet restore
dotnet run
```

API runs at:

```text
http://localhost:5015
```

Swagger:

```text
http://localhost:5015/swagger
```

## Demo mode

`ChequeWriter:DemoMode = true` returns sample login, vouchers, cheque book, and layout.

Set to `false` to use actual SQL Server stored procedures.

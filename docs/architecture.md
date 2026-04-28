# Cheque Writer Architecture

## Recommended architecture

```text
Browser / User
  -> Next.js React UI
  -> Next.js route handlers / BFF
  -> C# ASP.NET Core ERP Integration API
  -> SQL Server stored procedures/views
  -> Existing ERP tables + cw.* cheque writer tables
```

## Why separate module

The existing ERP is already live. Therefore the cheque writer should be a separate module that reads approved payment vouchers and maintains cheque print control records separately.

This avoids changes to the live payment voucher table and gives better audit control.

## Login Option A recommendation

Option A is good if the ERP user table and password validation can be exposed safely through a stored procedure or ERP authentication service.

Recommended production rule:

- Next.js never validates ERP passwords.
- C# API receives login request.
- C# API calls an ERP stored procedure such as `cw.usp_CW_ValidateErpLogin`.
- Stored procedure returns user identity and permissions.
- C# API issues a JWT/session token for the cheque writer module.

If ERP password hashing or legacy auth cannot be safely reused, switch to Option B later: Cheque Writer users mapped to ERP user codes.

## Data ownership

| Data | Owner |
|---|---|
| Payment Voucher | Existing ERP |
| Voucher approval | Existing ERP |
| Bank account selected on voucher | Existing ERP |
| Cheque no entered on voucher | Existing ERP |
| Payee/amount/cheque date | Existing ERP |
| Cheque book range | Cheque Writer |
| Bank cheque layout | Cheque Writer |
| Print status/register/audit | Cheque Writer |

## Core print flow

```text
Approved payment voucher
  -> Cheque Writer queue
  -> Validate voucher + cheque no + bank account + cheque book
  -> Preview cheque using bank layout
  -> Print on pre-printed bank cheque leaf
  -> User confirms successful print
  -> Save cw.ChequePrintRegister and cw.ChequePrintAuditLog
```

## Security

Suggested permissions:

```text
CHEQUE_WRITER.VIEW
CHEQUE_WRITER.PRINT
CHEQUE_WRITER.REPRINT
CHEQUE_WRITER.VOID
CHEQUE_WRITER.CHEQUE_BOOK_MAINTAIN
CHEQUE_WRITER.LAYOUT_MAINTAIN
CHEQUE_WRITER.REPORT_VIEW
CHEQUE_WRITER.ADMIN
```

## Important production controls

- Approved vouchers only.
- One voucher can have only one active printed cheque record.
- Bank account + cheque number must be unique in the cheque writer register.
- Reprint must require permission and reason.
- Void/cancel must require permission and reason.
- ERP voucher table remains unchanged.

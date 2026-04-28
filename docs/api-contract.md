# API Contract

## Next.js web routes

These are consumed by the React UI.

| Method | URL | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Login through C# ERP API |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/cw/vouchers` | Pending approved cheque vouchers |
| GET | `/api/cw/cheque-books` | Cheque book list |
| POST | `/api/cw/cheque-books` | Create cheque book |
| GET | `/api/cw/layouts` | Bank layout list |
| POST | `/api/cw/layouts` | Create bank cheque layout |
| POST | `/api/cw/print` | Confirm cheque printed |

## C# ERP Integration API

| Method | URL | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | ERP login validation + token |
| GET | `/api/cheque-writer/vouchers` | Pending vouchers from ERP |
| GET | `/api/cheque-writer/cheque-books` | Cheque book master list |
| POST | `/api/cheque-writer/cheque-books` | Create cheque book |
| GET | `/api/cheque-writer/layouts` | Bank layout list |
| POST | `/api/cheque-writer/layouts` | Create layout |
| POST | `/api/cheque-writer/print-confirmations` | Save print confirmation |

## Common response shape

```json
{
  "success": true,
  "data": {}
}
```

Error shape:

```json
{
  "success": false,
  "error": "Message here"
}
```

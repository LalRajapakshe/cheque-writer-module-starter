/*
  ERP bridge stored procedure templates.
  Replace the mock SELECT statements with the actual ERP user/voucher table mappings.
*/

CREATE OR ALTER PROCEDURE cw.usp_CW_ValidateErpLogin
    @UserName NVARCHAR(100),
    @Password NVARCHAR(300),
    @CompanyCode NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    /*
      TODO production mapping:
      - Validate @UserName and @Password against ERP user/security logic.
      - Do not return password or password hash.
      - Return permission list for Cheque Writer.
    */

    IF (@UserName = N'lal' AND @Password = N'demo123')
    BEGIN
        SELECT
            CAST('1' AS NVARCHAR(100)) AS ErpUserId,
            @UserName AS UserName,
            N'Lal Rajapakshe' AS DisplayName,
            ISNULL(@CompanyCode, N'DEMO') AS CompanyCode,
            N'MAIN' AS BranchCode,
            N'CHEQUE_WRITER.VIEW,CHEQUE_WRITER.PRINT,CHEQUE_WRITER.REPRINT,CHEQUE_WRITER.VOID,CHEQUE_WRITER.CHEQUE_BOOK_MAINTAIN,CHEQUE_WRITER.LAYOUT_MAINTAIN,CHEQUE_WRITER.REPORT_VIEW,CHEQUE_WRITER.ADMIN' AS Permissions;
        RETURN;
    END

    SELECT
        CAST(NULL AS NVARCHAR(100)) AS ErpUserId,
        CAST(NULL AS NVARCHAR(100)) AS UserName,
        CAST(NULL AS NVARCHAR(200)) AS DisplayName,
        CAST(NULL AS NVARCHAR(50)) AS CompanyCode,
        CAST(NULL AS NVARCHAR(50)) AS BranchCode,
        CAST(NULL AS NVARCHAR(MAX)) AS Permissions
    WHERE 1 = 0;
END;
GO

CREATE OR ALTER PROCEDURE cw.usp_CW_GetPendingPaymentVouchers
    @ErpUserId NVARCHAR(100),
    @CompanyCode NVARCHAR(50) = NULL,
    @BranchCode NVARCHAR(50) = NULL,
    @BankAccountCode NVARCHAR(50) = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    /*
      TODO production mapping:
      Replace this mock CTE with existing ERP payment voucher table/view.
      Required business rule:
      - PaymentMode = CHEQUE
      - ApprovalStatus = APPROVED
      - Voucher not already printed in cw.ChequePrintRegister
      - Apply user branch/bank/company rights
    */

    WITH ERP_APPROVED_CHEQUE_VOUCHERS AS (
        SELECT
            N'PV-000001' AS VoucherNo,
            CAST(GETDATE() AS DATE) AS VoucherDate,
            N'DEMO' AS CompanyCode,
            N'MAIN' AS BranchCode,
            N'SUP001' AS PayeeCode,
            N'ABC Suppliers (Pvt) Ltd' AS PayeeName,
            CAST(125000.00 AS DECIMAL(18,2)) AS Amount,
            N'LKR' AS CurrencyCode,
            N'BOC-CURRENT-001' AS BankAccountCode,
            N'BOC Current Account' AS BankAccountName,
            N'000123' AS ChequeNo,
            CAST(GETDATE() AS DATE) AS ChequeDate,
            N'APPROVED' AS VoucherStatus,
            N'Manager' AS ApprovedBy,
            DATEADD(HOUR, -2, SYSDATETIME()) AS ApprovedDate
    )
    SELECT v.*
    FROM ERP_APPROVED_CHEQUE_VOUCHERS v
    WHERE (@CompanyCode IS NULL OR v.CompanyCode = @CompanyCode)
      AND (@BranchCode IS NULL OR v.BranchCode = @BranchCode)
      AND (@BankAccountCode IS NULL OR v.BankAccountCode = @BankAccountCode)
      AND (@FromDate IS NULL OR v.VoucherDate >= @FromDate)
      AND (@ToDate IS NULL OR v.VoucherDate <= @ToDate)
      AND NOT EXISTS (
          SELECT 1
          FROM cw.ChequePrintRegister pr
          WHERE pr.VoucherNo = v.VoucherNo
            AND pr.PrintStatus IN (N'PRINTED', N'REPRINTED')
      );
END;
GO

CREATE OR ALTER PROCEDURE cw.usp_CW_GetVoucherForPrint
    @VoucherNo NVARCHAR(50),
    @ErpUserId NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    EXEC cw.usp_CW_GetPendingPaymentVouchers
        @ErpUserId = @ErpUserId,
        @CompanyCode = NULL,
        @BranchCode = NULL,
        @BankAccountCode = NULL,
        @FromDate = NULL,
        @ToDate = NULL;
END;
GO

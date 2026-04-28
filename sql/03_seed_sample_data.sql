IF NOT EXISTS (SELECT 1 FROM cw.ChequeBookMaster WHERE BankAccountCode = N'BOC-CURRENT-001')
BEGIN
    INSERT INTO cw.ChequeBookMaster (
        BankAccountCode, BankAccountName, BankName, ChequeBookNo,
        StartChequeNo, EndChequeNo, IsActive, CreatedBy
    )
    VALUES (
        N'BOC-CURRENT-001', N'BOC Current Account', N'Bank of Ceylon', N'CB-2026-001',
        N'000100', N'000199', 1, N'system'
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM cw.BankChequeLayout WHERE BankAccountCode = N'BOC-CURRENT-001')
BEGIN
    INSERT INTO cw.BankChequeLayout (
        BankAccountCode, LayoutName, PageWidthMm, PageHeightMm,
        DateX, DateY, PayeeX, PayeeY, AmountNumberX, AmountNumberY,
        AmountWordsX, AmountWordsY, AccountPayeeX, AccountPayeeY, FontSize,
        IsActive, CreatedBy
    )
    VALUES (
        N'BOC-CURRENT-001', N'BOC Standard Cheque', 180.00, 90.00,
        135.00, 14.00, 28.00, 30.00, 145.00, 45.00,
        30.00, 53.00, 22.00, 18.00, 10.00,
        1, N'system'
    );
END;
GO

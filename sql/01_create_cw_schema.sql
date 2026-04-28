/*
  Cheque Writer schema.
  Safe to run in the ERP database or in a separate ChequeWriterDB.
  This script does not alter the existing ERP voucher table.
*/
use flg
go
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'cw')
    EXEC('CREATE SCHEMA cw');
GO

IF OBJECT_ID('cw.ChequeBookMaster', 'U') IS NULL
BEGIN
    CREATE TABLE cw.ChequeBookMaster (
        ChequeBookId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChequeBookMaster PRIMARY KEY,
        BankAccountCode NVARCHAR(50) NOT NULL,
        BankAccountName NVARCHAR(200) NULL,
        BankName NVARCHAR(150) NULL,
        ChequeBookNo NVARCHAR(50) NULL,
        StartChequeNo NVARCHAR(50) NOT NULL,
        EndChequeNo NVARCHAR(50) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ChequeBookMaster_IsActive DEFAULT (1),
        CreatedBy NVARCHAR(100) NOT NULL,
        CreatedDate DATETIME2(0) NOT NULL CONSTRAINT DF_ChequeBookMaster_CreatedDate DEFAULT (SYSDATETIME()),
        UpdatedBy NVARCHAR(100) NULL,
        UpdatedDate DATETIME2(0) NULL
    );
END;
GO

IF OBJECT_ID('cw.BankChequeLayout', 'U') IS NULL
BEGIN
    CREATE TABLE cw.BankChequeLayout (
        LayoutId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BankChequeLayout PRIMARY KEY,
        BankAccountCode NVARCHAR(50) NOT NULL,
        LayoutName NVARCHAR(100) NOT NULL,
        PageWidthMm DECIMAL(10,2) NOT NULL,
        PageHeightMm DECIMAL(10,2) NOT NULL,
        DateX DECIMAL(10,2) NOT NULL,
        DateY DECIMAL(10,2) NOT NULL,
        PayeeX DECIMAL(10,2) NOT NULL,
        PayeeY DECIMAL(10,2) NOT NULL,
        AmountNumberX DECIMAL(10,2) NOT NULL,
        AmountNumberY DECIMAL(10,2) NOT NULL,
        AmountWordsX DECIMAL(10,2) NOT NULL,
        AmountWordsY DECIMAL(10,2) NOT NULL,
        AccountPayeeX DECIMAL(10,2) NULL,
        AccountPayeeY DECIMAL(10,2) NULL,
        FontSize DECIMAL(10,2) NOT NULL CONSTRAINT DF_BankChequeLayout_FontSize DEFAULT (10),
        IsActive BIT NOT NULL CONSTRAINT DF_BankChequeLayout_IsActive DEFAULT (1),
        CreatedBy NVARCHAR(100) NOT NULL,
        CreatedDate DATETIME2(0) NOT NULL CONSTRAINT DF_BankChequeLayout_CreatedDate DEFAULT (SYSDATETIME()),
        UpdatedBy NVARCHAR(100) NULL,
        UpdatedDate DATETIME2(0) NULL
    );
END;
GO

IF OBJECT_ID('cw.ChequePrintRegister', 'U') IS NULL
BEGIN
    CREATE TABLE cw.ChequePrintRegister (
        ChequePrintId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChequePrintRegister PRIMARY KEY,
        VoucherNo NVARCHAR(50) NOT NULL,
        VoucherDate DATE NULL,
        CompanyCode NVARCHAR(50) NULL,
        BranchCode NVARCHAR(50) NULL,
        BankAccountCode NVARCHAR(50) NOT NULL,
        BankAccountName NVARCHAR(200) NULL,
        ChequeNo NVARCHAR(50) NOT NULL,
        ChequeDate DATE NOT NULL,
        PayeeName NVARCHAR(300) NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        AmountInWords NVARCHAR(1000) NULL,
        ChequeBookId INT NULL,
        LayoutId INT NULL,
        PrintStatus NVARCHAR(30) NOT NULL,
        PrintCount INT NOT NULL CONSTRAINT DF_ChequePrintRegister_PrintCount DEFAULT (0),
        PrintedBy NVARCHAR(100) NULL,
        PrintedDate DATETIME2(0) NULL,
        LastReprintBy NVARCHAR(100) NULL,
        LastReprintDate DATETIME2(0) NULL,
        LastReprintReason NVARCHAR(500) NULL,
        CancelledBy NVARCHAR(100) NULL,
        CancelledDate DATETIME2(0) NULL,
        CancelReason NVARCHAR(500) NULL,
        CreatedBy NVARCHAR(100) NOT NULL,
        CreatedDate DATETIME2(0) NOT NULL CONSTRAINT DF_ChequePrintRegister_CreatedDate DEFAULT (SYSDATETIME()),
        CONSTRAINT UQ_ChequePrintRegister_VoucherNo UNIQUE (VoucherNo),
        CONSTRAINT UQ_ChequePrintRegister_BankCheque UNIQUE (BankAccountCode, ChequeNo)
    );
END;
GO

IF OBJECT_ID('cw.ChequePrintAuditLog', 'U') IS NULL
BEGIN
    CREATE TABLE cw.ChequePrintAuditLog (
        AuditId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChequePrintAuditLog PRIMARY KEY,
        ChequePrintId INT NULL,
        VoucherNo NVARCHAR(50) NOT NULL,
        BankAccountCode NVARCHAR(50) NULL,
        ChequeNo NVARCHAR(50) NULL,
        ActionName NVARCHAR(50) NOT NULL,
        ActionReason NVARCHAR(500) NULL,
        OldStatus NVARCHAR(30) NULL,
        NewStatus NVARCHAR(30) NULL,
        ActionBy NVARCHAR(100) NOT NULL,
        ActionDate DATETIME2(0) NOT NULL CONSTRAINT DF_ChequePrintAuditLog_ActionDate DEFAULT (SYSDATETIME()),
        MachineName NVARCHAR(100) NULL,
        IpAddress NVARCHAR(50) NULL,
        Remarks NVARCHAR(1000) NULL
    );
END;
GO

IF OBJECT_ID('cw.UserPermissionCache', 'U') IS NULL
BEGIN
    CREATE TABLE cw.UserPermissionCache (
        ErpUserId NVARCHAR(100) NOT NULL,
        PermissionCode NVARCHAR(100) NOT NULL,
        IsAllowed BIT NOT NULL CONSTRAINT DF_UserPermissionCache_IsAllowed DEFAULT (1),
        UpdatedDate DATETIME2(0) NOT NULL CONSTRAINT DF_UserPermissionCache_UpdatedDate DEFAULT (SYSDATETIME()),
        CONSTRAINT PK_UserPermissionCache PRIMARY KEY (ErpUserId, PermissionCode)
    );
END;
GO

using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins("http://localhost:3000")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<DbConnectionFactory>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ChequeWriterService>();

var signingKey = builder.Configuration["Jwt:SigningKey"] ?? throw new InvalidOperationException("Jwt:SigningKey missing");
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = key,
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();
app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseAuthorization();

static IResult ServerError(Exception ex) => Results.Json(new
{
    success = false,
    error = ex.GetBaseException().Message
}, statusCode: StatusCodes.Status500InternalServerError);

app.MapGet("/api/health", () => Results.Ok(new { success = true, data = new { service = "ChequeWriter.ErpApi", status = "OK" } }));

app.MapPost("/api/auth/login", async (LoginRequest request, AuthService service) =>
{
    try
    {
        var result = await service.LoginAsync(request);
        return result is null
            ? Results.Json(new { success = false, error = "Invalid ERP user name or password." }, statusCode: StatusCodes.Status401Unauthorized)
            : Results.Ok(new { success = true, data = result });
    }
    catch (Exception ex)
    {
        return ServerError(ex);
    }
});

var secured = app.MapGroup("/api/cheque-writer").RequireAuthorization();

secured.MapGet("/vouchers", async (ClaimsPrincipal user, ChequeWriterService service, string? bankAccountCode, DateTime? fromDate, DateTime? toDate, int? maxRows) =>
{
    try
    {
        var rows = await service.GetPendingVouchersAsync(user, bankAccountCode, fromDate, toDate, maxRows);
        return Results.Ok(new { success = true, data = rows });
    }
    catch (Exception ex)
    {
        return ServerError(ex);
    }
});

secured.MapGet("/cheque-books", async (ChequeWriterService service) =>
{
    try
    {
        var rows = await service.GetChequeBooksAsync();
        return Results.Ok(new { success = true, data = rows });
    }
    catch (Exception ex)
    {
        return ServerError(ex);
    }
});

secured.MapPost("/cheque-books", async (ClaimsPrincipal user, ChequeBookCreateRequest request, ChequeWriterService service) =>
{
    try
    {
        var result = await service.CreateChequeBookAsync(user, request);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }
    catch (Exception ex)
    {
        return ServerError(ex);
    }
});

secured.MapGet("/layouts", async (ChequeWriterService service) =>
{
    try
    {
        var rows = await service.GetLayoutsAsync();
        return Results.Ok(new { success = true, data = rows });
    }
    catch (Exception ex)
    {
        return ServerError(ex);
    }
});

secured.MapPost("/layouts", async (ClaimsPrincipal user, ChequeLayoutUpsertRequest request, ChequeWriterService service) =>
{
    try
    {
        var result = await service.CreateLayoutAsync(user, request);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }
    catch (Exception ex)
    {
        return ServerError(ex);
    }
});

secured.MapPut("/layouts/{layoutId:int}", async (int layoutId, ClaimsPrincipal user, ChequeLayoutUpsertRequest request, ChequeWriterService service) =>
{
    try
    {
        var result = await service.UpdateLayoutAsync(user, layoutId, request);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }
    catch (Exception ex)
    {
        return ServerError(ex);
    }
});

secured.MapPost("/print-confirmations", async (ClaimsPrincipal user, PrintConfirmationRequest request, ChequeWriterService service) =>
{
    try
    {
        var result = await service.ConfirmPrintAsync(user, request);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }
    catch (Exception ex)
    {
        return ServerError(ex);
    }
});

app.Run();

public sealed class DbConnectionFactory(IConfiguration configuration)
{
    public IDbConnection Create() => new SqlConnection(configuration.GetConnectionString("ErpDb"));
}

public sealed class TokenService(IConfiguration configuration)
{
    public string IssueToken(ErpUser user)
    {
        var claims = new List<Claim>
        {
            new("erp_user_id", user.ErpUserId),
            new(ClaimTypes.Name, user.UserName),
            new("display_name", user.DisplayName),
            new("company_code", user.CompanyCode ?? ""),
            new("branch_code", user.BranchCode ?? "")
        };

        foreach (var permission in user.Permissions)
        {
            claims.Add(new Claim("permission", permission));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:SigningKey"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public sealed class AuthService(IConfiguration configuration, DbConnectionFactory dbFactory, TokenService tokenService)
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var demoMode = configuration.GetValue<bool>("ChequeWriter:DemoMode");
        ErpUser? user;

        if (demoMode)
        {
            user = request.UserName.Equals("lal", StringComparison.OrdinalIgnoreCase) && request.Password == "demo123"
                ? ErpUser.Demo(request.CompanyCode ?? "DEMO")
                : null;
        }
        else
        {
            using var db = dbFactory.Create();
            var row = await db.QueryFirstOrDefaultAsync<ErpUserRow>(
                "cw.usp_CW_ValidateErpLogin",
                new { request.UserName, request.Password, CompanyCode = string.IsNullOrWhiteSpace(request.CompanyCode) ? null : request.CompanyCode },
                commandType: CommandType.StoredProcedure,
                commandTimeout: 120);

            user = row?.ToErpUser();
        }

        if (user is null) return null;
        var token = tokenService.IssueToken(user);
        return new LoginResponse(token, user);
    }
}

public sealed class ChequeWriterService(IConfiguration configuration, DbConnectionFactory dbFactory)
{
    private static readonly List<ChequeLayoutDto> DemoLayouts = [ChequeLayoutDto.Demo()];

    public async Task<IReadOnlyList<VoucherDto>> GetPendingVouchersAsync(ClaimsPrincipal user, string? bankAccountCode, DateTime? fromDate, DateTime? toDate, int? maxRows)
    {
        if (configuration.GetValue<bool>("ChequeWriter:DemoMode")) return [VoucherDto.Demo()];

        var effectiveFromDate = fromDate ?? DateTime.Today;
        var effectiveMaxRows = Math.Clamp(maxRows ?? 200, 1, 1000);

        using var db = dbFactory.Create();
        var rows = await db.QueryAsync<VoucherDto>(
            "cw.usp_CW_GetPendingPaymentVouchers",
            new
            {
                ErpUserId = user.FindFirstValue("erp_user_id"),
                CompanyCode = EmptyToNull(user.FindFirstValue("company_code")),
                BranchCode = EmptyToNull(user.FindFirstValue("branch_code")),
                BankAccountCode = EmptyToNull(bankAccountCode),
                FromDate = effectiveFromDate,
                ToDate = toDate
            },
            commandType: CommandType.StoredProcedure,
            commandTimeout: 120);

        return rows.Select(NormalizeVoucher).Take(effectiveMaxRows).ToList();
    }

    public async Task<IReadOnlyList<ChequeBookDto>> GetChequeBooksAsync()
    {
        if (configuration.GetValue<bool>("ChequeWriter:DemoMode")) return [ChequeBookDto.Demo()];
        using var db = dbFactory.Create();
        var rows = await db.QueryAsync<ChequeBookDto>(@"
            SELECT ChequeBookId, BankAccountCode, BankAccountName, BankName, ChequeBookNo, StartChequeNo, EndChequeNo, IsActive
            FROM cw.ChequeBookMaster
            ORDER BY ChequeBookId DESC", commandTimeout: 120);
        return rows.ToList();
    }

    public async Task<ApiResult> CreateChequeBookAsync(ClaimsPrincipal user, ChequeBookCreateRequest request)
    {
        if (!HasPermission(user, "CHEQUE_WRITER.CHEQUE_BOOK_MAINTAIN")) return ApiResult.Fail("No permission to maintain cheque books.");
        if (configuration.GetValue<bool>("ChequeWriter:DemoMode")) return ApiResult.Ok(new { request.BankAccountCode, request.StartChequeNo, request.EndChequeNo });

        using var db = dbFactory.Create();
        var chequeBookId = await db.ExecuteScalarAsync<int>(@"
            INSERT INTO cw.ChequeBookMaster (BankAccountCode, BankAccountName, BankName, ChequeBookNo, StartChequeNo, EndChequeNo, CreatedBy)
            OUTPUT INSERTED.ChequeBookId
            VALUES (@BankAccountCode, @BankAccountName, @BankName, @ChequeBookNo, @StartChequeNo, @EndChequeNo, @CreatedBy)",
            new { request.BankAccountCode, request.BankAccountName, request.BankName, request.ChequeBookNo, request.StartChequeNo, request.EndChequeNo, CreatedBy = user.Identity?.Name ?? "system" },
            commandTimeout: 120);
        return ApiResult.Ok(new { chequeBookId, request.BankAccountCode });
    }

    public async Task<IReadOnlyList<ChequeLayoutDto>> GetLayoutsAsync()
    {
        if (configuration.GetValue<bool>("ChequeWriter:DemoMode")) return DemoLayouts.OrderByDescending(x => x.LayoutId).ToList();

        using var db = dbFactory.Create();
        var rows = await db.QueryAsync<ChequeLayoutDto>(@"
            SELECT
                LayoutId,
                BankAccountCode,
                LayoutName,
                PageWidthMm,
                PageHeightMm,
                DateX,
                DateY,
                PayeeX,
                PayeeY,
                AmountNumberX,
                AmountNumberY,
                AmountWordsX,
                AmountWordsY,
                AccountPayeeX,
                AccountPayeeY,
                FontSize,
                IsActive
            FROM cw.BankChequeLayout
            ORDER BY LayoutId DESC", commandTimeout: 120);

        return rows.ToList();
    }

    public async Task<ApiResult> CreateLayoutAsync(ClaimsPrincipal user, ChequeLayoutUpsertRequest request)
    {
        if (!HasPermission(user, "CHEQUE_WRITER.LAYOUT_MAINTAIN")) return ApiResult.Fail("No permission to maintain cheque layouts.");

        if (configuration.GetValue<bool>("ChequeWriter:DemoMode"))
        {
            var nextId = DemoLayouts.Count == 0 ? 1 : DemoLayouts.Max(x => x.LayoutId) + 1;
            var row = request.ToDto(nextId);
            DemoLayouts.Add(row);
            return ApiResult.Ok(row);
        }

        using var db = dbFactory.Create();
        var layoutId = await db.ExecuteScalarAsync<int>(@"
            INSERT INTO cw.BankChequeLayout
            (BankAccountCode, LayoutName, PageWidthMm, PageHeightMm, DateX, DateY, PayeeX, PayeeY, AmountNumberX, AmountNumberY, AmountWordsX, AmountWordsY, AccountPayeeX, AccountPayeeY, FontSize, IsActive, CreatedBy)
            OUTPUT INSERTED.LayoutId
            VALUES
            (@BankAccountCode, @LayoutName, @PageWidthMm, @PageHeightMm, @DateX, @DateY, @PayeeX, @PayeeY, @AmountNumberX, @AmountNumberY, @AmountWordsX, @AmountWordsY, @AccountPayeeX, @AccountPayeeY, @FontSize, @IsActive, @CreatedBy)",
            new
            {
                request.BankAccountCode,
                request.LayoutName,
                request.PageWidthMm,
                request.PageHeightMm,
                request.DateX,
                request.DateY,
                request.PayeeX,
                request.PayeeY,
                request.AmountNumberX,
                request.AmountNumberY,
                request.AmountWordsX,
                request.AmountWordsY,
                request.AccountPayeeX,
                request.AccountPayeeY,
                request.FontSize,
                request.IsActive,
                CreatedBy = user.Identity?.Name ?? "system"
            },
            commandTimeout: 120);

        return ApiResult.Ok(new { layoutId, request.BankAccountCode });
    }

    public async Task<ApiResult> UpdateLayoutAsync(ClaimsPrincipal user, int layoutId, ChequeLayoutUpsertRequest request)
    {
        if (!HasPermission(user, "CHEQUE_WRITER.LAYOUT_MAINTAIN")) return ApiResult.Fail("No permission to maintain cheque layouts.");

        if (configuration.GetValue<bool>("ChequeWriter:DemoMode"))
        {
            var index = DemoLayouts.FindIndex(x => x.LayoutId == layoutId);
            if (index < 0) return ApiResult.Fail("Layout was not found.");
            var row = request.ToDto(layoutId);
            DemoLayouts[index] = row;
            return ApiResult.Ok(row);
        }

        using var db = dbFactory.Create();
        var affected = await db.ExecuteAsync(@"
            UPDATE cw.BankChequeLayout
            SET
                BankAccountCode = @BankAccountCode,
                LayoutName = @LayoutName,
                PageWidthMm = @PageWidthMm,
                PageHeightMm = @PageHeightMm,
                DateX = @DateX,
                DateY = @DateY,
                PayeeX = @PayeeX,
                PayeeY = @PayeeY,
                AmountNumberX = @AmountNumberX,
                AmountNumberY = @AmountNumberY,
                AmountWordsX = @AmountWordsX,
                AmountWordsY = @AmountWordsY,
                AccountPayeeX = @AccountPayeeX,
                AccountPayeeY = @AccountPayeeY,
                FontSize = @FontSize,
                IsActive = @IsActive,
                UpdatedBy = @UpdatedBy,
                UpdatedDate = SYSDATETIME()
            WHERE LayoutId = @LayoutId",
            new
            {
                LayoutId = layoutId,
                request.BankAccountCode,
                request.LayoutName,
                request.PageWidthMm,
                request.PageHeightMm,
                request.DateX,
                request.DateY,
                request.PayeeX,
                request.PayeeY,
                request.AmountNumberX,
                request.AmountNumberY,
                request.AmountWordsX,
                request.AmountWordsY,
                request.AccountPayeeX,
                request.AccountPayeeY,
                request.FontSize,
                request.IsActive,
                UpdatedBy = user.Identity?.Name ?? "system"
            },
            commandTimeout: 120);

        if (affected == 0) return ApiResult.Fail("Layout was not found or was not updated.");
        return ApiResult.Ok(new { layoutId, request.BankAccountCode });
    }

    public async Task<ApiResult> ConfirmPrintAsync(ClaimsPrincipal user, PrintConfirmationRequest request)
    {
        if (!HasPermission(user, "CHEQUE_WRITER.PRINT")) return ApiResult.Fail("No permission to print cheques.");
        if (!request.PrintedSuccessfully) return ApiResult.Fail("Print was not confirmed as successful.");
        if (configuration.GetValue<bool>("ChequeWriter:DemoMode")) return ApiResult.Ok(new { request.VoucherNo, status = "PRINTED" });

        using var db = dbFactory.Create();
        db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var voucher = await db.QueryFirstOrDefaultAsync<VoucherDto>(
                "cw.usp_CW_GetVoucherForPrint",
                new { request.VoucherNo, ErpUserId = user.FindFirstValue("erp_user_id") },
                transaction: tx,
                commandType: CommandType.StoredProcedure,
                commandTimeout: 120);

            voucher = voucher is null ? null : NormalizeVoucher(voucher);
            if (voucher is null) { tx.Rollback(); return ApiResult.Fail("Voucher is not available for printing or user has no access."); }
            if (string.IsNullOrWhiteSpace(voucher.BankAccountCode)) { tx.Rollback(); return ApiResult.Fail("Voucher has no bank account."); }
            if (string.IsNullOrWhiteSpace(voucher.ChequeNo)) { tx.Rollback(); return ApiResult.Fail("Voucher has no cheque number."); }
            if (voucher.ChequeDate is null) { tx.Rollback(); return ApiResult.Fail("Voucher has no cheque date."); }

            var book = await db.QueryFirstOrDefaultAsync<ChequeBookDto>(@"
                SELECT TOP 1 ChequeBookId, BankAccountCode, BankAccountName, BankName, ChequeBookNo, StartChequeNo, EndChequeNo, IsActive
                FROM cw.ChequeBookMaster
                WHERE BankAccountCode = @BankAccountCode
                  AND IsActive = 1
                  AND @ChequeNo BETWEEN StartChequeNo AND EndChequeNo
                ORDER BY ChequeBookId DESC",
                new { voucher.BankAccountCode, voucher.ChequeNo }, tx, commandTimeout: 120);

            if (book is null) { tx.Rollback(); return ApiResult.Fail("Cheque number is outside the active cheque book range."); }

            var layout = await db.QueryFirstOrDefaultAsync<ChequeLayoutDto>(@"
                SELECT TOP 1 LayoutId, BankAccountCode, LayoutName, PageWidthMm, PageHeightMm, DateX, DateY, PayeeX, PayeeY, AmountNumberX, AmountNumberY, AmountWordsX, AmountWordsY, AccountPayeeX, AccountPayeeY, FontSize, IsActive
                FROM cw.BankChequeLayout
                WHERE BankAccountCode = @BankAccountCode AND IsActive = 1
                ORDER BY LayoutId DESC",
                new { voucher.BankAccountCode }, tx, commandTimeout: 120);

            if (layout is null) { tx.Rollback(); return ApiResult.Fail("No active cheque layout configured for this bank account."); }

            var existingCount = await db.ExecuteScalarAsync<int>(@"
                SELECT COUNT(1) FROM cw.ChequePrintRegister
                WHERE VoucherNo = @VoucherNo OR (BankAccountCode = @BankAccountCode AND ChequeNo = @ChequeNo)",
                new { voucher.VoucherNo, voucher.BankAccountCode, voucher.ChequeNo }, tx, commandTimeout: 120);

            if (existingCount > 0) { tx.Rollback(); return ApiResult.Fail("Voucher or cheque number has already been printed/registered."); }

            var userName = user.Identity?.Name ?? "system";
            var printId = await db.ExecuteScalarAsync<int>(@"
                INSERT INTO cw.ChequePrintRegister
                (VoucherNo, VoucherDate, CompanyCode, BranchCode, BankAccountCode, BankAccountName, ChequeNo, ChequeDate, PayeeName, Amount, AmountInWords, ChequeBookId, LayoutId, PrintStatus, PrintCount, PrintedBy, PrintedDate, CreatedBy)
                OUTPUT INSERTED.ChequePrintId
                VALUES
                (@VoucherNo, @VoucherDate, @CompanyCode, @BranchCode, @BankAccountCode, @BankAccountName, @ChequeNo, @ChequeDate, @PayeeName, @Amount, @AmountInWords, @ChequeBookId, @LayoutId, N'PRINTED', 1, @UserName, SYSDATETIME(), @UserName)",
                new { voucher.VoucherNo, voucher.VoucherDate, voucher.CompanyCode, voucher.BranchCode, voucher.BankAccountCode, voucher.BankAccountName, voucher.ChequeNo, ChequeDate = voucher.ChequeDate!.Value, voucher.PayeeName, voucher.Amount, request.AmountInWords, book.ChequeBookId, layout.LayoutId, UserName = userName }, tx, commandTimeout: 120);

            await db.ExecuteAsync(@"
                INSERT INTO cw.ChequePrintAuditLog (ChequePrintId, VoucherNo, BankAccountCode, ChequeNo, ActionName, NewStatus, ActionBy, Remarks)
                VALUES (@ChequePrintId, @VoucherNo, @BankAccountCode, @ChequeNo, N'PRINT_CONFIRM', N'PRINTED', @ActionBy, N'Cheque print confirmed by user.')",
                new { ChequePrintId = printId, voucher.VoucherNo, voucher.BankAccountCode, voucher.ChequeNo, ActionBy = userName }, tx, commandTimeout: 120);

            tx.Commit();
            return ApiResult.Ok(new { chequePrintId = printId, status = "PRINTED" });
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    private static VoucherDto NormalizeVoucher(VoucherDto voucher)
    {
        voucher.CurrencyCode = string.IsNullOrWhiteSpace(voucher.CurrencyCode) ? "LKR" : voucher.CurrencyCode;
        voucher.PrintStatus = string.IsNullOrWhiteSpace(voucher.PrintStatus) ? "READY" : voucher.PrintStatus;
        voucher.VoucherStatus = string.IsNullOrWhiteSpace(voucher.VoucherStatus) ? "APPROVED" : voucher.VoucherStatus;
        return voucher;
    }

    private static string? EmptyToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;

    private static bool HasPermission(ClaimsPrincipal user, string permission) =>
        user.Claims.Any(c => c.Type == "permission" && c.Value == permission) ||
        user.Claims.Any(c => c.Type == "permission" && c.Value == "CHEQUE_WRITER.ADMIN");
}

public sealed record LoginRequest(string UserName, string Password, string? CompanyCode);
public sealed record LoginResponse(string Token, ErpUser User);

public sealed record ErpUser(string ErpUserId, string UserName, string DisplayName, string? CompanyCode, string? BranchCode, string[] Permissions)
{
    public static ErpUser Demo(string companyCode) => new(
        "1",
        "lal",
        "Lal Rajapakshe",
        companyCode,
        "MAIN",
        ["CHEQUE_WRITER.VIEW", "CHEQUE_WRITER.PRINT", "CHEQUE_WRITER.REPRINT", "CHEQUE_WRITER.VOID", "CHEQUE_WRITER.CHEQUE_BOOK_MAINTAIN", "CHEQUE_WRITER.LAYOUT_MAINTAIN", "CHEQUE_WRITER.REPORT_VIEW", "CHEQUE_WRITER.ADMIN"]);
}

public sealed record ErpUserRow(string ErpUserId, string UserName, string DisplayName, string? CompanyCode, string? BranchCode, string? Permissions)
{
    public ErpUser ToErpUser() => new(ErpUserId, UserName, DisplayName, CompanyCode, BranchCode, (Permissions ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
}

public sealed class VoucherDto
{
    public string VoucherNo { get; set; } = "";
    public DateTime? VoucherDate { get; set; }
    public string? CompanyCode { get; set; }
    public string? BranchCode { get; set; }
    public string? PayeeCode { get; set; }
    public string PayeeName { get; set; } = "";
    public decimal Amount { get; set; }
    public string CurrencyCode { get; set; } = "LKR";
    public string BankAccountCode { get; set; } = "";
    public string? BankAccountName { get; set; }
    public string ChequeNo { get; set; } = "";
    public DateTime? ChequeDate { get; set; }
    public string VoucherStatus { get; set; } = "APPROVED";
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedDate { get; set; }
    public string? PrintStatus { get; set; } = "READY";

    public static VoucherDto Demo() => new()
    {
        VoucherNo = "PV-000001",
        VoucherDate = DateTime.Today,
        CompanyCode = "DEMO",
        BranchCode = "MAIN",
        PayeeCode = "SUP001",
        PayeeName = "ABC Suppliers (Pvt) Ltd",
        Amount = 125000m,
        CurrencyCode = "LKR",
        BankAccountCode = "BOC-CURRENT-001",
        BankAccountName = "BOC Current Account",
        ChequeNo = "000123",
        ChequeDate = DateTime.Today,
        VoucherStatus = "APPROVED",
        ApprovedBy = "Manager",
        ApprovedDate = DateTime.Now.AddHours(-2),
        PrintStatus = "READY"
    };
}

public sealed class ChequeBookDto
{
    public int ChequeBookId { get; set; }
    public string BankAccountCode { get; set; } = "";
    public string? BankAccountName { get; set; }
    public string? BankName { get; set; }
    public string? ChequeBookNo { get; set; }
    public string StartChequeNo { get; set; } = "";
    public string EndChequeNo { get; set; } = "";
    public bool IsActive { get; set; }

    public static ChequeBookDto Demo() => new()
    {
        ChequeBookId = 1,
        BankAccountCode = "BOC-CURRENT-001",
        BankAccountName = "BOC Current Account",
        BankName = "Bank of Ceylon",
        ChequeBookNo = "CB-2026-001",
        StartChequeNo = "000100",
        EndChequeNo = "000199",
        IsActive = true
    };
}

public sealed record ChequeBookCreateRequest(string BankAccountCode, string? BankAccountName, string? BankName, string? ChequeBookNo, string StartChequeNo, string EndChequeNo);

public sealed class ChequeLayoutDto
{
    public int LayoutId { get; set; }
    public string BankAccountCode { get; set; } = "";
    public string LayoutName { get; set; } = "";
    public decimal PageWidthMm { get; set; }
    public decimal PageHeightMm { get; set; }
    public decimal DateX { get; set; }
    public decimal DateY { get; set; }
    public decimal PayeeX { get; set; }
    public decimal PayeeY { get; set; }
    public decimal AmountNumberX { get; set; }
    public decimal AmountNumberY { get; set; }
    public decimal AmountWordsX { get; set; }
    public decimal AmountWordsY { get; set; }
    public decimal? AccountPayeeX { get; set; }
    public decimal? AccountPayeeY { get; set; }
    public decimal FontSize { get; set; }
    public bool IsActive { get; set; }

    public static ChequeLayoutDto Demo() => new()
    {
        LayoutId = 1,
        BankAccountCode = "BOC-CURRENT-001",
        LayoutName = "BOC Standard Cheque",
        PageWidthMm = 180,
        PageHeightMm = 90,
        DateX = 135,
        DateY = 14,
        PayeeX = 28,
        PayeeY = 30,
        AmountNumberX = 145,
        AmountNumberY = 45,
        AmountWordsX = 30,
        AmountWordsY = 53,
        AccountPayeeX = 22,
        AccountPayeeY = 18,
        FontSize = 10,
        IsActive = true
    };
}

public sealed record ChequeLayoutUpsertRequest(string BankAccountCode, string LayoutName, decimal PageWidthMm, decimal PageHeightMm, decimal DateX, decimal DateY, decimal PayeeX, decimal PayeeY, decimal AmountNumberX, decimal AmountNumberY, decimal AmountWordsX, decimal AmountWordsY, decimal? AccountPayeeX, decimal? AccountPayeeY, decimal FontSize, bool IsActive = true)
{
    public ChequeLayoutDto ToDto(int layoutId) => new()
    {
        LayoutId = layoutId,
        BankAccountCode = BankAccountCode,
        LayoutName = LayoutName,
        PageWidthMm = PageWidthMm,
        PageHeightMm = PageHeightMm,
        DateX = DateX,
        DateY = DateY,
        PayeeX = PayeeX,
        PayeeY = PayeeY,
        AmountNumberX = AmountNumberX,
        AmountNumberY = AmountNumberY,
        AmountWordsX = AmountWordsX,
        AmountWordsY = AmountWordsY,
        AccountPayeeX = AccountPayeeX,
        AccountPayeeY = AccountPayeeY,
        FontSize = FontSize,
        IsActive = IsActive
    };
}

public sealed record PrintConfirmationRequest(string VoucherNo, bool PrintedSuccessfully, string? AmountInWords);

public sealed record ApiResult(bool Success, object? Data, string? Error)
{
    public static ApiResult Ok(object data) => new(true, data, null);
    public static ApiResult Fail(string error) => new(false, null, error);
}

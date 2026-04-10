# ── Build Stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY FinFlow.Api/FinFlow.Api.csproj ./FinFlow.Api/
RUN dotnet restore ./FinFlow.Api/FinFlow.Api.csproj

COPY FinFlow.Api/ ./FinFlow.Api/
RUN dotnet publish ./FinFlow.Api/FinFlow.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ── Runtime Stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "FinFlow.Api.dll"]

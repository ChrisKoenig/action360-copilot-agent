#!/usr/bin/env pwsh
# Create Azure AD App Registration for Microsoft Graph API access

Write-Host "Creating Azure AD App Registration for UAT Routing Agent..." -ForegroundColor Cyan
Write-Host ""

$appName = "UAT-Routing-Agent-GraphAPI"

try {
    # Create the app registration
    Write-Host "Creating app registration '$appName'..." -ForegroundColor Yellow
    $app = az ad app create --display-name $appName --query "{appId:appId, id:id}" -o json | ConvertFrom-Json
    
    if (!$app) {
        throw "Failed to create app registration"
    }
    
    $clientId = $app.appId
    Write-Host "✓ App created successfully" -ForegroundColor Green
    Write-Host "  Application (Client) ID: $clientId" -ForegroundColor Gray
    
    # Get tenant ID
    $tenantId = az account show --query "tenantId" -o tsv
    Write-Host "  Tenant ID: $tenantId" -ForegroundColor Gray
    
    # Create service principal
    Write-Host "`nCreating service principal..." -ForegroundColor Yellow
    az ad sp create --id $clientId | Out-Null
    Write-Host "✓ Service principal created" -ForegroundColor Green
    
    # Add Microsoft Graph User.Read.All permission
    Write-Host "`nAdding Microsoft Graph API permissions..." -ForegroundColor Yellow
    $graphAppId = "00000003-0000-0000-c000-000000000000" # Microsoft Graph
    $userReadAllPermission = "df021288-bdef-4463-88db-98f22de89214" # User.Read.All
    
    az ad app permission add --id $clientId --api $graphAppId --api-permissions "$userReadAllPermission=Role" | Out-Null
    Write-Host "✓ Added User.Read.All permission" -ForegroundColor Green
    
    # Grant admin consent
    Write-Host "`nGranting admin consent..." -ForegroundColor Yellow
    az ad app permission admin-consent --id $clientId 2>$null
    Write-Host "✓ Admin consent granted" -ForegroundColor Green
    
    # Create client secret
    Write-Host "`nCreating client secret..." -ForegroundColor Yellow
    $secretResult = az ad app credential reset --id $clientId --years 2 --query "password" -o tsv
    Write-Host "✓ Client secret created" -ForegroundColor Green
    
    # Display results
    Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
    Write-Host "SUCCESS! Add these values to your local.settings.json:" -ForegroundColor Green
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host ""
    Write-Host "MICROSOFT_GRAPH_CLIENT_ID=" -NoNewline -ForegroundColor Yellow
    Write-Host $clientId
    Write-Host "MICROSOFT_GRAPH_CLIENT_SECRET=" -NoNewline -ForegroundColor Yellow
    Write-Host $secretResult
    Write-Host "MICROSOFT_GRAPH_TENANT_ID=" -NoNewline -ForegroundColor Yellow
    Write-Host $tenantId
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠ IMPORTANT: Save the client secret now - you won't be able to see it again!" -ForegroundColor Red
    Write-Host ""
    
    # Ask if user wants to update local.settings.json automatically
    $update = Read-Host "Update local.settings.json automatically? (Y/N)"
    if ($update -eq 'Y' -or $update -eq 'y') {
        $settingsPath = ".\local.settings.json"
        if (Test-Path $settingsPath) {
            $settings = Get-Content $settingsPath | ConvertFrom-Json
            $settings.Values.MICROSOFT_GRAPH_CLIENT_ID = $clientId
            $settings.Values.MICROSOFT_GRAPH_CLIENT_SECRET = $secretResult
            $settings.Values.MICROSOFT_GRAPH_TENANT_ID = $tenantId
            $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath
            Write-Host "✓ local.settings.json updated successfully!" -ForegroundColor Green
        }
        else {
            Write-Host "✗ local.settings.json not found at $settingsPath" -ForegroundColor Red
        }
    }
    
}
catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

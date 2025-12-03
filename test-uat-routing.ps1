param(
    [Parameter(Mandatory = $true)]
    [int]$WorkItemId,
    
    [string]$Project = "Unified Action Tracker",
    
    [string]$Endpoint = "http://localhost:7071/api/uat-routing"
)

# Build request body
$body = @{
    workItemId = $WorkItemId
    project    = $Project
} | ConvertTo-Json

# Call the function
try {
    Write-Host "Fetching UAT routing recommendation for work item $WorkItemId..." -ForegroundColor Cyan
    Write-Host ""
    
    $response = Invoke-RestMethod -Uri $Endpoint -Method Post -Body $body -ContentType "application/json"
    
    # Display results
    if ($response.success) {
        Write-Host "✓ Success!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Work Item ID: " -NoNewline -ForegroundColor Yellow
        Write-Host $response.workItemId
        Write-Host "Routing: " -NoNewline -ForegroundColor Yellow
        Write-Host $response.routing
        Write-Host "Service: " -NoNewline -ForegroundColor Yellow
        Write-Host $response.service
        Write-Host "Requestor: " -NoNewline -ForegroundColor Yellow
        Write-Host $response.requestor
        Write-Host "Milestone: " -NoNewline -ForegroundColor Yellow
        Write-Host $response.milestone
        Write-Host ""
        Write-Host "Reasoning:" -ForegroundColor Yellow
        Write-Host $response.reasoning
        Write-Host ""
        Write-Host "Ask:" -ForegroundColor Yellow
        Write-Host $response.ask
        Write-Host ""
        Write-Host "Timestamp: " -NoNewline -ForegroundColor Gray
        Write-Host $response.timestamp
    }
    else {
        Write-Host "✗ Error:" -ForegroundColor Red
        Write-Host $response.error
    }
    
    # Return full response object
    return $response
    
}
catch {
    Write-Host "✗ Failed to call endpoint:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

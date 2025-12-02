# Getting Started Guide

This guide will help you deploy and test the UAT Routing Copilot Agent.

## Step 1: Clone and Install

```powershell
# Navigate to your project directory
cd "c:\Users\chkoenig\OneDrive - Microsoft\src\action360-copilot-agent"

# Install dependencies
npm install
```

## Step 2: Configure Environment Variables

1. Copy the example environment file:
```powershell
Copy-Item .env.example .env
```

2. Edit `.env` with your actual values:
```env
# Azure DevOps Configuration
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-org
AZURE_DEVOPS_PAT=your-pat-token
AZURE_DEVOPS_PROJECT=your-project-name

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-10-01-preview

# Optional: Microsoft Graph for identity resolution
MICROSOFT_GRAPH_CLIENT_ID=your-client-id
MICROSOFT_GRAPH_CLIENT_SECRET=your-secret
MICROSOFT_GRAPH_TENANT_ID=your-tenant-id
```

### Getting Azure DevOps PAT

1. Go to [Azure DevOps](https://dev.azure.com)
2. Click on **User Settings** (top right) → **Personal Access Tokens**
3. Click **+ New Token**
4. Configure:
   - Name: "UAT Routing Agent"
   - Organization: Select your org
   - Expiration: 90 days (or custom)
   - Scopes: 
     - ✅ Work Items: Read
     - ✅ User Profile: Read
5. Copy the token (you won't see it again!)

### Getting Azure OpenAI Credentials

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your **Azure OpenAI** resource
3. Go to **Keys and Endpoint**
4. Copy:
   - Endpoint URL
   - Key 1 or Key 2
5. Note your deployment name from **Model deployments**

### Setting up Microsoft Graph (Optional)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **+ New registration**
4. Configure:
   - Name: "UAT Routing Agent"
   - Supported account types: Single tenant
   - Redirect URI: (leave blank)
5. After creation:
   - Copy **Application (client) ID**
   - Copy **Directory (tenant) ID**
6. Go to **Certificates & secrets** → **+ New client secret**
   - Description: "UAT Agent"
   - Expires: 24 months
   - Copy the **Value** (not the ID!)
7. Go to **API permissions**:
   - **+ Add a permission** → **Microsoft Graph** → **Application permissions**
   - Add: `User.Read.All`
   - Click **Grant admin consent**

## Step 3: Update local.settings.json

Copy your environment variables to `local.settings.json` for local testing:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_DEVOPS_ORG_URL": "https://dev.azure.com/your-org",
    "AZURE_DEVOPS_PAT": "your-pat",
    "AZURE_DEVOPS_PROJECT": "your-project",
    "AZURE_OPENAI_ENDPOINT": "https://your-resource.openai.azure.com",
    "AZURE_OPENAI_API_KEY": "your-key",
    "AZURE_OPENAI_DEPLOYMENT": "gpt-4o",
    "AZURE_OPENAI_API_VERSION": "2024-10-01-preview"
  }
}
```

## Step 4: Test Locally

Start the Azure Functions runtime:

```powershell
npm start
```

You should see output like:
```
Azure Functions Core Tools
Core Tools Version: 4.x
Function Runtime Version: 4.x

Functions:
  uat-routing: [POST] http://localhost:7071/api/uat-routing
  health: [GET] http://localhost:7071/api/health
```

### Test with curl

```powershell
# Test health endpoint
curl http://localhost:7071/api/health

# Test routing endpoint
curl -X POST http://localhost:7071/api/uat-routing `
  -H "Content-Type: application/json" `
  -d '{\"workItemId\":\"12345\",\"organization\":\"your-org\",\"project\":\"your-project\"}'
```

### Test with Postman

1. Open Postman
2. Create new POST request
3. URL: `http://localhost:7071/api/uat-routing`
4. Headers:
   - `Content-Type: application/json`
5. Body (raw JSON):
```json
{
  "workItemId": "12345",
  "organization": "your-org",
  "project": "your-project"
}
```
6. Click **Send**

Expected response:
```json
{
  "success": true,
  "workItemId": "12345",
  "routing": {
    "tag": "Tech RoB | Tech Feedback",
    "assignedTo": null,
    "priority": "P3",
    "areaPath": "Data & AI"
  },
  "service": {
    "name": "Azure OpenAI",
    "solutionArea": "Data & AI",
    "dri": "John Doe"
  },
  "requestor": {
    "email": "user@microsoft.com",
    "name": "User Name",
    "team": "CSU"
  },
  "milestone": {
    "status": "Blocked",
    "reason": "Technical issue",
    "commitment": "Committed"
  },
  "reasoning": [
    "Milestone is present and requestor is CSU",
    "Commitment is Committed",
    "Direct routing to Solution Area"
  ],
  "ask": [
    "Customer needs help with Azure OpenAI quota"
  ],
  "timestamp": "2025-12-01T10:00:00Z"
}
```

## Step 5: Deploy to Azure

### Option A: Deploy via VS Code

1. Install **Azure Functions** extension in VS Code
2. Open project folder
3. Click Azure icon in sidebar
4. Sign in to Azure
5. Click **Deploy to Function App**
6. Choose or create Function App
7. Wait for deployment to complete

### Option B: Deploy via Azure CLI

```powershell
# Login to Azure
az login

# Create resource group (if needed)
az group create --name rg-uat-agent --location eastus

# Create storage account
az storage account create `
  --name stuatagent `
  --resource-group rg-uat-agent `
  --location eastus `
  --sku Standard_LRS

# Create Function App
az functionapp create `
  --name func-uat-routing-agent `
  --resource-group rg-uat-agent `
  --consumption-plan-location eastus `
  --runtime node `
  --runtime-version 18 `
  --functions-version 4 `
  --storage-account stuatagent

# Deploy code
func azure functionapp publish func-uat-routing-agent
```

### Option C: Deploy via GitHub Actions

1. Get publish profile:
```powershell
az functionapp deployment list-publishing-profiles `
  --name func-uat-routing-agent `
  --resource-group rg-uat-agent `
  --xml
```

2. Add to GitHub Secrets:
   - Go to GitHub repo → Settings → Secrets → Actions
   - Add `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` with the XML content

3. Update `.github/workflows/deploy.yml` with your function app name

4. Push to main branch - automatic deployment!

## Step 6: Configure Azure Function App Settings

Set environment variables in Azure:

```powershell
az functionapp config appsettings set `
  --name func-uat-routing-agent `
  --resource-group rg-uat-agent `
  --settings `
    AZURE_DEVOPS_ORG_URL="https://dev.azure.com/your-org" `
    AZURE_DEVOPS_PAT="your-pat" `
    AZURE_DEVOPS_PROJECT="your-project" `
    AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com" `
    AZURE_OPENAI_API_KEY="your-key" `
    AZURE_OPENAI_DEPLOYMENT="gpt-4o" `
    AZURE_OPENAI_API_VERSION="2024-10-01-preview"
```

Or via Portal:
1. Go to Function App in Azure Portal
2. **Configuration** → **Application settings**
3. Add each environment variable
4. Click **Save**

## Step 7: Test Deployed Function

Get the function URL:

```powershell
az functionapp function show `
  --name func-uat-routing-agent `
  --resource-group rg-uat-agent `
  --function-name uat-routing `
  --query invokeUrlTemplate
```

Test with curl (replace with your URL and key):

```powershell
curl -X POST "https://func-uat-routing-agent.azurewebsites.net/api/uat-routing?code=YOUR_FUNCTION_KEY" `
  -H "Content-Type: application/json" `
  -d '{\"workItemId\":\"12345\",\"organization\":\"your-org\",\"project\":\"your-project\"}'
```

## Step 8: Monitor and Debug

### View Logs

```powershell
# Stream logs
az webapp log tail `
  --name func-uat-routing-agent `
  --resource-group rg-uat-agent
```

### Application Insights

1. Go to Function App in Portal
2. Click **Application Insights**
3. View:
   - Live metrics
   - Failures
   - Performance
   - Logs

### Debug Issues

**Function not starting:**
- Check runtime version (Node 18)
- Verify all dependencies installed
- Check Application Settings

**401 Unauthorized:**
- Verify Azure DevOps PAT is valid
- Check PAT has correct scopes

**500 Internal Server Error:**
- Check Application Insights logs
- Verify Azure OpenAI credentials
- Test individual services

**Work item not found:**
- Verify work item ID exists
- Check organization and project names
- Verify PAT has work item read access

## Next Steps

1. **Integrate with Power Automate**: See [Power Automate Guide](./power-automate-guide.md)
2. **Integrate with Power Apps**: See [Power Apps Guide](./power-apps-guide.md)
3. **Set up monitoring**: Configure alerts in Application Insights
4. **Implement caching**: Add Redis cache for frequently accessed work items
5. **Add authentication**: Enable Azure AD authentication for production

## Troubleshooting Common Issues

### Issue: "Cannot find module 'azure-devops-node-api'"

**Solution**: 
```powershell
npm install
```

### Issue: "Failed to load prompt template"

**Solution**: Verify `src/prompts/prompt-v5.txt` exists

### Issue: "Azure OpenAI API error: 401"

**Solution**: 
- Check API key is correct
- Verify endpoint URL format
- Test key in Azure Portal

### Issue: "Identity resolution failed"

**Solution**: This is optional - agent works without Graph API

### Issue: Function timeout

**Solution**: Increase timeout in `host.json`:
```json
{
  "functionTimeout": "00:05:00"
}
```

## Support

- **Documentation**: Check `README.md` and `docs/` folder
- **Logs**: Application Insights in Azure Portal
- **Issues**: Create GitHub issue with logs

## Security Checklist

Before production deployment:

- [ ] Store secrets in Azure Key Vault
- [ ] Enable Managed Identity
- [ ] Enable function-level authentication
- [ ] Set up CORS restrictions
- [ ] Enable HTTPS only
- [ ] Configure network restrictions
- [ ] Set up monitoring alerts
- [ ] Implement rate limiting
- [ ] Review PAT permissions (least privilege)
- [ ] Enable Application Insights
- [ ] Set up automated backups
- [ ] Document disaster recovery plan

# Action360 Copilot Agent

A Copilot agent that provides UAT routing recommendations for Azure DevOps work items. Can be deployed as an Azure Function and integrated with Power Automate, Power Apps, or called directly via HTTP.

## 🌟 Features

- **📋 Azure DevOps Integration**: Fetches work item data using Work Item ID
- **🤖 AI-Powered Routing**: Uses Azure OpenAI to generate routing recommendations
- **🎯 UAT-Specific Logic**: Implements prompt-v5 routing rules
- **🔌 Multiple Integration Points**: Azure Functions, Power Automate, Power Apps
- **📊 Rich Data Extraction**: Captures 40+ UAT-specific fields
- **🔍 Identity Resolution**: Microsoft Graph integration for requestor classification

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or later
- Azure subscription
- Azure DevOps organization with PAT
- Azure OpenAI resource
- Microsoft Graph API access (optional, for identity resolution)

### Installation

1. **Clone the repository**
   ```bash
   cd action360-copilot-agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Run locally**
   ```bash
   npm start
   ```

## 📖 Usage

### HTTP API

**Endpoint**: `POST /api/uat-routing`

**Request Body**:
```json
{
  "workItemId": "12345",
  "organization": "your-org",
  "project": "your-project"
}
```

**Response**:
```json
{
  "success": true,
  "workItemId": "12345",
  "routing": {
    "tag": "Tech RoB | Tech Feedback",
    "assignedTo": null,
    "priority": null,
    "areaPath": null
  },
  "service": {
    "name": "Azure AI Services",
    "solutionArea": "Data & AI",
    "dri": "John Doe"
  },
  "requestor": {
    "email": "user@microsoft.com",
    "name": "User Name",
    "title": "Customer Success Account Manager",
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
    "Customer needs assistance with Azure OpenAI quota increase"
  ],
  "rawResponse": "Full AI response text..."
}
```

### Power Automate Integration

1. **Add HTTP action** in your flow
2. **Configure**:
   - Method: `POST`
   - URI: `https://<your-function-app>.azurewebsites.net/api/uat-routing`
   - Headers: `Content-Type: application/json`
   - Body: 
     ```json
     {
       "workItemId": "@{triggerBody()?['workItemId']}",
       "organization": "your-org",
       "project": "your-project"
     }
     ```

### Power Apps Integration

```javascript
// In your Power App
ClearCollect(
    colRoutingResponse,
    UATRoutingAgent.Run(
        {
            workItemId: txtWorkItemId.Text,
            organization: "your-org",
            project: "your-project"
        }
    )
);
```

## 🏗️ Architecture

```
action360-copilot-agent/
├── src/
│   ├── functions/
│   │   └── uat-routing.js         # Azure Function HTTP trigger
│   ├── services/
│   │   ├── azure-devops.js        # Azure DevOps API client
│   │   ├── azure-openai.js        # Azure OpenAI integration
│   │   └── identity-resolver.js   # Microsoft Graph identity lookup
│   ├── utils/
│   │   ├── field-extractor.js     # UAT field extraction logic
│   │   └── prompt-builder.js      # Build prompt from work item data
│   └── prompts/
│       └── prompt-v5.txt           # UAT routing prompt template
├── package.json
├── host.json                       # Azure Functions configuration
├── local.settings.json             # Local development settings
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_DEVOPS_ORG_URL` | Azure DevOps organization URL | Yes |
| `AZURE_DEVOPS_PAT` | Personal Access Token | Yes |
| `AZURE_DEVOPS_PROJECT` | Default project name | Yes |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | Yes |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | Yes |
| `AZURE_OPENAI_DEPLOYMENT` | Model deployment name | Yes |
| `MICROSOFT_GRAPH_CLIENT_ID` | Graph API client ID | No |
| `MICROSOFT_GRAPH_CLIENT_SECRET` | Graph API secret | No |
| `MICROSOFT_GRAPH_TENANT_ID` | Azure AD tenant ID | No |

### Azure DevOps PAT Permissions

Your Personal Access Token needs:
- ✅ Work Items: Read
- ✅ User Profile: Read

## 🚀 Deployment

### Deploy to Azure Functions

1. **Create Function App**
   ```bash
   az functionapp create \
     --resource-group <resource-group> \
     --consumption-plan-location <region> \
     --runtime node \
     --runtime-version 18 \
     --functions-version 4 \
     --name <function-app-name> \
     --storage-account <storage-account>
   ```

2. **Configure Application Settings**
   ```bash
   az functionapp config appsettings set \
     --name <function-app-name> \
     --resource-group <resource-group> \
     --settings \
       AZURE_DEVOPS_ORG_URL="https://dev.azure.com/your-org" \
       AZURE_DEVOPS_PAT="your-pat" \
       AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com" \
       AZURE_OPENAI_API_KEY="your-key"
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Test with curl:
```bash
curl -X POST https://<your-function>.azurewebsites.net/api/uat-routing \
  -H "Content-Type: application/json" \
  -d '{
    "workItemId": "12345",
    "organization": "your-org",
    "project": "your-project"
  }'
```

## 📊 Routing Logic

The agent implements the UAT routing rules from `prompt-v5.txt`:

1. **Mutually Exclusive Rules** (highest priority)
   - Modern Work → MW Triage
   - Biz Apps → BA Triage
   - Security → Security Triage
   - AOAI Quota → AOAI Triage
   - AI Infra Quota → AI Infra Triage

2. **Direct Routing Rules** (milestone + CSU/STU)
   - Committed milestones → Direct to Solution Area
   - Uncommitted + Blocked/At-Risk → Direct to Solution Area
   - Uncommitted + CSU → Direct to Solution Area

3. **Non-Mutually Exclusive Rules**
   - STU requestor → STU tag
   - No milestone → Tech Feedback
   - Unknown service → Missing Data

## 🔐 Security

- **🔑 Managed Identity**: Use Azure Managed Identity in production
- **🛡️ Key Vault**: Store secrets in Azure Key Vault
- **🔒 API Authentication**: Enable function-level authentication
- **📋 Least Privilege**: Grant minimum required permissions

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Azure Function logs
3. Test with direct HTTP calls
4. Open a GitHub issue

## 📄 License

MIT License

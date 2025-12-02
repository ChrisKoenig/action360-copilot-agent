# Example API Requests and Responses

This document provides example API requests and responses for the UAT Routing Agent.

## Basic Request

### Request

```http
POST /api/uat-routing
Content-Type: application/json

{
  "workItemId": "123456",
  "organization": "contoso",
  "project": "UAT Project"
}
```

### Response (Tech Feedback)

```json
{
  "success": true,
  "workItemId": "123456",
  "routing": {
    "tag": "Tech RoB | Tech Feedback",
    "assignedTo": null,
    "priority": null,
    "pTriageType": null,
    "areaPath": null
  },
  "service": {
    "name": "Azure OpenAI Service",
    "solutionArea": "Data & AI",
    "dri": "John Doe"
  },
  "requestor": {
    "email": "user@contoso.com",
    "name": "Jane Smith",
    "title": "Senior Engineer",
    "team": "UNKNOWN"
  },
  "milestone": {
    "status": "UNKNOWN",
    "reason": "UNKNOWN",
    "commitment": "UNKNOWN"
  },
  "reasoning": [
    "No milestone present",
    "Requestor is not CSU or STU",
    "Default routing to Tech Feedback"
  ],
  "ask": [
    "Customer needs assistance with Azure OpenAI quota increase for production workload"
  ],
  "rawResponse": "### Section 1: Routing\n\n* Routing Tag: Tech RoB | Tech Feedback\n\n...",
  "usage": {
    "prompt_tokens": 1234,
    "completion_tokens": 567,
    "total_tokens": 1801
  },
  "timestamp": "2025-12-01T10:30:00.000Z"
}
```

## Direct Routing (Committed Milestone + CSU)

### Request

```http
POST /api/uat-routing
Content-Type: application/json

{
  "workItemId": "789012",
  "organization": "contoso",
  "project": "UAT Project"
}
```

### Response

```json
{
  "success": true,
  "workItemId": "789012",
  "routing": {
    "tag": null,
    "assignedTo": "@AI Apps and Agents Triage",
    "priority": "P3",
    "pTriageType": "_Route DRI",
    "areaPath": "Data & AI"
  },
  "service": {
    "name": "Azure AI Services",
    "solutionArea": "Data & AI",
    "dri": "Sarah Johnson"
  },
  "requestor": {
    "email": "csam@contoso.com",
    "name": "Mike Davis",
    "title": "Customer Success Account Manager",
    "team": "CSU"
  },
  "milestone": {
    "status": "Active",
    "reason": "Customer deployment",
    "commitment": "Committed"
  },
  "reasoning": [
    "Milestone is present with Committed status",
    "Requestor is CSU (Customer Success Account Manager)",
    "Service Area is Data & AI - Azure AI Services",
    "Direct routing to @AI Apps and Agents Triage"
  ],
  "ask": [
    "Customer needs GPT-4 Turbo deployment in West Europe region by end of month"
  ],
  "timestamp": "2025-12-01T11:00:00.000Z"
}
```

## STU Requestor (No Milestone)

### Request

```http
POST /api/uat-routing
Content-Type: application/json

{
  "workItemId": "345678",
  "organization": "contoso",
  "project": "UAT Project"
}
```

### Response

```json
{
  "success": true,
  "workItemId": "345678",
  "routing": {
    "tag": "Tech RoB | STU",
    "assignedTo": null,
    "priority": null,
    "pTriageType": null,
    "areaPath": null
  },
  "service": {
    "name": "Azure Kubernetes Service",
    "solutionArea": "Infrastructure",
    "dri": "Terry Mandin"
  },
  "requestor": {
    "email": "specialist@contoso.com",
    "name": "Alex Wong",
    "title": "Technical Specialist",
    "team": "STU"
  },
  "milestone": {
    "status": "UNKNOWN",
    "reason": "UNKNOWN",
    "commitment": "UNKNOWN"
  },
  "reasoning": [
    "No milestone present",
    "Requestor is STU (Technical Specialist)",
    "Routing to STU tag"
  ],
  "ask": [
    "Pre-sales technical validation for AKS deployment architecture"
  ],
  "timestamp": "2025-12-01T11:30:00.000Z"
}
```

## Mutually Exclusive Rule (AOAI Quota)

### Request

```http
POST /api/uat-routing
Content-Type: application/json

{
  "workItemId": "901234",
  "organization": "contoso",
  "project": "UAT Project"
}
```

### Response

```json
{
  "success": true,
  "workItemId": "901234",
  "routing": {
    "tag": "Tech RoB | AOAI Triage",
    "assignedTo": null,
    "priority": null,
    "pTriageType": null,
    "areaPath": null
  },
  "service": {
    "name": "Azure OpenAI Service",
    "solutionArea": "Data & AI",
    "dri": "John Doe"
  },
  "requestor": {
    "email": "manager@contoso.com",
    "name": "Chris Lee",
    "title": "Product Manager",
    "team": "UNKNOWN"
  },
  "milestone": {
    "status": "Blocked",
    "reason": "Quota limitation",
    "commitment": "Uncommitted"
  },
  "reasoning": [
    "AOAI Quota/Capacity issue detected",
    "Mutually exclusive rule matched",
    "Direct routing to AOAI Triage (stops further evaluation)"
  ],
  "ask": [
    "Customer blocked on GPT-4 TPM quota limit, needs immediate increase"
  ],
  "timestamp": "2025-12-01T12:00:00.000Z"
}
```

## Batch Request

### Request

```http
POST /api/uat-routing-batch
Content-Type: application/json

{
  "workItemIds": ["111111", "222222", "333333"],
  "organization": "contoso",
  "project": "UAT Project"
}
```

### Response

```json
{
  "success": true,
  "total": 3,
  "results": [
    {
      "success": true,
      "workItemId": "111111",
      "routing": {
        "tag": "Tech RoB | Tech Feedback",
        "assignedTo": null
      },
      "service": {
        "name": "Azure SQL Database",
        "solutionArea": "Data & AI"
      },
      "milestone": {
        "status": "UNKNOWN",
        "commitment": "UNKNOWN"
      }
    },
    {
      "success": true,
      "workItemId": "222222",
      "routing": {
        "tag": null,
        "assignedTo": "@Data Platform Triage",
        "priority": "P3",
        "areaPath": "Data & AI"
      },
      "service": {
        "name": "Azure Synapse Analytics",
        "solutionArea": "Data & AI"
      },
      "milestone": {
        "status": "Active",
        "commitment": "Committed"
      }
    },
    {
      "success": false,
      "workItemId": "333333",
      "error": "Work item 333333 not found"
    }
  ]
}
```

## Error Responses

### Missing Work Item ID

```http
POST /api/uat-routing
Content-Type: application/json

{
  "organization": "contoso",
  "project": "UAT Project"
}
```

```json
{
  "success": false,
  "error": "workItemId is required"
}
```

### Work Item Not Found

```json
{
  "success": false,
  "error": "Failed to fetch work item 999999: Work item 999999 not found"
}
```

### Azure DevOps API Error

```json
{
  "success": false,
  "error": "Failed to fetch work item 123456: TF401232: Work item 123456 does not exist, or you do not have permissions to read it."
}
```

### Azure OpenAI API Error

```json
{
  "success": false,
  "error": "Azure OpenAI API failed: The API deployment for this resource does not exist"
}
```

## Health Check

### Request

```http
GET /api/health
```

### Response

```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

## Usage Examples

### cURL

```bash
# Basic request
curl -X POST "https://func-uat-agent.azurewebsites.net/api/uat-routing?code=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workItemId":"123456","organization":"contoso","project":"UAT Project"}'

# Batch request
curl -X POST "https://func-uat-agent.azurewebsites.net/api/uat-routing-batch?code=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workItemIds":["111","222","333"],"organization":"contoso","project":"UAT Project"}'

# Health check
curl "https://func-uat-agent.azurewebsites.net/api/health"
```

### PowerShell

```powershell
# Basic request
$body = @{
    workItemId = "123456"
    organization = "contoso"
    project = "UAT Project"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://func-uat-agent.azurewebsites.net/api/uat-routing?code=YOUR_KEY" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

async function getRouting(workItemId) {
  const response = await axios.post(
    'https://func-uat-agent.azurewebsites.net/api/uat-routing?code=YOUR_KEY',
    {
      workItemId: workItemId,
      organization: 'contoso',
      project: 'UAT Project'
    }
  );
  
  return response.data;
}

// Usage
getRouting('123456').then(result => {
  console.log('Routing:', result.routing.tag);
  console.log('Service:', result.service.name);
});
```

### Python

```python
import requests

def get_routing(work_item_id):
    url = "https://func-uat-agent.azurewebsites.net/api/uat-routing"
    params = {"code": "YOUR_KEY"}
    data = {
        "workItemId": work_item_id,
        "organization": "contoso",
        "project": "UAT Project"
    }
    
    response = requests.post(url, json=data, params=params)
    return response.json()

# Usage
result = get_routing("123456")
print(f"Routing: {result['routing']['tag']}")
print(f"Service: {result['service']['name']}")
```

## Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `workItemId` | string | The work item ID that was processed |
| `routing.tag` | string | Routing tag (e.g., "Tech RoB \| Tech Feedback") |
| `routing.assignedTo` | string | Who to assign the work item to (direct routing) |
| `routing.priority` | string | Priority level (e.g., "P3") |
| `routing.pTriageType` | string | Triage type (e.g., "_Route DRI") |
| `routing.areaPath` | string | Area path for the work item |
| `service.name` | string | Azure service name |
| `service.solutionArea` | string | Solution area (e.g., "Data & AI") |
| `service.dri` | string | DRI (Directly Responsible Individual) |
| `requestor.email` | string | Requestor's email address |
| `requestor.name` | string | Requestor's display name |
| `requestor.title` | string | Requestor's job title |
| `requestor.team` | string | Team classification (CSU/STU/UNKNOWN) |
| `milestone.status` | string | Milestone status |
| `milestone.reason` | string | Reason for milestone status |
| `milestone.commitment` | string | Commitment level |
| `reasoning` | array | List of reasons for routing decision |
| `ask` | array | List of customer asks/requests |
| `rawResponse` | string | Full AI response text |
| `usage` | object | Token usage statistics |
| `timestamp` | string | ISO 8601 timestamp |

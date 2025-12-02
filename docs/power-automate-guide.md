# Power Automate Integration Guide

This guide shows how to integrate the UAT Routing Copilot Agent with Power Automate flows.

## Prerequisites

- Azure Function App deployed and running
- Function App URL and access key
- Power Automate account

## Setup

### 1. Get Your Function URL and Key

1. Go to Azure Portal
2. Navigate to your Function App
3. Click on **Functions** → **uat-routing**
4. Click **Get Function URL**
5. Copy the URL (includes the function key)

Example URL:
```
https://your-function-app.azurewebsites.net/api/uat-routing?code=your-function-key
```

### 2. Create Power Automate Flow

#### Option A: Manual Trigger Flow

1. Go to [Power Automate](https://make.powerautomate.com)
2. Click **Create** → **Instant cloud flow**
3. Name: "Get UAT Routing Recommendation"
4. Choose **Manually trigger a flow**
5. Add input: **Number** - Name: "WorkItemID"

#### Option B: Azure DevOps Work Item Trigger

1. Create **Automated cloud flow**
2. Choose trigger: **When a work item is created (Azure DevOps)**
3. Configure your Azure DevOps connection

### 3. Add HTTP Action

1. Click **+ New step**
2. Search for **HTTP** and select it
3. Configure:
   - **Method**: POST
   - **URI**: Your function URL from step 1
   - **Headers**:
     ```
     Content-Type: application/json
     ```
   - **Body**:
     ```json
     {
       "workItemId": "@{triggerBody()?['id']}",
       "organization": "your-org",
       "project": "your-project"
     }
     ```

For manual trigger, use: `@{triggerBody()?['number_WorkItemID']}`

### 4. Parse JSON Response

1. Add **Parse JSON** action
2. **Content**: `Body` (from HTTP action)
3. **Schema**: Click "Use sample payload" and paste:

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
    "Commitment is Committed"
  ],
  "ask": [
    "Need help with quota increase"
  ],
  "timestamp": "2025-12-01T10:00:00Z"
}
```

### 5. Use the Response

Add actions based on the routing recommendation:

#### Example: Send Email Notification

```
Condition: @{body('Parse_JSON')?['routing']?['assignedTo']} is not null

If yes:
  - Send an email (V2)
  - To: @{body('Parse_JSON')?['routing']?['assignedTo']}
  - Subject: UAT Routing: Work Item @{body('Parse_JSON')?['workItemId']}
  - Body: 
    Work Item: @{body('Parse_JSON')?['workItemId']}
    Routing: @{body('Parse_JSON')?['routing']?['tag']}
    Service: @{body('Parse_JSON')?['service']?['name']}
    Solution Area: @{body('Parse_JSON')?['service']?['solutionArea']}
    Reasoning: @{join(body('Parse_JSON')?['reasoning'], ', ')}
```

#### Example: Update Azure DevOps Work Item

1. Add **Update a work item** action (Azure DevOps)
2. Configure:
   - **Organization**: your-org
   - **Project**: your-project
   - **Work Item ID**: `@{body('Parse_JSON')?['workItemId']}`
   - **Assigned To**: `@{body('Parse_JSON')?['routing']?['assignedTo']}`
   - **Area Path**: `@{body('Parse_JSON')?['routing']?['areaPath']}`
   - **Priority**: `@{body('Parse_JSON')?['routing']?['priority']}`
   - **Tags**: `@{body('Parse_JSON')?['routing']?['tag']}`

#### Example: Post to Teams Channel

```
Post message in a chat or channel (Teams)
- Team: Your team
- Channel: Routing Notifications
- Message:
  📋 **New UAT Routing Recommendation**
  
  **Work Item**: @{body('Parse_JSON')?['workItemId']}
  **Routing**: @{body('Parse_JSON')?['routing']?['tag']}
  **Service**: @{body('Parse_JSON')?['service']?['name']}
  **Solution Area**: @{body('Parse_JSON')?['service']?['solutionArea']}
  
  **Reasoning**:
  @{join(body('Parse_JSON')?['reasoning'], '\n- ')}
```

## Complete Flow Examples

### Example 1: Auto-Route New UAT Work Items

**Trigger**: When a work item is created (Azure DevOps)
- Work item type: "UAT" or "Bug"

**Actions**:
1. HTTP - Call routing function
2. Parse JSON - Parse response
3. Condition - Check if direct routing
   - If yes:
     - Update work item (assign, area, priority)
     - Send email to assigned person
     - Post to Teams
   - If no:
     - Add tag to work item
     - Send to triage queue

### Example 2: Manual Routing Check

**Trigger**: Manually trigger a flow
- Input: Work Item ID

**Actions**:
1. HTTP - Call routing function
2. Parse JSON
3. Create HTML table from reasoning array
4. Send approval request with routing info
5. On approval:
   - Update work item
6. On reject:
   - Log to SharePoint list

### Example 3: Batch Processing

**Trigger**: Recurrence (daily)

**Actions**:
1. Get work items (Azure DevOps) - Filter: Unassigned UATs
2. Apply to each work item:
   - HTTP - Call routing function
   - Parse JSON
   - Update work item with routing
   - Add to summary array
3. Send daily summary email

## Error Handling

Add error handling to your flow:

```
Scope: Try
  - HTTP action
  - Parse JSON
  - Update work item

Scope: Catch (run after Try fails)
  - Compose: Error message
    @{body('HTTP')?['error']}
  - Send email: Notify admin
  - Create incident in ServiceNow
```

## Advanced: Custom Connector (Optional)

For reusable integration across multiple flows:

1. Go to **Data** → **Custom connectors**
2. Click **+ New custom connector** → **Create from blank**
3. Configure:
   - **Host**: your-function-app.azurewebsites.net
   - **Base URL**: /api
4. Add **Action**:
   - **Summary**: Get UAT Routing
   - **Operation ID**: GetUATRouting
   - **Verb**: POST
   - **URL**: /uat-routing
5. Add **Request**:
   - Import from sample with your body JSON
6. Add **Response**:
   - Import from sample with your response JSON
7. Test and create connector

Then use in flows:
- Add action: Search for your custom connector
- Configure inputs
- Use outputs directly

## Troubleshooting

**HTTP 401 Unauthorized**
- Check function key in URL
- Verify function app authentication settings

**HTTP 500 Internal Server Error**
- Check function app logs in Azure Portal
- Verify environment variables are set

**Invalid JSON response**
- Use "Outputs" from HTTP action to see raw response
- Check if function is returning proper JSON

**Work item not found**
- Verify work item ID is correct
- Check Azure DevOps PAT has permissions

## Best Practices

1. **Use variables** for frequently used values (org, project)
2. **Add error handling** with scope actions
3. **Log failures** to SharePoint or Log Analytics
4. **Test with sample data** before production
5. **Use service principal** instead of user credentials
6. **Implement retry logic** for transient failures
7. **Monitor flow runs** regularly

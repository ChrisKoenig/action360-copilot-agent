# Power Apps Integration Guide

This guide shows how to integrate the UAT Routing Copilot Agent with Power Apps.

## Prerequisites

- Azure Function App deployed
- Function URL and access key
- Power Apps account (Premium required for HTTP connector)

## Setup

### 1. Create Custom Connector

#### Option A: Quick Setup with Swagger/OpenAPI

1. Create a Swagger definition file `uat-routing-api.json`:

```json
{
  "swagger": "2.0",
  "info": {
    "title": "UAT Routing Agent",
    "description": "Get routing recommendations for UAT work items",
    "version": "1.0.0"
  },
  "host": "your-function-app.azurewebsites.net",
  "basePath": "/api",
  "schemes": ["https"],
  "consumes": ["application/json"],
  "produces": ["application/json"],
  "paths": {
    "/uat-routing": {
      "post": {
        "summary": "Get routing recommendation",
        "operationId": "GetRoutingRecommendation",
        "parameters": [
          {
            "name": "code",
            "in": "query",
            "required": true,
            "type": "string",
            "description": "Function key"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "properties": {
                "workItemId": {
                  "type": "string",
                  "description": "Work item ID"
                },
                "organization": {
                  "type": "string",
                  "description": "Azure DevOps organization"
                },
                "project": {
                  "type": "string",
                  "description": "Azure DevOps project"
                }
              },
              "required": ["workItemId"]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "schema": {
              "type": "object",
              "properties": {
                "success": { "type": "boolean" },
                "workItemId": { "type": "string" },
                "routing": {
                  "type": "object",
                  "properties": {
                    "tag": { "type": "string" },
                    "assignedTo": { "type": "string" },
                    "priority": { "type": "string" },
                    "areaPath": { "type": "string" }
                  }
                },
                "service": {
                  "type": "object",
                  "properties": {
                    "name": { "type": "string" },
                    "solutionArea": { "type": "string" },
                    "dri": { "type": "string" }
                  }
                },
                "requestor": {
                  "type": "object",
                  "properties": {
                    "email": { "type": "string" },
                    "name": { "type": "string" },
                    "team": { "type": "string" }
                  }
                },
                "reasoning": {
                  "type": "array",
                  "items": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

2. Go to [Power Apps](https://make.powerapps.com)
3. Navigate to **Data** → **Custom connectors**
4. Click **+ New custom connector** → **Import an OpenAPI file**
5. Upload your Swagger file
6. Configure security:
   - Authentication: **API Key**
   - Parameter label: "Function Key"
   - Parameter name: "code"
   - Parameter location: Query
7. Test the connector
8. Create connection

#### Option B: Manual Setup

1. Go to **Custom connectors** → **+ New custom connector** → **Create from blank**
2. **General**:
   - Name: "UAT Routing Agent"
   - Host: your-function-app.azurewebsites.net
   - Base URL: /api
3. **Security**:
   - Authentication: API Key
   - Parameter label: "Function Key"
   - Parameter name: "code"
   - Location: Query
4. **Definition**:
   - Add action: "GetRoutingRecommendation"
   - Request:
     - Import from sample (POST to /uat-routing)
     - Body: `{"workItemId":"12345","organization":"org","project":"proj"}`
   - Response:
     - Import from sample (use response JSON from docs)
5. **Test** and **Create connector**

### 2. Create Power App

#### Canvas App Example

1. Create new Canvas app (Tablet or Phone)
2. Add data source:
   - Click **Data** → **Add data**
   - Search for your custom connector
   - Add connection

3. **Design the UI**:

```
Screen: scrHome
├── Header
│   └── Label: "UAT Routing Assistant"
├── Input Section
│   ├── TextInput: txtWorkItemId
│   │   └── Hint: "Enter Work Item ID"
│   ├── TextInput: txtOrganization
│   │   └── Default: "your-org"
│   ├── TextInput: txtProject
│   │   └── Default: "your-project"
│   └── Button: btnGetRouting
│       └── Text: "Get Routing"
└── Results Section
    ├── Label: lblRoutingTag
    ├── Label: lblService
    ├── Label: lblSolutionArea
    ├── Gallery: galReasoning
    └── Button: btnApplyRouting
```

4. **Add Logic**:

**btnGetRouting.OnSelect**:
```javascript
ClearCollect(
    colRoutingResult,
    'UATRoutingAgent'.GetRoutingRecommendation(
        {
            workItemId: txtWorkItemId.Text,
            organization: txtOrganization.Text,
            project: txtProject.Text
        }
    )
);

Set(
    varRouting,
    First(colRoutingResult).routing
);

Set(
    varService,
    First(colRoutingResult).service
);

Set(
    varRequestor,
    First(colRoutingResult).requestor
);
```

**lblRoutingTag.Text**:
```javascript
"Routing: " & varRouting.tag
```

**lblService.Text**:
```javascript
"Service: " & varService.name
```

**lblSolutionArea.Text**:
```javascript
"Solution Area: " & varService.solutionArea
```

**galReasoning**:
- Items: `First(colRoutingResult).reasoning`
- Template:
  ```javascript
  "• " & ThisItem.Value
  ```

**btnApplyRouting.OnSelect**:
```javascript
// Navigate to details screen or perform action
Navigate(scrDetails, ScreenTransition.Fade)
```

### 3. Model-Driven App Integration

For Model-Driven Apps (Dynamics 365):

1. **Create Power Automate Flow**:
   - Trigger: When a record is created/updated
   - Entity: Custom UAT entity
   - Call HTTP action with work item ID
   - Update record with routing info

2. **Add Button to Form**:
   ```javascript
   function getRoutingRecommendation() {
       var workItemId = Xrm.Page.getAttribute("workitemid").getValue();
       
       // Call custom action that triggers flow
       var request = {
           entity: {
               workitemid: workItemId
           },
           getMetadata: function() {
               return {
                   boundParameter: null,
                   parameterTypes: {},
                   operationType: 0,
                   operationName: "uat_GetRouting"
               };
           }
       };
       
       Xrm.WebApi.online.execute(request).then(
           function success(result) {
               // Update form fields
               Xrm.Page.getAttribute("routingtag").setValue(result.routingTag);
               Xrm.Page.getAttribute("assignedto").setValue(result.assignedTo);
           },
           function error(err) {
               Xrm.Navigation.openAlertDialog({text: "Error: " + err.message});
           }
       );
   }
   ```

### 4. Advanced Features

#### Caching Results

```javascript
// On app start, initialize cache
OnStart = 
    ClearCollect(colRoutingCache, []);

// Before calling API, check cache
If(
    IsEmpty(
        Filter(colRoutingCache, WorkItemId = txtWorkItemId.Text)
    ),
    // Not in cache, call API
    ClearCollect(
        colTemp,
        'UATRoutingAgent'.GetRoutingRecommendation({workItemId: txtWorkItemId.Text})
    );
    Collect(colRoutingCache, First(colTemp)),
    // Use cached result
    ClearCollect(
        colTemp,
        Filter(colRoutingCache, WorkItemId = txtWorkItemId.Text)
    )
);
```

#### Error Handling

```javascript
Set(
    varError,
    If(
        IsError('UATRoutingAgent'.GetRoutingRecommendation({workItemId: txtWorkItemId.Text})),
        FirstError.Message,
        ""
    )
);

If(
    !IsBlank(varError),
    Notify(varError, NotificationType.Error),
    Notify("Routing retrieved successfully", NotificationType.Success)
);
```

#### Batch Processing

```javascript
// Process multiple work items
ForAll(
    galWorkItems.AllItems,
    Collect(
        colBatchResults,
        'UATRoutingAgent'.GetRoutingRecommendation({
            workItemId: ThisRecord.Id,
            organization: "your-org",
            project: "your-project"
        })
    )
);
```

#### Loading Indicator

```javascript
// Show spinner while loading
btnGetRouting.OnSelect = 
    Set(varIsLoading, true);
    ClearCollect(
        colResult,
        'UATRoutingAgent'.GetRoutingRecommendation({workItemId: txtWorkItemId.Text})
    );
    Set(varIsLoading, false);

// Spinner visibility
Spinner.Visible = varIsLoading
```

## Complete App Example

### Simple Routing Checker App

**Screen 1: Input**
```
Header: "UAT Routing Checker"

Input Fields:
- txtWorkItemId (required)
- txtOrg (default: "your-org")
- txtProject (default: "your-project")

Button: "Get Routing"
OnSelect:
  Set(varLoading, true);
  ClearCollect(colResult, 
    'UATRoutingAgent'.GetRoutingRecommendation({
      workItemId: txtWorkItemId.Text,
      organization: txtOrg.Text,
      project: txtProject.Text
    })
  );
  Set(varLoading, false);
  Navigate(scrResults)

Error handling:
  If(IsError(...), Notify("Error: " & FirstError.Message, Error))
```

**Screen 2: Results**
```
Back Button: Navigate(scrInput)

Display Card:
- Title: "Work Item " & First(colResult).workItemId
- Routing Tag: First(colResult).routing.tag
- Service: First(colResult).service.name
- Solution Area: First(colResult).service.solutionArea
- Assigned To: First(colResult).routing.assignedTo

Reasoning Gallery:
- Items: First(colResult).reasoning
- Template: Bullet point list

Action Buttons:
- Copy to Clipboard
- Open in Azure DevOps
- Send Email
```

## Testing

1. Test connector with sample work item ID
2. Verify response parsing
3. Test error scenarios
4. Check performance with multiple requests

## Deployment

1. **Save and Publish** your app
2. **Share** with users:
   - Go to app details
   - Click Share
   - Add users or groups
   - Assign security roles
3. **Monitor** usage:
   - Analytics dashboard
   - Error logs

## Best Practices

1. **Use variables** for frequently accessed data
2. **Implement caching** to reduce API calls
3. **Add loading indicators** for better UX
4. **Handle errors gracefully** with user-friendly messages
5. **Test with real data** before production
6. **Document** custom connector for other developers
7. **Use app checker** to identify issues
8. **Optimize performance** by minimizing API calls

## Troubleshooting

**Connector doesn't appear**
- Refresh data sources
- Check connector is created and tested

**Authentication errors**
- Verify function key is correct
- Check connection settings

**Timeout errors**
- Increase timeout in advanced settings
- Consider async pattern for long operations

**Data not displaying**
- Check formula syntax
- Use Monitor tool to debug
- Verify response structure matches expectations

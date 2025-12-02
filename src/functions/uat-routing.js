/**
 * UAT Routing Azure Function
 * HTTP trigger that accepts work item ID and returns routing recommendation
 */

const { app } = require('@azure/functions');
const AzureDevOpsClient = require('../services/azure-devops');
const AzureOpenAIService = require('../services/azure-openai');
const IdentityResolver = require('../services/identity-resolver');
const PromptBuilder = require('../utils/prompt-builder');

// Initialize services
let azureDevOpsClient;
let azureOpenAIService;
let identityResolver;
let promptBuilder;

function initializeServices() {
    if (!azureDevOpsClient) {
        azureDevOpsClient = new AzureDevOpsClient(
            process.env.AZURE_DEVOPS_ORG_URL,
            process.env.AZURE_DEVOPS_PAT
        );
    }

    if (!azureOpenAIService) {
        azureOpenAIService = new AzureOpenAIService(
            process.env.AZURE_OPENAI_ENDPOINT,
            process.env.AZURE_OPENAI_API_KEY,
            process.env.AZURE_OPENAI_DEPLOYMENT,
            process.env.AZURE_OPENAI_API_VERSION
        );
    }

    if (!identityResolver && process.env.MICROSOFT_GRAPH_CLIENT_ID) {
        identityResolver = new IdentityResolver(
            process.env.MICROSOFT_GRAPH_CLIENT_ID,
            process.env.MICROSOFT_GRAPH_CLIENT_SECRET,
            process.env.MICROSOFT_GRAPH_TENANT_ID
        );
    }

    if (!promptBuilder) {
        promptBuilder = new PromptBuilder();
    }
}

/**
 * Main HTTP trigger function
 */
app.http('uat-routing', {
    methods: ['POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        context.log('UAT Routing function triggered');

        try {
            // Initialize services
            initializeServices();

            // Parse request body
            const body = await request.json();
            const { workItemId, organization, project } = body;

            // Validate input
            if (!workItemId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'workItemId is required'
                    }
                };
            }

            context.log(`Processing work item: ${workItemId}`);

            // Step 1: Fetch work item data from Azure DevOps
            context.log('Fetching work item from Azure DevOps...');
            const workItemData = await azureDevOpsClient.getWorkItem(workItemId, project);

            // Step 2: Fetch comments if available
            if (project) {
                try {
                    const comments = await azureDevOpsClient.getWorkItemComments(workItemId, project);
                    workItemData.comments = comments;
                } catch (error) {
                    context.warn('Could not fetch comments:', error.message);
                }
            }

            // Step 3: Resolve requestor identity (optional)
            let requestorIdentity = null;
            if (identityResolver && workItemData.requestors && workItemData.requestors !== 'Not found') {
                try {
                    // Try to extract email from requestors field
                    const emailMatch = workItemData.requestors.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                    if (emailMatch) {
                        context.log(`Resolving identity for: ${emailMatch[1]}`);
                        requestorIdentity = await identityResolver.resolveIdentity(emailMatch[1]);
                    }
                } catch (error) {
                    context.warn('Could not resolve identity:', error.message);
                }
            }

            // Step 4: Build prompt
            context.log('Building prompt...');
            const prompt = await promptBuilder.buildPrompt(workItemData, requestorIdentity);

            // Step 5: Call Azure OpenAI for routing recommendation
            context.log('Calling Azure OpenAI for routing recommendation...');
            const aiResponse = await azureOpenAIService.generateRoutingRecommendation(prompt);

            // Step 6: Prepare response
            const response = {
                success: true,
                workItemId: workItemId,
                routing: aiResponse.parsedResponse.routing,
                service: aiResponse.parsedResponse.service,
                requestor: requestorIdentity || aiResponse.parsedResponse.requestor,
                milestone: aiResponse.parsedResponse.milestone,
                reasoning: aiResponse.parsedResponse.reasoning,
                ask: aiResponse.parsedResponse.ask,
                rawResponse: aiResponse.rawResponse,
                usage: aiResponse.usage,
                timestamp: new Date().toISOString()
            };

            context.log('Routing recommendation generated successfully');

            return {
                status: 200,
                jsonBody: response
            };

        } catch (error) {
            context.error('Error processing request:', error);

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                }
            };
        }
    }
});

/**
 * Health check endpoint
 */
app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return {
            status: 200,
            jsonBody: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
});

/**
 * Batch processing endpoint
 */
app.http('uat-routing-batch', {
    methods: ['POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        context.log('UAT Routing batch function triggered');

        try {
            initializeServices();

            const body = await request.json();
            const { workItemIds, organization, project } = body;

            if (!workItemIds || !Array.isArray(workItemIds) || workItemIds.length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'workItemIds array is required'
                    }
                };
            }

            context.log(`Processing ${workItemIds.length} work items`);

            // Process work items in parallel (with concurrency limit)
            const results = [];
            const batchSize = 5; // Process 5 at a time

            for (let i = 0; i < workItemIds.length; i += batchSize) {
                const batch = workItemIds.slice(i, i + batchSize);

                const batchResults = await Promise.allSettled(
                    batch.map(async (workItemId) => {
                        try {
                            const workItemData = await azureDevOpsClient.getWorkItem(workItemId, project);
                            const prompt = await promptBuilder.buildPrompt(workItemData);
                            const aiResponse = await azureOpenAIService.generateRoutingRecommendation(prompt);

                            return {
                                success: true,
                                workItemId: workItemId,
                                routing: aiResponse.parsedResponse.routing,
                                service: aiResponse.parsedResponse.service,
                                milestone: aiResponse.parsedResponse.milestone
                            };
                        } catch (error) {
                            return {
                                success: false,
                                workItemId: workItemId,
                                error: error.message
                            };
                        }
                    })
                );

                results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : r.reason));
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    total: workItemIds.length,
                    results: results
                }
            };

        } catch (error) {
            context.error('Error processing batch request:', error);

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    error: error.message
                }
            };
        }
    }
});

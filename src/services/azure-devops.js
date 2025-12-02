/**
 * Azure DevOps API Client
 * Fetches work item data including all UAT-specific fields
 */

const azdev = require('azure-devops-node-api');

class AzureDevOpsClient {
    constructor(orgUrl, pat) {
        this.orgUrl = orgUrl;
        const authHandler = azdev.getPersonalAccessTokenHandler(pat);
        this.connection = new azdev.WebApi(orgUrl, authHandler);
    }

    /**
     * Get work item by ID with all fields
     * @param {string} workItemId - The work item ID
     * @param {string} project - The project name (optional)
     * @returns {Promise<Object>} Work item data
     */
    async getWorkItem(workItemId, project = null) {
        try {
            const witApi = await this.connection.getWorkItemTrackingApi();

            // Get work item with all fields expanded
            const workItem = await witApi.getWorkItem(
                parseInt(workItemId),
                null, // fields (null = all)
                null, // asOf
                'All' // expand (relations, fields, etc.)
            );

            if (!workItem) {
                throw new Error(`Work item ${workItemId} not found`);
            }

            return this.extractWorkItemData(workItem);
        } catch (error) {
            console.error('Error fetching work item:', error);
            throw new Error(`Failed to fetch work item ${workItemId}: ${error.message}`);
        }
    }

    /**
     * Extract and normalize work item data
     * @param {Object} workItem - Raw work item from API
     * @returns {Object} Normalized work item data
     */
    extractWorkItemData(workItem) {
        const fields = workItem.fields || {};
        const relations = workItem.relations || [];

        // Helper function to get field value
        const getField = (fieldName) => {
            return fields[fieldName] || 'Not found';
        };

        // Extract related work items
        const relatedWorkItems = relations
            .filter(r => r.rel === 'System.LinkTypes.Related' || r.rel === 'System.LinkTypes.Hierarchy-Forward')
            .map(r => {
                const match = r.url.match(/\/(\d+)$/);
                return match ? match[1] : null;
            })
            .filter(id => id !== null);

        // Extract comments
        const comments = this.extractComments(workItem);

        return {
            // Basic fields
            id: workItem.id,
            url: workItem.url,
            title: getField('System.Title'),
            assignedTo: this.extractIdentity(getField('System.AssignedTo')),
            state: getField('System.State'),
            subState: getField('Custom.SubState'),
            areaPath: getField('System.AreaPath'),
            iteration: getField('System.IterationPath'),
            workItemType: getField('System.WorkItemType'),

            // Description and content
            description: this.cleanHtml(getField('System.Description')),

            // Business context
            conversationId: getField('Custom.ConversationID'),
            refId: getField('Custom.RefID'),
            actionCategory: getField('Custom.ActionCategory'),
            requestors: getField('Custom.Requestors'),
            meetingType: getField('Custom.MeetingType'),

            // Account & Customer
            account: getField('Custom.Account'),
            accountId: getField('Custom.AccountID'),
            tpid: getField('Custom.TPID'),
            area: getField('Custom.Area'),
            country: getField('Custom.Country'),
            eou: getField('Custom.EOU'),
            industry: getField('Custom.Industry'),
            segment: getField('Custom.Segment'),
            subsegment: getField('Custom.Subsegment'),

            // Opportunity
            opportunityId: getField('Custom.OpportunityID'),
            opportunityName: getField('Custom.OpportunityName'),
            opportunityStage: getField('Custom.OpportunityStage'),
            opportunitySize: getField('Custom.OpportunitySize'),
            opportunityOutcome: getField('Custom.OpportunityOutcome'),
            productOpportunitySize: getField('Custom.ProductOpportunitySize'),
            solutionArea: getField('Custom.SolutionArea'),
            salesPlay: getField('Custom.SalesPlay'),
            partnerOneId: getField('Custom.PartnerOneID'),

            // Milestone
            milestoneId: getField('Custom.MilestoneID'),
            milestoneStatus: getField('Custom.MilestoneStatus'),
            milestoneReason: getField('Custom.MilestoneReason'),
            milestoneActivations: getField('Custom.MilestoneActivations'),
            milestoneWorkload: getField('Custom.MilestoneWorkload'),

            // Technical & Revenue
            helpNeeded: getField('Custom.HelpNeeded'),
            estimatedBilledRevenue: getField('Custom.EstimatedBilledRevenue'),
            estimatedBilledRevenueUSD: getField('Custom.EstBilledRevenueUSD'),
            estimatedMonthlyUsage: getField('Custom.EstMonthlyUsageUSD'),
            bacv: getField('Custom.BACV'),
            azurePreferredRegion: getField('Custom.AzurePreferredRegion'),
            customerCommitment: getField('Custom.CustomerCommitment'),
            microsoftServiceRegions: getField('Custom.MicrosoftServiceRegions'),

            // Customer impact fields
            customerImpact: this.cleanHtml(getField('Custom.CustomerImpact')),
            customerScenario: this.cleanHtml(getField('Custom.CustomerScenarioDesiredOutcome')),
            desiredOutcome: this.cleanHtml(getField('Custom.DesiredOutcome')),

            // Metadata
            createdDate: getField('System.CreatedDate'),
            changedDate: getField('System.ChangedDate'),
            createdBy: this.extractIdentity(getField('System.CreatedBy')),
            changedBy: this.extractIdentity(getField('System.ChangedBy')),

            // Relations
            relatedWorkItems: relatedWorkItems,
            comments: comments,

            // Tags
            tags: getField('System.Tags') ? getField('System.Tags').split(';').map(t => t.trim()) : [],

            // Project context
            project: getField('System.TeamProject'),

            // Extraction metadata
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Extract identity from identity field
     * @param {Object|string} identity - Identity object or string
     * @returns {string} Email or display name
     */
    extractIdentity(identity) {
        if (!identity || identity === 'Not found') return 'Not found';

        if (typeof identity === 'string') {
            // Try to extract email from format "Display Name <email@domain.com>"
            const emailMatch = identity.match(/<([^>]+)>/);
            if (emailMatch) return emailMatch[1];
            return identity;
        }

        if (identity.uniqueName) return identity.uniqueName;
        if (identity.displayName) return identity.displayName;

        return 'Not found';
    }

    /**
     * Clean HTML content to plain text
     * @param {string} html - HTML content
     * @returns {string} Plain text
     */
    cleanHtml(html) {
        if (!html || html === 'Not found') return html;

        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/[\u25A0-\u25FF]/g, '') // Remove box characters
            .replace(/[\uFFFD]/g, '') // Remove replacement character
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    /**
     * Extract comments from work item
     * @param {Object} workItem - Work item object
     * @returns {string} Formatted comments
     */
    extractComments(workItem) {
        // Note: Comments are typically in work item history or separate API call
        // For now, return empty string - can be enhanced later
        const history = workItem.fields?.['System.History'];
        if (history) {
            return this.cleanHtml(history);
        }
        return 'No comments available';
    }

    /**
     * Get work item comments using separate API call
     * @param {string} workItemId - Work item ID
     * @param {string} project - Project name
     * @returns {Promise<string>} Formatted comments
     */
    async getWorkItemComments(workItemId, project) {
        try {
            const witApi = await this.connection.getWorkItemTrackingApi();
            const comments = await witApi.getComments(project, parseInt(workItemId));

            if (!comments || !comments.comments) {
                return 'No comments were provided for this action.';
            }

            const formattedComments = comments.comments
                .filter(c => !['EDOT Service', 'DAI CSU Automation Flow', 'TechRoB-Automation'].includes(c.createdBy?.displayName))
                .map(c => {
                    const author = c.createdBy?.displayName || 'Unknown';
                    const date = new Date(c.createdDate).toLocaleString();
                    const text = this.cleanHtml(c.text);
                    return `Comment by ${author} on ${date}:\n${text}`;
                })
                .join('\n\n');

            return formattedComments || 'No comments were provided for this action.';
        } catch (error) {
            console.warn('Could not fetch comments:', error);
            return 'No comments available';
        }
    }
}

module.exports = AzureDevOpsClient;

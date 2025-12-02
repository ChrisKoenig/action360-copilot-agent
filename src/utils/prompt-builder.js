/**
 * Prompt Builder
 * Creates formatted prompts for Azure OpenAI using UAT work item data
 */

const fs = require('fs').promises;
const path = require('path');

class PromptBuilder {
    constructor() {
        this.promptTemplate = null;
    }

    /**
     * Load prompt template from file
     * @returns {Promise<string>} Prompt template
     */
    async loadPromptTemplate() {
        if (this.promptTemplate) {
            return this.promptTemplate;
        }

        try {
            const templatePath = path.join(__dirname, '..', 'prompts', 'prompt-v5.txt');
            this.promptTemplate = await fs.readFile(templatePath, 'utf-8');
            return this.promptTemplate;
        } catch (error) {
            console.error('Error loading prompt template:', error);
            throw new Error('Failed to load prompt template');
        }
    }

    /**
     * Build prompt from work item data
     * @param {Object} workItemData - Work item data from Azure DevOps
     * @param {Object} requestorIdentity - Resolved requestor identity
     * @returns {Promise<string>} Formatted prompt
     */
    async buildPrompt(workItemData, requestorIdentity = null) {
        const template = await this.loadPromptTemplate();

        // Build the data section
        let dataSection = '';

        // Work Item ID
        if (workItemData.id) {
            dataSection += `**Work Item ID:** ${workItemData.id}\n\n`;
        }

        // Title
        if (workItemData.title) {
            dataSection += `**Title:** ${workItemData.title}\n\n`;
        }

        // Description
        if (workItemData.description && workItemData.description !== 'Not found') {
            dataSection += `**Description:** ${workItemData.description}\n\n`;
        }

        // Requestors
        if (workItemData.requestors && workItemData.requestors !== 'Not found') {
            dataSection += `**Requestors:** ${workItemData.requestors}\n\n`;
        }

        // Requestor Identity (if resolved)
        if (requestorIdentity) {
            dataSection += `**Requestor Identity:**\n`;
            dataSection += `- Email: ${requestorIdentity.email}\n`;
            dataSection += `- Name: ${requestorIdentity.name}\n`;
            dataSection += `- Title: ${requestorIdentity.title}\n`;
            dataSection += `- Team: ${requestorIdentity.team}\n\n`;
        }

        // Customer Impact
        if (workItemData.customerImpact && workItemData.customerImpact !== 'Not found') {
            dataSection += `**Customer Impact:** ${workItemData.customerImpact}\n\n`;
        }

        // Customer Scenario
        if (workItemData.customerScenario && workItemData.customerScenario !== 'Not found') {
            dataSection += `**Customer Scenario & Desired Outcome:** ${workItemData.customerScenario}\n\n`;
        }

        // Desired Outcome
        if (workItemData.desiredOutcome && workItemData.desiredOutcome !== 'Not found') {
            dataSection += `**Desired Outcome:** ${workItemData.desiredOutcome}\n\n`;
        }

        // Segment
        if (workItemData.segment && workItemData.segment !== 'Not found') {
            dataSection += `**Segment:** ${workItemData.segment}\n\n`;
        }

        // Milestone Information
        if (workItemData.milestoneStatus && workItemData.milestoneStatus !== 'Not found') {
            dataSection += `**Milestone Status:** ${workItemData.milestoneStatus}\n\n`;
        }

        if (workItemData.milestoneReason && workItemData.milestoneReason !== 'Not found') {
            dataSection += `**Milestone Reason:** ${workItemData.milestoneReason}\n\n`;
        }

        if (workItemData.milestoneWorkload && workItemData.milestoneWorkload !== 'Not found') {
            dataSection += `**Workload:** ${workItemData.milestoneWorkload}\n\n`;
        }

        // Help Needed
        if (workItemData.helpNeeded && workItemData.helpNeeded !== 'Not found') {
            dataSection += `**Help Needed:** ${workItemData.helpNeeded}\n\n`;
        }

        // Customer Commitment
        if (workItemData.customerCommitment && workItemData.customerCommitment !== 'Not found') {
            dataSection += `**Customer Commitment:** ${workItemData.customerCommitment}\n\n`;
        }

        // Azure Preferred Region
        if (workItemData.azurePreferredRegion && workItemData.azurePreferredRegion !== 'Not found') {
            dataSection += `**Azure Preferred Region:** ${workItemData.azurePreferredRegion}\n\n`;
        }

        // Estimated Monthly Usage
        if (workItemData.estimatedMonthlyUsage && workItemData.estimatedMonthlyUsage !== 'Not found') {
            dataSection += `**Estimated Monthly Usage:** ${workItemData.estimatedMonthlyUsage}\n\n`;
        }

        // Service/Solution Area (if available)
        if (workItemData.solutionArea && workItemData.solutionArea !== 'Not found') {
            dataSection += `**Solution Area:** ${workItemData.solutionArea}\n\n`;
        }

        // Comments
        if (workItemData.comments && workItemData.comments !== 'Not found' && workItemData.comments !== 'No comments available') {
            dataSection += `**Comments:**\n${workItemData.comments}\n\n`;
        }

        // Related Work Items
        if (workItemData.relatedWorkItems && workItemData.relatedWorkItems.length > 0) {
            dataSection += `**Related Work Items:** ${workItemData.relatedWorkItems.join(', ')}\n\n`;
        }

        // URL
        if (workItemData.url) {
            dataSection += `**URL:** ${workItemData.url}\n\n`;
        }

        // Combine template with data
        return template + '\n' + dataSection;
    }

    /**
     * Build simplified prompt (minimal fields)
     * @param {Object} workItemData - Work item data
     * @returns {Promise<string>} Simplified prompt
     */
    async buildSimplifiedPrompt(workItemData) {
        const template = await this.loadPromptTemplate();

        let dataSection = `
**Work Item ID:** ${workItemData.id || 'UNKNOWN'}
**Title:** ${workItemData.title || 'UNKNOWN'}
**Requestors:** ${workItemData.requestors || 'UNKNOWN'}
**Milestone Status:** ${workItemData.milestoneStatus || 'UNKNOWN'}
**Customer Commitment:** ${workItemData.customerCommitment || 'UNKNOWN'}
**Help Needed:** ${workItemData.helpNeeded || 'UNKNOWN'}
`;

        return template + '\n' + dataSection;
    }

    /**
     * Extract key fields for quick analysis
     * @param {Object} workItemData - Work item data
     * @returns {Object} Key fields
     */
    extractKeyFields(workItemData) {
        return {
            id: workItemData.id,
            title: workItemData.title,
            requestors: workItemData.requestors,
            milestoneStatus: workItemData.milestoneStatus,
            milestoneReason: workItemData.milestoneReason,
            customerCommitment: workItemData.customerCommitment,
            helpNeeded: workItemData.helpNeeded,
            solutionArea: workItemData.solutionArea,
            segment: workItemData.segment
        };
    }
}

module.exports = PromptBuilder;

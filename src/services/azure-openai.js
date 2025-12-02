/**
 * Azure OpenAI Service
 * Handles AI calls for UAT routing recommendations
 */

const axios = require('axios');

class AzureOpenAIService {
    constructor(endpoint, apiKey, deployment, apiVersion = '2024-10-01-preview') {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.deployment = deployment;
        this.apiVersion = apiVersion;
        this.baseUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    }

    /**
     * Generate UAT routing recommendation
     * @param {string} prompt - The formatted prompt with work item data
     * @returns {Promise<Object>} AI response with routing recommendation
     */
    async generateRoutingRecommendation(prompt) {
        try {
            const response = await axios.post(
                this.baseUrl,
                {
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a deterministic UAT Router that provides technical, machine-readable routing recommendations for Microsoft support workflows. Always follow the routing rules strictly and output valid JSON.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 3000,
                    temperature: 0.3, // Lower temperature for more deterministic output
                    top_p: 0.95,
                    frequency_penalty: 0,
                    presence_penalty: 0
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': this.apiKey
                    }
                }
            );

            if (!response.data || !response.data.choices || !response.data.choices[0]) {
                throw new Error('Invalid response from Azure OpenAI');
            }

            const content = response.data.choices[0].message.content;

            return {
                success: true,
                rawResponse: content,
                parsedResponse: this.parseResponse(content),
                usage: response.data.usage
            };
        } catch (error) {
            console.error('Azure OpenAI API Error:', error.response?.data || error.message);
            throw new Error(`Azure OpenAI API failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    /**
     * Parse AI response to extract structured data
     * @param {string} content - Raw AI response
     * @returns {Object} Parsed response with routing info
     */
    parseResponse(content) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // Extract routing information
                const routing = parsed.routing || {};
                const service = parsed.service || {};
                const requestor = parsed.requestor || {};
                const milestone = parsed.milestone || {};
                const reasoning = parsed.reasoning || [];
                const ask = parsed.ask || [];

                return {
                    routing: {
                        tag: routing.tag || null,
                        assignedTo: routing.assignedTo || null,
                        priority: routing.priority || null,
                        pTriageType: routing.pTriageType || null,
                        areaPath: routing.areaPath || null
                    },
                    service: {
                        name: service.name || 'UNKNOWN',
                        solutionArea: service.solutionArea || 'UNKNOWN',
                        dri: service.dri || 'UNKNOWN'
                    },
                    requestor: {
                        email: requestor.email || 'UNKNOWN',
                        name: requestor.name || 'UNKNOWN',
                        title: requestor.title || 'UNKNOWN',
                        team: requestor.team || 'UNKNOWN'
                    },
                    milestone: {
                        status: milestone.status || 'UNKNOWN',
                        reason: milestone.reason || 'UNKNOWN',
                        commitment: milestone.commitment || 'UNKNOWN'
                    },
                    reasoning: reasoning,
                    ask: ask,
                    fullJson: parsed
                };
            }

            // If no JSON found, try to extract sections from text
            return this.parseTextResponse(content);
        } catch (error) {
            console.error('Error parsing AI response:', error);
            return {
                routing: { tag: 'PARSE_ERROR' },
                service: {},
                requestor: {},
                milestone: {},
                reasoning: ['Failed to parse AI response'],
                ask: [],
                parseError: error.message
            };
        }
    }

    /**
     * Parse text-based response as fallback
     * @param {string} content - Text content
     * @returns {Object} Extracted routing info
     */
    parseTextResponse(content) {
        const routing = {};
        const service = {};
        const requestor = {};
        const milestone = {};
        const reasoning = [];
        const ask = [];

        // Extract routing tag
        const tagMatch = content.match(/Routing Tag:\s*([^\n]+)/i);
        if (tagMatch) {
            routing.tag = tagMatch[1].trim();
        }

        // Extract assigned to
        const assignedMatch = content.match(/Assigned To:\s*([^\n]+)/i);
        if (assignedMatch) {
            routing.assignedTo = assignedMatch[1].trim();
        }

        // Extract service name
        const serviceMatch = content.match(/Service:\s*([^\n]+)/i);
        if (serviceMatch) {
            service.name = serviceMatch[1].trim();
        }

        // Extract solution area
        const areaMatch = content.match(/Solution Area:\s*([^\n]+)/i);
        if (areaMatch) {
            service.solutionArea = areaMatch[1].trim();
        }

        // Extract requestor email
        const emailMatch = content.match(/Requestor Identity:\s*([^\s]+)/i);
        if (emailMatch) {
            requestor.email = emailMatch[1].trim();
        }

        // Extract milestone status
        const milestoneMatch = content.match(/Milestone Status:\s*([^\n]+)/i);
        if (milestoneMatch) {
            milestone.status = milestoneMatch[1].trim();
        }

        // Extract reasoning bullets
        const reasoningSection = content.match(/Routing Reasoning:\s*\n([\s\S]*?)(?=\n\n|###|$)/i);
        if (reasoningSection) {
            const bullets = reasoningSection[1].match(/[*-]\s*([^\n]+)/g);
            if (bullets) {
                reasoning.push(...bullets.map(b => b.replace(/^[*-]\s*/, '').trim()));
            }
        }

        return {
            routing,
            service,
            requestor,
            milestone,
            reasoning,
            ask
        };
    }

    /**
     * Test connection to Azure OpenAI
     * @returns {Promise<boolean>} Connection status
     */
    async testConnection() {
        try {
            await axios.post(
                this.baseUrl,
                {
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 10
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': this.apiKey
                    }
                }
            );
            return true;
        } catch (error) {
            console.error('Azure OpenAI connection test failed:', error.message);
            return false;
        }
    }
}

module.exports = AzureOpenAIService;

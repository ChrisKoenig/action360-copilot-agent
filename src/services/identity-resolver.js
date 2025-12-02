/**
 * Microsoft Graph Identity Resolver
 * Resolves user identities and classifies as CSU/STU/UNKNOWN
 */

const axios = require('axios');

class IdentityResolver {
    constructor(clientId, clientSecret, tenantId) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.tenantId = tenantId;
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Get access token for Microsoft Graph
     * @returns {Promise<string>} Access token
     */
    async getAccessToken() {
        // Check if token is still valid
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await axios.post(
                `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
                new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    scope: 'https://graph.microsoft.com/.default',
                    grant_type: 'client_credentials'
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min buffer

            return this.accessToken;
        } catch (error) {
            console.error('Failed to get Graph access token:', error.message);
            throw new Error('Failed to authenticate with Microsoft Graph');
        }
    }

    /**
     * Resolve user identity by email
     * @param {string} email - User email address
     * @returns {Promise<Object>} User identity information
     */
    async resolveIdentity(email) {
        if (!email || email === 'Not found' || email === 'UNKNOWN') {
            return {
                email: email,
                name: 'UNKNOWN',
                title: 'UNKNOWN',
                team: 'UNKNOWN'
            };
        }

        try {
            const token = await this.getAccessToken();

            // Search for user by email
            const response = await axios.get(
                `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'ConsistencyLevel': 'eventual'
                    },
                    params: {
                        $select: 'displayName,mail,jobTitle,department,officeLocation'
                    }
                }
            );

            const user = response.data;
            const team = this.classifyTeam(user.jobTitle || '');

            return {
                email: user.mail || email,
                name: user.displayName || 'UNKNOWN',
                title: user.jobTitle || 'UNKNOWN',
                department: user.department || 'UNKNOWN',
                team: team
            };
        } catch (error) {
            console.error(`Failed to resolve identity for ${email}:`, error.message);

            // Return partial data
            return {
                email: email,
                name: 'UNKNOWN',
                title: 'UNKNOWN',
                team: 'UNKNOWN',
                error: error.message
            };
        }
    }

    /**
     * Classify user as CSU/STU/UNKNOWN based on job title
     * @param {string} jobTitle - User's job title
     * @returns {string} Team classification
     */
    classifyTeam(jobTitle) {
        if (!jobTitle) return 'UNKNOWN';

        const titleLower = jobTitle.toLowerCase();

        // CSU classification
        const csuKeywords = [
            'customer success account manager',
            'csam',
            'cloud solution architect',
            'csa',
            'customer success'
        ];

        for (const keyword of csuKeywords) {
            if (titleLower.includes(keyword)) {
                return 'CSU';
            }
        }

        // STU classification
        const stuKeywords = [
            'specialist',
            'sales engineer',
            'account executive',
            'technical specialist',
            'solution specialist'
        ];

        for (const keyword of stuKeywords) {
            if (titleLower.includes(keyword)) {
                return 'STU';
            }
        }

        return 'UNKNOWN';
    }

    /**
     * Batch resolve multiple identities
     * @param {string[]} emails - Array of email addresses
     * @returns {Promise<Object[]>} Array of resolved identities
     */
    async resolveIdentities(emails) {
        const uniqueEmails = [...new Set(emails)].filter(e => e && e !== 'Not found');

        if (uniqueEmails.length === 0) {
            return [];
        }

        const results = await Promise.allSettled(
            uniqueEmails.map(email => this.resolveIdentity(email))
        );

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    email: uniqueEmails[index],
                    name: 'UNKNOWN',
                    title: 'UNKNOWN',
                    team: 'UNKNOWN',
                    error: result.reason.message
                };
            }
        });
    }

    /**
     * Search for users by name or email
     * @param {string} query - Search query
     * @returns {Promise<Object[]>} Array of matching users
     */
    async searchUsers(query) {
        if (!query || query.trim().length < 3) {
            return [];
        }

        try {
            const token = await this.getAccessToken();

            const response = await axios.get(
                'https://graph.microsoft.com/v1.0/users',
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'ConsistencyLevel': 'eventual'
                    },
                    params: {
                        $search: `"displayName:${query}" OR "mail:${query}"`,
                        $select: 'displayName,mail,jobTitle,department',
                        $top: 10
                    }
                }
            );

            return response.data.value.map(user => ({
                email: user.mail,
                name: user.displayName,
                title: user.jobTitle || 'UNKNOWN',
                department: user.department || 'UNKNOWN',
                team: this.classifyTeam(user.jobTitle || '')
            }));
        } catch (error) {
            console.error('User search failed:', error.message);
            return [];
        }
    }
}

module.exports = IdentityResolver;

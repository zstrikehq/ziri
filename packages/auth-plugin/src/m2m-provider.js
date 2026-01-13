export class M2MAuthProvider {
    constructor(config) {
        this.token = null;
        this.tokenExpiry = null;
        this.config = config;
    }
    generateId() {
        return Math.random().toString(36).substring(2, 7);
    }
    async getToken() {
        // Return cached token if still valid
        if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.token;
        }
        // Fetch new token
        const response = await fetch(`${this.config.backendUrl}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-op-id': this.generateId(),
                'x-session-id': this.generateId()
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                audience: `${this.config.orgId}:${this.config.projectId}`
            })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Authentication failed: ${response.status} ${error}`);
        }
        const data = await response.json();
        this.token = data.access_token;
        // Expire 60 seconds early to account for clock skew
        this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);
        return this.token;
    }
    async testConnection() {
        try {
            this.clearToken();
            await this.getToken();
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    clearToken() {
        this.token = null;
        this.tokenExpiry = null;
    }
}

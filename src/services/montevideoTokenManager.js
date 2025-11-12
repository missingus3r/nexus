import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Token Manager para API de Transporte Público de Montevideo
 * Gestiona autenticación OAuth2 con auto-refresh
 */
class MontevideoTokenManager {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.refreshTimer = null;
    this.clientId = process.env.MONTEVIDEO_API_CLIENT_ID;
    this.clientSecret = process.env.MONTEVIDEO_API_CLIENT_SECRET;
    this.tokenUrl = process.env.MONTEVIDEO_TOKEN_URL;

    // Token refresh interval: 4 minutes (token expires in 5)
    this.refreshInterval = 240000;
  }

  /**
   * Inicializa el token manager y comienza el auto-refresh
   */
  async initialize() {
    if (!this.clientId || !this.clientSecret || !this.tokenUrl) {
      console.error('Montevideo API credentials not configured');
      return;
    }

    await this.refreshToken();
    this.startAutoRefresh();
  }

  /**
   * Obtiene un nuevo token de acceso
   */
  async refreshToken() {
    try {
      console.log('[Montevideo API] Refreshing OAuth token...');

      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);

      const response = await axios.post(this.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      console.log(`[Montevideo API] Token refreshed successfully. Expires in: ${response.data.expires_in} seconds`);
      return this.accessToken;
    } catch (error) {
      console.error('[Montevideo API] Error refreshing token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Inicia el proceso de auto-refresh del token
   */
  startAutoRefresh() {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Set up automatic refresh every 4 minutes
    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('[Montevideo API] Auto-refresh failed:', error.message);
      }
    }, this.refreshInterval);
  }

  /**
   * Obtiene el token actual (refresh si es necesario)
   */
  async getToken() {
    // Check if token is still valid (10 second buffer)
    if (!this.accessToken || Date.now() >= this.tokenExpiry - 10000) {
      await this.refreshToken();
    }
    return this.accessToken;
  }

  /**
   * Obtiene headers de autenticación para requests
   */
  async getAuthHeaders() {
    const token = await this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Obtiene el estado del token
   */
  getTokenStatus() {
    return {
      hasToken: !!this.accessToken,
      expiresIn: this.tokenExpiry ? Math.floor((this.tokenExpiry - Date.now()) / 1000) : 0,
      isValid: this.accessToken && Date.now() < this.tokenExpiry - 10000
    };
  }

  /**
   * Detiene el auto-refresh
   */
  stop() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('[Montevideo API] Token manager stopped');
    }
  }
}

// Exportar instancia singleton
const tokenManager = new MontevideoTokenManager();
export default tokenManager;

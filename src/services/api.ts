const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  /**
   * Helper to build standard request headers
   */
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('mac_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Universal response handler to process JSON and handle HTTP error codes
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const errorMessage = errorPayload.message || `Request failed with status ${response.status}`;
      
      // Auto-logout user if token expires or is rejected (401 Unauthorized)
      if (response.status === 401) {
        localStorage.removeItem('mac_token');
        localStorage.removeItem('mac_user');
        window.dispatchEvent(new Event('auth_change')); // Trigger AuthContext update
      }
      
      throw new Error(errorMessage);
    }
    return response.json() as Promise<T>;
  }

  /**
   * HTTP GET Request
   */
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  /**
   * HTTP POST Request
   */
  async post<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  /**
   * HTTP PUT Request
   */
  async put<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  /**
   * HTTP DELETE Request
   */
  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  /**
   * HTTP POST Request specifically formatted for Multi-part Form Data (e.g. image uploads)
   */
  async postFormData<T>(path: string, formData: FormData): Promise<T> {
    const token = localStorage.getItem('mac_token');
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Note: Content-Type must not be explicitly defined for FormData.
    // The browser automatically structures it with correct boundary tokens.
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * HTTP PUT Request specifically formatted for Multi-part Form Data (e.g. image uploads)
   */
  async putFormData<T>(path: string, formData: FormData): Promise<T> {
    const token = localStorage.getItem('mac_token');
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers,
      body: formData,
    });
    return this.handleResponse<T>(response);
  }
}

export const api = new ApiClient();
export default api;

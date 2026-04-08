// API Configuration
// Uses environment variable in production, localhost in development

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

// Helper function to build API endpoints
export function apiUrl(path: string): string {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_URL}${cleanPath}`
}

// Debug: Log API configuration in development
if (import.meta.env.DEV) {
  console.log('[API Config]', { API_URL, SOCKET_URL })
}

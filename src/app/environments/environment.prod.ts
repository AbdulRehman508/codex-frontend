/**
 * Production build. The API is reached through a relative path, so the same
 * bundle works on any domain as long as the host proxies /api to the backend
 * (nginx, IIS, Apache or the Node server itself).
 */
export const environment = {
  production: true,
  nestApiUrl: '/api',
};

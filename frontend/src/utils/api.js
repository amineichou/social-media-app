const API_BASE = "/api";

export async function request(path, options = {}) {
  // Always include credentials for cookie-based auth
  const requestOptions = {
    credentials: 'include',
    ...options
  };
  
  const resp = await fetch(API_BASE + path, requestOptions);
  
  if (!resp.ok) {
    // If unauthorized, redirect to login
    if (resp.status === 401) {
      window.location.href = "/";
      return;
    }
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }
  
  const data = await resp.json();
  return data;
}

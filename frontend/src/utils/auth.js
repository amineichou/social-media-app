import { set } from "date-fns";

// Cookie utility functions
function setCookie(name, value, days = 30) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
}

export function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure;samesite=strict`;
}

// Store user data in regular cookies (not the token)
export function setUserData(userData) {
  setCookie("username", userData.username);
  setCookie("firstName", userData.firstName);
  setCookie("lastName", userData.lastName);
  setCookie("userId", userData.userId);
}

export function setThemeCookie(theme) {
  setCookie("theme", theme, 365);
}

export function getThemeCookie() {
  return getCookie("theme") || "light";
}

export function clearAuth() {
  deleteCookie("username");
  deleteCookie("firstName");
  deleteCookie("userId");
  localStorage.clear();
}

export function setUsername(username) {
  setCookie("username", username);
}

export function getUsername() {
  return getCookie("username");
}

export function setLastName(lastName) {
  setCookie("lastName", lastName);
}

export function getLastName() {
  return getCookie("lastName");
}

export function setFirstName(firstName) {
  setCookie("firstName", firstName);
}

export function getFirstName() {
  return getCookie("firstName");
}

export function setUserId(userId) {
  setCookie("userId", userId);
}

export function getUserId() {
  return getCookie("userId");
}

// Check authentication by calling the backend verification endpoint
export async function isLoggedIn() {
  try {
    const response = await fetch("/api/auth/verify", {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.authenticated;
    }
    return false;
  } catch (error) {
    console.error("Auth verification error:", error);
    return false;
  }
}

export function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  // No need for Authorization header since we're using httpOnly cookies
  return headers;
}

export function authFetchOptions(options = {}) {
  return {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      ...authHeaders(),
      ...options.headers
    }
  };
}


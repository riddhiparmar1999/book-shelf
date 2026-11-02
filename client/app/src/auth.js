const API_BASE = "http://127.0.0.1:8000/api";
const SESSION_EXPIRED_MESSAGE_KEY = "session_expired_message";

export function getAccessToken() {
  return localStorage.getItem("access_token");
}

export function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}

export function getStoredUser() {
  try {
    const token = getAccessToken();
    const raw = localStorage.getItem("user");
    if (!token || !raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuth({ access_token, refresh_token, user }) {
  localStorage.setItem("access_token", access_token ?? "");
  localStorage.setItem("refresh_token", refresh_token ?? "");
  localStorage.setItem("user", JSON.stringify(user ?? null));
  window.dispatchEvent(new Event("auth-changed"));
}

export function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth-changed"));
}

export function consumeSessionExpiredMessage() {
  const message = sessionStorage.getItem(SESSION_EXPIRED_MESSAGE_KEY);
  if (message) {
    sessionStorage.removeItem(SESSION_EXPIRED_MESSAGE_KEY);
  }
  return message;
}

function getUnauthorizedMessage(data = {}) {
  const tokenMessage = data?.messages?.[0]?.message ?? "";

  if (data?.code === "token_not_valid") {
    if (tokenMessage.toLowerCase().includes("expired")) {
      return "Your session has expired. Please log in again.";
    }
    return "Your session is no longer valid. Please log in again.";
  }

  if (typeof data?.detail === "string" && data.detail) {
    if (data.detail.toLowerCase().includes("expired")) {
      return "Your session has expired. Please log in again.";
    }
    return "You have been logged out. Please log in again.";
  }

  return "You have been logged out. Please log in again.";
}

async function handleSessionExpired(response) {
  const data = await response.clone().json().catch(() => ({}));
  const message = getUnauthorizedMessage(data);

  sessionStorage.setItem(SESSION_EXPIRED_MESSAGE_KEY, message);
  clearAuth();
  window.dispatchEvent(
    new CustomEvent("session-expired", {
      detail: { message },
    })
  );
}

export async function handleUnauthorized(response) {
  if (response?.status !== 401 || !getAccessToken()) {
    return false;
  }

  await handleSessionExpired(response);
  return true;
}

export function authHeaders(extra = {}, { json = true } = {}) {
  const token = getAccessToken();
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function apiFetch(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders({}, { json: !isFormData }),
      ...options.headers,
    },
  });

  if (response.status === 401 && getAccessToken()) {
    await handleSessionExpired(response);
  }

  return response;
}

export async function logout() {
  const refresh_token = getRefreshToken();

  try {
    if (refresh_token) {
      const response = await fetch(`${API_BASE}/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token }),
      });

      const data = await response.json().catch(() => ({}));

      clearAuth();

      return {
        ok: response.ok && data?.success !== false,
        message:
          data?.message ??
          (response.ok ? "Logout successful." : "Logout failed."),
      };
    }
  } catch (error) {
    console.log(error);
  }

  clearAuth();
  return { ok: true, message: "Logged out successfully." };
}

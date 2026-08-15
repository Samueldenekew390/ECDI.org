/* ECDI Admin Authentication Controller */

const AUTH_TOKEN_KEY = "ecdi_admin_jwt_token";
const ADMIN_INFO_KEY = "ecdi_admin_user_info";

window.ECDIAuth = {
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
  },

  getAdmin() {
    const raw = localStorage.getItem(ADMIN_INFO_KEY) || sessionStorage.getItem(ADMIN_INFO_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated() {
    const token = this.getToken();
    return !!token;
  },

  setSession(token, adminInfo, remember = true) {
    if (remember) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(adminInfo));
    } else {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      sessionStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(adminInfo));
    }
  },

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_INFO_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_INFO_KEY);
    window.location.href = "/admin-login.html";
  },

  async login(username, password, remember = true) {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed.");
    }

    this.setSession(data.token, data.admin, remember);
    return data;
  }
};

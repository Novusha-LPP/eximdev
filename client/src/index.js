import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ImportersProvider } from "./contexts/importersContext.js"
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { YearProvider } from "./contexts/yearContext.js";
import axios from "axios";
import { SnackbarProvider } from "./contexts/SnackbarContext";

axios.defaults.withCredentials = true;

const getDynamicBaseURL = () => {
  const envVal = process.env.REACT_APP_API_STRING || 'http://localhost:9006';
  if (typeof window === 'undefined' || !window.location.hostname) {
    return envVal;
  }

  const browserHost = window.location.hostname;
  const isLocalHostOrIp = 
    browserHost === 'localhost' || 
    browserHost === '127.0.0.1' || 
    /^192\.168\.\d+\.\d+$/.test(browserHost) ||
    /^10\.\d+\.\d+\.\d+$/.test(browserHost) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(browserHost);

  if (isLocalHostOrIp) {
    try {
      const url = new URL(envVal);
      url.hostname = browserHost;
      return url.toString().replace(/\/$/, '');
    } catch (e) {
      // Ignore URL parsing errors
    }
  }
  return envVal;
};

axios.interceptors.request.use(
  (config) => {
    if (config.url && config.url.startsWith(process.env.REACT_APP_API_STRING)) {
      const dynamicBase = getDynamicBaseURL();
      config.url = config.url.replace(process.env.REACT_APP_API_STRING, dynamicBase);
    }
    const token = localStorage.getItem("token");
    if (token && !config.headers.Authorization && !config.headers.authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRedirectingToLogin = false;

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || "";
      // Exclude login endpoints so invalid password/credential errors are handled by LoginForm
      const isAuthEndpoint =
        requestUrl.includes("/login") || requestUrl.includes("/auth/login");

      // Only perform session-expiration cleanup if user was authenticated
      const hasAuthData =
        Boolean(localStorage.getItem("token")) ||
        Boolean(localStorage.getItem("exim_user"));

      if (!isAuthEndpoint && hasAuthData) {
        if (!isRedirectingToLogin) {
          isRedirectingToLogin = true;

          const authMsg =
            error.response.data?.message ||
            error.response.data?.error ||
            "Your session has expired. Please log in again.";

          sessionStorage.setItem("auth_error_message", authMsg);

          // Clear client authentication storage
          localStorage.removeItem("token");
          localStorage.removeItem("exim_user");

          // Do not redirect if user is on a public page
          const isPublicPage = window.location.pathname.startsWith("/amc-entry");
          if (!isPublicPage) {
            if (window.location.pathname !== "/") {
              window.location.href = "/";
            } else {
              window.location.reload();
            }
          } else {
            isRedirectingToLogin = false;
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Prevent mouse wheel scrolling from changing number input values globally
if (typeof window !== "undefined") {
  window.addEventListener(
    "wheel",
    (e) => {
      if (document.activeElement && document.activeElement.type === "number") {
        document.activeElement.blur();
      }
    },
    { passive: false }
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <React.StrictMode>
      <SnackbarProvider>
        <YearProvider>
          <ImportersProvider>
            <App />
          </ImportersProvider>
        </YearProvider>
      </SnackbarProvider>
    </React.StrictMode>
  </BrowserRouter>
);

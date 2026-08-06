// ─── Market Intelligence API Proxy ─────────────────────────────
// Proxies /api/mi/* → MI Gateway (localhost:3005/api/mi/*)
// Passes through the Exim JWT cookie for SSO
// server/routes/miProxy.mjs

import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const router = express.Router();

const MI_GATEWAY_URL = process.env.MI_GATEWAY_URL || "http://localhost:3005";

router.use(
  "/api/mi",
  createProxyMiddleware({
    target: MI_GATEWAY_URL,
    changeOrigin: true,
    // Cookie pass-through for SSO
    cookieDomainRewrite: "",
    onProxyReq: (proxyReq, req) => {
      // Forward authenticated user info from Exim auth middleware
      if (req.user) {
        proxyReq.setHeader("x-user-username", req.user.username || "");
        proxyReq.setHeader("x-user-id", req.user._id || "");
        proxyReq.setHeader("x-user-role", req.user.role || "");
      }
      // Forward the cookie as-is for MI Gateway's own auth
      if (req.headers.cookie) {
        proxyReq.setHeader("cookie", req.headers.cookie);
      }
    },
    onError: (err, req, res) => {
      console.error("MI Gateway proxy error:", err.message);
      res.status(502).json({
        success: false,
        error: "Market Intelligence service is temporarily unavailable",
      });
    },
    // Timeout after 2 minutes (for AI queries that may take longer)
    proxyTimeout: 120000,
    timeout: 120000,
  })
);

export default router;

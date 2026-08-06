import React, {
  useRef,
  useEffect,
  useContext,
  useState,
  useCallback,
} from "react";
import { UserContext } from "../../contexts/UserContext";

const MI_FRONTEND_URL =
  process.env.REACT_APP_MI_FRONTEND_URL || "http://localhost:3002";

// ─── Loading Skeleton ──────────────────────────────────────────
const LoadingSkeleton = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      borderRadius: "12px",
      gap: "16px",
    }}
  >
    <div
      style={{
        width: "48px",
        height: "48px",
        border: "3px solid rgba(99, 102, 241, 0.2)",
        borderTopColor: "#6366f1",
        borderRadius: "50%",
        animation: "mi-spin 0.8s linear infinite",
      }}
    />
    <div
      style={{
        color: "#94a3b8",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.5px",
      }}
    >
      Loading Market Intelligence...
    </div>
    <style>{`
      @keyframes mi-spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// ─── Error State ───────────────────────────────────────────────
const ErrorState = ({ onRetry, errorMsg }) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      borderRadius: "12px",
      gap: "12px",
      padding: "24px",
    }}
  >
    <div style={{ fontSize: "36px" }}>⚠️</div>
    <div
      style={{
        color: "#f1f5f9",
        fontSize: "15px",
        fontWeight: 700,
        textAlign: "center",
      }}
    >
      Market Intelligence Unavailable
    </div>
    <div
      style={{
        color: "#94a3b8",
        fontSize: "12px",
        textAlign: "center",
        maxWidth: "400px",
        lineHeight: "1.5",
      }}
    >
      {errorMsg ||
        "The MI service could not be reached. Please ensure the MI Gateway is running."}
    </div>
    <button
      onClick={onRetry}
      style={{
        marginTop: "8px",
        padding: "8px 24px",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = "scale(1.04)";
        e.target.style.boxShadow = "0 4px 16px rgba(99, 102, 241, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "scale(1)";
        e.target.style.boxShadow = "none";
      }}
    >
      Retry Connection
    </button>
  </div>
);

// ─── Main Component ────────────────────────────────────────────
function MarketIntelligence() {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const { user } = useContext(UserContext);

  const [iframeState, setIframeState] = useState("loading"); // loading | ready | error
  const [isVisible, setIsVisible] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // ─── Lazy Load: Only mount iframe when component is visible ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ─── SSO: Pass auth token to iframe via postMessage ──────────
  const sendSSOToken = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !user) return;

    iframe.contentWindow.postMessage(
      {
        type: "EXIM_SSO_TOKEN",
        payload: {
          user: {
            _id: user._id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username,
            role: user.role,
            company: user.company,
            email: user.email,
            isActive: true,
          },
        },
      },
      MI_FRONTEND_URL
    );
  }, [user]);

  // ─── Handle iframe load / error events ───────────────────────
  const handleIframeLoad = useCallback(() => {
    setIframeState("ready");
    // Small delay to let the MI frontend initialize before sending SSO
    setTimeout(sendSSOToken, 300);
  }, [sendSSOToken]);

  const handleIframeError = useCallback(() => {
    setIframeState("error");
  }, []);

  // ─── Timeout: If iframe doesn't load in 15s, show error ─────
  useEffect(() => {
    if (!isVisible || iframeState !== "loading") return;

    const timeout = setTimeout(() => {
      if (iframeState === "loading") {
        setIframeState("error");
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [isVisible, iframeState, retryKey]);

  // ─── Listen for messages from MI iframe ──────────────────────
  useEffect(() => {
    const handleMessage = (event) => {
      // Only accept messages from the MI frontend origin
      try {
        const miOrigin = new URL(MI_FRONTEND_URL).origin;
        if (event.origin !== miOrigin) return;
      } catch {
        return;
      }

      if (event.data?.type === "MI_REQUEST_SSO") {
        sendSSOToken();
      }

      if (event.data?.type === "MI_NAVIGATE") {
        // Handle deep-link navigation requests from MI
        const { path } = event.data.payload || {};
        if (path) {
          window.location.hash = path;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sendSSOToken]);

  // ─── Retry handler ──────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setIframeState("loading");
    setRetryKey((k) => k + 1);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "calc(100vh - 85px)",
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#0f172a",
      }}
    >
      {/* Loading overlay */}
      {iframeState === "loading" && <LoadingSkeleton />}

      {/* Error state */}
      {iframeState === "error" && (
        <ErrorState onRetry={handleRetry} />
      )}

      {/* Iframe — only rendered when visible */}
      {isVisible && iframeState !== "error" && (
        <iframe
          key={retryKey}
          ref={iframeRef}
          src={MI_FRONTEND_URL}
          title="Market Intelligence - Mystique"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: "12px",
            opacity: iframeState === "ready" ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
          allow="clipboard-read; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      )}
    </div>
  );
}

export default React.memo(MarketIntelligence);

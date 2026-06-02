import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

const defaultConfig = {
  _id: "default",
  name: "Default",
  isActive: true,
  appbar: {
    enabled: true,
    backgroundColor: "rgba(249, 250, 251, 0.3)",
    backgroundOpacity: 0.3,
    blurIntensity: 6,
    textColor: "#000000",
    shadow: "none",
    height: 64,
    borderBottom: "none",
    extraContent: [],
  },
  sidebar: {
    enabled: true,
    backgroundColor: "#111b21",
    iconColor: "#ffffff9f",
    activeItemColor: "#ffffff",
    hoverColor: "#ffffff",
    hoverBgColor: "rgba(255,255,255,0.08)",
    width: 60,
    mode: "icon-only",
    backgroundImage: "sidebar-bg.webp",
    glassEffect: false,
    borderRight: "none",
    itemSpacing: 0,
  },
  banner: {
    enabled: false,
    text: "",
    link: "",
    textColor: "#ffffff",
    backgroundColor: "linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)",
    height: 36,
    animationType: "none",
    displayMode: "top-bar",
    opacity: 1.0,
    closable: true,
    customCss: "",
    startDate: null,
    endDate: null,
  },
  customCss: "",
};

const LayoutConfigContext = createContext({
  layoutConfig: defaultConfig,
  isLoading: true,
  refetch: () => {},
});

export const useLayoutConfig = () => useContext(LayoutConfigContext);

export function LayoutConfigProvider({ children }) {
  const [layoutConfig, setLayoutConfig] = useState(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/layout-config/active`, {
        withCredentials: true,
      });
      if (res.data) {
        // Merge with defaults to ensure all fields exist
        setLayoutConfig({
          ...defaultConfig,
          ...res.data,
          appbar: { ...defaultConfig.appbar, ...res.data.appbar },
          sidebar: { ...defaultConfig.sidebar, ...res.data.sidebar },
          banner: { ...defaultConfig.banner, ...res.data.banner },
          customCss: res.data.customCss || "",
        });
      }
    } catch (err) {
      console.warn("Failed to fetch layout config, using defaults:", err);
      setLayoutConfig(defaultConfig);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    const interval = setInterval(fetchConfig, 60000);
    return () => clearInterval(interval);
  }, [fetchConfig]);

  const value = useMemo(
    () => ({
      layoutConfig,
      isLoading,
      refetch: fetchConfig,
    }),
    [layoutConfig, isLoading, fetchConfig]
  );

  return (
    <LayoutConfigContext.Provider value={value}>
      {children}
    </LayoutConfigContext.Provider>
  );
}

import React, { createContext, useContext } from "react";

const AuditLogContext = createContext({
    logAction: async (data) => {
        console.log("AUDIT LOG (no provider):", data);
    }
});

export const AuditLogProvider = ({ children }) => {

    const logAction = async (data) => {
        console.log("AUDIT LOG:", data);

        // yaha API call kar sakte ho
        // await axios.post("/api/audit-log", data)
    };


    return (
        <AuditLogContext.Provider
            value={{ logAction }}
        >
            {children}
        </AuditLogContext.Provider>
    );
};


export const useAuditLogs = () => {
    const context = useContext(AuditLogContext);
    // Ab error nahi aayega - default value milegi
    return context;
};
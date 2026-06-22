import React, { createContext, useContext } from "react";

const AuditLogContext = createContext(null);


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

    if (!context) {
        throw new Error(
            "useAuditLogs must be used within an AuditLogProvider"
        );
    }

    return context;
};
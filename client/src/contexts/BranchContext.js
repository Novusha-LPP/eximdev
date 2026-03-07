import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";

export const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
    const { user } = React.useContext(UserContext);
    const [activeBranch, setActiveBranch] = useState(
        () => localStorage.getItem("activeBranch") || "AHMEDABAD"
    );
    const [activeCategory, setActiveCategory] = useState(
        () => localStorage.getItem("activeCategory") || "SEA"
    );

    const [isSwitching, setIsSwitching] = useState(false);

    useEffect(() => {
        if (user && user.assigned_branches && user.assigned_branches.length > 0) {
            const branchNames = user.assigned_branches.map(b => typeof b === 'object' ? b.branch_name : b);
            if (!branchNames.includes(activeBranch)) {
                // Current active branch is not in assigned list, auto-select first
                const firstBranch = branchNames[0];
                setActiveBranch(firstBranch);
                localStorage.setItem("activeBranch", firstBranch);
            }
        }
    }, [user, activeBranch]);

    useEffect(() => {
        localStorage.setItem("activeBranch", activeBranch);
        localStorage.setItem("activeCategory", activeCategory);

        // Setup Axios global interceptor
        const interceptor = axios.interceptors.request.use((config) => {
            config.headers["x-branch"] = activeBranch;
            config.headers["x-category"] = activeCategory;
            return config;
        });

        return () => {
            axios.interceptors.request.eject(interceptor);
        };
    }, [activeBranch, activeCategory]);

    const handleBranchSwitch = (newBranch) => {
        setIsSwitching(true);
        setActiveBranch(newBranch);
        localStorage.setItem("activeBranch", newBranch);

        // Auto-correct category if it's not valid for the new branch
        if (user && user.assigned_branches) {
            const newBranchObj = user.assigned_branches.find(b =>
                typeof b === 'object' ? b.branch_name === newBranch : b === newBranch
            );
            const branchCategories = newBranchObj?.categories || ["SEA", "AIR"];
            if (!branchCategories.includes(activeCategory)) {
                const fallbackCategory = branchCategories[0] || "SEA";
                setActiveCategory(fallbackCategory);
                localStorage.setItem("activeCategory", fallbackCategory);
            }
        }

        // Give time for components to re-render with new context and trigger their loading states
        setTimeout(() => {
            setIsSwitching(false);
        }, 500);
    };

    const handleCategorySwitch = (newCategory) => {
        setIsSwitching(true);
        setActiveCategory(newCategory);
        localStorage.setItem("activeCategory", newCategory);

        setTimeout(() => {
            setIsSwitching(false);
        }, 500);
    };

    const availableIcds = React.useMemo(() => {
        if (!user || !user.assigned_branches) return [];
        const currentBranch = user.assigned_branches.find(b =>
            typeof b === 'object' ? b.branch_name === activeBranch : b === activeBranch
        );

        // Choose source based on category
        let list = [];
        if (activeCategory === "AIR") {
            list = currentBranch?.air_icd_list || [];
        } else {
            list = currentBranch?.sea_icd_list || [];
        }

        return list.map(icd => typeof icd === 'object' ? icd.icd_name : icd);
    }, [user, activeBranch, activeCategory]);

    const availableIcdObjects = React.useMemo(() => {
        if (!user || !user.assigned_branches) return [];
        const currentBranch = user.assigned_branches.find(b =>
            typeof b === 'object' ? b.branch_name === activeBranch : b === activeBranch
        );

        // Choose source based on category
        let list = [];
        if (activeCategory === "AIR") {
            list = currentBranch?.air_icd_list || [];
        } else {
            list = currentBranch?.sea_icd_list || [];
        }

        return list;
    }, [user, activeBranch, activeCategory]);

    const availableCategories = React.useMemo(() => {
        if (!user || !user.assigned_branches) return ["SEA", "AIR"];
        const currentBranch = user.assigned_branches.find(b =>
            typeof b === 'object' ? b.branch_name === activeBranch : b === activeBranch
        );
        return currentBranch?.categories || ["SEA", "AIR"];
    }, [user, activeBranch]);

    const activeBranchBehavior = React.useMemo(() => {
        if (!user || !user.assigned_branches) return "Other SEA";
        const currentBranch = user.assigned_branches.find(b =>
            typeof b === 'object' ? b.branch_name === activeBranch : b === activeBranch
        );
        if (currentBranch?.sea_behavior) return currentBranch.sea_behavior;
        return activeBranch?.toUpperCase() === "AHMEDABAD" ? "HO SEA" : "Other SEA";
    }, [user, activeBranch]);

    return (
        <BranchContext.Provider
            value={{
                activeBranch,
                setActiveBranch: handleBranchSwitch,
                activeCategory,
                setActiveCategory: handleCategorySwitch,
                availableIcds,
                availableIcdObjects,
                availableCategories,
                activeBranchBehavior,
                isSwitching,
            }}
        >
            {children}
        </BranchContext.Provider>
    );
};

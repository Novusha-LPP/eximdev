import React, { createContext, useState, useEffect } from 'react';

export const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
    const [selectedBranch, setSelectedBranch] = useState(() => {
        let savedBranch = localStorage.getItem('selected_branch');

        // Migration: Convert 'Main Branch' to 'AHMEDABAD HO'
        if (savedBranch === 'Main Branch') {
            savedBranch = 'AHMEDABAD HO';
            localStorage.setItem('selected_branch', 'AHMEDABAD HO');
        }
        if (savedBranch === 'Gandhidham' || savedBranch === 'Gandhidham Branch') {
            savedBranch = 'GANDHIDHAM';
            localStorage.setItem('selected_branch', 'GANDHIDHAM');
        }
        if (savedBranch === 'Air' || savedBranch === 'AIR Branch') {
            savedBranch = 'AIR';
            localStorage.setItem('selected_branch', 'AIR');
        }

        if (savedBranch) return savedBranch;

        const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
        let assigned = user.assignedBranch || 'AHMEDABAD HO';
        if (assigned === 'Main Branch') assigned = 'AHMEDABAD HO';
        if (assigned === 'Gandhidham' || assigned === 'Gandhidham Branch') assigned = 'GANDHIDHAM';
        if (assigned === 'Air' || assigned === 'AIR Branch') assigned = 'AIR';

        return assigned;
    });


    useEffect(() => {
        localStorage.setItem('selected_branch', selectedBranch);
    }, [selectedBranch]);

    // Listen for storage changes (like login)
    useEffect(() => {
        const handleStorageChange = () => {
            const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
            if (user.assignedBranch && !localStorage.getItem('selected_branch')) {
                setSelectedBranch(user.assignedBranch);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return (
        <BranchContext.Provider value={{ selectedBranch, setSelectedBranch }}>
            {children}
        </BranchContext.Provider>
    );
};

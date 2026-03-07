import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

export const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(localStorage.getItem('selectedBranch') || 'all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/get-branches`);
                setBranches(response.data || []);
            } catch (error) {
                console.error("Error fetching branches:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBranches();
    }, []);

    const handleBranchChange = (branchId) => {
        setSelectedBranch(branchId);
        localStorage.setItem('selectedBranch', branchId);
    };

    return (
        <BranchContext.Provider value={{
            branches,
            selectedBranch,
            setSelectedBranch: handleBranchChange,
            loading
        }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => useContext(BranchContext);

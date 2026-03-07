import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

export const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
    const [branches, setBranches] = useState([]);
    const [selectedBranchGroup, setSelectedBranchGroup] = useState(localStorage.getItem('selectedBranchGroup') || 'all');
    const [selectedCategory, setSelectedCategory] = useState(localStorage.getItem('selectedCategory') || 'SEA');
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

    const selectedBranch = React.useMemo(() => {
        if (selectedBranchGroup === 'all') return 'all';
        const branch = branches.find(
            (b) => b.branch_code === selectedBranchGroup && b.category === selectedCategory
        );
        return branch ? branch._id : 'all';
    }, [branches, selectedBranchGroup, selectedCategory]);

    const handleBranchGroupChange = (group) => {
        setSelectedBranchGroup(group);
        localStorage.setItem('selectedBranchGroup', group);
    };

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        localStorage.setItem('selectedCategory', category);
    };

    return (
        <BranchContext.Provider value={{
            branches,
            selectedBranch, // Still exposed for compatibility
            selectedBranchGroup,
            setSelectedBranchGroup: handleBranchGroupChange,
            selectedCategory,
            setSelectedCategory: handleCategoryChange,
            loading
        }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => useContext(BranchContext);

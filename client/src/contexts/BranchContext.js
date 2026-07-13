import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { UserContext } from './UserContext';

// Create axios instance with base config
const api = axios.create({
    baseURL: process.env.REACT_APP_API_STRING,
    timeout: 10000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Read token fresh on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

export const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
    const { user } = useContext(UserContext);
    const [branches, setBranches] = useState([]);
    const [selectedBranchGroup, setSelectedBranchGroup] = useState(localStorage.getItem('selectedBranchGroup') || 'all');
    const [selectedCategory, setSelectedCategory] = useState(localStorage.getItem('selectedCategory') || 'SEA');
    const [loading, setLoading] = useState(true);
    const [isChangingBranch, setIsChangingBranch] = useState(false);

    useEffect(() => {
        const fetchBranches = async () => {
            // ✅ Guard: wait for both user AND token to be available
            const token = localStorage.getItem('exim_user');
            if (!user || !token) return;

            try {
                const response = await api.get('/admin/my-branches');
                const fetchedBranches = response.data || [];
                setBranches(fetchedBranches);

                if (user.role !== 'Admin' && fetchedBranches.length > 0) {
                    const uniqueBranchCodes = new Set(fetchedBranches.map(b => b.branch_code));
                    const hasMultipleBranches = uniqueBranchCodes.size > 1;

                    const isAllSelected = selectedBranchGroup === 'all';
                    const isCurrentSelectionValid = isAllSelected || fetchedBranches.some(b => b.branch_code === selectedBranchGroup);

                    if ((isAllSelected && !hasMultipleBranches) || !isCurrentSelectionValid) {
                        const firstBranch = fetchedBranches[0];
                        setSelectedBranchGroup(firstBranch.branch_code);
                        setSelectedCategory(firstBranch.category);
                        localStorage.setItem('selectedBranchGroup', firstBranch.branch_code);
                        localStorage.setItem('selectedCategory', firstBranch.category);
                    }
                }
            } catch (error) {
                console.error("Error fetching branches:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBranches();
    }, [user]); // 'user' changing means login just happened — token should be set by then

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

        if (group !== 'all') {
            const validBranch = branches.find(b => b.branch_code === group && b.category === selectedCategory);
            if (!validBranch) {
                const alternative = branches.find(b => b.branch_code === group);
                if (alternative) {
                    setSelectedCategory(alternative.category);
                    localStorage.setItem('selectedCategory', alternative.category);
                }
            }
        }

        setIsChangingBranch(true);
        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        localStorage.setItem('selectedCategory', category);

        setIsChangingBranch(true);
        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    return (
        <BranchContext.Provider value={{
            branches,
            selectedBranch,
            selectedBranchGroup,
            setSelectedBranchGroup: handleBranchGroupChange,
            selectedCategory,
            setSelectedCategory: handleCategoryChange,
            loading,
            isChangingBranch,
            isAdmin: user?.role === 'Admin'
        }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => useContext(BranchContext);
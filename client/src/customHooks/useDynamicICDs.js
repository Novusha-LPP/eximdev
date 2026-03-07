import { useMemo, useContext } from 'react';
import { BranchContext } from '../contexts/BranchContext';

/**
 * Returns a sorted list of unique port_name values from the currently
 * selected branch's ports, filtered by the active category (SEA / AIR).
 *
 * Usage:  const dynamicICDs = useDynamicICDs();
 */
const useDynamicICDs = () => {
  const { branches, selectedBranch, selectedCategory } = useContext(BranchContext);

  return useMemo(() => {
    if (!branches || !selectedBranch) return [];

    const branch = branches.find((b) => b._id === selectedBranch);
    if (!branch || !Array.isArray(branch.ports)) return [];

    const ports = new Set();
    branch.ports.forEach((port) => {
      // Filter by category when one is set (SEA / AIR); otherwise include all
      if (
        !selectedCategory ||
        selectedCategory === 'all' ||
        !port.category ||
        port.category.toUpperCase() === selectedCategory.toUpperCase()
      ) {
        if (port.port_name) ports.add(port.port_name.toUpperCase());
      }
    });

    return [...ports].sort();
  }, [branches, selectedBranch, selectedCategory]);
};

export default useDynamicICDs;
import { createContext, useState, useContext } from "react";

// Create context with default values
export const SearchQueryContext = createContext({
  searchQuery: "",
  setSearchQuery: () => {},
  detailedStatus: "all",
  setDetailedStatus: () => {},
  selectedICD: "all",
  setSelectedICD: () => {},
  selectedImporter: "",
  setSelectedImporter: () => {}
});

// Provider component that wraps app
export const SearchQueryProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [detailedStatus, setDetailedStatus] = useState("all");
  const [selectedICD, setSelectedICD] = useState("all");
  const [selectedImporter, setSelectedImporter] = useState("");

  return (
    <SearchQueryContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        detailedStatus,
        setDetailedStatus,
        selectedICD,
        setSelectedICD,
        selectedImporter,
        setSelectedImporter
      }}
    >
      {children}
    </SearchQueryContext.Provider>
  );
};

// Custom hook for using the context
export const useSearchQuery = () => useContext(SearchQueryContext);
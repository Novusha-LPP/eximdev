import React, { useState, useEffect, useCallback } from "react";
import {
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  CircularProgress,
  Snackbar,
  Alert,
  Button,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import HistoryIcon from "@mui/icons-material/History";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import axios from "axios";

const ImportUtilityTool = () => {
  // State management
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [multipleResults, setMultipleResults] = useState([]);
  const [multipleResultsSource, setMultipleResultsSource] = useState("cth");
  const [isLoading, setIsLoading] = useState(false);  const [activeTab, setActiveTab] = useState(1); // Default to Recent Searches tab
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [contextItems, setContextItems] = useState([]);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // API base URL
  const API_URL = process.env.REACT_APP_API_STRING;

  // Show notification helper function
  const showNotification = useCallback((message, severity) => {
    setNotification({
      open: true,
      message,
      severity,
    });
  }, []);

  // Handle close notification
  const handleCloseNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  // Fetch recent searches
  const fetchRecentSearches = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/recent`);
      setRecentSearches(response.data);
    } catch (error) {
      console.error("Error fetching recent searches:", error);
      showNotification("Failed to load recent searches", "error");
    }
  }, [API_URL, showNotification]);

  // Fetch favorites
  const fetchFavorites = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/favorites`);
      setFavorites(response.data);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      showNotification("Failed to load favorites", "error");
    }
  }, [API_URL, showNotification]);

  // Fetch context items
  const fetchContextItems = useCallback(async (hsCode) => {
    try {
      const response = await axios.get(`${API_URL}/context/${hsCode}`);
      
      if (response.data && response.data.contextItems) {
        setContextItems(response.data.contextItems);
      } else {
        setContextItems([]);
      }
    } catch (error) {
      console.error("Error fetching context items:", error);
      setContextItems([]);
    }
  }, [API_URL]);
  // Perform search
  const performSearch = useCallback(async (query, addToRecent = false) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/search?query=${encodeURIComponent(query)}&addToRecent=${addToRecent}`
      );

      // Switch to Search Results tab when API call is made
      setActiveTab(0);

      // Handle context items
      if (response.data.contextItems && response.data.contextItems.length > 0) {
        setContextItems(response.data.contextItems);
      } else {
        setContextItems([]);
      }

      if (response.data.results && response.data.results.length > 0) {
        // If multiple results
        const source = response.data.source || "cth";
        setMultipleResults(response.data.results);
        setMultipleResultsSource(source);

        // If addToRecent is true, also set the first result as the main result
        if (addToRecent) {
          setSearchResults({
            result: response.data.results[0],
            source: source,
          });
          setMultipleResults([]); // Clear multiple results to show only the selected one
          fetchRecentSearches();
        } else {
          setSearchResults(null);
        }
      } else if (response.data.result) {
        // If single result
        const source = response.data.source || "cth";
        setSearchResults({
          result: response.data.result,
          source: source,
        });
        setMultipleResults([]);

        if (addToRecent) {
          fetchRecentSearches();
        }
      }
    } catch (error) {
      // Still switch to Search Results tab even on error to show "No results found"
      setActiveTab(0);
      
      if (error.response && error.response.status === 404) {
        setSearchResults(null);
        setMultipleResults([]);
        setContextItems([]);
        showNotification("No results found", "info");
      } else {
        showNotification("Error performing search", "error");
      }
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, fetchRecentSearches, showNotification]);

  // Determine the proper collection source
  const determineCollectionSource = useCallback((item, explicitSource = null) => {
    if (explicitSource) return explicitSource;
    
    const inFavorites = favorites.some(fav => fav._id === item._id || fav.hs_code === item.hs_code);
    if (inFavorites) return "favorite";
    
    const inRecent = recentSearches.some(recent => recent._id === item._id || recent.hs_code === item.hs_code);
    if (inRecent) return "recent";
    
    return "cth";
  }, [favorites, recentSearches]);

  // Toggle favorite status (without confirmation)
  const handleToggleFavorite = useCallback(async (document, explicitSource = null) => {
    try {
      const collectionSource = determineCollectionSource(document, explicitSource);
      
      await axios.patch(
        `${API_URL}/toggle-favorite/${document._id}`,
        { collectionName: collectionSource }
      );

      const newFavoriteStatus = !document.favourite;
      const hsCode = document.hs_code;

      // Update UI for single search result
      if (searchResults?.result?.hs_code === hsCode) {
        setSearchResults(prev => ({
          ...prev,
          result: {
            ...prev.result,
            favourite: newFavoriteStatus,
          },
        }));
      }

      // Update multiple results
      if (multipleResults.length > 0) {
        setMultipleResults(prev => 
          prev.map(item =>
            item.hs_code === hsCode ? { ...item, favourite: newFavoriteStatus } : item
          )
        );
      }

      // Update recent searches
      setRecentSearches(prev => 
        prev.map(item =>
          item.hs_code === hsCode ? { ...item, favourite: newFavoriteStatus } : item
        )
      );

      // Update favorites
      if (newFavoriteStatus) {
        if (!favorites.some(item => item.hs_code === hsCode)) {
          fetchFavorites();
        } else {
          setFavorites(prev => 
            prev.map(item =>
              item.hs_code === hsCode ? { ...item, favourite: true } : item
            )
          );
        }
      } else {
        setFavorites(prev => prev.filter(item => item.hs_code !== hsCode));
      }

      showNotification(
        newFavoriteStatus ? "Added to favorites" : "Removed from favorites",
        "success"
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showNotification("Failed to update favorite status", "error");
    }
  }, [API_URL, determineCollectionSource, favorites, multipleResults, searchResults, showNotification, fetchFavorites]);

  // Delete item (without confirmation)
  const handleDeleteItem = useCallback(async (itemId, collection) => {
    try {
      // Store the HS code before deletion to update UI
      let hsCode = null;
      let wasFavorite = false;

      // Find the item to get its HS code
      if (collection === 'recent') {
        const item = recentSearches.find(item => item._id === itemId);
        if (item) {
          hsCode = item.hs_code;
          wasFavorite = item.favourite;
        }
      } else if (collection === 'favorite') {
        const item = favorites.find(item => item._id === itemId);
        if (item) {
          hsCode = item.hs_code;
          wasFavorite = true;
        }
      }

      await axios.delete(`${API_URL}/delete/${collection}/${itemId}`);

      // Update UI based on which collection was affected
      if (collection === 'recent') {
        setRecentSearches(prev => prev.filter(item => item._id !== itemId));
        showNotification("Item removed from recent searches", "success");
      } else if (collection === 'favorite') {
        setFavorites(prev => prev.filter(item => item._id !== itemId));

        // Also update favorite status in recent searches
        if (hsCode) {
          setRecentSearches(prev =>
            prev.map(item =>
              item.hs_code === hsCode ? { ...item, favourite: false } : item
            )
          );
        }

        showNotification("Item removed from favorites", "success");
      }

      // Update search results if needed
      if (searchResults?.result?.hs_code === hsCode) {
        if (collection === 'favorite') {
          setSearchResults(prev => ({
            ...prev,
            result: {
              ...prev.result,
              favourite: false,
            },
          }));
        }
      }

      // Update multiple results if needed
      if (multipleResults.length > 0 && hsCode && collection === 'favorite') {
        setMultipleResults(prev =>
          prev.map(item =>
            item.hs_code === hsCode ? { ...item, favourite: false } : item
          )
        );
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      showNotification("Failed to delete item", "error");
    }
  }, [API_URL, favorites, multipleResults, recentSearches, searchResults, showNotification]);

  // Clear all favorites
  const handleClearAllFavorites = useCallback(async () => {
    try {
      await axios.delete(`${API_URL}/favorite-cth/clear`);
      setFavorites([]);
      setRecentSearches(prev => prev.map(item => ({ ...item, favourite: false })));
      showNotification("All favorite CTH entries deleted.", "success");
    } catch (error) {
      showNotification("Failed to clear favorites", "error");
    }
  }, [API_URL, showNotification]);
  
  // Clear all recent
  const handleClearAllRecent = useCallback(async () => {
    try {
      await axios.delete(`${API_URL}/recent-cth/clear`);
      setRecentSearches([]);
      showNotification("All recent CTH entries deleted.", "success");
    } catch (error) {
      showNotification("Failed to clear recent searches", "error");
    }
  }, [API_URL, showNotification]);

  // Handle item click
  const handleItemClick = useCallback((item, source) => {
    setActiveTab(0);
    setSearchResults({
      result: item,
      source: source
    });
    setMultipleResults([]);
    fetchContextItems(item.hs_code);
  }, [fetchContextItems]);

  // Handle select result
  const handleSelectResult = useCallback(async (item) => {
    try {
      await axios
        .post(`${API_URL}/add-to-recent`, item);

      const source = multipleResultsSource;
      setSearchResults({
        result: item,
        source: source,
      });
      setMultipleResults([]);
      fetchRecentSearches();
    } catch (error) {
      showNotification("Failed to add to recent searches", "error");
    }
  }, [API_URL, fetchRecentSearches, multipleResultsSource, showNotification]);

  // Handle search input change
  const handleSearchInputChange = useCallback((event) => {
    setSearchQuery(event.target.value);
  }, []);

  // Handle search submit
  const handleSearchSubmit = useCallback((event) => {
    if (event.key === "Enter" && searchQuery.trim()) {
      performSearch(searchQuery.trim(), true);
    }
  }, [performSearch, searchQuery]);

  // Handle tab change
  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 1000);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      performSearch(debouncedSearchQuery, false);
    }
  }, [debouncedSearchQuery, performSearch]);

  // Load recent searches and favorites on mount
  useEffect(() => {
    fetchRecentSearches();
    fetchFavorites();
  }, [fetchFavorites, fetchRecentSearches]);

  // Render search result with context
  const renderSearchResultWithContext = useCallback((mainItem) => {
    const fields = mainItem ? Object.keys(mainItem).filter(key =>
      !['_id', 'updatedAt', 'row_index', 'favourite', "createdAt", "__v"].includes(key)
    ) : [];

    return (
      <Box
      sx={{
        mb: 16,
        maxHeight: '500px',
        overflow: 'auto', // allows both X and Y scrolling
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {contextItems.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 1,
            maxWidth: '100%',
            flexShrink: 0,
          }}
        >
          <Chip
            icon={<InfoIcon />}
            label={`${contextItems.length} context item${contextItems.length > 1 ? 's' : ''} included below`}
            color="primary"
            variant="outlined"
            sx={{ mr: 1 }}
          />
        </Box>
      )}
    
    

        <TableContainer component={Paper} elevation={3}>
          <Table size="small">
          <TableHead>
  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
    {fields.map((field) => (
      <TableCell
        key={field}
        sx={{
          fontWeight: 'bold',
          minWidth:
            field === 'item_description'
              ? 300
              : field === 'import_policy'
              ? 300 // Set your preferred width here
              : 100,
          textAlign: 'center',
        }}
      >
        {field
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')}
      </TableCell>
    ))}
  </TableRow>
</TableHead>


            <TableBody>
              {/* Main item row */}
              <TableRow sx={{ backgroundColor: "#f8f8ff", height: 100 }}>
                {fields.map((field) => (
                  <TableCell key={field} sx={{ textAlign: 'center' }}>
                    {mainItem[field] && mainItem[field] !== "nan" ?
                      field.includes('duty') || field.includes('igst') || field.includes('sws') ?
                        `${mainItem[field]}%` : mainItem[field]
                      : "-"}
                  </TableCell>
                ))}
              </TableRow>

              {contextItems.map((item, index) => (
                <TableRow key={index} sx={{ backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white" }}>
                  {fields.map((field) => (
                    <TableCell key={field} sx={{ textAlign: 'center' }}>
                      {item[field] && item[field] !== "nan" ?
                        field.includes('duty') || field.includes('igst') || field.includes('sws') ?
                          `${item[field]}%` : item[field]
                        : "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }, [contextItems]);

  // Render multiple results
  const renderMultipleResults = useCallback(() => {
    return (
      <TableContainer
        component={Paper}
        elevation={3}
        sx={{ marginTop: 2, maxHeight: 400 }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>HS Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Duty</TableCell>
              <TableCell>IGST</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {multipleResults.map((item) => (
              <TableRow
                key={item._id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => handleSelectResult(item)}
              >
                <TableCell>{item.hs_code}</TableCell>
                <TableCell>{item.item_description}</TableCell>
                <TableCell>{item.total_duty_with_sws}%</TableCell>
                <TableCell>{item.igst}%</TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(item, multipleResultsSource);
                    }}
                    color={item.favourite ? "warning" : "default"}
                  >
                    {item.favourite ? <StarIcon /> : <StarBorderIcon />}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [handleSelectResult, handleToggleFavorite, multipleResults, multipleResultsSource]);

  // Render item
  const renderItem = useCallback((item, source) => {
    const showDeleteButton = source === "recent";

    return (
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          "&:hover": { backgroundColor: "#f9f9f9" },
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            cursor: "pointer"
          }}
          onClick={() => handleItemClick(item, source)}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            {item.hs_code} - {item.item_description}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Duty: {item.total_duty_with_sws}% | IGST: {item.igst}%
          </Typography>
        </Box>
        <Box display="flex" alignItems="center">
          {/* Favorite icon */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(item, source);
            }}
            color={item.favourite ? "warning" : "default"}
          >
            {item.favourite ? <StarIcon /> : <StarBorderIcon />}
          </IconButton>

          {/* Delete icon - only show for recent searches */}
          {showDeleteButton && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteItem(item._id, "recent");
              }}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>
      </Paper>
    );
  }, [handleDeleteItem, handleItemClick, handleToggleFavorite]);

  return (
    <Box sx={{ maxWidth: 1500, margin: "0 auto", p: 3 }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          textAlign: "center",
          fontWeight: 550,
          fontSize: "1.75rem",
          mb: 6
        }}
      >
        CTH Directory Search
      </Typography>

      <Box sx={{ display: "flex", mb: 3, width: "100%", justifyContent: "center", alignItems: "center" }}>
        <TextField
          placeholder="Search by HS Code or Item Description"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={handleSearchInputChange}
          onKeyPress={handleSearchSubmit}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {isLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <IconButton onClick={() => performSearch(searchQuery, true)}>
                    <SearchIcon />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
          style={{ width: "35%" }}
        />
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="Search Result" icon={<SearchIcon />} iconPosition="start" />
        <Tab
          label="Recent Searches"
          icon={<HistoryIcon />}
          iconPosition="start"
        />
        <Tab label="Favorites" icon={<StarIcon />} iconPosition="start" />
      </Tabs>

      {/* Search Results Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Display multiple results if available */}
          {multipleResults.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {multipleResults.length} matches found. Click on any result to
                view details or press Enter to select the top match.
              </Typography>
              {renderMultipleResults()}
            </Box>
          )}

          {/* Display single result if available */}
          {searchResults && searchResults.result && (
            <Box>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="subtitle1">
                  Found in {searchResults.source} collection
                </Typography>
                <IconButton
                  onClick={() => handleToggleFavorite(searchResults.result, searchResults.source)}
                  color={searchResults.result.favourite ? "warning" : "default"}
                  sx={{ ml: 1 }}
                >
                  {searchResults.result.favourite ? <StarIcon /> : <StarBorderIcon />}
                </IconButton>
              </Box>

              {/* Context-aware search result */}
              {renderSearchResultWithContext(searchResults.result)}
            </Box>
          )}

          {/* No results message */}
          {!searchResults && multipleResults.length === 0 && (
            <Typography
              variant="body1"
              color="text.secondary"
              align="center"
              sx={{ mt: 4 }}
            >
              {searchQuery
                ? "No results found"
                : "Enter a search term to find HS codes"}
            </Typography>
          )}
        </Box>
      )}

      {/* Recent Searches Tab */}
      {activeTab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">
              Recently Searched Items (Last 20)
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleClearAllRecent}
            >
              Delete All Recent
            </Button>
          </Box>

          {recentSearches.length > 0 ? (
            recentSearches.map((item) => (
              <Box key={item._id}>
                {renderItem(item, "recent")}
              </Box>
            ))
          ) : (
            <Typography
              variant="body1"
              color="text.secondary"
              align="center"
              sx={{ mt: 4 }}
            >
              No recent searches
            </Typography>
          )}
        </Box>
      )}

      {/* Favorites Tab */}
      {activeTab === 2 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">
              Favorite Items
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleClearAllFavorites}
            >
              Delete All Favorites
            </Button>
          </Box>

          {favorites.length > 0 ? (
            favorites.map((item) => (
              <Box key={item._id}>
                {renderItem(item, "favorite")}
              </Box>
            ))
          ) : (
            <Typography
              variant="body1"
              color="text.secondary"
              align="center"
              sx={{ mt: 4 }}
            >
              No favorites yet
            </Typography>
          )}
        </Box>
      )}

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ImportUtilityTool;
import React, { useState, useEffect } from "react";
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Collapse,
  Divider,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import HistoryIcon from "@mui/icons-material/History";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import InfoIcon from "@mui/icons-material/Info";
import axios from "axios";

const ImportUtilityTool = () => {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [multipleResults, setMultipleResults] = useState([]);
  const [multipleResultsSource, setMultipleResultsSource] = useState("cth"); // Track source of multiple results
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    itemId: null,
    collection: null,
  });
  const [unfavoriteDialog, setUnfavoriteDialog] = useState({
    open: false,
    item: null,
    collectionSource: null,
  });
  // New state for context items
  const [contextItems, setContextItems] = useState([]);
  const [contextExpanded, setContextExpanded] = useState(false);

  // Handle search input changes with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 1000); // 1000ms delay

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      performSearch(debouncedSearchQuery, false); // false = don't add to recent
    }
  }, [debouncedSearchQuery]);

  // Load recent searches and favorites on component mount
  useEffect(() => {
    fetchRecentSearches();
    fetchFavorites();
  }, []);

  const fetchRecentSearches = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/recent`
      );
      setRecentSearches(response.data);
    } catch (error) {
      console.error("Error fetching recent searches:", error);
      showNotification("Failed to load recent searches", "error");
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/favorites`
      );
      setFavorites(response.data);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      showNotification("Failed to load favorites", "error");
    }
  };

  const performSearch = async (query, addToRecent = false) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/search?query=${encodeURIComponent(
          query
        )}&addToRecent=${addToRecent}`
      );

      // Handle context items if they exist
      if (response.data.contextItems && response.data.contextItems.length > 0) {
        setContextItems(response.data.contextItems);
      } else {
        setContextItems([]);
      }

      if (response.data.results && response.data.results.length > 0) {
        // If multiple results
        // Explicitly get source from response or use default "cth"
        const source = response.data.source || "cth";

        setMultipleResults(response.data.results);
        setMultipleResultsSource(source); // Store the source of multiple results

        // If addToRecent is true, also set the first result as the main result
        if (addToRecent) {
          setSearchResults({
            result: response.data.results[0],
            source: source,
          });
          setMultipleResults([]); // Clear multiple results to show only the selected one

          // Refresh recent searches after adding to recent
          fetchRecentSearches();
        } else {
          // Clear single result when showing multiple results
          setSearchResults(null);
        }
      } else if (response.data.result) {
        // If single result
        const source = response.data.source || "cth";

        setSearchResults({
          result: response.data.result,
          source: source,
        });
        setMultipleResults([]); // Clear multiple results

        // Refresh recent searches if addToRecent is true
        if (addToRecent) {
          fetchRecentSearches();
        }
      }
    } catch (error) {
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
  };


  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = (event) => {
    if (event.key === "Enter" && searchQuery.trim()) {
      performSearch(searchQuery.trim(), true); // true = add to recent
    }
  };

  const handleSelectResult = async (item) => {
    try {
      // Add the selected item to recent searches
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-to-recent`,
        item
      );

      // Get the source from the stored multipleResultsSource
      const source = multipleResultsSource;

      // Update UI to show only the selected item
      setSearchResults({
        result: item,
        source: source,
      });
      setMultipleResults([]);

      // Refresh recent searches
      fetchRecentSearches();
    } catch (error) {
      showNotification("Failed to add to recent searches", "error");
    }
  };

  // Determine the proper collection source
  const determineCollectionSource = (item, explicitSource = null) => {
    // If explicit source is provided, use it
    if (explicitSource) {
      return explicitSource;
    }

    // Check if item exists in favorites
    const inFavorites = favorites.some(fav => fav._id === item._id || fav.hs_code === item.hs_code);
    if (inFavorites) {
      return "favorite";
    }

    // Check if item exists in recent searches
    const inRecent = recentSearches.some(recent => recent._id === item._id || recent.hs_code === item.hs_code);
    if (inRecent) {
      return "recent";
    }

    // Default to "cth" if not in favorites or recent
    return "cth";
  };

  // Initial favorite toggle function - now checks if confirmation is needed
  const handleToggleFavorite = (document, explicitSource = null) => {
    // Determine the proper collection source
    const collectionSource = determineCollectionSource(document, explicitSource);

    // If the item is already a favorite and we're trying to unfavorite it, show the confirmation dialog
    if (document.favourite) {
      // Show confirmation dialog
      setUnfavoriteDialog({
        open: true,
        item: document,
        collectionSource: collectionSource,
      });
    } else {
      // If we're adding to favorites, no confirmation needed
      processFavoriteToggle(document, collectionSource);
    }
  };

  // Actual function to process the favorite toggle after confirmation (if needed)
  const processFavoriteToggle = async (document, collectionSource) => {
    try {
      // Fix 1: Check if your API URL is correct - update this based on your actual backend route
      // For example, if your backend uses a different URL structure:
      const response = await axios.patch(
        `${process.env.REACT_APP_API_STRING}/toggle-favorite/${document._id}`,
        {
          collectionName: collectionSource,
        }
      );

      // Get the new favorite status from the response
      const newFavoriteStatus = !document.favourite;

      // Check the HS code to find and update all related items
      const hsCode = document.hs_code;

      // Update UI for single search result if it exists and matches
      if (
        searchResults &&
        searchResults.result &&
        searchResults.result.hs_code === hsCode
      ) {
        setSearchResults({
          ...searchResults,
          result: {
            ...searchResults.result,
            favourite: newFavoriteStatus,
          },
        });
      }

      // Update in multiple results if present
      if (multipleResults.length > 0) {
        setMultipleResults(
          multipleResults.map((item) =>
            item.hs_code === hsCode
              ? { ...item, favourite: newFavoriteStatus }
              : item
          )
        );
      }

      // Update recent searches list - update any items with the same HS code
      setRecentSearches(
        recentSearches.map((item) =>
          item.hs_code === hsCode
            ? { ...item, favourite: newFavoriteStatus }
            : item
        )
      );

      // Update favorites list - either add or remove item
      if (newFavoriteStatus) {
        // If adding to favorites and it's not already there
        if (!favorites.some(item => item.hs_code === hsCode)) {
          // Fetch the updated favorites to ensure we have the correct data
          fetchFavorites();
        } else {
          // Update existing favorite item
          setFavorites(
            favorites.map((item) =>
              item.hs_code === hsCode
                ? { ...item, favourite: true }
                : item
            )
          );
        }
      } else {
        // Removing from favorites
        setFavorites(favorites.filter(item => item.hs_code !== hsCode));
      }

      showNotification(
        newFavoriteStatus ? "Added to favorites" : "Removed from favorites",
        "success"
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showNotification("Failed to update favorite status", "error");
    }
  };


  // Handle close of unfavorite confirmation dialog without confirming
  const handleCloseUnfavoriteDialog = () => {
    setUnfavoriteDialog({ open: false, item: null, collectionSource: null });
  };

  // New function to handle delete confirmation
  const handleDeleteConfirm = (itemId, collection) => {
    setDeleteDialog({
      open: true,
      itemId,
      collection,
    });
  };

  // New function to handle the actual deletion
  const handleDeleteItem = async () => {
    const { itemId, collection } = deleteDialog;

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
          wasFavorite = true; // If it's in favorites, it's favorite by definition
        }
      }

      const response = await axios.delete(
        `${process.env.REACT_APP_API_STRING}/delete/${collection}/${itemId}`
      );

      // Close the dialog
      setDeleteDialog({ open: false, itemId: null, collection: null });

      // Update UI based on which collection was affected
      if (collection === 'recent') {
        setRecentSearches(recentSearches.filter(item => item._id !== itemId));
        showNotification("Item removed from recent searches", "success");
      } else if (collection === 'favorite') {
        // If deleting from favorites, we need to update all related UI components
        setFavorites(favorites.filter(item => item._id !== itemId));

        // Also update favorite status in recent searches if the item exists there
        if (hsCode) {
          setRecentSearches(
            recentSearches.map(item =>
              item.hs_code === hsCode
                ? { ...item, favourite: false }
                : item
            )
          );
        }

        showNotification("Item removed from favorites", "success");
      }

      // Check if the deleted item is currently displayed in search results
      if (
        searchResults &&
        searchResults.result &&
        hsCode &&
        searchResults.result.hs_code === hsCode
      ) {
        // Update the search result to show that it's no longer in the collection
        if (collection === 'favorite') {
          setSearchResults({
            ...searchResults,
            result: {
              ...searchResults.result,
              favourite: false,
            },
          });
        }
      }

      // Update multiple results if present
      if (multipleResults.length > 0 && hsCode) {
        if (collection === 'favorite') {
          setMultipleResults(
            multipleResults.map(item =>
              item.hs_code === hsCode
                ? { ...item, favourite: false }
                : item
            )
          );
        }
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      showNotification("Failed to delete item", "error");
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({ open: false, itemId: null, collection: null });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const showNotification = (message, severity) => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Toggle context expansion
  const toggleContextExpand = () => {
    setContextExpanded(!contextExpanded);
  };

  // Render the main search result with its context
  const renderSearchResultWithContext = (mainItem, source) => {
    // Get all fields from the main item to use as headers, filtering out metadata fields
    const fields = mainItem ? Object.keys(mainItem).filter(key =>
      !['_id', 'updatedAt', 'row_index', 'favourite'].includes(key)
    ) : [];

    return (
      <Box sx={{ mb: 16 }}>
        {contextItems.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
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
                <TableCell sx={{ fontWeight: 'bold', minWidth: 100, textAlign: 'center' }}>
                  Item Type
                </TableCell>
                {fields.map((field) => (
                  <TableCell
                    key={field}
                    sx={{
                      fontWeight: 'bold',
                      minWidth: field === 'item_description' ? 300 : 150,
                      textAlign: 'center'
                    }}
                  >
                    {field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {/* Main item row */}
              <TableRow sx={{ backgroundColor: "#f8f8ff" }}>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', minHeight: 56 }}>
                  Main Item
                </TableCell>
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
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                
                  </TableCell>
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
  };
  // Render the legacy table for backward compatibility
  // const renderSearchResult = (item, source) => {
  //   return (
  //     <TableContainer component={Paper} elevation={3} sx={{ marginTop: 2 }}>
  //       <Table>
  //         <TableHead>
  //           <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
  //             <TableCell>Field</TableCell>
  //             <TableCell>Value</TableCell>
  //           </TableRow>
  //         </TableHead>
  //         <TableBody>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               HS Code
  //             </TableCell>
  //             <TableCell>{item.hs_code}</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Item Description
  //             </TableCell>
  //             <TableCell>{item.item_description}</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Level
  //             </TableCell>
  //             <TableCell>{item.level}</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Unit
  //             </TableCell>
  //             <TableCell>{item.unit}</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Basic Duty (Schedule)
  //             </TableCell>
  //             <TableCell>{item.basic_duty_sch}%</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Basic Duty (Notification)
  //             </TableCell>
  //             <TableCell>{item.basic_duty_ntfn}%</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Specific Duty (Rs)
  //             </TableCell>
  //             <TableCell>{item.specific_duty_rs}</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               IGST
  //             </TableCell>
  //             <TableCell>{item.igst}%</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               SWS (10%)
  //             </TableCell>
  //             <TableCell>{item.sws_10_percent}%</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Total Duty with SWS
  //             </TableCell>
  //             <TableCell>{item.total_duty_with_sws}%</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Total Duty (Specific)
  //             </TableCell>
  //             <TableCell>{item.total_duty_specific}</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Preferential Duty A
  //             </TableCell>
  //             <TableCell>{item.pref_duty_a}%</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Import Policy
  //             </TableCell>
  //             <TableCell>{item.import_policy}</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Non-Tariff Barriers
  //             </TableCell>
  //             <TableCell>{item.non_tariff_barriers}</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Export Policy
  //             </TableCell>
  //             <TableCell>{item.export_policy}</TableCell>
  //           </TableRow>
  //           <TableRow>
  //             <TableCell component="th" scope="row">
  //               Remarks
  //             </TableCell>
  //             <TableCell>{item.remark}</TableCell>
  //           </TableRow>
  //         </TableBody>
  //       </Table>
  //     </TableContainer>
  //   );
  // };

  const renderMultipleResults = () => {
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
                      e.stopPropagation(); // Prevent triggering the row click
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
  };

  const renderItem = (item, source) => {
    // Only show delete button for recent searches, not for favorites
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
          onClick={() => {
            setActiveTab(0); // Switch to Search Result tab
            // Set the search query to the HS code
            setSearchQuery(item.hs_code);
            performSearch(item.hs_code, true);
          }}
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
              e.stopPropagation(); // Prevent triggering the row click
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
                e.stopPropagation(); // Prevent triggering the row click
                handleDeleteConfirm(item._id, "recent");
              }}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ maxWidth: 1500, margin: "0 auto", p: 3, }}>
 <Typography
  variant="h5"
  gutterBottom
  sx={{
    textAlign: "center",
    fontWeight: 550,  // semi-bold
    fontSize: "1.75rem",
    mb: 6
  }}
>
  Import Utility Tool
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
          style={{ width: "35%", }}
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
                  onClick={() =>
                    handleToggleFavorite(
                      searchResults.result,
                      searchResults.source
                    )
                  }
                  color={searchResults.result.favourite ? "warning" : "default"}
                  sx={{ ml: 1 }}
                >
                  {searchResults.result.favourite ? (
                    <StarIcon />
                  ) : (
                    <StarBorderIcon />
                  )}
                </IconButton>
              </Box>

              {/* Use the new component that shows context */}
              {renderSearchResultWithContext(searchResults.result, searchResults.source)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this item? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteItem} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unfavorite Confirmation Dialog */}
      <Dialog
        open={unfavoriteDialog.open}
        onClose={handleCloseUnfavoriteDialog}
        aria-labelledby="unfavorite-dialog-title"
        aria-describedby="unfavorite-dialog-description"
      >
        <DialogTitle id="unfavorite-dialog-title">
          Remove from Favorites
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="unfavorite-dialog-description">
            Are you sure you want to remove this item from your favorites?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUnfavoriteDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (unfavoriteDialog.item && unfavoriteDialog.collectionSource) {
                processFavoriteToggle(unfavoriteDialog.item, unfavoriteDialog.collectionSource);
                handleCloseUnfavoriteDialog();
              }
            }}
            color="warning"
            autoFocus
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

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
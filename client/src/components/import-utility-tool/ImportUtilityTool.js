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
  List,
  ListItem,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import HistoryIcon from "@mui/icons-material/History";
import axios from "axios";

const ImportUtilityTool = () => {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [multipleResults, setMultipleResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

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

      if (response.data.results && response.data.results.length > 0) {
        // If multiple results
        setMultipleResults(response.data.results);

        // If addToRecent is true, also set the first result as the main result
        if (addToRecent) {
          setSearchResults({
            result: response.data.results[0],
            source: response.data.source,
          });
          setMultipleResults([]); // Clear multiple results to show only the selected one
        } else {
          // Clear single result when showing multiple results
          setSearchResults(null);
        }
      } else if (response.data.result) {
        // If single result
        setSearchResults({
          result: response.data.result,
          source: response.data.source,
        });
        setMultipleResults([]); // Clear multiple results
      }

      // Refresh recent searches list after adding to recent
      if (addToRecent) {
        fetchRecentSearches();
      }
    } catch (error) {
      console.error("Search error:", error);
      if (error.response && error.response.status === 404) {
        setSearchResults(null);
        setMultipleResults([]);
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

      // Update UI to show only the selected item
      setSearchResults({
        result: item,
        source: "selected",
      });
      setMultipleResults([]);
      fetchRecentSearches();
    } catch (error) {
      console.error("Error adding to recent:", error);
      showNotification("Failed to add to recent searches", "error");
    }
  };

  const handleToggleFavorite = async (document, collectionSource) => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/toggle-favorite/${document._id}`,
        {
          collectionName: collectionSource,
        }
      );

      // Update UI accordingly
      if (
        searchResults &&
        searchResults.result &&
        searchResults.result._id === document._id
      ) {
        setSearchResults({
          ...searchResults,
          result: {
            ...searchResults.result,
            favourite: !searchResults.result.favourite,
          },
        });
      }

      // Update in multiple results if present
      if (multipleResults.length > 0) {
        setMultipleResults(
          multipleResults.map((item) =>
            item._id === document._id
              ? { ...item, favourite: !item.favourite }
              : item
          )
        );
      }

      // Refresh favorites list
      fetchFavorites();

      // If we're toggling a document from the recent or favorites list, update them too
      if (activeTab === 1) fetchRecentSearches();
      if (activeTab === 2) fetchFavorites();

      showNotification(
        document.favourite ? "Removed from favorites" : "Added to favorites",
        "success"
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showNotification("Failed to update favorite status", "error");
    }
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

  const renderSearchResult = (item, source) => {
    return (
      <TableContainer component={Paper} elevation={3} sx={{ marginTop: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Field</TableCell>
              <TableCell>Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row">
                HS Code
              </TableCell>
              <TableCell>{item.hs_code}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Item Description
              </TableCell>
              <TableCell>{item.item_description}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Level
              </TableCell>
              <TableCell>{item.level}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Unit
              </TableCell>
              <TableCell>{item.unit}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Basic Duty (Schedule)
              </TableCell>
              <TableCell>{item.basic_duty_sch}%</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Basic Duty (Notification)
              </TableCell>
              <TableCell>{item.basic_duty_ntfn}%</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Specific Duty (Rs)
              </TableCell>
              <TableCell>{item.specific_duty_rs}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                IGST
              </TableCell>
              <TableCell>{item.igst}%</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                SWS (10%)
              </TableCell>
              <TableCell>{item.sws_10_percent}%</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Total Duty with SWS
              </TableCell>
              <TableCell>{item.total_duty_with_sws}%</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Total Duty (Specific)
              </TableCell>
              <TableCell>{item.total_duty_specific}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Preferential Duty A
              </TableCell>
              <TableCell>{item.pref_duty_a}%</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Import Policy
              </TableCell>
              <TableCell>{item.import_policy}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Non-Tariff Barriers
              </TableCell>
              <TableCell>{item.non_tariff_barriers}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Export Policy
              </TableCell>
              <TableCell>{item.export_policy}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">
                Remarks
              </TableCell>
              <TableCell>{item.remark}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

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
                      handleToggleFavorite(item, "cth");
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
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {item.hs_code} - {item.item_description}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Duty: {item.total_duty_with_sws}% | IGST: {item.igst}%
          </Typography>
        </Box>
        <Box display="flex" alignItems="center">
          <IconButton
            onClick={() => handleToggleFavorite(item, source)}
            color={item.favourite ? "warning" : "default"}
          >
            {item.favourite ? <StarIcon /> : <StarBorderIcon />}
          </IconButton>
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Customs HS Code Search
      </Typography>

      <Box sx={{ display: "flex", mb: 3 }}>
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
                  <IconButton onClick={() => performSearch(searchQuery, false)}>
                    <SearchIcon />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
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
              {renderSearchResult(searchResults.result, searchResults.source)}
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
          <Typography variant="subtitle1" gutterBottom>
            Recently Searched Items (Last 20)
          </Typography>
          {recentSearches.length > 0 ? (
            recentSearches.map((item) => (
              <Box
                key={item._id}
                onClick={() => {
                  setActiveTab(0); // Switch to Search Result tab
                  performSearch(item.hs_code, true);
                }}
                sx={{ cursor: "pointer" }}
              >
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
          <Typography variant="subtitle1" gutterBottom>
            Favorite Items
          </Typography>
          {favorites.length > 0 ? (
            favorites.map((item) => (
              <Box
                key={item._id}
                onClick={() => {
                  setActiveTab(0); // Switch to Search Result tab
                  performSearch(item.hs_code, true);
                }}
                sx={{ cursor: "pointer" }}
              >
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

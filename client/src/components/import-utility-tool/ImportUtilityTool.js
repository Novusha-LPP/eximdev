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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import HistoryIcon from "@mui/icons-material/History";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import CalculateIcon from "@mui/icons-material/Calculate";
import CloseIcon from "@mui/icons-material/Close";
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
  const [contextItems, setContextItems] = useState([]);  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [dutyCalculatorOpen, setDutyCalculatorOpen] = useState(false);
  const [selectedItemForDuty, setSelectedItemForDuty] = useState(null);  const [dutyCalculatorForm, setDutyCalculatorForm] = useState({
    importTerms: 'CIF',
    cifValue: '',
    freight: '',
    insurance: '',
    bcdRate: '',
    swsRate: '10',
    igstRate: ''
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
  }, []);  // Handle duty calculator modal
  const handleOpenDutyCalculator = useCallback((item) => {
    setSelectedItemForDuty(item);
    
    // Debug: Log the item data to see what's available
    console.log('Item data:', item);
    console.log('basic_duty_sch:', item.basic_duty_sch);
    console.log('basic_duty_ntfn:', item.basic_duty_ntfn);
    console.log('igst:', item.igst);
    
    // Logic to select the appropriate duty rate
    let selectedDuty = '';
      // Helper function to check if a value is valid (not null, not empty, not "nan", and is a number including "0")
    const isValidDuty = (value) => {
      return value != null && 
             value !== '' && 
             value !== 'nan' && 
             value !== 'NaN' && 
             !isNaN(parseFloat(value));
    };
    
    const hasBasicDuty = isValidDuty(item.basic_duty_sch);
    const hasNotificationDuty = isValidDuty(item.basic_duty_ntfn);
      // Check if both basic_duty_sch and basic_duty_ntfn are available
    if (hasNotificationDuty && hasBasicDuty) {
      // ALWAYS prioritize notification duty (basic_duty_ntfn) when both are available
      selectedDuty = item.basic_duty_ntfn;
      console.log('Both available - selected notification duty (priority):', selectedDuty);
    }
    // If only notification duty is available
    else if (hasNotificationDuty) {
      selectedDuty = item.basic_duty_ntfn;
      console.log('Only notification duty available:', selectedDuty);
    }
    // If only basic duty is available
    else if (hasBasicDuty) {
      selectedDuty = item.basic_duty_sch;
      console.log('Only basic duty available:', selectedDuty);
    }
    // If neither is available, selectedDuty remains empty string
    else {
      console.log('No duty values available');
    }
    
    console.log('Final selectedDuty:', selectedDuty);
    
    setDutyCalculatorForm({
      importTerms: 'CIF',
      cifValue: '',
      freight: '',
      insurance: '',
      bcdRate: selectedDuty,
      swsRate: '10',
      igstRate: item.igst || ''
    });
    setDutyCalculatorOpen(true);
  }, []);
  const handleCloseDutyCalculator = useCallback(() => {
    setDutyCalculatorOpen(false);
    setSelectedItemForDuty(null);
    setDutyCalculatorForm({
      importTerms: 'CIF',
      cifValue: '',
      freight: '',
      insurance: '',
      bcdRate: '',
      swsRate: '10',
      igstRate: ''
    });
  }, []);
  // Handle duty form changes
  const handleDutyFormChange = useCallback((field, value) => {
    setDutyCalculatorForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Clear user-entered values only (preserve CTH API values)
  const handleClearUserValues = useCallback(() => {
    setDutyCalculatorForm(prev => ({
      ...prev,
      cifValue: '',
      freight: '',
      insurance: ''
      // Keep importTerms, bcdRate, swsRate, igstRate as they come from CTH API
    }));
  }, []);
  // Calculate duties
  const calculateDuties = useCallback(() => {
    const { importTerms, cifValue, freight, insurance, bcdRate, swsRate, igstRate } = dutyCalculatorForm;
    
    // Calculate assessable value based on import terms
    let assessableValue = 0;
    
    switch (importTerms) {
      case 'CIF':
        assessableValue = parseFloat(cifValue) || 0;
        break;
      case 'FOB':
        const fobValue = parseFloat(cifValue) || 0;
        const freightValue = parseFloat(freight) || 0;
        const insuranceValue = parseFloat(insurance) || 0;
        assessableValue = fobValue + freightValue + insuranceValue;
        break;
      case 'CF':
        const cfValue = parseFloat(cifValue) || 0;
        const cfInsuranceValue = parseFloat(insurance) || 0;
        assessableValue = cfValue + cfInsuranceValue;
        break;
      case 'CI':
        const ciValue = parseFloat(cifValue) || 0;
        const ciFreightValue = parseFloat(freight) || 0;
        assessableValue = ciValue + ciFreightValue;
        break;
      default:
        assessableValue = parseFloat(cifValue) || 0;
    }
    
    if (!assessableValue || !bcdRate || !igstRate) {
      return { bcd: 0, sws: 0, igst: 0, total: 0, assessableValue: 0 };
    }

    const bcdPercentage = parseFloat(bcdRate) / 100 || 0;
    const swsPercentage = parseFloat(swsRate) / 100 || 0;
    const igstPercentage = parseFloat(igstRate) / 100 || 0;
    
    const bcd = assessableValue * bcdPercentage;
    const sws = bcd * swsPercentage;
    const finalAssessableValue = assessableValue + bcd + sws;
    const igst = finalAssessableValue * igstPercentage;
    const total = bcd + sws + igst;

    return {
      bcd: bcd.toFixed(2),
      sws: sws.toFixed(2),
      igst: igst.toFixed(2),
      total: total.toFixed(2),
      assessableValue: assessableValue.toFixed(2)
    };
  }, [dutyCalculatorForm]);

  const calculatedDuties = calculateDuties();

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
                <TableCell>{item.total_duty_with_sws}%</TableCell>                <TableCell>{item.igst}%</TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDutyCalculator(item);
                    }}
                    color="primary"
                    title="Calculate Duty"
                  >
                    <CalculateIcon />
                  </IconButton>
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
        </Table>      </TableContainer>
    );
  }, [handleSelectResult, handleToggleFavorite, multipleResults, multipleResultsSource, handleOpenDutyCalculator]);

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
        </Box>        <Box display="flex" alignItems="center">
          {/* Calculate Duty button */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDutyCalculator(item);
            }}
            color="primary"
            title="Calculate Duty"
          >
            <CalculateIcon />
          </IconButton>

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
        </Box>      </Paper>
    );
  }, [handleDeleteItem, handleItemClick, handleToggleFavorite, handleOpenDutyCalculator]);

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
          )}          {/* Display single result if available */}
          {searchResults && searchResults.result && (
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center">
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
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CalculateIcon />}
                  onClick={() => handleOpenDutyCalculator(searchResults.result)}
                  sx={{ ml: 2 }}
                >
                  Calculate Duty
                </Button>
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
      )}      <Snackbar
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
      </Snackbar>      {/* Duty Calculator Modal */}
      <Dialog
        open={dutyCalculatorOpen}
        onClose={handleCloseDutyCalculator}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            background: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box sx={{ fontSize: '16px', fontWeight: 600, color: '#34495e' }}>
              💸 Duty Calculator
            </Box>
            {selectedItemForDuty && (
              <Chip 
                label={`HS: ${selectedItemForDuty.hs_code}`}
                size="small"
                sx={{ 
                  fontSize: '12px', 
                  fontWeight: 600,
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2'
                }}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2, pt: 1 }}>
          {selectedItemForDuty && (
            <Box>              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1.5,
                '& .field-group': {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5
                },
                '& .field-label': {
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#555'
                },
                '& input, & .MuiOutlinedInput-root': {
                  padding: '6px 8px',
                  fontSize: '13px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  '&:focus': {
                    borderColor: '#007bff',
                    outline: 'none'
                  }
                },
                '& .MuiFormControl-root': {
                  minWidth: '100%'
                },
                '& .calculated-value': {
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#28a745',
                  marginTop: '2px'
                },
                '& .full-width': {
                  gridColumn: '1 / -1'
                }
              }}>
                
                {/* HS Code & Description */}
                <Box className="field-group full-width" sx={{ 
                  p: 1.5, 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  mb: 1
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '13px', color: '#2c3e50' }}>
                    {selectedItemForDuty.hs_code} - {selectedItemForDuty.item_description}
                  </Typography>
                </Box>                {/* Import Terms */}
                <Box className="field-group full-width">
                  <Typography className="field-label">Import Terms</Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 1, 
                    flexWrap: 'wrap',
                    mt: 0.5
                  }}>
                    {[
                      { value: 'CIF', label: 'CIF', color: '#2563eb' },
                      { value: 'FOB', label: 'FOB', color: '#059669' },
                      { value: 'CF', label: 'C&F', color: '#dc2626' },
                      { value: 'CI', label: 'C&I', color: '#7c3aed' }
                    ].map((option) => (
                      <Box
                        key={option.value}
                        onClick={() => handleDutyFormChange('importTerms', option.value)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${dutyCalculatorForm.importTerms === option.value ? option.color : '#d1d5db'}`,
                          backgroundColor: dutyCalculatorForm.importTerms === option.value ? option.color : '#ffffff',
                          color: dutyCalculatorForm.importTerms === option.value ? '#ffffff' : '#374151',
                          fontSize: '13px',
                          fontWeight: 500,
                          minWidth: '60px',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                          boxShadow: dutyCalculatorForm.importTerms === option.value ? `0 2px 4px ${option.color}20` : 'none',
                          '&:hover': {
                            borderColor: option.color,
                            backgroundColor: dutyCalculatorForm.importTerms === option.value ? option.color : `${option.color}08`,
                            transform: 'translateY(-1px)',
                            boxShadow: `0 3px 6px ${option.color}20`
                          }
                        }}
                      >
                        <Box
                          sx={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            border: `2px solid ${dutyCalculatorForm.importTerms === option.value ? '#ffffff' : option.color}`,
                            backgroundColor: dutyCalculatorForm.importTerms === option.value ? '#ffffff' : 'transparent',
                            marginRight: '8px',
                            transition: 'all 0.15s ease'
                          }}
                        />
                        {option.label}
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Base Value */}
                <Box className="field-group">
                  <Typography className="field-label">{dutyCalculatorForm.importTerms} Value (₹)</Typography>
                  <input
                    type="number"
                    value={dutyCalculatorForm.cifValue}
                    onChange={(e) => handleDutyFormChange('cifValue', e.target.value)}
                    placeholder="Enter value"
                  />
                </Box>

                {/* Conditional Fields */}
                {(dutyCalculatorForm.importTerms === 'FOB' || dutyCalculatorForm.importTerms === 'CI') && (
                  <Box className="field-group">
                    <Typography className="field-label">Freight (₹)</Typography>
                    <input
                      type="number"
                      value={dutyCalculatorForm.freight}
                      onChange={(e) => handleDutyFormChange('freight', e.target.value)}
                      placeholder="Freight"
                    />
                  </Box>
                )}

                {(dutyCalculatorForm.importTerms === 'FOB' || dutyCalculatorForm.importTerms === 'CF') && (
                  <Box className="field-group">
                    <Typography className="field-label">Insurance (₹)</Typography>
                    <input
                      type="number"
                      value={dutyCalculatorForm.insurance}
                      onChange={(e) => handleDutyFormChange('insurance', e.target.value)}
                      placeholder="Insurance"
                    />
                  </Box>
                )}

                {/* BCD */}
                <Box className="field-group">
                  <Typography className="field-label">
                    BCD (%) <span style={{ color: '#007bff', cursor: 'help' }} title="Basic Customs Duty">ℹ️</span>
                  </Typography>
                  <input
                    type="number"
                    value={dutyCalculatorForm.bcdRate}
                    onChange={(e) => handleDutyFormChange('bcdRate', e.target.value)}
                    placeholder="BCD rate"
                  />
                  <div className="calculated-value">₹{parseFloat(calculatedDuties.bcd || 0).toFixed(2)}</div>
                </Box>

                {/* SWS */}
                <Box className="field-group">
                  <Typography className="field-label">
                    SWS (%) <span style={{ color: '#007bff', cursor: 'help' }} title="10% of BCD">ℹ️</span>
                  </Typography>
                  <input
                    type="number"
                    value={dutyCalculatorForm.swsRate}
                    onChange={(e) => handleDutyFormChange('swsRate', e.target.value)}
                    style={{ backgroundColor: '#f8f9fa' }}
                  />
                  <div className="calculated-value">₹{parseFloat(calculatedDuties.sws || 0).toFixed(2)}</div>
                </Box>

                {/* IGST */}
                <Box className="field-group">
                  <Typography className="field-label">
                    IGST (%) <span style={{ color: '#007bff', cursor: 'help' }} title="Integrated GST">ℹ️</span>
                  </Typography>
                  <input
                    type="number"
                    value={dutyCalculatorForm.igstRate}
                    onChange={(e) => handleDutyFormChange('igstRate', e.target.value)}
                    placeholder="IGST rate"
                  />
                  <div className="calculated-value">₹{parseFloat(calculatedDuties.igst || 0).toFixed(2)}</div>
                </Box>

                {/* Assessable Value */}
                <Box className="field-group">
                  <Typography className="field-label">Assessable Value</Typography>
                  <Box sx={{ 
                    p: 1, 
                    backgroundColor: '#e8f5e8', 
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#155724',
                    textAlign: 'center'
                  }}>
                    ₹{parseFloat(calculatedDuties.assessableValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Box>
                </Box>

                {/* Total Duty */}
                <Box className="field-group">
                  <Typography className="field-label">💰 Total Duty</Typography>
                  <Box sx={{ 
                    p: 1, 
                    backgroundColor: '#ffeaa7', 
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#2d3436',
                    textAlign: 'center'
                  }}>
                    ₹{parseFloat(calculatedDuties.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Box>
                </Box>
              </Box>            </Box>
          )}
        </DialogContent>        <DialogActions sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ 
            fontSize: '10px', 
            color: '#666', 
            fontStyle: 'italic'
          }}>
            ⚠️ Estimated calculation only
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={handleClearUserValues} 
              size="small" 
              variant="outlined"
              color="secondary"
              sx={{
                fontSize: '11px',
                padding: '4px 12px',
                minWidth: 'auto'
              }}
            >
              Clear All
            </Button>
            <Button 
              onClick={handleCloseDutyCalculator} 
              size="small" 
              variant="outlined"
            >
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImportUtilityTool;
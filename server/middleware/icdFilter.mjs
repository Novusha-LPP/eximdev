import UserModel from "../model/userModel.mjs";

/**
 * Middleware to apply ICD code filtering based on user permissions
 * This middleware will:
 * 1. Extract username from request (params.selectedICD first, then headers, body, or query)
 * 2. Fetch user's assigned ICD codes from database
 * 3. Apply automatic filtering based on user's ICD permissions
 * 4. Allow full access for admins or users with "ALL" ICD code
 */
const applyUserIcdFilter = async (req, res, next) => {
  try {
    // Extract username from various sources - prioritize params.username
    let username = 
      req.params?.username ||
      req.query?.username ||
      req.headers['x-username'] || 
      req.body?.username;

    // If no username provided, proceed without filtering (for backward compatibility)
    if (!username) {
      console.warn('⚠️ No username provided for ICD filtering');
      return next();
    }

    // Fetch user data from database
    const user = await UserModel.findOne({ username }).select('selected_icd_codes role');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Admin users or users with "ALL" ICD code get full access
    if (user.role === "Admin" || 
        (user.selected_icd_codes && user.selected_icd_codes.includes("ALL"))) {
      // No ICD filtering needed for admins or users with ALL access
      req.userIcdFilter = null;
      req.icdFilterCondition = {}; // Empty object means no filtering
      return next();
    }

    // Apply ICD filtering for regular users
    if (user.selected_icd_codes && user.selected_icd_codes.length > 0) {
      // Create MongoDB query for ICD filtering - exact match with case insensitive
      const icdFilter = {
        custom_house: {
          $in: user.selected_icd_codes.map(icd => new RegExp(`^${escapeRegex(icd)}$`, 'i'))
        }
      };
      
      req.userIcdFilter = icdFilter; // For backward compatibility
      req.icdFilterCondition = icdFilter; // For new routes
      
   
    } else {
      // User has no ICD codes assigned - show no jobs
      const emptyFilter = { 
        custom_house: { $in: [] } // This will return no results
      };
      
      req.userIcdFilter = emptyFilter; // For backward compatibility
      req.icdFilterCondition = emptyFilter; // For new routes
      
    }

    // Store user info for potential use in route handlers
    req.currentUser = {
      username: user.username,
      role: user.role,
      selectedIcdCodes: user.selected_icd_codes || []
    };

    next();
  } catch (error) {
    console.error('Error in ICD filter middleware:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to escape regex special characters
const escapeRegex = (string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
};

export default applyUserIcdFilter;

// Named export for flexibility
export const icdFilter = applyUserIcdFilter;

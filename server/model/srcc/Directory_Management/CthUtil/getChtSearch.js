import express from 'express';
import mongoose from 'mongoose';
import CthModel from './CthUtil.mjs';
import FavoriteModel from './FavouriteCth.mjs';
import RecentModel from './RecentCth.mjs';
import NodeCache from 'node-cache'; 

const router = express.Router();

const searchCache = new NodeCache({ stdTTL: 300 });



async function getHsCodeWithContext(hsCode, Model) {
  try {
    // Find the main document with the HS code
    const mainDoc = await Model.findOne({ hs_code: hsCode });
    if (!mainDoc) {
      return [{ message: "HS code not found." }];
    }

    // Get all documents sorted by row_index
    const docs = await Model.find().sort({ row_index: 1 });
    const docsArray = Array.isArray(docs) ? docs : docs.length ? Array.from(docs) : [];

    // Find index of the main document
    let i = docsArray.findIndex(doc => doc.hs_code === hsCode) + 1;
    
    const result = [mainDoc];
    const noteKeywords = ["note", "w.e.f", "clause", "finance", "inserted", "amendment"];
    let breakCounter = 0;

    // Loop through subsequent documents to find related notes
    while (i < docsArray.length) {
      const doc = docsArray[i];
      const hs = (doc.hs_code || "").toString().trim().toLowerCase();
      const desc = (doc.item_description || "").toString().trim().toLowerCase();
      const remark = (doc.remark || "").toString().trim().toLowerCase();

      // Break if we find another HS code
      if (hs && hs !== "nan") {
        break;
      }

      // Add document if it contains any note keywords
      if (noteKeywords.some(keyword => desc.includes(keyword) || remark.includes(keyword))) {
        result.push(doc);
        breakCounter = 0;
      } else {
        breakCounter++;
        if (breakCounter >= 3) {
          break;
        }
      }
      i++;
    }

    return result;
  } catch (error) {
    console.error("Error in getHsCodeWithContext:", error);
    throw error;
  }
}

router.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    const addToRecent = req.query.addToRecent === 'true';

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Generate a cache key
    const cacheKey = `search_${query}_${addToRecent}`;
    
    // Check if result is in cache
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult) {
      console.log('Search cache hit for:', query);
      return res.status(200).json(cachedResult);
    }

    // Parse the query to determine if it's an HS code (numeric) or description
    const isHsCodeSearch = /^\d+/.test(query);
    
    // Optimize the query based on what's being searched
    let searchCondition;
    let results;
    
    if (isHsCodeSearch) {
      // For HS codes, use exact prefix match which is faster than regex
      // This is much more efficient for indexed fields
      searchCondition = { hs_code: new RegExp(`^${query}`) };
      results = await CthModel.find(searchCondition)
        .lean()
        .limit(20)
        .select('hs_code item_description basic_duty_sch basic_duty_ntfn specific_duty_rs igst sws_10_percent total_duty_with_sws total_duty_specific pref_duty_a import_policy non_tariff_barriers export_policy remark favourite level unit'); // Only select fields we need
    } else {
      // For descriptive text, use text search which is optimized if you have text indexes
      // Fall back to regex if the string is too short for text search
      if (query.length >= 3) {
        // Use text index search for longer queries
        searchCondition = { $text: { $search: query } };
        results = await CthModel.find(searchCondition)
          .lean()
          .limit(20)
          .select('hs_code item_description basic_duty_sch basic_duty_ntfn specific_duty_rs igst sws_10_percent total_duty_with_sws total_duty_specific pref_duty_a import_policy non_tariff_barriers export_policy remark favourite level unit')
          .sort({ score: { $meta: "textScore" } }); // Sort by text relevance
      } else {
        // Use regex for short queries
        searchCondition = { item_description: new RegExp(query, 'i') };
        results = await CthModel.find(searchCondition)
          .lean()
          .limit(20)
          .select('hs_code item_description basic_duty_sch basic_duty_ntfn specific_duty_rs igst sws_10_percent total_duty_with_sws total_duty_specific pref_duty_a import_policy non_tariff_barriers export_policy remark favourite level unit');
      }
    }

    if (!results.length) {
      // If no results with optimized query, try a more flexible search as fallback
      searchCondition = {
        $or: [
          { item_description: new RegExp(query, 'i') },
          { hs_code: new RegExp(query, 'i') }
        ]
      };
      
      results = await CthModel.find(searchCondition)
        .lean()
        .limit(20)
        .select('hs_code item_description basic_duty_sch basic_duty_ntfn specific_duty_rs igst sws_10_percent total_duty_with_sws total_duty_specific pref_duty_a import_policy non_tariff_barriers export_policy remark favourite level unit');
      
      if (!results.length) {
        return res.status(404).json({
          message: 'No document found matching the search criteria'
        });
      }
    }

    const sourceCollection = 'cth';
    const mainItem = results[0]; // pick first for context extraction

    // Get context items in parallel with adding to recent
    const contextPromise = mainItem.hs_code
      ? getHsCodeWithContext(mainItem.hs_code, CthModel)
      : Promise.resolve([]);

    // Add to recent if requested - in parallel
    const recentPromise = addToRecent
      ? addToRecentCollection(mainItem)
      : Promise.resolve();

    // Wait for both operations to complete
    const [contextResults] = await Promise.all([contextPromise, recentPromise]);

    // Process context items
    let contextItems = [];
    if (contextResults && contextResults.length > 0) {
      // Filter out the main item from context
      contextItems = contextResults.filter(item => 
        item._id.toString() !== mainItem._id.toString()
      );
    }

    // Prepare response object
    const responseData = {
      results,
      contextItems,
      source: sourceCollection
    };

    // Save to cache
    searchCache.set(cacheKey, responseData);

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({
      message: 'Server error while searching',
      error: error.message
    });
  }
});

const recentCache = new NodeCache({ stdTTL: 600 });
const favoritesCache = new NodeCache({ stdTTL: 600 });

// Cache key constants
const RECENT_COUNT_KEY = 'recent_count';
const FAVORITES_KEY_PREFIX = 'fav_';

// Function to get recent count with caching
async function getCachedRecentCount() {
  let count = recentCache.get(RECENT_COUNT_KEY);
  if (count === undefined) {
    count = await RecentModel.countDocuments();
    recentCache.set(RECENT_COUNT_KEY, count);
  }
  return count;
}

// Function to check if item is favorite with caching
async function isItemFavorite(query) {
  const cacheKey = FAVORITES_KEY_PREFIX + (query.hs_code || query.item_description);
  let isFavorite = favoritesCache.get(cacheKey);
  
  if (isFavorite === undefined) {
    const favoriteExists = await FavoriteModel.exists(query);
    isFavorite = !!favoriteExists;
    favoritesCache.set(cacheKey, isFavorite);
  }
  
  return isFavorite;
}

// The optimized function
async function addToRecentCollection(item) {
  try {
    // Use the most unique field for querying
    const query = item.hs_code ? { hs_code: item.hs_code } : { item_description: item.item_description };
    
    // First, check if document already exists
    const existingDoc = await RecentModel.findOne(query).select('_id');
    
    if (existingDoc) {
      // Document exists, just update the timestamp
      // Use updateOne which is faster than findOneAndUpdate when you don't need the result
      await RecentModel.updateOne(
        { _id: existingDoc._id },
        { $set: { createdAt: new Date() } }
      );
      
      // Update the recent count in cache if we're tracking it
      if (recentCache.has(RECENT_COUNT_KEY)) {
        // No need to change the count
      }
      
      return;
    }
    
    // Document doesn't exist, we need to create a new one
    
    // Check if we're at the limit (with caching)
    const recentCount = await getCachedRecentCount();
    
    if (recentCount >= 20) {
      // Find and delete the oldest document
      const oldest = await RecentModel.findOne().sort({ createdAt: 1 }).select('_id');
      if (oldest) {
        await RecentModel.deleteOne({ _id: oldest._id });
        // Don't update cache count as we'll add one document next
      }
    } else {
      // We're adding a document, increment the count in cache
      recentCache.set(RECENT_COUNT_KEY, recentCount + 1);
    }
    
    // Check if item is in favorites (with caching)
    const isFavorite = await isItemFavorite(query);
    
    // Create and save the new document
    const newRecentDoc = new RecentModel({
      ...item,
      favourite: isFavorite,
      createdAt: new Date()
    });
    
    await newRecentDoc.save();
    
  } catch (error) {
    console.error('Error adding to Recent collection:', error);
    throw error;
  }
}


// New API endpoint to add an item to the recent collection
router.post('/api/add-to-recent', async (req, res) => {
  try {
    const itemData = req.body;
    // Ensure at least one unique identifier
    if (!itemData || (!itemData.hs_code && !itemData.item_description)) {
      return res.status(400).json({ message: 'Invalid item: hs_code or item_description required' });
    }

    await addToRecentCollection(itemData);

    return res.status(200).json({ message: 'Successfully added to recent searches' });
  } catch (error) {
    return res.status(500).json({
      message: 'Server error while adding to recent searches',
      error: error.message
    });
  }
});


// Improved toggle favorite API to sync across all collections
router.patch('/api/toggle-favorite/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { collectionName } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }

    if (!collectionName || !['cth', 'recent', 'favorite'].includes(collectionName)) {
      return res.status(400).json({ message: 'Valid collection name is required' });
    }

    let Collection;
    switch (collectionName) {
      case 'cth':
        Collection = CthModel;
        break;
      case 'recent':
        Collection = RecentModel;
        break;
      case 'favorite':
        Collection = FavoriteModel;
        break;
    }

    const document = await Collection.findById(id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    const newFavoriteStatus = !document.favourite;
    // Get HS code to sync across collections
    const hsCode = document.hs_code;
    
    // Update the document in its original collection
    document.favourite = newFavoriteStatus;
    await document.save();
    
    // SYNC STEP 1: Update the CTH collection regardless of which collection we started with
    const cthItem = await CthModel.findOne({ hs_code: hsCode });
    if (cthItem) {
      cthItem.favourite = newFavoriteStatus;
      await cthItem.save();
    }
    
    // SYNC STEP 2: Update the Recent collection if the item exists there
    const recentItem = await RecentModel.findOne({ hs_code: hsCode });
    if (recentItem) {
      recentItem.favourite = newFavoriteStatus;
      await recentItem.save();
    }

    // SYNC STEP 3: Handle the Favorite collection
    if (newFavoriteStatus) {
      // Adding to favorites
      const existingFavorite = await FavoriteModel.findOne({ hs_code: hsCode });
      
      if (!existingFavorite) {
        const newFavoriteDoc = new FavoriteModel({
          hs_code: document.hs_code,
          level: document.level,
          item_description: document.item_description,
          unit: document.unit,
          basic_duty_sch: document.basic_duty_sch,
          basic_duty_ntfn: document.basic_duty_ntfn,
          specific_duty_rs: document.specific_duty_rs,
          igst: document.igst,
          sws_10_percent: document.sws_10_percent,
          total_duty_with_sws: document.total_duty_with_sws,
          total_duty_specific: document.total_duty_specific,
          pref_duty_a: document.pref_duty_a,
          import_policy: document.import_policy,
          non_tariff_barriers: document.non_tariff_barriers,
          export_policy: document.export_policy,
          remark: document.remark,
          favourite: true
        });
  
        await newFavoriteDoc.save();
      } else if (!existingFavorite.favourite) {
        // Ensure the favorite status is correct
        existingFavorite.favourite = true;
        await existingFavorite.save();
      }
    } else {
      // Removing from favorites - if collectionName is 'favorite', we need to
      // remove the document rather than just update its status
      if (collectionName === 'favorite') {
        await FavoriteModel.findByIdAndDelete(id);
      } else {
        // If the toggle is coming from another collection, find and remove the corresponding favorite
        await FavoriteModel.findOneAndDelete({ hs_code: hsCode });
      }
    }

    return res.status(200).json({
      message: 'Favorite status updated successfully across all collections',
      document
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return res.status(500).json({
      message: 'Server error while updating favorite status',
      error: error.message
    });
  }
});

// Get favorites
router.get('/api/favorites', async (req, res) => {
  try {
    const favorites = await FavoriteModel.find().sort({ createdAt: -1 });
    return res.status(200).json(favorites);
  } catch (error) {
    return res.status(500).json({
      message: 'Server error while fetching favorites',
      error: error.message
    });
  }
});

// Get recent
router.get('/api/recent', async (req, res) => {
  try {
    const recents = await RecentModel.find().sort({ createdAt: -1 });
    return res.status(200).json(recents);
  } catch (error) {
    return res.status(500).json({
      message: 'Server error while fetching recent searches',
      error: error.message
    });
  }
});

// Improved delete API to handle favorite status sync
router.delete('/api/delete/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    if (!['recent', 'favorite'].includes(collection)) {
      return res.status(400).json({ message: 'Valid collection name is required (recent or favorite)' });
    }
    
    let Model;
    switch (collection) {
      case 'recent':
        Model = RecentModel;
        break;
      case 'favorite':
        Model = FavoriteModel;
        break;
    }
    
    const document = await Model.findById(id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Store HS code for reference before deletion
    const hsCode = document.hs_code;
    const wasFavorite = document.favourite;
    
    // Delete the document from the specified collection
    await Model.findByIdAndDelete(id);
    // If deleted from favorites, update favorite status in other collections
    if (collection === 'favorite') {
      // Update in CTH collection
      const cthItem = await CthModel.findOne({ hs_code: hsCode });
      if (cthItem) {
        cthItem.favourite = false;
        await cthItem.save();
      }
      
      // Update in Recent collection
      const recentItem = await RecentModel.findOne({ hs_code: hsCode });
      if (recentItem) {
        recentItem.favourite = false;
        await recentItem.save();
      }
    }
    
    return res.status(200).json({
      message: `Successfully deleted from ${collection} collection`,
      deletedId: id,
      hsCode: hsCode,
      wasFavorite: wasFavorite
    });
  } catch (error) {
    console.error(`Delete error:`, error);
    return res.status(500).json({
      message: 'Server error while deleting item',
      error: error.message
    });
  }
});

// Add this new API route to your Express router file

// Get context items for an HS code
router.get('/api/context/:hsCode', async (req, res) => {
  try {
    const { hsCode } = req.params;
    
    if (!hsCode) {
      return res.status(400).json({ message: 'HS Code is required' });
    }
    
    // Get context from the hs_code
    const contextResults = await getHsCodeWithContext(hsCode, CthModel);
    
    // Exclude the main item (first item)
    const contextItems = contextResults.length > 1 ? contextResults.slice(1) : [];
    
    return res.status(200).json({ contextItems });
    
  } catch (error) {
    console.error('Context API error:', error);
    return res.status(500).json({ 
      message: 'Server error while fetching context', 
      error: error.message 
    });
  }
});


export default router;
import express from 'express';
import mongoose from 'mongoose';
import CthModel from './CthUtil.mjs';
import FavoriteModel from './FavouriteCth.mjs';
import RecentModel from './RecentCth.mjs';

const router = express.Router();

// Modified search API to return multiple results
router.get('/api/search', async (req, res) => {
    try {
      const { query } = req.query;
      const addToRecent = req.query.addToRecent === 'true'; // Convert string to boolean
    
  
      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }
  
      // Create case-insensitive regex that matches anywhere in the string
      const searchRegex = new RegExp(query, 'i');
  
      const searchCondition = {
        $or: [
          { item_description: searchRegex },
          { hs_code: searchRegex }
        ]
      };
  
      // Check counts before searching
      const recentCount = await RecentModel.countDocuments();
      const favoriteCount = await FavoriteModel.countDocuments();
      const cthCount = await CthModel.countDocuments();
  
      // Search in Recent collection
      let results = await RecentModel.find(searchCondition);
      let sourceCollection = 'recent';
  
      // If not found in Recent, search in Favorite
      if (!results.length) {
        results = await FavoriteModel.find(searchCondition);
        sourceCollection = 'favorite';
      }
  
      // If not found in Favorite, search in CTH
      if (!results.length) {
        results = await CthModel.find(searchCondition).limit(20); // Limit to 20 results for performance
        sourceCollection = 'cth';
  
        // Add the first matching result to RecentModel if addToRecent is true
        if (results.length > 0 && addToRecent) {
          const firstResult = results[0];
          await addToRecentCollection(firstResult);
        }
      }
  
      if (results.length > 0) {
        if (addToRecent) {
          // If addToRecent is true, return the first result only (traditional behavior)
          return res.status(200).json({
            result: results[0],
            source: sourceCollection
          });
        } else {
          // If addToRecent is false, return all matching results
          return res.status(200).json({
            results: results,
            source: sourceCollection
          });
        }
      } else {
        return res.status(404).json({
          message: 'No document found matching the search criteria'
        });
      }
    } catch (error) {
      return res.status(500).json({
        message: 'Server error while searching',
        error: error.message
      });
    }
});

// Helper function to add an item to the recent collection
async function addToRecentCollection(item) {
  try {
    // Build dynamic query based on availability
    const query = [];
    if (item.hs_code) query.push({ hs_code: item.hs_code });
    if (item.item_description) query.push({ item_description: item.item_description });

    const existingRecent = query.length
      ? await RecentModel.findOne({ $or: query })
      : null;

    if (existingRecent) {
      existingRecent.createdAt = new Date();
      await existingRecent.save();
      return;
    }

    const recentCount = await RecentModel.countDocuments();

    if (recentCount >= 20) {
      const oldest = await RecentModel.findOne().sort({ createdAt: 1 });
      if (oldest) {
        await RecentModel.findByIdAndDelete(oldest._id);
      }
    }

    const favoriteItem = query.length
      ? await FavoriteModel.findOne({ $or: query })
      : null;

    const isFavorite = !!favoriteItem;

    const newRecentDoc = new RecentModel({
      hs_code: item.hs_code,
      level: item.level,
      item_description: item.item_description,
      unit: item.unit,
      basic_duty_sch: item.basic_duty_sch,
      basic_duty_ntfn: item.basic_duty_ntfn,
      specific_duty_rs: item.specific_duty_rs,
      igst: item.igst,
      sws_10_percent: item.sws_10_percent,
      total_duty_with_sws: item.total_duty_with_sws,
      total_duty_specific: item.total_duty_specific,
      pref_duty_a: item.pref_duty_a,
      import_policy: item.import_policy,
      non_tariff_barriers: item.non_tariff_barriers,
      export_policy: item.export_policy,
      remark: item.remark,
      favourite: isFavorite
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

export default router;
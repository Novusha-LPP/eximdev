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
      console.log(`Received search query: "${query}", addToRecent: ${addToRecent}`);
  
      if (!query) {
        console.log('No search query provided');
        return res.status(400).json({ message: 'Search query is required' });
      }
  
      // Create case-insensitive regex that matches anywhere in the string
      const searchRegex = new RegExp(query, 'i');
      console.log(`Search regex: ${searchRegex}`);
  
      const searchCondition = {
        $or: [
          { item_description: searchRegex },
          { hs_code: searchRegex }
        ]
      };
      console.log('Search condition:', JSON.stringify(searchCondition));
  
      // Check counts before searching
      const recentCount = await RecentModel.countDocuments();
      const favoriteCount = await FavoriteModel.countDocuments();
      const cthCount = await CthModel.countDocuments();
      console.log(`Collection counts - Recent: ${recentCount}, Favorite: ${favoriteCount}, CTH: ${cthCount}`);
  
      // Search in Recent collection
      console.log('Searching in Recent collection...');
      let results = await RecentModel.find(searchCondition);
      console.log(`Found ${results.length} results in Recent collection`);
      let sourceCollection = 'recent';
  
      // If not found in Recent, search in Favorite
      if (!results.length) {
        console.log('Searching in Favorite collection...');
        results = await FavoriteModel.find(searchCondition);
        console.log(`Found ${results.length} results in Favorite collection`);
        sourceCollection = 'favorite';
      }
  
      // If not found in Favorite, search in CTH
      if (!results.length) {
        console.log('Searching in CTH collection...');
        results = await CthModel.find(searchCondition).limit(20); // Limit to 20 results for performance
        console.log(`Found ${results.length} results in CTH collection`);
        sourceCollection = 'cth';
  
        // Add the first matching result to RecentModel if addToRecent is true
        if (results.length > 0 && addToRecent) {
          const firstResult = results[0];
          await addToRecentCollection(firstResult);
        }
      }
  
      if (results.length > 0) {
        console.log(`Returning ${results.length} results from ${sourceCollection} collection`);
        
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
        console.log('No results found in any collection');
        return res.status(404).json({
          message: 'No document found matching the search criteria'
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      return res.status(500).json({
        message: 'Server error while searching',
        error: error.message
      });
    }
});

// New API endpoint to add an item to the recent collection
router.post('/api/add-to-recent', async (req, res) => {
  try {
    const itemData = req.body;
    console.log('Adding to recent:', itemData.hs_code);
    
    if (!itemData || !itemData.hs_code) {
      return res.status(400).json({ message: 'Invalid item data' });
    }
    
    await addToRecentCollection(itemData);
    
    return res.status(200).json({
      message: 'Successfully added to recent searches'
    });
  } catch (error) {
    console.error('Add to recent error:', error);
    return res.status(500).json({
      message: 'Server error while adding to recent searches',
      error: error.message
    });
  }
});

// Helper function to add an item to the recent collection
async function addToRecentCollection(item) {
  try {
    console.log('Adding item to Recent collection:', item.hs_code);
    
    // Check if the item already exists in the recent collection
    const existingRecent = await RecentModel.findOne({ hs_code: item.hs_code });
    
    if (existingRecent) {
      // If it exists, update its timestamp to bring it to the top
      existingRecent.createdAt = new Date();
      await existingRecent.save();
      console.log('Updated existing item in recent collection');
      return;
    }
    
    // Check if we've reached the maximum limit of recent items
    const recentCount = await RecentModel.countDocuments();
    console.log(`Current Recent count: ${recentCount}`);

    if (recentCount >= 20) {
      console.log('Recent collection full, removing oldest entry');
      const oldest = await RecentModel.findOne().sort({ createdAt: 1 });
      if (oldest) {
        await RecentModel.findByIdAndDelete(oldest._id);
        console.log(`Removed oldest entry with ID: ${oldest._id}`);
      }
    }

    // Add the new item to the recent collection
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
      favourite: item.favourite || false
    });

    await newRecentDoc.save();
    console.log('Successfully added to Recent collection');
  } catch (error) {
    console.error('Error adding to Recent collection:', error);
    throw error; // Propagate the error to be handled by the caller
  }
}

// Toggle favorite API
router.patch('/api/toggle-favorite/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { collectionName } = req.body;
  
      console.log(`Toggle favorite request - ID: ${id}, Collection: ${collectionName}`);
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('Invalid document ID');
        return res.status(400).json({ message: 'Invalid document ID' });
      }
  
      if (!collectionName || !['cth', 'recent', 'favorite'].includes(collectionName)) {
        console.log('Invalid collection name');
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
  
      console.log(`Looking for document in ${collectionName} collection`);
      const document = await Collection.findById(id);
  
      if (!document) {
        console.log('Document not found');
        return res.status(404).json({ message: 'Document not found' });
      }
  
      console.log(`Current favorite status: ${document.favourite}`);
      document.favourite = !document.favourite;
      await document.save();
      console.log(`Updated favorite status to: ${document.favourite}`);
  
      // Handle adding to favorites
      if (document.favourite && collectionName !== 'favorite') {
        console.log('Adding document to favorites collection');
        const existingFavorite = await FavoriteModel.findOne({ hs_code: document.hs_code });
  
        if (!existingFavorite) {
          console.log('Creating new favorite document');
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
          console.log('Successfully added to favorites');
        } else {
          console.log('Document already exists in favorites');
        }
      }
  
      // Handle removing from favorites
      if (!document.favourite && collectionName === 'favorite') {
        console.log('Removing document from favorites collection');
        await FavoriteModel.findByIdAndDelete(id);
        console.log('Successfully removed from favorites');
      }
  
      return res.status(200).json({
        message: 'Favorite status updated successfully',
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
    console.error('Get favorites error:', error);
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
    console.error('Get recent searches error:', error);
    return res.status(500).json({
      message: 'Server error while fetching recent searches',
      error: error.message
    });
  }
});

export default router;


router.delete('/api/delete/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    console.log(`Delete request - Collection: ${collection}, ID: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid document ID');
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    if (!['recent', 'favorite'].includes(collection)) {
      console.log('Invalid collection name');
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
    
    const result = await Model.findByIdAndDelete(id);
    
    if (!result) {
      console.log('Document not found');
      return res.status(404).json({ message: 'Document not found' });
    }
    
    console.log(`Successfully deleted document ${id} from ${collection} collection`);
    return res.status(200).json({
      message: `Successfully deleted from ${collection} collection`,
      deletedId: id
    });
  } catch (error) {
    console.error(`Delete error:`, error);
    return res.status(500).json({
      message: 'Server error while deleting item',
      error: error.message
    });
  }
});
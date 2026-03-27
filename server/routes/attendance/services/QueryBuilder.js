/**
 * Enterprise Query Builder for Mongoose
 * Handles Sorting, Filtering, Search, and Pagination in a reusable way.
 */
class QueryBuilder {
    /**
     * Builds and executes a paginated query
     * @param {Object} model - Mongoose Model
     * @param {Object} queryParams - req.query
     * @param {Object} baseFilters - e.g. { company_id: '...' }
     * @param {Array} searchableFields - Fields to perform text search on
     * @param {Array} populateOptions - Models to populate
     */
    static async build(model, queryParams, baseFilters = {}, searchableFields = [], populateOptions = []) {
        let {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            order = 'desc',
            search = '',
            ...filters
        } = queryParams;

        // Ensure defaults if empty strings are passed
        if (!sortBy) sortBy = 'createdAt';
        if (!order) order = 'desc';

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // 1. Build Base Filters
        const mongoQuery = { ...baseFilters };

        // 2. Add Search logic (OR across multiple fields)
        if (search && searchableFields.length > 0) {
            mongoQuery.$or = searchableFields.map(field => ({
                [field]: { $regex: search, $options: 'i' }
            }));
        }

        // 3. Add Dynamic Filters (Exact matches)
        Object.keys(filters).forEach(key => {
            // Handle special range filters if needed (e.g. salary_min, salary_max)
            if (key.endsWith('_min')) {
                const actualKey = key.replace('_min', '');
                mongoQuery[actualKey] = { ...mongoQuery[actualKey], $gte: filters[key] };
            } else if (key.endsWith('_max')) {
                const actualKey = key.replace('_max', '');
                mongoQuery[actualKey] = { ...mongoQuery[actualKey], $lte: filters[key] };
            } else if (filters[key] !== '' && filters[key] !== undefined && filters[key] !== 'all') {
                mongoQuery[key] = filters[key];
            }
        });

        // 4. Handle Sorting
        const sortOption = { [sortBy]: order === 'desc' ? -1 : 1 };

        // 5. Execute Query
        let queryExec = model.find(mongoQuery).sort(sortOption).skip(skip).limit(limit);

        // 6. Add Populations
        populateOptions.forEach(opt => {
            queryExec = queryExec.populate(opt);
        });

        const data = await queryExec;
        const total = await model.countDocuments(mongoQuery);

        return {
            success: true,
            data,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            },
            filters: mongoQuery // Return applied filters for audit/UI
        };
    }
}

module.exports = QueryBuilder;

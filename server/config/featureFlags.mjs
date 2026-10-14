// Centralized feature flags — evaluated dynamically from environment variables

export const FEATURE_FLAGS = {
    MRM_KPI_ROLLUP_ENABLED: 'MRM_KPI_ROLLUP_ENABLED',
    SALES_TACTICS_ENABLED: 'SALES_TACTICS_ENABLED',
};

export const isFeatureEnabled = (flagName) => {
    if (flagName === FEATURE_FLAGS.MRM_KPI_ROLLUP_ENABLED || flagName === 'MRM_KPI_ROLLUP_ENABLED') {
        return process.env.MRM_KPI_ROLLUP_ENABLED === 'true';
    }
    if (flagName === FEATURE_FLAGS.SALES_TACTICS_ENABLED || flagName === 'SALES_TACTICS_ENABLED') {
        // Defaults to true in development, or process.env.SALES_TACTICS_ENABLED !== 'false'
        return process.env.SALES_TACTICS_ENABLED !== 'false';
    }
    return false;
};

export const getFeatureFlags = () => ({
    MRM_KPI_ROLLUP_ENABLED: process.env.MRM_KPI_ROLLUP_ENABLED === 'true',
    SALES_TACTICS_ENABLED: process.env.SALES_TACTICS_ENABLED !== 'false',
});

export default {
    FEATURE_FLAGS,
    isFeatureEnabled,
    getFeatureFlags,
};


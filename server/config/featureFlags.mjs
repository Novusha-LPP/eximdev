// Centralized feature flags — evaluated dynamically from environment variables

export const FEATURE_FLAGS = {
    MRM_KPI_ROLLUP_ENABLED: 'MRM_KPI_ROLLUP_ENABLED',
};

export const isFeatureEnabled = (flagName) => {
    if (flagName === FEATURE_FLAGS.MRM_KPI_ROLLUP_ENABLED || flagName === 'MRM_KPI_ROLLUP_ENABLED') {
        return process.env.MRM_KPI_ROLLUP_ENABLED === 'true';
    }
    return false;
};

export const getFeatureFlags = () => ({
    MRM_KPI_ROLLUP_ENABLED: process.env.MRM_KPI_ROLLUP_ENABLED === 'true',
});

export default {
    FEATURE_FLAGS,
    isFeatureEnabled,
    getFeatureFlags,
};

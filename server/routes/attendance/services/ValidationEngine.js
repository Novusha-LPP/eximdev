/**
 * ValidationEngine handles punch validations based on company security settings.
 */
class ValidationEngine {
    /**
     * Validates a punch attempt.
     * @param {Object} user 
     * @param {Object} company 
     * @param {Object} punchData 
     * @returns {Object} { isValid: boolean, message: string }
     */
    /**
     * Validates a punch attempt.
     * @param {Object} user 
     * @param {Object} company 
     * @param {Object} punchData 
     * @returns {Object} { isValid: boolean, message: string }
     */
    static validatePunch(user, company, punchData) {
        // 0. Extract and sanitize punch data
        const { location, ip } = punchData;
        const deviceType = (punchData.deviceType || 'web').toLowerCase();
        
        const companySettings = company.settings || {};
        const userSettings = user.attendance_settings || {};

        // 1. Check User Block
        if (userSettings.punch_allowed === false) {
            return { isValid: false, message: 'You have been blocked from marking attendance.' };
        }

        // 2. Check Punch Method / Device
        // User settings take precedence if defined
        if (userSettings.punch_methods && userSettings.punch_methods.length > 0) {
            if (!userSettings.punch_methods.includes(deviceType)) {
                return { isValid: false, message: `Access denied: Punching is not permitted via ${deviceType} for your account.` };
            }
        }
        // Fallback to Company settings
        else {
            if (deviceType === 'mobile' && !companySettings.allow_mobile_punch) {
                return { isValid: false, message: 'Mobile punch is disabled for your company.' };
            }
            if (deviceType === 'web' && !companySettings.allow_web_punch) {
                return { isValid: false, message: 'Web punch is disabled for your company.' };
            }
        }

        // 2. Check IP Restriction (Company Level usually)
        if (companySettings.ip_restriction_enabled) {
            const allowedIPs = companySettings.allowed_ips || [];
            if (!allowedIPs.includes(ip)) {
                return { isValid: false, message: 'Punch not allowed from this IP address.' };
            }
        }

        // 3. Check Geo-Fencing
        const isGeoFencingRequired = userSettings.geo_fencing_required !== undefined ? userSettings.geo_fencing_required : companySettings.geo_fencing_enabled;

        if (isGeoFencingRequired) {
            if (!location || !location.latitude || !location.longitude) {
                return { isValid: false, message: 'Location access is required for geo-fenced attendance.' };
            }

            // Check User Allowed Locations
            if (userSettings.allowed_locations && userSettings.allowed_locations.length > 0) {
                let withinRange = false;
                for (const loc of userSettings.allowed_locations) {
                    const dist = this.calculateDistance(location.latitude, location.longitude, loc.latitude, loc.longitude);
                    if (dist <= loc.radius_meters) {
                        withinRange = true;
                        break;
                    }
                }
                if (!withinRange) return { isValid: false, message: 'You are outside the allowed location radius.' };
            }
            // Fallback to Company Allowed Locations? (Usually company has sites/branches, but if not defined, skip)
        }

        return { isValid: true, message: 'Success' };
    }

    static calculateDistance(lat1, lon1, lat2, lon2) {
        if ((lat1 == lat2) && (lon1 == lon2)) {
            return 0;
        }
        else {
            var radlat1 = Math.PI * lat1 / 180;
            var radlat2 = Math.PI * lat2 / 180;
            var theta = lon1 - lon2;
            var radtheta = Math.PI * theta / 180;
            var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
            if (dist > 1) {
                dist = 1;
            }
            dist = Math.acos(dist);
            dist = dist * 180 / Math.PI;
            dist = dist * 60 * 1.1515;
            dist = dist * 1.609344 * 1000; // Meters
            return dist;
        }
    }
}

module.exports = ValidationEngine;

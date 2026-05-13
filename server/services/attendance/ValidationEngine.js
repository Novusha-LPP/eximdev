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

        console.log(`[DEBUG] Validation for ${user.username}: isGeoFencingRequired=${isGeoFencingRequired}`);
        console.log(`[DEBUG] User Geo Required: ${userSettings.geo_fencing_required}, Company Geo Enabled: ${companySettings.geo_fencing_enabled}`);

        if (isGeoFencingRequired) {
            const latitude = Number(location?.latitude);
            const longitude = Number(location?.longitude);

            if (!location || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                return { isValid: false, message: 'Location access is required for geo-fenced attendance.' };
            }

            let withinRange = false;
            let withinWarningZone = false;
            let checksPerformed = false;
            let debugInfo = [];

            // GPS Accuracy handling: use reported accuracy, fallback to 100m if missing/zero
            // Production mobile GPS: 5-20m outdoor, 50-300m indoors
            // Laptop/WiFi: 200-3000m
            const rawAccuracy = Number(location?.accuracy_meters ?? location?.accuracy ?? 0);
            const gpsAccuracyMeters = rawAccuracy > 0 ? rawAccuracy : 100;
            debugInfo.push(`GPS Accuracy: ${gpsAccuracyMeters}m (raw: ${rawAccuracy}m)`);

            // 3.1 Check User-Specific Allowed Locations (Overrides)
            if (userSettings.allowed_locations && userSettings.allowed_locations.length > 0) {
                checksPerformed = true;
                for (const loc of userSettings.allowed_locations) {
                    const locLat = Number(loc.latitude);
                    const locLon = Number(loc.longitude);
                    const baseRadius = Number(loc.radius_meters) || 200;
                    
                    if (!Number.isFinite(locLat) || !Number.isFinite(locLon)) continue;

                    const dist = this.calculateDistance(latitude, longitude, locLat, locLon);
                    const accuracyBuffer = Math.min(gpsAccuracyMeters, 150);
                    const effectiveRadius = baseRadius + accuracyBuffer;
                    const warningThreshold = baseRadius + 250; // Soft warning: 250m beyond nominal radius

                    debugInfo.push(`User Location: "${loc.name}" | Distance: ${dist.toFixed(0)}m | Base Radius: ${baseRadius}m | Accuracy Buffer: ${accuracyBuffer}m | Effective: ${effectiveRadius.toFixed(0)}m`);

                    if (dist <= effectiveRadius) {
                        withinRange = true;
                        debugInfo.push(`✅ MATCH: Within effective radius`);
                        break;
                    } else if (dist <= warningThreshold) {
                        withinWarningZone = true;
                        debugInfo.push(`⚠️ WARNING ZONE: Slightly outside (${(dist - effectiveRadius).toFixed(0)}m over), will allow with warning`);
                    }
                }
            }

            // 3.2 Fallback to Company Allowed Locations if user has no specific ones OR if not yet found
            if (!withinRange && companySettings.allowed_locations && companySettings.allowed_locations.length > 0) {
                checksPerformed = true;
                for (const loc of companySettings.allowed_locations) {
                    const locLat = Number(loc.latitude);
                    const locLon = Number(loc.longitude);
                    const baseRadius = Number(loc.radius_meters) || 200;
                    
                    if (!Number.isFinite(locLat) || !Number.isFinite(locLon)) continue;

                    const dist = this.calculateDistance(latitude, longitude, locLat, locLon);
                    const accuracyBuffer = Math.min(gpsAccuracyMeters, 150);
                    const effectiveRadius = baseRadius + accuracyBuffer;
                    const warningThreshold = baseRadius + 250;

                    debugInfo.push(`Company Location: "${loc.name}" | Distance: ${dist.toFixed(0)}m | Base Radius: ${baseRadius}m | Accuracy Buffer: ${accuracyBuffer}m | Effective: ${effectiveRadius.toFixed(0)}m`);

                    if (dist <= effectiveRadius) {
                        withinRange = true;
                        debugInfo.push(`✅ MATCH: Within effective radius`);
                        break;
                    } else if (dist <= warningThreshold) {
                        withinWarningZone = true;
                        debugInfo.push(`⚠️ WARNING ZONE: Slightly outside (${(dist - effectiveRadius).toFixed(0)}m over), will allow with warning`);
                    }
                }
            }

            // Final decision
            console.log(`[GEOFENCE DEBUG] User: ${user.username} | Lat: ${latitude}, Lon: ${longitude}`);
            debugInfo.forEach(info => console.log(`  ${info}`));

            if (checksPerformed && !withinRange) {
                if (withinWarningZone) {
                    console.log(`[GEOFENCE WARNING] User in warning zone, allowing punch with warning`);
                    return { 
                        isValid: true, 
                        message: 'Success',
                        warning: {
                            type: 'location_warning',
                            message: 'Your location is slightly outside the configured office radius. Punch recorded but flagged for review.'
                        }
                    };
                }
                console.log(`[GEOFENCE REJECTION] User outside all allowed locations`);
                return { isValid: false, message: 'You are outside the allowed location radius for this company.' };
            }

            if (checksPerformed && withinRange) {
                console.log(`[GEOFENCE SUCCESS] User within radius`);
            }
        }

        return { isValid: true, message: 'Success' };
    }

    static calculateDistance(lat1, lon1, lat2, lon2) {
        if ([lat1, lon1, lat2, lon2].some(value => !Number.isFinite(Number(value)))) {
            return Number.POSITIVE_INFINITY;
        }

        if ((lat1 == lat2) && (lon1 == lon2)) {
            return 0;
        }

        const toRadians = (value) => (Number(value) * Math.PI) / 180;
        const earthRadiusMeters = 6371000;
        const deltaLat = toRadians(lat2 - lat1);
        const deltaLon = toRadians(lon2 - lon1);
        const startLat = toRadians(lat1);
        const endLat = toRadians(lat2);

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
            + Math.cos(startLat) * Math.cos(endLat)
            * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return earthRadiusMeters * c;
    }
}

export default ValidationEngine;

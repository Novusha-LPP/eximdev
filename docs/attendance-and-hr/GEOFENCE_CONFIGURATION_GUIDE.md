# Geofence Configuration Guide

## Overview

This document explains how to properly configure geofencing for attendance systems, based on production testing and real-world GPS accuracy patterns.

---

## Key Insight: GPS Accuracy Varies Widely

| Environment | GPS Accuracy | Notes |
|---|---|---|
| **Open outdoor area** | 5–20m | Best case; clear sky, mobile |
| **Office building entrance** | 30–50m | Rooftop/window line-of-sight |
| **Office interior** | 50–300m | Depends on building size, windows |
| **Dense urban area** | 100–200m | Urban canyon effect |
| **Indoors (no windows)** | 200–1000m | Very coarse |
| **Laptop/Desktop WiFi** | 200–3000m | Terrible accuracy |
| **Approximate location (Android)** | 500m–3km | User denied precise permission |

---

## Recommended Radius Configuration

DO NOT use small radii like 25m, 50m, or 75m in production. They will cause false rejections.

### By Office Type

| Office Type | Base Radius | Why | Example |
|---|---|---|---|
| **Small office (single floor)** | 150–200m | Accounts for GPS drift indoors | Boutique firm, startup |
| **Corporate tower** | 250–400m | Multi-floor, larger building footprint | Bank, insurance, tech campus |
| **Warehouse/Factory** | 500m | Large single-floor facility | Manufacturing, logistics |
| **Multi-site campus** | 500m–1km | Wide parking lot, multiple buildings | University, hospital, factory park |
| **Field staff (outside)** | 1000m+ | Mobile workers, client sites | Sales, delivery, field service |

### By Location Scenario

| Scenario | Recommended Radius |
|---|---|
| Small office in residential building | 200m |
| Office in commercial building (1-5 floors) | 250m |
| Office in skyscraper (20+ floors) | 300m |
| Corporate campus with grounds | 400m |
| Factory with large floor area | 500m |
| Field staff (outdoor) | 1000m |
| Hybrid/remote staff (one office location) | 300m |

---

## System Behavior After Recent Fix

The geofence validation now works as follows:

### Distance Check
```
Employee GPS: 19.0765, 72.8780
Office GPS:   19.0760, 72.8777
Calculated Distance: 58 meters
GPS Accuracy: 50 meters (reported by device)
```

### Effective Radius Calculation
```
Base Radius (config):     200 meters
Accuracy Buffer:          min(50, 150) = 50 meters
Effective Radius:         200 + 50 = 250 meters

Result: 58m ≤ 250m ✅ PUNCH ACCEPTED
```

### Three Zones

1. **Accept Zone** (distance ≤ effective radius)
   - Punch immediately accepted
   - Example: ≤ 250m (base 200m + accuracy buffer 50m)

2. **Warning Zone** (distance > effective radius but ≤ base radius + 250m)
   - Punch accepted BUT with warning
   - Example: 250m–450m (base 200m + 250m threshold)
   - User sees: "Your location is slightly outside the configured office radius. Punch recorded but flagged for review."
   - Helps with edge cases (parking lot, nearby café)

3. **Reject Zone** (distance > warning threshold)
   - Punch rejected
   - Example: > 450m (base 200m + 250m threshold)
   - User sees: "You are outside the allowed location radius for this company."

---

## Data Being Sent to Server (After Fix)

Frontend now sends complete GPS telemetry:

```javascript
{
  latitude: 19.0765,           // Actual position
  longitude: 72.8780,          // Actual position
  accuracy: 50,                // ✅ NOW SENT (meters)
  altitude: 250.5,             // Elevation (optional)
  heading: 45,                 // Compass direction (optional)
  speed: 5.2,                  // Movement speed (optional)
  timestamp: 1715587920000     // When GPS was captured
}
```

**Key Fix**: `accuracy` is now sent, allowing backend to apply proper tolerance buffer.

---

## Configuration Checklist

### ✅ Before Going to Production

- [ ] **Set HTTPS on all production servers** (browser requires HTTPS for high-accuracy GPS)
- [ ] **Use realistic radius** (150m–500m depending on office size)
- [ ] **Verify office coordinates** (use Google Maps, test with multiple devices)
- [ ] **Test with mobile phone** (not laptop—browsers have terrible GPS accuracy)
- [ ] **Test from different locations** within and beyond the radius
- [ ] **Test indoors** (where GPS is worst; expected 100m+ error)
- [ ] **Check server logs** for [GEOFENCE DEBUG] messages to verify accuracy data is flowing through
- [ ] **Inform users** they need to enable "Precise Location" permission on phone (not "Approximate Location")

### ❌ Common Mistakes

| Mistake | Problem | Fix |
|---|---|---|
| Radius = 25m | Indoor GPS accuracy is ±50m; false rejections | Use ≥150m |
| Radius = 50m | Still too strict | Use ≥150m |
| Using HTTP | Browser denies high-accuracy GPS; falls back to IP | Use HTTPS |
| Coordinates: 19.07, 72.87 | Too coarse; error of ±1km | Use 19.0760, 72.8777 |
| No GPS data in logs | Frontend might not be sending accuracy | Check browser console for errors |
| All users rejected | Either radius too small OR coordinates wrong | Check server logs: [GEOFENCE DEBUG] |

---

## Debugging Production Issues

### Issue: "All users rejected with 'outside radius'"

**Steps to diagnose:**

1. **Check server logs** for [GEOFENCE DEBUG] messages:
   ```
   [GEOFENCE DEBUG] User: john.smith | Lat: 19.0765, Lon: 72.8780
     GPS Accuracy: 150m (raw: 150m)
     Company Location: "HQ Office" | Distance: 400m | Base Radius: 200m | 
     Accuracy Buffer: 150m | Effective: 350m
     ⚠️ WARNING ZONE: Slightly outside (50m over), will allow with warning
   ```

2. **Check distance vs radius**:
   - Distance > Effective Radius? → **Radius too small**
   - GPS Accuracy > 150m? → **User is indoors or on WiFi**
   - Distance matches office location? → **Coordinates might be wrong**

3. **Check office coordinates**:
   - Open Google Maps
   - Search for your office address
   - Copy exact coordinates (to 4 decimals: 19.0760, 72.8777)
   - Compare with database values

4. **Check user permissions**:
   - Android: Settings → Apps → App permissions → Location → "Precise location" enabled?
   - iPhone: Settings → Privacy → Location Services → App → "Always" or "While Using"?

### Issue: "Users in parking lot getting warning"

- This is expected with 200m radius in tight parking lots
- Solution: Increase radius to 250–300m, or accept warning zone behavior

### Issue: "Desktop users always rejected"

- Desktop/Laptop WiFi GPS accuracy is 200–3000m
- Solution: Exclude desktops from geofence requirement, allow only mobile
- OR: Significantly increase radius (not recommended)

---

## Advanced Configuration: Per-Segment Radius

If you have different office types, use **User-Specific Locations**:

```javascript
// Admin Panel: Assign per-employee location

// Sales team (field staff):
Location: "Sales Territory"
Lat: 19.0760, Lon: 72.8777
Radius: 1000m  // Wide for clients

// HQ admin (office only):
Location: "HQ Office"
Lat: 19.0760, Lon: 72.8777
Radius: 200m   // Strict

// Warehouse staff:
Location: "Warehouse"
Lat: 19.1234, Lon: 72.9876
Radius: 500m   // Factory-size
```

**Priority**: User-specific location > Company default location

---

## Best Practices

1. **Set minimum 150m radius** — Account for GPS drift
2. **Use HTTPS everywhere** — Required for browser high-accuracy GPS
3. **Test mobile first** — Desktop GPS is unusable
4. **Verify coordinates to 4 decimals** — 0.001° = ~111 meters
5. **Enable warning zone** — Reduces false rejections while flagging edge cases
6. **Monitor logs** — Check [GEOFENCE DEBUG] logs weekly to spot issues
7. **User education** — Ensure users know to enable "Precise Location" permission
8. **Account for indoors** — GPS is 50–300m worse indoors; use larger radius
9. **Test from edges** — Punch from parking lot, ground floor, roof to validate
10. **Document overrides** — If you set custom per-user locations, keep audit trail

---

## Monitoring & Alerts

### Key Metrics to Watch

- **Warning zone hits**: Should be < 5% of punches
- **Rejection rate**: Should be < 1% (if > 1%, radius likely too small)
- **GPS accuracy average**: Should be 20–100m for mobile, 200m–1km for WiFi
- **Indoor vs outdoor**: Track where rejections occur

### Example Query (MongoDB)

```javascript
// Check average distance from office for punches in past 7 days
db.attendancepunch.aggregate([
  { $match: { punch_time: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
  { $group: { 
    _id: "$company_id", 
    avg_distance: { $avg: "$location_distance_meters" },
    rejection_count: { $sum: { $cond: ["$rejected", 1, 0] } },
    total_punches: { $sum: 1 }
  }}
])
```

---

## Troubleshooting Flowchart

```
User reports: "I can't punch in!"

├─ Check server logs for [GEOFENCE REJECTION]
│  ├─ Distance is 50m, radius is 25m
│  │  └─→ Increase radius to ≥150m
│  ├─ Distance is 500m, radius is 200m, accuracy is 150m
│  │  └─→ This is expected; increase radius to 350m or accept warning zone
│  └─ Distance is 1000m, radius is 200m, accuracy is 5m
│     └─→ Office coordinates wrong (off by ~1km); re-check address
│
├─ Check if user is indoors
│  ├─ Yes: GPS accuracy will be 50–300m; increase radius or accept warning
│  └─ No: Should work with 200m radius
│
├─ Check device permissions
│  ├─ Denied precise location: Explain to user, they'll need to enable
│  └─ Approximate location only: User will be unable to punch (too inaccurate)
│
└─ Check HTTPS
   ├─ HTTP: Browser may not request high-accuracy GPS; fix SSL certificate
   └─ HTTPS: Good, should have accurate GPS
```

---

## Version History

- **2026-05-13**: Initial version. Added GPS accuracy buffer, soft warning zone, detailed logging.

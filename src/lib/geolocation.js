/**
 * Calculate the distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in miles
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees 
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is within a given radius of another point
 * @param {number} centerLat - Center point latitude
 * @param {number} centerLon - Center point longitude
 * @param {number} pointLat - Point to check latitude
 * @param {number} pointLon - Point to check longitude
 * @param {number} radiusMiles - Radius in miles
 * @returns {boolean} True if point is within radius
 */
export function isWithinRadius(centerLat, centerLon, pointLat, pointLon, radiusMiles = 5) {
  const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
  return distance <= radiusMiles;
}

/**
 * Get user's current location using browser geolocation API
 * @returns {Promise<{lat: number, lng: number}>} User's coordinates
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000 // 10 minutes
      }
    );
  });
}

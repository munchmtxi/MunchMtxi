const { logger } = require('@utils/logger');
const path = require('path');

class UserActivityLogger {
  constructor() {
    this.activityBuffer = new Map(); // For temporary storage of user sessions
    this.heatmapData = new Map();    // For storing interaction frequency
  }

  logUserActivity(userId, event, metadata = {}) {
    const timestamp = new Date();
    const activityLog = {
      userId,
      event,
      timestamp,
      ...metadata,
      type: 'user-activity'
    };

    // Log to file
    logger.info(activityLog);

    // Update heatmap data
    if (metadata.path) {
      const pathKey = metadata.path;
      const hourKey = timestamp.getHours();
      
      if (!this.heatmapData.has(pathKey)) {
        this.heatmapData.set(pathKey, new Array(24).fill(0));
      }
      
      const pathData = this.heatmapData.get(pathKey);
      pathData[hourKey]++;
    }

    // Buffer user session data
    const sessionKey = `${userId}-${timestamp.toDateString()}`;
    if (!this.activityBuffer.has(sessionKey)) {
      this.activityBuffer.set(sessionKey, []);
    }
    this.activityBuffer.get(sessionKey).push(activityLog);

    // Check for anomalies
    this.detectAnomalies(userId, event, metadata);
  }

  detectAnomalies(userId, event, metadata) {
    const sessionKey = `${userId}-${new Date().toDateString()}`;
    const userSession = this.activityBuffer.get(sessionKey) || [];
    
    // Example anomaly detection rules
    const recentActivities = userSession.slice(-10);
    
    // Detect rapid succession of events
    if (recentActivities.length >= 5) {
      const timespan = recentActivities[recentActivities.length - 1].timestamp - recentActivities[0].timestamp;
      if (timespan < 1000) { // Less than 1 second between 5 actions
        logger.warn({
          message: 'Rapid activity detected',
          userId,
          eventCount: recentActivities.length,
          timespan,
          type: 'security-alert'
        });
      }
    }
    
    // Detect unusual location changes
    if (metadata.location) {
      const previousLocations = recentActivities
        .filter(activity => activity.metadata?.location)
        .map(activity => activity.metadata.location);
      
      if (previousLocations.length > 0) {
        const lastLocation = previousLocations[previousLocations.length - 1];
        // Simple distance check (you'd want a more sophisticated check in production)
        const locationChange = this.calculateLocationChange(lastLocation, metadata.location);
        if (locationChange > 100) { // More than 100km difference
          logger.warn({
            message: 'Unusual location change detected',
            userId,
            previousLocation: lastLocation,
            currentLocation: metadata.location,
            type: 'security-alert'
          });
        }
      }
    }
  }

  calculateLocationChange(loc1, loc2) {
    // Haversine formula implementation would go here
    // For now, returning a placeholder
    return Math.abs(loc1.lat - loc2.lat) * 111; // Rough km calculation
  }

  getHeatmapData(path, timeRange = { start: new Date(Date.now() - 86400000), end: new Date() }) {
    const pathData = this.heatmapData.get(path) || new Array(24).fill(0);
    return {
      path,
      hourlyDistribution: pathData,
      totalHits: pathData.reduce((a, b) => a + b, 0)
    };
  }

  exportActivityLogs(userId, startDate, endDate) {
    // Implementation for exporting logs to CSV/JSON
    // You can use your existing logger to fetch and format the data
    return {
      userId,
      activities: Array.from(this.activityBuffer.entries())
        .filter(([key, _]) => key.startsWith(userId))
        .map(([_, activities]) => activities)
        .flat()
        .filter(activity => 
          activity.timestamp >= startDate && 
          activity.timestamp <= endDate
        )
    };
  }

  async generateHeatmapData(options = {}) {
    const {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      endDate = new Date(),
      resolution = '1h', // '1h', '30m', '15m'
      paths = [] // Empty array means all paths
    } = options;

    try {
      // Initialize data structure
      const heatmapData = {
        timeSlots: [],
        pathData: {},
        metadata: {
          startDate,
          endDate,
          resolution,
          totalActivities: 0
        }
      };

      // Calculate time slots based on resolution
      const resolutionMinutes = resolution === '1h' ? 60 : 
                               resolution === '30m' ? 30 : 15;
      const totalSlots = Math.ceil((endDate - startDate) / (resolutionMinutes * 60 * 1000));

      // Initialize time slots
      for (let i = 0; i < totalSlots; i++) {
        const slotTime = new Date(startDate.getTime() + i * resolutionMinutes * 60 * 1000);
        heatmapData.timeSlots.push(slotTime);
      }

      // Filter and aggregate activity data
      // NOTE: Assumes that this.heatmapData is a Map or similar iterable data structure
      // containing hourly activity counts per path.
      for (const [pathKey, hourlyData] of this.heatmapData.entries()) {
        if (paths.length === 0 || paths.includes(pathKey)) {
          heatmapData.pathData[pathKey] = new Array(totalSlots).fill(0);
          
          // Aggregate data into appropriate time slots
          hourlyData.forEach((count, hour) => {
            const slotIndex = Math.floor((hour * 60) / resolutionMinutes);
            if (slotIndex < totalSlots) {
              heatmapData.pathData[pathKey][slotIndex] += count;
              heatmapData.metadata.totalActivities += count;
            }
          });
        }
      }

      // Calculate hotspots and patterns
      heatmapData.analysis = this.analyzeHeatmapPatterns(heatmapData);

      return heatmapData;
    } catch (error) {
      logger.error('Error generating heatmap data', { error, options });
      throw error;
    }
  }

  analyzeHeatmapPatterns(heatmapData) {
    const analysis = {
      hotspots: [],
      patterns: [],
      recommendations: []
    };

    // Identify activity hotspots
    Object.entries(heatmapData.pathData).forEach(([path, counts]) => {
      const maxCount = Math.max(...counts);
      const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
      
      if (maxCount > avgCount * 2) { // Significant spike
        const hotspotIndex = counts.indexOf(maxCount);
        analysis.hotspots.push({
          path,
          time: heatmapData.timeSlots[hotspotIndex],
          count: maxCount,
          intensity: maxCount / avgCount
        });
      }
    });

    // Detect recurring patterns
    Object.entries(heatmapData.pathData).forEach(([path, counts]) => {
      const pattern = this.detectRecurringPattern(counts);
      if (pattern) {
        analysis.patterns.push({
          path,
          pattern,
          confidence: pattern.confidence
        });
      }
    });

    // Generate recommendations
    analysis.recommendations = this.generateHeatmapRecommendations(analysis);

    return analysis;
  }

  detectRecurringPattern(counts) {
    // Simple pattern detection - looks for regular peaks
    const peaks = [];
    for (let i = 1; i < counts.length - 1; i++) {
      if (counts[i] > counts[i - 1] && counts[i] > counts[i + 1]) {
        peaks.push(i);
      }
    }

    if (peaks.length < 2) return null;

    // Calculate intervals between peaks
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }

    // Check if intervals are regular
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const isRegular = intervals.every(interval => 
      Math.abs(interval - avgInterval) <= 1
    );

    if (isRegular) {
      return {
        type: 'periodic',
        interval: avgInterval,
        confidence: peaks.length / counts.length // Simple confidence metric
      };
    }

    return null;
  }

  generateHeatmapRecommendations(analysis) {
    const recommendations = [];

    // Resource allocation recommendations
    analysis.hotspots.forEach(hotspot => {
      if (hotspot.intensity > 3) {
        recommendations.push({
          type: 'resource_allocation',
          priority: 'high',
          description: `Consider optimizing resources for ${hotspot.path} during ${hotspot.time.toLocaleTimeString()}`,
          impact: 'performance'
        });
      }
    });

    // Pattern-based recommendations
    analysis.patterns.forEach(pattern => {
      if (pattern.confidence > 0.7) {
        recommendations.push({
          type: 'scheduling',
          priority: 'medium',
          description: `Regular activity pattern detected for ${pattern.path}. Consider scheduling maintenance outside these times.`,
          impact: 'availability'
        });
      }
    });

    return recommendations;
  }
}

module.exports = new UserActivityLogger();
}

module.exports = new UserActivityLogger();
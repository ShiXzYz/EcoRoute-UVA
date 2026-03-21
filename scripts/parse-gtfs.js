#!/usr/bin/env node
/**
 * GTFS Parser Script
 * Parse UVA, CAT, and JAUNT GTFS feeds into JSON for ultra-fast runtime lookup
 * Run once before development/deployment: npm run parse-gtfs
 * 
 * Parses:
 * - stops.txt → Stop locations and names
 * - routes.txt → Route definitions (bus lines)
 * - stop_times.txt → Departure times at each stop
 * - trips.txt → Trip service IDs (for filtering by day)
 * - calendar.txt → Service calendar (which days each service runs)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createReadStream, existsSync, mkdirSync, writeFileSync } = require('fs');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

/**
 * Parse a CSV file into an array of objects
 */
async function parseCSV(filePath) {
  if (!existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return { headers: [], data: [] };
  }

  const lines = [];
  const rl = readline.createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let headers = [];

  for await (const line of rl) {
    if (isHeader) {
      headers = line.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      isHeader = false;
    } else {
      // Handle quoted CSV values
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      lines.push(obj);
    }
  }

  return { headers, data: lines };
}

/**
 * Extract ZIP file and return temporary directory path
 */
async function extractZip(zipPath, tempDir) {
  console.log(`   📂 Extracting ${path.basename(zipPath)}...`);
  
  // Create temp directory
  mkdirSync(tempDir, { recursive: true });
  
  try {
    // Use unzip command (cross-platform with Node.js)
    await exec(`cd "${tempDir}" && unzip -q "${zipPath}"`);
    return tempDir;
  } catch (err) {
    // Fallback: Try with 7-zip or other tools if unzip not available
    console.warn(`   ⚠️  Could not unzip with native unzip. Trying alternative...`);
    try {
      await exec(`cd "${tempDir}" && powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '.'"`);
      return tempDir;
    } catch (err2) {
      throw new Error(`Failed to extract ZIP: ${zipPath} - Ensure 'unzip' or PowerShell is available`);
    }
  }
}

/**
 * Main GTFS parsing function
 */
async function parseGTFS(zipPath, feedName, outputName) {
  console.log(`\n📦 Parsing ${feedName}...`);
  
  const tempDir = path.join(__dirname, `.temp-${outputName}`);
  
  try {
    // Extract ZIP
    await extractZip(zipPath, tempDir);

    // Parse GTFS files
    console.log('   📋 Parsing stops.txt...');
    const stopsResult = await parseCSV(path.join(tempDir, 'stops.txt'));
    const stops = stopsResult.data.map(s => ({
      id: s.stop_id,
      name: s.stop_name,
      lat: parseFloat(s.stop_lat),
      lon: parseFloat(s.stop_lon),
      desc: s.stop_desc || '',
    }));

    console.log('   📋 Parsing routes.txt...');
    const routesResult = await parseCSV(path.join(tempDir, 'routes.txt'));
    const routes = routesResult.data.map(r => ({
      id: r.route_id,
      short_name: r.route_short_name || r.route_id,
      long_name: r.route_long_name || '',
      type: parseInt(r.route_type) || 3,
      color: r.route_color || 'FF6B35',
    }));

    // Build route lookup
    const routeById = {};
    routes.forEach(r => { routeById[r.id] = r; });

    console.log('   📋 Parsing trips.txt...');
    const tripsResult = await parseCSV(path.join(tempDir, 'trips.txt'));
    const tripsByRoute = {};
    tripsResult.data.forEach(t => {
      if (!tripsByRoute[t.route_id]) tripsByRoute[t.route_id] = [];
      tripsByRoute[t.route_id].push({
        id: t.trip_id,
        serviceId: t.service_id,
        routeId: t.route_id,
      });
    });

    console.log('   📋 Parsing calendar.txt...');
    const calendarResult = await parseCSV(path.join(tempDir, 'calendar.txt'));
    const serviceById = {};
    calendarResult.data.forEach(c => {
      serviceById[c.service_id] = {
        monday: c.monday === '1',
        tuesday: c.tuesday === '1',
        wednesday: c.wednesday === '1',
        thursday: c.thursday === '1',
        friday: c.friday === '1',
        saturday: c.saturday === '1',
        sunday: c.sunday === '1',
      };
    });

    console.log('   📋 Parsing stop_times.txt...');
    const stopTimesResult = await parseCSV(path.join(tempDir, 'stop_times.txt'));
    
    // Build departures lookup: stop_id -> day -> [times]
    const departures = {};
    stops.forEach(s => {
      departures[s.id] = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };
    });

    // Process stop times
    stopTimesResult.data.forEach(st => {
      const tripId = st.trip_id;
      const stopId = st.stop_id;
      const arrivalTime = st.arrival_time;

      // Find trip and its service
      const trip = tripsResult.data.find(t => t.trip_id === tripId);
      if (!trip) return;

      const service = serviceById[trip.service_id];
      if (!service) return;

      // Add departure time to each service day
      const timeStr = normalizeTime(arrivalTime);
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
        if (service[day] && departures[stopId]) {
          if (!departures[stopId][day].includes(timeStr)) {
            departures[stopId][day].push(timeStr);
          }
        }
      });
    });

    // Sort departure times for each stop/day
    Object.values(departures).forEach(dayDepartures => {
      Object.values(dayDepartures).forEach(times => {
        times.sort();
      });
    });

    // Build stop_routes lookup
    const stopRoutes = {};
    stops.forEach(s => { stopRoutes[s.id] = []; });
    
    stopTimesResult.data.forEach(st => {
      const trip = tripsResult.data.find(t => t.trip_id === st.trip_id);
      if (trip && !stopRoutes[st.stop_id].includes(trip.route_id)) {
        stopRoutes[st.stop_id].push(trip.route_id);
      }
    });

    // Build final output
    const gtfsData = {
      agency: feedName,
      generatedAt: new Date().toISOString(),
      stops,
      routes,
      departures,
      stop_routes: stopRoutes,
    };

    // Clean up temp directory
    const rimraf = promisify(require('child_process').exec);
    await rimraf(`rmdir /s /q "${tempDir}"`, { shell: true }).catch(() => {});

    console.log(`   ✅ Parsed: ${stops.length} stops, ${routes.length} routes`);
    return gtfsData;
  } catch (error) {
    console.error(`   ❌ Error parsing ${feedName}:`, error.message);
    throw error;
  }
}

/**
 * Normalize GTFS time format (handles post-midnight times like "25:15")
 */
function normalizeTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  if (h >= 24) {
    return `${String(h - 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Main entry point
 */
async function main() {
  console.log('🌱 EcoRoute GTFS Parser');
  console.log('=======================\n');

  try {
    // Ensure output directory exists
    const outputDir = path.join(__dirname, '../data/gtfs-parsed');
    mkdirSync(outputDir, { recursive: true });

    // Define GTFS feeds to parse
    const feeds = [
      {
        zip: path.join(__dirname, '../data/gtfs-raw/University_Transit_Service_GTFS.zip'),
        name: 'UVA Transit Service',
        output: 'uva-gtfs.json',
      },
      {
        zip: path.join(__dirname, '../data/gtfs-raw/Charlottesville_Area_Transit_GTFS.zip'),
        name: 'Charlottesville Area Transit (CAT)',
        output: 'cat-gtfs.json',
      },
      {
        zip: path.join(__dirname, '../data/gtfs-raw/Jaunt_Connect_Charlottesville_GTFS.zip'),
        name: 'JAUNT/CONNECT',
        output: 'jaunt-gtfs.json',
      },
    ];

    // Parse each feed
    const results = [];
    for (const feed of feeds) {
      try {
        if (!existsSync(feed.zip)) {
          console.warn(`⚠️  ZIP not found: ${feed.zip}`);
          continue;
        }

        const data = await parseGTFS(feed.zip, feed.name, feed.output);
        
        // Save to JSON
        const outputPath = path.join(outputDir, feed.output);
        writeFileSync(outputPath, JSON.stringify(data, null, 2));
        
        console.log(`   ✨ Saved to: ${feed.output}`);
        results.push({ name: feed.name, stops: data.stops.length, routes: data.routes.length });
      } catch (err) {
        console.error(`   ❌ Failed to process ${feed.name}:`, err.message);
      }
    }

    // Print summary
    console.log('\n✅ GTFS parsing complete!');
    console.log('=======================');
    results.forEach(r => {
      console.log(`${r.name}`);
      console.log(`  • ${r.stops} stops`);
      console.log(`  • ${r.routes} routes`);
    });
    console.log(`\nAll files saved to: ${outputDir}`);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();

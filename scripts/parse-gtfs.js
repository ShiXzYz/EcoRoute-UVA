#!/usr/bin/env node
/**
 * GTFS Parser Script
 * Parse UVA and CAT GTFS feeds into JSON for ultra-fast runtime lookup
 * Run once before hackathon: node scripts/parse-gtfs.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createReadStream } = require('fs');

async function parseCSV(filePath) {
  const lines = [];
  const rl = readline.createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let headers = [];

  for await (const line of rl) {
    if (isHeader) {
      headers = line.split(',').map(h => h.trim());
      isHeader = false;
    } else {
      const values = line.split(',');
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx]?.trim() || '';
      });
      lines.push(obj);
    }
  }

  return { headers, data: lines };
}

async function parseGTFS(zipPath, name) {
  console.log(`\n📦 Parsing ${name} GTFS...`);
  
  // In production, you'd unzip and parse properly
  // For now, this is a template showing the structure
  
  const gtfsData = {
    name,
    stops: [
      // Parsed from stops.txt
      {
        id: 'stop_example',
        name: 'Example Stop',
        lat: 38.0336,
        lon: -78.5080,
        desc: 'Example description',
      },
    ],
    routes: [
      // Parsed from routes.txt
      {
        id: 'route_example',
        short_name: 'Route 1',
        long_name: 'Route One',
        type: 3, // Bus
        color: 'FF6B35',
      },
    ],
    trips: [
      // Parsed from trips.txt - link routes to stop sequences
      {
        route_id: 'route_example',
        trip_id: 'trip_example',
        stop_sequence: [
          { stop_id: 'stop_1', arrival_time: '08:00:00', departure_time: '08:00:00' },
          { stop_id: 'stop_2', arrival_time: '08:10:00', departure_time: '08:10:00' },
        ],
      },
    ],
  };

  return gtfsData;
}

async function main() {
  console.log('🌱 EcoRoute GTFS Parser');
  console.log('=======================\n');

  try {
    // Parse UVA GTFS
    const uvaData = await parseGTFS(
      './data/uva-gtfs.zip',
      'UVA Transit'
    );

    // Parse CAT GTFS
    const catData = await parseGTFS(
      './data/cat-gtfs.zip',
      'Charlottesville Area Transit'
    );

    // Combine into single lookup structure
    const combined = {
      generatedAt: new Date().toISOString(),
      agencies: [uvaData, catData],
      stopById: {},
      routeById: {},
    };

    // Index for fast lookup
    [uvaData, catData].forEach(agency => {
      agency.stops.forEach(stop => {
        combined.stopById[stop.id] = { ...stop, agency: agency.name };
      });
      agency.routes.forEach(route => {
        combined.routeById[route.id] = { ...route, agency: agency.name };
      });
    });

    // Save to data directory
    const outputPath = path.join(__dirname, '../data/gtfs-combined.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(combined, null, 2));

    console.log('✅ GTFS parsing complete!');
    console.log(`   UVA: ${uvaData.stops.length} stops, ${uvaData.routes.length} routes`);
    console.log(`   CAT: ${catData.stops.length} stops, ${catData.routes.length} routes`);
    console.log(`   Written to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Parsing error:', error.message);
    process.exit(1);
  }
}

main();

const fs = require('fs');
const turf = require('@turf/turf');

// SEEU Campus crop polygon
const cropPolygon = turf.polygon([
  [
    [20.95853286124489, 41.9842068006642],
    [20.959018553571866, 41.98365979253708],
    [20.960487560460706, 41.98350594518007],
    [20.96584573595831, 41.98588198495304],
    [20.964029015510675, 41.991984069259075],
    [20.964143997816933, 41.99365904890175],
    [20.96060254276793, 41.994342701395055],
    [20.95853286124489, 41.9842068006642]
  ]
]);

// Get input file path from command line
const inputPath = process.argv[2];
if (!inputPath) {
  console.error("❌ Please provide a path to simulation_buildings.geojson");
  process.exit(1);
}

const outputPath = 'SEEUcampus.geojson';

try {
  const rawData = fs.readFileSync(inputPath);
  const buildings = JSON.parse(rawData);

  if (!Array.isArray(buildings.features)) {
    throw new Error("Invalid GeoJSON file");
  }

  const cropped = {
    type: "FeatureCollection",
    features: buildings.features.filter(feature =>
      turf.booleanWithin(feature, cropPolygon)
    )
  };

  fs.writeFileSync(outputPath, JSON.stringify(cropped, null, 2));
  console.log(`✅ Cropped ${cropped.features.length} buildings into ${outputPath}`);
} catch (error) {
  console.error("❌ Error:", error.message);
}

const fs = require("fs");
const path = require("path");

const INPUT_FILE = ("/home/ihaliti03/projects/samirProject/Computer-Graphics/Project/data/SEEUcampus.geojson");
const OUTPUT_DIR = ("/home/ihaliti03/projects/samirProject/Computer-Graphics/Project/data/campus");
const YEAR_FIELD = "year";

const geojson = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

geojson.features.forEach((feature, index) => {
  const year = feature.properties?.[YEAR_FIELD] ?? "unknown";

  const yearDir = path.join(OUTPUT_DIR, String(year));
  fs.mkdirSync(yearDir, { recursive: true });

  const singleBuilding = {
    type: "FeatureCollection",
    features: [feature],
  };

  const filename = `building_${index + 1}.geojson`;
  fs.writeFileSync(
    path.join(yearDir, filename),
    JSON.stringify(singleBuilding, null, 2)
  );
});

console.log(`✔ Split ${geojson.features.length} buildings`);

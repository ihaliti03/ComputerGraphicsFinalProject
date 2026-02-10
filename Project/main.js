import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { configureTextures, createMaterials } from './src/materials.js';

// Import new timeline components
import { IntroBanner } from './src/introBanner.js';
import { BuildingInfoPanel } from './src/buildingInfoPanel.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;   
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// --- Scene Setup ---
const scene = new THREE.Scene();
renderer.setClearColor(0x000000, 0);
const campusGroup = new THREE.Group();
scene.add(campusGroup);
campusGroup.scale.setScalar(1);
campusGroup.rotation.x = -Math.PI / 2;

// --- Camera Setup ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
// Default camera position showing entire campus
camera.position.set(80.85, 339.77, -197.06); // Good overview angle
camera.up.set(0, 1, 0); // World Y is up
camera.lookAt(80.85, 0, -197.06); // Look at campus center

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(80.85, 0, -197.06); // Target campus center
controls.screenSpacePanning = false;
controls.enableRotate = true;
controls.minPolarAngle = 0; // Allow camera to rotate fully above the ground
controls.maxPolarAngle = Math.PI; // Allow camera to rotate below the ground if needed
controls.minAzimuthAngle = -Infinity; // Allow free horizontal rotation
controls.maxAzimuthAngle = Infinity;
controls.update();

// --- Lighting ---
const hemiLight = new THREE.HemisphereLight(0xB1E1FF, 0x3a2f27, 0.3);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfff1cc, 0.8);
dirLight.position.set(300, -120, 240);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 220;
dirLight.shadow.camera.bottom = -220;
dirLight.shadow.camera.left = -220;
dirLight.shadow.camera.right = 220;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.target.position.set(0, 0, 0);
scene.add(dirLight);

const fillLight = new THREE.PointLight(0xffc38b, 0.2, 600);
fillLight.position.set(-180, -220, 140);
scene.add(fillLight);

const exrLoader = new EXRLoader();
const gltfLoader = new GLTFLoader();

// --- HDRI Environment ---
exrLoader.load(
    'textures/autumn_field_4k.exr',
    (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
        console.log('Autumn Field HDRI environment loaded');
    },
    undefined,
    (error) => {
        console.warn('Autumn Field HDRI not found, using solid color background', error);
        scene.background = null;
    }
);

// Raycasting for interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let highlightedBuilding = null;
let buildingMaterialCursor = 0;

// --- Initialize Components ---
const introBanner = new IntroBanner();
const timelineUI = new TimelineUI(
    (year, animate) => handleYearChange(year, animate),
    (isPlaying) => {
        console.log('Timeline playing:', isPlaying);
        buildingAnimator.setPaused(!isPlaying);
    }
);
const buildingAnimator = new BuildingAnimator(scene, camera, controls);
const infoPanel = new BuildingInfoPanel();

// --- Initialize Materials ---
configureTextures();
const { groundMaterial, roadMaterial, walkwayMaterial, buildingMaterials } = createMaterials();

// --- Environment ---
scene.fog = new THREE.Fog(0xADD8E6, 500, 1500); // Light fog - visible only at very far distances

// --- Ground Plane ---
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), groundMaterial);
ground.position.z = -0.1;
ground.receiveShadow = true;
campusGroup.add(ground);

// --- Data Loading Logic ---
function projectCoord([lon, lat]) {
    const scale = 100000;
    return [(lon - 20.96) * scale, (lat - 41.985) * scale];
}

function loadWalkways() {
    fetch('data/walkways.geojson')
        .then(res => res.json())
        .then(data => {
            const mainPolygons = data.features.filter(f => f.properties.fill !== '#ff0000');
            const holeFeatures = data.features.filter(f => f.properties.fill === '#ff0000');
            const allHolePaths = holeFeatures.map(holeFeature => {
                const holePath = new THREE.Path();
                holeFeature.geometry.coordinates[0].forEach((coord, i) => {
                    const [x, y] = projectCoord(coord);
                    i === 0 ? holePath.moveTo(x, y) : holePath.lineTo(x, y);
                });
                return holePath;
            });

            mainPolygons.forEach(mainFeature => {
                const shape = new THREE.Shape();
                mainFeature.geometry.coordinates[0].forEach((coord, i) => {
                    const [x, y] = projectCoord(coord);
                    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
                });
                shape.holes = allHolePaths;
                const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
                const mesh = new THREE.Mesh(geometry, walkwayMaterial);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                campusGroup.add(mesh);
            });
        });
}

function loadGeoJson(url, options) {
    fetch(url)
        .then(res => res.json())
        .then(data => {
            data.features.forEach(feature => {
                const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
                
                polygons.forEach(polygon => {
                    if (!polygon || !polygon[0] || polygon[0].length < 3) return;
                    const shape = new THREE.Shape();
                    polygon[0].forEach((coord, i) => {
                        const [x, y] = projectCoord(coord);
                        i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
                    });

                    let extrudeSettings;
                    let material;

                    if (options.isBuilding && Array.isArray(options.materials) && options.materials.length) {
                        const height = Number(feature.properties?.estimated_height) || 10;
                        extrudeSettings = { depth: height, bevelEnabled: false };

                        const materialDescriptor = options.materials[buildingMaterialCursor % options.materials.length];
                        buildingMaterialCursor += 1;
                        const baseMaterial = materialDescriptor.material;
                        material = baseMaterial.clone();
                        material.name = baseMaterial.name;
                    } else {
                        extrudeSettings = options.extrudeSettings;
                        material = options.material;
                    }

                    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.z = options.y_position || 0;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;

                    campusGroup.add(mesh);
                });
            });
        });
}

function loadSplitBuildings() {
    // Get all building files dynamically
    const buildingFiles = [
        'building_001.geojson', 'building_101.geojson', 'building_101_classes.geojson', 'building_101_under.geojson',
        'building_301.geojson', 'building_302.geojson', 'building_303.geojson', 'building_304.geojson', 'building_315.geojson',
        'building_400.geojson', 'building_803.geojson', 'building_804.geojson', 'building_805.geojson', 'building_806.geojson',
        'building_807.geojson', 'building_808.geojson', 'building_809.geojson', 'building_810.geojson', 'building_811.geojson',
        'building_812.geojson', 'building_813.geojson', 'building_816.geojson', 'building_817.geojson', 'building_818.geojson',
        'building_1001.geojson', 'building_1002.geojson', 'building_dorm1.geojson', 'building_dorm2.geojson', 'building_dorm3.geojson',
        'building_dorm4.geojson', 'building_dorm5.geojson', 'building_dorm6.geojson', 'building_dorm7.geojson', 'building_dorm8.geojson',
        'building_dorm9.geojson', 'building_library.geojson', 'building_library1.geojson', 'building_lh1.geojson', 'building_lh2.geojson',
        'building_cantine.geojson', 'building_cantine_inside.geojson', 'building_conn.geojson', 'building_change_room.geojson',
        'building_pavillion.geojson', 'building_misc.geojson', 'building_book_shop.geojson', 'building_tech_park.geojson',
        'building_solar_1.geojson', 'building_solar_2.geojson', 'building_student_service_1.geojson', 'building_student_service_2.geojson',
        'building_empty.geojson', 'building_idk.geojson'
    ];

    const buildingsPerBatch = 100;
    let loadedCount = 0;
    
    function loadBatch(startIndex) {
        const endIndex = Math.min(startIndex + buildingsPerBatch, buildingFiles.length);
        const promises = [];
        
        for (let i = startIndex; i < endIndex; i++) {
            const fileName = buildingFiles[i];
            const url = `campus/buildings/${fileName}`;
            
            if (!fileName) continue;
            
            const buildingName = fileName.replace(/^building_/, '').replace(/\.geojson$/, '');
            
            promises.push(
                fetch(url)
                    .then(res => res.json())
                    .then(data => {
                        if (data.features && data.features.length > 0) {
                            data.features.forEach(feature => {
                                const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
                                
                                polygons.forEach(polygon => {
                                    if (!polygon || !polygon[0] || polygon[0].length < 3) return;
                                    const shape = new THREE.Shape();
                                    polygon[0].forEach((coord, index) => {
                                        const [x, y] = projectCoord(coord);
                                        index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
                                    });

                                    const height = Number(feature.properties?.estimated_height) || 10;
                                    const extrudeSettings = { depth: height, bevelEnabled: false };

                                    const materialDescriptor = buildingMaterials[buildingMaterialCursor % buildingMaterials.length];
                                    buildingMaterialCursor += 1;
                                    const baseMaterial = materialDescriptor.material;
                                    const material = baseMaterial.clone();
                                    material.name = baseMaterial.name;

                                    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                                    const mesh = new THREE.Mesh(geometry, material);
                                    mesh.position.z = 0;
                                    mesh.castShadow = true;
                                    mesh.receiveShadow = true;

                                    // Store building name in mesh userData
                                    const cleanFileName = fileName.replace(/^building_/, '').replace(/\.geojson$/, '');
                                    mesh.userData.buildingName = cleanFileName;
                                    mesh.userData.fileName = cleanFileName;

                                    // Register with animator
                                    buildingAnimator.registerBuilding(cleanFileName, mesh);

                                    // Add emissive for highlighting
                                    if (mesh.material && mesh.material.emissive) {
                                        mesh.material.emissiveIntensity = 0.2;
                                    }

                                    campusGroup.add(mesh);
                                });
                            });
                        }
                        loadedCount++;
                    })
                    .catch(err => console.warn(`Failed to load ${fileName}:`, err))
            );
        }
        
        Promise.all(promises).then(() => {
            if (loadedCount < buildingFiles.length) {
                setTimeout(() => loadBatch(endIndex), 50);
            } else {
                console.log(`Loaded ${loadedCount} buildings from split files`);
                // After all buildings loaded, start the timeline
                startTimeline();
            }
        });
    }
    
    loadBatch(0);
}

// --- Timeline Control Functions ---
function handleYearChange(year, animate = true) {
    console.log('Year changed to:', year);
    buildingAnimator.showBuildingsUpToYear(year, animate);
}

function startTimeline() {
    // Show initial year (2001) with animation
    buildingAnimator.showBuildingsUpToYear(2001, true);
}

// --- Interaction ---
function handlePointerClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(campusGroup.children, true);

    if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const buildingName = mesh.userData.fileName || mesh.userData.buildingName;
        
        if (buildingName) {
            highlightBuilding(mesh);
            const buildingInfo = buildingAnimator.getBuildingInfo(buildingName);
            infoPanel.update(buildingName);
        }
    } else {
        highlightBuilding(null);
        infoPanel.update(null);
    }
}

function highlightBuilding(mesh) {
    if (highlightedBuilding && highlightedBuilding.material?.emissive) {
        highlightedBuilding.material.emissive.setHex(0x000000);
    }

    if (mesh?.material?.emissive) {
        mesh.material.emissive.setHex(0x1a304c);
        highlightedBuilding = mesh;
    } else {
        highlightedBuilding = null;
    }
}

renderer.domElement.addEventListener('pointerdown', handlePointerClick);

// --- Animation Loop ---
let lastTime = 0;
let frameCount = 0;
function animate(currentTime) {
    requestAnimationFrame(animate);
    
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Update controls
    controls.update();
    
    // Debug: Log camera position every 60 frames (approx 1 second)
    frameCount++;
    if (frameCount % 60 === 0) {
        console.log(`Camera Position: [${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}]`);
        console.log(`Camera Target: [${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)}]`);
    }
    
    // Render
    renderer.render(scene, camera);
}

// --- Window Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Load All Data ---
loadWalkways();
loadGeoJson('data/roads.geojson', { material: roadMaterial, extrudeSettings: { depth: 0.1 }, y_position: 0.01 });
loadSplitBuildings();

// --- Tree Model Loading (keep existing) ---
const LOCAL_TREE_URL = 'models/jacaranda_tree_1k.gltf/jacaranda_tree_1k.gltf';

function placeTree(treeScene) {
    treeScene.traverse(obj => {
        if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
        }
    });
    treeScene.scale.setScalar(3);
    treeScene.position.set(180, 80, 0);
    treeScene.rotation.y = 0;
    campusGroup.add(treeScene);
}

function loadTreeModel(url, onError) {
    gltfLoader.load(
        url,
        (gltf) => {
            placeTree(gltf.scene);
        },
        undefined,
        (error) => {
            if (onError) {
                onError(error);
            } else {
                console.warn('Unable to load GLTF asset.', error);
            }
        }
    );
}

loadTreeModel(LOCAL_TREE_URL, () => {
    console.warn('Local Jacaranda tree GLB not found. Falling back to remote sample.');
});

// --- Start Animation and Intro ---
introBanner.show(() => {
    // Start the animation loop
    animate(0);
    console.log('SEEU Campus Evolution Timeline Started');
});
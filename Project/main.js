import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createMaterials } from './src/materials.js';

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
renderer.setClearColor(0x87CEEB, 1);
const campusGroup = new THREE.Group();
scene.add(campusGroup);
campusGroup.scale.setScalar(1);
campusGroup.rotation.x = -Math.PI / 2;

// --- Camera Setup ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(80.85, 339.77, -197.06);
camera.up.set(0, 1, 0);
camera.lookAt(80.85, 0, -197.06);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(80.85, 0, -197.06);
controls.screenSpacePanning = false;
controls.enableRotate = true;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;
controls.minAzimuthAngle = -Infinity;
controls.maxAzimuthAngle = Infinity;
controls.update();

// --- Lighting ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x4a7c23, 0.6);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(200, 200, 100);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 500;
dirLight.shadow.camera.bottom = -500;
dirLight.shadow.camera.left = -500;
dirLight.shadow.camera.right = 500;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.target.position.set(0, 0, 0);
scene.add(dirLight);

const fillLight = new THREE.PointLight(0xffffee, 0.4, 800);
fillLight.position.set(-150, 150, 100);
scene.add(fillLight);

const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const gltfLoader = new GLTFLoader();

// --- HDRI Environment ---
scene.background = new THREE.Color(0x87CEEB);

// Raycasting for interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let highlightedBuilding = null;
let buildingMaterialCursor = 0;

// --- Initialize Components ---

// --- Initialize Materials ---
const { walkwayMaterial, roadMaterial, buildingMaterials } = createMaterials();

// --- Environment ---

// --- Ground Plane ---
const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x4a7c23 }));
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

const BOUNDS = {
    minLon: 20.95853286124489,
    maxLon: 20.96584573595831,
    minLat: 41.98350594518007,
    maxLat: 41.994342701395055
};

function isInBounds(coords) {
    return coords.every(coord =>
        coord[0] >= BOUNDS.minLon && coord[0] <= BOUNDS.maxLon &&
        coord[1] >= BOUNDS.minLat && coord[1] <= BOUNDS.maxLat
    );
}

function loadGeoJson(url, options) {
    fetch(url)
        .then(res => res.json())
        .then(data => {
            data.features.forEach(feature => {
                if (feature.geometry.type === 'LineString') {
                    const coords = feature.geometry.coordinates;
                    if (!coords || coords.length < 2) return;
                    if (!isInBounds(coords)) return;

                    const points = coords.map(coord => {
                        const [x, y] = projectCoord(coord);
                        return new THREE.Vector3(x, y, options.y_position || 0);
                    });

                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 });
                    const line = new THREE.Line(geometry, lineMaterial);
                    campusGroup.add(line);
                } else if (feature.geometry.type === 'Polygon') {
                    const polygons = [feature.geometry.coordinates];
                    
                    polygons.forEach(polygon => {
                        if (!polygon || !polygon[0] || polygon[0].length < 3) return;
                        if (!isInBounds(polygon[0])) return;
                        const shape = new THREE.Shape();
                        polygon[0].forEach((coord, i) => {
                            const [x, y] = projectCoord(coord);
                            i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
                        });

                        const extrudeSettings = options.extrudeSettings;
                        const material = options.material;

                        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                        const mesh = new THREE.Mesh(geometry, material);
                        mesh.position.z = options.y_position || 0;
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;

                        campusGroup.add(mesh);
                    });
                }
            });
        });
}

function loadSplitBuildings() {
    const buildingFiles = [];
    for (let i = 1; i <= 114; i++) {
        buildingFiles.push(`building_${i}.geojson`);
    }

    const buildingsPerBatch = 100;
    let loadedCount = 0;
    
    function loadBatch(startIndex) {
        const endIndex = Math.min(startIndex + buildingsPerBatch, buildingFiles.length);
        const promises = [];
        
        for (let i = startIndex; i < endIndex; i++) {
            const fileName = buildingFiles[i];
            const url = `data/campus/unknown/${fileName}`;
            
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
            }
        });
    }
    
    loadBatch(0);
}

function startTimeline() {
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
        }
    } else {
        highlightBuilding(null);
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
loadGeoJson('data/osm_roads.geojson', { material: roadMaterial, extrudeSettings: { depth: 0.1 }, y_position: 0.01 });
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
// Start the animation loop
animate(0);
console.log('SEEU Campus Started');

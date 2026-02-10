import * as THREE from 'three';

// Texture Loader
const textureLoader = new THREE.TextureLoader();

// Ground Textures
export const groundTextures = {
    diffuse: textureLoader.load('textures/brown_mud_leaves_01_2k.blend/textures/brown_mud_leaves_01_diff_2k.jpg'),
    normal: textureLoader.load('textures/brown_mud_leaves_01_2k.blend/textures/brown_mud_leaves_01_disp_2k.png'),
    displacement: textureLoader.load('textures/brown_mud_leaves_01_2k.blend/textures/brown_mud_leaves_01_disp_2k.png'),
    roughness: textureLoader.load('textures/brown_mud_leaves_01_2k.blend/textures/brown_mud_leaves_01_disp_2k.png')
};

// Cobblestone Textures
export const cobbleTextures = {
    diffuse: textureLoader.load('textures/Stylized_Stone_Floor_010_basecolor.png'),
    normal: textureLoader.load('textures/Stylized_Stone_Floor_010_normal.png'),
    height: textureLoader.load('textures/Stylized_Stone_Floor_010_height.png'),
    roughness: textureLoader.load('textures/Stylized_Stone_Floor_010_roughness.png'),
    ao: textureLoader.load('textures/Stylized_Stone_Floor_010_ambientOcclusion.png')
};

// Asphalt Textures
export const asphaltTextures = {
    normal: textureLoader.load('textures/asphalt_track_2k.blend/textures/asphalt_track_disp_2k.png'),
    displacement: textureLoader.load('textures/asphalt_track_2k.blend/textures/asphalt_track_disp_2k.png'),
    roughness: textureLoader.load('textures/asphalt_track_2k.blend/textures/asphalt_track_disp_2k.png'),
    diffuse: textureLoader.load('textures/asphalt_track_2k.blend/textures/asphalt_track_diff_2k.jpg')
};

// Walkway Textures
export const walkwayTextures = {
    normal: textureLoader.load('textures/concrete_pavers_2k.blend/textures/concrete_pavers_disp_2k.png'),
    displacement: textureLoader.load('textures/concrete_pavers_2k.blend/textures/concrete_pavers_disp_2k.png'),
    roughness: textureLoader.load('textures/concrete_pavers_2k.blend/textures/concrete_pavers_disp_2k.png'),
    diffuse: textureLoader.load('textures/concrete_pavers_2k.blend/textures/concrete_pavers_diff_2k.jpg')
};

const cacheBust = Date.now(); // Force cache refresh

// Building Facade Textures
export const buildingTextures = {
    normal: textureLoader.load('textures/plastered_wall_05_2k.blend/textures/plastered_wall_05_nor_gl_2k.exr'),
    displacement: textureLoader.load('textures/plastered_wall_05_2k.blend/textures/plastered_wall_05_disp_2k.png'),
    roughness: textureLoader.load('textures/plastered_wall_05_2k.blend/textures/plastered_wall_05_rough_2k.exr'),
    diffuse: textureLoader.load('textures/plastered_wall_05_2k.blend/textures/plastered_wall_05_diff_2k.jpg'),
};

// Glass Facade Textures
export const glassTextures = {
    diffuse: textureLoader.load('textures/Glass_Facade001_2K-JPG/Facade001_2K-JPG_Color.jpg'),
    normal: textureLoader.load('textures/Glass_Facade001_2K-JPG/Facade001_2K-JPG_NormalGL.jpg'),
    roughness: textureLoader.load('textures/Glass_Facade001_2K-JPG/Facade001_2K-JPG_Roughness.jpg'),
    metalness: textureLoader.load('textures/Glass_Facade001_2K-JPG/Facade001_2K-JPG_Metalness.jpg')
};

// Configure texture settings
export function configureTextures() {
    // Ground textures
    Object.values(groundTextures).forEach(tex => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(800, 800);
        tex.anisotropy = 16;
    });

    // Cobblestone textures
    Object.values(cobbleTextures).forEach(tex => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        tex.anisotropy = 16;
    });
    cobbleTextures.diffuse.anisotropy = 16;

    // Asphalt textures
    asphaltTextures.normal.wrapS = THREE.RepeatWrapping;
    asphaltTextures.normal.wrapT = THREE.RepeatWrapping;
    asphaltTextures.normal.repeat.set(2, 2);
    asphaltTextures.normal.anisotropy = 16;

    // Walkway textures
    walkwayTextures.normal.wrapS = THREE.RepeatWrapping;
    walkwayTextures.normal.wrapT = THREE.RepeatWrapping;
    walkwayTextures.normal.repeat.set(2, 2);
    walkwayTextures.normal.anisotropy = 16;

    // Building textures
    buildingTextures.normal.wrapS = THREE.RepeatWrapping;
    buildingTextures.normal.wrapT = THREE.RepeatWrapping;
    buildingTextures.normal.repeat.set(2, 2);
    buildingTextures.normal.anisotropy = 16;

    // Glass textures
    Object.values(glassTextures).forEach(tex => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1);
        tex.anisotropy = 8;
    });
}

// Create materials
export function createMaterials() {
    // Ground Material
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: groundTextures.diffuse,
        normalMap: groundTextures.normal,
        displacementMap: groundTextures.displacement,
        displacementScale: 0.0001,
        roughnessMap: groundTextures.roughness
    });

    // Road Material
    const roadMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9
    });

    // Walkway Material
    const walkwayMaterial = new THREE.MeshStandardMaterial({
        map: walkwayTextures.diffuse,
        normalMap: walkwayTextures.normal,
        displacementMap: walkwayTextures.displacement,
        displacementScale: 0.01,
        roughnessMap: walkwayTextures.roughness
    });

    // Building Materials (light blue plaster appearance)
    const plasterFacadeMaterial = new THREE.MeshStandardMaterial({
        map: buildingTextures.diffuse,
        normalMap: buildingTextures.normal,
        displacementMap: buildingTextures.displacement,
        displacementScale: 0.01,
        color: 0x87CEEB, // Light blue color tint
        roughness: 0.9,
        metalness: 0.0,
        envMapIntensity: 0.0
    });
    plasterFacadeMaterial.name = 'Plaster Facade';

    const buildingMaterials = [
        {
            material: plasterFacadeMaterial,
            label: 'Plaster Facade',
            textures: [
                'textures/plastered_wall_05_2k.blend/textures/plastered_wall_05_diff_2k.jpg',
                'textures/plastered_wall_05_2k.blend/textures/plastered_wall_05_nor_gl_2k.exr'
            ],
            colorDescription: 'Light blue plaster facade.'
        }
    ];

    return {
        groundMaterial,
        roadMaterial,
        walkwayMaterial,
        buildingMaterials
    };
}

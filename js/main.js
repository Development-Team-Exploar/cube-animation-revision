const checkMobile = () => {
    if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
        // true for mobile device
        document.body.classList.add('isMobile')
    }else {
        document.body.classList.remove('isMobile')
    }
}

checkMobile()

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const canvas = document.getElementById("renderCanvas"); // Get the canvas element
const engine = new BABYLON.Engine(canvas, true, {
    adaptToDeviceRatio: true,
    antialias: true
}); // Generate the BABYLON 3D engine

const originalSize = {
    width: canvas.width,
    height: canvas.height,
};
engine.setSize(originalSize.width, originalSize.height);
let rightImg;

const contentOverlay = document.getElementById('contentOverlay');
const frontBigImg = document.getElementById('front-image');
const backBigImg = document.getElementById('back-image');
const rightBigImg = document.getElementById('right-image');
const leftBigImg = document.getElementById('left-image');
const video = document.getElementById('video');
const bgContainer = document.getElementById('bgContainer');

let mouseX, scene = null, cubeModel = null, isMouseDown = false, isDragging = false, cubeFaceMat = false, rotation = 0, step = (Math.PI/4.00), envVolume = 0.03, gl = null, gl2 = null;

let meshArrayGlow = [],
meshArrayGlow2 = [],
meshArrayNotGlow = [],
materialsToAnimate = [],
cubeMesh = null,
animateCube = false,
animateCubeFace = false,
oldCubeRotation = 0,
oldCubeRotationStep = 0,
clickableMeshes = [],
mirror = null,
mirrorOverlayPlane = null,
lightBelowCube = null

let pointerUpAnimating = false,
lastAnimatedMesh = null

let timePointerDown, timePointerUp, camera;

let hasDragEnded = true;
// Add your code here matching the playground format
const createScene = function () {
    let loaderTimer = null, babylonLoader = null
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    // scene.background = transparent
    //scene.createDefaultCamera(true);
    scene.environmentIntensity = 1;
    //BABYLON.MeshBuilder.CreateBox("box", {});

    //load Modelf
    //Name the scene loader for babylon -- Sourabh for Loader
    babylonLoader = BABYLON.SceneLoader.Append("./assets/", "normal-cube.glb", scene, function (meshes) {

        gl = new BABYLON.GlowLayer("glow", scene, { 
            mainTextureSamples: 16,
            blurKernelSize: 280
        });

        gl.intensity = 1.25;

        // gl.intensity = 0;
        // gl2.intensity = 0;

        cubeModel = scene.meshes[0];
        cubeModel.rotationQuaternion = null
        scene.meshes[0].scaling = new BABYLON.Vector3(1.025, 1.025, 1.025);
        // scene.meshes[0].scaling = new BABYLON.Vector3(1, 1, 1);       
        if(document.body.classList.contains('isMobile')) {
            scene.meshes[0].scaling = new BABYLON.Vector3(.6, .6, .6);
        }
        scene.meshes[0].position = new BABYLON.Vector3(0,-0.01,0);
        gl.customEmissiveColorSelector = function(element, subMesh, material, result) {
            if (element.name === "White edge") {
                result.set(1, 1, 1, 1);
            }else if(element.name === "Green edge"){
                result.set(0, 1, 1, .5);
            }
            else {
                result.set(0, 0, 0, 0);
            }
        }
        scene.meshes.forEach(element => {
            if(element.name == 'Green_edge' || element.name == 'White_edge') {
                meshArrayGlow.push(element)
                    
            }else {
                meshArrayNotGlow.push(element)
            }
            if(element.name == 'concrete_floor')
                element.isVisible = false
            if(element.name == 'Plane')
                element.isVisible = false
            if(element.name == 'front' || element.name == 'Right' || element.name == 'back' || element.name == 'left') {
                if(element.name == 'front') {
                    const data = {
                        'clickable' : element,
                        'actor' : scene.getMeshByName("image cube_primitive1")
                    }
                    clickableMeshes.push(data)
                }
                if(element.name == 'Right') {
                    const data = {
                        'clickable' : element,
                        'actor' : scene.getMeshByName("image cube_primitive0")
                    }
                    clickableMeshes.push(data)
                }
                if(element.name == 'back') {
                    const data = {
                        'clickable' : element,
                        'actor' : scene.getMeshByName("image cube_primitive3")
                    }
                    clickableMeshes.push(data)
                }
                if(element.name == 'left') {
                    const data = {
                        'clickable' : element,
                        'actor' : scene.getMeshByName("image cube_primitive2")
                    }
                    clickableMeshes.push(data)
                }
            }
        });

        scene.materials.forEach(element => {
            if(element.name == '__GLTFLoader._default') {
                element.hasAlpha = true
                element.alpha = 0
                element.MATERIAL_ALPHABLEND = true
                element.transparencyMode = element.MATERIAL_ALPHABLEND
            }
            if(element.name == 'Material.005' || element.name == 'Material.006' || element.name == 'Material.007' || element.name == 'Material.008') {
                // // materialsToAnimate.push(element)
                element.environmentIntensity = 1
                element.emissiveIntensity = 1
                element.specularIntensity = 0
                element.hasAlpha = true
                element.alpha = .999
                element.alphaCutOff = 1
                element.MATERIAL_ALPHABLEND = true
                element.transparencyMode = element.MATERIAL_ALPHABLEND
                element.alphaMode = BABYLON.Engine.ALPHA_PREMULTIPLIED;

            }else {
                
                element.roughness = 0.055
            }
            
            if(element.name == 'Material.001') {
                element.emissiveIntensity = 3;
                element.metallic = 1
                element.roughness = 0
            }        
        });
        
        let hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./assets/environment-texture.env", scene);
        scene.environmentTexture = hdrTexture;
        let frontImg = new BABYLON.Texture("./assets/front-img.png", scene);
        rightImg = new BABYLON.VideoTexture("video", "./assets/right-video.mp4", scene, true);
        rightImg.video.muted = true;
        let leftImg = new BABYLON.Texture("./assets/left-img.jpg", scene);
        let backImg = new BABYLON.Texture("./assets/back-img.png", scene);

        //Right Image
        scene.getMaterialByName("Material.005")._emissiveTexture = rightImg;
        scene.getMaterialByName("Material.005")._albedoTexture = rightImg;
        scene.getMaterialByName('Material.005').emissiveIntensity = 1.0;

        //Front Image
        scene.getMaterialByName('Material.006')._emissiveTexture = frontImg;
        scene.getMaterialByName('Material.006')._albedoTexture = frontImg;
        scene.getMaterialByName('Material.006').roughness = 0.15
        
        //Left Image
        scene.getMaterialByName('Material.007')._emissiveTexture = leftImg;
        scene.getMaterialByName('Material.007')._albedoTexture = leftImg;
        scene.getMaterialByName('Material.007').roughness = 0.15
        
        //Back Image
        scene.getMaterialByName('Material.008')._emissiveTexture = backImg;
        scene.getMaterialByName('Material.008')._albedoTexture = backImg;
        scene.getMaterialByName('Material.008').roughness = 0.15
        
        if(document.body.classList.contains('isMobile')) {
            // lightBelowCube = new BABYLON.SpotLight("spotLight", new BABYLON.Vector3(-7.5, 0, 0), new BABYLON.Vector3(8, -8, 0), Math.PI / 2, 20, scene);
            // lightBelowCube.intensity = 0.7;
        }else {
            // lightBelowCube = new BABYLON.SpotLight("spotLight", new BABYLON.Vector3(-4, 0, 0), new BABYLON.Vector3(8, -8, 0), Math.PI / 2, 20, scene);
            // lightBelowCube.intensity = 0.5;
        }
        
        cubeMesh = scene.getMeshByName("Cube");
        // Mirror
        // mirror = BABYLON.Mesh.CreateBox("Mirror", 1.0, scene);
        // mirror.scaling = new BABYLON.Vector3(500.0, 1, 500.0);
        // mirror.material = new BABYLON.StandardMaterial("mirror", scene);
        // // mirror.material.color = new BABYLON.Color3.FromHexString("#000000");
        // mirror.material.color = new BABYLON.Color3(0.07, 0.13, 0.2);
        // mirror.material.emissiveColor = new BABYLON.Color3(0.07, 0.13, 0.2);
        // // mirror.material.emissiveIntensity = 0.4;
        // mirror.material.reflectionTexture = new BABYLON.MirrorTexture("mirror", {ratio: 1}, scene, true);
        // if(document.body.classList.contains('isMobile')) {
        //     mirror.material.reflectionTexture.mirrorPlane = new BABYLON.Plane(0, -1.0, 0, -.26);
        // }else {
        //     mirror.material.reflectionTexture.mirrorPlane = new BABYLON.Plane(0, -1.0, 0, -.46);
        // }
        // mirror.material.reflectionTexture.renderList = meshArrayNotGlow.concat(meshArrayGlow);
        // mirror.material.reflectionTexture.level = 0.5;
        // mirror.material.reflectionTexture.adaptiveBlurKernel = 24;
        // // mirror.material.specularColor = new BABYLON.Color3(0, 0, 0);
        // mirror.material.specularColor = new BABYLON.Color3(0.07, 0.13, 0.2);
        // mirror.material.specularTexture = new BABYLON.Texture("./assets/Seamless_Concrete_Floor_Texture_NORMAL.jpg", scene);
        // mirror.material.specularTexture.uScale = 16;
        // mirror.material.specularTexture.vScale = 16;
        // mirror.position = new BABYLON.Vector3(0, -1, 0);
        // mirror.environmentIntensity = 0	
        // mirror.material.hasAlpha = true
        // mirror.material.alpha = 0.3
        // gl.addExcludedMesh(mirror);
        // materialsToAnimate.push(mirror.material)
        
        // mirrorOverlayPlane = BABYLON.Mesh.CreateBox("ground", 1.0, scene);
        // mirrorOverlayPlane.scaling = new BABYLON.Vector3(500.0, .1, 500.0);
        // if(document.body.classList.contains('isMobile')) {
        //     mirrorOverlayPlane.position = new BABYLON.Vector3(0, -1.4, 0);
        // }else {
        //     mirrorOverlayPlane.position = new BABYLON.Vector3(0, -1.5, 0);
        // }
        // mirrorOverlayPlane.rotation.y = -Math.PI/2
        
        // var pbr = new BABYLON.StandardMaterial("pbr", scene);
        // mirrorOverlayPlane.material = pbr;

        // pbr.diffuseTexture = new BABYLON.Texture("./assets/concrete-polished.jpg", scene);
        // pbr.diffuseTexture.uScale = 32;
        // pbr.diffuseTexture.vScale = 32;
        // pbr.specularTexture = new BABYLON.Texture("./assets/concrete-polished.jpg", scene);
        // pbr.specularTexture.uScale = 32;
        // pbr.specularTexture.vScale = 32;
        // pbr.specularColor = new BABYLON.Color3(0.07, 0.13, 0.2);
        // pbr.emissiveColor = new BABYLON.Color3(0.07, 0.13, 0.2);
        // pbr.metallic = 0.5;
        // pbr.roughness = 0.4;
        // pbr.hasAlpha = true
        // pbr.alpha = 0.1
        // pbr.environmentIntensity = 0
        // // Main material	

        // // Fog
        // scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
        // scene.fogColor = scene.clearColor;
        // scene.fogStart = 30.0;
        // scene.fogEnd = 130.0;
        
        //check device orientation
        if(document.body.classList.contains('isMobile')){
            if(sizes.width / sizes.height >= 1) {
                
                scene.meshes[0].scaling = new BABYLON.Vector3(1.05,1.05,1.05);
                // mirrorOverlayPlane.position = new BABYLON.Vector3(0, -1.8, 0);
                // mirror.material.reflectionTexture.mirrorPlane.d = -.4
            }else if(sizes.width / sizes.height <= 1) {
    
                scene.meshes[0].scaling = new BABYLON.Vector3(.58,.58,.58);
                // mirrorOverlayPlane.position = new BABYLON.Vector3(0, -1.4, 0);
                // mirror.material.reflectionTexture.mirrorPlane.d = -.26
            }
        }
    });
    

    loaderTimer = setInterval(() => {
        if (babylonLoader != null) {
            console.log('Model Loaded');
            document.getElementById("loader-ui").style.display = "none";
            clearInterval(loaderTimer)
        }
    }, 100);
    camera = new BABYLON.ArcRotateCamera("camera", 0, Math.PI / 2.5, 15, new BABYLON.Vector3(0, 0, 0));
    const c = Math.PI /2.0;
    camera.radius = 2.0;
    camera.lowerBetaLimit = c;
    camera.upperBetaLimit = c;

    camera.idleRotationWaitTime = 6000;
    camera.panningAxis = new BABYLON.Vector3(0,0,0);
    camera.angularSensibilityX = 10000;
    camera.angularSensibilityY = 10000;

    // camera.attachControl(canvas, true);
    // camera.inputs.remove(camera.inputs.attached.mousewheel);

    return scene;
};

scene = createScene(); //Call the createScene function

setTimeout(() => {
    animateCube = true
}, 1500);

let animationIntervalTimer = 150
let animationCounter = 0
let animInterval = null
let totalAnimCount = 0


// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {

    TWEEN.update();

    if(cubeModel && animateCube){
        cubeModel.rotation.y += 0.002
    }

    scene.render();
});

function toggleContentOverlay(){

    leftBigImg.children[0].pause();

    contentOverlay.style.opacity = 0;
    contentOverlay.style.zIndex = -1;

}


// Mouse interactions

let x = 0.0;
let easing = 0.01;
let modelRotation = 0
let autoRotateTimeout = null
let gsapAnimate = null
let tweenAnimation = null
let toAnimate = false

scene.onPointerDown = function(event){
    isMouseDown = true
    mouseX = event.clientX
    animateCube = false
}

function animateCubeRotation(angle, meshToAnimate) {
    console.log('animate in');
    pointerUpAnimating = true
    let rotateAngle = angle
    const direction = angle/Math.abs(angle)
    let cycles = Math.floor(cubeModel.rotation.y/(2*Math.PI))
    if(angle == 0) {
        const cubeTempAngle = cubeModel.rotation.y%(2*Math.PI)

        const closest = [0, (2*Math.PI)].reduce((a, b) => {
            return Math.abs(b - cubeTempAngle) < Math.abs(a - cubeTempAngle) ? b : a;
        });

        rotateAngle = closest
    }
    
    gsapAnimate = gsap.fromTo(cubeModel.rotation, 
        {
            y: cubeModel.rotation.y
        },
        {
            y: (cycles*(2*Math.PI))+rotateAngle,
            duration: 2,
            ease: "power2.out"
        }
    )
    tweenAnimation = new TWEEN.Tween(meshToAnimate.scaling)
    .to({
        x : 1.26,
        y : 1.26,
        z : 1.26,
    }, 1500)
    .easing(TWEEN.Easing.Cubic.InOut)
    .start();

    setTimeout(() => {
        animateCubeFace = false
        console.log(animateCubeFace);
    }, 2100);
}

scene.onPointerUp = function () {
    let toAnimateCamera = false,
    angle = 0,
    meshToAnimate = null

    isMouseDown = false

    if(document.body.classList.contains('isMobile')) {
        isDragging = false
    }else {
        if(isDragging) {
            setTimeout(() => {
                isDragging = false
            }, 5);
        }
    }
    
    if(!isDragging){

        var pickResult = scene.pick(scene.pointerX, scene.pointerY);

        if (pickResult.hit && !isDragging) {
            
            if((lastAnimatedMesh?.scaling.y == 1 || lastAnimatedMesh == undefined)) {
                const clickedMeshName = pickResult.pickedMesh.name;
                animateCubeFace = true
                toAnimate = true
                if(clickedMeshName === "front"){//front panel
                    meshToAnimate = scene.getMeshByName("image cube_primitive1")
                    toAnimateCamera = true
                    angle = 0
                }else if(clickedMeshName === "Right"){//right panel
                    meshToAnimate = scene.getMeshByName("image cube_primitive0")
                    toAnimateCamera = true
                    angle = Math.PI/2
                    rightImg.video.currentTime = 0
                    rightImg.video.muted = false
                }else if(clickedMeshName === "back"){//back panel
                    meshToAnimate = scene.getMeshByName("image cube_primitive3")
                    toAnimateCamera = true
                    angle = Math.PI
                }else if(clickedMeshName === "left"){//left panel
                    meshToAnimate = scene.getMeshByName("image cube_primitive2")
                    toAnimateCamera = true
                    angle = 3*Math.PI/2
                }else {
                    toAnimateCamera = false
                    animateCubeFace = false
                }

                if(toAnimateCamera) {
                    camera.detachControl(canvas, true);
                    animateCubeRotation(angle, meshToAnimate)
                    lastAnimatedMesh = meshToAnimate
                }
            }else {
                if(lastAnimatedMesh && (lastAnimatedMesh.scaling.y != 1)) {
                    console.log('animate out inside pick');
                    animateCubeFace = true
                    tweenAnimation = new TWEEN.Tween(lastAnimatedMesh.scaling)
                    .to({
                        x : 1,
                        y : 1,
                        z : 1,
                    }, 1500)
                    .easing(TWEEN.Easing.Cubic.InOut)
                    .start();
                    autoRotateTimeout = setTimeout(() => {
                        animateCube = true
                        rightImg.video.muted = true
                        pointerUpAnimating = false
                        animateCubeFace = false
                    }, 1500);
                }
            }

        }else {
            if((lastAnimatedMesh.scaling.y != 1) && !animateCubeFace) {
                console.log('animate out outside pick');
                animateCubeFace = true
                tweenAnimation = new TWEEN.Tween(lastAnimatedMesh.scaling)
                .to({
                    x : 1,
                    y : 1,
                    z : 1,
                }, 1500)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start();
                autoRotateTimeout = setTimeout(() => {
                    animateCube = true
                    rightImg.video.muted = true
                    pointerUpAnimating = false
                    animateCubeFace = false
                    console.log(animateCube,pointerUpAnimating,animateCubeFace);
                }, 1500);
            }
        }

    }

    if(rightImg) {
        rightImg.video.play();
    }

}

function idlBehav() {
    animateCube = true
}

let moveIdleTimer = null

scene.onPointerMove = function(event){
    if(camera.radius == 15 && !isDragging) {
        clearTimeout(moveIdleTimer)
        moveIdleTimer = setTimeout(idlBehav, 2000);
    }

    if(isMouseDown) {
        // clearTimeout(autoRotateTimeout)
        isDragging = true
        bgContainer.classList.add('active')
    }else {
        bgContainer.classList.remove('active')
    }
    
    const delta = -(event.offsetX - mouseX)
    /*if(Math.abs(delta) > 0.01){
        isDragging = true;
    }*/
    
    if(isDragging && !pointerUpAnimating && !animateCubeFace){
        animateCube = false
        // const rotation = (cubeModel.rotation.y - (0.25 * delta * 100) - x);
        modelRotation = cubeModel.rotation.y + ((delta * 0.06));

        gsapAnimate = gsap.fromTo(cubeModel.rotation, 
            {
                y: cubeModel.rotation.y
            },
            {
                y: modelRotation,
                duration: 2,
                ease: "Expo.easeOut"
                // ease: "power4.out"
            }
        )
        
    }else {
        
        if(clickableMeshes.length > 0) {
            const pickResult = scene.pick(scene.pointerX, scene.pointerY);
            let selectedMesh = null
            if(pickResult.hit) {
                const clickedMeshName = pickResult.pickedMesh?.name;
                clickableMeshes.forEach(element => {
                    if(clickedMeshName === element.clickable.name){
                        selectedMesh = element
                        // element.actor.material._emissiveColor = new BABYLON.Color3(0, 0.68, 0.64);
                    }else {
                        // element.actor.material._emissiveColor = new BABYLON.Color3(1, 1, 1);
                    }
                });
    
                if(selectedMesh != null) {
                    if (clickedMeshName === selectedMesh.clickable.name) {
                        gl.customEmissiveColorSelector = function(element, subMesh, material, result) {
                            if(element.name == selectedMesh.actor.name) {
                                result.set(0.18, 0.35, 0.35, 0);
                            }else if (element.name === "White edge") {
                                result.set(1, 1, 1, 1);
                            }else if(element.name === "Green edge"){
                                result.set(0, 1, 1, .5);
                            }else {
                                result.set(0, 0, 0, 0);
                            }
                        }
                    }
                }
            }else {
                gl.customEmissiveColorSelector = function(element, subMesh, material, result) {
                    if (element.name === "White edge") {
                        result.set(1, 1, 1, 1);
                    }else if(element.name === "Green edge"){
                        result.set(0, 1, 1, .5);
                    }else {
                        result.set(0, 0, 0, 0);
                    }
                }
    
            }
        }

    }
    mouseX = event.offsetX;

}


const checkObjectSizePositions = () => {
    checkMobile()
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    originalSize.width = canvas.width;
    originalSize.height = canvas.height;
    engine.setSize(originalSize.width, originalSize.height);
    engine.resize();

    if(scene != null && cubeModel != null) {
        if(document.body.classList.contains('isMobile')){
        
            // lightBelowCube.position.x = -7.5
            if(sizes.width / sizes.height >= 1) {
                
                scene.meshes[0].scaling = new BABYLON.Vector3(1.05,1.05,1.05);
                // mirrorOverlayPlane.position = new BABYLON.Vector3(0, -1.8, 0);
                // mirror.material.reflectionTexture.mirrorPlane.d = -.4
            }else if(sizes.width / sizes.height <= 1) {

                scene.meshes[0].scaling = new BABYLON.Vector3(.58,.58,.58);
                // mirrorOverlayPlane.position = new BABYLON.Vector3(0, -1.4, 0);
                // mirror.material.reflectionTexture.mirrorPlane.d = -.26
            }
        }else {
            scene.meshes[0].scaling = new BABYLON.Vector3(1.025,1.025,1.025);
            // mirrorOverlayPlane.position = new BABYLON.Vector3(0, -1.5, 0);
            // mirror.material.reflectionTexture.mirrorPlane.d = -.49
            // lightBelowCube.position.x = -4
        }
    }
}

window.addEventListener('resize', checkObjectSizePositions)
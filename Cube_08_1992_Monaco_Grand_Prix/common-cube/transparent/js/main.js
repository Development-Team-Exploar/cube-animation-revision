
// Code changed 06-09-22 by Sourabh
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}


const isIpadOS = () => {
    return navigator.maxTouchPoints &&
        navigator.maxTouchPoints > 2 &&
        /MacIntel/.test(navigator.platform);
}

// Code changed 06-09-22 by Sourabh
const checkMobile = () => {
    // alert(typeof(/Mobile/i.test(navigator.userAgent)))
    if (/iPad|Macintosh/i.test(navigator.userAgent)) {
        const ipadOS = isIpadOS()
        // some code..

        if (ipadOS) {
            document.body.classList.add('iPad')
            // alert('IPAD')
        } else {
            document.body.classList.remove('iPad')
        }

        if (/Chrome|CriOS/i.test(navigator.userAgent)) {
            document.body.classList.add('Chrome')
            // alert('IPAD Chrome')
        } else {
            document.body.classList.remove('Chrome')
        }
    } else {
        // alert('ipad false')
        document.body.classList.remove('iPad')
    }
    // let isIpad = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
    // if(isIpad) {
    // }else {
    // }
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // true for mobile device
        document.body.classList.add('isMobile')
    } else {
        document.body.classList.remove('isMobile')
    }
}

checkMobile()

// Code changed 29-08-22 by Sourabh ends

let startEventListeners = false
const canvas = document.getElementById("renderCanvas"); // Get the canvas element
const engine = new BABYLON.Engine(canvas, true, {
    adaptToDeviceRatio: true, //To be commented and versions created for performance check
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

let mouseX, scene = null, cubeModel = null, isMouseDown = false, isDragging = false, cubeFaceMat = false, gl = null, gl2 = null;

let animateCube = false,
    animateCubeFace = false,
    clickableMeshes = []

let pointerUpAnimating = false,
    lastAnimatedMesh = null,
    camera;

let gsapAnimate = null,
    gsapAnimateCompletion = false

// Add your code here matching the playground format
const createScene = function () {
    let loaderTimer = null, babylonLoader = null
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0.01);
    scene.environmentIntensity = .7;

    //load Modelf
    //Name the scene loader for babylon -- Sourabh for Loader
    babylonLoader = BABYLON.SceneLoader.Append("./assets/", "cube_common_with_icons_02.glb", scene, function (meshes) {

        gl = new BABYLON.GlowLayer("glow", scene, {
            mainTextureSamples: 8,
            blurKernelSize: 280
        });

        gl.intensity = 1.25;

        cubeModel = scene.meshes[0];
        cubeModel.rotationQuaternion = null
        scene.meshes[0].scaling = new BABYLON.Vector3(1.025, 1.025, 1.025);
        scene.meshes[0].position = new BABYLON.Vector3(0, -0.01, 0);
        gl.customEmissiveColorSelector = function (element, subMesh, material, result) {
            if (element.name === "White edge") {
                result.set(1, 1, 1, 1);
            } else if (element.name === "Green edge") {
                result.set(0, 1, 1, .5);
            }
            else {
                result.set(0, 0, 0, 0);
            }
        }
        scene.meshes.forEach(element => {
            if (element.name == 'image cube.001' || element.name == 'Cube_primitive0' || element.name == 'Cube_primitive1') {
                element.isPickable = false
            }
            if (element.name == 'magnifying-glass' || element.name == 'play-button') {
                element.scaling = new BABYLON.Vector3(-.15, .15, .15);
            }

            if (element.name == 'front' || element.name == 'magnifying-glass' || element.name == 'back' || element.name == 'play-button') {
                if (element.name == 'front') {
                    const data = {
                        'clickable': element,
                        'actor': scene.getMeshByName("image cube_primitive1")
                    }
                    clickableMeshes.push(data)
                }
                if (element.name == 'magnifying-glass') {
                    const data = {
                        'clickable': element,
                        'actor': scene.getMeshByName("image cube_primitive0")
                    }
                    clickableMeshes.push(data)
                }
                if (element.name == 'back') {
                    const data = {
                        'clickable': element,
                        'actor': scene.getMeshByName("image cube_primitive3")
                    }
                    clickableMeshes.push(data)
                }
                if (element.name == 'play-button') {
                    const data = {
                        'clickable': element,
                        'actor': scene.getMeshByName("image cube_primitive2")
                    }
                    clickableMeshes.push(data)
                }
            }
        });

        scene.materials.forEach(element => {
            if (element.name == '__GLTFLoader._default') {
                element.hasAlpha = true
                element.alpha = 0
                element.MATERIAL_ALPHABLEND = true
                element.transparencyMode = element.MATERIAL_ALPHABLEND
            }
            if (element.name == 'Material.005' || element.name == 'Material.006' || element.name == 'Material.007' || element.name == 'Material.008') {
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

            } if (element.name == 'Glass' || element.name == 'Glass.001') {
                element.roughness = 0.07
                element._emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);

                element.environmentIntensity = 0.9
            }
        });

        let hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./assets/environment-texture.env", scene);
        scene.environmentTexture = hdrTexture;
        let frontImg = new BABYLON.Texture("./assets/front-img.jpg", scene, false, false);
        rightImg = new BABYLON.VideoTexture("video", "./assets/right-video.mp4", scene, false, false);
        rightImg.video.muted = true;
        rightImg.video.pause()
        rightImg.fl;
        //rightImg.uScale = -1
        //rightImg.vScale = -1
        let leftImg = new BABYLON.Texture("./assets/left-img.jpg", scene, false, false);
        leftImg.uScale = -1;
        let backImg = new BABYLON.Texture("./assets/back-img.jpg", scene, false, false);

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

        // Code changed 29-08-22 by Sourabh
        //check device orientation
        if (document.body.classList.contains('isMobile')) {
            if (sizes.width / sizes.height >= 1) {
                scene.meshes[0].scaling = new BABYLON.Vector3(1.05, 1.05, 1.05);
            } else if (sizes.width / sizes.height <= 1) {
                // Code changed 06-09-22 by Sourabh
                if (document.body.classList.contains('iPad') || document.body.classList.contains('Chrome')) {
                    scene.meshes[0].scaling = new BABYLON.Vector3(0.9, 0.9, 0.9);
                } else {
                    scene.meshes[0].scaling = new BABYLON.Vector3(.58, .58, .58);
                }
            }
        } else {
            if (sizes.width / sizes.height >= 1) {
                scene.meshes[0].scaling = new BABYLON.Vector3(1.025, 1.025, 1.025);
            } else if (sizes.width / sizes.height <= 1) {
                // Code changed 06-09-22 by Sourabh
                if (document.body.classList.contains('iPad')) {
                    scene.meshes[0].scaling = new BABYLON.Vector3(0.9, 0.9, 0.9);
                } else {
                    scene.meshes[0].scaling = new BABYLON.Vector3(0.9, 0.9, 0.9);
                }
            }
        }
        // Code changed 29-08-22 by Sourabh ends
    });


    loaderTimer = setInterval(() => {
        if (babylonLoader != null) {
            document.getElementById("loader-ui").style.display = "none";
            clearInterval(loaderTimer)
        }
    }, 100);
    camera = new BABYLON.ArcRotateCamera("camera", 0, Math.PI / 2.5, 15, new BABYLON.Vector3(0, 0, 0));
    const c = Math.PI / 2.0;
    camera.radius = 2.0;
    camera.lowerBetaLimit = c;
    camera.upperBetaLimit = c;

    return scene;
};

scene = createScene(); //Call the createScene function

let animationIntervalTimer = 150
let animationCounter = 0
let animInterval = null
let totalAnimCount = 0


// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
    TWEEN.update();

    if (cubeModel && animateCube) {
        cubeModel.rotation.y += (0.00025 * engine.getDeltaTime())
    }
    if (gsapAnimateCompletion && !animateCube) {
        setTimeout(() => {
            idlBehav()
        }, 500);
    }

    scene.render();
});



// Mouse interactions

let x = 0.0;
let easing = 0.01;
let modelRotation = 0
let autoRotateTimeout = null
let tweenAnimation = null
let toAnimate = false
let moveIdleTimer = null

scene.onPointerDown = function (event) {
    if (!startEventListeners)
        return
    isMouseDown = true
    mouseX = event.clientX
    animateCube = false
}

function animateCubeRotation(angle, meshToAnimate) {
    animateCube = false
    clearTimeout(autoRotateTimeout)
    pointerUpAnimating = true
    let rotateAngle = angle
    let cycles = Math.floor(cubeModel.rotation.y / (2 * Math.PI))
    if (angle == 0) {
        const cubeTempAngle = cubeModel.rotation.y % (2 * Math.PI)

        const closest = [0, (2 * Math.PI)].reduce((a, b) => {
            return Math.abs(b - cubeTempAngle) < Math.abs(a - cubeTempAngle) ? b : a;
        });

        rotateAngle = closest
    }

    gsapAnimate = gsap.fromTo(cubeModel.rotation,
        {
            y: cubeModel.rotation.y
        },
        {
            y: (cycles * (2 * Math.PI)) + rotateAngle,
            duration: 2.25,
            ease: "power2.out"
        }
    )
    tweenAnimation = new TWEEN.Tween(meshToAnimate.scaling)
        .to({
            x: 1.26,
            y: 1.26,
            z: 1.26,
        }, 1500)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
    tweenAnimation.onComplete(() => {
        autoRotateTimeout = setTimeout(() => {
            animateCubeFace = false
        }, 250);
    })
}
scene.onPointerUp = function () {
    if (!startEventListeners)
        return
    let toAnimateCamera = false,
        angle = 0,
        meshToAnimate = null

    isMouseDown = false

    // Code changed 
    // Code changed 06-09-22 by Sourabh by Sourabh
    if (document.body.classList.contains('isMobile')) {
        // alert('Pointer Up isMobile')
        isDragging = false
    } else {
        if (document.body.classList.contains('iPad')) {
            // alert('Pointer Up iPad')
            isDragging = false
        } else {
            // alert('Pointer Up Not iPad')
            if (isDragging) {
                setTimeout(() => {
                    isDragging = false
                }, 5);
            }
        }
    }
    // Code changed 29-08-22 by Sourabh ends

    if (!isDragging) {

        var pickResult = scene.pick(scene.pointerX, scene.pointerY);

        if (pickResult.hit && !isDragging) {
            if ((lastAnimatedMesh?.scaling.y.toFixed(1) == 1.0 || lastAnimatedMesh == undefined)) {
                const clickedMeshName = pickResult.pickedMesh.name;
                animateCubeFace = true
                toAnimate = true
                if (clickedMeshName === "play-button") {//right panel Video plane
                    meshToAnimate = scene.getMeshByName("image cube_primitive0")
                    toAnimateCamera = true
                    angle = Math.PI / 2
                    rightImg.video.currentTime = 0
                    rightImg.video.muted = false
                    rightImg.video.play();
                } else if (clickedMeshName === "magnifying-glass") {//left panel Main image
                    meshToAnimate = scene.getMeshByName("image cube_primitive2")
                    toAnimateCamera = true
                    angle = 3 * Math.PI / 2
                } else if (clickedMeshName === "White edge") {
                    toAnimateCamera = false
                    animateCubeFace = false
                    animateCube = true
                } else {
                    toAnimateCamera = false
                    animateCubeFace = false
                    animateCube = true
                }

                if (toAnimateCamera) {
                    camera.detachControl(canvas, true);
                    animateCubeRotation(angle, meshToAnimate)
                    lastAnimatedMesh = meshToAnimate
                }
            } else {

                if (lastAnimatedMesh && (lastAnimatedMesh.scaling.y != 1)) {

                    animateCubeFace = true
                    tweenAnimation = new TWEEN.Tween(lastAnimatedMesh.scaling)
                        .to({
                            x: 1,
                            y: 1,
                            z: 1,
                        }, 1500)
                        .easing(TWEEN.Easing.Cubic.InOut)
                        .start();
                    tweenAnimation.onComplete(() => {
                        autoRotateTimeout = setTimeout(() => {
                            if (lastAnimatedMesh?.scaling.y.toFixed(2) == 1) {

                                animateCube = true
                                rightImg.video.muted = true
                                rightImg.video.currentTime = 0
                                rightImg.video.pause();
                                pointerUpAnimating = false
                                animateCubeFace = false
                            }
                        }, 250);
                    })
                }
            }

        } else {
            if ((lastAnimatedMesh?.scaling?.y != 1) && lastAnimatedMesh != undefined) {

                animateCubeFace = true
                tweenAnimation = new TWEEN.Tween(lastAnimatedMesh.scaling)
                    .to({
                        x: 1,
                        y: 1,
                        z: 1,
                    }, 1500)
                    .easing(TWEEN.Easing.Cubic.InOut)
                    .start();
                tweenAnimation.onComplete(() => {
                    autoRotateTimeout = setTimeout(() => {
                        if (lastAnimatedMesh?.scaling.y.toFixed(2) == 1) {
                            animateCube = true
                            rightImg.video.muted = true
                            rightImg.video.currentTime = 0
                            rightImg.video.pause();
                            pointerUpAnimating = false
                            animateCubeFace = false
                        }
                    }, 250);
                })
            }
        }

    }

}

function idlBehav() {
    if ((lastAnimatedMesh?.scaling?.y == 1 || lastAnimatedMesh?.scaling?.y == undefined) && (gsapAnimateCompletion == true)) {

        animateCube = true
    }
}


scene.onPointerMove = function (event) {
    if (!startEventListeners)
        return

    if (isMouseDown) {
        // clearTimeout(autoRotateTimeout)
        isDragging = true
        bgContainer.classList.add('active')
    } else {
        bgContainer.classList.remove('active')
    }

    const delta = -(event.offsetX - mouseX)
    /*if(Math.abs(delta) > 0.01){
        isDragging = true;
    }*/

    if (isDragging && !pointerUpAnimating && !animateCubeFace) {
        animateCube = false
        // const rotation = (cubeModel.rotation.y - (0.25 * delta * 100) - x);
        modelRotation = cubeModel.rotation.y + ((delta * 0.06));

        gsapAnimate = gsap.fromTo(cubeModel.rotation,
            {
                y: cubeModel.rotation.y
            },
            {
                y: modelRotation,
                duration: 2.2,
                ease: "Power4.easeOut",
                onStart: function () { gsapAnimateCompletion = false },
                onComplete: function () { gsapAnimateCompletion = true }
                // ease: "power4.out"
            }
        )

    } else {

        if (clickableMeshes.length > 0) {
            const pickResult = scene.pick(scene.pointerX, scene.pointerY);
            let selectedMesh = null
            if (pickResult.hit) {
                const clickedMeshName = pickResult.pickedMesh?.name;
                clickableMeshes.forEach(element => {
                    if (clickedMeshName === element.clickable.name) {
                        selectedMesh = element
                        // element.actor.material._emissiveColor = new BABYLON.Color3(0, 0.68, 0.64);
                    } else {
                        // element.actor.material._emissiveColor = new BABYLON.Color3(1, 1, 1);
                    }
                });

                if (selectedMesh != null) {
                    if (clickedMeshName === selectedMesh.clickable.name) {
                        gl.customEmissiveColorSelector = function (element, subMesh, material, result) {
                            if (element.name == selectedMesh.clickable.name) {
                                result.set(0, 0.6, 0.6, 5000);
                            } else if (element.name === "White edge") {
                                result.set(1, 1, 1, 1);
                            } else if (element.name === "Green edge") {
                                result.set(0, 1, 1, .5);
                            } else {
                                result.set(0, 0, 0, 0);
                            }
                        }
                    }
                } else {
                    gl.customEmissiveColorSelector = function (element, subMesh, material, result) {
                        if (element.name === "White edge") {
                            result.set(1, 1, 1, 1);
                        } else if (element.name === "Green edge") {
                            result.set(0, 1, 1, .5);
                        } else {
                            result.set(0, 0, 0, 0);
                        }
                    }
                }
            } else {
                gl.customEmissiveColorSelector = function (element, subMesh, material, result) {
                    if (element.name === "White edge") {
                        result.set(1, 1, 1, 1);
                    } else if (element.name === "Green edge") {
                        result.set(0, 1, 1, .5);
                    } else {
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

    if (scene != null && cubeModel != null) {

        // Code changed 06-09-22 by Sourabh
        if (document.body.classList.contains('isMobile')) {
            if (sizes.width / sizes.height >= 1) {
                scene.meshes[0].scaling = new BABYLON.Vector3(1.05, 1.05, 1.05);
            } else if (sizes.width / sizes.height <= 1) {
                // Code changed 06-09-22 by Sourabh
                if (document.body.classList.contains('iPad') || document.body.classList.contains('Chrome')) {
                    scene.meshes[0].scaling = new BABYLON.Vector3(0.9, 0.9, 0.9);
                } else {
                    scene.meshes[0].scaling = new BABYLON.Vector3(.58, .58, .58);
                }
            }
        } else {
            if (sizes.width / sizes.height >= 1) {
                scene.meshes[0].scaling = new BABYLON.Vector3(1.025, 1.025, 1.025);
            } else if (sizes.width / sizes.height <= 1) {
                // Code changed 06-09-22 by Sourabh
                if (document.body.classList.contains('iPad')) {
                    scene.meshes[0].scaling = new BABYLON.Vector3(0.9, 0.9, 0.9);
                } else {
                    scene.meshes[0].scaling = new BABYLON.Vector3(0.9, 0.9, 0.9);
                }
            }
        }
        // Code changed 06-09-22 by Sourabh ends
    }
}

window.addEventListener('resize', checkObjectSizePositions)

setTimeout(() => {
    // Code added 29-08-22 by Sourabh
    document.getElementById('renderCanvas').removeAttribute('touch-action')
    document.getElementById('renderCanvas').style.touchAction = 'unset'
    // Code added 29-08-22 by Sourabh
    animateCube = true
    startEventListeners = true
}, 1000);
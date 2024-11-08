// src/main.js
import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './../css/luketowers-motionvisualizer.css';

Chart.register(annotationPlugin);

let scene, camera, renderer, controls, animationRunning = false;
let currentIndex = 0;

let accelerationChart;
let rotationChart;

console.log("Initializing 3D Visualization...");

function initThreeJS() {
    console.log("Setting up Three.js scene...");
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const canvasContainer = document.getElementById('threeCanvas');
    const aspectRatio = canvasContainer.clientWidth / canvasContainer.clientHeight;

    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    camera.position.set(0, 0, 5);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);

    canvasContainer.style.height = "100%";
    canvasContainer.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    window.addEventListener('resize', () => {
        const container = document.getElementById('threeCanvas');
        renderer.setSize(container.clientWidth, container.clientHeight);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
    });

    console.log("Three.js setup complete. Renderer and OrbitControls added to canvas.");
}

function animate() {
    if (animationRunning) requestAnimationFrame(animate);

    const data = scene.getObjectByName('watch')?.userData?.fullData;
    if (data && currentIndex < data.length) {
        updateVisualization(currentIndex);
        currentIndex++;

        // Update slider position
        document.getElementById('timelineSlider').value = currentIndex;
    }

    renderer.render(scene, camera);
}

function updateVisualization(index) {
    const watch = scene.getObjectByName('watch');
    const data = watch.userData.fullData;
    const frameData = data[index];

    // Compute delta time
    let deltaTime = 0;
    if (watch.userData.previousTime !== null) {
        deltaTime = frameData.seconds_elapsed - watch.userData.previousTime;
    }
    watch.userData.previousTime = frameData.seconds_elapsed;

    // Update position using acceleration
    if (deltaTime > 0) {
        // Get acceleration and gravity
        const acceleration = new THREE.Vector3(
            frameData.accelerationX,
            frameData.accelerationY,
            frameData.accelerationZ
        );

        const gravity = new THREE.Vector3(
            frameData.gravityX,
            frameData.gravityY,
            frameData.gravityZ
        );

        // Subtract gravity from acceleration
        acceleration.sub(gravity);

        // Scale acceleration if needed
        const accelerationScale = 0.1; // Adjust this value as needed
        acceleration.multiplyScalar(accelerationScale);

        // Update velocity
        watch.userData.velocity.add(acceleration.clone().multiplyScalar(deltaTime));

        // Apply damping to velocity to reduce drift
        const dampingFactor = 0.95; // Adjust between 0.9 and 1.0
        watch.userData.velocity.multiplyScalar(dampingFactor);

        // Update position
        watch.userData.position.add(watch.userData.velocity.clone().multiplyScalar(deltaTime));

        // Update watch position
        watch.position.copy(watch.userData.position);

        // Update the trail
        const trail = watch.userData.trail;
        const positions = trail.geometry.attributes.position.array;

        if (index < positions.length / 3) {
            positions[index * 3] = watch.position.x;
            positions[index * 3 + 1] = watch.position.y;
            positions[index * 3 + 2] = watch.position.z;

            trail.geometry.setDrawRange(0, index + 1);
            trail.geometry.attributes.position.needsUpdate = true;
        }
    }

    // Update rotation using quaternion
    const quaternion = new THREE.Quaternion(
        frameData.quaternionX,
        frameData.quaternionY,
        frameData.quaternionZ,
        frameData.quaternionW
    );
    quaternion.normalize(); // Ensure the quaternion is normalized
    watch.quaternion.copy(quaternion);

    // Update frame counter
    document.getElementById('frameCounter').textContent = `Frame count: ${index}`;

    // Display numerical data
    document.getElementById('dataDisplay').innerHTML = `
        Acceleration: X=${frameData.accelerationX.toFixed(2)},
        Y=${frameData.accelerationY.toFixed(2)},
        Z=${frameData.accelerationZ.toFixed(2)}<br>
        Rotation Rate: X=${frameData.rotationRateX.toFixed(2)},
        Y=${frameData.rotationRateY.toFixed(2)},
        Z=${frameData.rotationRateZ.toFixed(2)}
    `;

    // Update chart cursors
    updateChartCursors(index);
}

function toggleAnimation() {
    animationRunning = !animationRunning;
    document.getElementById("playPauseButton").textContent = animationRunning ? "Pause" : "Play";
    console.log(animationRunning ? "Animation started." : "Animation paused.");
    if (animationRunning) animate();
}

function loadData() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) {
        alert("Please select at least one CSV file.");
        return;
    }

    console.log("Loading data from files...");

    for (const file of fileInput.files) {
        console.log(`Reading file: ${file.name}`);
        const reader = new FileReader();
        reader.onload = function (e) {
            const csv = e.target.result;
            const data = parseCSV(csv);
            console.log(`Parsed ${data.length} frames from ${file.name}`);
            visualizeData(data);
        };
        reader.readAsText(file);
    }
}

function parseCSV(data) {
    const rows = data.trim().split('\n');
    const result = [];

    const header = rows[0].split(',');
    const indices = {
        seconds_elapsed: header.indexOf('seconds_elapsed'),
        accelerationX: header.indexOf('accelerationX'),
        accelerationY: header.indexOf('accelerationY'),
        accelerationZ: header.indexOf('accelerationZ'),
        gravityX: header.indexOf('gravityX'),
        gravityY: header.indexOf('gravityY'),
        gravityZ: header.indexOf('gravityZ'),
        rotationRateX: header.indexOf('rotationRateX'),
        rotationRateY: header.indexOf('rotationRateY'),
        rotationRateZ: header.indexOf('rotationRateZ'),
        quaternionW: header.indexOf('quaternionW'),
        quaternionX: header.indexOf('quaternionX'),
        quaternionY: header.indexOf('quaternionY'),
        quaternionZ: header.indexOf('quaternionZ'),
    };

    if (Object.values(indices).some(index => index === -1)) {
        console.error('CSV does not contain all required columns.');
        return result;
    }

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cols = row.split(',');

        if (cols.length >= header.length) {
            const frameData = {};
            for (const key in indices) {
                frameData[key] = parseFloat(cols[indices[key]]);
            }

            if (Object.values(frameData).every(value => !isNaN(value))) {
                result.push(frameData);
            } else {
                console.warn(`Invalid data on row ${i}:`, row);
            }
        }
    }

    return result;
}

function visualizeData(data) {
    console.log("Initializing data visualization...");

    currentIndex = 0;

    // Remove previous watch and trail if they exist
    const oldWatch = scene.getObjectByName('watch');
    if (oldWatch) {
        scene.remove(oldWatch);
    }
    const oldTrail = scene.getObjectByName('trail');
    if (oldTrail) {
        scene.remove(oldTrail);
    }

    // Create a cube to represent the watch
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshNormalMaterial();
    const watch = new THREE.Mesh(geometry, material);
    watch.name = 'watch';
    scene.add(watch);

    // Initialize user data
    watch.userData.fullData = data;
    watch.userData.position = new THREE.Vector3();
    watch.userData.velocity = new THREE.Vector3();
    watch.userData.previousTime = null;

    // Initialize trail
    const trailGeometry = new THREE.BufferGeometry();
    const maxTrailPoints = data.length; // Ensure enough points for all frames
    const trailPositions = new Float32Array(maxTrailPoints * 3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    trail.name = 'trail';
    scene.add(trail);
    watch.userData.trail = trail;
    watch.userData.trailIndex = 0;

    // Initialize timeline slider
    const timelineSlider = document.getElementById('timelineSlider');
    timelineSlider.max = data.length - 1;
    timelineSlider.value = 0;

    timelineSlider.addEventListener('input', () => {
        if (animationRunning) toggleAnimation(); // Pause animation if running
        currentIndex = parseInt(timelineSlider.value);
        updateVisualization(currentIndex);
    });

    // Prepare and create charts
    prepareChartData(data);

    console.log("Watch object initialized for rendering.");
}

function prepareChartData(data) {
    // Extract data for each axis
    const timeLabels = data.map((frame, index) => index);
    const accelerationX = data.map(frame => frame.accelerationX);
    const accelerationY = data.map(frame => frame.accelerationY);
    const accelerationZ = data.map(frame => frame.accelerationZ);
    const rotationX = data.map(frame => frame.rotationRateX);
    const rotationY = data.map(frame => frame.rotationRateY);
    const rotationZ = data.map(frame => frame.rotationRateZ);

    // Create the charts
    createAccelerationChart(timeLabels, accelerationX, accelerationY, accelerationZ);
    createRotationChart(timeLabels, rotationX, rotationY, rotationZ);
}

function createAccelerationChart(labels, dataX, dataY, dataZ) {
    const ctx = document.getElementById('accelerationChart').getContext('2d');
    if (accelerationChart) accelerationChart.destroy();

    accelerationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Acceleration X',
                    data: dataX,
                    borderColor: 'red',
                    borderWidth: 1,
                    fill: false,
                },
                {
                    label: 'Acceleration Y',
                    data: dataY,
                    borderColor: 'green',
                    borderWidth: 1,
                    fill: false,
                },
                {
                    label: 'Acceleration Z',
                    data: dataZ,
                    borderColor: 'blue',
                    borderWidth: 1,
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: { display: true, title: { display: true, text: 'Frame' } },
                y: { display: true, title: { display: true, text: 'Acceleration' } },
            },
            plugins: {
                annotation: {
                    annotations: {
                        cursor: {
                            type: 'line',
                            xMin: 0,
                            xMax: 0,
                            borderColor: 'black',
                            borderWidth: 2,
                        },
                    },
                },
            },
        },
    });
}

function createRotationChart(labels, dataX, dataY, dataZ) {
    const ctx = document.getElementById('rotationChart').getContext('2d');
    if (rotationChart) rotationChart.destroy();

    rotationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Rotation Rate X',
                    data: dataX,
                    borderColor: 'red',
                    borderWidth: 1,
                    fill: false,
                },
                {
                    label: 'Rotation Rate Y',
                    data: dataY,
                    borderColor: 'green',
                    borderWidth: 1,
                    fill: false,
                },
                {
                    label: 'Rotation Rate Z',
                    data: dataZ,
                    borderColor: 'blue',
                    borderWidth: 1,
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: { display: true, title: { display: true, text: 'Frame' } },
                y: { display: true, title: { display: true, text: 'Rotation Rate' } },
            },
            plugins: {
                annotation: {
                    annotations: {
                        cursor: {
                            type: 'line',
                            xMin: 0,
                            xMax: 0,
                            borderColor: 'black',
                            borderWidth: 2,
                        },
                    },
                },
            },
        },
    });
}

function updateChartCursors(index) {
    if (accelerationChart) {
        accelerationChart.options.plugins.annotation.annotations.cursor.xMin = index;
        accelerationChart.options.plugins.annotation.annotations.cursor.xMax = index;
        accelerationChart.update('none');
    }
    if (rotationChart) {
        rotationChart.options.plugins.annotation.annotations.cursor.xMin = index;
        rotationChart.options.plugins.annotation.annotations.cursor.xMax = index;
        rotationChart.update('none');
    }
}

window.onload = () => {
    initThreeJS();

    document.getElementById('playPauseButton').addEventListener('click', toggleAnimation);
    document.getElementById('fileInput').addEventListener('change', loadData);
};

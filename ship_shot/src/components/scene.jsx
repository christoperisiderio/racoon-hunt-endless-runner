
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default function Scene() {
    const containerRef = useRef(null);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    const [dangerTime, setDangerTime] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        // Audio setup
        const bgm = new Audio('/bgm.mp3');
        bgm.loop = true;
        bgm.volume = 0.8;

        const runningSfx = new Audio('/running_sfx.mp3');
        runningSfx.loop = true;
        runningSfx.volume = 0.9;

        const enemySfx = new Audio('/enemy_sfx.mp3');
        enemySfx.volume = 0.6;

        const crashSfx = new Audio('/crash.mp3');
        crashSfx.volume = 0.6;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);

        // Game state
        const gameState = {
            playerLane: 0,
            playerZ: 0,
            speed: 0.15,
            baseSpeed: 0.15,
            isJumping: false,
            jumpVelocity: 0,
            gravity: 0.02,
            mixer: null,
            enemyMixer: null,
            obstacles: [],
            enemy: null,
            enemySpawnTime: 0,
            dangerTimeRemaining: 0,
            enemySpeed: 0.02,
            enemyDespawning: false,
            enemyDespawnProgress: 0,
            collisionCount: 0,
            score: 0,
            gameOver: false,
            started: false,
            roadSegments: [],
            nextRoadZ: 0,
            lastObstacleSpawn: 0,
            obstacleSpawnRate: 1900,
            speedMilestones: [1000, 3000, 4000, 5000],
            reachedMilestones: [],
            cameraShake: 0,
            shakeIntensity: 0
        };

        // Player - Load GLB model
        let player = null;
        const loader = new GLTFLoader();
        loader.load(
            '/running_man.glb',
            (gltf) => {
                player = gltf.scene;
                player.position.set(0, 0, 0);
                let playerScale = 1;
                player.scale.set(playerScale, playerScale, playerScale);
                player.rotation.y = Math.PI;
                scene.add(player);
                
                if (gltf.animations && gltf.animations.length > 0) {
                    gameState.mixer = new THREE.AnimationMixer(player);
                    const action = gameState.mixer.clipAction(gltf.animations[0]);
                    action.setLoop(THREE.LoopRepeat);
                    action.play();
                }
            },
            undefined,
            (error) => {
                console.error('Error loading model:', error);
                const playerGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.8);
                const playerMaterial = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
                player = new THREE.Mesh(playerGeometry, playerMaterial);
                player.position.set(0, 0.6, 0);
                player.rotation.y = Math.PI;
                scene.add(player);
            }
        );

        // Road segment creation
        const ROAD_SEGMENT_LENGTH = 35;
        const ROAD_WIDTH = 10;

        function createRoadSegment(startZ) {
            const roadLoader = new GLTFLoader();
            let ground = null;
            const markers = [];
            
            roadLoader.load(
                '/autumn_road.glb',
                (gltf) => {
                    ground = gltf.scene;
                    ground.position.set(3.5, -2, startZ - ROAD_SEGMENT_LENGTH / 2);
                    ground.rotation.y = Math.PI / 2;
                    
                    const roadScale = 20;
                    ground.scale.set(roadScale, roadScale, roadScale);
                    scene.add(ground);
                },
                undefined,
                (error) => {
                    console.error('Error loading road model:', error);
                    const groundGeometry = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_SEGMENT_LENGTH);
                    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
                    ground = new THREE.Mesh(groundGeometry, groundMaterial);
                    ground.rotation.x = -Math.PI / 2;
                    ground.position.z = startZ - ROAD_SEGMENT_LENGTH / 2;
                    scene.add(ground);
                }
            );

            return {
                ground,
                markers,
                startZ: startZ,
                endZ: startZ - ROAD_SEGMENT_LENGTH
            };
        }

        // Initialize first few road segments
        for (let i = 0; i < 3; i++) {
            const segment = createRoadSegment(gameState.nextRoadZ);
            gameState.roadSegments.push(segment);
            gameState.nextRoadZ -= ROAD_SEGMENT_LENGTH;
        }

        camera.position.set(0, 6, 7);
        camera.lookAt(0, 0, -7);

        // Spawn obstacle
        function spawnObstacle() {
            const lanes = [-2.5, 0, 2.5];
            const spawnDistance = gameState.playerZ - 30;
            
            const isDouble = Math.random() < 0.3;
            
            const obstacleLoader = new GLTFLoader();
            
            if (isDouble) {
                const availableLanes = [0, 1, 2];
                const firstLaneIndex = availableLanes[Math.floor(Math.random() * availableLanes.length)];
                availableLanes.splice(availableLanes.indexOf(firstLaneIndex), 1);
                const secondLaneIndex = availableLanes[Math.floor(Math.random() * availableLanes.length)];
                
                obstacleLoader.load(
                    '/trashcan.glb',
                    (gltf) => {
                        const obstacle1 = gltf.scene;
                        obstacle1.position.set(lanes[firstLaneIndex], 0, spawnDistance);
                        const obstacleScale = 1;
                        obstacle1.scale.set(obstacleScale, obstacleScale, obstacleScale);
                        obstacle1.rotation.y = Math.PI;
                        scene.add(obstacle1);
                        
                        gameState.obstacles.push({ 
                            mesh: obstacle1, 
                            lane: firstLaneIndex - 1,
                            hit: false
                        });
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading obstacle model:', error);
                        const obstacle1Geometry = new THREE.BoxGeometry(1, 1.5, 1);
                        const obstacle1Material = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
                        const obstacle1 = new THREE.Mesh(obstacle1Geometry, obstacle1Material);
                        obstacle1.position.set(lanes[firstLaneIndex], 0.75, spawnDistance);
                        scene.add(obstacle1);
                        
                        gameState.obstacles.push({ 
                            mesh: obstacle1, 
                            lane: firstLaneIndex - 1,
                            hit: false
                        });
                    }
                );
                
                obstacleLoader.load(
                    '/trashcan.glb',
                    (gltf) => {
                        const obstacle2 = gltf.scene;
                        obstacle2.position.set(lanes[secondLaneIndex], 0, spawnDistance);
                        const obstacleScale = 1;
                        obstacle2.scale.set(obstacleScale, obstacleScale, obstacleScale);
                        obstacle2.rotation.y = Math.PI;
                        scene.add(obstacle2);
                        
                        gameState.obstacles.push({ 
                            mesh: obstacle2, 
                            lane: secondLaneIndex - 1,
                            hit: false
                        });
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading obstacle model:', error);
                        const obstacle2Geometry = new THREE.BoxGeometry(1, 1.5, 1);
                        const obstacle2Material = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
                        const obstacle2 = new THREE.Mesh(obstacle2Geometry, obstacle2Material);
                        obstacle2.position.set(lanes[secondLaneIndex], 0.75, spawnDistance);
                        scene.add(obstacle2);
                        
                        gameState.obstacles.push({ 
                            mesh: obstacle2, 
                            lane: secondLaneIndex - 1,
                            hit: false
                        });
                    }
                );
            } else {
                const lane = lanes[Math.floor(Math.random() * lanes.length)];
                
                obstacleLoader.load(
                    '/trashcan.glb',
                    (gltf) => {
                        const obstacle = gltf.scene;
                        obstacle.position.set(lane, 0, spawnDistance);
                        const obstacleScale = 1;
                        obstacle.scale.set(obstacleScale, obstacleScale, obstacleScale);
                        obstacle.rotation.y = Math.PI;
                        scene.add(obstacle);
                        
                        gameState.obstacles.push({ 
                            mesh: obstacle, 
                            lane: lanes.indexOf(lane) - 1,
                            hit: false
                        });
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading obstacle model:', error);
                        const obstacleGeometry = new THREE.BoxGeometry(1, 1.5, 1);
                        const obstacleMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
                        const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
                        obstacle.position.set(lane, 0.75, spawnDistance);
                        scene.add(obstacle);
                        
                        gameState.obstacles.push({ 
                            mesh: obstacle, 
                            lane: lanes.indexOf(lane) - 1,
                            hit: false
                        });
                    }
                );
            }
        }

        // Spawn enemy
        function spawnEnemy() {
            if (gameState.enemy) return;
            
            const enemyLoader = new GLTFLoader();
            enemyLoader.load(
                '/running_racoon.glb',
                (gltf) => {
                    const enemy = gltf.scene;
                    enemy.position.set(player.position.x, 0, player.position.z + 15);
                    const enemyScale = 1.8;
                    enemy.scale.set(enemyScale, enemyScale, enemyScale);
                    enemy.rotation.y = Math.PI;
                    scene.add(enemy);
                    
                    gameState.enemy = enemy;
                    
                    if (gltf.animations && gltf.animations.length > 0) {
                        if (!gameState.enemyMixer) {
                            gameState.enemyMixer = new THREE.AnimationMixer(enemy);
                        }
                        const action = gameState.enemyMixer.clipAction(gltf.animations[0]);
                        action.setLoop(THREE.LoopRepeat);
                        action.play();
                    }
                    
                    enemySfx.currentTime = 0;
                    enemySfx.play().catch(err => console.log('Enemy SFX play failed:', err));
                },
                undefined,
                (error) => {
                    console.error('Error loading enemy model:', error);
                    const enemyGeometry = new THREE.BoxGeometry(0.9, 1.3, 0.9);
                    const enemyMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
                    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
                    enemy.position.set(player.position.x, 0.65, player.position.z + 15);
                    scene.add(enemy);
                    gameState.enemy = enemy;
                    
                    enemySfx.currentTime = 0;
                    enemySfx.play().catch(err => console.log('Enemy SFX play failed:', err));
                }
            );
            
            gameState.enemySpawnTime = Date.now();
            gameState.dangerTimeRemaining = 10000;
            gameState.enemySpeed = 0.02;
            gameState.collisionCount = 0;
        }

        // Trigger camera shake
        function triggerShake(intensity = 0.3) {
            gameState.cameraShake = 0;
            gameState.shakeIntensity = intensity;
        }

        // Input handling
        const keys = {};
        window.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            
            if (!gameState.started && e.key === ' ') {
                gameState.started = true;
                setGameStarted(true);
                
                bgm.play().catch(err => console.log('BGM play failed:', err));
                runningSfx.play().catch(err => console.log('Running SFX play failed:', err));
            }
            
            if (gameState.gameOver && e.key === 'r') {
                window.location.reload();
            }
            
            if ((e.key === 'ArrowLeft' || e.key === 'a') && gameState.playerLane > -1) {
                gameState.playerLane--;
            }
            if ((e.key === 'ArrowRight' || e.key === 'd') && gameState.playerLane < 1) {
                gameState.playerLane++;
            }
            if (e.key === ' ' && !gameState.isJumping) {
                gameState.isJumping = true;
                gameState.jumpVelocity = 0.3;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            keys[e.key] = false;
        });

        // Resize handler
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // Game loop
        const clock = new THREE.Clock();
        const animate = () => {
            if (gameState.gameOver) return;
            
            requestAnimationFrame(animate);
            
            const delta = clock.getDelta();
            
            if (gameState.mixer) {
                gameState.mixer.update(delta);
            }
            if (gameState.enemyMixer) {
                gameState.enemyMixer.update(delta);
            }
            
            if (!gameState.started || !player) {
                renderer.render(scene, camera);
                return;
            }

            gameState.playerZ -= gameState.speed;
            gameState.score += gameState.speed * 10;
            setScore(Math.floor(gameState.score));

            for (let milestone of gameState.speedMilestones) {
                if (gameState.score >= milestone && !gameState.reachedMilestones.includes(milestone)) {
                    gameState.reachedMilestones.push(milestone);
                    gameState.baseSpeed += 0.15;
                    gameState.speed = gameState.baseSpeed;
                    gameState.obstacleSpawnRate = Math.max(gameState.obstacleSpawnRate - 150, 900);
                }
            }

            const targetX = gameState.playerLane * 2.5;
            player.position.x += (targetX - player.position.x) * 0.2;
            player.position.z = gameState.playerZ;

            if (gameState.isJumping) {
                player.position.y += gameState.jumpVelocity;
                gameState.jumpVelocity -= gameState.gravity;
                
                if (player.position.y <= 0) {
                    player.position.y = 0;
                    gameState.isJumping = false;
                    gameState.jumpVelocity = 0;
                }
            }

            const frontSegment = gameState.roadSegments[gameState.roadSegments.length - 1];
            const distanceIntoSegment = frontSegment.startZ - gameState.playerZ;
            const segmentProgress = distanceIntoSegment / ROAD_SEGMENT_LENGTH;
            
            if (segmentProgress > 0.3) {
                const newSegment = createRoadSegment(gameState.nextRoadZ);
                gameState.roadSegments.push(newSegment);
                gameState.nextRoadZ -= ROAD_SEGMENT_LENGTH;
            }

            for (let i = gameState.roadSegments.length - 1; i >= 0; i--) {
                const segment = gameState.roadSegments[i];
                if (segment.endZ > gameState.playerZ + 10) {
                    if (segment.ground) {
                        scene.remove(segment.ground);
                        segment.ground.traverse((child) => {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        });
                    }
                    segment.markers.forEach(marker => {
                        scene.remove(marker);
                        if (marker.geometry) marker.geometry.dispose();
                        if (marker.material) marker.material.dispose();
                    });
                    gameState.roadSegments.splice(i, 1);
                }
            }

            if (Date.now() - gameState.lastObstacleSpawn > gameState.obstacleSpawnRate) {
                spawnObstacle();
                gameState.lastObstacleSpawn = Date.now();
            }

            for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
                const obs = gameState.obstacles[i];
                
                if (obs.mesh.position.z > gameState.playerZ + 5) {
                    scene.remove(obs.mesh);
                    obs.mesh.traverse((child) => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                    gameState.obstacles.splice(i, 1);
                    continue;
                }

                if (gameState.enemy && !obs.hit) {
                    const enemyObsDistance = Math.sqrt(
                        Math.pow(obs.mesh.position.x - gameState.enemy.position.x, 2) +
                        Math.pow(obs.mesh.position.z - gameState.enemy.position.z, 2)
                    );
                    
                    if (enemyObsDistance < 1.5) {
                        obs.hit = true;
                        scene.remove(obs.mesh);
                        obs.mesh.traverse((child) => {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        });
                        gameState.obstacles.splice(i, 1);
                        continue;
                    }
                }

                const distance = Math.abs(obs.mesh.position.z - player.position.z);
                if (distance < 2) {
                    const sameLane = obs.lane === gameState.playerLane;
                    
                    if (distance < 1 && sameLane && player.position.y < 1 && !obs.hit) {
                        obs.hit = true;
                        
                        crashSfx.currentTime = 0;
                        crashSfx.play().catch(err => console.log('Crash SFX play failed:', err));
                        
                        triggerShake(0.3);
                        
                        scene.remove(obs.mesh);
                        obs.mesh.traverse((child) => {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        });
                        gameState.obstacles.splice(i, 1);
                        
                        if (!gameState.enemy) {
                            spawnEnemy();
                        } else {
                            gameState.collisionCount++;
                            gameState.enemySpawnTime = Date.now();
                            gameState.dangerTimeRemaining = 10000;
                            gameState.enemySpeed = Math.min(gameState.enemySpeed + 0.02, 0.12);
                            
                            const dx = player.position.x - gameState.enemy.position.x;
                            const dz = player.position.z - gameState.enemy.position.z;
                            const currentDist = Math.sqrt(dx * dx + dz * dz);
                            
                            if (currentDist > 2) {
                                gameState.enemy.position.x += dx * 0.5;
                                gameState.enemy.position.z += dz * 0.5;
                            }
                        }
                    }
                }
            }

            if (gameState.enemy) {
                const elapsed = Date.now() - gameState.enemySpawnTime;
                gameState.dangerTimeRemaining = Math.max(0, 10000 - elapsed);
                setDangerTime(Math.ceil(gameState.dangerTimeRemaining / 1000));

                if (gameState.enemyDespawning) {
                    gameState.enemyDespawnProgress += delta * 2;
                    
                    const slowdownFactor = 1 - gameState.enemyDespawnProgress;
                    gameState.enemy.position.z += slowdownFactor * 0.02;
                    
                    gameState.enemy.traverse((child) => {
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.transparent = true;
                                    mat.opacity = Math.max(0, 1 - gameState.enemyDespawnProgress);
                                });
                            } else {
                                child.material.transparent = true;
                                child.material.opacity = Math.max(0, 1 - gameState.enemyDespawnProgress);
                            }
                        }
                    });
                    
                    const scale = Math.max(0, 1 - gameState.enemyDespawnProgress * 0.5);
                    gameState.enemy.scale.set(1.8 * scale, 1.8 * scale, 1.8 * scale);
                    
                    if (gameState.enemyDespawnProgress >= 1) {
                        scene.remove(gameState.enemy);
                        gameState.enemy.traverse((child) => {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        });
                        gameState.enemy = null;
                        gameState.enemyMixer = null;
                        gameState.dangerTimeRemaining = 0;
                        gameState.enemySpeed = 0.02;
                        gameState.collisionCount = 0;
                        gameState.enemyDespawning = false;
                        gameState.enemyDespawnProgress = 0;
                        setDangerTime(0);
                    }
                } else {
                    const dx = player.position.x - gameState.enemy.position.x;
                    const dz = player.position.z - gameState.enemy.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);

                    let speedMultiplier = 1;
                    if (gameState.collisionCount > 0) {
                        const timeProgress = elapsed / 10000;
                        speedMultiplier = 1.5 + timeProgress * 2;
                    }
                    
                    gameState.enemy.position.x += dx * gameState.enemySpeed * speedMultiplier * 2;
                    gameState.enemy.position.z += dz * (gameState.enemySpeed + 0.03) * speedMultiplier * 2;

                    if (distance < 1.5 && gameState.collisionCount > 0 && gameState.dangerTimeRemaining > 0) {
                        gameState.gameOver = true;
                        setGameOver(true);
                        
                        bgm.pause();
                        runningSfx.pause();
                    }

                    if (gameState.dangerTimeRemaining <= 0) {
                        gameState.enemyDespawning = true;
                        gameState.enemyDespawnProgress = 0;
                    }
                }
            }

            if (gameState.shakeIntensity > 0) {
                gameState.cameraShake += delta * 15;
                
                gameState.shakeIntensity *= 0.92;
                
                if (gameState.shakeIntensity < 0.01) {
                    gameState.shakeIntensity = 0;
                }
                
                const shakeX = Math.sin(gameState.cameraShake * 10) * gameState.shakeIntensity;
                const shakeY = Math.cos(gameState.cameraShake * 8) * gameState.shakeIntensity;
                
                camera.position.x = player.position.x + shakeX;
                camera.position.y = 6 + shakeY;
                camera.position.z = player.position.z + 6;
            } else {
                camera.position.x = player.position.x;
                camera.position.y = 6;
                camera.position.z = player.position.z + 6;
            }
            
            camera.lookAt(player.position.x, 0, player.position.z - 10);

            gameState.speed = Math.min(0.15 + gameState.score * 0.00001, 0.3);

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            
            bgm.pause();
            runningSfx.pause();
            
            gameState.obstacles.forEach(obs => {
                scene.remove(obs.mesh);
                obs.mesh.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            });
            
            gameState.roadSegments.forEach(segment => {
                if (segment.ground) {
                    scene.remove(segment.ground);
                    segment.ground.traverse((child) => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }
                segment.markers.forEach(marker => {
                    scene.remove(marker);
                    if (marker.geometry) marker.geometry.dispose();
                    if (marker.material) marker.material.dispose();
                });
            });
            
            if (gameState.enemy) {
                scene.remove(gameState.enemy);
                gameState.enemy.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
            
            if (player) {
                scene.remove(player);
                player.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
            
            renderer.dispose();
            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            
            {!gameStarted && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'white',
                    fontSize: '24px',
                    fontFamily: 'Arial, sans-serif',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '30px',
                    borderRadius: '10px'
                }}>
                    <h1 style={{ margin: '0 0 20px 0' }}>Racoon Hunt Endless Runner</h1>
                    <p>← → Arrow Keys or ('a' or 'd') to Move</p>
                    <p>SPACE to Jump</p>
                    <p style={{ marginTop: '20px', fontSize: '18px' }}>Press SPACE to Start</p>
                </div>
            )}

            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                color: 'white',
                fontSize: '24px',
                fontFamily: 'Arial, sans-serif',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}>
                Score: {score}
            </div>

            {dangerTime > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    color: '#ff4444',
                    fontSize: '32px',
                    fontFamily: 'Arial, sans-serif',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    animation: 'pulse 1s infinite'
                }}>
                    ⚠️ DANGER: {dangerTime}s
                </div>
            )}

            {gameOver && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'white',
                    fontSize: '32px',
                    fontFamily: 'Arial, sans-serif',
                    background: 'rgba(0,0,0,0.8)',
                    padding: '40px',
                    borderRadius: '10px'
                }}>
                    <h1 style={{ color: '#ff6b6b', margin: '0 0 20px 0' }}>CAUGHT!</h1>
                    <p style={{ fontSize: '24px' }}>Final Score: {score}</p>
                    <p style={{ fontSize: '18px', marginTop: '20px' }}>Press R to Restart</p>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.05); }
                }
            `}</style>
        </div>
    );
}
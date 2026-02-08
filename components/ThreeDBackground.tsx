import React, { useEffect, useRef } from 'react';

// Let TypeScript know that THREE will be available on the window object
declare const THREE: any;

// FIX: Add namespace declaration to satisfy TypeScript's type checker for THREE.js types.
// This resolves the "Cannot find namespace 'THREE'" errors when using types like THREE.Mesh.
declare namespace THREE {
    type Mesh = any;
    type Group = any;
    type Line = any;
    type LineBasicMaterial = any;
}

export const ThreeDBackground: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mountRef.current || typeof THREE === 'undefined') return;

        const currentMount = mountRef.current;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.z = 50;

        const renderer = new THREE.WebGLRenderer({ antias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);
        
        const mouse = new THREE.Vector2();

        // --- Nodes (Neurons) ---
        const nodes: THREE.Mesh[] = [];
        const nodeGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x7aa5ff });
        
        const spread = 80;
        for (let i = 0; i < 200; i++) {
            const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
            node.position.set(
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread,
            );
            node.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
            )
            nodes.push(node);
            scene.add(node);
        }

        // --- Connections (Synapses) & Pulses ---
        const lines = new THREE.Group();
        scene.add(lines);
        
        const pulses: THREE.Mesh[] = [];
        const pulseGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const pulseMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        let animationFrameId: number;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            // Animate nodes drifting
            nodes.forEach(node => {
                node.position.add(node.userData.velocity);
                if (node.position.x > spread/2 || node.position.x < -spread/2) node.userData.velocity.x *= -1;
                if (node.position.y > spread/2 || node.position.y < -spread/2) node.userData.velocity.y *= -1;
                if (node.position.z > spread/2 || node.position.z < -spread/2) node.userData.velocity.z *= -1;
            });

            // Randomly create new connections and pulses
            if (Math.random() > 0.95 && lines.children.length < 100) {
                const nodeA = nodes[Math.floor(Math.random() * nodes.length)];
                const nodeB = nodes[Math.floor(Math.random() * nodes.length)];
                if (nodeA !== nodeB) {
                    const points = [nodeA.position, nodeB.position];
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                    const lineMaterial = new THREE.LineBasicMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: 0.5,
                        linewidth: 0.5, // Note: this has limitations in WebGL
                    });
                    const line = new THREE.Line(lineGeometry, lineMaterial);
                    lines.add(line);

                    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
                    pulse.position.copy(nodeA.position);
                    pulse.userData = {
                        start: nodeA.position,
                        end: nodeB.position,
                        progress: 0,
                        line: line // Keep a reference to the line
                    };
                    pulses.push(pulse);
                    scene.add(pulse);
                }
            }

            // Animate existing pulses
            for (let i = pulses.length - 1; i >= 0; i--) {
                const pulse = pulses[i];
                pulse.userData.progress += 0.01;
                pulse.position.lerpVectors(pulse.userData.start, pulse.userData.end, pulse.userData.progress);
                
                if (pulse.userData.progress >= 1) {
                    scene.remove(pulse);
                    pulses.splice(i, 1);
                }
            }

            // Animate line opacity (fade out)
            for (let i = lines.children.length - 1; i >= 0; i--) {
                const line = lines.children[i] as THREE.Line;
                (line.material as THREE.LineBasicMaterial).opacity -= 0.005;
                if ((line.material as THREE.LineBasicMaterial).opacity <= 0) {
                    line.geometry.dispose();
                    (line.material as THREE.LineBasicMaterial).dispose();
                    lines.remove(line);
                }
            }

            // Parallax effect
            camera.position.x += (mouse.x * 5 - camera.position.x) * 0.05;
            camera.position.y += (-mouse.y * 5 - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        };

        const handleResize = () => {
            if (currentMount) {
                const width = currentMount.clientWidth;
                const height = currentMount.clientHeight;
                renderer.setSize(width, height);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }
        };

        const onMouseMove = (event: MouseEvent) => {
            if (currentMount) {
                 mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                 mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            }
        };

        window.addEventListener('resize', handleResize);
        document.addEventListener('mousemove', onMouseMove);
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(animationFrameId);
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
            // Dispose of geometries and materials to prevent memory leaks
            scene.traverse(obj => {
                if ((obj as any).geometry) (obj as any).geometry.dispose();
                if ((obj as any).material) {
                    if (Array.isArray((obj as any).material)) {
                        (obj as any).material.forEach((material: any) => material.dispose());
                    } else {
                        (obj as any).material.dispose();
                    }
                }
            });
            renderer.dispose();
        };
    }, []);

    return <div ref={mountRef} className="absolute top-0 left-0 w-full h-full z-0 opacity-80" />;
};

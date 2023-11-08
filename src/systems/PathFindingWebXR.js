import { Vector3, MeshBasicMaterial, Mesh, Group, ArrowHelper, BoxGeometry, BufferGeometry, Line, LineBasicMaterial } from "three";

import { Pathfinding } from "three-pathfinding";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import NavMeshUrl from "/navmesh.gltf";

const zeroVector = new Vector3(0, 0, 0);

let pathfinding = new Pathfinding();
let zoneName = "level1";
let groupID;
let zoneData;
let startPosition = new Vector3();
let targetPosition = new Vector3();

let tempTargetPosition = new Vector3(0, 0.5, -2);

let line;

let camera;
let navigationArea;

let isStartCubeCreated = false;
let isEndCubeCreated = false;

const navArrows = [];

class PathFindingWebXR {
    constructor(cameraParam, navigationAreaParam) {
        camera = cameraParam;
        navigationArea = navigationAreaParam;

        // setup navmesh and navigation targets
        const loader = new GLTFLoader();
        loader.load(
            NavMeshUrl,
            (gltf) => {
                // NavMesh generator https://navmesh.isaacmason.com/
                // PathFinding https://github.com/donmccurdy/three-pathfinding

                let navMesh = gltf.scene;
                navigationArea.add(navMesh);

                let navMeshGeometry = new BufferGeometry();
                navMesh.children.forEach((child) => {
                    if (child.type === "Mesh") {
                        console.log("Mesh", child);
                        navMeshGeometry = child;
                    }
                });
                navMeshGeometry.visible = false;

                zoneData = Pathfinding.createZone(navMeshGeometry.geometry);
                pathfinding.setZoneData(zoneName, zoneData);
                console.log("Zone", zoneData);
            },
            undefined,
            (e) => {
                console.error(e);
            }
        );

        // navigation line
        const lineGeometry = new BufferGeometry();
        const lineMaterial = new LineBasicMaterial({ color: 0xff0000, linewidth: 12 });
        line = new Line(lineGeometry, lineMaterial);
        line.renderOrder = 3;
        navigationArea.add(line);

        // highlight line vertices with small cubes
        const direction = new Vector3(1, 0, 0)  // direction de la flèche a définir plus tard
        const origin = new Vector3(0, 0, 0)  
        const length = 10;
        const color = 0xff0000;
        const arrow = new ArrowHelper(direction, origin, length, color);
        for (let index = 0; index < 20; index++) {
            arrow.visible = false;
            arrow.renderOrder = 3;
            navArrows.push(arrow);
            navigationArea.add(arrow);
        }

        document.getElementById("kitchenTarget").addEventListener("click", () => {
            console.log("kitchen selected");
            tempTargetPosition.set(0, 0.5, -2);
        });
        document.getElementById("livingRoomTarget").addEventListener("click", () => {
            console.log("livingRoom selected");
            tempTargetPosition.set(3, 0.5, -2);
        });
    }

    setStartPosition(start) {
        startPosition.set(start.x, start.y, start.z);

        groupID = pathfinding.getGroup(zoneName, start);
        // console.log("GroupID, StartPosition", groupID, start);
        // const startnode = pathfinding.getClosestNode(startPosition, zoneName, groupID);
        // console.log("GroupID, StartPosition, StartNode", groupID, startPosition, startnode);

        // visual for better debugging
        if (!isStartCubeCreated) {
            const startGeometry = new BoxGeometry(0.2, 0.2, 0.2);
            const startMaterial = new MeshBasicMaterial({ color: 0x90c8ff });
            const startCube = new Mesh(startGeometry, startMaterial);
            startCube.position.set(3, 0.5, -2);

            startCube.renderOrder = 3;

            navigationArea.add(startCube);

            isStartCubeCreated = !isStartCubeCreated;
        }
    }

    setTargetPosition(target) {
        targetPosition.set(target.x, target.y, target.z);

        // const endnode = pathfinding.getClosestNode(targetPosition, zoneName, groupID);
        // console.log("GroupID, EndPosition, EndNode", groupID, targetPosition, endnode);

        // visual for better debugging
        if (!isEndCubeCreated) {
            const targetGeometry = new BoxGeometry(0.2, 0.2, 0.2);
            const targetMaterial = new MeshBasicMaterial({ color: 0x90c8ff });
            const targetCube = new Mesh(targetGeometry, targetMaterial);
            targetCube.position.set(0, 0.5, -2);
            targetCube.renderOrder = 3;

            navigationArea.add(targetCube);
            isEndCubeCreated = !isEndCubeCreated;
        }
    }

    calculatePath(timestamp, frame, imageTracking) {
        if (frame) {
            const markerWorldPosition = imageTracking.getMarkerWorldPosition();

            if (markerWorldPosition != zeroVector) {
                // calculate "offseted" positions, as navigation mesh can't be moved/rotated
                const cameraPosition = navigationArea.worldToLocal(camera.position);
                const navStart = new Vector3(cameraPosition.x, 0.5, cameraPosition.z);
                // set endposition to current target
                const navEnd = new Vector3(tempTargetPosition.x, tempTargetPosition.y, tempTargetPosition.z);

                this.setStartPosition(navStart);
                this.setTargetPosition(navEnd);

                const path = pathfinding.findPath(startPosition, targetPosition, zoneName, groupID);
                // console.log("GroupID, Path, StartPosition, EndPosition", groupID, path, startPosition, targetPosition);
                // console.log("Zone", zoneData);

                if (path != null) {
                    const points = [];
                    points.push(navStart);
                    for (let index = 0; index < path.length; index++) {
                        points.push(path[index]);
                        navArrows[index].position.set(path[index].x, 0.2, path[index].z);
                        //direction : setdirection(Vector3().sub(navArrows[index-1].position, navArrows[index].position).normalize());
                        navArrows[index].visible = true;
                    }
                    for (let unsetIndex = path.length; unsetIndex < navArrows.length; unsetIndex++) {
                        navArrows[unsetIndex].position.set(0, 0, 0);
                        navArrows[unsetIndex].visible = false;
                    }
                    line.geometry.setFromPoints(points);
                }
            }
        }
    }
}

export { PathFindingWebXR };

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphDrawer = void 0;
const react_1 = require("react");
const GraphVcService_1 = require("../GraphVcService");
const IdService_1 = require("../IdService");
const LOCATIONS = [
    { x: 33, y: 50 },
    { x: 66, y: 50 },
    { x: 50, y: 33 },
    { x: 50, y: 66 },
];
function getNodes(graph) {
    if (!graph) {
        return {};
    }
    const locations = {};
    let i = 0;
    for (const node of Object.values(graph.nodes)) {
        locations[node.id] = LOCATIONS[i];
        i++;
    }
    return locations;
}
function getEdgeKey(edge) {
    const sortedIds = [edge.source, edge.sink].sort();
    return sortedIds[0] + "-" + sortedIds[1];
}
function getEdges(graph, nodes) {
    if (!graph) {
        return [];
    }
    const edges = [];
    const addedEdges = new Set();
    for (const edge of Object.values(graph.edges)) {
        if (!addedEdges.has(getEdgeKey(edge))) {
            edges.push(<line key={getEdgeKey(edge)} x1={nodes[edge.source].x} y1={nodes[edge.source].y} x2={nodes[edge.sink].x} y2={nodes[edge.sink].y} stroke="green" strokeWidth={5}/>);
            addedEdges.add(getEdgeKey(edge));
        }
    }
    return edges;
}
function GraphDrawer({ graph }) {
    const [clicked, setClicked] = (0, react_1.useState)();
    const [mouseDownLoc, setMouseDownLoc] = (0, react_1.useState)();
    const [moveLoc, setMoveLoc] = (0, react_1.useState)();
    const nodes = getNodes(graph);
    const elements = [...getEdges(graph, nodes)];
    if (clicked && moveLoc && mouseDownLoc) {
        elements.push(<line key="potential-edge" x1={nodes[clicked].x} y1={nodes[clicked].y} x2={nodes[clicked].x + moveLoc.x - mouseDownLoc.x} y2={nodes[clicked].y + moveLoc.y - mouseDownLoc.y} stroke="green" strokeWidth={5}/>);
    }
    if (graph) {
        for (const [nodeId, loc] of Object.entries(nodes)) {
            elements.push(<circle key={nodeId} cx={loc.x} cy={loc.y} r="10" onMouseDown={({ clientX, clientY }) => {
                    setMouseDownLoc({ x: clientX, y: clientY });
                    setClicked(nodeId);
                }} onMouseUp={() => {
                    if (clicked && clicked !== nodeId) {
                        GraphVcService_1.graphVcService.connect(clicked, nodeId);
                    }
                    setClicked(undefined);
                    setMoveLoc(undefined);
                    setMouseDownLoc(undefined);
                }} fill={(0, IdService_1.localId)() === nodeId ? "red" : "black"}></circle>);
        }
    }
    return (<svg height={100} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" onMouseMove={clicked
            ? (e) => {
                const loc = { x: e.clientX, y: e.clientY };
                setMoveLoc(loc);
            }
            : undefined} onMouseUp={() => {
            setClicked(undefined);
            setMoveLoc(undefined);
            setMouseDownLoc(undefined);
        }}>
      {elements}
    </svg>);
}
exports.GraphDrawer = GraphDrawer;

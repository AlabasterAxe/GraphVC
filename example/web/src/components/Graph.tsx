import { useState } from "react";
import { graphVcService } from "../GraphVcService";
import { Graph } from "../model/model";

const LOCATIONS = [
  { x: 33, y: 50 },
  { x: 66, y: 50 },
];

function getNodes(graph: Graph | undefined): {
  [id: string]: { x: number; y: number };
} {
  if (!graph) {
    return {};
  }
  const locations: { [key: string]: { x: number; y: number } } = {};
  let i = 0;
  for (const node of Object.values(graph.nodes)) {
    locations[node.id] = LOCATIONS[i];
    i++;
  }
  return locations;
}

function getEdgeKey(edge: { source: string; sink: string }) {
  const sortedIds = [edge.source, edge.sink].sort();
  return sortedIds[0] + "-" + sortedIds[1];
}

function getEdges(
  graph: Graph | undefined,
  nodes: {
    [id: string]: { x: number; y: number };
  }
) {
  if (!graph) {
    return [];
  }
  const edges = [];
  const addedEdges = new Set<string>();
  for (const edge of Object.values(graph.edges)) {
    if (!addedEdges.has(getEdgeKey(edge))) {
      edges.push(
        <line
          key={getEdgeKey(edge)}
          x1={nodes[edge.source].x}
          y1={nodes[edge.source].y}
          x2={nodes[edge.sink].x}
          y2={nodes[edge.sink].y}
          stroke="green"
          strokeWidth={5}
        />
      );
      addedEdges.add(getEdgeKey(edge));
    }
  }
  return edges;
}

export function GraphDrawer({ graph }: { graph: Graph | undefined }) {
  const [clicked, setClicked] = useState<string | undefined>();
  const [mouseDownLoc, setMouseDownLoc] = useState<
    { x: number; y: number } | undefined
  >();
  const [moveLoc, setMoveLoc] = useState<
    { x: number; y: number } | undefined
  >();

  const nodes = getNodes(graph);
  const elements = [...getEdges(graph, nodes)];
  if (clicked && moveLoc && mouseDownLoc) {
    elements.push(
      <line
        key="potential-edge"
        x1={nodes[clicked].x}
        y1={nodes[clicked].y}
        x2={nodes[clicked].x + moveLoc.x - mouseDownLoc.x}
        y2={nodes[clicked].y + moveLoc.y - mouseDownLoc.y}
        stroke="green"
        strokeWidth={5}
      />
    );
  }
  if (graph) {
    for (const [nodeId, loc] of Object.entries(nodes)) {
      elements.push(
        <circle
          key={nodeId}
          cx={loc.x}
          cy={loc.y}
          r="10"
          onMouseDown={({ clientX, clientY }) => {
            setMouseDownLoc({ x: clientX, y: clientY });
            setClicked(nodeId);
          }}
          onMouseUp={() => {
            if (clicked && clicked !== nodeId) {
              graphVcService.connect(clicked, nodeId);
            }
            setClicked(undefined);
            setMoveLoc(undefined);
            setMouseDownLoc(undefined);
          }}
        />
      );
    }
  }

  return (
    <svg
      height={100}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseMove={
        clicked
          ? (e) => {
              const loc = { x: e.clientX, y: e.clientY };
              setMoveLoc(loc);
            }
          : undefined
      }
      onMouseUp={() => {
        setClicked(undefined);
        setMoveLoc(undefined);
        setMouseDownLoc(undefined);
      }}
      // this doesn't work because mouseout fires when you leave the circle for the node.
      // onMouseOut={() => {
      //   setClicked(undefined);
      //   setMoveLoc(undefined);
      //   console.log("mouse outed");
      // }}
    >
      {elements}
    </svg>
  );
}

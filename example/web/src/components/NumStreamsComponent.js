"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsComponent = void 0;
const StreamContext_1 = require("../StreamContext");
function StatsComponent() {
    const { streams, graph } = (0, StreamContext_1.useStreamContext)();
    return (<ul>
      <li>Number of Streams: {streams.length}</li>
      <li>
        Number of Participants: {graph ? Object.keys(graph.nodes).length : 0}
      </li>
    </ul>);
}
exports.StatsComponent = StatsComponent;

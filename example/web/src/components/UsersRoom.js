"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersRoom = void 0;
const StreamContext_1 = require("../StreamContext");
const Graph_1 = require("./Graph");
function UsersRoom() {
    const { graph } = (0, StreamContext_1.useStreamContext)();
    return <Graph_1.GraphDrawer graph={graph}/>;
}
exports.UsersRoom = UsersRoom;

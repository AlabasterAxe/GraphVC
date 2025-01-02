"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newId = exports.localId = void 0;
const uuid_1 = require("uuid");
const id = (0, uuid_1.v4)();
function localId() {
    return id;
}
exports.localId = localId;
function newId() {
    return (0, uuid_1.v4)();
}
exports.newId = newId;

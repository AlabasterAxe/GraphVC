"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
require("./App.css");
const NumStreamsComponent_1 = require("./components/NumStreamsComponent");
const StreamShower_1 = require("./components/StreamShower");
const StreamContext_1 = require("./StreamContext");
const UsersRoom_1 = require("./components/UsersRoom");
function App() {
    return (<StreamContext_1.StreamContext>
      <div className="App">
        <NumStreamsComponent_1.StatsComponent />
        <StreamShower_1.StreamShower />
        <UsersRoom_1.UsersRoom />
      </div>
    </StreamContext_1.StreamContext>);
}
exports.default = App;

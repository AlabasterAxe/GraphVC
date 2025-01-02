"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamContext = exports.useStreamContext = void 0;
const react_1 = require("react");
const GraphVcService = __importStar(require("./GraphVcService"));
const InnerStreamContext = (0, react_1.createContext)({ streams: [], graph: undefined });
const useStreamContext = () => (0, react_1.useContext)(InnerStreamContext);
exports.useStreamContext = useStreamContext;
function StreamContext({ children }) {
    const [streams, setStreams] = (0, react_1.useState)([]);
    const [graph, setGraph] = (0, react_1.useState)();
    const setStreamsCallback = (0, react_1.useCallback)((streams) => setStreams(streams), [setStreams]);
    const setGraphCallback = (0, react_1.useCallback)((graph) => setGraph(graph), [setGraph]);
    // still unclear to me if this is a reasonable thing to do.
    // do I need the useCallbacks above?
    (0, react_1.useEffect)(() => {
        GraphVcService.registerOnStreamChange(setStreamsCallback);
        GraphVcService.registerOnGraphChange(setGraphCallback);
        return () => {
            GraphVcService.clearOnStreamChange();
            GraphVcService.clearOnGraphChange();
        };
    }, [setStreamsCallback, setGraphCallback]);
    return (<InnerStreamContext.Provider value={{ streams, graph }}>
      {children}
    </InnerStreamContext.Provider>);
}
exports.StreamContext = StreamContext;

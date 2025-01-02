"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoComponent = exports.StreamShower = void 0;
const react_1 = require("react");
const StreamContext_1 = require("../StreamContext");
function StreamShower() {
    const vcState = (0, StreamContext_1.useStreamContext)();
    const result = vcState.streams.map((stream) => (<VideoComponent key={stream.id} stream={stream}/>));
    return <>{result}</>;
}
exports.StreamShower = StreamShower;
function VideoComponent({ stream }) {
    const videoRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, videoRef]);
    return <video ref={videoRef} autoPlay muted></video>;
}
exports.VideoComponent = VideoComponent;

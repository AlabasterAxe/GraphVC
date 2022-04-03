import { useEffect, useRef } from "react";
import { useStreamContext } from "../StreamContext";

export type VideoComponentProps = {
  stream: MediaStream;
};

export function StreamShower() {
  const vcState = useStreamContext();

  const result = vcState.streams.map((stream) => (
    <VideoComponent key={stream.id} stream={stream} />
  ));
  return <>{result}</>;
}

export function VideoComponent({ stream }: VideoComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);
  return <video ref={videoRef} autoPlay muted></video>;
}

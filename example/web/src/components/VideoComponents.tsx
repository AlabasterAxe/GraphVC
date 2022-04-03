export type VideoComponentProps = {
  id: string;
};

export function VideoComponent({ id }: VideoComponentProps) {
  return <video id={id} autoPlay muted></video>;
}

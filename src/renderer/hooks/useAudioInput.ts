import { useState, useCallback, useRef, useEffect } from "react";

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export function useAudioInput() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const initedRef = useRef(false);

  const startAudio = useCallback(async (deviceId?: string) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      streamRef.current = stream;
      const track = stream.getAudioTracks()[0];
      setActiveDeviceId(track.getSettings().deviceId || deviceId || "");
      return stream;
    } catch (e: any) {
      console.error("[Audio] Error:", e);
      return null;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setActiveDeviceId("");
    }
  }, []);

  const enumerate = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = all
      .filter((d) => d.kind === "audioinput")
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
      }));
    setDevices(audioDevices);
    return audioDevices;
  }, []);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    (async () => {
      await startAudio();
      await enumerate();
    })();
  }, [startAudio, enumerate]);

  return {
    devices,
    activeDeviceId,
    stream: streamRef.current,
    startAudio,
    stopAudio,
    enumerate,
  };
}

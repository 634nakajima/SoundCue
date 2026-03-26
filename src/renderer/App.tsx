import { useState, useCallback, useEffect } from "react";
import { useAudioInput } from "./hooks/useAudioInput";
import { useAudioAnalyser } from "./hooks/useAudioAnalyser";
import { useYamnet } from "./hooks/useYamnet";
import { useTeachableMachine } from "./hooks/useTeachableMachine";
import { useMusicInfo } from "./hooks/useMusicInfo";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";

import TabBar, { type TabId } from "./components/TabBar";
import AudioInputSelector from "./components/AudioInputSelector";
import AudioLevelMeter from "./components/AudioLevelMeter";
import OscSettings from "./components/OscSettings";
import OscMonitor from "./components/OscMonitor";

import YamnetTab from "./components/tabs/YamnetTab";
import TeachableMachineTab from "./components/tabs/TeachableMachineTab";
import MusicInfoTab from "./components/tabs/MusicInfoTab";
import SpeechTab from "./components/tabs/SpeechTab";

interface OscMessage {
  address: string;
  value: string;
  timestamp: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("music");
  const [sendHost, setSendHost] = useState("127.0.0.1");
  const [sendPort, setSendPort] = useState(8000);
  const [receivePort, setReceivePort] = useState(9000);
  const [oscMessages, setOscMessages] = useState<OscMessage[]>([]);

  // Audio input
  const { devices, activeDeviceId, stream, startAudio } = useAudioInput();
  const { audioContext, analyserNode, rmsLevel, timeDomainData, frequencyData } =
    useAudioAnalyser(stream);

  // Analysis hooks (only active when their tab is selected)
  const yamnet = useYamnet(audioContext, stream, activeTab === "yamnet");
  const tm = useTeachableMachine(audioContext, stream, activeTab === "tm");
  const musicInfo = useMusicInfo(analyserNode, audioContext, activeTab === "music");
  const speech = useSpeechRecognition(audioContext, stream, activeTab === "speech");

  // Track OSC messages for monitor via main process feedback
  useEffect(() => {
    window.api.onOscSent((address: string, value: string) => {
      setOscMessages((prev) => {
        const next = [...prev, { address, value, timestamp: Date.now() }];
        return next.length > 200 ? next.slice(-100) : next;
      });
    });
    return () => {
      window.api.removeOscSentListener();
    };
  }, []);

  const handleSelectDevice = useCallback(
    (deviceId: string) => {
      startAudio(deviceId);
    },
    [startAudio]
  );

  const handleApplyOsc = useCallback((host: string, sp: number, rp: number) => {
    setSendHost(host);
    setSendPort(sp);
    setReceivePort(rp);
    window.api.updateSendConfig(host, sp);
    window.api.updateReceivePort(rp);
  }, []);

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-gray-900">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 overflow-y-auto">
          {activeTab === "yamnet" && (
            <YamnetTab
              topClasses={yamnet.topClasses}
              ready={yamnet.ready}
              loading={yamnet.loading}
              error={yamnet.error}
              timeDomainData={timeDomainData}
            />
          )}
          {activeTab === "tm" && (
            <TeachableMachineTab
              classes={tm.classes}
              labels={tm.labels}
              ready={tm.ready}
              loading={tm.loading}
              error={tm.error}
              modelUrl={tm.modelUrl}
              onLoadModel={tm.loadModel}
            />
          )}
          {activeTab === "music" && (
            <MusicInfoTab
              pitch={musicInfo.pitch}
              noteName={musicInfo.noteName}
              rms={musicInfo.rms}
              centroid={musicInfo.centroid}
              timeDomainData={timeDomainData}
              frequencyData={frequencyData}
            />
          )}
          {activeTab === "speech" && (
            <SpeechTab
              transcript={speech.transcript}
              interimText={speech.interimText}
              confidence={speech.confidence}
              isListening={speech.isListening}
              language={speech.language}
              statusMessage={speech.statusMessage}
              apiAvailable={speech.apiAvailable}
              modelReady={speech.modelReady}
              modelLoading={speech.modelLoading}
              downloadProgress={speech.downloadProgress}
              modelSize={speech.modelSize}
              onSetLanguage={speech.setLanguage}
              onStart={speech.start}
              onStop={speech.stop}
              onClear={speech.clearTranscript}
              onChangeModelSize={speech.changeModelSize}
            />
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-72 bg-gray-900 border-l border-gray-700 p-3 flex flex-col shrink-0">
        <h1 className="text-lg font-bold text-gray-200 mb-3">SoundCue</h1>

        <AudioInputSelector
          devices={devices}
          activeDeviceId={activeDeviceId}
          onSelect={handleSelectDevice}
        />

        <AudioLevelMeter level={rmsLevel} />

        <OscSettings
          sendHost={sendHost}
          sendPort={sendPort}
          receivePort={receivePort}
          onApply={handleApplyOsc}
        />

        <OscMonitor messages={oscMessages} activeTab={activeTab} />
      </div>
    </div>
  );
}

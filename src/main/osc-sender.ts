import dgram from "node:dgram";
import { encodeOSCMessage, encodeOSCFloat, type OSCArg } from "./osc-protocol";

interface OSCSenderState {
  socket: dgram.Socket | null;
  destHost: string;
  destPort: number;
  enabled: boolean;
  messageCount: number;
}

const state: OSCSenderState = {
  socket: null,
  destHost: "127.0.0.1",
  destPort: 8000,
  enabled: true,
  messageCount: 0,
};

export function initSender(): void {
  if (state.socket) return;
  state.socket = dgram.createSocket("udp4");
  state.socket.on("error", () => {});
}

export function sendOSC(address: string, args: OSCArg[]): void {
  if (!state.socket || !state.enabled) return;
  const buf = encodeOSCMessage(address, args);
  state.socket.send(buf, state.destPort, state.destHost);
  state.messageCount++;
}

export function sendOSCFloat(address: string, value: number): void {
  if (!state.socket || !state.enabled) return;
  const buf = encodeOSCFloat(address, value);
  state.socket.send(buf, state.destPort, state.destHost);
  state.messageCount++;
}

export function setSenderConfig(host: string, port: number): void {
  state.destHost = host;
  state.destPort = port;
}

export function setSenderEnabled(enabled: boolean): void {
  state.enabled = enabled;
}

export function getSenderStatus() {
  return {
    destHost: state.destHost,
    destPort: state.destPort,
    enabled: state.enabled,
    messageCount: state.messageCount,
  };
}

export function closeSender(): void {
  if (state.socket) {
    state.socket.close();
    state.socket = null;
  }
}

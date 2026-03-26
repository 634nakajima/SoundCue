import dgram from "node:dgram";
import { decodeOSCMessage } from "./osc-protocol";

interface OSCReceiverState {
  socket: dgram.Socket | null;
  port: number;
  onMessage: ((address: string, args: Array<{ type: string; value: number | string }>) => void) | null;
}

const state: OSCReceiverState = {
  socket: null,
  port: 9000,
  onMessage: null,
};

export function initReceiver(
  port: number,
  onMessage: (address: string, args: Array<{ type: string; value: number | string }>) => void
): void {
  closeReceiver();
  state.port = port;
  state.onMessage = onMessage;

  state.socket = dgram.createSocket("udp4");
  state.socket.on("message", (msg) => {
    const parsed = decodeOSCMessage(msg);
    if (parsed && state.onMessage) {
      state.onMessage(parsed.address, parsed.args);
    }
  });
  state.socket.on("error", () => {});
  state.socket.bind(port, () => {});
}

export function setReceiverPort(port: number): void {
  if (port === state.port && state.socket) return;
  initReceiver(port, state.onMessage!);
}

export function getReceiverStatus() {
  return {
    port: state.port,
    active: state.socket !== null,
  };
}

export function closeReceiver(): void {
  if (state.socket) {
    try {
      state.socket.close();
    } catch {
      // already closed
    }
    state.socket = null;
  }
}

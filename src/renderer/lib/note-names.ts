const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Convert frequency in Hz to note name (e.g., 440 -> "A4").
 * A4 = 440 Hz, 12-TET tuning.
 */
export function hzToNoteName(freq: number): string {
  if (freq <= 0) return "-";
  const midi = hzToMidi(freq);
  const noteIndex = Math.round(midi) % 12;
  const octave = Math.floor(Math.round(midi) / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Convert frequency in Hz to MIDI note number.
 * A4 (440Hz) = MIDI 69.
 */
export function hzToMidi(freq: number): number {
  return 12 * Math.log2(freq / 440) + 69;
}

/**
 * Convert MIDI note number to frequency in Hz.
 */
export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

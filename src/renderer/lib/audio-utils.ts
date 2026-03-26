/**
 * Autocorrelation-based pitch detection.
 * Returns detected frequency in Hz, or 0 if no clear pitch.
 */
export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;

  // Check if signal is loud enough
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return 0; // Too quiet

  // Trim silence from edges
  let r1 = 0;
  let r2 = SIZE - 1;
  const threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
    } else {
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) {
      r2 = SIZE - i;
    } else {
      break;
    }
  }

  const trimmed = buffer.slice(r1, r2);
  const trimSize = trimmed.length;

  // Autocorrelation
  const correlation = new Float32Array(trimSize);
  for (let lag = 0; lag < trimSize; lag++) {
    let sum = 0;
    for (let i = 0; i < trimSize - lag; i++) {
      sum += trimmed[i] * trimmed[i + lag];
    }
    correlation[lag] = sum;
  }

  // Find the first dip (minimum after the initial peak at lag=0)
  let d = 0;
  while (d < trimSize && correlation[d] > 0) {
    d++;
  }
  if (d >= trimSize) return 0;

  // Find the peak after the dip
  let maxVal = -1;
  let maxPos = d;
  for (let i = d; i < trimSize; i++) {
    if (correlation[i] > maxVal) {
      maxVal = correlation[i];
      maxPos = i;
    }
  }

  // Parabolic interpolation for sub-sample accuracy
  let T0 = maxPos;
  if (T0 > 0 && T0 < trimSize - 1) {
    const x1 = correlation[T0 - 1];
    const x2 = correlation[T0];
    const x3 = correlation[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a !== 0) {
      T0 = T0 - b / (2 * a);
    }
  }

  return sampleRate / T0;
}

/**
 * Compute spectral flux between two FFT magnitude arrays.
 */
export function computeSpectralFlux(
  prev: Float32Array | Uint8Array,
  curr: Float32Array | Uint8Array
): number {
  let flux = 0;
  const len = Math.min(prev.length, curr.length);
  for (let i = 0; i < len; i++) {
    const diff = curr[i] - prev[i];
    if (diff > 0) flux += diff;
  }
  return flux;
}

/**
 * Resample audio buffer from source sample rate to target sample rate.
 */
export function resampleBuffer(
  input: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (sourceSampleRate === targetSampleRate) return input;

  const ratio = targetSampleRate / sourceSampleRate;
  const outputLength = Math.floor(input.length * ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i / ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, input.length - 1);
    const frac = srcIdx - lo;
    output[i] = input[lo] * (1 - frac) + input[hi] * frac;
  }

  return output;
}

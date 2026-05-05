/**
 * Tests for useVoiceRecorder hook.
 * Covers timer behaviour, status transitions, and the formatting helper.
 */

jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  return {
    ...rn,
    Alert: { alert: jest.fn() },
  };
});

jest.mock('../services/speechService', () => ({
  __esModule: true,
  default: {
    start:   jest.fn(),
    stop:    jest.fn(),
    abort:   jest.fn(),
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import speechService from '../services/speechService';

// ─── helpers ─────────────────────────────────────────────────────────────────

function render(onEnd = jest.fn()) {
  return renderHook(() => useVoiceRecorder({ onEnd }));
}

// ─── initial state ────────────────────────────────────────────────────────────

describe('useVoiceRecorder — initial state', () => {
  test('starts in idle status', () => {
    const { result } = render();
    expect(result.current.status).toBe('idle');
  });

  test('starts with empty transcripts and 0 seconds', () => {
    const { result } = render();
    expect(result.current.liveTranscript).toBe('');
    expect(result.current.finalTranscript).toBe('');
    expect(result.current.seconds).toBe(0);
  });
});

// ─── formatTime() ─────────────────────────────────────────────────────────────

describe('useVoiceRecorder — formatTime()', () => {
  test('formats 0 seconds as "0:00"', () => {
    const { result } = render();
    expect(result.current.formatTime(0)).toBe('0:00');
  });

  test('formats 59 seconds as "0:59"', () => {
    const { result } = render();
    expect(result.current.formatTime(59)).toBe('0:59');
  });

  test('formats 60 seconds as "1:00"', () => {
    const { result } = render();
    expect(result.current.formatTime(60)).toBe('1:00');
  });

  test('formats 90 seconds as "1:30"', () => {
    const { result } = render();
    expect(result.current.formatTime(90)).toBe('1:30');
  });

  test('pads single-digit seconds with leading zero', () => {
    const { result } = render();
    expect(result.current.formatTime(61)).toBe('1:01');
  });
});

// ─── startListening() ────────────────────────────────────────────────────────

describe('useVoiceRecorder — startListening()', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sets status to "listening"', () => {
    const { result } = render();
    act(() => { result.current.startListening(); });
    expect(result.current.status).toBe('listening');
  });

  test('clears transcripts before starting', () => {
    const { result } = render();
    // manually set transcript state via a fake prior recording
    act(() => { result.current.startListening(); });
    // speechService.start callback sets onInterim
    const { onInterim } = speechService.start.mock.calls[0][0];
    act(() => { onInterim('some partial text'); });
    expect(result.current.liveTranscript).toBe('some partial text');

    // start again — should clear
    act(() => { result.current.startListening(); });
    expect(result.current.liveTranscript).toBe('');
    expect(result.current.finalTranscript).toBe('');
  });

  test('calls speechService.start()', () => {
    const { result } = render();
    act(() => { result.current.startListening(); });
    expect(speechService.start).toHaveBeenCalledTimes(1);
    expect(speechService.start).toHaveBeenCalledWith(
      expect.objectContaining({
        onInterim: expect.any(Function),
        onFinal:   expect.any(Function),
        onEnd:     expect.any(Function),
        onError:   expect.any(Function),
      })
    );
  });
});

// ─── stopListening() ─────────────────────────────────────────────────────────

describe('useVoiceRecorder — stopListening()', () => {
  beforeEach(() => jest.clearAllMocks());

  test('transitions status to "processing" and calls speechService.stop()', () => {
    const { result } = render();
    act(() => { result.current.startListening(); });
    act(() => { result.current.stopListening(); });
    expect(result.current.status).toBe('processing');
    expect(speechService.stop).toHaveBeenCalledTimes(1);
  });
});

// ─── cancelListening() ───────────────────────────────────────────────────────

describe('useVoiceRecorder — cancelListening()', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns to idle and clears transcripts', () => {
    const { result } = render();
    act(() => { result.current.startListening(); });
    const { onInterim } = speechService.start.mock.calls[0][0];
    act(() => { onInterim('hello'); });

    act(() => { result.current.cancelListening(); });

    expect(result.current.status).toBe('idle');
    expect(result.current.liveTranscript).toBe('');
    expect(result.current.finalTranscript).toBe('');
    expect(speechService.abort).toHaveBeenCalledTimes(1);
  });
});

// ─── onEnd callback ───────────────────────────────────────────────────────────

describe('useVoiceRecorder — onEnd callback', () => {
  beforeEach(() => jest.clearAllMocks());

  test('calls the provided onEnd handler with the full transcript', async () => {
    const onEnd = jest.fn().mockResolvedValue(undefined);
    const { result } = render(onEnd);
    act(() => { result.current.startListening(); });

    const { onEnd: serviceOnEnd } = speechService.start.mock.calls[0][0];
    await act(async () => { await serviceOnEnd('4 bags of cement'); });

    expect(onEnd).toHaveBeenCalledWith('4 bags of cement');
  });

  test('returns to idle after onEnd resolves', async () => {
    const onEnd = jest.fn().mockResolvedValue(undefined);
    const { result } = render(onEnd);
    act(() => { result.current.startListening(); });

    const { onEnd: serviceOnEnd } = speechService.start.mock.calls[0][0];
    await act(async () => { await serviceOnEnd('some text'); });

    expect(result.current.status).toBe('idle');
  });

  test('returns to idle without calling onEnd when transcript is empty', async () => {
    const onEnd = jest.fn();
    const { result } = render(onEnd);
    act(() => { result.current.startListening(); });

    const { onEnd: serviceOnEnd } = speechService.start.mock.calls[0][0];
    await act(async () => { await serviceOnEnd('   '); });

    expect(onEnd).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });
});

// ─── error handling ───────────────────────────────────────────────────────────

describe('useVoiceRecorder — error handling', () => {
  beforeEach(() => jest.clearAllMocks());

  test('shows generic Alert on voice error', () => {
    const { result } = render();
    act(() => { result.current.startListening(); });
    const { onError } = speechService.start.mock.calls[0][0];

    act(() => { onError('Microphone permission denied.'); });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Voice Error',
      'Microphone permission denied.',
      expect.any(Array)
    );
    expect(result.current.status).toBe('idle');
  });

  test('shows setup Alert for NEEDS_DEV_BUILD error code', () => {
    const { result } = render();
    act(() => { result.current.startListening(); });
    const { onError } = speechService.start.mock.calls[0][0];

    act(() => { onError('NEEDS_DEV_BUILD'); });

    expect(Alert.alert).toHaveBeenCalledWith(
      'One-time setup needed',
      expect.stringContaining('npx expo run:android'),
      expect.any(Array)
    );
  });
});

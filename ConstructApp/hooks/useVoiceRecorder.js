/**
 * Shared voice recording hook used by NewRequestScreen and AddItemScreen.
 * Encapsulates the timer, speechService lifecycle, and status transitions
 * so both screens stay in sync with a single implementation.
 */
import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import speechService from '../services/speechService';

/**
 * @param {object} options
 * @param {(fullText: string) => void} options.onEnd   called when recording ends with final text
 */
export default function useVoiceRecorder({ onEnd }) {
  const [status, setStatus] = useState('idle');       // 'idle' | 'listening' | 'processing'
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (status === 'listening') {
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  function startListening() {
    setLiveTranscript('');
    setFinalTranscript('');
    setStatus('listening'); // set before start so sync error callbacks can override

    speechService.start({
      onInterim: (text) => setLiveTranscript(text),
      onFinal:   (text) => { setFinalTranscript(text); setLiveTranscript(text); },
      onEnd: async (fullText) => {
        if (!fullText.trim()) { setStatus('idle'); return; }
        setStatus('processing');
        setFinalTranscript(fullText);
        await onEnd(fullText);
        setStatus('idle');
      },
      onError: (msg) => {
        setStatus('idle');
        if (msg === 'NEEDS_DEV_BUILD') {
          Alert.alert(
            'One-time setup needed',
            'To enable free voice recognition on your phone, run this command once on your PC:\n\nnpx expo run:android\n\nThis builds the app with Google\'s built-in speech engine.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Voice Error', msg, [{ text: 'OK' }]);
        }
      },
    });
  }

  function stopListening() {
    setStatus('processing');
    speechService.stop();
  }

  function cancelListening() {
    speechService.abort();
    setStatus('idle');
    setLiveTranscript('');
    setFinalTranscript('');
  }

  function formatTime(secs) {
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  }

  return {
    status,
    setStatus,
    liveTranscript,
    finalTranscript,
    seconds,
    startListening,
    stopListening,
    cancelListening,
    formatTime,
  };
}

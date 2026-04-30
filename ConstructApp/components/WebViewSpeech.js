/**
 * WebViewSpeech — native speech recognition via a hidden WebView.
 * Uses the device's built-in Chrome/Android speech engine.
 * No API key required. Works in Expo Go on Android.
 *
 * Usage:
 *   const ref = useRef();
 *   <WebViewSpeech ref={ref} onInterim={...} onFinal={...} onEnd={...} onError={...} />
 *   ref.current.start()  / ref.current.stop()  / ref.current.abort()
 */
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const SPEECH_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
var recognition = null;
var accumulated = '';
var stopped = false;

function post(obj) {
  window.ReactNativeWebView.postMessage(JSON.stringify(obj));
}

function startRecognition() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { post({ type: 'error', msg: 'Speech recognition not available on this device.' }); return; }

  stopped = false;
  accumulated = '';
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  recognition.onstart = function() {
    post({ type: 'started' });
  };

  recognition.onresult = function(event) {
    var interim = '';
    var final = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      var t = event.results[i][0].transcript;
      if (event.results[i].isFinal) { final += t; }
      else { interim += t; }
    }
    if (final) {
      accumulated += (accumulated ? ' ' : '') + final.trim();
      post({ type: 'final', text: accumulated });
    }
    if (interim) {
      post({ type: 'interim', text: (accumulated ? accumulated + ' ' : '') + interim });
    }
  };

  recognition.onend = function() {
    recognition = null;
    post({ type: 'end', text: accumulated });
  };

  recognition.onerror = function(event) {
    var map = {
      'not-allowed': 'Microphone access denied. Allow it in device settings.',
      'no-speech': 'No speech detected — speak clearly and try again.',
      'network': 'Network error during speech recognition.',
      'aborted': null
    };
    var msg = map[event.error] !== undefined ? map[event.error] : ('Speech error: ' + event.error);
    if (msg) post({ type: 'error', msg: msg });
  };

  try {
    recognition.start();
  } catch(e) {
    post({ type: 'error', msg: 'Could not start speech recognition: ' + e.message });
  }
}

function stopRecognition() {
  stopped = true;
  if (recognition) { recognition.stop(); }
}

function abortRecognition() {
  stopped = true;
  accumulated = '';
  if (recognition) { recognition.abort(); recognition = null; }
}

document.addEventListener('message', function(e) {
  if (e.data === 'start')  startRecognition();
  if (e.data === 'stop')   stopRecognition();
  if (e.data === 'abort')  abortRecognition();
});
window.addEventListener('message', function(e) {
  if (e.data === 'start')  startRecognition();
  if (e.data === 'stop')   stopRecognition();
  if (e.data === 'abort')  abortRecognition();
});

post({ type: 'ready' });
</script>
</body>
</html>`;

const WebViewSpeech = forwardRef(function WebViewSpeech(
  { onInterim, onFinal, onEnd, onError },
  ref
) {
  const webViewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    start() {
      webViewRef.current?.postMessage('start');
    },
    stop() {
      webViewRef.current?.postMessage('stop');
    },
    abort() {
      webViewRef.current?.postMessage('abort');
    },
  }));

  function handleMessage({ nativeEvent: { data } }) {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (msg.type === 'interim')  onInterim?.(msg.text);
    if (msg.type === 'final')    onFinal?.(msg.text);
    if (msg.type === 'end')      onEnd?.(msg.text);
    if (msg.type === 'error')    onError?.(msg.msg);
  }

  // Only render on native — web already uses Web Speech API directly
  if (Platform.OS === 'web') return null;

  return (
    <WebView
      ref={webViewRef}
      source={{ html: SPEECH_HTML }}
      onMessage={handleMessage}
      style={{ height: 0, width: 0, position: 'absolute' }}
      javaScriptEnabled
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      originWhitelist={['*']}
      onPermissionRequest={(e) => e.request.grant(e.request.resources)}
    />
  );
});

export default WebViewSpeech;

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * TTS hook using Youdao TTS API via server middleware.
 * POST /api/tts { text, voiceName, speed } → returns mp3 audio.
 * Falls back to browser Web Speech API if API fails.
 */
export default function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);
  const abortRef = useRef(null);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setLoading(false);
  }, []);

  const speak = useCallback(async (text) => {
    if (!text) return;
    stop();

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: 'youxiaoke',
          speed: '1',
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`TTS API ${res.status}`);

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('audio')) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'TTS response is not audio');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => { setSpeaking(true); setLoading(false); };
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setSpeaking(false); setLoading(false); URL.revokeObjectURL(url); audioRef.current = null; };

      await audio.play();
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.warn('Youdao TTS failed, falling back to browser TTS:', e.message);
      setLoading(false);
      // Fallback to browser native TTS
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'zh-CN';
        utter.rate = 0.95;
        const voices = window.speechSynthesis.getVoices();
        const zhVoice = voices.find((v) => v.lang.startsWith('zh'));
        if (zhVoice) utter.voice = zhVoice;
        utter.onstart = () => setSpeaking(true);
        utter.onend = () => setSpeaking(false);
        utter.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utter);
      }
    }
  }, [stop]);

  const toggle = useCallback((text) => {
    if (speaking || loading) {
      stop();
    } else {
      speak(text);
    }
  }, [speaking, loading, speak, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, toggle, speaking, loading, supported: true };
}

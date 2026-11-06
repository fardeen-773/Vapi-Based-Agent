import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

type Line = { id: string; role: "user" | "assistant"; text: string };

export function useVapiCall({ publicKey, assistantId }: { publicKey: string; assistantId: string }) {
  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "live">("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [partial, setPartial] = useState({ user: "", assistant: "" });
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const assistantLevel = useRef(0);
  const idCounter = useRef(0);

  useEffect(() => {
    if (!publicKey || !assistantId) return;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => setStatus("live"));
    vapi.on("call-end", () => {
      setStatus("idle");
      setMuted(false);
      setPartial({ user: "", assistant: "" });
      setAssistantSpeaking(false);
    });
    vapi.on("speech-start", () => setAssistantSpeaking(true));
    vapi.on("speech-end", () => setAssistantSpeaking(false));
    vapi.on("volume-level", (l: number) => {
      assistantLevel.current = l;
    });
    vapi.on("error", (e: any) => {
      console.error("Vapi error:", e);
      setError(e?.error?.message || e?.message || JSON.stringify(e));
      setStatus("idle");
    });
    vapi.on("message", (msg: any) => {
      if (msg.type !== "transcript") return;
      const role = msg.role === "user" ? "user" : "assistant";
      if (msg.transcriptType === "partial") {
        setPartial((p) => ({ ...p, [role]: msg.transcript }));
      } else if (msg.transcriptType === "final") {
        setPartial((p) => ({ ...p, [role]: "" }));
        setLines((prev) => [
          ...prev,
          { id: String(idCounter.current++), role, text: msg.transcript },
        ]);
      }
    });

    return () => {
      vapi.removeAllListeners();
      try {
        vapi.stop();
      } catch {}
      vapiRef.current = null;
    };
  }, [publicKey, assistantId]);

  const start = async () => {
    const vapi = vapiRef.current;
    if (!vapi) {
      setError("Vapi initialize nahi hua. Public key / assistant ID check karo.");
      return;
    }
    setError(null);
    setStatus("connecting");
    try {
      await vapi.start(assistantId);
    } catch (e: any) {
      console.error("Start error:", e);
      setError(e?.message ?? "Start failed");
      setStatus("idle");
    }
  };

  const stop = () => vapiRef.current?.stop();

  const toggleMute = () => {
    const v = vapiRef.current;
    if (!v) return;
    const next = !muted;
    v.setMuted(next);
    setMuted(next);
  };

  return { status, muted, error, lines, partial, assistantSpeaking, assistantLevel, start, stop, toggleMute };
}

export function useMicLevel(active: boolean) {
  const level = useRef(0);
  useEffect(() => {
    if (!active) {
      level.current = 0;
      return;
    }
    let ctx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          level.current = Math.min(1, sum / data.length / 128);
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
    };
  }, [active]);
  return level;
}
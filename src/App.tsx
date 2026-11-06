import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { useMicLevel, useVapiCall } from "./useVapiCall";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "muted";

const PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY as string;
const ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID as string;

function Orb({
  state,
  assistantLevel,
  micLevel,
}: {
  state: OrbState;
  assistantLevel: MutableRefObject<number>;
  micLevel: MutableRefObject<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      const target = reduce
        ? 0
        : state === "speaking"
        ? assistantLevel.current
        : state === "listening"
        ? micLevel.current
        : 0;
      smooth += (target - smooth) * 0.25;
      ref.current?.style.setProperty("--level", smooth.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [state, assistantLevel, micLevel]);

  return <div ref={ref} className={`orb orb-${state}`} aria-hidden="true" />;
}

export default function App() {
  const call = useVapiCall({ publicKey: PUBLIC_KEY, assistantId: ASSISTANT_ID });
  const micLevel = useMicLevel(call.status === "live" && !call.muted);

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [call.lines, call.partial]);

  const missingEnv = !PUBLIC_KEY || !ASSISTANT_ID;

  const orbState: OrbState =
    call.status === "idle"
      ? "idle"
      : call.status === "connecting"
      ? "connecting"
      : call.muted
      ? "muted"
      : call.assistantSpeaking
      ? "speaking"
      : "listening";

  const statusText = {
    idle: "Ready when you are",
    connecting: "Connecting…",
    listening: "Listening",
    speaking: "Assistant is speaking",
    muted: "Your microphone is muted",
  }[orbState];

  const live = call.status === "live";
  const hasText = call.lines.length > 0 || call.partial.user || call.partial.assistant;

  return (
    <main className="app">
      <header>
        <h1>Voice assistant</h1>
        <p className="sub">Talk normally. Your words and the replies appear below as they happen.</p>
      </header>

      <section className="stage" aria-label="Call">
        <Orb state={orbState} assistantLevel={call.assistantLevel} micLevel={micLevel} />
        <div className="status" role="status">
          {statusText}
        </div>
        <div className="controls">
          {live ? (
            <>
              <button className="btn btn-quiet" onClick={call.toggleMute} aria-pressed={call.muted}>
                {call.muted ? "Unmute" : "Mute"}
              </button>
              <button className="btn btn-danger" onClick={call.stop}>
                End call
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={call.start}
              disabled={call.status === "connecting" || missingEnv}
            >
              {call.status === "connecting" ? "Connecting…" : "Start talking"}
            </button>
          )}
        </div>
        {missingEnv && (
          <div className="error" role="alert">
            .env file mein VITE_VAPI_PUBLIC_KEY aur VITE_VAPI_ASSISTANT_ID set karo, phir dev server restart karo.
          </div>
        )}
        {call.error && (
          <div className="error" role="alert">
            {call.error}
          </div>
        )}
      </section>

      <section className="transcript" ref={logRef} aria-label="Transcript" aria-live="polite">
        {!hasText && <p className="empty">Press Start talking and speak. Your conversation will show up here.</p>}
        {call.lines.map((l) => (
          <div key={l.id} className={`line line-${l.role}`}>
            <div className="who">{l.role === "user" ? "You" : "Assistant"}</div>
            <div className="text">{l.text}</div>
          </div>
        ))}
        {call.partial.user && (
          <div className="line line-user partial">
            <div className="who">You</div>
            <div className="text">{call.partial.user}</div>
          </div>
        )}
        {call.partial.assistant && (
          <div className="line line-assistant partial">
            <div className="who">Assistant</div>
            <div className="text">{call.partial.assistant}</div>
          </div>
        )}
      </section>
    </main>
  );
}
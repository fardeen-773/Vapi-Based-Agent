# Vapi voice UI (React)

Frontend-only React app (Vite + TypeScript) that talks to a Vapi voice assistant in real time.
It uses the official `@vapi-ai/web` SDK, shows live captions while you and the assistant speak,
and animates a level indicator from your microphone and the assistant's voice.

## 1. Create the assistant

In the Vapi dashboard, create an assistant (pick the model, voice and system prompt there; you can
use Claude as the model if you add your Anthropic key under provider credentials). Copy:

- your **Public Key** (Account settings)
- the **Assistant ID**

## 2. Run it

    npm install
    cp .env.example .env     # fill in both values (or skip and paste them in the app)
    npm run dev

Open the local URL it prints, check the Vapi public key and assistant ID in the setup fields,
then press **Start talking**. You can enter the values directly in the app if you did not create
a `.env` file. Allow the microphone when asked.

## Notes

- Only ever use the **public** key here. Anything in a Vite `.env` is shipped to the browser.
- Values entered in the setup fields stay in the current page and are not saved.
- Microphones need a secure origin: `localhost` works, deployed sites must use HTTPS.
- Everything Vapi-related lives in `src/useVapiCall.ts`; the UI is `src/App.tsx` and `src/styles.css`.
- To change what the assistant says or knows, edit the assistant in the Vapi dashboard, or pass
  overrides as the second argument to `vapi.start(assistantId, overrides)`.

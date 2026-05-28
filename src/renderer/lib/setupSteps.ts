import type { SetupStep } from '../components/InfoTooltip';

export const SETUP_STEPS: Record<string, { title: string; steps: SetupStep[] }> = {
  anthropic: {
    title: 'How to get an Anthropic API Key',
    steps: [
      { step: 1, text: 'Go to', link: { label: 'console.anthropic.com', href: 'https://console.anthropic.com' } },
      { step: 2, text: 'Sign up with email, Google, or GitHub. Verify your email.' },
      { step: 3, text: 'Click your profile (top right) → "API Keys".' },
      { step: 4, text: 'Click "Create Key", name it (e.g. "Bodhaka Forge"), and copy the key (starts with sk-ant-...).' },
      { step: 5, text: 'Paste the key into the field below and click Test.' },
    ],
  },
  openai: {
    title: 'How to get an OpenAI API Key',
    steps: [
      { step: 1, text: 'Go to', link: { label: 'platform.openai.com/api-keys', href: 'https://platform.openai.com/api-keys' } },
      { step: 2, text: 'Sign up or log in. You may need to add a payment method.' },
      { step: 3, text: 'Click "Create new secret key", name it, and select "All" permissions.' },
      { step: 4, text: 'Copy the key (starts with sk-...) — OpenAI will only show it once.' },
      { step: 5, text: 'Paste it below and click Test.' },
    ],
  },
  gemini: {
    title: 'How to get a Google Gemini API Key',
    steps: [
      { step: 1, text: 'Go to', link: { label: 'aistudio.google.com/app/apikey', href: 'https://aistudio.google.com/app/apikey' } },
      { step: 2, text: 'Sign in with your Google account.' },
      { step: 3, text: 'Click "Create API Key" and choose a Google Cloud project (or let it create one).' },
      { step: 4, text: 'Copy the key (starts with AIza...).' },
      { step: 5, text: 'Paste it below and click Test. Gemini has a generous free tier.' },
    ],
  },
  ollama: {
    title: 'How to set up Ollama (run AI locally on your machine)',
    steps: [
      { step: 1, text: 'Download Ollama from', link: { label: 'ollama.com', href: 'https://ollama.com' } },
      { step: 2, text: 'Install it. Ollama runs as a background service on your machine.' },
      { step: 3, text: 'Open Command Prompt or PowerShell and run: ollama pull llama3.2' },
      { step: 4, text: 'Wait for the model to download (about 2GB).' },
      { step: 5, text: 'Confirm Ollama is running at http://localhost:11434 and click Test below.' },
    ],
  },
  smtp: {
    title: 'How to set up Email Sending (SMTP) via Gmail',
    steps: [
      { step: 1, text: 'Enable 2-Step Verification on your Google account at', link: { label: 'myaccount.google.com/security', href: 'https://myaccount.google.com/security' } },
      { step: 2, text: 'Go to', link: { label: 'App Passwords', href: 'https://myaccount.google.com/apppasswords' } },
      { step: 3, text: 'Type "Bodhaka Forge" as the app name and click Create.' },
      { step: 4, text: 'Google shows a 16-character password. Copy it (ignore the spaces).' },
      { step: 5, text: 'Below: Host = smtp.gmail.com, Port = 587, Username = your Gmail address, Password = the 16-char app password.' },
      { step: 6, text: 'Click "Test SMTP Connection" — should show "Verified" inline.' },
    ],
  },
  twilio: {
    title: 'How to set up WhatsApp via Twilio (free sandbox)',
    steps: [
      { step: 1, text: 'Sign up at', link: { label: 'twilio.com', href: 'https://www.twilio.com/try-twilio' } },
      { step: 2, text: 'On the Twilio Console homepage, find "Account Info" — copy your Account SID and Auth Token.' },
      { step: 3, text: 'Go to', link: { label: 'WhatsApp Sandbox', href: 'https://www.twilio.com/console/sms/whatsapp/sandbox' } },
      { step: 4, text: 'Twilio shows you a join code (e.g. "join hidden-trees"). Open WhatsApp on your phone and send that exact message to the Twilio number shown.' },
      { step: 5, text: 'Below: paste Account SID, Auth Token, and use whatsapp:+14155238886 (or your assigned Twilio number) as the From.' },
      { step: 6, text: 'Click "Test Twilio Credentials". Note: sandbox sends only to opted-in numbers.' },
    ],
  },
  tavily: {
    title: 'How to get a Tavily Search API Key (recommended)',
    steps: [
      { step: 1, text: 'Sign up at', link: { label: 'app.tavily.com', href: 'https://app.tavily.com/' } },
      { step: 2, text: 'Go to the API Keys page and create a new key.' },
      { step: 3, text: 'Copy the key (starts with tvly-...).' },
      { step: 4, text: 'Paste it below. You get 1,000 free searches per month.' },
    ],
  },
  brave: {
    title: 'How to get a Brave Search API Key (alternative)',
    steps: [
      { step: 1, text: 'Sign up at', link: { label: 'api.search.brave.com/app/keys', href: 'https://api.search.brave.com/app/keys' } },
      { step: 2, text: 'Choose the Free plan (no credit card needed) — 2,000 queries/month.' },
      { step: 3, text: 'Create a key and copy it (starts with BSA...).' },
      { step: 4, text: 'Paste it below.' },
    ],
  },
};

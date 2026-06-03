import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Logo } from './Logo';
import { ExtLink } from './ExtLink';

interface DisclaimerProps {
  onAccepted: () => void;
}

export function Disclaimer({ onAccepted }: DisclaimerProps) {
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  useEffect(() => {
    window.api.acceptance.get().then((record) => {
      if (record?.accepted) {
        onAccepted();
      } else {
        setShow(true);
      }
    });
  }, []);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setScrolledToEnd(true);
  }

  async function accept() {
    setAccepting(true);
    await window.api.acceptance.accept();
    setShow(false);
    onAccepted();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur">
      <div className="bg-bg-layer dark:bg-bg-dark-layer rounded-win shadow-win-flyout max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border dark:border-border-dark flex items-center gap-4">
          <Logo size={48} />
          <div>
            <h2 className="text-xl font-semibold">Welcome to Bodhaka Dispatcher</h2>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark mt-0.5">
              Please read and accept the terms below to continue.
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 text-[13px] leading-relaxed space-y-4 text-text-primary dark:text-text-primary-dark"
        >
          <section>
            <h3 className="font-semibold text-brand mb-1.5">1. Acceptance of Terms</h3>
            <p>
              By installing, accessing, or using Bodhaka Dispatcher ("the Software"), a product of
              <strong> BuoyantWave Learning Technologies LLP</strong> ("the Company"), you ("the User") agree to be bound by
              these Terms of Use and the Disclaimer set out below. If you do not agree to these terms,
              you must not install or use the Software.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">2. Permitted Use</h3>
            <p>
              Bodhaka Dispatcher is provided strictly for <strong>personal, non-commercial educational use</strong> by individual students,
              learners, and educators. Permitted uses include:
            </p>
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
              <li>Studying, summarizing, and organizing your own academic material</li>
              <li>Building agents that help you learn, plan, or stay motivated</li>
              <li>Personal research and exploration of topics that interest you</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">3. Strictly Personal Use, No Bulk Messaging</h3>
            <p>
              Bodhaka Dispatcher is a <strong>personal-use-only application intended solely for your own learning and education</strong>.
              You agree that you will <strong>NOT</strong> use the Software, or any agent built with it, to send bulk, automated,
              unsolicited, or mass email or WhatsApp messages to any third party. The email address and phone number you configure
              are restricted to your own verified contact details, and agents may only deliver messages to you.
            </p>
            <p className="mt-1.5">
              Any use of this Software to send communications for marketing, spam, solicitation, phishing, or any purpose other than
              your own personal learning is <strong>strictly prohibited and may be unlawful</strong> under applicable telecommunications,
              data protection, and anti-spam laws (including but not limited to the Indian Information Technology Act, 2000, TRAI
              regulations, GDPR, and the CAN-SPAM Act). You accept sole legal responsibility for any misuse.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">4. Prohibited Use</h3>
            <p>You further agree NOT to use the Software, or any agent created with it, for:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
              <li>Any unlawful, fraudulent, deceptive, or harmful purpose</li>
              <li>Academic dishonesty, including generating answers for examinations where AI assistance is not permitted</li>
              <li>Creating, distributing, or facilitating content that harasses, defames, threatens, or endangers any person</li>
              <li>Generating malware, phishing content, hate speech, child sexual abuse material (CSAM), or content infringing others' intellectual property</li>
              <li>Impersonating any person or entity, or misrepresenting your affiliation</li>
              <li>Any commercial use, reselling, or sublicensing without express written permission from the Company</li>
              <li>Activities that violate the laws of India or your local jurisdiction</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">5. Third-Party Services & Your Own Credentials</h3>
            <p>
              The Software allows you to connect your own API keys and credentials (Anthropic, OpenAI, Google, Twilio, SMTP,
              search providers, etc.). You are <strong>solely responsible</strong> for: (a) the costs incurred under those accounts,
              (b) compliance with each third party's terms of service, and (c) the security of your credentials. The Company
              does not transmit, store on its servers, or have any access to your API keys.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">6. AI-Generated Content &amp; AI Safety Responsibility</h3>
            <p>
              Content produced by the Software is generated by third-party AI models and may be inaccurate, incomplete,
              biased, or unsuitable for your purpose. You must <strong>independently verify</strong> any factual, legal, medical,
              financial, or safety-related output before acting on it. The Company makes no warranty as to the accuracy or
              fitness of AI-generated content.
            </p>
            <p className="mt-2">
              <strong>AI safety is the sole responsibility of the user and the chosen AI provider.</strong> The user is
              solely responsible for the prompts and inputs they provide, for designing agents in a safe and lawful manner,
              for verifying outputs, and for the consequences of using AI-generated content. The chosen AI provider (such
              as Anthropic, OpenAI, Google, or any locally-run model) is responsible for the behavior of its model and any
              safety guardrails it applies. <strong>The Company (BuoyantWave Learning Technologies LLP) does not control,
              train, fine-tune, or monitor any AI model, and provides no safety guarantees regarding AI outputs.</strong> The
              Software includes basic content filtering as a courtesy layer of defense, but this filtering is not exhaustive
              and is not a substitute for the user's own judgment or the AI provider's guardrails.
            </p>
            <p className="mt-2">
              <strong>You fully and irrevocably indemnify and hold harmless BuoyantWave Learning Technologies LLP, its
              directors, employees, and affiliates from any and all claims, damages, losses, liabilities, costs, or expenses
              arising from or related to AI-generated content, AI safety, prompts you provided, agents you designed, or the
              behavior of any AI provider you chose to use.</strong>
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">7. Disclaimer of Warranties</h3>
            <p>
              The Software is provided <strong>"AS IS" and "AS AVAILABLE"</strong>, without warranty of any kind, whether express,
              implied, statutory, or otherwise, including without limitation warranties of merchantability, fitness for a
              particular purpose, non-infringement, or uninterrupted operation.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">8. Limitation of Liability</h3>
            <p>
              To the maximum extent permitted by law, in no event shall BuoyantWave Learning Technologies LLP, its directors,
              employees, or affiliates be liable for any indirect, incidental, special, consequential, exemplary, or punitive
              damages, including loss of data, loss of profits, or loss of academic standing, arising out of or in connection
              with your use of the Software, even if advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">9. Indemnity</h3>
            <p>
              You agree to indemnify and hold harmless the Company against any claims, damages, or expenses arising from
              your misuse of the Software, your violation of these terms, or your infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">10. Data Storage & Record of Acceptance</h3>
            <p>
              All your data, settings, API keys, uploaded documents, agents, and run history, is stored
              <strong> only on your local device</strong>. The Company does not collect or transmit your usage data.
            </p>
            <p className="mt-1.5">
              For our internal compliance records, when you accept this agreement, a record is stored on your device
              containing: the date and time of acceptance, the app version, the machine hostname, and the operating system.
              <strong> No IP address, no personal identifiable information, and no usage telemetry are collected.</strong>
              This record is kept locally on your device only.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">11. Modifications</h3>
            <p>
              The Company may update these terms with new releases of the Software. Continued use after an update constitutes
              acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">12. Governing Law</h3>
            <p>
              These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of
              the courts of Bengaluru, Karnataka.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-brand mb-1.5">13. Contact</h3>
            <p>
              For questions about these terms, visit <ExtLink href="https://bodhaka.org">bodhaka.org</ExtLink>.
            </p>
          </section>

          <section className="pt-2 border-t border-border dark:border-border-dark">
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark italic">
              Bodhaka Dispatcher is a product of BuoyantWave Learning Technologies LLP. By continuing, you confirm that you have
              read, understood, and agree to all the terms above, and that you will use the Software responsibly and lawfully.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border dark:border-border-dark space-y-3">
          {!scrolledToEnd && (
            <p className="text-[11px] text-text-tertiary text-center">
              ↓ Please scroll through the full terms to continue
            </p>
          )}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={!scrolledToEnd}
              className="mt-0.5"
            />
            <span className="text-[13px] text-text-primary dark:text-text-primary-dark leading-relaxed">
              I have read and agree to the Terms of Use and Disclaimer above. I will use Bodhaka Dispatcher solely for
              personal educational purposes and will not use it for any unlawful or harmful purpose.
            </span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => window.api.shell.forceQuit()}
              className="btn-secondary flex-1"
              disabled={accepting}
            >
              I do not agree. Exit
            </button>
            <button
              onClick={accept}
              disabled={!checked || accepting}
              className="btn-primary flex-1"
            >
              {accepting ? <Loader2 size={14} className="animate-spin" /> : null}
              Accept and Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

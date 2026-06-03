/**
 * Content safety filter.
 *
 * Runs on AI responses, web-search results, and any text about to be transmitted
 * (email / WhatsApp / saved file / displayed). It is BALANCED: it blocks clear
 * how-to instructions for serious harm, but does NOT block educational
 * discussion of difficult topics. For example:
 *
 *   "What is depression?"                       — allowed (educational)
 *   "Here is how to take your own life..."      — BLOCKED (clear self-harm how-to)
 *   "How did the Manhattan Project work?"       — allowed (history)
 *   "Step-by-step: build a working pipe bomb"   — BLOCKED (weapon instruction)
 *
 * The filter is not a perfect shield. It is one honest layer of defense alongside
 * the AI providers' own safety guardrails. It runs entirely in the main process
 * (never trusts the renderer) and never makes a network call.
 */

export type SafetyResult = {
  safe: boolean;
  reason?: string;        // brief, user-friendly category for the UI
  matchedPattern?: string; // internal — for logging only, not shown to user
};

/**
 * Each category contains regular expressions tuned for HOW-TO / INSTRUCTION style
 * content, not mere mentions. We require:
 *   - an explicit instruction verb (how to, steps to, instructions for, guide,
 *     tutorial, recipe, method, way to)
 *   - close to a harm noun (with proximity via .{0,N})
 * This avoids blocking "How did Marie Curie discover radium" while catching
 * "How to make a bomb at home."
 */
const PATTERNS: { category: string; rx: RegExp }[] = [
  // Self-harm methods (explicit instructions only)
  { category: 'self-harm methods', rx: /\b(how\s+(to|i\s+can)|step[\s-]?by[\s-]?step|instructions?\s+(for|to)|guide\s+to|method\s+to|easiest\s+way\s+to)\b.{0,80}\b(kill\s+(myself|yourself)|commit(ting)?\s+suicide|end\s+(my|your)\s+life|hang\s+(myself|yourself)|overdose\s+on)\b/i },
  { category: 'self-harm methods', rx: /\b(lethal\s+dose|fatal\s+dose|effective\s+method)\b.{0,40}\b(suicide|self[\s-]?harm|kill\s+(myself|oneself))\b/i },

  // Detailed drug-making / hard-drug use instructions
  { category: 'drug manufacturing', rx: /\b(how\s+to|step[\s-]?by[\s-]?step|instructions?\s+(for|to)|guide\s+to|recipe\s+for|synthesi[sz]e)\b.{0,80}\b(meth(amphetamine)?|cocaine|heroin|fentanyl|crack\s+cocaine|crystal\s+meth|lsd|mdma)\b/i },
  { category: 'drug manufacturing', rx: /\b(cook|make|manufacture|produce|prepare)\b.{0,30}\b(meth(amphetamine)?|crystal\s+meth|crack\s+cocaine|heroin|fentanyl)\b.{0,60}\b(at\s+home|kitchen|lab|step|recipe|guide|how)\b/i },

  // Weapons / explosives (instruction-style)
  { category: 'weapon instructions', rx: /\b(how\s+to|step[\s-]?by[\s-]?step|instructions?\s+(for|to)|guide\s+to|build|construct|assemble|make)\b.{0,60}\b(pipe\s*bomb|nail\s*bomb|ied|improvised\s+explosive|nerve\s+agent|chemical\s+weapon|biological\s+weapon|dirty\s+bomb|silencer|untraceable\s+(gun|firearm)|ghost\s+gun)\b/i },
  { category: 'weapon instructions', rx: /\b(synthesi[sz]e|make|produce|create)\b.{0,40}\b(sarin|vx\s+nerve|mustard\s+gas|ricin|anthrax|chlorine\s+gas|tnt|c-?4|nitroglycerin)\b/i },

  // Sexual content involving minors (zero tolerance, ANY mention)
  { category: 'minors safety', rx: /\b(child|children|minor|underage|kid|teen|teenager|preteen|13\s*[-\s]?year|14\s*[-\s]?year|15\s*[-\s]?year|16\s*[-\s]?year|17\s*[-\s]?year)\b.{0,40}\b(sexual|sexually|erotic|nude|naked|porn|sex\s+act|intercourse|fondle|groom|seduce)\b/i },
  { category: 'minors safety', rx: /\b(sexual|sexually|erotic|nude|naked|porn|sex\s+act|intercourse)\b.{0,40}\b(child|children|minor|underage|kid|preteen|teen)\b/i },

  // Explicit pornographic content
  { category: 'explicit sexual content', rx: /\b(graphic|explicit|hardcore|xxx)\b.{0,30}\b(porn|pornograph|sexual\s+content|sex\s+scene)\b/i },
  { category: 'explicit sexual content', rx: /\b(write|generate|create|describe)\b.{0,30}\b(porn|pornograph|sexually\s+explicit|erotic\s+story|sex\s+story)\b/i },

  // Targeted violence against real people
  { category: 'targeted violence', rx: /\b(how\s+to|step[\s-]?by[\s-]?step|instructions?\s+(for|to)|plan\s+to|guide\s+to)\b.{0,60}\b(murder|kill|assassinate|attack|stab|shoot|poison)\s+(a|my|the|someone|specific|person|people|named)\b/i },

  // Clear illegal-activity how-to (hacking, fraud, trafficking)
  { category: 'illegal activity', rx: /\b(how\s+to|step[\s-]?by[\s-]?step|instructions?\s+(for|to)|guide\s+to|tutorial\s+(on|for))\b.{0,60}\b(hack\s+into|crack\s+passwords?|bypass\s+(security|2fa|authentication)|sql\s+inject|ddos\s+attack|phish|forge\s+(passport|id|signature|check)|launder\s+money|evade\s+taxes|smuggle\s+(drugs|people)|stalk\s+(someone|a\s+person))\b/i },
];

/**
 * Check a string for unsafe content. Returns { safe: true } if clean, otherwise
 * an explanation suitable for showing the user.
 */
export function checkContentSafety(text: string): SafetyResult {
  if (!text || typeof text !== 'string') return { safe: true };
  const sample = text.slice(0, 100000); // cap input size for safety
  for (const { category, rx } of PATTERNS) {
    const m = sample.match(rx);
    if (m) {
      return {
        safe: false,
        reason: category,
        matchedPattern: m[0].slice(0, 120),
      };
    }
  }
  return { safe: true };
}

/**
 * Friendly, non-scary message for the user when content is blocked.
 * Keeps the tone calm and avoids scaring or accusing the user.
 */
export function safetyBlockMessage(reason?: string): string {
  return (
    `This response was held back because it may contain content that does not ` +
    `fit the educational use of this app (${reason || 'unsafe content'}). ` +
    `Nothing was sent or saved. Please rephrase your request or try a different topic.`
  );
}

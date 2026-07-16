// Curated demonstration wiki — a hand-written encyclopedia used before the user
// has captured anything of their own, so the Wiki tab reads like a well-kept
// knowledge base on first open rather than an empty page.
//
// Each article is synthesised (in the fiction of the demo) from the source
// observations in lib/seed.js — it cites them by id, and its prose stays
// faithful to what those notes actually say. Together the articles walk the
// app's eighteen user journeys, and each one carries that journey's full arc:
//
//   observation    — what was noticed
//   analysis       — what it might mean
//   efflorescence  — what emerged (an idea / question / thing to make …)
//   attribution    — how it is known (provenance)
//   safety         — sensitivity / care
//   responsibility — the duty the article holds itself to
//
// Prose supports lightweight markup: **bold**, *italic*, and [[Article Title]]
// or [[Article Title|shown text]] wikilinks. Only link to titles that exist in
// ARTICLES — WikiCurated resolves them by title.

// The user journeys, in order, as browsable categories. The emblem gives each a
// visual identity across cards, chips, and article headers.
export const CATEGORIES = [
  { name: "Cultural appreciation", emblem: "🏮" },
  { name: "World risk awareness", emblem: "⚠️" },
  { name: "Care", emblem: "🤲" },
  { name: "Moral philosophy", emblem: "⚖️" },
  { name: "Epistemology", emblem: "🔍" },
  { name: "Creativity", emblem: "🎛️" },
  { name: "Future modelling", emblem: "🔭" },
  { name: "Learning", emblem: "📚" },
  { name: "Leisure", emblem: "⚽" },
  { name: "Calmness and groundedness", emblem: "🍃" },
  { name: "Love of life and benevolence", emblem: "✨" },
  { name: "Love of the world and society", emblem: "🌏" },
  { name: "Love of the conversational partner", emblem: "👂" },
  { name: "Universal love for all", emblem: "❤️" },
  { name: "Noticing, observing, awareness", emblem: "👁️" },
  { name: "Skill, mastery, artisanry", emblem: "🎯" },
  { name: "Ingenuity and problem solving", emblem: "🧩" },
  { name: "Stewardship", emblem: "🌱" },
];

export const categoryEmblem = (name) =>
  CATEGORIES.find((c) => c.name === name)?.emblem ?? "📄";

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 0, 0, 0);
  return d;
};

function article(a) {
  return { updatedDaysAgo: 0, seeAlso: [], sourceIds: [], sections: [], ...a };
}

export const ARTICLES = [
  article({
    slug: "voice-cloning",
    title: "Voice Cloning and the Trust Attack",
    category: "World risk awareness",
    lens: "Risk",
    featured: true,
    updatedDaysAgo: 3,
    excerpt:
      "Why the newest scams don't attack your devices — they attack the trust between people who love each other.",
    lead:
      "**Voice cloning** turns thirty seconds of recorded speech into a synthetic voice convincing " +
      "enough to impersonate a family member in real time. The resulting scams — a panicked call " +
      "from a 'relative' who needs money wired *now* — are not really an attack on technology. They " +
      "are an attack on **trust**, and you cannot out-tech a forged voice.",
    sections: [
      {
        heading: "The attack surface is a relationship",
        body:
          "A grandmother takes a call in what sounds exactly like her grandson's voice, crying, " +
          "needing bail money — while he sleeps three suburbs away. The forgery works because love " +
          "makes us act before we verify. The only durable defence is a shared secret the forgery " +
          "cannot know: a family *safe-word*, plus the discipline to hang up and call back on a " +
          "number you already trust.",
      },
      {
        heading: "Provenance over plausibility",
        body:
          "The deeper lesson is one of [[Lying with a True Axis|provenance]]: a message that sounds " +
          "authentic is not the same as one whose origin you have checked. The same instinct that " +
          "spots a scam call should audit the persuasive dashboard and the viral chart.",
      },
    ],
    observation:
      "Nora rang shaken — a call in what sounded exactly like cousin Jesse's voice, needing bail " +
      "money wired immediately. Jesse was asleep three suburbs away.",
    analysis:
      "The attack surface isn't the technology, it's the trust between people who love each other. " +
      "You can only agree in advance on a secret the forgery won't know.",
    efflorescence: {
      type: "something to protect",
      text: "Set a family safe-word this week, and teach Nora to hang up and call back on a known number — always.",
    },
    attribution: "Reported by Nora over the phone; corroborated by confirming Jesse was safe and asleep.",
    safety:
      "Marked sensitive — it involves a frightened family member and a live financial threat, kept within the family.",
    responsibility:
      "To warn without amplifying panic: name the specific, calm countermeasure rather than the fear.",
    seeAlso: ["lying-with-a-true-axis", "dark-patterns", "the-shape-of-an-absence"],
    sourceIds: ["seed-safe-word"],
  }),

  article({
    slug: "ritual-and-reciprocity",
    title: "Ritual and Reciprocity",
    category: "Cultural appreciation",
    lens: "Culture",
    updatedDaysAgo: 1,
    excerpt:
      "A lunchtime lion dance, and the difference between watching a tradition and understanding what it does.",
    lead:
      "**Ritual** often looks, to an outsider, like performance — but many rituals are really engines " +
      "of **reciprocity**, circulating obligation and blessing through a community. To appreciate a " +
      "culture is to see the machinery beneath the spectacle.",
    sections: [
      {
        heading: "The bow is not a show",
        body:
          "A lion dance winds between office towers, bowing at each shopfront for red envelopes. To " +
          "the crowd filming it, street theatre; in fact a live economy of blessing and obligation — " +
          "the shop is meant to pay the luck forward all year. The meaning *is* the culture, not the " +
          "choreography.",
      },
      {
        heading: "Appreciation without extraction",
        body:
          "The honest question, shared with [[Found Sound]], is where appreciation ends and " +
          "extraction begins — when a hundred raised phones turn a blessing into content. Reciprocity " +
          "recurs across this wiki: from [[The Commons Precipitate|a shared garden]] to " +
          "[[Leave It Better|a tended codebase]], nothing is meant to leave empty-handed.",
      },
    ],
    observation:
      "A lion dance troupe stopping traffic on George Street at lunch, bowing at each shopfront for red envelopes.",
    analysis:
      "What read as spectacle to the crowd was a live economy of blessing and obligation — the culture is the meaning, not the show.",
    efflorescence: {
      type: "something to appreciate",
      text: "Ask Priya to walk me through the troupe's etiquette before next year — and watch it without filming.",
    },
    attribution: "Seen first-hand at street level; the meaning explained by Priya, whose cousins run the troupe.",
    safety: "None — a public celebration, appreciated openly.",
    responsibility:
      "To learn a tradition from the people who hold it, rather than flattening it into a backdrop.",
    seeAlso: ["found-sound", "the-commons", "the-contagion-of-kindness"],
    sourceIds: ["seed-lion-dance"],
  }),

  article({
    slug: "the-shape-of-an-absence",
    title: "The Shape of an Absence",
    category: "Care",
    lens: "Care",
    updatedDaysAgo: 5,
    excerpt:
      "How care often begins by reading a pattern nobody said out loud — and being willing to look foolish for asking.",
    lead:
      "**Care** frequently starts not with what someone says but with the *shape of their absence* — " +
      "a camera left off, messages shrinking to reactions, commits appearing at 2am. Noticing the " +
      "pattern, and being willing to look foolish for asking about it, is the first act of care.",
    sections: [
      {
        heading: "The signal in the silence",
        body:
          "A teammate goes quiet for a week, then pushes code at 2am and again at 6am. The " +
          "message — *'not about work — you okay?'* — turns into an hour-long call. The data was " +
          "never in his words; it was in the geometry of his withdrawal, read with the same attention " +
          "[[Signal and Noise|an anomaly hunter]] gives a flat graph.",
      },
      {
        heading: "Care that treats the cause",
        body:
          "Reaching out can risk adding *'manage my lead's worry'* to an already heavy load. Real " +
          "care looks past the symptom to the system — quietly covering his on-call, and asking " +
          "whether the team's workload is the actual leak, in the spirit of [[The Upstream Fault]]. " +
          "When it is time to talk, [[Steelmanning|hearing his case first]] does more than any fix.",
      },
    ],
    observation:
      "A teammate's camera off for a week, messages down to thumbs-up reacts, and commits landing at 2am and 6am.",
    analysis:
      "The signal wasn't in what he said but in the shape of his absence. Care starts as noticing a pattern and risking the awkward question.",
    efflorescence: {
      type: "something to do",
      text: "Quietly cover his on-call this fortnight, and check whether the team's load is the actual leak.",
    },
    attribution: "Inferred from behaviour over a week, then confirmed directly in a one-to-one call.",
    safety: "Marked sensitive — another person's private struggle, held in confidence and not raised in the open channel.",
    responsibility: "To offer help that lightens the load, not help that adds the burden of being worried about.",
    seeAlso: ["steelmanning", "signal-and-noise", "the-upstream-fault"],
    sourceIds: ["seed-quiet-teammate"],
  }),

  article({
    slug: "dark-patterns",
    title: "Dark Patterns",
    category: "Moral philosophy",
    lens: "Values",
    updatedDaysAgo: 8,
    excerpt:
      "A small betrayal, amortised across a million users so no single one is big enough to feel.",
    lead:
      "A **dark pattern** is an interface deliberately designed to trick users into choices they " +
      "would not freely make — a default toggled on, an off-switch buried two screens deep, all " +
      "dressed as *'reducing friction'*. Morally, it is a small betrayal amortised across a million " +
      "users, so no single instance is large enough to register.",
    sections: [
      {
        heading: "The test of a value",
        body:
          "A value is only a value if it can cost you something. Lifting retention 4% by burying a " +
          "setting is the exact move we resent when other apps pull it on us. The test is whether the " +
          "principle survives the 4% — otherwise it is merely a preference we hold when it is free.",
      },
      {
        heading: "Whose luxury is integrity?",
        body:
          "There is an honest doubt here: is refusing the easy win principled, or a luxury afforded " +
          "by not carrying the growth target? The discipline — write down what you would want done " +
          "to you — connects to [[Lying with a True Axis]] and to " +
          "[[Voice Cloning and the Trust Attack|the ethics of earned trust]].",
      },
    ],
    observation:
      "A product review proposing to default notifications on and bury the off-switch — labelled 'reducing friction'.",
    analysis:
      "A dark pattern is a betrayal too small to feel per user. The test of a value is whether it costs you the 4%.",
    efflorescence: {
      type: "a question",
      text: "Argue for opt-in as the default and measure honest retention instead. Write down what I'd want done to me.",
    },
    attribution: "Seen first-hand in a product review; Priya flagged the same trick in dashboards the team ships.",
    safety: "No personal sensitivity, but real stakes for a million users — treated as a genuine ethical decision, not a debate.",
    responsibility: "To argue the harder, honest design where it counts — in the meeting, not just the notebook.",
    seeAlso: ["lying-with-a-true-axis", "voice-cloning", "leave-it-better"],
    sourceIds: ["seed-dark-pattern"],
  }),

  article({
    slug: "lying-with-a-true-axis",
    title: "Lying with a True Axis",
    category: "Epistemology",
    lens: "Truth & evidence",
    updatedDaysAgo: 11,
    excerpt:
      "Every number real, and the whole thing deceptive — because truth and framing are independent variables.",
    lead:
      "**Lying with a true axis** names a deception in which every figure is accurate yet the whole " +
      "misleads — a chart showing 'collapse' whose y-axis quietly starts at 94%. Truth and framing " +
      "are independent variables, exactly as **confidence** and **accuracy** are.",
    sections: [
      {
        heading: "Framing does the deceiving",
        body:
          "A fact can be marshalled to mislead without a single false number in it. The same trick " +
          "that fuels a viral post hides in half the dashboards a team ships itself. Calibrated " +
          "thinking asks not only *'is this true?'* but *'is this framed to make me feel something " +
          "the evidence doesn't support?'*",
      },
      {
        heading: "Auditing your own axes",
        body:
          "The hard part is auditing your *own* charts without curdling into someone who distrusts " +
          "every graph on principle. A simple habit — *does the axis start at zero, and should it?* — " +
          "is the epistemic cousin of [[Voice Cloning and the Trust Attack|checking provenance]] and " +
          "of resisting [[Dark Patterns]].",
      },
    ],
    observation:
      "A viral post showing a 'collapse' that vanished once you noticed the y-axis began at 94%.",
    analysis:
      "Truth and framing are independent variables, like confidence and accuracy. A fact can mislead without a false number in it.",
    efflorescence: {
      type: "something to learn",
      text: "Read up on calibration and axis honesty; add a 'does the axis start at zero, and should it?' step to our review.",
    },
    attribution: "Seen on a social feed; the recurring pattern pointed out by Priya from the team's own dashboards.",
    safety: "None.",
    responsibility: "To hold your own charts to the standard you demand of others' — scepticism turned inward first.",
    seeAlso: ["voice-cloning", "dark-patterns", "signal-and-noise"],
    sourceIds: ["seed-misleading-chart"],
  }),

  article({
    slug: "found-sound",
    title: "Found Sound",
    category: "Creativity",
    lens: "Creativity",
    updatedDaysAgo: 14,
    excerpt:
      "A bus-brake squeal, pitched down two octaves, becomes a bassline — creativity as re-hearing the ordinary.",
    lead:
      "**Found sound** is the practice of building music from noises never meant as music — a " +
      "pneumatic brake, a train door, a squeal from the street. It reframes creativity as *re-hearing* " +
      "the ordinary as raw material rather than inventing from nothing.",
    sections: [
      {
        heading: "The city as co-writer",
        body:
          "Sample the hiss of a bus's brakes, pitch it down two octaves, and it becomes a bassline; " +
          "four studio hours later there's a track that began as street noise nobody else heard as " +
          "music. The interesting edge is where deliberate craft meets a sound you didn't compose — " +
          "the city co-wrote it, much as chance co-writes a print.",
      },
      {
        heading: "Consent and the sampled world",
        body:
          "Sampling raises an honest question: when does it honour a source and when does it " +
          "strip-mine it? A bus cannot consent, but people can — a thread shared with " +
          "[[Ritual and Reciprocity]]. The same patient ear that finds music in noise finds the " +
          "[[Signal and Noise|3ms sawtooth in a flat graph]].",
      },
    ],
    observation:
      "Sampling the 380 bus's brake squeal, pitching it down two octaves, and building a whole track around it with Eric.",
    analysis:
      "Creativity is mostly re-hearing the ordinary as raw material; the good edge is where craft meets a sound you didn't compose.",
    efflorescence: {
      type: "something to make",
      text: "An EP of 'found city' tracks — one sound sampled from the commute each week for a season.",
    },
    attribution: "First-hand, made in the studio with Eric; the source sound captured directly from the street.",
    safety: "None — a low-stakes creative experiment.",
    responsibility: "To sample in a way that credits and honours a source rather than merely extracting from it.",
    seeAlso: ["ritual-and-reciprocity", "when-the-technique-disappears", "signal-and-noise"],
    sourceIds: ["seed-found-sound"],
  }),

  article({
    slug: "modelling-for-invariants",
    title: "Modelling for Invariants",
    category: "Future modelling",
    lens: "Future",
    updatedDaysAgo: 17,
    excerpt:
      "Sketch three futures not to pick one, but to find the risks that show up in all of them.",
    lead:
      "**Modelling for invariants** is scenario planning whose payoff is not the prediction but the " +
      "*invariants* — the things true down every branch. A model earns its keep by exposing the " +
      "risks worth managing now, before any single future has been chosen.",
    sections: [
      {
        heading: "What is true down every branch",
        body:
          "Three five-year paths sketched on a kitchen whiteboard — stay deep, jump to the startup, " +
          "go independent — share two risks in common: debt and burnout appear in all three. Those " +
          "invariants, not the branches, are what to act on today.",
      },
      {
        heading: "Modelling to decide, not to soothe",
        body:
          "There is a trap: modelling to *feel* in control of what is mostly luck and timing. The " +
          "honest use is [[The Upstream Fault|systemic]] — build a runway buffer that de-risks all " +
          "three paths, then decide from safety rather than fear. It shares its patience with " +
          "[[The Plateau Effect]].",
      },
    ],
    observation:
      "An evening sketching three five-year paths on a whiteboard, looking for the risks common to all of them.",
    analysis:
      "A model's value is the invariants it exposes — the things true down every branch are what's actually worth managing now.",
    efflorescence: {
      type: "an idea",
      text: "Build a runway buffer that de-risks all three paths, then decide from safety instead of fear.",
    },
    attribution: "A deliberate modelling exercise, marked as such — a possibility-space, not a prediction.",
    safety: "Personal life-planning; kept private while it is still half-formed.",
    responsibility: "To model in order to decide well, not to manufacture a false sense of control.",
    seeAlso: ["the-plateau-effect", "the-upstream-fault", "signal-and-noise"],
    sourceIds: ["seed-three-futures"],
  }),

  article({
    slug: "the-plateau-effect",
    title: "The Plateau Effect",
    category: "Learning",
    lens: "Learning",
    updatedDaysAgo: 20,
    excerpt:
      "Learning stalls feel like failure, but the flat weeks are the pressure building before a phase change.",
    lead:
      "The **plateau effect** is the experience, common to any serious learning, of long flat " +
      "stretches where effort seems to yield nothing — followed by a sudden leap. Skill is rarely " +
      "linear accumulation; it is periodic *re-crystallisation* around a single newly-grasped idea.",
    sections: [
      {
        heading: "Re-crystallisation around a key",
        body:
          "Three weeks bouncing off async Rust, the borrow checker fighting every line — then one " +
          "mental model lands (*'who owns this, and for how long?'*) and a week of confusion " +
          "reorganises itself in an afternoon. The flat weeks were not stalls; they were the pressure " +
          "that made the phase change possible.",
      },
      {
        heading: "Trusting the flat",
        body:
          "The difficulty is that a productive plateau feels identical, from the inside, to being " +
          "genuinely stuck. The same patience governs " +
          "[[When the Technique Disappears|mastery of a craft]]: the plateau *is* the work, not the " +
          "wait before it.",
      },
    ],
    observation:
      "Weeks stuck on async Rust, broken open when one ownership model made a week of confusion click in an afternoon.",
    analysis:
      "Learning is sudden re-crystallisation around one key idea; the flat, frustrating weeks are the pressure that enables it.",
    efflorescence: {
      type: "something to learn",
      text: "Keep a 'stuck log' — note each plateau and the key that eventually broke it, so I trust the next one.",
    },
    attribution: "First-hand study over several weeks; a nudge toward the ownership model came from Eric.",
    safety: "None.",
    responsibility: "To distinguish honest patience from stubbornly flogging a dead approach.",
    seeAlso: ["when-the-technique-disappears", "modelling-for-invariants", "the-phone-free-hour"],
    sourceIds: ["seed-plateau-break"],
  }),

  article({
    slug: "purposeless-play",
    title: "Purposeless Play",
    category: "Leisure",
    lens: "Enjoyment",
    updatedDaysAgo: 23,
    excerpt:
      "Ninety minutes of five-a-side where nobody knew what anyone did for work — and that was the point.",
    lead:
      "**Purposeless play** is enjoyment that justifies nothing beyond itself — a pickup game, a " +
      "laugh, an hour where nobody knows or cares what anyone does for work. Far from wasted time, it " +
      "is arguably the point the useful hours are in service *of*.",
    sections: [
      {
        heading: "The uselessness is the feature",
        body:
          "Turn up alone to the Tuesday court, get waved onto a team, and for ninety minutes it is " +
          "pure play — nutmeg a stranger, get nutmegged back, laugh either way. The lack of purpose is " +
          "not a bug to be justified; it is the whole feature.",
      },
      {
        heading: "Against the recovery reframe",
        body:
          "Why the reflex to relabel leisure as *'recovery'*, as if it needed a productivity alibi? " +
          "Play belongs beside [[The Phone-Free Hour]] and [[Gratitude After Loss]] — channels of a " +
          "good life we keep apologising for, and it also builds the [[The Contagion of Kindness|easy " +
          "goodwill of strangers]].",
      },
    ],
    observation:
      "Turning up alone to a Tuesday five-a-side, getting waved onto a team, and playing ninety carefree minutes with strangers.",
    analysis:
      "Joy that serves no purpose isn't wasted; the uselessness is exactly what makes it the point rather than the means.",
    efflorescence: {
      type: "something to appreciate",
      text: "Make Tuesday football a standing, undeletable line in the calendar.",
    },
    attribution: "First-hand, at the community court on a Tuesday night.",
    safety: "None — ordinary recreational sport.",
    responsibility: "To let leisure be good on its own terms, not to demand it earn its keep.",
    seeAlso: ["the-phone-free-hour", "gratitude-after-loss", "the-contagion-of-kindness"],
    sourceIds: ["seed-pickup-game"],
  }),

  article({
    slug: "the-phone-free-hour",
    title: "The Phone-Free Hour",
    category: "Calmness and groundedness",
    lens: "Groundedness",
    updatedDaysAgo: 26,
    excerpt:
      "Guarding the input, not just the output — because calm is a channel we jam with imported noise.",
    lead:
      "**The phone-free hour** is the practice of leaving the phone charging in another room for the " +
      "first hour of the day. Its premise: calm is not an achievement to unlock but a channel always " +
      "broadcasting, drowned out by noise we *choose* to import.",
    sections: [
      {
        heading: "Nothing happened, which was the point",
        body:
          "Coffee on the back step before the feed can tell you what to feel: a magpie carolling, " +
          "steam off the mug, cold tiles. Nothing happens, and that is exactly the point — the " +
          "ordinary morning gives the day back when it is not pre-empted.",
      },
      {
        heading: "Protect the input",
        body:
          "Attention-harvesting products are engineered to capture the exact stillness this needs, " +
          "so the discipline is to guard the *input*, not just the output. It is the ground beneath " +
          "[[Signal and Noise]] and [[Purposeless Play]] alike — and the same restraint that resists " +
          "[[Dark Patterns]].",
      },
    ],
    observation:
      "Leaving the phone in the kitchen and having coffee on the back step before the feed could set the day's mood.",
    analysis:
      "Calm is a channel always on, drowned out by imported noise; the apps are built to harvest the very attention stillness needs.",
    efflorescence: {
      type: "an insight",
      text: "Guard the first waking hour as phone-free — protect the input, not just the output.",
    },
    attribution: "First-hand, an ordinary recurring morning on the back step.",
    safety: "None — restorative by nature.",
    responsibility: "To let stillness stay restful, not to weaponise it into one more task to fail at.",
    seeAlso: ["signal-and-noise", "purposeless-play", "dark-patterns"],
    sourceIds: ["seed-phone-free-hour"],
  }),

  article({
    slug: "gratitude-after-loss",
    title: "Gratitude After Loss",
    category: "Love of life and benevolence",
    lens: "Appreciation",
    updatedDaysAgo: 29,
    excerpt:
      "The first run after surgery, and how nearly losing an ordinary function reveals it as a miracle.",
    lead:
      "**Gratitude after loss** is the recalibration that follows getting something back — a body, a " +
      "capacity, a person. Ordinary function, once it has been in genuine doubt, reveals itself as " +
      "the quiet miracle it always was, and the resulting goodwill tends to overflow onto everyone " +
      "in reach.",
    sections: [
      {
        heading: "The baseline resets",
        body:
          "Cleared to run again, four slow kilometres along the river at dawn end in a stop — not " +
          "winded, just flooded with gratitude that this body still does this at all, grinning at " +
          "every stranger on the path. Coming back from loss resets the baseline against which the " +
          "ordinary is measured.",
      },
      {
        heading: "Banking the feeling",
        body:
          "The doubt is whether gratitude survives a normal stressful Tuesday, once health fades " +
          "back into the background. The response is to *bank* it — a note to a future self, in the " +
          "spirit of [[Leave It Better|paying forward]] — and to let it feed " +
          "[[The Contagion of Kindness]].",
      },
    ],
    observation:
      "A first post-surgery run — four dawn kilometres by the river ending in a stop, overwhelmed with gratitude for a working body.",
    analysis:
      "Coming back from losing something recalibrates the baseline; ordinary function, once doubted, shows itself as a miracle.",
    efflorescence: {
      type: "something to appreciate",
      text: "Bank this feeling — a note to my future self for the days I'm ungrateful for a working body.",
    },
    attribution: "First-hand, on the river path at dawn, in recovery from surgery.",
    safety: "Marked sensitive — it touches personal health and recovery.",
    responsibility: "To let gratitude widen into goodwill toward others, not curdle into private relief.",
    seeAlso: ["the-contagion-of-kindness", "purposeless-play", "the-phone-free-hour"],
    sourceIds: ["seed-sunrise-run"],
  }),

  article({
    slug: "the-commons",
    title: "The Commons Precipitate",
    category: "Love of the world and society",
    lens: "Society & environment",
    updatedDaysAgo: 32,
    excerpt:
      "You don't find community and then act — you act, and community precipitates out of the shared work.",
    lead:
      "**The commons precipitate** is the observation that community is a *product* of shared " +
      "stewardship, not a precondition for it. Tending a small commons together manufactures the " +
      "neighbourliness everyone laments as lost.",
    sections: [
      {
        heading: "Act, and community precipitates",
        body:
          "A dead strip by the station becomes a garden — a dozen neighbours, one working bee, a " +
          "'take what you need' herb bed — and produces more of one's own street in a single Saturday " +
          "than three years of living there. You don't find community and then act; you act, and " +
          "community precipitates out.",
      },
      {
        heading: "Commons die on quiet Tuesdays",
        body:
          "The real risk is not grand failure but attrition: who waters it in February when the " +
          "novelty is gone? Commons die of quiet Tuesdays. A dead-simple watering roster is the same " +
          "unglamorous maintenance that [[Leave It Better]] celebrates, and the reciprocity of " +
          "[[Ritual and Reciprocity]].",
      },
    ],
    observation:
      "A neglected station verge turned into a shared garden by a dozen neighbours in a single working bee.",
    analysis:
      "Shared stewardship of a small commons manufactures neighbourliness; you act first, and community precipitates out.",
    efflorescence: {
      type: "something to do",
      text: "Set up a dead-simple watering roster so it survives its own honeymoon.",
    },
    attribution: "First-hand, at the station verge on a Saturday; Nora among the neighbours who started it.",
    safety: "None — a public, shared project.",
    responsibility: "To build for the unglamorous long haul, not just the launch-day enthusiasm.",
    seeAlso: ["leave-it-better", "ritual-and-reciprocity", "the-contagion-of-kindness"],
    sourceIds: ["seed-community-garden"],
  }),

  article({
    slug: "steelmanning",
    title: "Steelmanning",
    category: "Love of the conversational partner",
    lens: "Conversation",
    updatedDaysAgo: 35,
    excerpt:
      "Say your opponent's case back better than they put it — and watch the heat leave the room.",
    lead:
      "**Steelmanning** is the practice of restating another person's argument in its strongest form " +
      "— better than they put it themselves — before you respond. Its power is not rhetorical: being " +
      "accurately understood is disarming in a way that winning never is.",
    sections: [
      {
        heading: "Understanding before difference",
        body:
          "In a tense disagreement over a re-org, instead of reloading your argument while the other " +
          "talks, you try to say *his* case back better than he did. He goes quiet, then: *'okay, you " +
          "actually get it.'* The heat leaves the room. The efflorescence of a conversation isn't " +
          "agreement — it's the other person feeling understood before you differ.",
      },
      {
        heading: "Honest technique or performance?",
        body:
          "There is a real edge: steelmanning can decay into a technique — *performing* understanding " +
          "to lower a guard. Kept honest, it is the active form of the listening in " +
          "[[The Shape of an Absence]] and the goodwill of [[The Contagion of Kindness]].",
      },
    ],
    observation:
      "In a tense re-org disagreement, restating Sam's case better than he had — after which the heat left the room.",
    analysis:
      "Being heard is disarming in a way winning never is; a conversation's real fruit is the other person feeling accurately understood.",
    efflorescence: {
      type: "an insight",
      text: "In any hard talk, earn the right to respond by restating their point until they actually nod.",
    },
    attribution: "First-hand, in a one-to-one with Sam.",
    safety: "A workplace tension handled with discretion; the other person's view represented fairly, not caricatured.",
    responsibility: "To use steelmanning to understand, not as a manoeuvre to disarm someone before overriding them.",
    seeAlso: ["the-shape-of-an-absence", "the-contagion-of-kindness", "dark-patterns"],
    sourceIds: ["seed-hard-conversation"],
  }),

  article({
    slug: "the-contagion-of-kindness",
    title: "The Contagion of Kindness",
    category: "Universal love for all",
    lens: "Universal love",
    updatedDaysAgo: 38,
    excerpt:
      "A night-bus driver holds the doors for a running stranger, and a dozen tired moods soften at once.",
    lead:
      "**The contagion of kindness** is the observation that unrequired goodwill is socially " +
      "infectious — a single small mercy visibly softening the mood of everyone who witnesses it. It " +
      "is a quiet rebuttal to the cynical assumption that only cruelty spreads.",
    sections: [
      {
        heading: "One mercy, a dozen moods",
        body:
          "On the last bus, the driver sees a man sprinting half a block back and holds the doors, " +
          "engine idling, for nothing but kindness. The whole tired bus softens. An unrequired " +
          "kindness is a public good — it pays out to strangers who will never trace it back to the " +
          "giver.",
      },
      {
        heading: "An asymmetry of belief",
        body:
          "Why is it easier to believe in the spread of cruelty than of kindness, when the latter is " +
          "so often caught in the act? Naming the good as readily as the harm is the work of a whole " +
          "life — the [[Gratitude After Loss|overflow of gratitude]], the [[The Commons Precipitate|" +
          "neighbourliness of a shared garden]], the goodwill of [[Purposeless Play]].",
      },
    ],
    observation:
      "A night-bus driver holding the doors, engine idling, for a stranger sprinting half a block back — and the whole bus softening.",
    analysis:
      "Goodwill is contagious in a way cynicism pretends it isn't; an unrequired kindness is a public good paid out to untraceable strangers.",
    efflorescence: {
      type: "something to do",
      text: "Look for one chance a day to be the person who holds the door — literal or otherwise.",
    },
    attribution: "Witnessed first-hand from a seat on the night bus.",
    safety: "None.",
    responsibility: "To notice and name the good as readily as we notice harm — an honest ledger, not a rosy one.",
    seeAlso: ["gratitude-after-loss", "the-commons", "steelmanning"],
    sourceIds: ["seed-night-bus"],
  }),

  article({
    slug: "signal-and-noise",
    title: "Signal and Noise",
    category: "Noticing, observing, awareness",
    lens: "Close observation",
    updatedDaysAgo: 41,
    excerpt:
      "A 3ms sawtooth hiding inside 'normal' — and the trainable stillness that lets a pattern separate from the noise.",
    lead:
      "**Separating signal from noise** is the skill of holding attention on something long enough " +
      "that a faint pattern detaches itself from the background. Acute attention is *trainable*, not " +
      "a mood — the longer you look, the more the signal resolves.",
    sections: [
      {
        heading: "The 3ms nobody else saw",
        body:
          "Everyone calls the latency graph flat, but one endpoint carries a faint sawtooth — 3ms " +
          "creeping up, resetting on every deploy: a memory leak weeks from taking down production, " +
          "hiding inside 'normal'. The longer the graph is held, the more the pattern separates from " +
          "the noise — the same stillness that makes a bird appear out of the reeds.",
      },
      {
        heading: "Staring versus glancing",
        body:
          "How many real anomalies are missed by glancing where one should stare — and how much " +
          "staring is only anxiety in disguise? The answer is the [[The Phone-Free Hour|groundedness]] " +
          "that lets attention be calm, and it feeds both [[The Upstream Fault]] and the ear of " +
          "[[Found Sound]].",
      },
    ],
    observation:
      "A latency graph everyone called flat, hiding a 3ms sawtooth — a memory leak weeks from taking down production.",
    analysis:
      "Acute attention is a trainable skill, not a mood; held long enough, the signal separates from the noise.",
    efflorescence: {
      type: "something to appreciate",
      text: "Slowness is a form of respect — for a place, a person, or a system. Meet each on its own timescale.",
    },
    attribution: "Noticed first-hand while on-call; the leak later confirmed and traced with Priya.",
    safety: "None — averted a production incident before it occurred.",
    responsibility: "To stare where it matters without mistaking anxious over-watching for genuine attention.",
    seeAlso: ["the-upstream-fault", "the-phone-free-hour", "found-sound"],
    sourceIds: ["seed-anomaly-logs"],
  }),

  article({
    slug: "when-the-technique-disappears",
    title: "When the Technique Disappears",
    category: "Skill, mastery, artisanry",
    lens: "Mastery",
    updatedDaysAgo: 44,
    excerpt:
      "Six weeks of ugly blobs, then a clean rosetta first try — the moment craft becomes invisible.",
    lead:
      "**Mastery** announces itself by a disappearance: the technique you have laboured over stops " +
      "being something you manage and becomes something that simply happens. The apparent suddenness " +
      "hides a hundred invisible reps cashing in at once.",
    sections: [
      {
        heading: "The rosetta that poured itself",
        body:
          "Six weeks of ugly blobs, then one morning the milk folds into a clean rosetta first try — " +
          "right pour height, right wrist, no thinking. Mastery is mostly the patience to stay through " +
          "the boring, ugly middle; the tool, or the milk, disappears when it is right.",
      },
      {
        heading: "Patience versus stubbornness",
        body:
          "The open question is how to tell productive patience from flogging a dead technique — they " +
          "feel identical until one of them breaks. It is the same doubt at the heart of " +
          "[[The Plateau Effect]], and the craft that also serves [[The Upstream Fault]] and " +
          "[[Found Sound]].",
      },
    ],
    observation:
      "After six weeks of failed attempts, a latte rosetta pouring clean first try — the technique suddenly automatic.",
    analysis:
      "Mastery is the patience to stay through the ugly middle; the breakthrough is an invisible hundred reps cashing in at once.",
    efflorescence: {
      type: "an insight",
      text: "Breakthroughs are back-loaded: the plateau IS the work, not the wait before the work starts.",
    },
    attribution: "First-hand, at the kitchen counter; early guidance on the pour from Eric.",
    safety: "None.",
    responsibility: "To honour the craft's own standards rather than chase a shortcut that skips them.",
    seeAlso: ["the-plateau-effect", "the-upstream-fault", "found-sound"],
    sourceIds: ["seed-latte-art"],
  }),

  article({
    slug: "the-upstream-fault",
    title: "The Upstream Fault",
    category: "Ingenuity and problem solving",
    lens: "Problem solving",
    updatedDaysAgo: 47,
    excerpt:
      "A corrupt cart total whose cause lived six services upstream — a rule about leaks, arguments, and org charts alike.",
    lead:
      "**The upstream fault** is the principle that a symptom marks where a problem *surfaces*, not " +
      "where it *lives*. Effective problem-solving means tracing an effect back to a cause that often " +
      "shares no code, no wall, and no obvious connection with the evidence.",
    sections: [
      {
        heading: "Trace the water, don't patch the stain",
        body:
          "A corrupt cart total chased for two days at the checkout turns out to enter a currency " +
          "service three hops back and ride a queue before surfacing where nobody was looking. Symptom " +
          "and cause shared no code at all. Patch the stain and it returns; find where the bad data " +
          "enters and it ends.",
      },
      {
        heading: "A rule about every system",
        body:
          "The maxim generalises to habits, arguments, and org charts — and to " +
          "[[The Shape of an Absence|caring for a struggling teammate]]. It is the mirror of " +
          "[[Modelling for Invariants]], which hunts for the risks common to every future rather than " +
          "the fault common to every symptom. Finding the true entry point takes the trained eye of " +
          "[[Signal and Noise]] and the patience of [[When the Technique Disappears|mastery]].",
      },
    ],
    observation:
      "A corrupt cart total traced, after two days, to a currency service six services upstream — symptom and cause sharing no code.",
    analysis:
      "Symptoms are where problems surface, not where they live; 'trace the water, don't patch the stain' is a rule about every system.",
    efflorescence: {
      type: "an idea",
      text: "A team runbook: before fixing a recurring incident, trace it to where the bad data actually enters.",
    },
    attribution: "Diagnosed first-hand in the incident channel; the guiding maxim credited to Eric.",
    safety: "None — a production bug caught and fixed at the source.",
    responsibility: "To resist the fast, satisfying patch when it only hides the fault until next time.",
    seeAlso: ["signal-and-noise", "when-the-technique-disappears", "modelling-for-invariants"],
    sourceIds: ["seed-upstream-bug"],
  }),

  article({
    slug: "leave-it-better",
    title: "Leave It Better",
    category: "Stewardship",
    lens: "Stewardship",
    updatedDaysAgo: 50,
    excerpt:
      "Fixing the onboarding docs for a hire you'll never meet — the campsite rule, scaled to a commons.",
    lead:
      "**Leave it better** — the campsite rule — is the practice of leaving every system a little " +
      "improved over how you found it, as a gift to a stranger you will never meet. It is stewardship " +
      "paid forward, and it compounds quietly.",
    sections: [
      {
        heading: "A gift to the next hire",
        body:
          "The onboarding docs that cost a week were still wrong for the next hire; a Friday spent " +
          "fixing them and deleting 200 lines of dead config nobody had dared touch is repaid with a " +
          "single '🙏' on the merge. Stewardship is paying forward to the next person in the chain, " +
          "the reciprocity of [[Ritual and Reciprocity]] made concrete.",
      },
      {
        heading: "The value of invisible maintenance",
        body:
          "The hard truth is that invisible maintenance is valued mostly in its absence, when " +
          "something breaks. The same quiet upkeep keeps [[The Commons Precipitate|a shared garden " +
          "alive past its honeymoon]], and applies [[The Upstream Fault]] to leave systems sound at " +
          "the source.",
      },
    ],
    observation:
      "A Friday spent fixing the wrong onboarding docs and deleting 200 lines of dead config — merged by Sam with a single '🙏'.",
    analysis:
      "Stewardship is paying forward to a stranger; the campsite rule scales — leave every system a little better and the commons compounds.",
    efflorescence: {
      type: "something to do",
      text: "Make 'leave-it-better' a standing habit — one small unasked-for improvement per repo I touch.",
    },
    attribution: "First-hand work in the repo; merged and acknowledged by Sam.",
    safety: "None.",
    responsibility: "To keep doing the unglamorous upkeep that is only ever noticed when it is missing.",
    seeAlso: ["the-commons", "ritual-and-reciprocity", "the-upstream-fault"],
    sourceIds: ["seed-repo-left-better"],
  }),
];

const bySlug = new Map(ARTICLES.map((a) => [a.slug, a]));
const byTitle = new Map(ARTICLES.map((a) => [a.title.toLowerCase(), a.slug]));

export const findArticle = (slug) => bySlug.get(slug) ?? null;
export const slugForTitle = (title) => byTitle.get((title || "").toLowerCase()) ?? null;

/// Resolve an article's cited source observations to {title, date} for display,
/// pulling the real headline and date from the seed observation layer so the
/// "synthesised from your Pod" citation stays truthful to the underlying data.
export function resolveSources(article, seedItems) {
  const byId = new Map(seedItems.map((i) => [i.id, i]));
  return (article.sourceIds || [])
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((it) => ({
      id: it.id,
      title: it.title || (it.body || "").trim().split("\n")[0].slice(0, 70) || "(observation)",
      date: it.createdAt,
    }));
}

export const articleUpdated = (a) => daysAgo(a.updatedDaysAgo);

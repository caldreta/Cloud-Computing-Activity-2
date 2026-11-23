const API_URL = "https://cloud-computing-activity.vercel.app/api/v1";
const API_KEY = "arceo-api-key-123";

const FETCH_OPTIONS = {
    headers: {
        "x-api-key": API_KEY
    }
};

// Champion pictures live in a public Supabase Storage bucket. The API sends the path inside it
// (for example league/zed.jpg), and this is the address that path is added to.
const IMAGE_BASE = "https://rmyhndpralukuvynsnbp.supabase.co/storage/v1/object/public/champion-images/";

// When true, the console shows every champion's points and bar after each
// quiz, and the calibrated bars when the roster loads. Handy for tuning.
const DEBUG = false;


// ============================================================
// THE QUIZ
// Each question feeds ONE field of the character data. `points` is how much
// players tend to care about it, and all questions together add up to 100.
// The weight a question really carries is a blend of that and how well it
// tells the roster's champions apart (see WEIGHTS below).
// `field` is the exact key on the character objects the API returns and
// `value` is the exact string stored there, so scoring never needs a
// translation step. `value: null` means "no preference": the question is
// left out and the bar shrinks to match (see SCORING).
// ============================================================
const SKIP = { glyph: "—", label: "No preference", sub: "", value: null, skip: true };
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

const QUESTIONS = [
    {
        id: "brag",
        field: "playstyle",
        points: 18,
        text: "Which fight would you be proudest of winning?",
        note: "This one counts for the most, so there is no skipping it.",
        options: [
            { label: "Deleting a target with one explosive combo", sub: "Huge damage in two seconds, then the fight is over.", value: "Burst" },
            { label: "Outlasting everyone in a long fight", sub: "You keep fighting while they wear down.", value: "Sustained" },
            { label: "Wearing them down without ever being in danger", sub: "Damage from a safe distance.", value: "Poke" },
            { label: "Taking the hits so my team can win", sub: "You walk in first and hold the line.", value: "Frontline" },
            { label: "Never being seen until the moment I strike", sub: "You wait out of sight and choose when the fight starts.", value: "Ambush" },
            { label: "Winning because of the plays I set up", sub: "Your team's kills start with you.", value: "Utility" }
        ]
    },
    {
        id: "role",
        field: "role",
        points: 14,
        text: "If you were given the option to pick a role, which one is your go-to?",
        note: "",
        options: [
            { glyph: "T", label: "Tank", sub: "Starts fights and absorbs the hits.", value: "Tank" },
            { glyph: "F", label: "Fighter", sub: "Trades blows in the middle of everything.", value: "Fighter" },
            { glyph: "A", label: "Assassin", sub: "Picks off key targets, then gets out.", value: "Assassin" },
            { glyph: "M", label: "Mage", sub: "Spells that deal damage or control a fight.", value: "Mage" },
            { glyph: "K", label: "Marksman", sub: "Reliable damage from range.", value: "Marksman" },
            { glyph: "S", label: "Support", sub: "Keeps allies alive and winning.", value: "Support" },
            SKIP
        ]
    },
    {
        id: "floor",
        field: "skill_floor",
        points: 5,
        text: "How much practice are you willing to put in before a new champion feels comfortable?",
        note: "Skill floor is how hard a champion is to play at a basic level. 1 is the easiest start.",
        options: [
            { glyph: "1", label: "None", sub: "I want to play well in my first game.", value: 1 },
            { glyph: "2", label: "A little", sub: "A few games should do it.", value: 2 },
            { glyph: "3", label: "Some", sub: "I'll practice for a session or two.", value: 3 },
            { glyph: "4", label: "A lot", sub: "I'll spend days getting the basics down.", value: 4 },
            { glyph: "5", label: "As much as it takes", sub: "A rough start doesn't bother me.", value: 5 },
            SKIP
        ]
    },
    {
        id: "ceiling",
        field: "skill_ceiling",
        points: 5,
        text: "How much room to grow do you want?",
        note: "Skill ceiling is how much skill a champion can use at the very top. 5 is the most.",
        options: [
            { glyph: "1", label: "None", sub: "Once I know the basics, I'm done.", value: 1 },
            { glyph: "2", label: "A little", sub: "A few weeks of improving is plenty.", value: 2 },
            { glyph: "3", label: "Some", sub: "I want to keep getting better for a while.", value: 3 },
            { glyph: "4", label: "A lot", sub: "I want months of things to master.", value: 4 },
            { glyph: "5", label: "As much as possible", sub: "I want a champion I can master for years.", value: 5 },
            SKIP
        ]
    },
    {
        id: "range",
        field: "attack_type",
        points: 9,
        text: "When you're just trading basic attacks, where do you want to be standing?",
        note: "",
        options: [
            { glyph: "⚔", label: "Right next to the enemy", sub: "Even if I have a few long-range abilities.", value: "Melee" },
            { glyph: "➷", label: "Away from the enemy", sub: "Even if I have a dash or two to get close.", value: "Ranged" },
            SKIP
        ]
    },
    {
        id: "attack",
        field: "damage_source",
        points: 7,
        text: "What do you want to deal most of your damage with?",
        note: "",
        options: [
            { label: "Abilities", sub: "My abilities are my main damage, and basic attacks fill the gaps.", value: "Abilities" },
            { label: "Basic attacks", sub: "Attacking is my main damage, and abilities help me hit harder.", value: "Auto-Attacks" },
            SKIP
        ]
    },
    {
        id: "damage",
        field: "damage_type",
        points: 7,
        text: "What kind of damage do you want to deal?",
        note: "AD is attack damage, which armor reduces. AP is ability power, which magic resist reduces.",
        options: [
            { label: "Physical damage (AD)", sub: "Scales with attack damage items.", value: "AD" },
            { label: "Magic damage (AP)", sub: "Scales with ability power items.", value: "AP" },
            SKIP
        ]
    },
    {
        id: "move",
        field: "mobility",
        points: 5,
        text: "How much do you want to move around during a fight?",
        note: "",
        options: [
            { glyph: "···", label: "Constantly", sub: "Dashing, jumping and repositioning to chase, dodge or escape.", value: "High" },
            { glyph: "··",  label: "Occasionally", sub: "A dash or two I save for the right moment.", value: "Medium" },
            { glyph: "·",   label: "Rarely", sub: "I'd rather hold my position and make it count.", value: "Low" },
            SKIP
        ]
    },
    {
        id: "survive",
        field: "survivability",
        points: 5,
        text: "How do you want to survive a fight?",
        note: "",
        options: [
            { label: "By not getting hit", sub: "Dodging and staying out of reach, so one mistake can cost me.", value: "Squishy" },
            { label: "By taking the hits", sub: "A sturdy body that absorbs damage and keeps fighting.", value: "Sturdy" },
            { label: "By healing it back", sub: "Recovering health during the fight as I go.", value: "Sustain-heavy" },
            SKIP
        ]
    },
    {
        id: "aim",
        field: "mechanical_demand",
        points: 5,
        text: "When you use an ability, how do you want it to land?",
        note: "",
        options: [
            { label: "I aim it", sub: "I predict where enemies will move, and a miss means nothing happens.", value: "Aimed Skillshots" },
            { label: "I target it", sub: "I pick an enemy and it connects, so the skill is in choosing when and who.", value: "Point-and-Click" },
            { label: "I weave it into my attacks", sub: "My basic attacks do most of the work and abilities boost them.", value: "Auto-Attack Based" },
            SKIP
        ]
    },
    {
        id: "synergy",
        field: "kit_complexity",
        points: 5,
        text: "How should a champion's abilities work together?",
        note: "",
        options: [
            { glyph: "·",   label: "Each one stands on its own", sub: "I can use them in any order and still do well.", value: "Low" },
            { glyph: "··",  label: "A few work best together", sub: "The right order helps, but I'm fine if I miss one.", value: "Medium" },
            { glyph: "···", label: "They're tightly linked", sub: "The champion only works when I connect the right abilities in the right order.", value: "High" },
            SKIP
        ]
    },
    {
        id: "curve",
        field: "power_curve",
        points: 5,
        text: "Which trade-off would you rather live with?",
        note: "",
        options: [
            { label: "Strong early, falls off", sub: "I dominate the first stretch, then lose my edge.", value: "Early" },
            { label: "Steady all game", sub: "I'm reliable throughout, but never overwhelming.", value: "Even" },
            { label: "Weak early, strong late", sub: "I survive a rough start, then take over.", value: "Late" },
            SKIP
        ]
    },
    {
        id: "snowball",
        field: "snowball_dependence",
        points: 5,
        text: "How should being ahead or behind change your champion?",
        note: "",
        options: [
            { label: "Snowball", sub: "The more I win, the stronger I get, and falling behind is costly.", value: "Needs a Lead" },
            { label: "Steady", sub: "I'm about the same whether I'm winning or losing.", value: "Neutral" },
            { label: "Comeback", sub: "I stay useful when I'm behind, but I don't snowball as hard when ahead.", value: "Can Play From Behind" },
            SKIP
        ]
    },
    {
        id: "alone",
        field: "team_dependence",
        points: 5,
        text: "How long can your champion last without their team?",
        note: "",
        options: [
            { label: "A long time", sub: "I can fight, survive and make plays alone. My team makes me better, but I don't need them to function.", value: "Self-Sufficient" },
            { label: "For a while", sub: "I can hold my own, but I need teammates to win the bigger fights.", value: "Balanced" },
            { label: "Not long", sub: "I'm at my best with my team beside me, and alone I struggle.", value: "Team-Reliant" },
            SKIP
        ]
    }
];



// ============================================================
// SCORING: POINTS AND BARS
//
// Every click earns points for a champion. The clicked answer is worth
// the question's `points` if the champion's own tag matches it exactly,
// and less if it is close:
//   nominal  exact match or nothing            (playstyle, attack_type)
//   role     main role 1, second role 0.6      (role)
//   ordinal  values sit on a scale, so a near miss earns partial credit:
//            exact 1, one step away 0.5, opposite ends 0
//   atMost   the answer is a LIMIT. A champion at or below it earns full
//            points, one above it loses points for every step over.
//   atLeast  the answer is a MINIMUM. A champion at or above it earns full
//            points, one below it loses points for every step under.
// `levels` lists a scaled field's values from lowest to highest.
//
// Skill floor is an atMost field: "I'll put in this much effort" does not
// mean "so give me only hard champions", an easier one is still fine.
// Skill ceiling is an atLeast field: "I want this much room to grow" is
// met by any champion with that much or more. Change either to "ordinal"
// below if you would rather it match the answer closely in both directions.
//
// Each champion also has a BAR. A champion is only recommended when its
// points reach its bar. The bar is a percentage of the points available
// from the questions the user actually answered. That is what keeps
// "No preference" fair: skip half the quiz and the bar halves with it,
// instead of making every champion unreachable.
//
// Bars are not typed in by hand. calibrateThresholds() sets each one so
// that, if people answered the whole quiz at random, that champion would
// clear its bar for about TARGET_SHARE of them. Add a champion to the
// data and it gets a bar automatically.
// ============================================================
const FIELDS = {
    playstyle:           { type: "nominal" },
    role:                { type: "role" },
    skill_floor:         { type: "atMost",  levels: [1, 2, 3, 4, 5] },
    skill_ceiling:       { type: "atLeast", levels: [1, 2, 3, 4, 5] },
    // Used by the roster page only. Skill floor and ceiling replaced it in the quiz.
    difficulty:          { type: "ordinal", levels: ["Easy", "Medium", "Hard"] },
    attack_type:         { type: "nominal" },
    // Both are scales so that a champion who mixes the two is not scored as a
    // total miss: "Mixed" sits between AD and AP, "Both" between the other two.
    // Nobody has to use "Mixed" or "Both". With only the end values they act
    // like plain either/or fields.
    damage_type:         { type: "ordinal", levels: ["AD", "Mixed", "AP"] },
    damage_source:       { type: "ordinal", levels: ["Abilities", "Both", "Auto-Attacks"] },
    mobility:            { type: "ordinal", levels: ["Low", "Medium", "High"] },
    survivability:       { type: "ordinal", levels: ["Squishy", "Sturdy", "Sustain-heavy"] },
    mechanical_demand:   { type: "ordinal", levels: ["Auto-Attack Based", "Point-and-Click", "Aimed Skillshots"] },
    kit_complexity:      { type: "ordinal", levels: ["Low", "Medium", "High"] },
    power_curve:         { type: "ordinal", levels: ["Early", "Even", "Late"] },
    snowball_dependence: { type: "ordinal", levels: ["Can Play From Behind", "Neutral", "Needs a Lead"] },
    team_dependence:     { type: "ordinal", levels: ["Self-Sufficient", "Balanced", "Team-Reliant"] }
};

// Tuning knobs for the bars.
const TARGET_SHARE = 0.05;   // each champion should clear its bar for ~5% of random answer sets
const MIN_THRESHOLD = 60;    // no bar is ever lower than this (percent of available points)
const SAMPLES = 4000;        // how many random answer sets to test when calibrating
const SEED = 7;              // fixed, so the same roster always gets the same bars
const THRESHOLD_OVERRIDES = {
    // "Zed": 75,            // set a champion's bar by hand, in percent
};

// The most reasons shown for one champion.
const MAX_REASONS = 5;
const MAX_RESULTS = 3;

// Fewer champions than this clear their bar? The list is filled up to this
// many with the next closest ones, labelled "Next closest" so nobody mistakes
// them for real matches. Set it to 1 to show real matches only.
const MIN_LIST_SIZE = 3;

// Champions with near-identical tags score almost the same, so one cluster of
// look-alikes can fill the whole list. To keep the list varied, a champion
// loses this many percentage points for each champion with the same playstyle
// that is already in the list. A look-alike only gives way when another
// playstyle is within that many points, so a much better match is never
// pushed down for variety. Set it to 0 for a plain ranking.
const DIVERSITY_PENALTY = 4;

// ============================================================
// WEIGHTS
// A question that splits the roster into evenly sized groups tells champions
// apart well. One where nearly everyone gives the same answer tells them
// apart poorly. INFORMATION_SHARE is how much of each question's weight comes
// from that (the rest is `points`, how much players care). It is worked out
// from the roster when it loads, so adding champions keeps it fair. 0 uses
// `points` alone. Questions are measured by the entropy of their field.
// ============================================================
const INFORMATION_SHARE = 0.5;
const MIN_ROSTER_FOR_WEIGHTS = 12;   // with fewer champions, the numbers would only be noise

let weights = {};

function weightOf(question) {
    return weights[question.id] ?? question.points;
}

// The value a champion has for a question (a role question looks at the main role).
function answerValue(question, character) {
    const value = character[question.field];
    if (value === undefined || value === null) return undefined;
    return question.field === "role" ? String(value).split("/")[0].trim() : value;
}

function computeWeights(characters) {
    weights = {};
    if (INFORMATION_SHARE <= 0 || characters.length < MIN_ROSTER_FOR_WEIGHTS) return;

    const entropy = {};
    for (const question of QUESTIONS) {
        const counts = new Map();
        let total = 0;
        for (const character of characters) {
            const value = answerValue(question, character);
            if (value === undefined) continue;
            counts.set(value, (counts.get(value) || 0) + 1);
            total++;
        }
        if (total === 0) continue;
        entropy[question.id] = -[...counts.values()].reduce((sum, n) => sum + (n / total) * Math.log2(n / total), 0);
    }

    const sumEntropy = Object.values(entropy).reduce((a, b) => a + b, 0);
    const sumPoints = QUESTIONS.reduce((sum, q) => sum + q.points, 0);
    if (!sumEntropy) return;

    for (const question of QUESTIONS) {
        if (entropy[question.id] === undefined) continue;
        weights[question.id] =
            INFORMATION_SHARE * 100 * (entropy[question.id] / sumEntropy) +
            (1 - INFORMATION_SHARE) * 100 * (question.points / sumPoints);
    }
}

// One line per field value, shown when a champion matches that answer.
const REASONS = {
    playstyle: {
        Burst:     "Deletes a target in one combo, then backs off.",
        Sustained: "Wins the long fight instead of the quick one.",
        Poke:      "Chips the enemy down from a safe distance.",
        Frontline: "Walks in first and soaks up the damage.",
        Ambush:    "Waits out of sight and opens the fight on its own terms.",
        Utility:   "Wins fights by enabling the team, not by carrying it."
    },
    skill_floor: {
        1: "Playable well from your very first game.",
        2: "The basics come quickly.",
        3: "Takes a few sessions before it clicks.",
        4: "A steep start that takes real practice.",
        5: "One of the hardest champions to start on."
    },
    skill_ceiling: {
        1: "Not much left to master once you know it.",
        2: "A little room to grow after the basics.",
        3: "Plenty of room to keep improving.",
        4: "A lot to master over time.",
        5: "Room to master it for years."
    },
    attack_type: {
        Melee:  "Closes in to fight with basic attacks.",
        Ranged: "Fights from a distance with basic attacks."
    },
    damage_type: {
        AD:    "Deals physical damage, scaling with attack damage.",
        Mixed: "Deals a mix of physical and magic damage.",
        AP:    "Deals magic damage, scaling with ability power."
    },
    damage_source: {
        "Abilities":    "Deals most of its damage with abilities.",
        "Both":         "Mixes basic attacks and abilities for its damage.",
        "Auto-Attacks": "Deals most of its damage with basic attacks."
    },
    mobility: {
        High:   "Has dashes and jumps to chase, dodge and reposition freely.",
        Medium: "Has a dash or two, best saved for the right moment.",
        Low:    "Holds its ground and wins through positioning."
    },
    survivability: {
        "Squishy":       "Stays alive by avoiding hits, so mistakes are costly.",
        "Sturdy":        "Can take a few hits and keep fighting.",
        "Sustain-heavy": "Heals back much of what the enemy deals."
    },
    mechanical_demand: {
        "Aimed Skillshots":  "Rewards landing well-aimed shots.",
        "Point-and-Click":   "Pick a target and the ability connects.",
        "Auto-Attack Based": "Wins by attacking normally with abilities on top."
    },
    kit_complexity: {
        Low:    "Abilities work on their own, in any order.",
        Medium: "A few abilities work best together.",
        High:   "Abilities are tightly linked, so combos matter."
    },
    power_curve: {
        Early: "Strong early, but falls off later.",
        Even:  "Reliable all game, never overwhelming.",
        Late:  "Weak early, but takes over late."
    },
    snowball_dependence: {
        "Needs a Lead":         "Takes over once it gets ahead.",
        "Neutral":              "Plays about the same whether ahead or behind.",
        "Can Play From Behind": "Stays useful even when the game goes badly."
    },
    team_dependence: {
        "Self-Sufficient": "Can last a long time without its team.",
        "Balanced":        "Can hold its own, but wants teammates for big fights.",
        "Team-Reliant":    "Strongest with its team beside it."
    }
};


// Playstyles that are close cousins. Burst is how fast the damage lands and
// Ambush is how the fight starts, so one assassin can honestly be both, and a
// player who picks one should not score the other as a total miss. Each pair
// earns this fraction of the playstyle points. Keys are the two names in
// alphabetical order, joined with "|".
const PLAYSTYLE_NEIGHBOURS = {
    "Ambush|Burst": 0.5
};

// Roles are stored as text like "Tank / Fighter". The first one listed
// is the champion's main job, the rest are things it can also do.
function roleCredit(characterRole, wantedRole) {
    const parts = characterRole.split("/").map((p) => p.trim().toLowerCase());
    const wanted = wantedRole.trim().toLowerCase();

    if (parts[0] === wanted) return 1;
    if (parts.includes(wanted)) return 0.6;
    return 0;
}


// How close one champion is to one clicked answer: 0 to 1.
function closeness(field, character, clicked) {
    const rule = FIELDS[field];
    const actual = character[field];

    if (rule.type === "ordinal") {
        const a = rule.levels.indexOf(actual);
        const b = rule.levels.indexOf(clicked);
        if (a === -1 || b === -1) return 0;
        return 1 - Math.abs(a - b) / (rule.levels.length - 1);
    }

    if (rule.type === "role") return roleCredit(actual, clicked);

    if (rule.type === "atMost" || rule.type === "atLeast") {
        const a = rule.levels.indexOf(actual);
        const b = rule.levels.indexOf(clicked);
        if (a === -1 || b === -1) return 0;

        // How many steps the champion sits on the wrong side of the answer.
        const over = rule.type === "atMost" ? a - b : b - a;
        if (over <= 0) return 1;
        return Math.max(0, 1 - over / (rule.levels.length - 1));
    }

    if (field === "playstyle" && actual !== clicked) {
        return PLAYSTYLE_NEIGHBOURS[[actual, clicked].sort().join("|")] || 0;
    }

    return actual === clicked ? 1 : 0;
}


// Add up one champion's points for a set of answers.
// `available` is the most it could have earned from what was answered.
function tally(character, answers) {
    let points = 0;
    let available = 0;
    const parts = [];

    for (const question of QUESTIONS) {
        const clicked = answers[question.id];
        if (clicked === null || clicked === undefined) continue;

        // No data for this field (an older API): sit this question out
        // instead of scoring it as a miss. checkRosterFields() warns about it.
        if (character[question.field] === undefined) continue;

        const credit = closeness(question.field, character, clicked);
        const weight = weightOf(question);
        points += weight * credit;
        available += weight;
        parts.push({ question, clicked, credit, weight });
    }

    return { points, available, parts };
}


// Small seeded random number generator, so calibration gives the same
// bars every time the page loads.
function mulberry32(seed) {
    return function () {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}


// Give every champion a bar so that it clears it for about TARGET_SHARE
// of random full-quiz answer sets. A champion whose tags are easy to
// match gets a higher bar, a champion with unusual tags gets a lower one,
// so no one is recommended to everybody or to nobody.
function calibrateThresholds(characters) {
    const random = mulberry32(SEED);
    const scores = characters.map(() => []);

    for (let s = 0; s < SAMPLES; s++) {
        const answers = {};
        for (const question of QUESTIONS) {
            const options = question.options.filter((o) => o.value !== null);
            answers[question.id] = options[Math.floor(random() * options.length)].value;
        }

        characters.forEach((character, i) => {
            const { points, available } = tally(character, answers);
            scores[i].push((points / available) * 100);
        });
    }

    const bars = {};
    characters.forEach((character, i) => {
        scores[i].sort((a, b) => a - b);
        const cutoff = scores[i][Math.floor((1 - TARGET_SHARE) * (SAMPLES - 1))];
        const bar = Math.min(100, Math.max(MIN_THRESHOLD, Math.round(cutoff)));
        bars[character.id] = THRESHOLD_OVERRIDES[character.name] ?? bar;
    });

    return bars;
}

let thresholds = {};

function thresholdFor(character) {
    return thresholds[character.id] ?? MIN_THRESHOLD;
}


// Short names for the fields, used when saying where a champion differs.
const FIELD_LABELS = {
    playstyle: "Playstyle", role: "Role", skill_floor: "Learning curve", skill_ceiling: "Room to grow",
    attack_type: "Attack range", damage_source: "Damage source", damage_type: "Damage type",
    mobility: "Mobility", survivability: "Staying alive", mechanical_demand: "Aiming",
    kit_complexity: "Ability synergy", power_curve: "Power curve", snowball_dependence: "Falling behind",
    team_dependence: "Teamwork"
};

// Below this, an answer counts as a clear miss and is listed under "Where it differs".
const GAP_BELOW = 0.5;
const MAX_GAPS = 3;

function gapFor(field, character, clicked) {
    const label = FIELD_LABELS[field] || field;
    if (field === "role") {
        return `${label}: plays ${String(character.role).toLowerCase()}, not the ${String(clicked).toLowerCase()} role you picked.`;
    }
    const text = REASONS[field] && REASONS[field][character[field]];
    return text ? `${label}: ${text}` : null;
}


function reasonFor(field, character, clicked, credit) {
    if (field === "role") {
        if (credit === 0) return null;
        const role = clicked.toLowerCase();
        return credit === 1
            ? `Plays the ${role} role you picked.`
            : `Can also play the ${role} role.`;
    }

    if (credit < 1) return null;
    return REASONS[field][character[field]] || null;
}


// Returns a copy of the character with its points, percent, bar and reasons.
function scoreCharacter(character, answers) {
    const { points, available, parts } = tally(character, answers);

    // Percent of the points that were available, not of a fixed 100.
    const percent = available ? (points / available) * 100 : 0;
    const matchPercent = Math.round(percent);
    const threshold = thresholdFor(character);

    // Heaviest questions first, no repeated lines (difficulty has two).
    const found = parts
        .map(({ question, clicked, credit, weight }) => ({
            weight,
            text: reasonFor(question.field, character, clicked, credit)
        }))
        .filter((item) => item.text)
        .sort((a, b) => b.weight - a.weight);

    // The clearest misses, heaviest first, so a result never hides where it falls short.
    const gaps = parts
        .filter(({ credit }) => credit < GAP_BELOW)
        .sort((a, b) => b.weight - a.weight)
        .map(({ question, clicked }) => gapFor(question.field, character, clicked))
        .filter(Boolean)
        .slice(0, MAX_GAPS);

    const reasons = [];
    for (const item of found) {
        if (!reasons.includes(item.text)) reasons.push(item.text);
        if (reasons.length === MAX_REASONS) break;
    }

    return {
        ...character,
        points,
        available,
        percent,
        match_percent: matchPercent,
        threshold,
        qualifies: matchPercent >= threshold,
        reasons,
        gaps
    };
}

const DIFFICULTY_ORDER = { Easy: 0, Medium: 1, Hard: 2 };

// Every champion, best match first. `qualifies` says who cleared their bar.
function rankCharacters(allCharacters, answers) {
    return allCharacters
        .map((character) => scoreCharacter(character, answers))
        // Highest percent first; ties broken by the easier champion, then by name.
        .sort((a, b) =>
            b.percent - a.percent ||
            DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] ||
            a.name.localeCompare(b.name)
        );
}


// Which champions to show. The best match always comes first, and the others
// are chosen in score order with a small nudge towards other playstyles (see
// DIVERSITY_PENALTY). The final list is shown in true score order, so a higher
// percentage never sits below a lower one.
function selectResults(allCharacters, answers) {
    const ranked = rankCharacters(allCharacters, answers);
    const pool = ranked.filter((c) => c.qualifies);
    const picked = [];

    while (picked.length < MAX_RESULTS && pool.length) {
        let bestIndex = 0;
        let bestScore = -Infinity;
        pool.forEach((candidate, i) => {
            const alike = picked.filter((p) => p.playstyle === candidate.playstyle).length;
            const adjusted = candidate.percent - DIVERSITY_PENALTY * alike;
            if (adjusted > bestScore + 1e-9) {
                bestScore = adjusted;
                bestIndex = i;
            }
        });
        picked.push(pool.splice(bestIndex, 1)[0]);
    }

    const order = new Map(ranked.map((c, i) => [c.id, i]));
    picked.sort((a, b) => order.get(a.id) - order.get(b.id));

    // Too few real matches to fill the list? Add the next closest.
    const fill = ranked
        .filter((c) => !c.qualifies)
        .slice(0, Math.max(0, MIN_LIST_SIZE - picked.length));

    // How much of the quiz the answers covered, so the page can say how firm the match is.
    const totalWeight = QUESTIONS.reduce((sum, q) => sum + weightOf(q), 0);
    const answered = QUESTIONS.filter((q) => answers[q.id] !== null && answers[q.id] !== undefined).length;
    const evidence = ranked.length
        ? { answered, total: QUESTIONS.length, share: ranked[0].available / totalWeight }
        : { answered, total: QUESTIONS.length, share: 0 };

    return { ranked, matches: picked, shown: [...picked, ...fill], fallback: picked.length === 0, evidence };
}


// ============================================================
// THE ROSTER PAGE
// Groups are built from the data, in a set order where one is known.
// A role or playstyle that is not listed here (a new champion may bring
// one) still gets its own group, added at the end.
// ============================================================
const GROUPS = {
    role: {
        label: "Role",
        key: (c) => c.role.split("/")[0].trim(),   // group by main role
        order: ["Fighter", "Assassin", "Mage", "Marksman", "Tank", "Support"]
    },
    playstyle: {
        label: "Playstyle",
        key: (c) => c.playstyle,
        order: ["Burst", "Sustained", "Poke", "Frontline", "Ambush", "Utility"]
    },
    difficulty: {
        label: "Difficulty",
        key: (c) => c.difficulty,
        order: ["Easy", "Medium", "Hard"]
    }
};


// ============================================================
// STATE
// ============================================================
let step = 0;
let answers = {};      // { questionId: value }
let results = [];
let resultsAreFallback = false;
let evidence = { answered: 0, total: QUESTIONS.length, share: 0 };
let allCharacters = [];
let groupBy = "role";
let rosterPage = 1;
const ROSTER_PAGE_SIZE = 12;

const el = {
    rite:         document.getElementById("rite"),
    standfirst:   document.getElementById("standfirst"),
    home:         document.getElementById("homeStage"),
    quizMeta:     document.getElementById("quizMeta"),
    dataWarning:  document.getElementById("dataWarning"),
    groupBar:     document.getElementById("groupBar"),
    roster:       document.getElementById("roster"),
    pagination:   document.getElementById("pagination"),
    quiz:         document.getElementById("quizStage"),
    loading:      document.getElementById("loadingStage"),
    result:       document.getElementById("resultStage"),
    error:        document.getElementById("errorStage"),
    progress:     document.getElementById("progress"),
    stepCount:    document.getElementById("stepCount"),
    questionText: document.getElementById("questionText"),
    questionNote: document.getElementById("questionNote"),
    answers:      document.getElementById("answers"),
    backBtn:      document.getElementById("backBtn"),
    notice:       document.getElementById("notice"),
    reveal:       document.getElementById("reveal"),
    alternates:   document.getElementById("alternates"),
    errorText:    document.getElementById("errorText")
};


function showStage(name) {
    el.rite.dataset.stage = name;
    el.standfirst.hidden = name !== "home";
    el.home.hidden       = name !== "home";
    el.quiz.hidden       = name !== "quiz";
    el.loading.hidden    = name !== "loading";
    el.result.hidden     = name !== "result";
    el.error.hidden      = name !== "error";
}


// ============================================================
// LOAD THE ROSTER
// One request for the whole roster, made as soon as the page opens.
// By the time the user finishes the quiz, the data is already here.
// The bars are calibrated once, right after it arrives.
// ============================================================
async function loadCharacters() {
    const response = await fetch(`${API_URL}/characters`, FETCH_OPTIONS);

    if (!response.ok) {
        throw new Error(`The archive returned ${response.status}.`);
    }

    const data = await response.json();
    allCharacters = (data.characters || []).map(normalizeCharacter);

    if (allCharacters.length === 0) {
        throw new Error("The archive came back empty.");
    }

    checkRosterFields(allCharacters);
    computeWeights(allCharacters);
    thresholds = calibrateThresholds(allCharacters);

    if (DEBUG) {
        console.table(allCharacters.map((c) => ({ name: c.name, bar: thresholdFor(c) })));
    }
}

// Some fields are scales of numbers (skill floor and ceiling, 1 to 5). If the
// API sends one as text ("4" instead of 4), nothing would match it: the dots
// would stay unlit and the quiz would score it as a miss for everyone. Turn
// numbers-as-text back into numbers so both work either way.
function normalizeCharacter(character) {
    const fixed = { ...character };

    for (const [field, rule] of Object.entries(FIELDS)) {
        if (!rule.levels || typeof rule.levels[0] !== "number") continue;

        const value = fixed[field];
        if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
            fixed[field] = Number(value);
        }
    }

    return fixed;
}


// The quiz reads these fields from every champion. If the API is still
// serving an older index.py that lacks some of them, say so on the page
// instead of quietly showing blanks or skewed scores.
function checkRosterFields(characters) {
    const needed = [...new Set([...QUESTIONS.map((q) => q.field), "difficulty"])];
    const missing = needed.filter((field) => characters.some((c) => c[field] === undefined));

    // Values that are there but not on the field's scale: a typo, a number
    // outside 1 to 5, or the wrong kind of value. They would score as a miss.
    const unrecognised = [];
    for (const [field, rule] of Object.entries(FIELDS)) {
        if (!rule.levels) continue;

        const bad = characters.filter((c) => c[field] !== undefined && !rule.levels.includes(c[field]));
        if (bad.length) {
            const names = bad.slice(0, 3).map((c) => c.name).join(", ");
            unrecognised.push(`${field} on ${names}${bad.length > 3 ? " and more" : ""}`);
        }
    }

    const problems = [];
    if (missing.length) {
        problems.push(
            `The archive is missing ${missing.join(", ")}, so those parts of the quiz are being skipped. ` +
            `The API needs the latest index.py.`
        );
    }
    if (unrecognised.length) {
        problems.push(
            `These values are not on the scale the quiz expects: ${unrecognised.join("; ")}. ` +
            `They score as a miss, so check them in index.py.`
        );
    }

    if (problems.length) console.error(problems.join(" "));
    el.dataWarning.textContent = problems.join(" ");
    el.dataWarning.hidden = problems.length === 0;
}

// The small light in the top bar: is the archive answering?
function setStatus(state, text) {
    const light = document.getElementById("apiStatus");
    if (!light) return;
    light.dataset.state = state;
    light.querySelector(".status-text").textContent = text;
}

function trackStatus(promise) {
    promise.then(
        () => setStatus("ok", "Archive online"),
        () => setStatus("error", "Archive unreachable")
    );
    return promise;
}

let rosterReady = trackStatus(loadCharacters());
rosterReady.catch((error) => console.error(error));

// Usually already resolved. If the first load failed, try once more.
async function ensureRoster() {
    try {
        await rosterReady;
    } catch (firstAttempt) {
        setStatus("loading", "Connecting");
        rosterReady = trackStatus(loadCharacters());
        await rosterReady;
    }
}


// ============================================================
// REGION -> ACCENT COLOR  (same mapping as the Codex of Champions)
// ============================================================
const REGION_COLORS = [
    ["ionia", "ionia"], ["noxus", "noxus"], ["freljord", "freljord"], ["targon", "targon"],
    ["celestial", "targon"], ["shurima", "shurima"], ["void", "void"], ["zaun", "zaun"],
    ["bandle", "bandle"], ["spirit", "bandle"], ["demacia", "demacia"], ["piltover", "piltover"],
    ["bilgewater", "bilgewater"], ["shadow", "shadow"], ["camavor", "shadow"]
];

function getRegionColor(region) {
    const r = String(region || "").toLowerCase();
    const hit = REGION_COLORS.find(([needle]) => r.includes(needle));
    return `var(--region-${hit ? hit[1] : "default"})`;
}


// Text from the API is inserted with innerHTML, so escape it first.
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
}


// ============================================================
// HOME: THE ROSTER BY CATEGORY
// ============================================================

// One pip per level of a scaled field, lit up to the champion's level.
// Difficulty and mobility get 3 pips, skill floor and ceiling get 5.
function pips(field, value) {
    const levels = FIELDS[field].levels;
    const lit = levels.indexOf(value) + 1;
    return `<span class="pips" aria-hidden="true">${
        levels.map((_, i) => `<i class="${i < lit ? "on" : ""}"></i>`).join("")
    }</span>`;
}


function rosterCard(character, index) {
    const initial = escapeHtml((character.name || "?")[0]);
    const image = character.image
        ? `<img src="${IMAGE_BASE}${escapeHtml(character.image)}" alt="" loading="lazy" onerror="this.remove()">`
        : "";

    return `
        <article class="roster-card" style="--accent: ${getRegionColor(character.region)}; --i: ${index}">
            <span class="bracket tl"></span><span class="bracket tr"></span>
            <span class="bracket bl"></span><span class="bracket br"></span>
            <div class="roster-art" data-initial="${initial}">
                ${image}
                <span class="roster-region">${escapeHtml(character.region || "Unknown")}</span>
            </div>
            <div class="roster-body">
                <h4 class="roster-name">${escapeHtml(character.name)}</h4>
                <p class="roster-title">${escapeHtml(character.title)}</p>
                <dl class="roster-facts">
                    <div><dt>Role</dt><dd>${escapeHtml(character.role)}</dd></div>
                    <div><dt>Playstyle</dt><dd>${escapeHtml(character.playstyle)}</dd></div>
                    <div><dt>Difficulty</dt><dd>${pips("difficulty", character.difficulty)}${escapeHtml(character.difficulty)}</dd></div>
                    <div><dt>Mobility</dt><dd>${pips("mobility", character.mobility)}${escapeHtml(character.mobility)}</dd></div>
                    <div><dt>Skill floor</dt><dd>${pips("skill_floor", character.skill_floor)}${escapeHtml(character.skill_floor ?? "\u2014")}</dd></div>
                    <div><dt>Skill ceiling</dt><dd>${pips("skill_ceiling", character.skill_ceiling)}${escapeHtml(character.skill_ceiling ?? "\u2014")}</dd></div>
                </dl>
            </div>
        </article>
    `;
}


// Page numbers to show: the first, the last, and the pages around the current one, with gaps as "..."
function pageWindow(current, pages) {
    const wanted = new Set([1, pages, current - 1, current, current + 1]);
    const numbers = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    const out = [];
    numbers.forEach((n, i) => {
        if (i > 0 && n - numbers[i - 1] > 1) out.push("gap");
        out.push(n);
    });
    return out;
}


function renderPagination(total, pages, start) {
    const nav = el.pagination;
    if (total <= ROSTER_PAGE_SIZE) {
        nav.hidden = true;
        nav.innerHTML = "";
        return;
    }
    const first = start + 1;
    const last = Math.min(start + ROSTER_PAGE_SIZE, total);

    const numbers = pageWindow(rosterPage, pages).map((item) => (
        item === "gap"
            ? `<span class="page-gap" aria-hidden="true">&hellip;</span>`
            : `<button type="button" class="page-btn page-num" data-page="${item}"
                   ${item === rosterPage ? 'aria-current="page"' : ""} aria-label="Page ${item}">${item}</button>`
    )).join("");

    nav.hidden = false;
    nav.innerHTML = `
        <p class="page-summary" role="status">Showing ${first}&ndash;${last} of ${total} champions</p>
        <div class="page-buttons">
            <button type="button" class="page-btn" data-page="${rosterPage - 1}" ${rosterPage === 1 ? "disabled" : ""}
                aria-label="Previous page">&lsaquo; Prev</button>
            ${numbers}
            <span class="page-of">Page ${rosterPage} of ${pages}</span>
            <button type="button" class="page-btn" data-page="${rosterPage + 1}" ${rosterPage === pages ? "disabled" : ""}
                aria-label="Next page">Next &rsaquo;</button>
        </div>`;
}


// The roster is grouped, then cut into pages. A group that runs over the end of a page
// carries on at the top of the next one, marked "continued".
function renderRoster() {
    const group = GROUPS[groupBy];

    // Bucket the roster by the chosen category.
    const buckets = new Map();
    for (const character of allCharacters) {
        const name = group.key(character);
        if (!buckets.has(name)) buckets.set(name, []);
        buckets.get(name).push(character);
    }

    // Known groups in their set order, then any new ones alphabetically.
    const known = group.order.filter((name) => buckets.has(name));
    const extra = [...buckets.keys()].filter((name) => !group.order.includes(name)).sort();

    // One flat list in display order, each champion knowing which group it belongs to.
    const flat = [];
    for (const name of [...known, ...extra]) {
        const members = buckets.get(name).sort((a, b) => a.name.localeCompare(b.name));
        members.forEach((character, i) => flat.push({ name, size: members.length, character, first: i === 0 }));
    }

    const pages = Math.max(1, Math.ceil(flat.length / ROSTER_PAGE_SIZE));
    rosterPage = Math.min(Math.max(1, rosterPage), pages);
    const start = (rosterPage - 1) * ROSTER_PAGE_SIZE;
    const slice = flat.slice(start, start + ROSTER_PAGE_SIZE);

    // Back into runs of the same group, in order.
    const runs = [];
    for (const entry of slice) {
        const last = runs[runs.length - 1];
        if (last && last.name === entry.name) last.entries.push(entry);
        else runs.push({ name: entry.name, size: entry.size, continued: !entry.first, entries: [entry] });
    }

    el.roster.innerHTML = runs.map((run) => `
        <section class="roster-group">
            <h3 class="roster-group-title">
                <span>${escapeHtml(run.name)}</span><span class="count">${run.size}</span>
                ${run.continued ? `<span class="continued">continued</span>` : ""}
            </h3>
            <div class="roster-grid">${run.entries.map((entry, i) => rosterCard(entry.character, i)).join("")}</div>
        </section>
    `).join("");

    renderPagination(flat.length, pages, start);

    el.groupBar.querySelectorAll(".group-btn").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.group === groupBy));
    });
}


async function showHome() {
    showStage("home");
    window.scrollTo({ top: 0 });
    el.quizMeta.textContent = `${QUESTIONS.length} questions, about a minute`;

    try {
        await ensureRoster();
        renderRoster();
    }
    catch (error) {
        console.error(error);
        el.pagination.hidden = true;
        el.roster.innerHTML = `
            <p class="roster-status">
                ${escapeHtml(error.message)} Check that the API is running and that the key is correct.
                <button class="back roster-retry">Try again</button>
            </p>
        `;
    }
}


el.groupBar.addEventListener("click", (event) => {
    const button = event.target.closest(".group-btn");
    if (!button || !allCharacters.length) return;

    groupBy = button.dataset.group;
    rosterPage = 1;
    renderRoster();
});

el.pagination.addEventListener("click", (event) => {
    const button = event.target.closest(".page-btn");
    if (!button || button.disabled) return;

    rosterPage = Number(button.dataset.page);
    renderRoster();

    // back up to the top of the roster, not the top of the page
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.groupBar.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
});

el.roster.addEventListener("click", (event) => {
    if (event.target.closest(".roster-retry")) showHome();
});

// Both "Find my champion" buttons.
document.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='start-quiz']")) startQuiz();
});


// ============================================================
// RENDER ONE QUESTION
// ============================================================
function renderQuestion() {
    const question = QUESTIONS[step];

    el.progress.innerHTML = QUESTIONS
        .map((_, i) => {
            const state = i < step ? "done" : i === step ? "active" : "";
            return `<i class="${state}"></i>`;
        })
        .join("");

    el.stepCount.textContent = `Question ${step + 1} of ${QUESTIONS.length}`;
    el.questionText.textContent = question.text;
    el.questionNote.textContent = question.note;
    el.questionNote.hidden = !question.note;

    el.answers.innerHTML = question.options
        .map((option, i) => `
            <button type="button" class="plate ${option.skip ? "plate-skip" : ""}" data-option="${i}" style="--i: ${i}">
                <span class="glyph" aria-hidden="true"><span>${escapeHtml(option.glyph ?? ROMAN[i])}</span></span>
                <span class="plate-text">
                    <span class="plate-label">${escapeHtml(option.label)}</span>
                    ${option.sub ? `<span class="plate-sub">${escapeHtml(option.sub)}</span>` : ""}
                </span>
                <kbd class="plate-key" aria-hidden="true">${i + 1}</kbd>
            </button>
        `)
        .join("");

    // On the first question, "back" leads to the roster.
    el.backBtn.textContent = step === 0 ? "Back to the roster" : "Back one question";
    showStage("quiz");
}


// One listener on the container handles every plate, now and later.
el.answers.addEventListener("click", (event) => {
    const plate = event.target.closest(".plate");
    if (!plate) return;

    const question = QUESTIONS[step];
    const option = question.options[Number(plate.dataset.option)];

    answers[question.id] = option.value;

    step += 1;
    if (step < QUESTIONS.length) {
        renderQuestion();
    } else {
        finish();
    }
});

// Number keys pick an answer and Backspace goes back, while a question is showing.
document.addEventListener("keydown", (event) => {
    if (el.rite.dataset.stage !== "quiz" || event.ctrlKey || event.metaKey || event.altKey) return;

    if (/^[1-9]$/.test(event.key)) {
        const plate = el.answers.querySelectorAll(".plate")[Number(event.key) - 1];
        if (plate) {
            event.preventDefault();
            plate.click();
        }
    } else if (event.key === "Backspace") {
        event.preventDefault();
        el.backBtn.click();
    }
});

el.backBtn.addEventListener("click", () => {
    if (step === 0) {
        showHome();
        return;
    }
    step -= 1;
    delete answers[QUESTIONS[step].id];
    renderQuestion();
});


// ============================================================
// SCORE AND SHOW
// Only champions that reach their bar are recommended. If fewer than
// MIN_LIST_SIZE do, the next closest fill the list under their own heading,
// and any champion below its bar gets a notice saying so when it is shown.
// If nobody reaches a bar, the answers pull in different directions, and the
// closest are shown instead of an empty screen.
// ============================================================
async function finish() {
    showStage("loading");

    try {
        await ensureRoster();

        const selection = selectResults(allCharacters, answers);
        const ranked = selection.ranked;

        resultsAreFallback = selection.fallback;
        results = selection.shown;
        evidence = selection.evidence;

        if (DEBUG) {
            console.table(ranked.map((c) => ({
                name: c.name,
                points: Math.round(c.points * 10) / 10,
                available: c.available,
                percent: c.match_percent,
                bar: c.threshold,
                qualifies: c.qualifies
            })));
        }

        renderResult(0);
    }
    catch (error) {
        console.error(error);
        el.errorText.textContent =
            `${error.message} Check that the API is running and that the key is correct, then try again.`;
        showStage("error");
    }
}


// ============================================================
// RENDER THE MATCH
// `index` is which of the results is being shown, so clicking an
// alternate re-renders the same view for that champion.
// ============================================================
// A hexagon outline that fills clockwise up to the match percentage.
function matchRingHtml(percent) {
    const hex = "M43.3 0 L86.6 25 L86.6 75 L43.3 100 L0 75 L0 25 Z";
    const fill = Math.max(0, Math.min(100, percent));
    return `
        <span class="match-ring" role="img" aria-label="${percent} percent match">
            <svg viewBox="-6 -6 98.6 112" aria-hidden="true" focusable="false">
                <path class="ring-fill" d="${hex}"/>
                <path class="ring-track" d="${hex}"/>
                <path class="ring-bar" d="${hex}" pathLength="100" stroke-dasharray="${fill} 100"/>
            </svg>
            <span class="match-figure">${percent}<span class="pct">%</span></span>
        </span>`;
}


function renderResult(index) {
    const character = results[index];
    const accent = getRegionColor(character.region);

    // A champion below its bar is never shown as a plain recommendation.
    el.notice.hidden = character.qualifies;
    el.notice.textContent = resultsAreFallback
        ? "Your answers pull in different directions, so no champion reached its bar. These came closest, but none is a full match."
        : "This champion is close, but it didn't reach its bar for your answers, so it isn't a full match.";

    el.reveal.style.setProperty("--accent", accent);

    // Skip a chip rather than print "Floor  of 5" when the API has no value.
    const levelChip = (label, value) =>
        value === undefined ? "" : `<span class="trait">${label} ${escapeHtml(value)} of 5</span>`;

    const portrait = character.image
        ? `<img src="${IMAGE_BASE}${escapeHtml(character.image)}" alt="${escapeHtml(character.name)}" onerror="this.remove()">`
        : "";

    const reasons = character.reasons.length
        ? character.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")
        : `<li class="reasons-empty">Nothing you asked for lines up exactly, so this is the closest the roster has.</li>`;

    // How much of the quiz this match rests on.
    const thin = evidence.share < 0.6;
    const evidenceLine = `Based on <b>${evidence.answered} of ${evidence.total}</b> questions.${
        thin ? " You skipped a lot, so answer more for a sharper match." : ""}`;

    const gaps = (character.gaps || []).map((g) => `<li>${escapeHtml(g)}</li>`).join("");

    el.reveal.innerHTML = `
        <div class="reveal-top">
            <div class="portrait"><div data-initial="${escapeHtml((character.name || "?")[0])}">${portrait}</div></div>
            <div class="reveal-head">
                <div class="match">
                    ${matchRingHtml(character.match_percent)}
                    <span class="match-label">match with<br>your answers</span>
                </div>
                <h2 class="champion-name">${escapeHtml(character.name)}</h2>
                <p class="champion-title">${escapeHtml(character.title)}</p>
                <p class="evidence">${evidenceLine}</p>
            </div>
        </div>

        <div class="traits">
            <span class="trait trait-accent">${escapeHtml(character.playstyle)}</span>
            <span class="trait">${escapeHtml(character.role)}</span>
            ${levelChip("Floor", character.skill_floor)}
            ${levelChip("Ceiling", character.skill_ceiling)}
            <span class="trait">${escapeHtml(character.attack_type)}</span>
            <span class="trait">${escapeHtml(character.region)}</span>
        </div>

        <div class="reveal-cols">
            <section class="panel panel-fit" style="--i: 0">
                <h3>Why it fits</h3>
                <ul class="reasons">${reasons}</ul>
            </section>
            ${gaps ? `
            <section class="panel panel-gap" style="--i: 1">
                <h3>Where it differs</h3>
                <ul class="gaps">${gaps}</ul>
            </section>` : ""}
        </div>

        <div class="reveal-lore">
            <h3 class="blurb-heading">Who you would be playing</h3>
            <p class="blurb">${escapeHtml(character.personality)}</p>
            <p class="blurb">${escapeHtml(character.lore || "")}</p>
        </div>
    `;

    renderAlternates(index);
    showStage("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
}


function renderAlternates(shownIndex) {
    const others = results
        .map((character, i) => ({ character, i }))
        .filter((item) => item.i !== shownIndex);

    if (others.length === 0) {
        el.alternates.innerHTML = "";
        return;
    }

    const row = ({ character, i }, n) => `
        <button type="button" class="alt" data-index="${i}" style="--accent: ${getRegionColor(character.region)}; --i: ${n + 2}">
            <span class="alt-thumb">${character.image ? `<img src="${IMAGE_BASE}${escapeHtml(character.image)}" alt="" onerror="this.remove()">` : ""}</span>
            <span>
                <span class="alt-name">${escapeHtml(character.name)}</span><br>
                <span class="alt-meta">${escapeHtml(character.playstyle)} &middot; ${escapeHtml(character.role)}</span>
            </span>
            <span class="alt-score">${character.match_percent}%</span>
        </button>
    `;

    const matches = others.filter((item) => item.character.qualifies);
    const close = others.filter((item) => !item.character.qualifies);

    el.alternates.innerHTML =
        (matches.length ? `<h3 class="alternates-heading">Also a match</h3>${matches.map(row).join("")}` : "") +
        (close.length ? `<h3 class="alternates-heading">Next closest</h3>${close.map(row).join("")}` : "");
}


el.alternates.addEventListener("click", (event) => {
    const alt = event.target.closest(".alt");
    if (!alt) return;
    renderResult(Number(alt.dataset.index));
});


// ============================================================
// START, RESTART
// ============================================================
function startQuiz() {
    step = 0;
    answers = {};
    results = [];
    resultsAreFallback = false;
    renderQuestion();
    window.scrollTo({ top: 0 });
}

document.getElementById("restartBtn").addEventListener("click", startQuiz);
document.getElementById("retryBtn").addEventListener("click", startQuiz);
document.getElementById("homeBtn").addEventListener("click", showHome);


showHome();
const API_URL = "https://cloud-computing-activity.vercel.app/api/v1";
const API_KEY = "arceo-api-key-123";

const FETCH_OPTIONS = {
    headers: {
        "x-api-key": API_KEY
    }
};

// When true, the console shows every champion's points and bar after each
// quiz, and the calibrated bars when the roster loads. Handy for tuning.
const DEBUG = false;


// ============================================================
// THE QUIZ
// Each question feeds ONE field of the character data and is worth a
// fixed number of `points`. All questions together are worth 100.
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
// look-alikes can fill the whole list. With this on, the real matches after
// the #1 pick are taken from other playstyles first, and look-alikes of the
// #1 only fill what is left. Set it to false for a plain ranking.
const SPREAD_BY_PLAYSTYLE = true;

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
        points += question.points * credit;
        available += question.points;
        parts.push({ question, clicked, credit });
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
        .map(({ question, clicked, credit }) => ({
            weight: question.points,
            text: reasonFor(question.field, character, clicked, credit)
        }))
        .filter((item) => item.text)
        .sort((a, b) => b.weight - a.weight);

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
        reasons
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
let allCharacters = [];
let groupBy = "role";

const el = {
    rite:         document.getElementById("rite"),
    standfirst:   document.getElementById("standfirst"),
    home:         document.getElementById("homeStage"),
    quizMeta:     document.getElementById("quizMeta"),
    dataWarning:  document.getElementById("dataWarning"),
    groupBar:     document.getElementById("groupBar"),
    roster:       document.getElementById("roster"),
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

let rosterReady = loadCharacters();
rosterReady.catch((error) => console.error(error));

// Usually already resolved. If the first load failed, try once more.
async function ensureRoster() {
    try {
        await rosterReady;
    } catch (firstAttempt) {
        rosterReady = loadCharacters();
        await rosterReady;
    }
}


// ============================================================
// REGION -> ACCENT COLOR  (same mapping as the character archive)
// ============================================================
function getRegionColor(region) {
    if (!region) return "var(--region-default)";
    const r = region.toLowerCase();

    if (r.includes("ionia")) return "var(--region-ionia)";
    if (r.includes("noxus")) return "var(--region-noxus)";
    if (r.includes("freljord")) return "var(--region-freljord)";
    if (r.includes("targon")) return "var(--region-targon)";
    if (r.includes("shurima")) return "var(--region-shurima)";
    if (r.includes("void")) return "var(--region-void)";
    if (r.includes("zaun")) return "var(--region-zaun)";
    if (r.includes("bandle") || r.includes("spirit")) return "var(--region-bandle)";

    return "var(--region-default)";
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


function rosterCard(character) {
    const image = character.image
        ? `<img class="roster-thumb" src="images/${escapeHtml(character.image)}" alt="">`
        : `<div class="roster-thumb"></div>`;

    return `
        <article class="roster-card" style="--accent: ${getRegionColor(character.region)}">
            ${image}
            <div>
                <h4 class="roster-name">${escapeHtml(character.name)}</h4>
                <p class="roster-title">${escapeHtml(character.title)}</p>
            </div>
            <dl class="roster-facts">
                <div><dt>Role</dt><dd>${escapeHtml(character.role)}</dd></div>
                <div><dt>Playstyle</dt><dd>${escapeHtml(character.playstyle)}</dd></div>
                <div><dt>Difficulty</dt><dd>${pips("difficulty", character.difficulty)}${escapeHtml(character.difficulty)}</dd></div>
                <div><dt>Mobility</dt><dd>${pips("mobility", character.mobility)}${escapeHtml(character.mobility)}</dd></div>
                <div><dt>Skill floor</dt><dd>${pips("skill_floor", character.skill_floor)}${escapeHtml(character.skill_floor ?? "—")}</dd></div>
                <div><dt>Skill ceiling</dt><dd>${pips("skill_ceiling", character.skill_ceiling)}${escapeHtml(character.skill_ceiling ?? "—")}</dd></div>
            </dl>
        </article>
    `;
}


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

    el.roster.innerHTML = [...known, ...extra].map((name) => {
        const members = buckets.get(name).sort((a, b) => a.name.localeCompare(b.name));
        return `
            <section class="roster-group">
                <h3 class="roster-group-title">${escapeHtml(name)} <span class="count">${members.length}</span></h3>
                <div class="roster-grid">${members.map(rosterCard).join("")}</div>
            </section>
        `;
    }).join("");

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
    renderRoster();
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
            <button class="plate ${option.skip ? "plate-skip" : ""}" data-option="${i}">
                <span class="glyph" aria-hidden="true">${option.glyph ?? ROMAN[i]}</span>
                <span class="plate-label">${escapeHtml(option.label)}</span>
                ${option.sub ? `<span class="plate-sub">${escapeHtml(option.sub)}</span>` : ""}
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

        const ranked = rankCharacters(allCharacters, answers);
        let real = ranked.filter((c) => c.qualifies);

        if (SPREAD_BY_PLAYSTYLE && real.length > 1) {
            const [best, ...others] = real;
            real = [
                best,
                ...others.filter((c) => c.playstyle !== best.playstyle),
                ...others.filter((c) => c.playstyle === best.playstyle)
            ];
        }

        const matches = real.slice(0, MAX_RESULTS);

        // Too few real matches to fill the list? Add the next closest.
        const fill = ranked
            .filter((c) => !c.qualifies)
            .slice(0, Math.max(0, MIN_LIST_SIZE - matches.length));

        resultsAreFallback = matches.length === 0;
        results = [...matches, ...fill];

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
        ? `<img src="images/${escapeHtml(character.image)}" alt="${escapeHtml(character.name)}">`
        : "";

    const reasons = character.reasons.length
        ? character.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")
        : `<li class="reasons-empty">Nothing you asked for lines up exactly, so this is the closest the roster has.</li>`;

    el.reveal.innerHTML = `
        <div class="reveal-top">
            <div class="portrait">${portrait}</div>
            <div>
                <div class="match">
                    <span class="match-figure">${character.match_percent}<span class="pct">%</span></span>
                    <span class="match-label">match with your answers</span>
                </div>
                <h2 class="champion-name">${escapeHtml(character.name)}</h2>
                <p class="champion-title">${escapeHtml(character.title)}</p>
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

        <ul class="reasons">${reasons}</ul>

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

    const row = ({ character, i }) => `
        <button class="alt" data-index="${i}">
            <img class="alt-thumb" src="images/${escapeHtml(character.image)}" alt="">
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
-- ─────────────────────────────────────────────────────────────────────────────
-- Bob Comic Studio — Seed Data (development / demo)
-- ─────────────────────────────────────────────────────────────────────────────

-- Demo project
INSERT INTO projects (title, description, genre, status) VALUES
(
    'The Shattered Grid',
    'A sci-fi thriller set in post-EMP Earth 2147. A whistleblower Runner uncovers a conspiracy that could reconnect — or permanently destroy — what remains of civilisation.',
    'sci-fi',
    'active'
);

-- Characters for demo project
INSERT INTO characters (project_id, name, role, backstory, personality, appearance, abilities, arc, ai_generated) VALUES
(
    1,
    'Nova Reyes',
    'protagonist',
    'Former corporate data analyst who discovered human augmentation experiments. Stole the evidence and became a fugitive whistleblower overnight.',
    'Methodical, fiercely principled, dry humour, trusts data over people',
    'Late 20s, cropped dark hair with a silver streak, augmented left eye (glows amber), worn leather jacket with hidden pockets',
    'Hacking, data analysis, photographic memory, basic combat training',
    'Learns that justice sometimes requires breaking rules she once enforced; vulnerability is not weakness',
    TRUE
),
(
    1,
    'Director Kael Voss',
    'antagonist',
    'Architect of the augmentation programme. Genuinely believes he is saving humanity by accelerating forced evolution. Lost his family in the Collapse.',
    'Coldly pragmatic, believes ends justify means, surprisingly warm in private moments',
    'Mid-50s, silver buzz cut, always in Architect grey uniform, mechanical right hand he hides with a glove',
    'Master strategist, Architect political connections, access to full Grid infrastructure',
    'Forces Nova — and the reader — to question whether his vision is entirely wrong',
    TRUE
),
(
    1,
    'Cee (Cipher)',
    'supporting',
    'A teenage Runner who has been carrying messages between nodes for three years. Knows every secret route through the Barrens.',
    'Sarcastic, street-smart, deeply loyal to people who earn it, terrified of the dark',
    'Early teens, wiry, patchwork clothes covered in coded patches, fingerless gloves',
    'Parkour, dead reckoning navigation, lockpicking, reading people',
    'Graduates from surviving to choosing — ultimately decides what kind of world to help build',
    TRUE
);

-- World for demo project
INSERT INTO worlds (project_id, name, type, overview, geography, factions, timeline, rules, ai_generated) VALUES
(
    1,
    'The Shattered Grid',
    'sci-fi',
    'Earth 2147. After the Cascades (three simultaneous solar EMPs), civilisation reorganised into walled city-nodes. Technology works but the global network is gone forever.',
    '12 surviving city-nodes across North America; The Barrens between them; underground data vaults beneath each node',
    '[{"name":"The Architects","description":"Engineers who control infrastructure and power","alignment":"Lawful Neutral"},{"name":"Runners","description":"Couriers and scouts of the free-zones","alignment":"Chaotic Good"},{"name":"The Silent","description":"A cult that believes the EMP was divine judgment","alignment":"Lawful Evil"}]',
    '[{"era":"Pre-Cascade","event":"Global hyper-connectivity, AI governance"},{"era":"The Cascade (2099)","event":"Three simultaneous solar EMPs destroy global network"},{"era":"The Collapse (2099-2110)","event":"War, famine, mass migration to node-cities"},{"era":"The Rebuild (2110-present)","event":"Fragile order restored behind city walls"}]',
    'No wireless transmission works beyond 500m. All data travels physically. Power is rationed to 18 hours per day.',
    TRUE
);

-- Demo plot
INSERT INTO plots (project_id, premise, act_one, act_two, act_three, ai_generated) VALUES
(
    1,
    'A data analyst turned fugitive must deliver evidence of mass human experimentation across a lawless wasteland before the man who ordered it erases both her and the truth.',
    '[{"beat":"Ordinary World","description":"Nova''s last day as an Architect analyst — competent, cynical, invisible"},{"beat":"Inciting Incident","description":"She accidentally accesses File Zero — evidence of 10,000 unauthorised augmentations"},{"beat":"Break Into Act 2","description":"Her access is flagged; she has 4 minutes to copy the file and run"}]',
    '[{"beat":"Rising Stakes","description":"Every node-to-node route is watched; she must go through the Barrens"},{"beat":"Midpoint Twist","description":"Cee reveals the evidence destination — Node 7 — was destroyed last month"},{"beat":"Dark Night","description":"Nova is captured; the file appears to be wiped; Cee is missing"}]',
    '[{"beat":"Revelation","description":"Cee memorised the file contents — the whole thing — on first read"},{"beat":"Climax","description":"Nova broadcasts via every physical data terminal in Node 1 simultaneously"},{"beat":"Resolution","description":"Voss is arrested; the augmentation programme is exposed; the Runners become the new network"}]',
    TRUE
);

/**
 * ⚠️  IMPORTANT: DO NOT COMMIT TO PUBLIC REPOSITORIES ⚠️
 *
 * This file contains copyrighted content from "Blades in the Dark"
 * by John Harper. It is included here solely for:
 * - Development and testing purposes
 * - Demonstrating the game data structure
 * - Internal system validation
 *
 * This content is protected by copyright and should NEVER be:
 * - Committed to public repositories
 * - Distributed publicly
 * - Used for commercial purposes
 *
 * For production use, replace with your own original content or
 * properly licensed game data.
 *
 * Blades in the Dark © John Harper
 */


import { TabletopRpgGameData } from "./types/tabletop-rpg";

export const bladesInTheDarkCompleteJson: TabletopRpgGameData = {
    "metadata": {
        "id": "blades-in-the-dark",
        "nameKey": "game.name",
        "version": "1.0.0",
        "schemaVersion": "1.0.0",
        "compatibilityVersion": "1.0.0",
        "gameDataVersion": "1.0.0",
        "author": "John Harper",
        "descriptionKey": "game.description",
        "gameFamily": "blades-in-the-dark",
        "system": "forged-in-the-dark",
        "tags": [
            "fantasy",
            "heist",
            "crew",
            "urban",
            "supernatural"
        ],
        "minimumAge": 13,
        "playerCount": {
            "min": 2,
            "max": 6,
            "optimal": 4
        },
        "sessionLength": {
            "min": 180,
            "max": 300,
            "typical": 240
        },
        "assets": {
            "logo": "/assets/blades/logo.svg",
            "background": "/assets/blades/doskvol-background.jpg",
            "icon": "/assets/blades/icon.png"
        },
        "fitdVariant": {
            "coreSystem": "blades-in-the-dark",
            "settingTheme": "criminal",
            "groupFocus": "heist",
            "characterProgression": "standard"
        }
    },
    "i18n": {
        "supportedLanguages": [
            "en"
        ],
        "defaultLanguage": "en",
        "terminology": {
            // Core FitD terminology - Blades variant
            "group.name": { "en": "Crew", "default": "Crew" },
            "group.leader": { "en": "Leader", "default": "Leader" },
            "character.template": { "en": "Playbook", "default": "Playbook" },
            "mission.name": { "en": "Score", "default": "Score" },
            "mission.planning": { "en": "Planning", "default": "Planning" },

            // Character progression
            "advancement.experience": { "en": "XP", "default": "XP" },
            "character.stress": { "en": "Stress", "default": "Stress" },
            "character.harm": { "en": "Harm", "default": "Harm" },
            "character.trauma": { "en": "Trauma", "default": "Trauma" },

            // Group resources
            "group.experience": { "en": "Rep", "default": "Rep" },
            "group.currency": { "en": "Coin", "default": "Coin" },
            "group.heat": { "en": "Heat", "default": "Heat" },
            "group.tier": { "en": "Tier", "default": "Tier" },

            // Activities
            "activity.downtime": { "en": "Downtime", "default": "Downtime" },
            "activity.consequences": { "en": "Entanglements", "default": "Entanglements" },
            "activity.freeplay": { "en": "Free Play", "default": "Free Play" },

            // Mechanics
            "mechanic.position": { "en": "Position", "default": "Position" },
            "mechanic.effect": { "en": "Effect", "default": "Effect" },
            "mechanic.fortune": { "en": "Fortune Roll", "default": "Fortune Roll" },
            "mechanic.resistance": { "en": "Resistance Roll", "default": "Resistance Roll" },
            "mechanic.teamwork": { "en": "Teamwork", "default": "Teamwork" },

            // Character templates
            "template.cutter": { "en": "Cutter", "default": "Cutter" },
            "template.hound": { "en": "Hound", "default": "Hound" },
            "template.leech": { "en": "Leech", "default": "Leech" },
            "template.lurk": { "en": "Lurk", "default": "Lurk" },
            "template.slide": { "en": "Slide", "default": "Slide" },
            "template.spider": { "en": "Spider", "default": "Spider" },
            "template.whisper": { "en": "Whisper", "default": "Whisper" },

            // Attributes
            "attribute.insight": { "en": "Insight", "default": "Insight" },
            "attribute.prowess": { "en": "Prowess", "default": "Prowess" },
            "attribute.resolve": { "en": "Resolve", "default": "Resolve" },

            // Skills
            "skill.hunt": { "en": "Hunt", "default": "Hunt" },
            "skill.study": { "en": "Study", "default": "Study" },
            "skill.survey": { "en": "Survey", "default": "Survey" },
            "skill.tinker": { "en": "Tinker", "default": "Tinker" },
            "skill.finesse": { "en": "Finesse", "default": "Finesse" },
            "skill.prowl": { "en": "Prowl", "default": "Prowl" },
            "skill.skirmish": { "en": "Skirmish", "default": "Skirmish" },
            "skill.wreck": { "en": "Wreck", "default": "Wreck" },
            "skill.attune": { "en": "Attune", "default": "Attune" },
            "skill.command": { "en": "Command", "default": "Command" },
            "skill.consort": { "en": "Consort", "default": "Consort" },
            "skill.sway": { "en": "Sway", "default": "Sway" },

            // Special abilities
            "ability.battleborn": { "en": "Battleborn", "default": "Battleborn" },
            "ability.bodyguard": { "en": "Bodyguard", "default": "Bodyguard" },
            "ability.sharpshooter": { "en": "Sharpshooter", "default": "Sharpshooter" },
            "ability.alchemist": { "en": "Alchemist", "default": "Alchemist" },
            "ability.infiltrator": { "en": "Infiltrator", "default": "Infiltrator" },
            "ability.rook_s_gambit": { "en": "Rook's Gambit", "default": "Rook's Gambit" },
            "ability.foresight": { "en": "Foresight", "default": "Foresight" },
            "ability.ghost_mind": { "en": "Ghost Mind", "default": "Ghost Mind" },

            // Equipment categories
            "equipment.weapons": { "en": "Weapons", "default": "Weapons" },
            "equipment.tools": { "en": "Tools", "default": "Tools" },
            "equipment.documents": { "en": "Documents", "default": "Documents" },

            // Group types
            "group.assassins": { "en": "Assassins", "default": "Assassins" },
            "group.bravos": { "en": "Bravos", "default": "Bravos" },
            "group.cult": { "en": "Cult", "default": "Cult" },
            "group.hawkers": { "en": "Hawkers", "default": "Hawkers" },
            "group.shadows": { "en": "Shadows", "default": "Shadows" },
            "group.smugglers": { "en": "Smugglers", "default": "Smugglers" },

            // Character options
            "heritage.akoros": { "en": "Akoros", "default": "Akoros" },
            "heritage.dagger_isles": { "en": "Dagger Isles", "default": "Dagger Isles" },
            "heritage.iruvia": { "en": "Iruvia", "default": "Iruvia" },
            "heritage.severos": { "en": "Severos", "default": "Severos" },
            "heritage.skovlan": { "en": "Skovlan", "default": "Skovlan" },
            "heritage.tycheros": { "en": "Tycheros", "default": "Tycheros" },
            "background.academic": { "en": "Academic", "default": "Academic" },
            "background.labor": { "en": "Labor", "default": "Labor" },
            "background.law": { "en": "Law", "default": "Law" },
            "background.trade": { "en": "Trade", "default": "Trade" },
            "background.military": { "en": "Military", "default": "Military" },
            "background.noble": { "en": "Noble", "default": "Noble" },
            "background.underworld": { "en": "Underworld", "default": "Underworld" },
            "vice.faith": { "en": "Faith", "default": "Faith" },
            "vice.gambling": { "en": "Gambling", "default": "Gambling" },
            "vice.luxury": { "en": "Luxury", "default": "Luxury" },
            "vice.obligation": { "en": "Obligation", "default": "Obligation" },
            "vice.pleasure": { "en": "Pleasure", "default": "Pleasure" },
            "vice.stupor": { "en": "Stupor", "default": "Stupor" },
            "vice.weird": { "en": "Weird", "default": "Weird" },

            // Locations and factions
            "location.barrowcleft": { "en": "Barrowcleft", "default": "Barrowcleft" },
            "location.brightstone": { "en": "Brightstone", "default": "Brightstone" },
            "location.charterhall": { "en": "Charterhall", "default": "Charterhall" },
            "location.crows_foot": { "en": "Crow's Foot", "default": "Crow's Foot" },
            "location.dunslough": { "en": "Dunslough", "default": "Dunslough" },
            "location.six_towers": { "en": "Six Towers", "default": "Six Towers" },
            "faction.bluecoats": { "en": "Bluecoats", "default": "Bluecoats" },
            "faction.red_sashes": { "en": "Red Sashes", "default": "Red Sashes" },
            "faction.lampblacks": { "en": "Lampblacks", "default": "Lampblacks" },

            // Positions and effects
            "position.controlled": { "en": "Controlled", "default": "Controlled" },
            "position.risky": { "en": "Risky", "default": "Risky" },
            "position.desperate": { "en": "Desperate", "default": "Desperate" },
            "effect.great": { "en": "Great", "default": "Great" },
            "effect.standard": { "en": "Standard", "default": "Standard" },
            "effect.limited": { "en": "Limited", "default": "Limited" },

            // Harm levels
            "harm.lesser": { "en": "Lesser Harm", "default": "Lesser Harm" },
            "harm.moderate": { "en": "Moderate Harm", "default": "Moderate Harm" },
            "harm.severe": { "en": "Severe Harm", "default": "Severe Harm" },

            // XP and advancement
            "xp.playbook": { "en": "Playbook XP", "default": "Playbook XP" },
            "xp.attributes": { "en": "Attributes XP", "default": "Attributes XP" },
            "xp.struggle": { "en": "Struggle XP", "default": "Struggle XP" },
            "advancement.add_action_dot": { "en": "Add Action Dot", "default": "Add Action Dot" },
            "advancement.add_special_ability": { "en": "Add Special Ability", "default": "Add Special Ability" },

            // Character creation steps
            "step.choose_playbook": { "en": "Choose a Playbook", "default": "Choose a Playbook" },
            "step.choose_heritage": { "en": "Choose Heritage", "default": "Choose Heritage" },
            "step.choose_background": { "en": "Choose Background", "default": "Choose Background" },
            "step.choose_vice": { "en": "Choose Vice", "default": "Choose Vice" },
            "step.assign_action_dots": { "en": "Assign Action Dots", "default": "Assign Action Dots" },
            "step.choose_special_ability": { "en": "Choose Special Ability", "default": "Choose Special Ability" },
            "step.choose_contact": { "en": "Choose Contact", "default": "Choose Contact" },

            // Equipment items
            "equipment.fine_heavy_weapon": { "en": "Fine Heavy Weapon", "default": "Fine Heavy Weapon" },
            "equipment.fine_hand_weapon": { "en": "Fine Hand Weapon", "default": "Fine Hand Weapon" },
            "equipment.fine_lockpicks": { "en": "Fine Lockpicks", "default": "Fine Lockpicks" },

            // Scenario types
            "scenario.assassination": { "en": "Assassination", "default": "Assassination" },
            "scenario.burglary": { "en": "Burglary", "default": "Burglary" },
            "scenario.espionage": { "en": "Espionage", "default": "Espionage" },

            // Random events
            "event.arrest": { "en": "Arrest", "default": "Arrest" },
            "event.cooperation": { "en": "Cooperation", "default": "Cooperation" },
            "event.demonic_notice": { "en": "Demonic Notice", "default": "Demonic Notice" },

            // Challenges
            "challenge.locks_traps": { "en": "Locks & Traps", "default": "Locks & Traps" },
            "challenge.guards_patrols": { "en": "Guards & Patrols", "default": "Guards & Patrols" },
            "challenge.supernatural_forces": { "en": "Supernatural Forces", "default": "Supernatural Forces" },

            // Additional Blades-specific terms
            "wanted_level": { "en": "Wanted Level", "default": "Wanted Level" },
            "devil_bargain": { "en": "Devil's Bargain", "default": "Devil's Bargain" }
        },
        "strings": {
            // Game metadata
            "game.name": {
                "en": "Blades in the Dark",
                "default": "Blades in the Dark"
            },
            "game.description": {
                "en": "A tabletop role-playing game about a crew of daring scoundrels seeking their fortunes on the haunted streets of an industrial-fantasy city.",
                "default": "A tabletop role-playing game about a crew of daring scoundrels seeking their fortunes on the haunted streets of an industrial-fantasy city."
            },

            // Character template descriptions
            "template.cutter.description": {
                "en": "A dangerous and intimidating fighter",
                "default": "A dangerous and intimidating fighter"
            },
            "template.hound.description": {
                "en": "A deadly sharpshooter and tracker",
                "default": "A deadly sharpshooter and tracker"
            },
            "template.leech.description": {
                "en": "A saboteur and technician",
                "default": "A saboteur and technician"
            },
            "template.lurk.description": {
                "en": "A stealthy infiltrator",
                "default": "A stealthy infiltrator"
            },
            "template.slide.description": {
                "en": "A subtle manipulator and spy",
                "default": "A subtle manipulator and spy"
            },
            "template.spider.description": {
                "en": "A devious mastermind",
                "default": "A devious mastermind"
            },
            "template.whisper.description": {
                "en": "An arcane adept",
                "default": "An arcane adept"
            },

            // Attribute descriptions
            "attribute.insight.description": {
                "en": "Your character's perception, knowledge, and wits",
                "default": "Your character's perception, knowledge, and wits"
            },
            "attribute.prowess.description": {
                "en": "Your character's physical capabilities and coordination",
                "default": "Your character's physical capabilities and coordination"
            },
            "attribute.resolve.description": {
                "en": "Your character's mental fortitude, persuasiveness, and weird powers",
                "default": "Your character's mental fortitude, persuasiveness, and weird powers"
            },

            // Skill descriptions
            "skill.hunt.description": {
                "en": "Carefully track a target",
                "default": "Carefully track a target"
            },
            "skill.study.description": {
                "en": "Scrutinize details and interpret evidence",
                "default": "Scrutinize details and interpret evidence"
            },
            "skill.survey.description": {
                "en": "Observe the situation and anticipate outcomes",
                "default": "Observe the situation and anticipate outcomes"
            },
            "skill.tinker.description": {
                "en": "Fiddle with devices and mechanisms",
                "default": "Fiddle with devices and mechanisms"
            },
            "skill.finesse.description": {
                "en": "Employ dexterous manipulation or subtle misdirection",
                "default": "Employ dexterous manipulation or subtle misdirection"
            },
            "skill.prowl.description": {
                "en": "Traverse skillfully and quietly",
                "default": "Traverse skillfully and quietly"
            },
            "skill.skirmish.description": {
                "en": "Entangle a target in close combat so they can't easily escape",
                "default": "Entangle a target in close combat so they can't easily escape"
            },
            "skill.wreck.description": {
                "en": "Unleash savage force",
                "default": "Unleash savage force"
            },
            "skill.attune.description": {
                "en": "Open your mind to arcane power",
                "default": "Open your mind to arcane power"
            },
            "skill.command.description": {
                "en": "Compel swift obedience",
                "default": "Compel swift obedience"
            },
            "skill.consort.description": {
                "en": "Socialize with friends and contacts",
                "default": "Socialize with friends and contacts"
            },
            "skill.sway.description": {
                "en": "Influence with guile, charm, or argument",
                "default": "Influence with guile, charm, or argument"
            },

            // Special ability descriptions
            "ability.battleborn.description": {
                "en": "You may expend your special armor to reduce harm from an attack in combat or to push yourself during a fight.",
                "default": "You may expend your special armor to reduce harm from an attack in combat or to push yourself during a fight."
            },
            "ability.bodyguard.description": {
                "en": "When you protect a teammate, take +1d to your resistance roll. When you gather info to anticipate possible threats in the current situation, you get +1 effect.",
                "default": "When you protect a teammate, take +1d to your resistance roll. When you gather info to anticipate possible threats in the current situation, you get +1 effect."
            },
            "ability.sharpshooter.description": {
                "en": "You can push yourself to do one of the following: make a ranged attack at extreme distance beyond what's normal for the weapon—unleash a barrage of rapid fire to suppress the enemy.",
                "default": "You can push yourself to do one of the following: make a ranged attack at extreme distance beyond what's normal for the weapon—unleash a barrage of rapid fire to suppress the enemy."
            },
            "ability.alchemist.description": {
                "en": "When you invent or craft a creation with alchemicals, take +1 result level to your roll. You begin each score with light load if you choose not to take a standard loadout. You create 2 alchemicals from the list below (with their load included) at the start of each score.",
                "default": "When you invent or craft a creation with alchemicals, take +1 result level to your roll. You begin each score with light load if you choose not to take a standard loadout. You create 2 alchemicals from the list below (with their load included) at the start of each score."
            },
            "ability.infiltrator.description": {
                "en": "You are not affected by quality or Tier when you bypass security measures. When you survey to gather information, you get +1 effect.",
                "default": "You are not affected by quality or Tier when you bypass security measures. When you survey to gather information, you get +1 effect."
            },
            "ability.rook_s_gambit.description": {
                "en": "When you attempt to seduce or manipulate someone, you may always ask one of the following questions as a free inquiry (even on a failure): What does your character wish I would do? What does your character fear most? How could I get your character to __?",
                "default": "When you attempt to seduce or manipulate someone, you may always ask one of the following questions as a free inquiry (even on a failure): What does your character wish I would do? What does your character fear most? How could I get your character to __?"
            },
            "ability.foresight.description": {
                "en": "Two times per score you can assist a teammate without paying stress. Tell us how you prepared for this.",
                "default": "Two times per score you can assist a teammate without paying stress. Tell us how you prepared for this."
            },
            "ability.ghost_mind.description": {
                "en": "You're always aware of supernatural entities in your presence. Take +1d whenever you gather information about the supernatural by any means.",
                "default": "You're always aware of supernatural entities in your presence. Take +1d whenever you gather information about the supernatural by any means."
            },

            // Heritage descriptions
            "heritage.akoros.description": {
                "en": "The largest land in the Imperium, your homeland is covered in verdant fields, rolling hills, and robust mining operations",
                "default": "The largest land in the Imperium, your homeland is covered in verdant fields, rolling hills, and robust mining operations"
            },
            "heritage.dagger_isles.description": {
                "en": "Your heritage is from the nearby archipelago, dominated by scavengers and pirates",
                "default": "Your heritage is from the nearby archipelago, dominated by scavengers and pirates"
            },
            "heritage.iruvia.description": {
                "en": "Your heritage is from the desert cities to the south, where war and rebellion are common",
                "default": "Your heritage is from the desert cities to the south, where war and rebellion are common"
            },
            "heritage.severos.description": {
                "en": "Your heritage is from the distant reaches of the northern lands, where the old ways still hold sway",
                "default": "Your heritage is from the distant reaches of the northern lands, where the old ways still hold sway"
            },
            "heritage.skovlan.description": {
                "en": "Your heritage is from the nearby lands where the recent war was fought",
                "default": "Your heritage is from the nearby lands where the recent war was fought"
            },
            "heritage.tycheros.description": {
                "en": "Your heritage is from the remote islands far to the east, known for their martial arts and metal-working",
                "default": "Your heritage is from the remote islands far to the east, known for their martial arts and metal-working"
            },

            // Background descriptions
            "background.academic.description": {
                "en": "Professor, Scholar, Tutor, Student, etc.",
                "default": "Professor, Scholar, Tutor, Student, etc."
            },
            "background.labor.description": {
                "en": "Stevedore, Miner, Servant, Factory worker, etc.",
                "default": "Stevedore, Miner, Servant, Factory worker, etc."
            },
            "background.law.description": {
                "en": "Advocate, Barrister, Investigator, Inspector, etc.",
                "default": "Advocate, Barrister, Investigator, Inspector, etc."
            },
            "background.trade.description": {
                "en": "Shopkeeper, Trader, Merchant, Clerk, etc.",
                "default": "Shopkeeper, Trader, Merchant, Clerk, etc."
            },
            "background.military.description": {
                "en": "Officer, Soldier, Marine, Sailor, etc.",
                "default": "Officer, Soldier, Marine, Sailor, etc."
            },
            "background.noble.description": {
                "en": "Lord/Lady, Courtier, Diplomat, Dilettante, etc.",
                "default": "Lord/Lady, Courtier, Diplomat, Dilettante, etc."
            },
            "background.underworld.description": {
                "en": "Thief, Bully, Fence, Gambler, etc.",
                "default": "Thief, Bully, Fence, Gambler, etc."
            },

            // Vice descriptions
            "vice.faith.description": {
                "en": "You're dedicated to an unswerving belief",
                "default": "You're dedicated to an unswerving belief"
            },
            "vice.gambling.description": {
                "en": "You crave games of chance, and risks for their own sake",
                "default": "You crave games of chance, and risks for their own sake"
            },
            "vice.luxury.description": {
                "en": "Expensive or ostentatious displays of opulence",
                "default": "Expensive or ostentatious displays of opulence"
            },
            "vice.obligation.description": {
                "en": "You're devoted to a family, cause, organization, charity, etc.",
                "default": "You're devoted to a family, cause, organization, charity, etc."
            },
            "vice.pleasure.description": {
                "en": "Gratification from lovers, food, drink, drugs, art, theater, etc.",
                "default": "Gratification from lovers, food, drink, drugs, art, theater, etc."
            },
            "vice.stupor.description": {
                "en": "You seek oblivion in the abuse of drugs, drink to excess, getting beaten up, etc.",
                "default": "You seek oblivion in the abuse of drugs, drink to excess, getting beaten up, etc."
            },
            "vice.weird.description": {
                "en": "You experiment with strange essences, consort with rogue spirits, observe bizarre rituals or taboos, etc.",
                "default": "You experiment with strange essences, consort with rogue spirits, observe bizarre rituals or taboos, etc."
            },

            // Character creation step descriptions
            "step.choose_playbook.description": {
                "en": "Your playbook represents your character's role and abilities",
                "default": "Your playbook represents your character's role and abilities"
            },
            "step.choose_heritage.description": {
                "en": "Where does your family come from?",
                "default": "Where does your family come from?"
            },
            "step.choose_background.description": {
                "en": "What did you do before you became a scoundrel?",
                "default": "What did you do before you became a scoundrel?"
            },
            "step.choose_vice.description": {
                "en": "How do you blow off steam?",
                "default": "How do you blow off steam?"
            },
            "step.assign_action_dots.description": {
                "en": "Add 4 more action dots (max 2 in any action)",
                "default": "Add 4 more action dots (max 2 in any action)"
            },
            "step.choose_special_ability.description": {
                "en": "Pick one of your playbook's special abilities",
                "default": "Pick one of your playbook's special abilities"
            },
            "step.choose_contact.description": {
                "en": "Pick one friend and one rival from your playbook",
                "default": "Pick one friend and one rival from your playbook"
            },

            // Equipment descriptions
            "equipment.fine_heavy_weapon.description": {
                "en": "A two-handed melee weapon",
                "default": "A two-handed melee weapon"
            },
            "equipment.fine_hand_weapon.description": {
                "en": "A one-handed melee weapon",
                "default": "A one-handed melee weapon"
            },
            "equipment.fine_lockpicks.description": {
                "en": "High-quality tools for bypassing locks",
                "default": "High-quality tools for bypassing locks"
            },
            "equipment.weapons.description": {
                "en": "Implements of violence",
                "default": "Implements of violence"
            },
            "equipment.tools.description": {
                "en": "Specialized equipment",
                "default": "Specialized equipment"
            },
            "equipment.documents.description": {
                "en": "Papers and credentials",
                "default": "Papers and credentials"
            },

            // Advancement descriptions
            "advancement.add_action_dot.description": {
                "en": "Add a new action dot",
                "default": "Add a new action dot"
            },
            "advancement.add_special_ability.description": {
                "en": "Add a new special ability from your playbook",
                "default": "Add a new special ability from your playbook"
            },
            "advancement.playbook_xp.description": {
                "en": "At the end of each session, mark 1 xp if you addressed a challenge with your playbook's preferred approach",
                "default": "At the end of each session, mark 1 xp if you addressed a challenge with your playbook's preferred approach"
            },
            "advancement.attributes_xp.description": {
                "en": "At the end of each session, mark 1 xp if you expressed your beliefs, drives, heritage, or background",
                "default": "At the end of each session, mark 1 xp if you expressed your beliefs, drives, heritage, or background"
            },
            "advancement.struggle_xp.description": {
                "en": "At the end of each session, mark 1 xp if you struggled with issues from your vice or traumas",
                "default": "At the end of each session, mark 1 xp if you struggled with issues from your vice or traumas"
            },

            // Group type descriptions
            "group.assassins.description": {
                "en": "Murder for money",
                "default": "Murder for money"
            },
            "group.bravos.description": {
                "en": "War and extortion",
                "default": "War and extortion"
            },
            "group.cult.description": {
                "en": "Dedicated to forgotten gods",
                "default": "Dedicated to forgotten gods"
            },
            "group.hawkers.description": {
                "en": "Black market merchants",
                "default": "Black market merchants"
            },
            "group.shadows.description": {
                "en": "Thieves, spies, and saboteurs",
                "default": "Thieves, spies, and saboteurs"
            },
            "group.smugglers.description": {
                "en": "Suppliers of illicit goods",
                "default": "Suppliers of illicit goods"
            },

            // Group hunting grounds
            "group.assassins.hunting_grounds": {
                "en": "Criminals, corruption, murder",
                "default": "Criminals, corruption, murder"
            },
            "group.bravos.hunting_grounds": {
                "en": "Turf war, extortion, combat",
                "default": "Turf war, extortion, combat"
            },
            "group.cult.hunting_grounds": {
                "en": "Occult, weird, ancient",
                "default": "Occult, weird, ancient"
            },
            "group.hawkers.hunting_grounds": {
                "en": "Drugs, weapons, contraband",
                "default": "Drugs, weapons, contraband"
            },
            "group.shadows.hunting_grounds": {
                "en": "Burglary, espionage, sabotage",
                "default": "Burglary, espionage, sabotage"
            },
            "group.smugglers.hunting_grounds": {
                "en": "Contraband, transport, blockade running",
                "default": "Contraband, transport, blockade running"
            },

            // Group XP triggers
            "group.assassins.xp": {
                "en": "Execute a successful accident, disappearance, murder, or ransom operation",
                "default": "Execute a successful accident, disappearance, murder, or ransom operation"
            },
            "group.bravos.xp": {
                "en": "Execute a successful battle, extortion, sabotage, or smash & grab operation",
                "default": "Execute a successful battle, extortion, sabotage, or smash & grab operation"
            },
            "group.cult.xp": {
                "en": "Advance the agenda of your forgotten god",
                "default": "Advance the agenda of your forgotten god"
            },
            "group.hawkers.xp": {
                "en": "Execute a successful drug, vice, or contraband operation",
                "default": "Execute a successful drug, vice, or contraband operation"
            },
            "group.shadows.xp": {
                "en": "Execute a successful espionage, sabotage, or theft operation",
                "default": "Execute a successful espionage, sabotage, or theft operation"
            },
            "group.smugglers.xp": {
                "en": "Execute a successful transport, supply, or smuggling operation",
                "default": "Execute a successful transport, supply, or smuggling operation"
            },

            // World data descriptions
            "location.barrowcleft.description": {
                "en": "The district of mining, refining, and industrial production",
                "default": "The district of mining, refining, and industrial production"
            },
            "location.brightstone.description": {
                "en": "The district of the wealthy elite",
                "default": "The district of the wealthy elite"
            },
            "location.charterhall.description": {
                "en": "The district of commerce and banking",
                "default": "The district of commerce and banking"
            },
            "location.crows_foot.description": {
                "en": "The district of gangs, vice, and criminal enterprise",
                "default": "The district of gangs, vice, and criminal enterprise"
            },
            "location.dunslough.description": {
                "en": "The district of destitution and industrial pollution",
                "default": "The district of destitution and industrial pollution"
            },
            "location.six_towers.description": {
                "en": "The district of ancient noble families and political intrigue",
                "default": "The district of ancient noble families and political intrigue"
            },
            "faction.bluecoats.description": {
                "en": "The city watch of Doskvol",
                "default": "The city watch of Doskvol"
            },
            "faction.red_sashes.description": {
                "en": "A gang of Iruvian sword-artists and hashish dealers",
                "default": "A gang of Iruvian sword-artists and hashish dealers"
            },
            "faction.lampblacks.description": {
                "en": "A tough crew of former miners turned to crime",
                "default": "A tough crew of former miners turned to crime"
            },

            // Mechanics descriptions
            "outcome.critical.description": {
                "en": "You do it with increased effect",
                "default": "You do it with increased effect"
            },
            "outcome.success.description": {
                "en": "You do it",
                "default": "You do it"
            },
            "outcome.partial_success.description": {
                "en": "You do it, but there are consequences",
                "default": "You do it, but there are consequences"
            },
            "outcome.failure.description": {
                "en": "You don't do it and there are consequences",
                "default": "You don't do it and there are consequences"
            },
            "position.controlled.description": {
                "en": "You act on your terms. You have great effect.",
                "default": "You act on your terms. You have great effect."
            },
            "position.risky.description": {
                "en": "You go head to head. You have standard effect.",
                "default": "You go head to head. You have standard effect."
            },
            "position.desperate.description": {
                "en": "You overreach your capabilities. You have limited effect.",
                "default": "You overreach your capabilities. You have limited effect."
            },
            "effect.great.description": {
                "en": "You achieve more than expected",
                "default": "You achieve more than expected"
            },
            "effect.standard.description": {
                "en": "You achieve what you intended",
                "default": "You achieve what you intended"
            },
            "effect.limited.description": {
                "en": "You achieve a partial or weak result",
                "default": "You achieve a partial or weak result"
            },

            // GM Tools descriptions
            "scenario.assassination.description": {
                "en": "Kill a person",
                "default": "Kill a person"
            },
            "scenario.burglary.description": {
                "en": "Break into a place to steal something",
                "default": "Break into a place to steal something"
            },
            "scenario.espionage.description": {
                "en": "Obtain secret information",
                "default": "Obtain secret information"
            },
            "event.arrest.description": {
                "en": "An inspector presents a case file of evidence to a magistrate",
                "default": "An inspector presents a case file of evidence to a magistrate"
            },
            "event.cooperation.description": {
                "en": "A +3 faction asks you for a favor",
                "default": "A +3 faction asks you for a favor"
            },
            "event.demonic_notice.description": {
                "en": "A demon approaches the crew with a dark offer",
                "default": "A demon approaches the crew with a dark offer"
            },
            "challenge.locks_traps.description": {
                "en": "Secured doors, concealed mechanisms",
                "default": "Secured doors, concealed mechanisms"
            },
            "challenge.guards_patrols.description": {
                "en": "Watchful sentries, regular patrols",
                "default": "Watchful sentries, regular patrols"
            },
            "challenge.supernatural_forces.description": {
                "en": "Ghosts, demons, weird energies",
                "default": "Ghosts, demons, weird energies"
            },

            // Skill examples
            "skill.hunt.example.track": {
                "en": "Track or follow a clue",
                "default": "Track or follow a clue"
            },
            "skill.hunt.example.hunt_prey": {
                "en": "Hunt down prey",
                "default": "Hunt down prey"
            },
            "skill.hunt.example.follow_trails": {
                "en": "Gather information by following trails",
                "default": "Gather information by following trails"
            },
            "skill.study.example.documents": {
                "en": "Gather information from documents",
                "default": "Gather information from documents"
            },
            "skill.study.example.analyze_clues": {
                "en": "Analyze clues",
                "default": "Analyze clues"
            },
            "skill.study.example.research": {
                "en": "Research in a library",
                "default": "Research in a library"
            },
            "skill.survey.example.case_location": {
                "en": "Case a location",
                "default": "Case a location"
            },
            "skill.survey.example.examine_person": {
                "en": "Examine a person",
                "default": "Examine a person"
            },
            "skill.survey.example.detect_ambush": {
                "en": "Detect an ambush",
                "default": "Detect an ambush"
            },
            "skill.tinker.example.pick_lock": {
                "en": "Pick a lock",
                "default": "Pick a lock"
            },
            "skill.tinker.example.disable_alarm": {
                "en": "Disable an alarm",
                "default": "Disable an alarm"
            },
            "skill.tinker.example.create_gadget": {
                "en": "Create a gadget",
                "default": "Create a gadget"
            },
            "skill.finesse.example.pick_pocket": {
                "en": "Pick a pocket",
                "default": "Pick a pocket"
            },
            "skill.finesse.example.handle_vehicle": {
                "en": "Handle a vehicle",
                "default": "Handle a vehicle"
            },
            "skill.finesse.example.acrobatics": {
                "en": "Perform acrobatics",
                "default": "Perform acrobatics"
            },
            "skill.prowl.example.sneak_past_guard": {
                "en": "Sneak past a guard",
                "default": "Sneak past a guard"
            },
            "skill.prowl.example.climb_wall": {
                "en": "Climb a wall",
                "default": "Climb a wall"
            },
            "skill.prowl.example.hide_shadows": {
                "en": "Hide in shadows",
                "default": "Hide in shadows"
            },
            "skill.skirmish.example.fight_weapons": {
                "en": "Fight with weapons",
                "default": "Fight with weapons"
            },
            "skill.skirmish.example.grapple": {
                "en": "Grapple or wrestle",
                "default": "Grapple or wrestle"
            },
            "skill.skirmish.example.close_combat": {
                "en": "Engage in close combat",
                "default": "Engage in close combat"
            },
            "skill.wreck.example.smash_door": {
                "en": "Smash down a door",
                "default": "Smash down a door"
            },
            "skill.wreck.example.tear_apart": {
                "en": "Tear something apart",
                "default": "Tear something apart"
            },
            "skill.wreck.example.brute_force": {
                "en": "Use brute force",
                "default": "Use brute force"
            },
            "skill.attune.example.sense_supernatural": {
                "en": "Sense supernatural forces",
                "default": "Sense supernatural forces"
            },
            "skill.attune.example.communicate_spirits": {
                "en": "Communicate with spirits",
                "default": "Communicate with spirits"
            },
            "skill.attune.example.channel_energy": {
                "en": "Channel arcane energy",
                "default": "Channel arcane energy"
            },
            "skill.command.example.lead_group": {
                "en": "Lead a group",
                "default": "Lead a group"
            },
            "skill.command.example.intimidate": {
                "en": "Intimidate someone",
                "default": "Intimidate someone"
            },
            "skill.command.example.give_orders": {
                "en": "Give orders",
                "default": "Give orders"
            },
            "skill.consort.example.access_resources": {
                "en": "Gain access to resources",
                "default": "Gain access to resources"
            },
            "skill.consort.example.get_favor": {
                "en": "Get a favor",
                "default": "Get a favor"
            },
            "skill.consort.example.blend_crowd": {
                "en": "Blend in with a crowd",
                "default": "Blend in with a crowd"
            },
            "skill.sway.example.lie_convincingly": {
                "en": "Lie convincingly",
                "default": "Lie convincingly"
            },
            "skill.sway.example.persuade": {
                "en": "Persuade someone",
                "default": "Persuade someone"
            },
            "skill.sway.example.manipulate": {
                "en": "Seduce or manipulate",
                "default": "Seduce or manipulate"
            },

            // Additional location notable places
            "location.barrowcleft.gaddoc_rail_station": {
                "en": "Gaddoc Rail Station",
                "default": "Gaddoc Rail Station"
            },
            "location.barrowcleft.the_docks": {
                "en": "The Docks",
                "default": "The Docks"
            },
            "location.barrowcleft.ironhook_prison": {
                "en": "Ironhook Prison",
                "default": "Ironhook Prison"
            },
            "location.brightstone.scurlock_manor": {
                "en": "Lord Scurlock's Manor",
                "default": "Lord Scurlock's Manor"
            },
            "location.brightstone.bowmore_bridge": {
                "en": "Bowmore Bridge",
                "default": "Bowmore Bridge"
            },
            "location.brightstone.sparkwrights": {
                "en": "The Sparkwrights",
                "default": "The Sparkwrights"
            },
            "location.charterhall.city_council_chambers": {
                "en": "City Council Chambers",
                "default": "City Council Chambers"
            },
            "location.charterhall.doskvol_academy": {
                "en": "Doskvol Academy",
                "default": "Doskvol Academy"
            },
            "location.charterhall.the_docks": {
                "en": "The Docks",
                "default": "The Docks"
            },
            "location.crows_foot.the_bucket": {
                "en": "The Bucket",
                "default": "The Bucket"
            },
            "location.crows_foot.gym": {
                "en": "Crows Foot Gym",
                "default": "Crows Foot Gym"
            },
            "location.crows_foot.red_lamp": {
                "en": "The Red Lamp",
                "default": "The Red Lamp"
            },
            "location.dunslough.the_soot": {
                "en": "The Soot",
                "default": "The Soot"
            },
            "location.dunslough.bellweather_crematorium": {
                "en": "Bellweather Crematorium",
                "default": "Bellweather Crematorium"
            },
            "location.dunslough.tangletown": {
                "en": "Tangletown",
                "default": "Tangletown"
            },
            "location.six_towers.whitecrown": {
                "en": "Whitecrown",
                "default": "Whitecrown"
            },
            "location.six_towers.towers": {
                "en": "The Six Towers",
                "default": "The Six Towers"
            },
            "location.six_towers.duskwall_academy": {
                "en": "Duskwall Academy",
                "default": "Duskwall Academy"
            },

            // Faction assets
            "faction.bluecoats.assets.patrol_boats": {
                "en": "Patrol boats",
                "default": "Patrol boats"
            },
            "faction.bluecoats.assets.strongholds": {
                "en": "Strongholds",
                "default": "Strongholds"
            },
            "faction.bluecoats.assets.political_connections": {
                "en": "Political connections",
                "default": "Political connections"
            },
            "faction.red_sashes.assets.sword_school": {
                "en": "Sword fighting school",
                "default": "Sword fighting school"
            },
            "faction.red_sashes.assets.drug_operation": {
                "en": "Drug operation",
                "default": "Drug operation"
            },
            "faction.red_sashes.assets.tycherosi_connections": {
                "en": "Tycherosi connections",
                "default": "Tycherosi connections"
            },
            "faction.lampblacks.assets.bucket_tavern": {
                "en": "The Bucket tavern",
                "default": "The Bucket tavern"
            },
            "faction.lampblacks.assets.smuggling_tunnels": {
                "en": "Smuggling tunnels",
                "default": "Smuggling tunnels"
            },
            "faction.lampblacks.assets.loyal_workers": {
                "en": "Loyal workers",
                "default": "Loyal workers"
            },

            // Faction goals
            "faction.bluecoats.goals.maintain_order": {
                "en": "Maintain order",
                "default": "Maintain order"
            },
            "faction.bluecoats.goals.suppress_crime": {
                "en": "Suppress crime",
                "default": "Suppress crime"
            },
            "faction.bluecoats.goals.serve_powerful": {
                "en": "Serve the powerful",
                "default": "Serve the powerful"
            },
            "faction.red_sashes.goals.expand_territory": {
                "en": "Expand territory",
                "default": "Expand territory"
            },
            "faction.red_sashes.goals.perfect_blade_arts": {
                "en": "Perfect the blade arts",
                "default": "Perfect the blade arts"
            },
            "faction.red_sashes.goals.profit_vice": {
                "en": "Profit from vice",
                "default": "Profit from vice"
            },
            "faction.lampblacks.goals.control_crows_foot": {
                "en": "Control Crow's Foot",
                "default": "Control Crow's Foot"
            },
            "faction.lampblacks.goals.eliminate_rivals": {
                "en": "Eliminate rivals",
                "default": "Eliminate rivals"
            },
            "faction.lampblacks.goals.rule_strength": {
                "en": "Rule through strength",
                "default": "Rule through strength"
            },

            // Mechanics strings
            "stress.source.pushing_yourself": {
                "en": "Pushing yourself",
                "default": "Pushing yourself"
            },
            "stress.source.assisting_others": {
                "en": "Assisting others",
                "default": "Assisting others"
            },
            "stress.source.using_abilities": {
                "en": "Using certain abilities",
                "default": "Using certain abilities"
            },
            "stress.source.resisting_consequences": {
                "en": "Resisting consequences",
                "default": "Resisting consequences"
            },
            "harm.level.1.example.shaken": {
                "en": "Shaken",
                "default": "Shaken"
            },
            "harm.level.1.example.distracted": {
                "en": "Distracted",
                "default": "Distracted"
            },
            "harm.level.1.example.scared": {
                "en": "Scared",
                "default": "Scared"
            },
            "harm.level.1.example.confused": {
                "en": "Confused",
                "default": "Confused"
            },
            "harm.level.2.example.exhausted": {
                "en": "Exhausted",
                "default": "Exhausted"
            },
            "harm.level.2.example.deep_cut": {
                "en": "Deep Cut",
                "default": "Deep Cut"
            },
            "harm.level.2.example.concussion": {
                "en": "Concussion",
                "default": "Concussion"
            },
            "harm.level.2.example.panicked": {
                "en": "Panicked",
                "default": "Panicked"
            },
            "harm.level.3.example.impaled": {
                "en": "Impaled",
                "default": "Impaled"
            },
            "harm.level.3.example.broken_leg": {
                "en": "Broken Leg",
                "default": "Broken Leg"
            },
            "harm.level.3.example.shot": {
                "en": "Shot",
                "default": "Shot"
            },
            "harm.level.3.example.stabbed": {
                "en": "Stabbed",
                "default": "Stabbed"
            },

            // GM Tools complications
            "scenario.assassination.complication.protected": {
                "en": "The target is protected",
                "default": "The target is protected"
            },
            "scenario.assassination.complication.bystanders": {
                "en": "Innocent bystanders",
                "default": "Innocent bystanders"
            },
            "scenario.assassination.complication.setup": {
                "en": "The hit is a setup",
                "default": "The hit is a setup"
            },
            "scenario.burglary.complication.security": {
                "en": "Superior security",
                "default": "Superior security"
            },
            "scenario.burglary.complication.not_there": {
                "en": "The thing isn't there",
                "default": "The thing isn't there"
            },
            "scenario.burglary.complication.someone_else": {
                "en": "Someone else is there",
                "default": "Someone else is there"
            },
            "scenario.espionage.complication.watched": {
                "en": "You're being watched",
                "default": "You're being watched"
            },
            "scenario.espionage.complication.false_info": {
                "en": "The information is false",
                "default": "The information is false"
            },
            "scenario.espionage.complication.time_pressure": {
                "en": "Time pressure",
                "default": "Time pressure"
            },

            // Stress conditions
            "stress.condition.cold": {
                "en": "Cold",
                "default": "Cold"
            },
            "stress.condition.haunted": {
                "en": "Haunted",
                "default": "Haunted"
            },
            "stress.condition.obsessed": {
                "en": "Obsessed",
                "default": "Obsessed"
            },
            "stress.condition.paranoid": {
                "en": "Paranoid",
                "default": "Paranoid"
            },
            "stress.condition.reckless": {
                "en": "Reckless",
                "default": "Reckless"
            },
            "stress.condition.soft": {
                "en": "Soft",
                "default": "Soft"
            },
            "stress.condition.unstable": {
                "en": "Unstable",
                "default": "Unstable"
            },
            "stress.condition.vicious": {
                "en": "Vicious",
                "default": "Vicious"
            }
        }
    },
    "characterTemplates": [
        {
            "id": "cutter",
            "nameKey": "template.cutter",
            "descriptionKey": "template.cutter.description",
            "startingAbilities": [
                "battleborn"
            ],
            "specialAbilities": [
                "battleborn",
                "bodyguard",
                "ghost_fighter",
                "leader",
                "mule",
                "not_to_be_trifled_with",
                "savage",
                "vigorous"
            ],
            "contacts": [
                {
                    "name": "Marlane",
                    "descriptionKey": "A pugilist"
                },
                {
                    "name": "Chael",
                    "descriptionKey": "A vicious thug"
                },
                {
                    "name": "Mercy",
                    "descriptionKey": "A cold killer"
                },
                {
                    "name": "Grace",
                    "descriptionKey": "An extortionist"
                },
                {
                    "name": "Sawtooth",
                    "descriptionKey": "A physicker"
                }
            ],
            "equipment": [
                "fine_heavy_weapon",
                "fine_hand_weapon",
                "fine_armor",
                "intimidating_weapon",
                "manacles_and_chain",
                "rage_essence_vial"
            ],
            "attributes": {
                "insight": 0,
                "prowess": 2,
                "resolve": 1
            },
            "skills": {
                "skirmish": 2,
                "command": 1
            }
        },
        {
            "id": "hound",
            "nameKey": "template.hound",
            "descriptionKey": "template.hound.description",
            "startingAbilities": [
                "sharpshooter"
            ],
            "specialAbilities": [
                "sharpshooter",
                "focused",
                "ghost_hunter",
                "scout",
                "tough_as_nails",
                "vengeful",
                "survivor",
                "strange_methods"
            ],
            "contacts": [
                {
                    "name": "Steiner",
                    "descriptionKey": "An assassin"
                },
                {
                    "name": "Celene",
                    "descriptionKey": "A sentinel"
                },
                {
                    "name": "Melvir",
                    "descriptionKey": "A physicker"
                },
                {
                    "name": "Veleris",
                    "descriptionKey": "A spy"
                },
                {
                    "name": "Casta",
                    "descriptionKey": "A ward boss"
                }
            ],
            "equipment": [
                "fine_pair_of_pistols",
                "fine_long_rifle",
                "electroplasm_ammunition",
                "a_trained_hunting_pet",
                "spyglass",
                "salt_pouch"
            ],
            "attributes": {
                "insight": 2,
                "prowess": 1,
                "resolve": 0
            },
            "skills": {
                "hunt": 2,
                "survey": 1
            }
        },
        {
            "id": "leech",
            "nameKey": "template.leech",
            "descriptionKey": "template.leech.description",
            "startingAbilities": [
                "alchemist"
            ],
            "specialAbilities": [
                "alchemist",
                "analyst",
                "artificer",
                "fortitude",
                "ghost_ward",
                "physicker",
                "saboteur",
                "venomous"
            ],
            "contacts": [
                {
                    "name": "Stazia",
                    "descriptionKey": "An apothecary"
                },
                {
                    "name": "Veldren",
                    "descriptionKey": "A psychonaut"
                },
                {
                    "name": "Eckerd",
                    "descriptionKey": "A corpse thief"
                },
                {
                    "name": "Jul",
                    "descriptionKey": "A blood dealer"
                },
                {
                    "name": "Malista",
                    "descriptionKey": "A priestess"
                }
            ],
            "equipment": [
                "fine_tinkering_tools",
                "fine_wrecking_tools",
                "alchemicals_and_supplies",
                "bandolier_2_of_alchemicals",
                "bandolier_1_of_alchemicals",
                "gadgets"
            ],
            "attributes": {
                "insight": 2,
                "prowess": 1,
                "resolve": 0
            },
            "skills": {
                "tinker": 2,
                "wreck": 1
            }
        },
        {
            "id": "lurk",
            "nameKey": "template.lurk",
            "descriptionKey": "template.lurk.description",
            "startingAbilities": [
                "infiltrator"
            ],
            "specialAbilities": [
                "infiltrator",
                "ambush",
                "daredevil",
                "the_devils_footsteps",
                "expertise",
                "ghost_veil",
                "reflexes",
                "shadow_cloak"
            ],
            "contacts": [
                {
                    "name": "Telda",
                    "descriptionKey": "A beggar"
                },
                {
                    "name": "Darmot",
                    "descriptionKey": "A bluecoat"
                },
                {
                    "name": "Frake",
                    "descriptionKey": "A locksmith"
                },
                {
                    "name": "Roslyn Kellis",
                    "descriptionKey": "A noble"
                },
                {
                    "name": "Ysia",
                    "descriptionKey": "A drug dealer"
                }
            ],
            "equipment": [
                "fine_lockpicks",
                "fine_shadow_cloak",
                "light_climbing_gear",
                "silence_potion_vial",
                "dark_sight_goggles",
                "spiritbane_charm"
            ],
            "attributes": {
                "insight": 1,
                "prowess": 2,
                "resolve": 0
            },
            "skills": {
                "prowl": 2,
                "finesse": 1
            }
        },
        {
            "id": "slide",
            "nameKey": "template.slide",
            "descriptionKey": "template.slide.description",
            "startingAbilities": [
                "rook_s_gambit"
            ],
            "specialAbilities": [
                "rook_s_gambit",
                "cloak_and_dagger",
                "ghost_voice",
                "like_looking_into_a_mirror",
                "a_little_something_on_the_side",
                "mesmerism",
                "subterfuge",
                "trust_in_me"
            ],
            "contacts": [
                {
                    "name": "Bryl",
                    "descriptionKey": "A drug dealer"
                },
                {
                    "name": "Bazso Baz",
                    "descriptionKey": "A gang leader"
                },
                {
                    "name": "Klyra",
                    "descriptionKey": "A noble"
                },
                {
                    "name": "Nyryx",
                    "descriptionKey": "A possessor ghost"
                },
                {
                    "name": "Harker",
                    "descriptionKey": "A jail bird"
                }
            ],
            "equipment": [
                "fine_clothes_and_jewelry",
                "fine_disguise_kit",
                "fine_loaded_dice_cards_etc",
                "trance_powder",
                "a_cane_sword",
                "spiritbane_charm"
            ],
            "attributes": {
                "insight": 1,
                "prowess": 0,
                "resolve": 2
            },
            "skills": {
                "sway": 2,
                "consort": 1
            }
        },
        {
            "id": "spider",
            "nameKey": "template.spider",
            "descriptionKey": "template.spider.description",
            "startingAbilities": [
                "foresight"
            ],
            "specialAbilities": [
                "foresight",
                "calculating",
                "connected",
                "functioning_vice",
                "ghost_contract",
                "jail_bird",
                "weaving_the_web",
                "mastermind"
            ],
            "contacts": [
                {
                    "name": "Salia",
                    "descriptionKey": "An information broker"
                },
                {
                    "name": "Augus",
                    "descriptionKey": "A master architect"
                },
                {
                    "name": "The Weeping Lady",
                    "descriptionKey": "A spirit trafficker"
                },
                {
                    "name": "Rigney",
                    "descriptionKey": "A tavern owner"
                },
                {
                    "name": "Laroze",
                    "descriptionKey": "A bluecoat"
                }
            ],
            "equipment": [
                "fine_clothes",
                "fine_bottle_of_whiskey",
                "extensive_wardrobe",
                "primer_contact_in_city_hall",
                "small_bag_of_coins",
                "an_unusual_weapon"
            ],
            "attributes": {
                "insight": 1,
                "prowess": 0,
                "resolve": 2
            },
            "skills": {
                "consort": 2,
                "command": 1
            }
        },
        {
            "id": "whisper",
            "nameKey": "template.whisper",
            "descriptionKey": "template.whisper.description",
            "startingAbilities": [
                "ghost_mind"
            ],
            "specialAbilities": [
                "ghost_mind",
                "compel",
                "ghost_ward",
                "iron_will",
                "occultist",
                "ritual",
                "strange_methods",
                "tempest"
            ],
            "contacts": [
                {
                    "name": "Nyryx",
                    "descriptionKey": "A possessor ghost"
                },
                {
                    "name": "Scurlock",
                    "descriptionKey": "A vampire"
                },
                {
                    "name": "Setarra",
                    "descriptionKey": "A demon"
                },
                {
                    "name": "Quellyn",
                    "descriptionKey": "A witch"
                },
                {
                    "name": "Flint",
                    "descriptionKey": "A spirit trafficker"
                }
            ],
            "equipment": [
                "fine_lightning_hook",
                "fine_spirit_mask",
                "electroplasmic_compounds_and_tools",
                "ghost_key",
                "demonbane_charm",
                "spiritbane_charm"
            ],
            "attributes": {
                "insight": 2,
                "prowess": 0,
                "resolve": 1
            },
            "skills": {
                "attune": 2,
                "study": 1
            }
        }
    ],
    "attributes": [
        {
            "id": "insight",
            "nameKey": "attribute.insight",
            "descriptionKey": "attribute.insight.description",
            "skills": [
                "hunt",
                "study",
                "survey",
                "tinker"
            ],
            "defaultValue": 0,
            "maxValue": 4
        },
        {
            "id": "prowess",
            "nameKey": "attribute.prowess",
            "descriptionKey": "attribute.prowess.description",
            "skills": [
                "finesse",
                "prowl",
                "skirmish",
                "wreck"
            ],
            "defaultValue": 0,
            "maxValue": 4
        },
        {
            "id": "resolve",
            "nameKey": "attribute.resolve",
            "descriptionKey": "attribute.resolve.description",
            "skills": [
                "attune",
                "command",
                "consort",
                "sway"
            ],
            "defaultValue": 0,
            "maxValue": 4
        }
    ],
    "skills": [
        {
            "id": "hunt",
            "nameKey": "skill.hunt",
            "descriptionKey": "skill.hunt.description",
            "attribute": "insight",
            "exampleKeys": [
                "skill.hunt.example.track",
                "skill.hunt.example.hunt_prey",
                "skill.hunt.example.follow_trails"
            ]
        },
        {
            "id": "study",
            "nameKey": "skill.study",
            "descriptionKey": "skill.study.description",
            "attribute": "insight",
            "exampleKeys": [
                "skill.study.example.documents",
                "skill.study.example.analyze_clues",
                "skill.study.example.research"
            ]
        },
        {
            "id": "survey",
            "nameKey": "skill.survey",
            "descriptionKey": "skill.survey.description",
            "attribute": "insight",
            "exampleKeys": [
                "skill.survey.example.case_location",
                "skill.survey.example.examine_person",
                "skill.survey.example.detect_ambush"
            ]
        },
        {
            "id": "tinker",
            "nameKey": "skill.tinker",
            "descriptionKey": "skill.tinker.description",
            "attribute": "insight",
            "exampleKeys": [
                "skill.tinker.example.pick_lock",
                "skill.tinker.example.disable_alarm",
                "skill.tinker.example.create_gadget"
            ]
        },
        {
            "id": "finesse",
            "nameKey": "skill.finesse",
            "descriptionKey": "skill.finesse.description",
            "attribute": "prowess",
            "exampleKeys": [
                "skill.finesse.example.pick_pocket",
                "skill.finesse.example.handle_vehicle",
                "skill.finesse.example.acrobatics"
            ]
        },
        {
            "id": "prowl",
            "nameKey": "skill.prowl",
            "descriptionKey": "skill.prowl.description",
            "attribute": "prowess",
            "exampleKeys": [
                "skill.prowl.example.sneak_past_guard",
                "skill.prowl.example.climb_wall",
                "skill.prowl.example.hide_shadows"
            ]
        },
        {
            "id": "skirmish",
            "nameKey": "skill.skirmish",
            "descriptionKey": "skill.skirmish.description",
            "attribute": "prowess",
            "exampleKeys": [
                "skill.skirmish.example.fight_weapons",
                "skill.skirmish.example.grapple",
                "skill.skirmish.example.close_combat"
            ]
        },
        {
            "id": "wreck",
            "nameKey": "skill.wreck",
            "descriptionKey": "skill.wreck.description",
            "attribute": "prowess",
            "exampleKeys": [
                "skill.wreck.example.smash_door",
                "skill.wreck.example.tear_apart",
                "skill.wreck.example.brute_force"
            ]
        },
        {
            "id": "attune",
            "nameKey": "skill.attune",
            "descriptionKey": "skill.attune.description",
            "attribute": "resolve",
            "exampleKeys": [
                "skill.attune.example.sense_supernatural",
                "skill.attune.example.communicate_spirits",
                "skill.attune.example.channel_energy"
            ]
        },
        {
            "id": "command",
            "nameKey": "skill.command",
            "descriptionKey": "skill.command.description",
            "attribute": "resolve",
            "exampleKeys": [
                "skill.command.example.lead_group",
                "skill.command.example.intimidate",
                "skill.command.example.give_orders"
            ]
        },
        {
            "id": "consort",
            "nameKey": "skill.consort",
            "descriptionKey": "skill.consort.description",
            "attribute": "resolve",
            "exampleKeys": [
                "skill.consort.example.access_resources",
                "skill.consort.example.get_favor",
                "skill.consort.example.blend_crowd"
            ]
        },
        {
            "id": "sway",
            "nameKey": "skill.sway",
            "descriptionKey": "skill.sway.description",
            "attribute": "resolve",
            "exampleKeys": [
                "skill.sway.example.lie_convincingly",
                "skill.sway.example.persuade",
                "skill.sway.example.manipulate"
            ]
        }
    ],
    "specialAbilities": [
        {
            "id": "battleborn",
            "nameKey": "ability.battleborn",
            "descriptionKey": "ability.battleborn.description",
            "characterTemplates": [
                "cutter"
            ]
        },
        {
            "id": "bodyguard",
            "nameKey": "ability.bodyguard",
            "descriptionKey": "ability.bodyguard.description",
            "characterTemplates": [
                "cutter"
            ]
        },
        {
            "id": "sharpshooter",
            "nameKey": "ability.sharpshooter",
            "descriptionKey": "ability.sharpshooter.description",
            "characterTemplates": [
                "hound"
            ]
        },
        {
            "id": "alchemist",
            "nameKey": "ability.alchemist",
            "descriptionKey": "ability.alchemist.description",
            "characterTemplates": [
                "leech"
            ]
        },
        {
            "id": "infiltrator",
            "nameKey": "ability.infiltrator",
            "descriptionKey": "ability.infiltrator.description",
            "characterTemplates": [
                "lurk"
            ]
        },
        {
            "id": "rook_s_gambit",
            "nameKey": "ability.rook_s_gambit",
            "descriptionKey": "ability.rook_s_gambit.description",
            "characterTemplates": [
                "slide"
            ]
        },
        {
            "id": "foresight",
            "nameKey": "ability.foresight",
            "descriptionKey": "ability.foresight.description",
            "characterTemplates": [
                "spider"
            ]
        },
        {
            "id": "ghost_mind",
            "nameKey": "ability.ghost_mind",
            "descriptionKey": "ability.ghost_mind.description",
            "characterTemplates": [
                "whisper"
            ]
        }
    ],
    "characterCreation": {
        "steps": [
            {
                "id": "choose_playbook",
                "nameKey": "step.choose_playbook",
                "descriptionKey": "step.choose_playbook.description",
                "order": 1,
                "required": true
            },
            {
                "id": "choose_heritage",
                "nameKey": "step.choose_heritage",
                "descriptionKey": "step.choose_heritage.description",
                "order": 2,
                "required": true
            },
            {
                "id": "choose_background",
                "nameKey": "step.choose_background",
                "descriptionKey": "step.choose_background.description",
                "order": 3,
                "required": true
            },
            {
                "id": "choose_vice",
                "nameKey": "step.choose_vice",
                "descriptionKey": "step.choose_vice.description",
                "order": 4,
                "required": true
            },
            {
                "id": "assign_action_dots",
                "nameKey": "step.assign_action_dots",
                "descriptionKey": "step.assign_action_dots.description",
                "order": 5,
                "required": true
            },
            {
                "id": "choose_special_ability",
                "nameKey": "step.choose_special_ability",
                "descriptionKey": "step.choose_special_ability.description",
                "order": 6,
                "required": true
            },
            {
                "id": "choose_contact",
                "nameKey": "step.choose_contact",
                "descriptionKey": "step.choose_contact.description",
                "order": 7,
                "required": true
            }
        ]
    },
    "characterOptions": {
        "heritage": [
            {
                "id": "akoros",
                "nameKey": "heritage.akoros",
                "descriptionKey": "heritage.akoros.description"
            },
            {
                "id": "dagger_isles",
                "nameKey": "heritage.dagger_isles",
                "descriptionKey": "heritage.dagger_isles.description"
            },
            {
                "id": "iruvia",
                "nameKey": "heritage.iruvia",
                "descriptionKey": "heritage.iruvia.description"
            },
            {
                "id": "severos",
                "nameKey": "heritage.severos",
                "descriptionKey": "heritage.severos.description"
            },
            {
                "id": "skovlan",
                "nameKey": "heritage.skovlan",
                "descriptionKey": "heritage.skovlan.description"
            },
            {
                "id": "tycheros",
                "nameKey": "heritage.tycheros",
                "descriptionKey": "heritage.tycheros.description"
            }
        ],
        "background": [
            {
                "id": "academic",
                "nameKey": "background.academic",
                "descriptionKey": "background.academic.description"
            },
            {
                "id": "labor",
                "nameKey": "background.labor",
                "descriptionKey": "background.labor.description"
            },
            {
                "id": "law",
                "nameKey": "background.law",
                "descriptionKey": "background.law.description"
            },
            {
                "id": "trade",
                "nameKey": "background.trade",
                "descriptionKey": "background.trade.description"
            },
            {
                "id": "military",
                "nameKey": "background.military",
                "descriptionKey": "background.military.description"
            },
            {
                "id": "noble",
                "nameKey": "background.noble",
                "descriptionKey": "background.noble.description"
            },
            {
                "id": "underworld",
                "nameKey": "background.underworld",
                "descriptionKey": "background.underworld.description"
            }
        ],
        "vice": [
            {
                "id": "faith",
                "nameKey": "vice.faith",
                "descriptionKey": "vice.faith.description"
            },
            {
                "id": "gambling",
                "nameKey": "vice.gambling",
                "descriptionKey": "vice.gambling.description"
            },
            {
                "id": "luxury",
                "nameKey": "vice.luxury",
                "descriptionKey": "vice.luxury.description"
            },
            {
                "id": "obligation",
                "nameKey": "vice.obligation",
                "descriptionKey": "vice.obligation.description"
            },
            {
                "id": "pleasure",
                "nameKey": "vice.pleasure",
                "descriptionKey": "vice.pleasure.description"
            },
            {
                "id": "stupor",
                "nameKey": "vice.stupor",
                "descriptionKey": "vice.stupor.description"
            },
            {
                "id": "weird",
                "nameKey": "vice.weird",
                "descriptionKey": "vice.weird.description"
            }
        ]
    },
    "equipment": {
        "loadCapacity": {
            "light": 3,
            "normal": 5,
            "heavy": 6
        },
        "items": [
            {
                "id": "fine_heavy_weapon",
                "nameKey": "equipment.fine_heavy_weapon",
                "descriptionKey": "equipment.fine_heavy_weapon.description",
                "load": 2,
                "category": "weapons",
                "quality": 2
            },
            {
                "id": "fine_hand_weapon",
                "nameKey": "equipment.fine_hand_weapon",
                "descriptionKey": "equipment.fine_hand_weapon.description",
                "load": 1,
                "category": "weapons",
                "quality": 2
            },
            {
                "id": "fine_lockpicks",
                "nameKey": "equipment.fine_lockpicks",
                "descriptionKey": "equipment.fine_lockpicks.description",
                "load": 0,
                "category": "tools",
                "quality": 2
            }
        ],
        "categories": [
            {
                "id": "weapons",
                "nameKey": "equipment.weapons",
                "descriptionKey": "equipment.weapons.description"
            },
            {
                "id": "tools",
                "nameKey": "equipment.tools",
                "descriptionKey": "equipment.tools.description"
            },
            {
                "id": "documents",
                "nameKey": "equipment.documents",
                "descriptionKey": "equipment.documents.description"
            }
        ]
    },
    "advancement": {
        "xpTriggers": [
            {
                "id": "playbook_xp",
                "nameKey": "xp.playbook",
                "descriptionKey": "advancement.playbook_xp.description",
                "value": 1
            },
            {
                "id": "attributes_xp",
                "nameKey": "xp.attributes",
                "descriptionKey": "advancement.attributes_xp.description",
                "value": 1
            },
            {
                "id": "struggle_xp",
                "nameKey": "xp.struggle",
                "descriptionKey": "advancement.struggle_xp.description",
                "value": 1
            }
        ],
        "advancementOptions": [
            {
                "id": "add_action_dot",
                "nameKey": "advancement.add_action_dot",
                "descriptionKey": "advancement.add_action_dot.description",
                "cost": 2,
                "category": "attribute"
            },
            {
                "id": "add_special_ability",
                "nameKey": "advancement.add_special_ability",
                "descriptionKey": "advancement.add_special_ability.description",
                "cost": 7,
                "category": "ability"
            }
        ]
    },
    "groupTypes": [
        {
            "id": "assassins",
            "nameKey": "group.assassins",
            "descriptionKey": "group.assassins.description",
            "huntingGroundsKey": "group.assassins.hunting_grounds",
            "startingUpgrades": [
                "fine_killing_tools",
                "assassin_rigging"
            ],
            "groupXpKey": "group.assassins.xp",
            "specialAbilities": [
                "deadly",
                "ravens",
                "emberdeath",
                "no_traces",
                "patron",
                "predators",
                "vipers",
                "void_dealers"
            ]
        },
        {
            "id": "bravos",
            "nameKey": "group.bravos",
            "descriptionKey": "group.bravos.description",
            "huntingGroundsKey": "group.bravos.hunting_grounds",
            "startingUpgrades": [
                "fine_weapons",
                "thug_rigging"
            ],
            "groupXpKey": "group.bravos.xp",
            "specialAbilities": [
                "blood_brothers",
                "door_kickers",
                "fiends",
                "forged_in_the_fire",
                "patron",
                "predators",
                "rally",
                "iron_will"
            ]
        },
        {
            "id": "cult",
            "nameKey": "group.cult",
            "descriptionKey": "group.cult.description",
            "huntingGroundsKey": "group.cult.hunting_grounds",
            "startingUpgrades": [
                "ritual_altar_and_shrine",
                "ancient_obelisk"
            ],
            "groupXpKey": "group.cult.xp",
            "specialAbilities": [
                "blessing",
                "conviction",
                "glory_incarnate",
                "zealotry",
                "sealed_in_darkness",
                "sanctuary",
                "bound_in_darkness",
                "horrors"
            ]
        },
        {
            "id": "hawkers",
            "nameKey": "group.hawkers",
            "descriptionKey": "group.hawkers.description",
            "huntingGroundsKey": "group.hawkers.hunting_grounds",
            "startingUpgrades": [
                "drug_den",
                "hawker_rigging"
            ],
            "groupXpKey": "group.hawkers.xp",
            "specialAbilities": [
                "all_hands",
                "ghost_market",
                "high_society",
                "hooked",
                "patron",
                "product_line",
                "pushers",
                "traffickers"
            ]
        },
        {
            "id": "shadows",
            "nameKey": "group.shadows",
            "descriptionKey": "group.shadows.description",
            "huntingGroundsKey": "group.shadows.hunting_grounds",
            "startingUpgrades": [
                "thief_rigging",
                "underground_maps_and_passkeys"
            ],
            "groupXpKey": "group.shadows.xp",
            "specialAbilities": [
                "everyone_steals",
                "ghost_echoes",
                "pack_rats",
                "patron",
                "second_story",
                "slippery",
                "synchronized",
                "thief_adept"
            ]
        },
        {
            "id": "smugglers",
            "nameKey": "group.smugglers",
            "descriptionKey": "group.smugglers.description",
            "huntingGroundsKey": "group.smugglers.hunting_grounds",
            "startingUpgrades": [
                "boat_house",
                "smuggler_rigging"
            ],
            "groupXpKey": "group.smugglers.xp",
            "specialAbilities": [
                "all_hands",
                "ghost_passage",
                "like_part_of_the_family",
                "patron",
                "reapers",
                "renegade",
                "veteran",
                "weird_science"
            ]
        }
    ],
    "worldData": {
        "locations": [
            {
                "id": "barrowcleft",
                "nameKey": "location.barrowcleft",
                "descriptionKey": "location.barrowcleft.description",
                "traits": [
                    "industrial",
                    "working_class",
                    "polluted"
                ],
                "securityLevel": 2,
                "notableLocationKeys": [
                    "location.barrowcleft.gaddoc_rail_station",
                    "location.barrowcleft.the_docks",
                    "location.barrowcleft.ironhook_prison"
                ]
            },
            {
                "id": "brightstone",
                "nameKey": "location.brightstone",
                "descriptionKey": "location.brightstone.description",
                "traits": [
                    "wealthy",
                    "noble",
                    "heavily_guarded"
                ],
                "securityLevel": 4,
                "notableLocationKeys": [
                    "location.brightstone.scurlock_manor",
                    "location.brightstone.bowmore_bridge",
                    "location.brightstone.sparkwrights"
                ]
            },
            {
                "id": "charterhall",
                "nameKey": "location.charterhall",
                "descriptionKey": "location.charterhall.description",
                "traits": [
                    "commercial",
                    "middle_class",
                    "bureaucratic"
                ],
                "securityLevel": 3,
                "notableLocationKeys": [
                    "location.charterhall.city_council_chambers",
                    "location.charterhall.doskvol_academy",
                    "location.charterhall.the_docks"
                ]
            },
            {
                "id": "crows_foot",
                "nameKey": "location.crows_foot",
                "descriptionKey": "location.crows_foot.description",
                "traits": [
                    "criminal",
                    "poor",
                    "dangerous"
                ],
                "securityLevel": 1,
                "notableLocationKeys": [
                    "location.crows_foot.the_bucket",
                    "location.crows_foot.gym",
                    "location.crows_foot.red_lamp"
                ]
            },
            {
                "id": "dunslough",
                "nameKey": "location.dunslough",
                "descriptionKey": "location.dunslough.description",
                "traits": [
                    "industrial",
                    "poor",
                    "polluted"
                ],
                "securityLevel": 1,
                "notableLocationKeys": [
                    "location.dunslough.the_soot",
                    "location.dunslough.bellweather_crematorium",
                    "location.dunslough.tangletown"
                ]
            },
            {
                "id": "sixTowers",
                "nameKey": "location.six_towers",
                "descriptionKey": "location.six_towers.description",
                "traits": [
                    "noble",
                    "political",
                    "ancient"
                ],
                "securityLevel": 4,
                "notableLocationKeys": [
                    "location.six_towers.whitecrown",
                    "location.six_towers.towers",
                    "location.six_towers.duskwall_academy"
                ]
            }
        ],
        "factions": [
            {
                "id": "bluecoats",
                "nameKey": "faction.bluecoats",
                "descriptionKey": "faction.bluecoats.description",
                "tier": 3,
                "type": "institution",
                "status": "neutral",
                "assetKeys": [
                    "faction.bluecoats.assets.patrol_boats",
                    "faction.bluecoats.assets.strongholds",
                    "faction.bluecoats.assets.political_connections"
                ],
                "goalKeys": [
                    "faction.bluecoats.goals.maintain_order",
                    "faction.bluecoats.goals.suppress_crime",
                    "faction.bluecoats.goals.serve_powerful"
                ]
            },
            {
                "id": "red_sashes",
                "nameKey": "faction.red_sashes",
                "descriptionKey": "faction.red_sashes.description",
                "tier": 2,
                "type": "criminal",
                "status": "neutral",
                "assetKeys": [
                    "faction.red_sashes.assets.sword_school",
                    "faction.red_sashes.assets.drug_operation",
                    "faction.red_sashes.assets.tycherosi_connections"
                ],
                "goalKeys": [
                    "faction.red_sashes.goals.expand_territory",
                    "faction.red_sashes.goals.perfect_blade_arts",
                    "faction.red_sashes.goals.profit_vice"
                ]
            },
            {
                "id": "lampblacks",
                "nameKey": "faction.lampblacks",
                "descriptionKey": "faction.lampblacks.description",
                "tier": 2,
                "type": "criminal",
                "status": "neutral",
                "assetKeys": [
                    "faction.lampblacks.assets.bucket_tavern",
                    "faction.lampblacks.assets.smuggling_tunnels",
                    "faction.lampblacks.assets.loyal_workers"
                ],
                "goalKeys": [
                    "faction.lampblacks.goals.control_crows_foot",
                    "faction.lampblacks.goals.eliminate_rivals",
                    "faction.lampblacks.goals.rule_strength"
                ]
            }
        ]
    },
    "mechanics": {
        "actionResolution": {
            "diceSystem": "d6_pool",
            "outcomes": [
                {
                    "result": "critical",
                    "diceResult": "6_6_plus",
                    "descriptionKey": "outcome.critical.description"
                },
                {
                    "result": "success",
                    "diceResult": "6",
                    "descriptionKey": "outcome.success.description"
                },
                {
                    "result": "partial_success",
                    "diceResult": "4_5",
                    "descriptionKey": "outcome.partial_success.description"
                },
                {
                    "result": "failure",
                    "diceResult": "1_3",
                    "descriptionKey": "outcome.failure.description"
                }
            ],
            "position": [
                {
                    "id": "controlled",
                    "nameKey": "position.controlled",
                    "descriptionKey": "position.controlled.description"
                },
                {
                    "id": "risky",
                    "nameKey": "position.risky",
                    "descriptionKey": "position.risky.description"
                },
                {
                    "id": "desperate",
                    "nameKey": "position.desperate",
                    "descriptionKey": "position.desperate.description"
                }
            ],
            "effect": [
                {
                    "id": "great",
                    "nameKey": "effect.great",
                    "descriptionKey": "effect.great.description"
                },
                {
                    "id": "standard",
                    "nameKey": "effect.standard",
                    "descriptionKey": "effect.standard.description"
                },
                {
                    "id": "limited",
                    "nameKey": "effect.limited",
                    "descriptionKey": "effect.limited.description"
                }
            ]
        },
        "stress": {
            "maxValue": 9,
            "sourceKeys": [
                "stress.source.pushing_yourself",
                "stress.source.assisting_others",
                "stress.source.using_abilities",
                "stress.source.resisting_consequences"
            ],
            "conditionKeys": [
                "stress.condition.cold",
                "stress.condition.haunted",
                "stress.condition.obsessed",
                "stress.condition.paranoid",
                "stress.condition.reckless",
                "stress.condition.soft",
                "stress.condition.unstable",
                "stress.condition.vicious"
            ]
        },
        "harm": {
            "levels": [
                {
                    "level": 1,
                    "nameKey": "harm.lesser",
                    "exampleKeys": [
                        "harm.level.1.example.shaken",
                        "harm.level.1.example.distracted",
                        "harm.level.1.example.scared",
                        "harm.level.1.example.confused"
                    ]
                },
                {
                    "level": 2,
                    "nameKey": "harm.moderate",
                    "exampleKeys": [
                        "harm.level.2.example.exhausted",
                        "harm.level.2.example.deep_cut",
                        "harm.level.2.example.concussion",
                        "harm.level.2.example.panicked"
                    ]
                },
                {
                    "level": 3,
                    "nameKey": "harm.severe",
                    "exampleKeys": [
                        "harm.level.3.example.impaled",
                        "harm.level.3.example.broken_leg",
                        "harm.level.3.example.shot",
                        "harm.level.3.example.stabbed"
                    ]
                }
            ]
        }
    },
    "gmTools": {
        "scenarioTypes": [
            {
                "id": "assassination",
                "nameKey": "scenario.assassination",
                "descriptionKey": "scenario.assassination.description",
                "complicationKeys": [
                    "scenario.assassination.complication.protected",
                    "scenario.assassination.complication.bystanders",
                    "scenario.assassination.complication.setup"
                ]
            },
            {
                "id": "burglary",
                "nameKey": "scenario.burglary",
                "descriptionKey": "scenario.burglary.description",
                "complicationKeys": [
                    "scenario.burglary.complication.security",
                    "scenario.burglary.complication.not_there",
                    "scenario.burglary.complication.someone_else"
                ]
            },
            {
                "id": "espionage",
                "nameKey": "scenario.espionage",
                "descriptionKey": "scenario.espionage.description",
                "complicationKeys": [
                    "scenario.espionage.complication.watched",
                    "scenario.espionage.complication.false_info",
                    "scenario.espionage.complication.time_pressure"
                ]
            }
        ],
        "randomEvents": [
            {
                "id": "arrest",
                "nameKey": "event.arrest",
                "descriptionKey": "event.arrest.description",
                "trigger": "1-3"
            },
            {
                "id": "cooperation",
                "nameKey": "event.cooperation",
                "descriptionKey": "event.cooperation.description",
                "trigger": "4-5"
            },
            {
                "id": "demonic_notice",
                "nameKey": "event.demonic_notice",
                "descriptionKey": "event.demonic_notice.description",
                "trigger": "6"
            }
        ],
        "challenges": [
            {
                "id": "locks_traps",
                "nameKey": "challenge.locks_traps",
                "descriptionKey": "challenge.locks_traps.description",
                "suggestedActions": [
                    "tinker",
                    "hunt"
                ]
            },
            {
                "id": "guards_patrols",
                "nameKey": "challenge.guards_patrols",
                "descriptionKey": "challenge.guards_patrols.description",
                "suggestedActions": [
                    "prowl",
                    "survey",
                    "sway"
                ]
            },
            {
                "id": "supernatural_forces",
                "nameKey": "challenge.supernatural_forces",
                "descriptionKey": "challenge.supernatural_forces.description",
                "suggestedActions": [
                    "attune",
                    "study"
                ]
            }
        ]
    }
}

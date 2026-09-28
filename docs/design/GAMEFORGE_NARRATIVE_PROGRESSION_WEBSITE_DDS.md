# GameForge Narrative, Progression & Website Integration Design Specification
## The World Remembers

**Canonical living DDS — version 1.0 — 2026-09-28**

Status: approved narrative foundation expanded into design requirements; implementation remains staged. Owner: GameForge project owner. Audience: narrative authors, engineers, artists, QA, and AI agents. Repository baseline: `7d0a2fc350cc971410e488a37b69247068a4d726` on `main`. Documentation changes do not imply shipped functionality.

Read [the repository audit](REPOSITORY_CANON_AUDIT.md) before mapping these requirements to code. Read [AI_README.md](../../AI_README.md) for the implementation entry point. This document is the canonical narrative/progression specification; older editor/drop-in READMEs remain useful technical evidence, not competing campaign plans.

### Contents

1. [Authority and design pillars](#1-authority-and-design-pillars)
2. [World bible and central conflict](#2-world-bible-and-central-conflict)
3. [Recurring cast and character arcs](#3-recurring-cast-and-character-arcs)
4. [Town identities and geography](#4-town-identities-and-geography)
5. [Complete campaign treatment](#5-complete-campaign-treatment)
6. [Quest and side-story specification](#6-quest-and-side-story-specification)
7. [Website shell and navigation](#7-website-shell-and-navigation)
8. [Progression matrix](#8-progression-matrix)
9. [Shared state and activity integration](#9-shared-state-and-activity-integration)
10. [Coding conventions and content contracts](#10-coding-conventions-and-content-contracts)
11. [AI implementation rules and roadmap](#11-ai-implementation-rules-and-roadmap)
12. [Acceptance, maintenance, and unresolved decisions](#12-acceptance-maintenance-and-unresolved-decisions)

## 1. Authority and design pillars

**The website is the persistent game host.** A GameForge account owns the character, inventory, coins, companions, homes, discoveries, and campaign progress. Town exploration, fishing, pet care, battles, and table games are activities launched within that host. They contribute to one persistent life.

The approved premise is preserved: memory stabilizes the Wild; Forgers built Anchors and the World Forge; the world is becoming undecided; caring, exploring, making homes, and playing together create connections. The player becomes a Forger through actions rather than bloodline or prophecy. Lyra warns against blindly restarting the network. Silas wants to prevent another Bellweather. The resolution must preserve both stability and the right to change.

The referenced ChatGPT story was retrieved on 2026-09-28; its bounded returned narrative ends during the Bellweather/Silas introduction. The detailed continuation, additional cast, chapter subdivision, mechanical contracts, and ending below are authored expansions of that approved foundation, not quotations from unavailable source text. Do not label these additions as already implemented or pretend the prior draft specified their exact dialogue.

Requirements use **MUST** for acceptance conditions, **SHOULD** for defaults that need a recorded reason to vary, and **MAY** for optional scope. New IDs and APIs below are proposed contracts unless the audit explicitly identifies an existing implementation.

### Pillars

- **Belong before danger.** Let the player meet people, establish a home, care for a companion, and enjoy ordinary jobs before the first supernatural event.
- **Restore places, not just machines.** Each town asks a different question; community action matters as much as technical repair.
- **Small shell, expanding life.** Introduce one major interaction family at a time. Page discovery, page access, activity entitlement, and advanced tools are separate gates.
- **One account, many activities.** No iframe creates a second economy or a second canonical story profile.
- **Cozy agency with meaningful stakes.** Loss and grief exist; routine play remains inviting. No pet permadeath, forced pet sale, or sudden deletion of owned homes.
- **Progress without mandatory mastery.** Winning ranked PvP, finding a rare random hatch, paid items, real-time shop hours, and other players' availability MUST NOT gate the main campaign.
- **Visible consequences.** Repairs alter routes, NPC behavior, shop stock, music, notice boards, and the shell's return summary.
- **Living canon with evidence.** Preserve useful names, IDs, assets, and architecture. Replace development placeholder prose without deleting player-owned content.

The main campaign is personal. Multiplayer presence is shared, but one player's chapter completion MUST NOT complete another player's campaign. Cooperative activities validate each participant's eligible contributions separately.

## 2. World bible and central conflict

### The Wild and the forging of permanence

Before settlement, the Wild held possibilities without durable boundaries. A river might remember a different course; a creature might awaken in a shape it nearly became. The earliest Forgers discovered that repetition, care, naming, and communal remembrance could give things continuity. They built Anchors under places where many lives met: markets, docks, hearths, gardens, and halls of play.

An Anchor gathers lived connections and strengthens local continuity. A Forge is the apparatus that regulates this process. The World Forge links the Anchors so one town can lend stability to another. Its broken-circle hammer emblem means work continuing beyond any one maker; it was never a royal crest.

The early network allowed change. Later governors demanded predictable harvests, permanent borders, and certainty. The **Closure Protocol** ranked remembered histories and excluded alternatives into a reservoir called the **Unwritten**. Its success made people forget the bargain. Towns grew safe while possible lives, species, and futures accumulated out of sight.

**Forger Lyra** discovered that the reservoir contained responsive traces, including people whose histories had been discarded. She and fellow Forgers shut down the central Closure governor while leaving local Anchors running. This was an emergency interruption, not a successful redesign. Their warnings were fragmented; later custodians inherited rituals without understanding the engineering. The shutdown predates the present campaign by centuries.

Silas did not cause the original shutdown. Bellweather's collapse occurred during his childhood, decades before the player's arrival, when an isolated Anchor failed and its emergency fallback selected a single incomplete history. Some residents escaped; others vanished from ordinary reality. Bellweather remained in the Unwritten as broken overlapping continuities.

Today local Anchors are exhausted, contradictory emergency policies are activating, and accumulated possibilities return through weak connections. The world is not simply dying: it is becoming undecided. Roads loop, eggs receive incompatible influences, bells ring from missing streets, and entire neighborhoods intermittently disappear.

### Rules of the fiction

| Concept | Narrative rule | Gameplay implication |
|---|---|---|
| Memory | A lived relationship, not merely an archive entry | Collecting books alone cannot resolve a town; quests include people and acts of care |
| Resonance | Measurable response of an Anchor to connections and possibility | Scanner discoveries and egg influences use shared state; resonance is not a new premium currency |
| Companion | Living continuity close to the Wild; senses contradictions early | Any healthy eligible companion can identify clues; species changes flavor, not story access |
| Echo | A trace or person from another possible continuity | Some echoes are recordings; some have agency. Dialogue establishes which |
| Unwritten | Excluded possibilities held by Closure | Cannot be harvested as an infinite loot mine; access requires story authorization |
| Anchor | Amplifies communal stability | Region repair changes authored scene variants and unlocks, not arbitrary terrain generation |
| Governor | Applies policy to an Anchor | Ember's rigidity and Tidehaven's selection pressure are different policies |
| World Forge | Connects local Anchors and sets network policy | Endgame redesign requires contributions from all completed regional arcs |
| Games | Repeated play produces shared memories | Table games remain ordinary games with capped shared rewards; no grim rewrite of chess |
| Home | A durable place of belonging | Housing is mechanically and narratively meaningful; decoration style is optional |

Memory is not a popularity contest. The network must not reward a crowded town by erasing an isolated household. Friendship counts do not measure a person's right to exist. Contradictory histories can coexist when people establish new relationships in the present; duplication alone cannot solve every loss.

### Factions

**Tavern custodians** preserve warnings and local records. Mara's inheritance is stewardship, not secret rulership.

**The Keepers** maintain technical knowledge in Ironvale. Their orthodox leadership believes one benevolent operator should restore Closure. Their field workers repair roofs and evacuate neighbors; they are not uniformly cruel.

**The Open Circle** forms during the campaign from local delegates, researchers, players, and reformed Keepers. It advocates consent, distributed oversight, and continuity that permits new choices. It is a council, not the player's army.

**The Unwritten residents** disagree among themselves. Some want restoration, some want separate lives, and some fear being turned into historical exhibits. They must speak for themselves at Tidehaven and Bellweather.

### The actual conflict

Silas's **Restoration Mandate** would prevent collapse by enforcing one authoritative history. It would also suppress new possibilities and exclude people who do not fit that history. Leaving the Forge disabled would preserve freedom briefly while local failures increase. The player develops a third approach: **Living Accord**, a distributed network that maintains a continuity floor, permits bounded local experimentation, and routes disputes to living communities.

The ending does not make danger vanish. Maintenance, disagreement, and unexplored possibilities remain. It removes the single-operator erasure mechanism and establishes accountable repair. The recurring endgame is keeping the world habitable while helping it grow.

## 3. Recurring cast and character arcs

Existing scene IDs stay stable. Narrative identity and scene implementation IDs need an explicit alias map, not silent renaming.

| Character / proposed narrative ID | Role, voice, and flaw | Campaign arc and return behavior |
|---|---|---|
| Mara Vale / `npc_mara_vale` | Driftwood proprietor; warm, observant, economical with words; keeps too many secrets | Welcomes player, opens cellar, admits custodians recorded warnings without acting, organizes aid to Bellweather; ending tavern has a public archive |
| Mira / existing `npc_mira` | Tavern floor manager; practical, dry humor | Remains distinct from Mara. Handles jobs and introductions while Mara tends cellar duties; later runs the rebuilt festival kitchen |
| Tessa Wren / `npc_tessa_wren` | Pet Center caretaker; blunt with adults, patient with animals | First companion, ethical care, challenges treating eggs as tools; helps Elian replace coercive experimentation with observed choice |
| Toma / existing `npc_toma` | Pet Guide; cheerful, likes checklists | Handles accessible tutorials and recovery companions; grows into a trainer who notices feelings before statistics |
| Orin Reed / `npc_orin_reed` | Old fisherman; pauses, understatement, shame | Denies symbol, reveals family watch duty, reconciles with Edda, eventually teaches fishing without hiding history |
| Edda Reed / `npc_edda_reed` | Riverbend watcher; direct, distrusts institutions | Explains possibility, admits choosing isolation; opens cottage as refuge after forest repair and carries family records to Bellweather |
| Professor Elian Moss / `npc_elian_moss` | Egg researcher; precise, distractible, overconfident | Basic lab, imperfect theory, Ember experiments expose his assumptions; Tidehaven teaches restraint; master lab protects individual hatch paths |
| Kael Rowan / `npc_kael_rowan` | Explorer; wry, records corrections in margins | Guides woods and scanners, learns a map is a promise to update rather than possess a place; endgame publishes community maps |
| Kip / existing `npc_kip` | Alley child; mischievous and perceptive | Finds passages adults miss; keeps names of vanished neighbors; matures into apprentice chronicler without becoming a child soldier |
| Dockmaster / existing `npc_dockmaster` | Logistics specialist; concise, trustworthy | Teaches travel and return points; organizes Tidehaven ferries and Bellweather evacuation routes; distinct from Orin |
| Neri Finch / `npc_neri_finch` | Arcade/Echo Hall keeper; playful, fair | Demonstrates why play matters, refuses rigged contests, carries community games to displaced families |
| Iona Ash / `npc_iona_ash` | Ember master smith; proud, careful | Defends ancestral rules, supports apprentice's new design after seeing repeated failures; becomes crafting mentor |
| Pell Ash / `npc_pell_ash` | Ember apprentice; impatient, inventive | Wants to leave, learns preservation and innovation can cooperate; authors festival's first new ornament |
| Captain Sera Quill / `npc_sera_quill` | Tidehaven ferry captain; candid, counts heads before cargo | Loses routes between tides, becomes coordinator of two harbor districts; rejects treating passengers as statistics |
| Lio / `npc_lio_tidehaven` | Storm-history child; curious, remembers a destroyed lighthouse | Demands recognition as a present person; attends shared school after repair rather than becoming a puzzle token |
| Archivist Ada Fen / `npc_ada_fen` | Ironvale scholar; formal, quietly skeptical | Gives access to records, exposes censored Lyra message, helps replace Keeper secrecy with public review |
| Warden Garrick Holt / `npc_garrick_holt` | Keeper leader; courteous, disciplined, paternalistic | Honors player, supports Mandate, then accepts limits after evacuation proves local autonomy can work; answerable after the finale |
| Jun Bell / `npc_jun_bell` | Bellweather clockmaker and echo resident; gentle, exact | Remembers Silas as a frightened boy; insists rescue means letting survivors build new lives, not rebuilding an exact photograph |
| Forger Lyra / `npc_lyra_recording` | Historical voice; compassionate, accountable | Fragmentary warning becomes full confession in Ironvale; cannot conveniently resurrect to fix the player's problems |
| Silas Veyr / `npc_silas_veyr` | Skilled restorer; patient teacher, fear hidden behind certainty | Ally in Crystal Cave, partner under strain in Ember, critic at Tidehaven, rival in Ironvale, grieving survivor in Bellweather, accountable collaborator after finale |

Silas's development is mandatory regardless of player dialogue tone. Optional empathy changes his personal epilogue, not access to the ending. He must perform credible good acts: repairing the cave, teaching safe isolation, rescuing workers, maintaining supplies. His harm is equally concrete: concealing Closure's exclusion rule, attempting to override Tidehaven, and activating central authority despite delegates' refusal.

At Bellweather he discovers that saving his childhood town cannot return his childhood. Jun's family has lived years he did not share. The final turning point is his choice to open a relief channel at personal risk while the player dismantles unilateral control. He is not forgiven by every resident; he spends the epilogue repairing what he damaged under public oversight.

## 4. Town identities and geography

The campaign route is Whisperwind → Sunny Meadows → Shadow Woods/Riverbend/Crystal Cave → Ember Hollow → Tidehaven → Ironvale → Bellweather → World Forge. Return travel to unlocked safe hubs is free. Routes are authored connections, not distances players must infer from a map.

| Region | Identity and ordinary life | Landmarks and visual/audio direction | Local conflict and enduring change |
|---|---|---|---|
| Whisperwind | Trading town for people beginning again; hospitality, odd jobs, pets, small homes | Market Square, Tavern Lane, Residential Row, Upper Cliff, Hidden Alley, docks, Driftwood, Pet Center, arcade; warm lanterns and river sounds | Forgotten custodianship becomes open stewardship; cellar archive, repaired bell, and Chronicle Board appear |
| Sunny Meadows | Farming community and field settlement; shared tools, seed swaps, quiet ponds | Missing Field, farms, stone bridge, Egg Lab, meadow springs; greens, pollen, bells on livestock | Conflicting paths and unstable eggs; restored footpaths coexist with experimental plots |
| Shadow Woods | Older forest and scattered trail camps, not a conventional town | Dock, looping trails, hollow tree entrance, waterfall; canopy shadows and repeated birdsong | Reality repeats old journeys; routes become dependable after consent-based local repair |
| Riverbend | Refuge at forest edge; family watch station | Edda's cottage and public shelter pier | Reed family secrecy becomes practical care; shelter and records open |
| Crystal Cave | Working local Anchor and abandoned mine network | Crystal chamber, underground pool, mine cart, deeper passage | Silas's useful repair hides policy questions; first reversible Anchor repair changes forest |
| Ember Hollow | Furnace town, geothermal workshops, inherited trades | Governor chamber, kiln square, Ember Tree, apprenticeship hall | Rigid continuity prevents innovation; revised governor allows new craft and festival traditions |
| Tidehaven | Docks, islands, tidal flats, ferry households | Two harbor histories, bell-marked piers, lighthouse, tide pools | Forced historical selection threatens residents; linked twin districts share present civic life |
| Ironvale | Foundry city, archives, Keeper service and hierarchy | Keeper Hall, public works yard, rail court, archive, control dais | Worship of centralized order yields to accountable technical stewardship |
| Bellweather | Collapsed town encountered through fractured continuities | Clock shop, missing school, bell tower, evacuation square | Rescue restores residents' agency and a safe settlement, not a perfect copy of the past |
| World Forge | Underworld network junction, not a loot capital | Connection galleries, Unwritten threshold, central governor, Accord chamber | Distributed Living Accord replaces unilateral Closure; maintenance expeditions become endgame |

**Housing ambiguity:** the existing `riverbend_cottage_interior` is used as a starter-home interior and as an isolated cottage scene hook. Reuse the asset, but runtime instances MUST distinguish the player's private starter home from Edda's public Riverbend cottage. A shared scene filename is not shared ownership. Keep existing `plot_01` links working; the older README's `riverbend_cottage` example is not assumed to be the active plot ID.

**Landmark preservation:** Echo Hall becomes the arcade/community festival hall; Chronicle Board is the in-world journal mirror; Forge Gate is a late travel threshold. These are narrative uses for existing landmark direction, not proof that finished scenes already exist.

### Whisperwind local history and exploration design

**Owner-approved expansion — 2026-09-28; authored design, not a claim of shipped quests.**

Whisperwind began with a ferry landing and a shared supper table. Travelers stranded by a spring flood stayed to rebuild the quay; fishers, gardeners and craftspeople gradually made a town where a newcomer could earn a place by helping. The river remains its livelihood. The oldest paths follow the ferry's dry ground, while stone terraces protect homes above the flood line. Stairs exist to connect those terraces, with landings that meet both the upper street and lower lane.

The town's heart is **Commonlight Square**, a generous, ornate gathering place around the fountain and market bell. Its paving was laid by households contributing one stone apiece. Market days, meals and seasonal celebrations keep that tradition alive. Leave a broad clear event floor; arrange shops, flower beds, lamps and seats around its edges. Driftwood opens toward the square, while the Pet Center and playground share a quieter garden nearby.

**Reedwater Quay** is the working waterfront: River Tackle, nets, fish crates, moored boats and a riverside promenade. **Lantern Hill** holds older homes and the inn above a continuous retaining wall, reached by purposeful stairs and overlooked by a small resting terrace. **Orchard Gardens** grew where flood-recovery families planted fruit trees; selected houses own fenced gardens, while apartments share courtyards. **The Hidden Alley** is an older passage behind the market, sheltered enough that companions seek its warmth. Echo Hall connects play with the town's public life, and the Chronicle Board belongs on the square's main approach.

The Anchor beneath Driftwood predates the visible town. Its custodians once understood that ordinary acts of care sustain continuity; later generations retained the bell ceremony while forgetting its purpose. A faint broken-circle hammer in an old wall, a letter tucked in a garden, and a riverside viewpoint can invite curiosity before the C1 mystery. Preserve the existing spindle, Orin, Mara and cellar sequence. New discoveries may provide flavor until their validated quest dependencies exist.

**Orchard Lake and the old mansion.** Beyond the fruit gardens, a sheltered lake offers a quiet shore and a potential fishing destination. A narrow path follows its reeds toward a weathered mansion partly hidden by mature trees. The house is an optional future-story landmark, not a new main-campaign gate. Its history and quest remain to be authored; an inaccessible door gives an in-world explanation. Lake catches must use the existing validated fishing and fish-record services before fishing is presented as active.

The exploration promise is beauty first, then curiosity: glimpses of a flowering terrace beyond a doorway, a lane disappearing beneath willows, a quiet fishing nook, or a small story left by a resident. Each district has a recognizable landmark, an ordinary daily purpose, and something worth finding. Avoid scattering objects across open grass. Place benches where someone would rest, trees where gardens or riverbanks support them, and stairs where the terrain visibly changes. Paths merge cleanly, vary width by importance, and end at actual thresholds.

Children may spend free time in the garden playground, take turns with shared activities, and move elsewhere when its capacity is reached. A jump-rope station can be used by a player when unclaimed. These are planned atmosphere and optional play; schedules and occupancy must never block main-story access.

Visual references: Final Fantasy VI for layered districts, readable landmarks and civic grandeur; Stardew Valley for approachable community spaces and daily life. GameForge's layout, art and lore remain original.

## 5. Complete campaign treatment

Chapter names and quest IDs below define the campaign spine. All required objective counts are deterministic. Optional branches personalize dialogue, decorations, reputation, and epilogues; they do not create mutually incompatible shared multiplayer worlds.

### C0 — A Place at the Table: arrival and belonging

The player arrives at Whisperwind with no prophecy and no special credential. Mara offers supper and directions. Mira has three small jobs: deliver bread to the Pet Center, return a misplaced parcel at Market Square, and repair a notice-board slat. Each introduces movement, inspection, interaction, and a distinct person. The shell starts with a single “Continue in Whisperwind” card; the Chronicle appears after the first job is accepted.

After the jobs, Mira asks where the player plans to sleep. Mara offers a newcomer cottage in exchange for contribution, not purchase. The player chooses a sign or welcome mat and receives a persistent private home. A communal plot is an optional visible address; plot occupancy cannot block this reward. “My House” appears only after ownership is committed. There is time to enter, place one free object, and leave.

Tessa asks for help locating an escaped companion. Toma explains care. The creature is following warmth in the Hidden Alley rather than fleeing abuse. It leads the player to a worn broken-circle hammer in a foundation. Touching it gives a moment of warmth, not a cinematic power-up. The companion chooses to stay; its type may be chosen from available common species without implying a chosen species.

Required quests: `mq_c0_welcome`, `mq_c0_local_jobs`, `mq_c0_home`, `mq_c0_companion`. Reveal: places and creatures respond to care. Stakes: whether this town feels like somewhere worth staying.

Dialogue anchors:
- Mara: “Half the town is hidden behind the other half. Start with supper.”
- Tessa: “It wasn't running away. It was asking someone to follow.”
- Mira, after home grant: “You can change the curtains. The address is yours.”

### C1 — Beneath the Still River: the first mystery

Orin introduces fishing at the docks. The first ordinary catch is guaranteed; losing a cast teaches retry rather than removing bait needed for progression. The next guided catch produces a blackened metal spindle with the alley emblem. Orin denies recognition. Kip notices his hands shaking.

Neri invites the player to repair one arcade table and try a short game. A tutorial game with an NPC, a local solo activity, or a validated multiplayer match all qualify. A win is unnecessary. The player receives a starter cartridge and learns the difference between owning a game and joining a friend's table. Neri says games keep familiar places familiar; the line initially sounds sentimental.

The Market Square bell rings once. Animals wake toward the river. Light below still water traces a network for seconds. This event is a personal authored sequence triggered after both the spindle and play tutorial, never a real-world midnight appointment.

Mara opens the room beneath Driftwood. Orin fits the spindle into a wall recess. “WHISPERWIND ANCHOR / CONNECTION UNSTABLE / MEMORY LOSS DETECTED / FORGER REQUIRED.” The machine responds to the player's newly formed ties. Mara admits her inherited duty; Orin admits knowing Edda's watch stories but fearing their truth. The partial map points east.

Required quests: `mq_c1_river`, `mq_c1_play`, `mq_c1_bell`, `mq_c1_cellar`. Reward: exploration permit, regional map, free supplies, Sunny Meadows access. Whisperwind remains a return home, not a discarded tutorial.

### C2 — The Missing Field: Sunny Meadows

At the meadow settlement, farmers disagree about where a fence ended. The player surveys three landmarks, compares a resident's testimony with a map, and repairs a small bridge. Evidence is contradictory without making NPCs foolish.

Elian's lab offers a rescued egg. The player records two different care influences using provided tools; no rare hatch is needed. Eggs reveal possibilities close to becoming life. Tessa appears with a caution: a measurement is not permission to force a creature into a preferred shape. Basic Egg Lab tools unlock after the experiment.

The companion senses a stream crossing that reveals the Missing Field. Ruins contain a damaged Anchor and Lyra's first recording: “Do not restart the World Forge. Find out why it was shut down first.” The player performs limited stabilization to stop the bridge shifting but leaves the governor untouched. Elian names Forge Resonance, then discovers his instruments cannot distinguish every kind of echo.

The map's next reliable connection runs through Shadow Woods. Kael supplies a trail plan and tells the player to record changes rather than pretend the map is infallible. Required quests: `mq_c2_survey`, `mq_c2_egg`, `mq_c2_missing_field`. Reward: basic lab entitlement, lore entry, safe forest access. Optional hatching can continue later without holding the campaign hostage to growth timers.

### C3 — Paths That Remember: Shadow Woods and Riverbend

The forest introduces preparation. Kael checks a lantern and care supplies, offers free replacements, and teaches three trail observations. The same birdsong repeats at incompatible locations; camp food remains warm beside old equipment. The player learns to distinguish a repeated memory from a present danger.

A distressed echo creature blocks the trail. Toma's practice lesson teaches guard, a basic move, and recovery. The player may complete a forgiving NPC encounter or a calm-and-guide sequence. Both prove companion support and unlock pet battle access; neither requires PvP. Failure returns to camp with free recovery and preserves observations.

Kael lends the Relic Scanner. Its campaign survey mode is deterministic; the existing consumable exploration boost remains a separate item effect. Three readings identify an ancient route marker. Ancient Coins found on the route are optional curiosity rewards; none must be spent to proceed.

At Riverbend, Edda recognizes the spindle. Orin joins, and the siblings argue about whether hiding the truth protected anyone. Edda explains the Unwritten in ordinary terms: the forest is full of roads that might have been. Her testimony and Kael's readings authorize a Shadow Key route entitlement; the quest supplies a key if needed. Purchasing or using an existing key grants its existing local unlock, but does not skip this chapter.

Required quests: `mq_c3_trails`, `mq_c3_support`, `mq_c3_relics`, `mq_c3_riverbend`. Reward: shelter checkpoint, `pet_battle`, authenticated cave access, scanner discovery log. The forest is dangerous enough to matter without becoming a punishment for casual players.

### C4 — The Man Who Repairs Tomorrow: Crystal Cave

Beyond the Shadow Key passage is an Anchor working better than any the player has seen. Fresh food, careful notes, and a spare lantern imply a living restorer. Silas greets the player as a Forger because the companion and spindle reveal their connections.

He offers a concrete repair: isolate the broken forest link, replace a damaged conductor, then reopen it gradually. The player inspects three components and rehearses shutdown before applying the patch. Silas accepts Lyra's warning but calls it an emergency instruction, not a permanent philosophy.

The limited repair works. Repeating trails stop, Riverbend shelter gains visitors, a cave fishing pool becomes safe, Explorer Supply gains stock, and a restored forest road leads to Ember Hollow. This is the first large visible success. Silas shares credit and helps carry injured workers.

In his notes, the player finds an unexplained entry: “Restore authority after local continuity.” He answers honestly about wanting reliable control but withholds what Closure excludes. The player trusts his craft while the journal records an unresolved policy question.

Required quests: `mq_c4_silas`, `mq_c4_repair`. Reward: forest restoration state, advanced exploration, Ember route, regional return travel. Silas is a helpful ally with a dangerous answer, not a disguised monster.

### C5 — A Festival With No New Song: Ember Hollow

Ember Hollow's annual hearth festival repeats exactly. Pell makes a new ornament; it cracks each time it cools. Iona assumes poor technique. A new shop's sign fades overnight while ancestral marks stay bright. Eggs show unusually narrow outcomes.

The player gathers observations from smith, apprentice, and a returning emigrant, then crafts a repair coupling using supplied Ember shards. The existing Ember adventure can supply optional materials, but required shards also have a fixed quest source. Elian and Tessa compare an egg outside and inside the town; the governor suppresses variation.

Silas argues that stability should be repaired before experimenting. Iona fears losing both trade and home. The player proposes a reversible trial in one public workshop: preserve the continuity floor, relax the suppression rule, and observe the next cooling cycle. It works because craft, witnessing, and a safe rollback cooperate.

At the festival, Pell introduces a new verse honoring the old one. Iona joins. The governor opens new possibilities without melting the town. Silas respects the result yet insists a local trial cannot protect a collapsing network.

Required quests: `mq_c5_unchanging`, `mq_c5_craft`, `mq_c5_new_song`. Reward: crafting tab, `egg_lab_advanced`, Ember materials, improved home workshop, Tidehaven route. The moral is not “tradition bad”; living tradition can change.

### C6 — Two Harbors, One Tomorrow: Tidehaven

Bells mark piers that disappear without submerging. Sera's ferry ledger lists passengers who never coexist on one crossing. One history survived a storm; another rebuilt after it. Lio exists only in the storm history and asks why maps call his home a mistake.

The player visits both districts in safe authored phases, logs three matching places, and collects each council's consent to attempt a linked harbor. No inventory duplicates when phases change. Fish, families, and cargo share one account ledger even when their scenery differs.

The obvious governor repair selects one history. Silas proposes preserving the larger district while recording the other. The player refuses to turn living people into records. Sera coordinates a bridge of present relationships: shared ferry work, exchanged tools, and a game between the two schools. The player's website journal compares testimonies and confirms both councils before the final installation.

Silas attempts to enable a selection override “for safety.” The player stops it without destroying the Anchor. The experimental paired connection succeeds imperfectly: the districts remain visibly different, tides still govern some optional paths, but residents have stable access to a common square.

Required quests: `mq_c6_two_ledgers`, `mq_c6_ferry`, `mq_c6_common_square`. Reward: water exploration, Tide Tackle expansion, aquatic discovery pool, two-history travel filter. Silas leaves for Ironvale, shaken by a success he cannot explain.

### C7 — The Weight of Order: Ironvale

The Keepers welcome the player with ceremony and practical assistance. Garrick presents repaired infrastructure, disciplined crews, and a chance to make the world's remaining towns safe. Silas asks the player to operate the restored World Forge. Accepting a conversation invitation is not accepting the Mandate.

Ada finds the rest of Lyra's recording. Lyra admits the old network was preserving one reality by excluding others, and that shutting its governor down left a future generation with unfinished work. The player investigates three archive exhibits and helps evacuate a failing public works ward. Ordinary Keeper workers cooperate even while leadership demands centralized authority.

The player brings Ember's reversible trial and Tidehaven's coexistence records to an open hearing. Garrick questions whether local consent can respond quickly to catastrophe. The player demonstrates emergency routing with limited delegated powers and a visible expiry. The city's restored public yard becomes a place for competing proposals.

Silas reveals Bellweather and his missing family. He cannot accept a policy that might let another town disappear. He takes the central authority token to reopen its sealed route. He does not steal the player's entire inventory or erase earned progress.

Required quests: `mq_c7_archive`, `mq_c7_ward`, `mq_c7_hearing`. Reward: public archive, council board, master lab research access, Bellweather route. The central question becomes explicit: who may decide which lives belong?

### C8 — The Names Beneath the Bells: Bellweather

Bellweather is a town of partial mornings. A school bell rings beside an absent wall. Jun repairs a clock that keeps time for people unable to leave. Silas wants an exact restoration of the town he lost; Jun remembers him, but has a present life that does not fit his childhood photograph.

The player gathers three resident testimonies and builds a rescue register with consent choices: relocate, stay with protection, or delay. Restoring a name without listening to the person is insufficient. Kip contributes remembered names; Mara coordinates shelter; Edda turns her watch records into routes. These allies support the player's tasks rather than solving them offscreen.

Silas's reconstruction briefly restores buildings while displacing later residents. A confrontation shows the cost of making history obey a single memory. The player establishes a safe settlement link and helps three households cross or secure their homes. Rescue targets are guaranteed authored characters, not randomized collectibles.

Silas admits he sought certainty because he could not bear another incomplete goodbye. Jun tells him a saved town does not owe him the past. Silas returns the authority token but the central governor has already begun its restoration cycle. He chooses to help open relief channels.

Required quests: `mq_c8_names`, `mq_c8_crossing`, `mq_c8_silas`. Reward: `egg_lab_master`, Bellweather safe hub, resident register, World Forge access. Some missing people remain unknown; the story avoids claiming that grief is cured by perfect machinery.

### C9 — The Living Accord: World Forge

Delegates from repaired communities gather. Ember provides reversible control; Tidehaven provides coexistence; Ironvale provides transparent records; Bellweather provides consent-based rescue; Whisperwind provides a living home network. No rare item or ranked match substitutes for these completed arcs.

The player prepares the Accord at the website council board, reviewing each contribution and confirming the emergency fallback. The shell then launches the central Forge expedition with a server-issued session and a clear return point. Three junction challenges test routing, companion support, and restoring an isolated connection. Assist mode offers untimed versions with the same story result.

Closure offers an easy answer: appoint one Forger, select one history, eliminate contradiction. Silas initially hears the promise he has wanted all his life. He opens the relief circuit instead. The player replaces central authority with distributed local mandates, transparent revisions, and non-erasing isolation when a link fails.

The climax is an action sequence and a deliberative resolution, not merely defeating Silas. A mechanical guardian can provide a combat option; redirecting its safety routine is an equivalent main-story path. The final commit requires all five community contributions and successful junction validation. Reward, completion, and world policy update are one idempotent transaction.

Required quests: `mq_c9_contributions`, `mq_c9_junctions`, `mq_c9_accord`. Reward: campaign completion, Accord badge, home memorial, full stable regional travel, maintenance board. Final choice selects a public remembrance emphasis—gardens, games, or archives—for cosmetic epilogues; it does not restore erasure as an alternate canon.

Dialogue anchors:
- Lyra's final record: “We stopped the wrong answer. We did not finish the right one.”
- Silas: “I wanted a world that couldn't take anyone from me. I stopped asking what it would take from everyone else.”
- Player response choices: “Keep the channel open”; “Help us make room”; “Then begin with the people waiting.”
- Mara on return: “Supper's getting cold. Saving the world doesn't excuse that.”

### C10 — What We Keep: epilogue and endgame

The player returns to their own door. The chosen companion notices the alley stone now warm without distress. NPC epilogues reference completed personal arcs; unfinished side stories remain available with post-campaign variants.

Neri opens a festival rotation. Kael posts map corrections. Tessa and Elian offer advanced care research. Ironvale makes maintenance logs public. Bellweather residents choose names for new streets. Silas repairs under oversight, sometimes awkwardly welcomed and sometimes refused.

Endgame consists of authored local instability contracts, expeditions into bounded Unwritten spaces, town festivals, collections, pet training, housing, crafting, and optional competition. Maintenance failure changes a contract's local scene and reward, never rolls back campaign completion or deletes possessions. New expansions require new regions and scoped state, not a global reset.

Required closing quest: `mq_c10_homecoming`. Repeatables are `eg_*`, never reused main-quest IDs. Campaign completion is permanent.

## 6. Quest and side-story specification

### Main quest execution rules

Every matrix row in section 8 is an implementation unit with an immutable quest ID. Unless its prerequisite cell states an exception, a row requires the preceding main quest to be completed. “Complete” means objectives validated and reward transaction committed, not merely a dialogue opened.

Each quest MUST define: giver; narrative reason; acceptance dialogue; ordered objective IDs; valid event producers; objective counts; contextual hint; reward manifest; completion dialogue; persistent effects; failure/retry behavior; scene entry/exit; and implementation dependencies. The chapter treatment supplies intent and dialogue anchors; the matrix supplies required objective counts and outcomes. Production dialogue is expanded in versioned content files during the corresponding chapter implementation, not scattered as engine literals.

Main quest status: `unavailable → available → active → ready_to_turn_in → completed`. Explicit server-validated automatic turn-in MAY be used for a cinematic boundary. Failed encounters keep the quest active and retain completed non-encounter objectives. Main quests cannot be permanently failed or abandoned; optional quests may be untracked without losing historical state.

The journal has exactly one default main-story next-action card. It shows a place, person, and plain-language reason: “Ask Edda about the symbol at Riverbend Cottage.” It MUST NOT display raw flags, levels without context, or future revelations. Players may pin one side quest without losing the main card.

**Reward defaults are design targets, not existing balance:** use matrix coin values, existing item IDs where listed, and proposed `story_*` records for new key objects. `H` means a permanent housing entitlement; `E` means a nontradeable story evidence record; `F` means a permanent feature entitlement. E records live in the Chronicle and may have an inventory display proxy; they never occupy sellable consumable stacks. Coin rewards are additive to existing balances.

**Supplied-kit manifests:** care starter kit = 3 `berry`, 1 `soap`, 1 `nap_blanket`; travel kit = 3 `berry`, 1 `nap_blanket`. Tutorial fishing supplies include 1 `driftwood_rod`, 1 `plain_hook`, and an authorized tutorial bait allowance; choose a verified catalog bait ID during D7 integration rather than inventing an ID. Guided uses cannot be sold and replenish only while their quest is active. Egg experiment tools = 1 `warm_pad` and 1 `mist_spray`. The C5 three guaranteed shards are quest-scoped evidence materials, not three arbitrary client-reported adventure drops. New badges, decorations, and key records need catalog/content IDs registered before their matrix row ships.

All reward-bearing rows implicitly depend on D4; all player mutation rows depend on D0. The table lists additional specific dependencies. D2 is not released without its D4 reward integration.

Pet XP is optional supplemental reward and MUST be applied to the pet ID selected when the session began. If that pet becomes unavailable, store the XP claim for an eligible replacement rather than applying it to an arbitrary new active pet. This DDS does not rebalance existing training stats or level tables.

### Objective contracts

| Objective family | Accepted proof | Anti-softlock behavior |
|---|---|---|
| Talk / testify | Server issues and validates a dialogue node receipt at eligible NPC/state | Replay after interruption; NPC available at quest-safe location regardless of routine schedule |
| Inspect / survey | Unique scene/object IDs from eligible interaction | Same object cannot satisfy three distinct landmarks |
| Deliver / craft | Catalog item and recipe validated; consume only explicit ingredients | Provide nontradeable quest supplies; never require selling companion or essential gear |
| Care / support | Existing care action routed through eligible quest/session adapter | Free care kit; any eligible species; provide guided temporary companion if roster unavailable |
| Fish | Validated catch session; deterministic story catch after tutorial | Replace required bait; offer guided assistance after failed attempts |
| Play | Accepted tutorial completion, valid match result, or local solo completion | Completion counts regardless of win; no requirement for another human |
| Repair / route | Validated interaction sequence and reversible simulation result | Resume at last checkpoint; failed experiment costs no irreplaceable resource |
| Rescue / consent | Named resident choice receipts and eligible route completion | No timer can permanently erase an NPC; choices are revisitable before final confirmation |
| Council decision | All contribution receipts and explicit confirmation | Accessible website form mirrors scene dialogue; no hidden lore prerequisite |

### Side-story framework

Each regional side arc has three stages: an ordinary need, a contradiction or personal obstacle, and a resolution that changes a small place. It offers a relationship or decoration payoff beyond coins. One-off errands MAY support it but MUST NOT be the entire arc. Side quests use `sq_<region>_<arc>_<stage>`; repeatable jobs use `job_<region>_<kind>`. Neither is a mandatory main-story gate unless moved explicitly into the matrix.

| Arc / availability | Three-stage objectives | Rewards and persistent consequence |
|---|---|---|
| Whisperwind: Kip's Map / after companion | Find 3 alley landmarks → ask Mira about an erased address → help Kip mark a safe public path | 30 coins; hand-drawn map decoration; `side.whisperwind.kip_map.completed`; Kip's epilogue as chronicler |
| Whisperwind: A Light in the Window / after home | Deliver Mira's meal → hear a new resident's story → place a shared lantern outside with consent | Lantern recipe, 20 coins; `side.whisperwind.welcome_lantern.completed`; homes feel inhabited without requiring social invitations |
| Reed siblings: What We Didn't Say / after Riverbend | Carry Orin's letter → compare two family watch entries → host a conversation at the cottage | Fishing stool decoration, 40 coins; `side.riverbend.reed_reconciliation.completed`; warmer reunion dialogue |
| Sunny Meadows: Seeds for Tomorrow / after survey | Identify 3 seed plots → resolve disputed tool use → establish a mixed garden | Garden planter, 35 coins; `side.sunny_meadows.shared_garden.completed`; experimental plot persists |
| Egg Lab: A Name Before a Number / after basic lab | Observe an egg → let Tessa compare care choices → document a hatch or adopt an already hatched rescue | Pet nameplate, 30 coins; `side.sunny_meadows.egg_ethics.completed`; no rare-species requirement |
| Shadow Woods: Maps With Margins / after scanner | Record 3 changed trails → meet a stranded traveler → return corrected route to Kael | Map wall hanging, 45 coins; `side.shadow_woods.corrected_map.completed`; traveler appears at shelter |
| Ember: The Apprentice's Door / after crafting | Help Pell complete a novel tool → obtain Iona's honest critique → open a workshop display | Tool rack, 50 coins; `side.ember_hollow.pell_workshop.completed`; apprentice stays by choice |
| Tidehaven: A School on Both Shores / after ferry | Deliver books to each history → arrange an untimed game → make a shared class register | Bell decoration, 50 coins; `side.tidehaven.shared_school.completed`; Lio has a present social life |
| Ironvale: The Missing Footnote / after archive | Find 3 censored annotations → interview a maintenance worker → publish corrections | Archive shelf, 55 coins; `side.ironvale.public_records.completed`; Ada changes archive greeting |
| Bellweather: The Clock That Kept Going / after names | Bring Jun a coupling → choose a memorial inscription → install clock in safe settlement | Clock decoration, 60 coins; `side.bellweather.memorial_clock.completed`; no promise of resurrection |
| Silas: Work Without Authority / post-campaign | Inspect damaged Tidehaven pier → accompany Silas on repair → hear residents' responses | Restorer's apron cosmetic, 60 coins; `side.silas.accountability.completed`; acknowledgment without universal absolution |

Optional lines and environmental storytelling must include pre-crisis, crisis, restored, and epilogue variants where relevant. Books and signs have short inspect text plus optional expanded Chronicle entries. Clues reinforce what a main quest reveals; no mandatory truth exists solely in a rare drop description.

Repeatables reward bounded coins, supplies, cosmetics, collection progress, or town reputation. Reputation unlocks optional local stock and decorations, not personhood or main-story permission. A festival game's first valid completion may create a daily participation receipt; repeated losses or collusive matches do not generate unlimited money. Exact daily caps are a balance task and must be stated before a rewarded adapter ships.

## 7. Website shell and navigation

### Shell responsibilities

The persistent shell in `public/index.html` owns authentication/session identity, navigation, profile summary, account coins, active companion summary, chat/social surfaces, notifications, iframe lifetime, return destination, and the next story action. It consumes one server-derived capability projection. It MUST apply the same result to sidebar buttons, home-page cards, profile action buttons, mobile menus, keyboard shortcuts, direct launches, and game-room creation.

There are four distinct presentation states:

- **Hidden:** not in navigation or discovery cards. Used for future chapters/spoilers.
- **Locked teaser:** visible with a plain-language prerequisite and safe link to the current quest. Does not launch activity.
- **Available:** launch allowed after server capability check.
- **Unavailable operationally:** story entitlement earned, but feature disabled or unavailable. Preserve entitlement and offer return/retry; never fabricate a working page.

A discovery can reveal a teaser before access is earned. Owning a cartridge can permit hosting a game after Game Tables is available. Neither can grant access to a locked town or skip story prerequisites.

### Navigation inventory and cadence

“Initially” below means a newly authenticated Story Mode account before completing `mq_c0_welcome`. Guest landing has Login/Register, public introduction, accessibility/settings/help, and MAY offer an explicitly nonpersistent demo. It grants no account rewards.

| Page / existing hook or proposed surface | Initial state | Reveal/access rule | Content and persistence |
|---|---|---|---|
| Home / `navHome` | Available | Always | Current quest, “Continue in Whisperwind,” account summary, last activity receipt; no initial dashboard full of late-game buttons |
| Account, settings, help, logout | Available | Authentication as applicable; never story-gated | Existing profile/auth functions; accessibility and recovery always reachable |
| Social / `navSocial`, Mail/Friends | Available, compact | Login; not a forced tutorial | Existing friends/mail/chat; battle challenge action separately gates on battle eligibility |
| Explore / proposed world hub | Whisperwind entry available on Home | World map teaser at C1 cellar; regional selector available with `exploration` | Wrap existing estate/world activities; proposed `navExplore` is not an existing hook |
| Chronicle / proposed `navChronicle` | Hidden | Available when first quest accepted | Quest log, evidence, discoveries; in-world Chronicle Board mirrors it |
| Inventory / `navInventory` | Hidden until first parcel/supplies | Available at C0 welcome reward | Shared inventory; story records have dedicated view and cannot be sold |
| Marketplace / `navMarket` | Hidden | Teaser during local jobs; available when those jobs finish | Start with local shops; player listing controls and advanced stock unlock separately |
| Neighborhood / `navEstate` | Hidden | Teaser on housing offer; available at C0 home | Whisperwind, owned/available plots and visiting privacy; no globally exclusive starter bottleneck |
| My House / `navHouse` | Hidden | Available only with home entitlement/ownership | Direct return to the player's instance; safe return even if a public plot is released |
| Pet Sanctuary / `navPet` | Hidden | Pet Center teaser during local jobs; available at companion quest | Care, roster, active pet, training introduction; late tabs hidden |
| Fishing / proposed activity shortcut | Hidden | Available after Orin's lesson | Launch eligible fishing scene; collection page tracks shared catches |
| Game Tables / `navPlay` | Hidden | Teaser at Neri invitation; available at C1 play quest acceptance | Tutorial cartridge supplied. Existing host ownership rule retained; guests need not own host's cartridge |
| Egg Lab / Pet Sanctuary subtab | Hidden | Teaser at Sunny Meadows arrival; basic available C2 egg | `egg_lab_basic` → `egg_lab_advanced` C5 → `egg_lab_master` C8 |
| Shadow Woods / `navWorld` | Hidden | Teaser after Missing Field; available when C2 finishes | Preserve `world` game ID; later group shortcut under Explore rather than duplicate contradictory access |
| Pet Battles / `navPetBattle` | Hidden | Teaser during C3 support; available after training/support | Practice and eligible private battles; ranked requires separate entitlement |
| Battle Hall / `navBattleHall` | Hidden | Teaser after support; available after C4 repair | Existing hall as optional social competition; no mandatory PvP |
| Explorer Supply / shop | Hidden | Available with C1 `exploration` | Campaign necessities supplied free; stock expands by region |
| Crafting / proposed workshop tab | Hidden | Teaser at Ember arrival; available C5 craft acceptance | Known recipes and shared resources; housing workshop uses same ledger |
| Water exploration / Explore subtab | Hidden | Teaser at Tidehaven arrival; available C6 ferry | Two district filters; tides do not block essential story appointments |
| Public Archive / Chronicle subtab | Hidden | Available C7 archive | Recorded findings and accessible testimony comparison |
| Council / proposed story board | Hidden | Available C7 hearing acceptance | Delegates, evidence, later C9 Accord preparation; website actions are real progression events |
| Bellweather / region card | Hidden | Teaser at C7 Silas reveal; available C7 completion | Safe hub card updates after rescue |
| World Forge / region card | Hidden | Teaser after Bellweather; available C8 completion | Forge expedition launches from Council or eligible world threshold |
| Maintenance / endgame board | Hidden | Available C9 completion | Authored contracts, festival schedule, post-story discovery |
| Admin / `navAdmin`, top admin controls | Permission-only | Existing roles; never story unlock | Composer, assets, testing controls; no player quest can grant admin |

Late towns do not appear by name on the first map. Show local geography and unlabelled unexplored connections until discovery. A locked region explains its immediate relevant gate without revealing Silas's later betrayal.

**Home versus My House:** Home is always the shell dashboard. My House is owned housing. Labels and icons must distinguish these two destinations.

**Shops:** preserve `snack_shack`, `care_clinic`, `egg_lab`, `training_dojo`, `toy_box`, `explorer_supply`, `curio_market`, `battle_shop`, `game_shop`, `tide_tackle`, and `meadow_tackle`. Existing “starter” shop classification is an implementation default, not a requirement to expose every shop immediately in Story Mode. Supplies essential to an active quest remain accessible even if a normal shop is closed.

**Testing Mode:** existing `data/site_settings.json` uses `mode: "testing"`. Keep modes explicit. Testing may expose content for authorized testing with an obvious banner and fixture profile, but it must not auto-complete production quests or write fixture flags into real accounts. Switching to Story Mode preserves legitimately earned inventory and capabilities. Define an explicit migration for previously ungated accounts; do not infer completed chapters just from high pet level. Admin permissions remain required in either mode.

### Website actions are part of the campaign

The player must use the shell to claim the newcomer home, select an active companion, read the cellar map in the Chronicle, launch Neri's tutorial, compare Tidehaven testimonies, and prepare the Accord at Council. A scene prompt may open the relevant website panel; it must not implement a second reward flow. Each has keyboard/touch access and an equivalent accessible view.

Unlock feedback shows one concise summary: “Sunny Meadows is now on your map. Basic Egg Lab research is available.” The next-action card refreshes without forcing a new activity launch. Returning players see their earned navigation immediately after context loads.

### Launch and return lifecycle

1. Player selects eligible activity from a shell card, map, scene portal, or game table.
2. Shell asks server for capability validation and an activity session. Server binds authenticated account, activity/game ID, eligible scene, campaign version, selected pet where relevant, and allowed objective/reward producers.
3. Shell stores return route, originating scene/spawn or panel, scroll/focus position, and room membership. Local routing state is not canonical story state.
4. Shell mounts the existing iframe and sends a versioned `GAME_CONTEXT` snapshot after the expected child's ready handshake. Restrict origin and verify `event.source` equals the active iframe.
5. Activity performs local simulation. It requests validated state changes through shared APIs; it does not post arbitrary coin amounts or “chapter complete” messages.
6. Server returns a completion receipt and updated state revision. Shell refreshes profile, nav, journal, and relevant collections.
7. Exit returns to originating website panel or safe scene. A post-activity receipt summarizes coins/items/quest progress and offers “Continue story.” Browser Back, iframe close, reconnect, and logout have explicit handling.
8. Incomplete sessions preserve checkpoints as allowed, grant no completion reward, and mark forfeited competitive matches according to game rules. Exiting never silently claims a win.

A town door to the Pet Center opens the same Pet Sanctuary activity/panel available in the sidebar. Fishing from a dock and from the shortcut use the same catch ledger. A table game returns to its table/room; a story tutorial returns to Neri/Chronicle. No child navigates the parent to an arbitrary URL.

Direct URLs, room joins, scene exits, and WebSocket activity messages MUST enforce capabilities on the server, even when hidden UI cannot be clicked. Bookmarks to locked content return a safe shell gate screen and current objective. Offline play MAY retain local cosmetic progress, but account rewards wait for validated server receipts.

## 8. Progression matrix

This matrix is authoritative for main-story dependencies and navigation. **P** denotes a prerequisite quest; comma-separated requirements mean AND. **D** codes refer to section 11's dependency registry. Rewards use existing IDs unless prefixed `story_` or described as a proposed entitlement. The `Flag` column lists milestone keys stored under `profile.story.flags`; every row also records its own quest completion. Feature grants are persistent `F` entries projected to existing unlock views.

| Quest / giver | Required objectives and prerequisites | Website change | Gameplay/system unlock | Reward target | Flag / persistent effect | Coding dependency |
|---|---|---|---|---|---|---|
| `mq_c0_welcome` / Mara | Authenticated account; talk to Mara; accept parcel | Chronicle and Inventory appear | Quest tracking | 10 coins; E newcomer record | `story.whisperwind.arrived` | D0,D1,D2 |
| `mq_c0_local_jobs` / Mira | P welcome; 3 distinct jobs: bread, parcel, board slat | Marketplace opens; Pet Center teaser | Basic local shops | 25 coins; care starter kit | `story.whisperwind.contributed` | D2,D3,D4 |
| `mq_c0_home` / Mara | P local jobs; claim private newcomer entitlement; enter; place 1 free decoration | Neighborhood and My House available | H starter home; basic placement | H; free welcome mat; 15 coins | `story.whisperwind.home_established` | D4,D5 |
| `mq_c0_companion` / Tessa | P home; follow 3 trail clues; touch alley stone; adopt/select; 1 care action | Pet Sanctuary and active pet summary | Care/roster F `pet_care` | Eligible common companion if needed; 15 coins | `story.whisperwind.companion_bonded`; evidence tied to account, not permanent active pet | D2,D3,D6 |
| `mq_c1_river` / Orin | P companion; 1 ordinary guided catch; 1 guaranteed spindle catch | Fishing shortcut/collection appears | F `fishing` | `driftwood_rod`, `plain_hook`, replenishable bait; E `story_anchor_spindle`; 20 coins | `story.whisperwind.spindle_found` | D3,D7 |
| `mq_c1_play` / Neri | P companion; fix 1 table; complete any approved tutorial/valid game; no win needed | Game Tables available on acceptance; Game Shop opens | F `game_tables`; starter host entitlement | `game_tictactoe` if absent; 20 coins | `story.whisperwind.shared_play` | D2,D8 |
| `mq_c1_bell` / Mara | P river AND play; view/review bell event | Home event card; Chronicle clue | Authored personal event | E river map; 10 coins | `story.whisperwind.bell_witnessed` | D2,D3 |
| `mq_c1_cellar` / Mara, Orin | P bell; open cellar; fit spindle; read 1 map | Regional Explore and Sunny Meadows available; Explorer Supply opens | F `exploration`; regional travel | Map entitlement; 25 coins; supplied travel care kit | `story.whisperwind.anchor_awakened`; `region.sunny_meadows.access` | D1,D3,D9 |
| `mq_c2_survey` / Elian | P cellar; 3 landmarks; bridge repair | Egg Lab teaser, meadow tackle stock | Meadow surveys | 30 coins; bridge evidence | `story.sunny_meadows.surveyed` | D3,D9 |
| `mq_c2_egg` / Elian, Tessa | P survey; 2 distinct supplied influences; record readings; no hatch gate | Basic Egg Lab available | F `egg_lab_basic` | Rescued egg if roster capacity allows, otherwise reserved adoption claim; tools; 30 coins | `story.sunny_meadows.resonance_observed` | D6,D10 |
| `mq_c2_missing_field` / Kael | P egg; reveal crossing; inspect Anchor; hear Lyra; limited repair | Shadow Woods teaser becomes available | Forest route; basic preparation | E Lyra warning; lantern entitlement; 35 coins | `story.sunny_meadows.lyra_warning`; `region.shadow_woods.access` | D2,D3,D9 |
| `mq_c3_trails` / Kael | P missing field; equip/check supplies; record 3 distinct trails | Forest submap/camp return | Survey checkpoints | 35 coins; supplies | `story.shadow_woods.trails_recorded` | D3,D9 |
| `mq_c3_support` / Toma | P trails; practice guard/basic support; resolve 1 NPC encounter OR calm-and-guide | Pet Battles available; Battle Hall teaser; Battle Shop opens | F `pet_battle`; practice | Free recovery; 40 coins | `story.shadow_woods.support_trained` | D6,D11 |
| `mq_c3_relics` / Kael | P support; 3 deterministic readings | Chronicle relic collection | Campaign scanner survey mode | Loan scanner entitlement; 2 `ancient_coin`; 35 coins | `story.shadow_woods.route_decoded` | D3,D12 |
| `mq_c3_riverbend` / Edda | P relics; 2 Reed testimonies; authorize cave route | Riverbend shelter and Crystal Cave card available | Shelter; F `shadow_path` through compatible legacy unlock mapping | `shadow_key` if route entitlement absent; 30 coins | `story.riverbend.possibility_explained`; `region.crystal_cave.access` | D2,D9,D12 |
| `mq_c4_silas` / Silas | P riverbend; meet Silas; inspect 3 repair components | Anchor status in Chronicle | Repair preview/rollback | E Silas plan; 30 coins | `story.crystal_cave.silas_met` | D2,D13 |
| `mq_c4_repair` / Silas | P Silas; rehearse isolation; replace conductor; reopen safely | Battle Hall available; Ember route; restored forest cards | Regional repair, safe cave fishing, expanded exploration | 60 coins; repair badge | `story.shadow_woods.anchor_restored`; `region.ember_hollow.access` | D7,D9,D13 |
| `mq_c5_unchanging` / Iona | P repair; 3 residents' observations; test ornament | Crafting teaser | Governor evidence | 40 coins; E rigidity record | `story.ember_hollow.rigidity_identified` | D2,D3 |
| `mq_c5_craft` / Pell | P unchanging; collect 3 guaranteed quest shards; craft 1 coupling | Workshop available on acceptance | F `crafting`; starter recipes | 45 coins; workshop tool entitlement | `story.ember_hollow.coupling_made` | D4,D14 |
| `mq_c5_new_song` / Iona, Elian | P craft; paired egg readings; workshop trial; witness festival | Advanced Egg Lab; Tidehaven access; home workshop | F `egg_lab_advanced`; Ember materials | 70 coins; ornament recipe | `story.ember_hollow.change_permitted`; `region.tidehaven.access` | D10,D13,D14 |
| `mq_c6_two_ledgers` / Sera | P new song; visit both phases; compare 3 places in website Chronicle | Harbor phase filters and testimony view | Authored two-history scenes | 45 coins; E paired ledgers | `story.tidehaven.histories_known` | D2,D15 |
| `mq_c6_ferry` / Sera | P two ledgers; 2 council consent records; complete safe ferry link | Water exploration and Tide Tackle expanded | F `water_exploration` | 50 coins; water route permit | `story.tidehaven.present_links` | D7,D9,D15 |
| `mq_c6_common_square` / Lio, Sera | P ferry; shared school activity OR solo coordination; stop override; link square | Stable twin districts; Ironvale route | Coexistence region state | 80 coins; harbor bell decoration | `story.tidehaven.coexistence_proven`; `region.ironvale.access` | D8,D13,D15 |
| `mq_c7_archive` / Ada | P common square; 3 exhibits; recover full Lyra record | Public Archive; master lab teaser | Evidence comparison | 45 coins; E Closure record | `story.ironvale.closure_exposed` | D2,D16 |
| `mq_c7_ward` / Keeper workers | P archive; secure 3 evacuation links | Public works repair card | Delegated emergency routing | 60 coins; civic service badge | `story.ironvale.ward_secured` | D9,D13 |
| `mq_c7_hearing` / Garrick, Ada | P ward; present Ember and Tide evidence; validate expiry demo; hear Silas | Council available on acceptance; Bellweather revealed/unlocked on completion | Delegate roster; research access | 60 coins; E Bellweather route | `story.ironvale.mandate_contested`; `region.bellweather.access` | D2,D16 |
| `mq_c8_names` / Jun | P hearing; 3 resident testimonies; website rescue register | Bellweather register in Chronicle | Consent-based rescue registry | 50 coins; E resident register | `story.bellweather.residents_heard` | D2,D15,D16 |
| `mq_c8_crossing` / Mara, Edda | P names; secure 3 households by chosen safe option | Bellweather safe hub and home memorial preview | Stable settlement link | 70 coins; community keepsake | `story.bellweather.safe_link` | D9,D13,D15 |
| `mq_c8_silas` / Silas, Jun | P crossing; confront restoration cost; receive token; open relief | World Forge access; master lab available | F `egg_lab_master`; Forge permit | 60 coins; E authority token held for Accord | `story.bellweather.silas_relief`; `region.world_forge.access` | D2,D10,D17 |
| `mq_c9_contributions` / Council | P Silas; verify Whisperwind, Ember, Tidehaven, Ironvale, Bellweather milestones; confirm fallback in website | Forge launch CTA at Council | Validated final expedition session | E Accord draft; 50 coins | `story.world_forge.accord_prepared` | D1,D16,D17 |
| `mq_c9_junctions` / delegates | P contributions; 3 distinct junction challenges; combat OR redirection; assist allowed | Expedition resume/return summary | Network routing validation | 75 coins; E junction receipt | `story.world_forge.junctions_secured` | D11,D13,D17 |
| `mq_c9_accord` / player, Silas | P junctions; validate contributions; confirm Living Accord | Maintenance board; all earned safe region travel | F `endgame_maintenance`; permanent campaign completion | 150 coins; Accord badge; home memorial | `story.world_forge.living_accord`; `campaign.completed` | D4,D16,D17,D18 |
| `mq_c10_homecoming` / Mara | P Accord; return home; choose remembrance; view town epilogue | Festival cards and optional completion checklist | Epilogue variants; repeatable jobs | 25 coins; remembrance cosmetic | `story.whisperwind.homecoming` | D3,D5,D18 |

### Gate composition and exceptions

Main story is account-scoped and sequential as above, except river and play can run in either order. No pet level is a main-story gate. Existing level-gated exploration pools (`meadow`, `tidepools`, `embercave`, `shadowwoods`, `fossilridge`) remain separate optional activity tiers. Story Mode eligibility for one of those activities is **region access AND its existing level/energy requirements**; guided quest sequences bypass the optional grind through their own authorized sessions, not by falsely leveling the pet.

Existing early Tide Pools and Ember Cave pools can represent local training excursions, not full Tidehaven/Ember Hollow campaign access. Existing `ADVENTURE_ZONES.ember_hollow` and `shadow_woods` represent region-themed adventures and need explicit Story Mode gates when integrated. Never equate `embercave` with `ember_hollow` or `shadowwoods` with `shadow_woods` without a declared alias.

Permanent unlocks cannot be lost when a key/cartridge is consumed unless the existing game's explicitly documented ownership policy requires continued cartridge possession. Story feature entitlements are permanent; item host rights currently derive from inventory and need a deliberate compatibility decision before changing that behavior. A `gameforge_master_key` permits game hosting in testing; it never grants story flags, town access, admin rights, or main-quest completion.

Ranked battles and `advanced_market` are optional after basic access. Existing `battle_pass` and `market_license` effects stay useful but cannot bypass prerequisite safety/tutorial gates. Existing `egg_lab_pass` can satisfy a tool entitlement for a migrated owner; the account still completes the story experiment for its narrative milestone. Do not take legitimately purchased tools away.

## 9. Shared state and activity integration

### Existing storage versus target architecture

The server already exposes shared state through `GET /api/world/context`, `GET /api/pet/profile`, market APIs, estate APIs, and battle views. World context currently projects `profile.money` as coins, inventory quantities, pet roster/active pet, estate-owned homes, and `profile.world.flags/chests`. Extend this authority instead of making a new standalone save system.

The target model adds versioned campaign state and derives presentation capabilities. It is a logical ownership model; the first implementation may remain in current JSON storage with serialized writes and durable receipts. Reliable multi-record transactions and deployment concurrency MUST be resolved before shipping cross-profile rewards; this DDS does not claim current file writes provide database transaction semantics.

| Domain | Canonical owner | Read consumers | Permitted mutation |
|---|---|---|---|
| Account identity/roles | Existing account store; authenticated server context | Shell and safe activity snapshots | Account/profile services; never client-provided username as authority |
| Coins | Existing pet profile `money` | Shell, market, world, reward summaries | Shared validated debit/credit service and receipt |
| Inventory | Existing pet profile `inventory[itemId]` | Inventory, shops, recipes, games, scenes | Catalog-checked quantity operations; no activity-local balance |
| Player activity stats | Proposed account stats namespace | Profile, achievements, journal | Validated activity receipts; distinct from pet battle stats |
| Pets and active pet | Existing roster and `activePetId` | Sanctuary, battles, world HUD | Existing care/training/selection handlers with authorization and capability adapter |
| Housing | Estate records plus proposed guaranteed private-home entitlement | Shell, neighborhood, world | Ownership/privacy/placement handlers; ownership rechecked at entry |
| Campaign/quests | Proposed `profile.story` | Shell journal, NPCs, gates | Progression director only |
| Local world state | Existing `profile.world.flags/chests`, extended projection | Scenes and collections | Authored world interactions and progression effect transactions |
| Public scene presence | Existing world WebSocket rooms | Other players in same allowed scene | Validated join/move/leave; does not mutate campaign |
| Collections/discoveries | Proposed account discoveries with existing fish records adapted | Chronicle and collection panels | Unique eligible discovery/catch receipts |
| Unlock compatibility | Existing `profile.unlocks` plus derived capabilities | Shops, launcher, activities | Single resolver maps persisted entitlements/legacy item effects; no divergent client decisions |

### Target state sketch (proposed)

```json
{
  "story": {
    "schemaVersion": 1,
    "campaignId": "the_world_remembers",
    "contentVersion": "1.0",
    "revision": 42,
    "currentChapter": "c3",
    "flags": {
      "story.whisperwind.anchor_awakened": true,
      "region.shadow_woods.access": true
    },
    "quests": {
      "mq_c3_relics": {
        "status": "active",
        "objectives": {"read_marker_a": 1, "read_marker_b": 0, "read_marker_c": 0}
      }
    },
    "choices": {},
    "evidence": ["story_anchor_spindle", "story_lyra_warning"],
    "featureEntitlements": ["exploration", "fishing", "pet_care", "pet_battle"],
    "checkpoint": {"sceneId": "shadow_woods_river_bend", "spawnId": "safe_pier"}
  }
}
```

This is an extension sketch, not a replacement payload for existing API consumers. Existing `world.flags` keys and chest keys remain valid. `currentChapter` is a cached projection derived from completed main quests; it cannot independently authorize unlocks. Dotted flag keys are literal strings, not implicit nested objects.

**Session boundary:** an activity session has server-generated ID, account ID, activity/game ID, start revision, eligible objectives, pet snapshot where needed, expiry, status, and trusted reward policy. Client reports actions/results, not an unrestricted reward manifest. Reward receipts have immutable IDs and item/coin/stat deltas, producing session/event, and committed revision.

### APIs and message contracts

Existing routes are integration anchors, not proof of complete security or validation:

- `GET /api/world/context` and `POST /api/world/open-chest`: retain compatibility and add capability checks/revision/receipt support.
- `GET /api/pet/profile`, care/train/set-active routes: use the same roster; connect eligible actions to objectives through the director.
- `POST /api/pet/fish/catch`, fish sell/catalog: validate catch sessions and update existing shared fish/inventory records.
- `POST /api/pet/adventure/complete`, explore-zone: replace trust in arbitrary completion payloads with eligible sessions and validated proof.
- Estate claim/entry/placement: bind actor to authenticated identity; preserve neighborhood/plot IDs.
- Existing `GAME_CONTEXT` bridge: version and constrain it; never treat incoming identity or flags as authoritative.

**Proposed endpoints**, to implement only under roadmap tasks:
- `GET /api/story/context`: safe campaign snapshot, next action, evidence, and server-derived capabilities.
- `POST /api/story/quests/:id/accept`: validates availability; returns revision.
- `POST /api/story/interactions`: accepts session ID, interaction/node ID, event ID, expected revision; validates eligible producer and state.
- `POST /api/story/quests/:id/turn-in`: validates all objectives; returns one receipt and new revision.
- `POST /api/activities/start`: validates capability and creates authorized activity session.
- `POST /api/activities/:id/complete`: validates proof; produces capped reward/objective receipt.
- `POST /api/activities/:id/exit`: checkpoint/forfeit/return outcome with no implicit completion.

Names are proposed; an engineer may integrate with existing endpoints if contracts and one authority are preserved. Record deviations in the DDS and audit.

Proposed bridge messages: `GF_ACTIVITY_READY`, versioned `GAME_CONTEXT`, `GF_CONTEXT_UPDATED`, `GF_ACTIVITY_EXIT_REQUEST`, `GF_ACTIVITY_RECEIPT`. Include `protocolVersion`, `activitySessionId`, `requestId`, and `stateRevision`. A bridge completion notification merely tells the shell to fetch a server receipt. Verify exact origins and iframe/window source; avoid the current wildcard delivery pattern for privileged messages. Child requests for shell panels use allowlisted route IDs.

### Atomicity, recovery, and multiplayer

Rewards, objective completion, item consumption, feature grants, chest markers, and revision changes MUST commit atomically in the chosen persistence model. Repeat the same event/receipt key on retries. Duplicate and concurrent claims return the original result, not new rewards. Conflicting expected revisions return fresh context and safe retry guidance. A balance cannot become negative or exceed configured bounds.

Serialize account writes in the current single-process JSON prototype; durable journaling/transactional storage is required for crash recovery and multiple workers. Avoid an in-memory-only “already rewarded” set. Housing ownership is cross-account: ensure plot reservation and account entitlement cannot disagree after a crash. Migration and backups precede persistence schema changes.

Disconnect after server commit but before UI receipt must be recoverable by fetching the session/receipt. Reopening a game must not recreate its reward opportunity. Client localStorage keeps preferences, scene drafts, and navigation hints only; it cannot authorize accounts or persist canonical progression.

Personal repaired world variants may share public safe areas with players at other chapters. Presence sends cosmetic/public appearance, not private flags. Story NPCs/dialogue and gated passages are personalized overlays. If a phase requires isolation, include an allowed instance/phase key in the room ID and validate joins. A player's spoiler-heavy variant must not be imposed on newcomers.

Trade does not transfer campaign state. Selling ordinary `shadow_key`, scanner boosts, or coins does not remove earned narrative records. Required evidence never becomes a market listing. Active pet changes do not undo bonding or support milestones; unavailable companions get a loan/rescue path. Full rosters receive a reserved egg/adoption entitlement, not a forced sale.

## 10. Coding conventions and content contracts

### Stable identifiers

Use lowercase snake case for content IDs: `mq_c6_common_square`, `npc_sera_quill`, `story_anchor_spindle`. Keep existing catalog/game/scene/plot IDs unchanged. Dotted literal keys identify persisted milestones: `story.<region>.<milestone>`, `region.<region>.access`, `side.<region>.<arc>.completed`, `campaign.completed`.

New keys require a registry entry containing type, default, scope, writers, readers, migration, and removal policy. Main milestones default false and are monotonic. Transient quest counters, session status, tide phase, and presentation states are not monotonic flags. Choices use enums under `story.choices`; never scatter many contradictory booleans.

Chapter IDs `c0`–`c10` and quest IDs in the matrix are stable. Completing a chapter means completing its final main quest. There is no separate client-written chapter counter. Hidden/locked/available capabilities are computed from persisted facts and deployment availability.

**Feature keys:** preserve `exploration`, `pet_battle`, `egg_lab_basic`, `egg_lab_advanced`, `egg_lab_master`, `ranked_pet_battle`, `advanced_market`, and compatible `shadow_path` zone unlocks. New keys `pet_care`, `fishing`, `game_tables`, `crafting`, `water_exploration`, and `endgame_maintenance` need explicit resolver mappings. Existing unlock targets may be arrays (`feature`, `shop_unlock`, `zone`); do not silently replace them with a boolean map.

### Proposed quest content example

```json
{
  "id": "mq_c3_relics",
  "chapterId": "c3",
  "giverId": "npc_kael_rowan",
  "requires": {"allQuests": ["mq_c3_support"]},
  "objectives": [
    {"id": "read_marker_a", "kind": "survey", "targetId": "relic_marker_a", "count": 1},
    {"id": "read_marker_b", "kind": "survey", "targetId": "relic_marker_b", "count": 1},
    {"id": "read_marker_c", "kind": "survey", "targetId": "relic_marker_c", "count": 1}
  ],
  "rewards": {"coins": 35, "items": [{"itemId": "ancient_coin", "quantity": 2}]},
  "effects": {"setFlags": {"story.shadow_woods.route_decoded": true}},
  "retryPolicy": "keep_completed_observations",
  "repeatable": false
}
```

Reward definitions are trusted server content, never accepted from the client. A scanner loan entitlement and deterministic targets require integration code; this example does not pretend the existing `relic_scanner` consumable already does that.

### Scenes, NPCs, and dialogue

Add conditional interactions as declarative data around the existing shared world engine. Proposed fields include `visibleWhen`, `enabledWhen`, `dialogueId`, `questId`, `onValidatedInteraction`, and `variantId`; these fields must be implemented and validated before content assumes they work. Preserve collision, layers, objects, and existing hotspot IDs.

Each dialogue node has stable ID, speaker ID, text, conditions, choices, and server-approved effects. Effect lists contain identifiers of trusted operations; no arbitrary JavaScript or raw rewards. The priority order is active main quest → ready side quest → region crisis/restored variant → ambient line. Completed main quests should not repeat reward-bearing nodes.

Schedules are atmosphere, not required engine work for C0. Essential NPCs have quest-safe appointment variants. “After closing” and “night” in prose trigger an authored vignette; no real-time wait is required.

Production script rules:
- Write short spoken lines with optional expanded lore; characters do not narrate API behavior.
- Every locked door offers an in-world reason and a journal hint.
- Every major reveal has a recap accessible after reload.
- Every choice includes a neutral/practical option. Empathetic dialogue is not a hidden optimal stat build.
- Pets react through animations and brief flavor; do not give every species human speech.
- Use existing inspect spots, chests, signs, and letters for clues. Rewrite “Later this can…” prose into fiction when that specific content is implemented.
- Carry consequences into at least one return visit and epilogue.

### Migration and audit trail

Additive schema migration initializes missing story state without resetting pets, money, inventory, homes, fish records, or chest receipts. A previously established home can satisfy the home ownership objective, but not falsely prove all local jobs. Existing companion owners can select and care for a pet; no forced duplicate adoption.

Record a migration's input version, output version, migrated keys, and durable completion. Unknown legacy keys survive. Existing `world.flags` and `profile.unlocks` continue to project while new story authority comes online. Alias rules are explicit and reversible where possible.

Maintain a status ledger per dependency/quest: planned, foundation implemented, integrated, validated, released. “Code exists” is not “story integrated.” Every status change references a commit and acceptance evidence. This initial DDS intentionally leaves new campaign rows planned.

## 11. AI implementation rules and roadmap

### Rules for every future implementation agent

1. Read this DDS, the audit, relevant local instructions, and current code before editing. Identify the exact matrix row and D dependencies being implemented.
2. Select the earliest incomplete prerequisite that blocks a playable next story beat. Do not jump to a new town because its concept is attractive.
3. State observed baseline separately from proposed behavior. Re-audit changed source paths; do not treat this baseline as permanently current.
4. Extend shared server services, existing shell, and reusable world/scene engine. Do not create one-off housing/fishing economies or a separate story profile in each game.
5. Implement server authorization and capability checks before relying on hidden buttons. Validate all reward-producing paths, including room/WebSocket/direct URL routes.
6. Make one complete slice: story objective → shell affordance → activity → validated mutation → return summary → persisted reload. Avoid shipping a disconnected scene without its gate.
7. Preserve approved canon and useful existing IDs/assets. New arcs may expand the world, but must not make the player chosen by bloodline, make Silas the original shutdown cause, or turn the ending into unilateral erasure.
8. Do not rename/remove existing pet species, personal custom pets, items, plots, or games merely because their text looks experimental. Improve presentation with documented compatibility.
9. Do not grant progress using purchased keys, client flags, pet level, or admin testing state as a substitute for verified story objectives.
10. Main story must work solo with deterministic required items, full rosters, changed active pets, occupied plots, closed shops, and assisted challenge paths.
11. Avoid changing game rules just to tie an activity to the plot. Table games keep their own mechanics and feed shared validated results.
12. Write meaningful acceptance checks at integration boundaries; verify duplicate claims, reload, return navigation, and hidden-link bypass. Do not create tests that merely duplicate dialogue text.
13. Update the DDS/version/change log if behavior or canon changes; update the implementation status ledger with commit evidence. Never mark a planned system shipped because a document describes it.
14. Keep unrelated gameplay changes out of a narrative/doc task. Future implementation commits must have a bounded matrix scope.
15. Admin/editor privileges are operational permissions, never story rewards. Testing fixtures cannot contaminate production campaign state.
16. When an unavailable planned feature blocks a later chapter, do not silently route players to a placeholder or substitute an unrelated existing game. Build the dependency or clearly keep the chapter unreleased.

### Dependency registry

| Code | Work and existing anchors | Acceptance boundary |
|---|---|---|
| D0 | Re-audit account/session identity, mutation authorization, JSON persistence, deployment workers in `server.js` | Authenticated actor cannot act as another user; write/recovery plan documented |
| D1 | Shared capability resolver/context revision; `publicWorldContext`, site settings, shell nav | Same entitlement result across desktop/mobile/cards/direct requests |
| D2 | Campaign director, quest/dialogue event validation, Chronicle | Deterministic objectives; turn-in replay returns same receipt |
| D3 | Conditional scene/NPC/inspect interactions; `world_engine.js`, scene JSON | Eligible variant and quest event after reload; existing scenes still load |
| D4 | Shared reward/consumption ledger, durable receipts, serialized/transactional writes | Concurrent claim and crash recovery produce one effect |
| D5 | Guaranteed private starter entitlement, estate adapter, basic valid decoration placement | Occupied public plots cannot block home; privacy checked |
| D6 | Care/roster/active pet adapter; `petworld.html`, existing server handlers | Existing pet or guided rescue works; full roster safe |
| D7 | Fishing sessions, deterministic tutorial catch, existing fish ledger | No arbitrary client fish/reward grant; retry/reconnect safe |
| D8 | Game Tables tutorial, cartridge compatibility, activity adapters; launcher/server/game registry | Host ownership preserved; guests allowed; solo tutorial; bounded receipts |
| D9 | Regional access/return routes, scene registry reconciliation, safe checkpoints | Unauthorized joins/scene exits denied; unlocked return always available |
| D10 | Lab tier resolver and ethical research objectives; shops/items/egg care | Legacy pass compatibility; no rare hatch gate; each tier enforced |
| D11 | NPC practice/assisted encounters and pet battle snapshot integration | No forced PvP; free recovery; selected pet/receipt consistent |
| D12 | Deterministic scanner surveys, key route mapping, discoveries | Existing item effects preserved; three unique readings; keys cannot skip story |
| D13 | Reversible repair sequences and regional variant projection | Failed repair safe; success changes scene and shell exactly once |
| D14 | Craft recipes/quest supplies and workshop/housing adapter | Ingredient consume and result atomic; required materials guaranteed |
| D15 | Tidehaven/Bellweather phase instances, consent records | No inventory duplication, cross-player spoiler leakage, or erased main NPC |
| D16 | Archive/evidence comparison, Council and delegate contribution interface | Accessible website choices mutate same canonical quest state |
| D17 | Final expedition/contribution validator and Living Accord commit | All contributions required; session resume; completion permanent |
| D18 | Epilogue variants, bounded maintenance contracts and festivals | No campaign rollback; repeatable receipt limits; side quests remain available |

### Prioritized development order

**P0 — trustworthy shared host, before new campaign content.** Complete D0 and D4's persistence/receipt design, D1's capability resolver, then D2's minimal director. Audit `requireUser` behavior rather than assuming it is secure because of its name; estate mutation currently accepts a body username directly. Reconcile duplicate launch surfaces and testing behavior. Outcome: one authenticated account, one reward authority, one consistent shell gate result.

**P1 — C0 playable vertical slice.** D3/D5/D6 integrate existing Whisperwind hub, Driftwood, PetWorld, and starter-home assets. Build welcome, three jobs, home, companion, journal, return flow. Reuse Mira/Toma/Kip/Dockmaster; add Mara/Tessa through aliases/scene placements rather than overwriting existing identities. Outcome: a new account can belong in Whisperwind, close the browser, and resume with the right navigation. This is the first production story milestone.

**P2 — C1 mystery and everyday play.** D7/D8/D9 integrate Orin's catch, Neri's tutorial, bell, cellar, map. Create a validated reward adapter for one game first; catalog visibility does not mean every legacy game is ready for rewarded production play. Other games may remain available as unrewarded activities until individually validated. Outcome: first region unlock emerges from both ordinary life and discovery.

**P3 — C2/C3 research and forest.** D10/D11/D12 add basic lab, Missing Field, trails, support alternative, scanner readings, Edda, cave gate. Reconcile scene files absent from the active world registry before enabling navigation. Outcome: all main progress works without waiting for rare pets or multiplayer opponents.

**P4 — C4/C5 regional consequences.** D13/D14 build Silas's reversible repair, restored forest, Ember governor/crafting/festival, advanced lab. Outcome: repair changes an entire region, crafting uses shared materials, and new stock/nav persist after reload.

**P5 — C6/C7 civic conflict.** D15/D16 build two-history districts, testimony comparison, ferry/common square, Ironvale archive/ward/hearing, Council. Outcome: personal phases coexist with multiplayer safely; website actions genuinely progress story.

**P6 — C8/C9 resolution.** D17 integrates Bellweather consent rescue, Silas's relief decision, contributions, final expedition, Living Accord. Reuse prior interaction families instead of inventing a new engine for the finale. Outcome: ending transaction is durable, solo accessible, and not repeatably farmable.

**P7 — C10 and sustained life.** D18 adds epilogues, side-arc completion variants, maintenance, festivals, optional ranked/advanced commerce polish. Outcome: completion preserves the account and creates ongoing activities with bounded rewards.

**Parallel content work without dependency bypass:** authors/artists may prepare future dialogue, landmarks, and scene layouts while foundations are built. Do not expose them as active production quests until dependencies are integrated. There is no requirement to rebuild the whole editor before C0. Use the current Composer and curated assets unless an acceptance blocker proves editor work necessary.

### What should an AI code next?

At this audited baseline, **the next task is P0's shared identity/capability/reward foundation**, followed immediately by the C0 slice. The repo already has many activity implementations; the missing organizing authority is not solved by adding another minigame.

For later sessions:
1. Read current status and verify evidence in code.
2. Find the earliest unvalidated matrix row reachable from the last validated row.
3. Expand its unresolved D dependencies into small tasks.
4. Choose the first task that produces a reviewable end-to-end behavior.
5. Record acceptance evidence and update status; then move forward.

Suggested first implementation task: “Add versioned account campaign state and a server capability projection consumed by every shell launch surface; preserve existing profile data and Testing Mode; validate unauthorized account access, duplicate reward behavior, and initial Story Mode navigation.” Do not implement all towns in that task.

## 12. Acceptance, maintenance, and unresolved decisions

### Campaign acceptance scenarios

- Fresh Story Mode account sees only initial surfaces; finishes C0 and reloads with home, pet, inventory, shops, and Chronicle available.
- A deep link or WebSocket request to Shadow Woods before C2 is denied with a safe return and current quest hint.
- Existing account with pets, keys, coins, chest claims, and a home migrates without losing them or automatically claiming the full campaign.
- Two simultaneous turn-ins, or a disconnect after commit, yield one reward receipt.
- Public newcomer plots are occupied; player still establishes a persistent home.
- Companion is changed, roster is full, bait spent, shop closed, or a key sold; main story remains completable.
- Game tutorial progresses with solo/local alternative and without winning. Valid table guests need not own the cartridge.
- An activity result changes shared inventory/profile; shell refreshes after exit; reopening does not reset or duplicate rewards.
- Tidehaven phases preserve one inventory and do not reveal advanced NPC states to a newcomer sharing presence.
- Main quest choices and assisted encounters yield the same required milestone while recording their specific choice/approach.
- Each regional repair changes authored scenery/dialogue and corresponding shell navigation.
- C9 requires all community contributions; completion remains true through failed maintenance and future patches.
- Admin controls remain role-gated even with every story feature unlocked.
- Keyboard/touch users can perform website testimony, home, journal, and Council tasks without canvas-only interactions.

### Living document workflow

Update this file when changing narrative authority, quest order, unlock timing, state semantics, or roadmap dependencies. Record version/date/change/reason; maintain backward mappings for shipped IDs. Add a linked implementation ledger under `docs/design/` when the first gameplay task begins. Every released chapter must include a traceability entry from matrix row to content, server handler, shell surface, tests/manual evidence, and commit.

Design precedence: explicit project-owner direction → this living narrative DDS → audited technical constraints and asset policy → historical drop-in notes → placeholder text. Technical constraints cannot silently rewrite canon; record the adaptation. Existing code is evidence of behavior, not automatic evidence of intended progression.

### Decisions intentionally deferred without blocking the documentation

| Decision | Safe default / current requirement | When to resolve |
|---|---|---|
| Exact campaign hours and economy pacing | Matrix coin targets are provisional; no required grind | Before C1 production balancing |
| Transactional database versus durable JSON journal | Preserve shared schema; fulfill atomicity/recovery contract | P0, before multi-worker rewarded release |
| Public plot scaling | Guaranteed private starter home plus optional public address | D5 implementation |
| Table cartridge disposal policy | Preserve current inventory-based host eligibility; story entitlements permanent | D8 compatibility task |
| Ranked ratings/reward caps | Optional; no story gate; validated server outcomes | Before rewarded ranked adapter |
| Final bespoke NPC/building art | Reuse curated packs and existing landmarks; avoid prototype graphics as final replacements | Per-region art pass |
| Full line-by-line production dialogue | Chapter treatments/anchors and objective contracts are authoritative; script each slice with all variants | Before releasing each chapter |
| Future expansion geography | Endgame stable; add scoped regions/quests without resetting completion | Separate expansion design |

### Change log

Town design expansion, 2026-09-28: added Whisperwind settlement history, named district purposes, story-led elevation, exploration direction and planned playground atmosphere in section 4. Owner prioritized beautiful town exploration. Existing chapter order and quest contracts are unchanged.

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-28 | Initial comprehensive campaign, world/cast bible, website unlock model, 33-quest progression matrix, shared-state contracts, audit, and staged AI roadmap |

### Implementation status at publication

All new main campaign quests, new Chronicle/Council pages, capability director, and new transactional receipt contracts are **planned**. Existing world, pet, inventory, marketplace, housing, table-game, and administrative infrastructure is **observed in source**, with integration gaps detailed in the audit. No gameplay implementation, production mode switch, balance edit, or save migration is included in this documentation commit.


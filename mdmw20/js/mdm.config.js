/**
 * @file mdm.config.js
 * @author Stefan Wilhelm (cerbero s@atwillys.de)
 * @license CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)
 */
;(function() { util.global("mdm-config",{}).system = {

  attributes: {
    lp:  "5*K+2*M+C",
    rlp: "2*KR",
    mp:  "5*G+2*XP+2*I",
    rmp: "2*MA+XP",
    ap:  "(K+M+C)/2",
    rf: "RE+IN",
    mr: "(2*G+2*I+C+B)/3",
    mu: "(K+G+C)/2",
    ns: "(GW+KR)/2",
    nm: "(GW+IN)/2",
    nl: "(GW+GS)/2",
    nw: "(GW+KR+IN)/3",
    ff: "(WA+IN)/2",
    pa: "(GW+RE)/2"
  },

  progression: {

    // Amount of XP when the character is created, affects initial PM, ES and skill points due to `numEsPerXP`, `numPmPerXP` and `numSkillsPerXP`.
    initialExperience: 0,

    // Amount of specific free points to progress for PM, ES and skills.
    initialXp: { pm: 12, es: 24, skills: 12 },

    // Amount of specific free points given to the character when XP is increased by 1.
    numPmPerXP: 2,
    numEsPerXP: 4,
    numSkillsPerXP: 2,

    // Nominal value how many XP are given to the character per game evening / "leveling step", campaign chapter or the like.
    defaultXPperLevel: 2,

    // Override progression XP cost tables:
    // Progression XP tables define how many XP points (different for PM/ES/skills)
    // are needed to increase the PM/ES/skill from N-1 to N.
    //  - The first value in the table must be 0.
    //  - The length if the table defines the maximum achievable value for PMs, ES and skills.
    xptables: {
      pm: [ 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 8, 10 ],
      es: [ 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 8, 10 ],
      skills: [ 0, 1, 1, 2, 3, 4 ]
    },

    // Minimum, maximum, and standard values for race offsets (PM, ES, and AT).
    // Race offsets are relative (e.g. +2 or -1) to the std value.
    raceoffsets: {
      pm: { min: 2, max: 6,  std: 0 },
      es: { min: 2, max: 6,  std: 0 },
      at: { min: 0, max: 25, std: { lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0 } }
    }
  },

  races: {
    // Race definitions. Use lowercase ASCII, English, and "-" separated words. Translation is in an extra config.
    "human-midland" : {
      // Everything std
      k:3, c:4, i:4, g:3, b:3, m:3,
      kr:4, gw:3, gs:3, re:3, wa:3, in:3, ma:3, ke:4, wi:4, mn:3, wk:4, au:4,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "human-northland" : {
      k:5, c:5, i:2, g:2, b:3, m:3,
      kr:6, gw:3, gs:3, re:2, wa:3, in:3, ma:2, ke:3, wi:2, mn:3, wk:5, au:5,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "human-southland" : {
      k:3, c:3, i:4, g:3, b:3, m:4,
      kr:3, gw:4, gs:4, re:4, wa:3, in:3, ma:3, ke:3, wi:3, mn:4, wk:3, au:3,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "human-westland" : {
      k:3, c:3, i:3, g:5, b:3, m:3,
      kr:3, gw:3, gs:3, re:3, wa:3, in:3, ma:5, ke:3, wi:4, mn:3, wk:4, au:3,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "human-desert" : {
      k:2, c:4, i:3, g:3, b:4, m:4,
      kr:2, gw:4, gs:3, re:4, wa:5, in:4, ma:3, ke:3, wi:2, mn:3, wk:5, au:2,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "elf-forest": {
      k:3, c:4, i:2, g:2, b:5, m:4,
      kr:3, gw:4, gs:3, re:3, wa:4, in:4, ma:2, ke:3, wi:4, mn:2, wk:5, au:3,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "elf-ice": {
      k:3, c:4, i:3, g:3, b:3, m:4,
      kr:3, gw:4, gs:3, re:5, wa:3, in:3, ma:3, ke:3, wi:3, mn:2, wk:5, au:3,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "elf-wind": {
      k:3, c:3, i:3, g:5, b:3, m:3,
      kr:3, gw:3, gs:3, re:3, wa:3, in:3, ma:5, ke:3, wi:5, mn:3, wk:3, au:3,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "dwarf-hill" : {
      k:4, c:3, i:4, g:3, b:3, m:3,
      kr:4, gw:3, gs:4, re:3, wa:4, in:3, ma:2, ke:4, wi:3, mn:4, wk:3, au:3,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "dwarf-gray" : {
      k:5, c:5, i:3, g:2, b:3, m:2,
      kr:6, gw:3, gs:3, re:2, wa:3, in:2, ma:2, ke:3, wi:4, mn:3, wk:5, au:4,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "dwarf-red" : {
      k:4, c:3, i:4, g:4, b:2, m:3,
      kr:4, gw:2, gs:3, re:3, wa:2, in:2, ma:6, ke:4, wi:5, mn:2, wk:4, au:3,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "halfling" : {
      k:3, c:3, i:3, g:3, b:3, m:5,
      kr:2, gw:3, gs:5, re:4, wa:3, in:3, ma:3, ke:4, wi:3, mn:4, wk:3, au:3,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "half-elf" : {
      k:3, c:4, i:3, g:3, b:4, m:3,
      kr:3, gw:3, gs:3, re:3, wa:4, in:4, ma:3, ke:4, wi:3, mn:3, wk:4, au:3,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "half-goblin" : {
      k:2, c:2, i:3, g:4, b:4, m:5,
      kr:2, gw:4, gs:5, re:5, wa:4, in:4, ma:3, ke:4, wi:3, mn:2, wk:2, au:2,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    },
    "half-orc" : {
      k:5, c:4, i:2, g:2, b:4, m:3,
      kr:6, gw:3, gs:3, re:4, wa:3, in:4, ma:2, ke:2, wi:2, mn:2, wk:5, au:4,
      lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    }
    // ,"half-ogre" : {
    //   k:7, c:5, i:2, g:2, b:2, m:2,
    //   kr:7, gw:3, gs:2, re:3, wa:3, in:3, ma:2, ke:2, wi:2, mn:2, wk:6, au:5,
    //   lp:0, rlp:0, mp:0, rmp:0, ap:0, rf:0, mr:0, mu:0, ns:0, ff:0, nm:0, nl:0, nw:0, pa:0
    // }
  },

  skills: {
    // Skill definitions. Use lowercase ASCII, English, and "-" separated words. Translation is in an extra config.
    // "melee-heavy": {
    //   refs: "KR GW",
    //   desc: "You fight better with heavy melee weapons.",
    //   cat: ["skill-weapon", "skill-weapon-melee"],
    //   modifies: { ns: "+fk" }
    // },
  },

  spells: {
  },

  tabellarium: [
    {
      table: "skills",
      prefix: "skill",
      page_header: [ "Fertigkeiten" ],
      head_keys: ["key", "cat"],
      data_keys: ["refs", "modifies"],
    },
    {
      table: "armors",
      prefix: "armor",
      page_header: [ "Rüstungen" ],
      data_keys: ["head", "arms", "torso", "legs", "shield", "effects", "modifies"]
    },
    {
      table: "tactics",
      prefix: "tactic",
      page_header: [ "Kampftechniken" ],
      data_keys: ["weapons", "condition", "effect", "ap"]
    },
    {
      table: "weapons",
      prefix: "weapon",
      page_header: [ "Waffen" ],
      data_keys: ["at","effects","modifies"]
    },
    {
      table: "spells",
      prefix: "spell",
      page_header: [ "Zaubersprüche" ],
      section_prefix: "Zauber - ",
      head_keys: ["cat", "level"],
      data_keys: [ "check", "casttime", "cost", "range", "duration", "damage"],
    },
    {
      table: "playable-races",
      prefix: "race",
      page_header: [ "Spielbare Rassen" ],
      head_keys: [],
      data_keys: [ "pm", "es", "at", "fk"],
    },
    {
      table: "herbarium",
      prefix: "herb",
      page_header: [ "Herbarium" ]
    },
    {
      table: "bestiary",
      prefix: "bestiary",
      page_header: [ "Bestiarium" ],
      head_keys: ["cat", "level"],
      data_keys: ["presence","capabilities","attributes","attack","attack1","attack2","attack3","attack4"]
    },
  ],

  localizations: { "de": {
    translations: {
      // Translations for races,skills,spells,weapons,objects.
      // Format: "key": [ "skill name", "skill description" ]
    },
    "skillmatching": {
      // Language specific synonym replacements.
      // Format "key-standard": [ "synonym1", "synonym2", ... ]
      // The key is recognized if the lowercase /[a-z0-9]/ subset matches one of the values.
      //"rites": ["Bräuche", "Religion", "Riten"],
      //"humanities": ["Provozieren", "Einschätzen"],
      //"entertainment": ["Schauspielen", "Gaukeln", "Musizieren", "Tanzen", "Rhetorik"],
    }
  }}

}})();

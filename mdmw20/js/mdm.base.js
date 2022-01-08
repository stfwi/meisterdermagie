/**
 * @file mdm.base.js
 * @author Stefan Wilhelm (cerbero s@atwillys.de)
 * @license CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)
 */
"use strict";
const MdM = {};
MdM.prototype = {};

MdM.initialize = function() {
  if(MdM.logging === undefined) try { MdM.logging = { level:util.traceLevel(), logger:console.log, calculus:util.traceLevel()>2 }; } catch{};
  var definitions_ = {};
  var base_config_ = [];

  /**
   * Utility
   */
  (function(){
    MdM.util = {};
    MdM.util.log   = function() { MdM.logging.logger.apply(null, arguments); };
    MdM.util.log1  = function() { if(MdM.logging.level>0) MdM.logging.logger.apply(null, arguments); };
    MdM.util.log2  = function() { if(MdM.logging.level>1) MdM.logging.logger.apply(null, arguments); };
    MdM.util.log3  = function() { if(MdM.logging.level>2) MdM.logging.logger.apply(null, arguments); };
    MdM.util.logc  = function() { if(MdM.logging.calculus===true) MdM.logging.logger.apply(null, arguments); };
    MdM.util.warn  = console.warn;
    MdM.util.error = console.error;

    const oclone = function(x) {
      return JSON.parse(JSON.stringify(x));
    };

    const omerge = function() {
      const c = {};
      for(var k=0; k < arguments.length; ++k) {
        for(var i in arguments[k]) {
          c[i] = oclone(arguments[k][i]);
        }
      }
      return c;
    };

    const opatch = function(x, p) {
      if(p === undefined) {
        return x;
      } else if(x === undefined) {
        return oclone(p);
      } else if(typeof(x) === "object") {
        if(Array.isArray(x) != Array.isArray(p)) {
          MdM.util.log("Warning: Array patch override type mismatch.", oclone(x), oclone(p));
        } else if(typeof(p) !== "object") {
          if(p !== null) MdM.util.log("Warning: Object patch override object type mismatch (x).", oclone(x), oclone(p));
        } else if((x.length !== undefined) && (p.length !== undefined)) {
          x.length = p.length;
          for(var i=0; i<p.length; ++i) {
            x[i] = opatch(x[i], p[i]);
            p[i] = undefined;
          }
        } else {
          for(var it in p) {
            if(x[it] !== undefined) {
              x[it] = opatch(x[it], p[it]);
            } else {
              x[it] = p[it];
            }
          }
          Object.keys(p).filter(function(k){delete p[k]});
        }
      } else {
        if(typeof(p) !== "object") {
          return p;
        } else {
          if(p !== null) MdM.util.log("Warning: Object patch override object type mismatch (p).", x, p);
        }
      }
      return x;
    };

    MdM.util.clone = oclone;
    MdM.util.merge = omerge;
    MdM.util.patch = opatch;

    MdM.util.toInt = function(value, default_value, min_value, max_value) {
      default_value = default_value || 0;
      value = (value === undefined) ? (default_value) : Number.parseInt(value);
      if(isNaN(value)) value = default_value;
      if((typeof(min_value)==="number") && (value < min_value)) return min_value;
      if((typeof(max_value)==="number") && (value > max_value)) return max_value;
      return value;
    }

    MdM.util.html = function(text) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
      return (""+text).replace(/[&<>"']/g, m=>map[m]);
    };

    MdM.util.acumulateTo = function(tbl, val) {
      var r = 0;
      val = val > tbl.length ? tbl.length : val;
      for(var i=1; i<=val; ++i) r+= tbl[i];
      return r;
    };

    MdM.util.skillKey = function(name, existing) {
      if(!name) return "";
      existing = existing || false;
      const deloc = MdM.lang.findLocalizationKey(name);
      if(deloc && definitions_.skills[deloc]) return deloc; // translation found and it's a skill.
      name = (""+name).toLowerCase(name).replace(/[^a-z0-9-]/mg, "");
      if(definitions_.skills[name] === undefined) return existing ? "" : name; // Not (or not yet) a key.
      if(definitions_.values[name]!==undefined) return ""; // reserved.
      return name; // existing skill.
    };

    MdM.util.isSkill = function(name) {
      return MdM.definitions.defaults()[MdM.util.skillKey(name)] !== undefined;
    };

    Object.freeze(MdM.util);
  })();

  /**
   * MdM system definitions
   */
  (function(){

    /**
     * Character feature list (PersoenichkeitsMerkmale)
     * @type Array
     */
    const pmi = { k:"K", m:"M", b:"B", g:"G", i:"I", c:"C" };

    /**
     * Character property list (Eigenschaften)
     * @type Array
     */
    const esi = { kr:"KR", gw:"GW", gs:"GS", re:"RE", wa:"WA", in:"IN", ma:"MA", ke:"KE", wi:"WI", mn:"MN", wk:"WK", au:"AU" };

    /**
     * Character attributes list and expressions/terms (Attribute)
     * @type object
     */
    const ati = {
      lp:  "4*K+2*M+C",
      rlp: "2*KR",
      mp:  "4*G+2*I+C+B",
      rmp: "2*MA",
      ap:  "C+WK",
      rf: "(IN+RE)/3",
      mr: "(C+I+G+B)/4",
      mu: "(K+G+C)/2",
      ns: "(GW+KR)/2",
      ff: "(WA+IN)/2",
      nm: "(GW+KR+GS)/3",
      nw: "(GW+KR+GS)/2",
      nl: "(GW+GS)/2",
      pa: "(GW+RE)/2"
    };

    /**
     * Additional values / calculated values
     */
    const avi = { xp:"XP", be:"BE", rs:"RS" };

    const default_definitions = {
      /**
       * Features (Persönlichkeitsmerkmale)
       * @type Object
       */
      features: pmi,

      /**
       * Properties (Eigenschaften)
       * @type Object
       */
      properties: esi,

      /**
       * Attributes (Attribute, calculated)
       * @type Object
       */
      attributes: ati,

      /**
       * All Character values (PM, ES, AT, experience)
       * @type Object
       */
      values: MdM.util.merge(pmi, esi, ati, avi),

      /**
       * Definitions related to character progression ("leveling")
       * @type Object
       */
      progression: {

        /**
         * Defines how many xp points to from
         * index n-1 to index n.
         * @type Object
         */
         xptables: {
          pm: [ 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 7 ],
          es: [ 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 7 ],
          skills: [ 0, 1, 1, 1, 1, 1 ]
        },

        /**
         * Defines the default value for experience points per
         * level progress.
         * @type Number
         */
        defaultXPperLevel: 1,

        /**
         * Fixed value. The amount of XP is equal to the
         * amount of PM points given to the players.
         * @type Number
         */
        numPmPerXP: 4,

        /**
         * Fixed value. 2ES points given per XP point.
         * @type Number
         */
        numEsPerXP: 12,

        /**
         * Fixed value. Truncated integer (Math.floor())
         * @type Number
         */
        numSkillsPerXP: 1,

        /**
         * The initial character generation free experience
         * to level.
         */
        initialExperience: 4,

        /**
         * The initial character generation free experience
         * to level.
         */
        initialXp: {
          pm: 20,
          es: 40,
          skills: 5
        },

        /**
         * Settings for race offsets.
         * @type Object
         */
        raceoffsets: {
          pm: { min:0, max:4, std:2 },
          es: { min:0, max:4, std:2 },
          at: { min:0, max:25, std:{ lp:10, rlp:5, mp:10, rmp:5 } },
          skills: { min:0, max:3, std:0 },
        }
      },

      /**
       * Races content loaded from other file and calculated
       * with the raceOffsets.
       * @type Object
       */
      races: {
        "no-race": {
          k:0, m:0, b:0, g:0, i:0, c:0,
          kr:0, gw:0, gs:0, re:0, wa:0, in:0, ma:0, ke:0, wi:0, mn:0, wk:0, au:0
        }
        // Races defined in mdm.config.js
      },

      /**
       * List of available example skills.
       * Keys are always lowercase english lemmas/words.
       * Values are objects: {
       *  refs: "related space separated features/properties/attributes, e.g. "KR GW"",
       *  descr: "an english, translatable description"
       *  cat: [ "<category1>", "<category2>" ],
       *  modifies: { <attribute>: "<formula to modify the attribute>" }
       * }
       */
      skills: {},

      /**
       * Spells
       */
      spells: [],

      /**
       * Armor elements and property limits.
       */
      armors: {
        head:   { rs:{min:0, max:9}, be:{min:0, max:9} },
        torso:  { rs:{min:0, max:9}, be:{min:0, max:9} },
        arms:   { rs:{min:0, max:9}, be:{min:0, max:9} },
        legs:   { rs:{min:0, max:9}, be:{min:0, max:9} },
        shield: { rs:{min:0, max:9}, be:{min:0, max:9} },
      },

      /**
       * Weapon related definitions.
       */
      weapons: {
        num_slots: 3,
        types: ["ns","nm","nl","nw","ff"],
      },

      /**
       * Tabellarium interpretation specs, defined in config.
       */
      tabellarium: [],

      /**
       * The used language. Overridable.
       * @type String
       */
      language: "de",

      /**
       * Localizations, first key level is the language
       * code (e.g. localizations.de), second level
       * contains the keys "abbr" and "translations", see
       * local `localizations` object in this file.
       */
      localizations: {
        // abbr: Fixed abbreviation key translation in the character sheet.
        // translations: Lemma translations (single words, keys are always treated lowercase and without spaces or special chars)
        "de": {
          abbr: {},
          translations: {},
          skillmatching: {}, // Thesaurus-like. Links a list of words specifies values to their better or appropriate standard word (keys).
        }
      }
    };

    MdM.definitions = {}
    MdM.definitions.defaults = function() { return MdM.util.clone(default_definitions); };
    MdM.definitions.base = function() { return MdM.util.clone(base_config_); };
    MdM.definitions.patch = function(conf) { MdM.definitions.set([MdM.definitions.base(), conf]); };
    MdM.definitions.get = function() { return definitions_; };
    MdM.definitions.set = function(defs) {
      if(Array.isArray(defs)) {
        defs.filter(function(def) { MdM.definitions.set(def); });
        return definitions_;
      }
      defs = MdM.util.clone(defs||{});
      if(typeof(defs) !== "object") {
        MdM.util.error("Definitions to apply not an object.");
        return definitions_;
      }
      // Spells array is special: It is not explicitly overwritten
      // by the new array, but first joined and then condensed down.
      // Purpose of using an array here is to maintain the order.
      var spell_array = []
      if(Array.isArray(definitions_.spells)) {
        spell_array = definitions_.spells;
        delete definitions_.spells;
      }
      if(Array.isArray(defs.spells)) {
        spell_array = spell_array.concat(defs.spells);
        delete defs.spells;
      }
      defs = MdM.util.patch(MdM.util.clone(definitions_), defs);
      defs.values = MdM.util.merge(avi, defs.features, defs.properties, defs.attributes);
      defs.spells = spell_array;

      // Race specific corrections / defaults
      (function(){
        for(var it in defs.races) {
          const race = defs.races[it];
          for(var key in defs.features) {
            if(race[key]===undefined) {
              race[key] = 0;
            }
          }
          for(var key in defs.properties) {
            if(race[key]===undefined) {
              race[key] = 0;
            }
          }
          for(var key in defs.attributes) {
            if(race[key]===undefined) {
              race[key] = 0;
            }
          }
        }
      })();

      // Spell array overrides (mainly condense down appended arrays)
      (function(){
        const spell_indices = {}
        for(var i=0; i<defs.spells.length; ++i) {
          const spell_name = defs.spells[i].name.toLowerCase().replace(/[^\w\d]/g,"");
          if(!spell_indices[spell_name]) {
            spell_indices[spell_name] = i;
          } else {
            MdM.util.log2("Replace spell at index " + spell_indices[spell_name] + " with " + i + ".");
            defs.spells[spell_indices[spell_name]] = defs.spells[i];
            defs.spells[i] = null;
          }
        }
        defs.spells = defs.spells.filter((spell)=>(spell!==null));
      })();

      definitions_ = defs;
      return definitions_;
    }

    Object.freeze(default_definitions);
    Object.freeze(default_definitions.features);
    Object.freeze(default_definitions.properties);
    Object.freeze(default_definitions.attributes);
    Object.freeze(default_definitions.values);
    definitions_ = MdM.util.clone(default_definitions);
    MdM.definitions.set();
  })();

  /**
   * Calculus
   */
  (function(){
    MdM.calc = {};

    /**
     * Rolls numDice with numSurfaces surfaces.
     * @param {Number} numSurfaces
     * @param {Number} numDice
     * @returns {Number}
     */
    MdM.calc.dice = function(numSurfaces, numDice) {
      var r = 0;
      for(var i=0; i<numDice; ++i) { r += Math.ceil(Math.random() * numSurfaces); }
      return r;
    };

    /**
     * Repeats the given function `numRolls` times, returns the
     * number of results that are `true` or `>0`.
     * @param {number} numRolls
     * @param {function} fn
     * @returns {number}
     */
    MdM.calc.successes = function(numRolls, fn) {
      var r = 0;
      for(var i=0; i<numRolls; ++i) { r += ((0+fn())>0)?1:0; }
      return r;
    };

    /**
     * Calculates a diceexpr, returns the result.
     */
    MdM.calc.calculate = function(expression, values, allow_negative) {
      const val = MdM.calc.diceFunction(expression, values)();
      return ((!allow_negative) && (val<0)) ? 0 : val;
    };

    /**
     * Return a function that calculates a dice expression.
     *
     * @argument {String} term
     * @argument {object} values
     * @returns {Function}
     */
    MdM.calc.diceFunction = function(term, values, info) {
      if(typeof(info)!=="object") info={}; // only accept byref object.
      MdM.util.logc("Initial diceexpr  : ", term);
      if(term.match(/[^\s\d\w\+\-\/\*\(\)\.\|\&<>=\?:#]/)) {
        throw new Error("Invalid dice expression: '" + term + "', invalid character.");
      } else if(term.replace(/[\s]/g,"") === "") {
        MdM.util.logc("return zero returning function");
        return function(){return 0;};
      }
      const uvals = {};
      if(!!values) {
        for(var key in values) {
          if(!values.hasOwnProperty(key)) continue;
          if(!key.match(/^[A-Za-z][\w\d-]*$/)) continue;
          if((values[key]).toString().match(/[^\d]/)) continue;
          uvals[key.toLowerCase().replace(/-/g,"")] = parseFloat(values[key]);
        }
      }
      var fn = term
        .toLowerCase()                    // adapt to key case
        .replace(/[\s]/g,"")              // spaces
        .replace(/[\)][\(]/g,")*(")       // Math notation: (x+1)(x-1) --> (x+1)*(x-1)
        .replace(/[\(][\s]*[\)]/g,"")     // empty parenthesis pairs
        .replace(/([^=])[=]+/g,"$1==")    // Correct Human "=" with programming lang "==", there are no assignments in terms.
        .replace(/([<>])[=]+/g,"$1=")     // Correct ">=", "<="
        .replace(/[=]+([<>])/g,"$1=")     // Correct "=>", "=<" -> ">=", "<="
      ;
      if(fn != term) {
        MdM.util.logc("Initial replace : ", fn);
      }

      // Basic mistakes
      {
        if(fn.match(/[\*\+\-\/]{2,}/) // two operators (** is not "power of")
        || fn.match(/^[\*\/\)]/)      // invalid operators at start
        || fn.match(/[\*\+\-\/\(]$/)  // operator at end
        ) {
          throw new Error("Invalid dice expression:'" + term + "', two following operators or wrong parenthesis at the beginning or end.");
        }
        const o_parens = (fn.match(/\(/g)||[]).length;
        const c_parens = (fn.match(/\)/g)||[]).length;
        if(o_parens != c_parens) {
          throw new Error("Invalid dice expression:'" + term + "', parenthesis mismatch: "+o_parens+"x '(', but "+c_parens+"x ')'.");
        }
      }

      // Mapping of dice functions and data values.
      {
        fn = fn
          .split(/([\+\-\/\*\(\)\?:\|&<>=])/)
          .filter((a)=>(a!==""))
          .map((e)=>{
            if(e.match(/^[\d]+[dw][\d]+$/)) {
              MdM.util.logc("Dice function: ", e);
              return e.replace(/^([\d]+)[dw]([\d]+)$/g, "($1d$2)");
            }
            if(e.match(/^[dw][\d]+$/)) {
              MdM.util.logc("Dice function: ", e);
              return e.replace(/^[dw]([\d]+)$/g, "(1d$1)");
            }
            let m = e.match(/^([\d]*)([\w]+)$/);
            if(m && uvals[m[2]] !== undefined) {
              m[1] = (m[1] === "") ? 1 : parseInt(m[1]);
              MdM.util.logc("Object key: ", m[1], "*" , m[2]);
              return uvals[m[2]] * m[1];
            }
            if(e.match(/^[\d\.\*\+\-\/\(\)\?:<>=\|\&#]+$/)) {
              return e;
            }
            if(e.match(/^[a-z][\w_\d]*$/)) {
              MdM.util.logc("Not found in object keys, replace with 0: ", e);
              return "0";
            }
            MdM.util.logc("Add parenthesis  : ", e);
            return "("+e+")";
          })
          .join("");
        MdM.util.logc("After mapping    : ", fn);
      }

      // Special meaning of bitwise OR
      {
        // Parenthesis OR'ed numbers evaluate to the maximum of these numbers, e.g. "(9|1|17)"->17, useful for best-property selection like "(GW|KR)".
        fn = fn.replace(/\(([\d\|]+)\)/g, (match,term)=>("("+ term.split(/[\|]/).map(s=>parseInt(s)).reduce((acc,val)=>Math.max(acc,val)) +")"));
        // Other bitwise ops: Enforce boolean, so that "|" evaluates to "||", "&"->"&&".
        fn = fn.replace(/([^\|])[\|]+/g,"$1||").replace(/([^&])[&]+/g,"$1&&");
      }

      // Interpreting the diceexpr: On paper, the values are always calculated with
      // integer divisions - so, here we deduce the diceexpr as much as possible
      // to precalculated integer values. The reduction is based on primitive successive
      // integer calculation with operator/paren precedence.
      {
        const reduce = (str, functor)=>{ var old; do { old = str; str = functor(str); } while(old !== str); return str; };
        const repl_paren = (s)=>(s.replace(/[\(]([\d]+)[\)]/g, "$1"));
        const repl_mult_div = (s)=>repl_paren(s)
          .replace(/([\d]+)\*([\d]+)/g, (match,a,b)=>(parseFloat(a)*parseFloat(b)))
          .replace(/([\d]+)\/([\d]+)/g, (match,a,b)=>((parseFloat(a)/parseFloat(b))|0))
          .replace(/([^\d])1\*/g, "$1")
          .replace(/[\*\/]1([^\d])/g, "$1")
        ;
        const repl_plus_minus = (s)=> repl_mult_div(s)
          .replace(/([\d]+)\-([\d]+)/g, (match,a,b)=>((parseFloat(a)-parseFloat(b))))
          .replace(/([\d]+)\+([\d]+)/g, (match,a,b)=>((parseFloat(a)+parseFloat(b))))
        ;
        fn = reduce(fn, repl_plus_minus);
        fn = fn.replace(/([\d]+)\(1d([\d]+)\)/g,"($1d$2)"); // Replace const calculated dice count.
        MdM.util.logc("After reduction  : ", fn);
      }

      // Parenthesis splitting
      (function(){
        const re = /\(([^\(\)]+)\)/g;
        let subexpr = [fn];
        for(let matched=true; matched;) {
          matched = false;
          for(let i=0; i<subexpr.length; ++i) {
            subexpr[i] = subexpr[i].replace(re, (_, m)=>{
              matched = true;
              const k="§"+(subexpr.length);
              subexpr.push(m);
              return k;
            });
          }
        }
        subexpr = subexpr.map((e)=>{
          e = e.replace(/(\d+)#(§\d+)/, "$1#($2)") // Success rolls need double parentheses later on.
               .replace(/^([^\?]+)[?]([^:]+)[:](.*)$/g,"($1)?($2):($3)") // Mini-if
               .replace(/^([^\?]+)[?]([^:]+)$/,"($1)?($2):(0)") // Incomplete mini-if
               .replace(/[\(]([\d]+)[\)]/g, "$1") // "(number) -> number"
          ;
          return e;
        })
        const old = fn;
        fn = subexpr[0]
        while(fn.search(/§\d/)>=0) {
          fn = fn.replace(/§(\d+)/, (_,m)=>{
            m = subexpr[parseInt(m)];
            return (m.match(/^§(\d+)$/)) ? (m) : ("("+m+")");
          })
        }
        if(old != fn) {
          console.warn(subexpr)
          MdM.util.logc("After parentheses: ", fn);
        }
      })();

      // Replace dice rolls and success based rolls marked with <N>#(<expression>)
      info.term = fn;
      fn = fn.replace(/([\d]+)#[\(][\(]/g,"MdM.calc.successes($1,()=>(");
      MdM.util.logc("After success tag: ", fn);
      fn = 'return 0+(' + fn.replace(/([\d]+)d([\d]+)/g, "MdM.calc.dice($2,$1)") + ");";
      MdM.util.logc("Returned function: function(){ "+ fn +" };");
      try {
        const rfn = new Function(fn);
        rfn();
        return rfn;
      } catch(e) {
        throw new Error("Invalid dice expression: '" + term + "': '" + e + "'");
      }
    };

    /**
     * Statistical calculations based on dice expressions.
     * @constructor
     */
    MdM.calc.DiceStatistics = function(iterationCallback, diceexpr, propertyObject, iterationLoops, maxLoops, errorCallback) {
      if(diceexpr === undefined) diceexpr = "";
      if(iterationLoops === undefined || !iterationLoops) iterationLoops = 100000;
      if(propertyObject === undefined || !propertyObject) propertyObject = {};
      if(maxLoops === undefined) maxLoops = 1e12;
      if(iterationCallback === undefined) iterationCallback = (stat)=>{};
      if(errorCallback === undefined) errorCallback = MdM.util.error;
      let diceFn = ()=>0;

      /// The diceexpr to calculate. When changing this text you
      /// must call reset() to apply the changes.
      this.diceexpr = diceexpr;

      /// Called after calculating each iteration.
      this.iterationCallback = iterationCallback;

      /// Object defining which properties are passed
      /// to the diceexpr calculation. After changing
      /// this you must call reset().
      this.propertyObject = propertyObject;

      /// Number of loops to calculate per iteration
      this.iterationLoops = iterationLoops;

      /// Force-break condition. After that number of loops, refine()
      /// will return false.
      this.maxLoops = maxLoops;

      /// Counters for diceexpr execution results.
      this.counts = {};

      /// Last calculated statistics array of objects, where each object is
      /// one iteration result. Last result is this.stats[0].
      this.stats = [];

      /// Maximum length of this.stats, however this.stats can have less elements.
      this.historySize = 5;

      /// Max deviation summary error over the whole history
      this.error = 100.0;

      /// The refine function returns false if this.error < this.breakCondition.
      /// Means: statistic does not really change anymore.
      this.breakCondition = 1e-2;

      /// If true, the argument object of this.iterationCallback will contain
      /// continuous, sorted result keys (from min to max), otherwise only
      /// results with counts > 0 are contained in the statistic.
      this.continuousResults = true;

      /**
       * Refine result. Returns true if more refinements
       * are desirable, false if no progress is measured
       * anymore.
       * @returns {Boolean}
       */
      this.refine = function() {
        if(this.diceexpr === "") return false;
        if(this.nCalculated >= this.maxLoops) return false;
        for(var i=0; i<this.iterationLoops; ++i) {
          ++this.nCalculated;
          var v = diceFn();
          if(this.counts[v] === undefined) this.counts[v] = 0;
          ++this.counts[v];
        }
        var stat = {};
        for(var i in this.counts) {
          stat[i] = this.counts[i] / this.nCalculated * 100;
        }
        this.stats.unshift(stat);
        if(this.stats.length > this.historySize) {
          this.stats.pop();
        }
        if(this.stats.length < this.historySize) {
          this.error = 100;
        } else {
          var ok = true;
          // Check if history entries have the same number of results
          // and if results are the same. (not the counts, but if the
          // (result===object) key actually exists).
          for(var i=1; i<this.stats.length && ok; ++i) {
            if(this.stats[i].length !== this.stats[i-1].length) {
              // length mismatch
              ok = false;
              break;
            } else {
              for(var j in this.stats[i]) {
                if(this.stats[i-1][j] === undefined) {
                  // at least one result is missing
                  ok = false; break;
                }
              }
            }
          }
          if(!ok) {
            this.error = 100;
          } else {
            var errs = {};
            for(var i in this.stats) {
              for(var j in this.stats[i]) {
                if(errs[j] === undefined) errs[j] = [];
                errs[j].push(this.stats[i][j]);
              }
            }
            for(var i in errs) {
              var min=100, max=0;
              for(var j in errs[i]) {
                if(min > errs[i][j]) min = errs[i][j];
                if(max < errs[i][j]) max = errs[i][j];
              }
              errs[i] = max-min;
            }
            this.error = 0;
            for(var i in errs) {
              this.error += errs[i];
            }
            this.error /= this.stats.length;
          }
        }
        if(this.continuousResults) {
          var stat = MdM.util.clone(this.stats[0]);
          var min=1e23, max=-1e23;
          for(var i in stat) {
            var ii = parseInt(i);
            if(ii<min) min=ii;
            else if(ii>max) max=ii;
          }
          var data = {};
          for(var i=min; i<=max; ++i) {
            data[i] = Math.round(10*(stat[i] !== undefined ? stat[i] : 0))/10;
          }
          this.iterationCallback(data);
        } else {
          this.iterationCallback(MdM.util.clone(this.stats[0]));
        }
        return (this.error > this.breakCondition);
      };

      /**
       * Resets the statistics and implicitly calculates
       * the first iteration.
       * @returns {Boolean}
       */
      this.reset = function() {
        this.counts = {};
        this.stats = [];
        this.error = 100.0;
        this.nCalculated = 0;
        this.recommendatedUpdateInterval = 500; //ms
        try {
          diceFn = MdM.calc.diceFunction(this.diceexpr, this.propertyObject);
        } catch(ex) {
          errorCallback(ex.message);
        }
        var t0 = new Date();
        var r = this.refine();
        var t1 = new Date();
        this.recommendatedUpdateInterval = 4 * (t1.valueOf() - t0.valueOf());
        return r;
      };
      return this.reset();
    };

    Object.freeze(MdM.calc.DiceStatistics);
    Object.freeze(MdM.calc);
  })();

  /**
   * Tabellarium
   */
   (function(){
    MdM.tabellarium = {};
    let tables_ = {};

    /**
     * Returns a reference to the tabellary.
     * @returns {Array}
     */
    MdM.tabellarium.get = function()
     { return tables_; }

    /**
     * Markdown Table converter.
     */
    MdM.tabellarium.fromMarkdown = function(text) {
      if(text===undefined) {
        MdM.util.warn("tabellarium: No inline text provided.")
        return [];
      }
      text = text.replace(/\t/g,"  ").replace(/\s+$/g,"").replace(/[\r]+[\n]/,"\n");
      text = text.replace(/<!--.*?-->/sg, ""); // comments
      text = text.split(/[\r\n]/);
      const tables = {};
      var table_name = "~";    // separated with "# header 1"
      var section_name = "";   // separated with "## header 2"
      var entry_name = "";     // separated with "#### header 4"
      text.filter(function(line) {
        if(line.search(/^#\s/)===0) {
          table_name = line.replace(/^#\s/,"").trim();
          section_name = "";
          entry_name = "";
          return;
        }
        if(line.search(/^##\s/)===0) {
          section_name = line.replace(/^##\s/,"").trim();
          entry_name = "";
          return;
        }
        if(line.search(/^####\s/)===0) {
          entry_name = line.replace(/^####\s/,"").trim();
          if(tables[table_name]===undefined) tables[table_name] = [];
          tables[table_name].push({name:entry_name, section:section_name})
          return;
        }
        if(entry_name == "") return;
        const entry = tables[table_name][tables[table_name].length-1];
        if(line.search(/^@[a-z][\w\d]+\s/)===0) {
          var tag = line.replace(/^@/,"").trim();
          tag = tag.match(/^([^\s]+)\s+(.*)$/);
          entry[tag[1]] = tag[2];
        } else {
          entry.desc = (entry.desc||"") + line + "\n";
        }
      })
      for(let it in tables) {
        tables[it].filter(function(entry){
          entry.desc = entry.desc.replace(/^[\n\r]+/,"").replace(/[\n\r]+$/,"");
        });
      }

      // Map to standardized keys.
      const mapped_tables = {};
      const tabellary_specs = MdM.definitions.get().tabellarium;
      Object.keys(tables).filter(function(table_header) {
        const table_spec = tabellary_specs.find((spec)=>(spec.page_header.find(h=>(h.toLowerCase()==table_header.toLowerCase()))!==undefined));
        const mapped = { header: table_header, entries: tables[table_header] };
        if(table_spec === undefined) {
          MdM.util.warn("Unknown table: '"+table_header+"'");
          mapped_tables[table_header.replace(/[^\w-]/g,"").toLowerCase()] = mapped;
        } else {
          mapped_tables[table_spec.table] = mapped;
        }
      });
      return mapped_tables;
    }

    /**
     * Apply the contents of the tabellary to the current config.
     * @param {String|Array} md_or_parsed
     * @returns undefined
     */
    MdM.tabellarium.apply = function(md_or_parsed) {
      if(md_or_parsed !== undefined) {
        tables_ = (Array.isArray(md_or_parsed)) ? (md_or_parsed) : (MdM.tabellarium.fromMarkdown(md_or_parsed));
        if(typeof(tables_)!=='object') {
          MdM.util.error("Tabellarium not parsed to an object.", tables_);
          tables_ = {};
          return;
        }
      }
      // Assign table data
      function separate(line, separator) {
        separator = separator || " ";
        const elements = line.split(separator).map(e=>e.trim()).filter(e=>e!="");
        return elements;
      }
      // Skills
      (function(){
        if(!tables_.skills) return;
        const skills = {};
        const skillmatching = {};
        tables_.skills.entries.filter((entry)=>{
          const key = MdM.util.skillKey(entry.key);
          if(!key) {
            MdM.util.warn("Skill key invalid for skill '" + entry.name + "'");
            return;
          }
          // Skill
          const skill = {};
          try {
            if(entry.refs) skill.refs = entry.refs.trim();
            skill.desc = (entry.desc||"").trim();
            if(entry.cat) skill.cat = separate(entry.cat.toLowerCase(), /[,; ]/);
            if(entry.modifies) skill.modifies = Object.fromEntries(separate(entry.modifies.toLowerCase(), /[,;]/).map(e=>e.split(/\s*:\s*/)));
          } catch(ex) {
            MdM.util.error("Skill data invalid for key='" + key + "' name='"+entry.name+"': ", ex);
          }
          skills[key] = skill;
          // Skill matching
          if(entry.alias) {
            try {
              skillmatching[key] = separate(entry.alias, /[,;]/);
            } catch(ex) {
              MdM.util.error("Skill alias invalid for key='" + key + "' name='"+entry.name+"': ", ex);
            }
          }
        });
        // Assign
        definitions_.skills = skills;
        if(definitions_.localizations[definitions_.language]) {
          definitions_.localizations[definitions_.language].skillmatching = skillmatching;
        }
      })();

      // Spells
      (function(){
        if(!tables_.spells) return;
        const spells = {}
        const toInt = MdM.util.toInt;
        tables_.spells.entries.filter((entry)=>{
          const key = (entry.key || entry.name.toLowerCase()).replace(/[\s+]/g,"-").replace(/[^\w-]/g,"").replace(/[-]+/,"-").replace(/^[-]+/,"").replace(/[-]+$/,"");
          const spell = MdM.util.clone(entry);
          spell.level = toInt(spell.level,  0, 0, 7);
          spell.check = toInt(spell.check, 20, 0, 40);
          spell.cat = MdM.lang.findLocalizationKey(spell.section||"");
          delete spell.section;
          spells[key] = spell;
        });
        definitions_.spells = spells;
      })();
    }

    Object.freeze(MdM.tabellarium);
  })();

  /**
   * Localization/language handling.
   */
  (function(){
    MdM.lang = {};

    /**
     * Get / set the language
     * @param {undefined|String} lang
     * @returns {String|MdM}
     */
    MdM.lang.language = function(lang) {
      if(lang === undefined) return definitions_.language;
      lang = (""+lang).toLowerCase();
      if(definitions_.localizations[lang] === undefined) {
        MdM.util.error("No such language code: '" + lang + "'");
      } else {
        definitions_.language = lang;
      }
      return MdM;
    };

    /**
     * Returns an unabbreviated, translated lemma for a given
     * character value abbreviation.
     * @param {String} abbrev
     * @returns {String}
     */
    MdM.lang.verbatim = function(abbrev) {
      return (definitions_.localizations[definitions_.language].abbr[abbrev] === undefined) ?
            ("?!"+abbrev) : definitions_.localizations[definitions_.language].abbr[abbrev];
    };

    /**
     * Returns the localization settings for the selected language.
     * @returns {object}
     */
    MdM.lang.localizations = function() {
      return definitions_.localizations[definitions_.language];
    }

    MdM.lang.abbreviations = function(with_uppercase_keys) {
      return (!with_uppercase_keys)
        ? (MdM.lang.localizations().abbr)
        : Object.fromEntries(Object.entries(MdM.lang.localizations().abbr).map(e=>{  e[0]=e[0].toUpperCase(); return e }));
    }

    /**
     * Returns a translated lemma, if known, or or the normalized input key
     * if unknown.
     * @param {String} key
     * @returns {String}
     */
    MdM.lang.translate = function(key) {
      const lm = key.toLowerCase();
      const lemmata = MdM.lang.localizations().translations;
      if(lemmata[lm] !== undefined) {
        return "" + (Array.isArray(lemmata[lm]) ? (lemmata[lm][0]||key) : (lemmata[lm]||key));
      } else {
        // Either it's an abbreviated value (leave abbreviation) or not registered (also leave key).
        return "" + ((definitions_.values[lm] !== undefined) ? (definitions_.values[lm]) : (key));
      }
    };

    /**
     * Searches the key matching a translated word, returns the key/abbreviation, or "" if not found.
     * The optional prefix allows to give a context, the keys have to start with this prefix to match.
     * @param {String} word
     * @returns {String}
     */
    MdM.lang.findLocalizationKey = function(word, prefix) {
      if(word === undefined) return "";
      prefix = prefix || "";
      word = (""+word).toLowerCase().replace(/\s/g,"");
      if(word === "") return "";
      // Is already a key.
      if((definitions_.values[word]!==undefined) || (definitions_.skills[word]!==undefined)) return word;
      const lemmata = MdM.lang.localizations().translations;
      for(var key in lemmata) {
        const lemma = "" + (Array.isArray(lemmata[key]) ? (lemmata[key][0]) : (lemmata[key]));
        if(lemma.toLowerCase().replace(/\s/g,"") == word) {
          if((prefix=="") || (key.indexOf(prefix)==0)) return (""+key);
        }
      }
      const skillmap = MdM.lang.localizations().skillmatching;
      for(var key in skillmap) {
        if(!skillmap[key] || !skillmap[key].length) continue;
        if(skillmap[key].find(syn=>word==syn.toLowerCase().replace(/\s/g,""))) {
          if((prefix=="") || (key.indexOf(prefix)==0)) return (""+key);
        }
      }
      return "";
    };

    /**
     * Searches using `findLocalizationKey()`, returns the description
     * part of the lemma localization. If not found and a skill, returns
     * the `desc` field of the skill.
     * @param {string} word
     * @returns {string}
     */
    MdM.lang.localizedDescription = function(word) {
      const key = MdM.lang.findLocalizationKey(word)||word;
      const tr = MdM.lang.localizations().translations;
      if(Array.isArray(tr[key]) && (tr[key].length>1)) return (""+(tr[key][1]));
      if(definitions_.skills[key] && definitions_.skills[key].desc) return (""+(definitions_.skills[key].desc));
      return word;
    };

    /**
     * Searches using `findLocalizationKey()`, returns the localized
     * replacement word. Synonyms are replaced with the translation of the
     * synonym/skillmatch key. Returns the unchanged word if no result
     * could be found.
     * @param {string} word
     * @returns {string}
     */
     MdM.lang.localizedStandardLemma = function(word) {
      const key = MdM.lang.findLocalizationKey(word);
      const tr = MdM.lang.localizations();
      if(tr.translations[key]) return (Array.isArray(tr.translations[key]) && tr.translations[key][0]) ? (""+(tr.translations[key][0])) : (""+(tr.translations[key]));
      return word;
    };

  })();

  /**
   * MdM.Character
   */
  (function(){

    /**
     * Character "class"
     * @constructor
     * @returns {MdM.Character}
     */
    MdM.Character = function(data) {
      if(typeof(data)==="object") {
        // Copy existing character data.
        this.data = MdM.util.clone(data);
      } else {
        // Encapsulated object properties to prevent collisions
        // with method names.
        this.data = {
          // Name of the character
          name: "<unnamed>",
          // Race of the character, normally only set once
          race: "no-race",
          // Contains the values used in-game, which contain race modifiers.
          values: { xp:0 },
          // Array containing the `current` values for each leveling. The current level
          // is stored in progression[progression.length-1]
          progression: []
        };
        for(var it in definitions_.features) this.data.values[it] = 0;
        for(var it in definitions_.properties) this.data.values[it] = 0;
        for(var it in definitions_.attributes) this.data.values[it] = 0;
      }
      this.modifiers = {};
      this.progression = new MdM.CharacterProgression(this);
      this.progression.addExperience(0);
      this.recalculate();
    };

    /**
     * Returns/sets the name
     * @param {undefined|String} setval
     * @returns {String|MdM.Character}
     */
    MdM.Character.prototype.name = function(setval) {
      if(setval === undefined) return this.data.name;
      this.data.name = (""+setval).replace(/^[\s]+/g, "").replace(/[\s]+$/g,"");
      return this;
    };

    /**
     * Returns/sets the race name
     * @param {undefined|String} setval
     * @returns {String}
     */
    MdM.Character.prototype.race = function(setval) {
      if(setval === undefined) return this.data.race;
      setval = (""+setval).toLowerCase().replace(/^[\s]+/g, "").replace(/[\s]+$/g,"");
      if(definitions_.races[setval] === undefined) {
        MdM.util.error("No such race '" + setval + "'");
      } else {
        this.data.race = setval;
      }
      return this;
    };

    /**
     * Returns/sets the experience
     * @param {undefined|int} setval
     * @returns {Integer}
     */
    MdM.Character.prototype.experience = function(setval) {
      var xp = this.data.progression.length > 0 ? this.data.progression[this.data.progression.length-1].values.xp : 0;
      if(setval === undefined) return xp;
      setval = parseInt(setval);
      if(isNaN(setval) || setval < 0) {
        MdM.util.error("Invalid experience value " + setval + ".");
      } else if(setval < xp) {
        MdM.util.error("You cannot withdraw XP that you have already granted.");
      } else if(setval === xp) {
        return this;
      } else {
        return this.progression.addExperience(setval-xp);
      }
    };

    /**
     * Returns the current calculated in-game character values (PM, ES, AT, +xp),
     * which contain race offsets and modifiers.
     * @returns {Integer}
     */
    MdM.Character.prototype.values = function() {
      return this.data.values;
    };

    /**
     * Returns the currently calculated value, or 0 if the value
     * does not exist.
     * @returns {Integer}
     */
    MdM.Character.prototype.value = function(key) {
      return this.data.values[key] || 0;
    };

    /**
     * Returns a value with applied modifiers.
     * @returns {Number}
     */
     MdM.Character.prototype.modifiedValue = function(value, name_or_key) {
      value = value || 0;
      const mods = this.modifiers[MdM.lang.findLocalizationKey(name_or_key)];
      if(mods !== undefined) {
        mods.filter((mod)=>{
          value = MdM.calc.calculate("" + value + "" + mod.term, this.data.values, mod.allow_negative||false);
        });
      }
      return value;
    };

    /**
     * Returns the character skills according to the actual progression state.
     * Key is the format of `MdM.util.skillKey()`, value is an object containing:
     * { value:<actual value>, name:<written text caption of the skill (especially for unregistered skills)>, slot:<Slot in the Char-Sheet>, [others:<informational>]}
     * @returns {object}
     */
    MdM.Character.prototype.skills = function() {
      return this.progression.currentSkills();
    };

    /**
     * Returns the character skill by key or name, undefined if nonexistent.
     * @returns {Object}
     */
    MdM.Character.prototype.skill = function(name_or_key) {
      return this.skills()[MdM.util.skillKey(name_or_key)];
    };

    /**
     * Returns a copy of the key-value data of the equipped armor.
     * Valid keys are the keys of `definitions.armors`.
     * @returns {Object}
     */
    MdM.Character.prototype.armors = function() {
      return (this.data.armors === undefined) ? ({}) : MdM.util.clone(this.data.armors);
    };

    /**
     * Gets or sets a specific armor pice.
     * Valid keys are the keys of `definitions.armors`.
     * @param {string} armor_key
     * @param {object|undefined} armor_data
     * @returns {Object}
     */
    MdM.Character.prototype.armor = function(armor_key, armor_data_setval) {
      const armors = this.armors();
      const defs = definitions_.armors[armor_key];
      if(armor_data_setval !== undefined) {
        if(defs === undefined) {
          MdM.util.error("No armor key '"+armor_key+"', not setting.");
        } else  if(armor_data_setval === null) {
          delete armors[armor_key];
        } else {
          armors[armor_key] = {};
          const armor = armors[armor_key];
          armor["name"] = (""+(armor_data_setval["name"]||"")).trim();
          if(armor["name"] === "") {
            delete armors[armor_key];
          } else {
            Object.keys(defs).map((def)=>{
              if(armor_data_setval[def] === undefined) return;
              armor[def] = parseFloat((""+armor_data_setval[def]).replace(/,/,"."));
              if(isNaN(armor[def]) || (armor[def] < 0)) armor[def] = 0;
              armor[def] = Math.max(armor[def], defs[def].min);
              armor[def] = Math.min(armor[def], defs[def].max);
              if(armor[def] <= 0) delete armor[def];
            });
          }
        }
        if(Object.keys(armors).length===0) {
          delete this.data.armors;
        } else {
          this.data.armors = armors;
        }
        return this;
      } else {
        if(defs === undefined) {
          MdM.util.error("No armor key '"+armor_key+"', returning empty object.");
          return {};
        } else {
          const armor = (armors[armor_key]===undefined) ? ({}) : (MdM.util.clone(armors[armor_key]));
          armor.name = armor.name || "";
          Object.keys(defs).map((def)=>{ armor[def] = (armor[def]===undefined) ? (0) : (armor[def]); });
          return armor;
        }
      }
    };

    /**
     * Returns a copy of the key-value data of the equipped weapons.
     * @returns {Object}
     */
    MdM.Character.prototype.weapons = function() {
      return (this.data.weapons === undefined) ? ({}) : MdM.util.clone(this.data.weapons);
    };

    /**
     * Sets/gets a weapon equipped in the given slot.
     * @param {Integer} weapon_slot
     * @param {Object|undefined} weapon_data_setval
     */
    MdM.Character.prototype.weapon = function(weapon_slot, weapon_data_setval) {
      const defs = definitions_.weapons;
      const max_slots = defs.num_slots;
      const weapons = this.weapons();
      if((weapon_slot===undefined) || (weapon_slot<0) || (weapon_slot > max_slots)) {
        MdM.util.error("Invalid weapon slot: ", weapon_slot);
        return (weapon_data_setval===undefined) ? {} : this;
      } else if(weapon_data_setval === null) {
        delete weapons[""+weapon_slot];
        return this;
      } else if(weapon_data_setval !== undefined) {
        if(typeof(weapon_data_setval) !== "object") return this;
        const name = (""+(weapon_data_setval["name"]||"")).trim();
        if(name === "") {
          delete weapons[""+weapon_slot];
        } else {
          weapons[""+weapon_slot] = MdM.util.clone(weapon_data_setval);
          const weapon = weapons[""+weapon_slot];
          weapon.type = (weapon.type||"").toLowerCase().trim();
          if(defs.types.indexOf(weapon.type) < 0) weapon.type = "";
          weapon.ap = MdM.util.toInt(weapon.ap, 0, 1, 16);
          weapon.at = MdM.util.toInt(weapon.at, 0, 0, 50);
          weapon.pa = MdM.util.toInt(weapon.pa, 0, 0, 50);
          weapon.crit = MdM.util.toInt(weapon.crit, 17, 1, 20);
          const sanitize = (s)=>{
            s = (""+(s||"")).replace(/^\*/,"x").replace(/[\.][\d]+/ig,"").replace(/^[\+]+/,"").replace(/[^0-9xwd\+\-]/ig,"");
            if((s != "") && (s.search(/^[x\+]/)<0)) s = "+" + s;
            return s;
          }
          weapon.gs = sanitize(weapon.gs).replace(/^[\+]+/,"");
          weapon.zs = sanitize(weapon.zs);
          weapon.ks = sanitize(weapon.ks);
        }
        this.data.weapons = weapons;
        return this;
      } else {
        return (weapons[weapon_slot] === undefined) ? ({}) : (MdM.util.clone(weapons[weapon_slot]));
      }
    }

    /**
     * Calculate a dice expression/term with the values of this character.
     * @param {String} term
     * @param {Boolean} allow_negative
     * @returns {Number}
     */
    MdM.Character.prototype.calculate = function(term, allow_negative) {
      const values = {};
      for(var it in this.data.values) values[it] = 0+this.data.values[it]; // copy values, not refs.
      return MdM.calc.calculate(term, values, allow_negative);
    };

    /**
     * Recalculate values
     * @returns {MdM.Character}
     */
    MdM.Character.prototype.recalculate = function() {
      const mods = this.progression.raceOffsets();
      // Basic values
      {
        const vals = (this.data.progression.length > 0) ? this.data.progression[this.data.progression.length-1].values : {};
        this.data.values = {xp:(vals.xp||0)};
        // PM and ES are calculated from raw values
        for(var it in definitions_.features) this.data.values[it] = MdM.calc.calculate(definitions_.values[it], vals) + mods[it];
        for(var it in definitions_.properties) this.data.values[it] = MdM.calc.calculate(definitions_.values[it], vals) + mods[it];
        // AT are calculated from PM/ES with race offsets.
        const pmes = MdM.util.clone(vals);
        for(var it in pmes) pmes[it] = 0+this.data.values[it];
        for(var it in definitions_.attributes) this.data.values[it] = MdM.calc.calculate(definitions_.values[it], pmes) + mods[it];
      }
      // Skills
      {
        const skills = this.skills();
        for(var it in skills) this.data.values[it] = skills[it].value + (mods[it]||0);
      }
      this.recalculateModifiers();
      this.recalculateWeapons();
      this.recalculateArmors();
      return this;
    };

    MdM.Character.prototype.recalculateModifiers = function() {
      this.modifiers = {};
      // Apply skill modifiers to attributes etc.
      {
        const skills = this.skills();
        Object.keys(skills)
          .map(k=>MdM.lang.findLocalizationKey(k))
          .filter(k=>((k!="") && (definitions_.skills[k] !== undefined) && (definitions_.skills[k].modifies !== undefined)))
          .map(k=>{
            if(typeof(definitions_.skills[k].modifies) !== 'object') throw new Error("Modifiers config for skill "+k+" not and object");
            Object.entries(definitions_.skills[k].modifies).forEach((kv)=>{
              const key = kv[0].toLowerCase();
              const term = kv[1].replace(/\bfk\b/ig, k.toLowerCase().replace(/[^\w]/g,"")); // Replace e.g. "ns:+FK" with "ns:+meleeheavy", that is the calculus compliant skill name.
              if(this.modifiers[key] === undefined) this.modifiers[key] = [];
              this.modifiers[key].push({term:term, from:k});
            })
          });
      }
    }

    MdM.Character.prototype.recalculateWeapons = function() {
      // Weapons
      if(this.data.weapons !== undefined) {
        const weapons = this.data.weapons;
        for(var slot in weapons) {
          const weapon = weapons[slot];
          const weapon_type = weapon.type;
          if(weapon_type == "") {
            weapon.at = 0;
            weapon.pa = 0;
          } else {
            weapon.at = this.modifiedValue(this.values()[weapon_type], weapon_type);
            weapon.pa = this.modifiedValue(this.values().pa, weapon_type);
          }
        }
      }
    }

    MdM.Character.prototype.recalculateArmors = function() {
      const armors = this.armors();
      let be=0, rs=0;
      for(var it in armors) {
        rs += armors[it].rs || 0;
        be += armors[it].be || 0;
      }
      this.data.values["rs"] = this.modifiedValue(Math.round(rs), "rs");
      this.data.values["be"] = this.modifiedValue(Math.round(be), "be");
    }

    /**
     * Serialise the character data to a returned string.
     * @returns {String}
     */
    MdM.Character.prototype.serialize = function() {
      return JSON.stringify(this.data);
    };

    /**
     * Unserialise the character data from a given string string.
     * @returns {MdM.Character}
     */
    MdM.Character.prototype.unserialize = function(serialized) {
      if(typeof(serialized) !== "string") {
        MdM.util.error("Invalid serialised data.");
        return this;
      }
      var p = JSON.parse(serialized);
      if(p === undefined || typeof(p) !== "object") {
        MdM.util.error("Invalid serialised data.");
        return this;
      }
      this.data = p;
      this.recalculate();
      return this;
    };

    Object.freeze(MdM.Character.prototype);
    Object.freeze(MdM.Character);
  })();

  /**
   * MdM.CharacterProgression
   */
   (function(){

    MdM.CharacterProgression = function(char) {
      this.char = char;
    }

    /**
     * Returns the race offsets of this character
     * @returns {Object}
     */
     MdM.CharacterProgression.prototype.raceOffsets = function() {
      const name = this.char.data.race;
      if(definitions_.races[name] === undefined) { MdM.util.error("The Race '" + name + "' does not exist."); }
      if(name == "no-race") return Object.fromEntries(Object.entries(definitions_.values).map(e=>[e[0],0]));
      const def = MdM.util.clone(definitions_.progression.raceoffsets);
      const mods = (definitions_.races[name]!==undefined) ? MdM.util.clone(definitions_.races[name]) : {};
      const res = {xp:0};
      for(var it in definitions_.features) res[it] = 0+def.pm.std;
      for(var it in definitions_.properties) res[it] = 0+def.es.std;
      for(var it in definitions_.attributes) res[it] = 0+(def.at.std[it]||0);
      for(var it in mods) {
        if((res[it] === undefined) && (!mods[it])) continue;
        res[it] = res[it] || 0;
        const v = parseFloat(mods[it]);
        if(isNaN(v)) {
          MdM.util.error("Invalid race mod '" + it + "': not numeric (" + (mods[it]) + ")");
        } else {
          const ref = (definitions_.features[it] !== undefined) ? def.pm : (
                      (definitions_.properties[it] !== undefined) ? def.es : (
                      (definitions_.attributes[it] !== undefined) ? def.at : (
                      (def.skills))));
          if(ref.std+v > ref.max) MdM.util.error("Race mod too high: " + it + "=" + v + "(std=" + JSON.stringify(ref.std) + ", max=" + ref.max + ")");
          if(ref.std+v < ref.min) MdM.util.error("Race mod too small: " + it + "=" + v + "(std=" + JSON.stringify(ref.std) + ", min=" + ref.min + ")");
          res[it] += v;
        }
      }
      return res;
    };

    /**
     * Returns the attribute offset based on the race PM/ES/AT offset definition.
     * @param {String} attr
     * @returns {Integer}
     */
    MdM.CharacterProgression.prototype.attributeRaceOffset = function(attr) {
      const diceexpr = definitions_.attributes[attr];
      if(!diceexpr) return 0;
      const name = this.char.data.race;
      if(definitions_.races[name] === undefined) { MdM.util.error("The Race '" + name + "' does not exist."); }
      const def = definitions_.progression.raceoffsets;
      const mods = (definitions_.races[name]!==undefined) ? MdM.util.clone(definitions_.races[name]) : {};
      const vals = {};
      for(var it in definitions_.features)   vals[it] = 0 + def.pm.std + (mods[it]||0);
      for(var it in definitions_.properties) vals[it] = 0 + def.es.std + (mods[it]||0);
      return MdM.calc.calculate(diceexpr, vals) + (mods[attr]||0) + (def.es.std[attr]||0);
    };

    /**
     * Makes a progression snapshot and increases the experience
     * of the current "level" by `numPoints`. If `numPoints`
     * is undefiend, the default amount of experience points
     * per "leveling" is added.
     * @param {Number|undefined} numPoints
     * @returns {MdM.Character}
     */
    MdM.CharacterProgression.prototype.addExperience = function(numPoints) {
      if(numPoints === undefined) numPoints = definitions_.progression.defaultXPperLevel;
      const progr = this.char.data.progression;
      const curr = (progr.length === 0) ? ({ values:{xp:0}, skills:{} }) : (MdM.util.clone(progr[progr.length-1]));
      for(var it in definitions_.features) if(curr.values[it] === undefined) curr.values[it] = 0;
      for(var it in definitions_.properties) if(curr.values[it] === undefined) curr.values[it] = 0;
      curr.values.xp += numPoints;
      if((progr.length===0) || (numPoints > 0)) progr.push(curr);
      this.char.recalculate();
      return this;
    };

    /**
     * Resets the current progression changes, except the amount of
     * XP most recently added.
     *
     * @returns {MdM.Character}
     */
    MdM.CharacterProgression.prototype.resetCurrent = function() {
      const prog = this.char.data.progression;
      if(prog.length === 0) return;
      var xp = prog[prog.length-1].values.xp;
      prog.pop();
      if(prog.length === 0) return this.addExperience(xp);
      xp -= prog[prog.length-1].values.xp;
      return this.addExperience(xp);
    };

    /**
     * Returns the current character progress (leveling) values
     * (PM, ES, AT, +xp), which are plain, unmodified. These
     * values are the head of the progress progression, and only used
     * to level and calculated the in-game values (retrieved with
     * the `values()` getter method.
     * Note: Return value is a reference, not a copy.
     * @returns {Integer}
     */
    MdM.CharacterProgression.prototype.currentValues = function() {
      return (this.char.data.progression.length > 0) ? this.char.data.progression[this.char.data.progression.length-1].values : {};
    };

    /**
     * Returns the current character progress (leveling) values
     * (PM, ES, AT, +xp), which are plain, unmodified. These
     * values are the head of the progress progression, and only used
     * to level and calculated the in-game values (retrieved with
     * the `values()` getter method.
     * Note: Return value is a reference, not a copy.
     * @returns {Integer}
     */
    MdM.CharacterProgression.prototype.currentSkills = function() {
      return (this.char.data.progression.length > 0) ? this.char.data.progression[this.char.data.progression.length-1].skills : {};
    };

    /**
     * Returns the number of PM points already spent.
     * @return {Number}
     */
    MdM.CharacterProgression.prototype.featurePointsExpended = function() {
      const vals = this.char.data.progression[this.char.data.progression.length-1].values;
      var spent = 0;
      for(var it in definitions_.features) spent += MdM.util.acumulateTo(definitions_.progression.xptables.pm, vals[it]);
      MdM.util.log3("Character.progression.featurePointsExpended() = " + (spent).toString());
      return spent;
    };

    /**
     * Returns the number of ES already spent.
     * @return {Number}
     */
    MdM.CharacterProgression.prototype.propertyPointsExpended = function() {
      const vals = this.char.data.progression[this.char.data.progression.length-1].values;
      var spent = 0;
      for(var it in definitions_.properties) spent += MdM.util.acumulateTo(definitions_.progression.xptables.es, vals[it]);
      MdM.util.log3("Character.progression.propertyPointsExpended() = " + (spent).toString());
      return spent;
    };

    /**
     * Returns the number of ES already spent.
     * @return {Number}
     */
    MdM.CharacterProgression.prototype.skillPointsExpended = function() {
      const skills = this.char.data.progression[this.char.data.progression.length-1].skills;
      var spent = 0;
      for(var it in skills) {
        if(!(skills[it].value)) skills[it].value = 0;
        spent += MdM.util.acumulateTo(definitions_.progression.xptables.skills, skills[it].value);
      }
      MdM.util.log3("Character.progression.skillPointsExpended() = " + (spent).toString());
      return spent;
    };

    /**
     * Returns the number of PM not spent yet.
     * @return {Number}
     */
    MdM.CharacterProgression.prototype.featurePointsLeft = function() {
      const xp = this.char.data.progression[this.char.data.progression.length-1].values.xp;
      const spent = this.featurePointsExpended();
      const val = (xp * definitions_.progression.numPmPerXP) + definitions_.progression.initialXp.pm - spent;
      MdM.util.log3("Character.progression.featurePointsLeft() = " + (val).toString());
      return val;
    };

    /**
     * Returns the number of ES not spent yet.
     * @return {Number}
     */
    MdM.CharacterProgression.prototype.propertyPointsLeft = function() {
      const xp = this.char.data.progression[this.char.data.progression.length-1].values.xp;
      const spent = this.propertyPointsExpended();
      const val = (xp * definitions_.progression.numEsPerXP) + definitions_.progression.initialXp.es - spent;
      MdM.util.log3("Character.progression.propertyPointsLeft() = " + (val).toString());
      return val;
    };

    /**
     * Returns the number of Skill points not spent yet.
     * @return {Number}
     */
    MdM.CharacterProgression.prototype.skillPointsLeft = function() {
      const xp = this.char.data.progression[this.char.data.progression.length-1].values.xp;
      const spent = this.skillPointsExpended();
      const val = (xp * definitions_.progression.numSkillsPerXP) + definitions_.progression.initialXp.skills - spent;
      MdM.util.log3("Character.progression.skillPointsLeft() = " + (val).toString());
      return val;
    };

    /**
     * Returns the number of Skill points not spent yet.
     * @param {String} key
     * @return {Number}
     */
    MdM.CharacterProgression.prototype.pointsLeftFor = function(key) {
      if(definitions_.features[key] !== undefined) return this.featurePointsLeft();
      if(definitions_.properties[key] !== undefined) return this.propertyPointsLeft();
      return this.skillPointsLeft();
    };

    /**
     * Returns the maximum value that a PM, ES or skill can be
     * currently increased to with the currently left points.
     * If `key` is neither a PM nor an ES, a skill is assumed.
     * @param {String} key
     * @return {Number}
     */
    MdM.CharacterProgression.prototype.currentlyReachableMaxima = function(key) {
      if((!key) || (typeof(key)!=="string")) return 0;
      key = key.toLowerCase();
      const xp = this.char.data.progression[this.char.data.progression.length-1].values.xp;
      var val, max, tbl, sum, limit=-1;
      if(definitions_.features[key] !== undefined) {
        val = this.currentValues()[key];
        max = (xp * definitions_.progression.numPmPerXP) + definitions_.progression.initialXp.pm;
        tbl =  definitions_.progression.xptables.pm;
        sum = this.featurePointsExpended();
      } else if(definitions_.properties[key] !== undefined) {
        val = this.currentValues()[key];
        max = (xp * definitions_.progression.numEsPerXP) + definitions_.progression.initialXp.es;
        tbl =  definitions_.progression.xptables.es;
        sum = this.propertyPointsExpended();
      } else {
        val = this.currentValues()[key] || 0;
        max = (xp * definitions_.progression.numSkillsPerXP) + definitions_.progression.initialXp.skills;
        tbl =  definitions_.progression.xptables.skills;
        sum = this.skillPointsExpended();
        limit = val+1; // Allow to spend the fist point to a skill that is not registered yet, and only one skill point per leveling action.
      }
      while(sum < max) {
        sum += tbl[++val];
      }
      if(sum > max) {
        --val;
      }
      if((limit>=0) && (val>limit)) val = limit;
      MdM.util.log3("Character.progression.currentlyReachableMaxima(" + key + ") = " + (val).toString());
      return val;
    };

    /**
     * Increases a PM/ES/skill from the current to a set value.
     * Returns true on success, false if this value cannot be
     * reached with the left number of xp points.
     * @param {String} key
     * @param {Number} toValue
     * @return {Boolean}
     */
    MdM.CharacterProgression.prototype.increaseTo = function(key, toValue) {
      if(toValue === undefined || isNaN(parseInt(toValue))) return false;
      key = key.toLowerCase();
      toValue = parseInt(toValue);
      if(isNaN(toValue)) return false;
      if(toValue < this.currentValues()[key]) return false;
      if(toValue > this.currentlyReachableMaxima(key)) return false;
      this.currentValues()[key] = toValue;
      if(this.currentSkills()[key]!==undefined) this.currentSkills()[key].value=toValue; // Skills have to be tracked explicitly to allow renaming them.
      this.char.recalculate();
      return true;
    };

    /**
     * Skill text editing, duplication relocates.
     */
    MdM.CharacterProgression.prototype.skillText = function(slotno, name) {
      if(!name || slotno===undefined || slotno<0) return;
      const key = MdM.util.skillKey(name);
      const skills = this.currentSkills();
      if(skills[key] === undefined) {
        skills[key] = { name: name, value: 0, slot:slotno };
      } else {
        skills[key].name = name;
        skills[key].slot = slotno;
      }
      const cleanup=[];
      for(var it in skills) {
        if((it != key) && (skills[it].value <= 0) && (skills[it].slot!==slotno)) cleanup.push(it);
      }
      cleanup.filter((it)=>{delete skills[it]});
    };

    /**
     * Removes a skill.
     */
    MdM.CharacterProgression.prototype.removeSkill = function(key) {
      const skills = this.currentSkills();
      if(skills[key] === undefined) return;
      delete skills[key];
      // Remove from vals if it is not also a PM/ES/AT.
      if(definitions_.values[key] !== undefined) return;
      delete this.currentValues()[key];
      this.char.data.values[key];
      this.char.recalculate();
    }

    Object.freeze(MdM.CharacterProgression.prototype);
    Object.freeze(MdM.CharacterProgression);
  })();

  /**
   * Apply config, "constify" objects.
   */
  (function(){
    base_config_.push(MdM.definitions.defaults());
    const configs = util.global("mdm-config",{});
    ["system", "lang", "skills", "spells" ] // Base ordered keys
      .concat(Object.keys(configs)) // add loaded
      .filter((e,p,a)=>(a.indexOf(e)===p)) // remove duplicates
      .map((config_key)=>{ // add if present
        if(configs[config_key] !== undefined) {
          base_config_.push(configs[config_key]);
          delete configs[config_key];
          MdM.util.log2("Config " + config_key + " present.");
        }
      });
    MdM.definitions.set(base_config_);
    MdM.util.log1("MdM.initialize(): Config: ", MdM.definitions.base(), "definitions_: ", MdM.util.clone(definitions_));
    // Freeze.
    Object.freeze(MdM.prototype);
    Object.freeze(MdM);
  })();
};

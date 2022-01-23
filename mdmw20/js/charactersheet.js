/**
 * @file charactersheet.js
 * @author Stefan Wilhelm (cerbero s@atwillys.de)
 * @license CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)
 */
(function(){

  /**
   * @constructor
   * @returns {CharacterStorage}
   */
  function CharacterStorage(logger) {
    const log = (logger===undefined) ? (function(){}) : logger;

    if(typeof(Storage) === "undefined" || localStorage === undefined) {
      log("storage: no storage.");
      this.enabled = false;
      this.load = function(name) { return new MdM.Character(); };
      this.save = function(char) { return this; };
      this.clear = function() { return this; };
      this.list = function() { return {}; };
      this.current = function() { return ""; };
      this.remove = function(name) { return this; };
    } else {
      var currentChar = null;
      this.enabled = true;

      /**
       * Returns the character name marked as the currently selected one.
       * OR sets a new character name.
       * @param {MdM.Character} char
       * @returns {String}
       */
      this.current = function(char) {
        if(char === undefined) {
          if(currentChar === null) {
            currentChar = localStorage.getItem("mdm-current-character");
            if(typeof(currentChar) !== "string") {
              currentChar = new MdM.Character();
              log("storage.current(): No current character saved yet, returning empty character.");
            } else {
              currentChar = (new MdM.Character()).unserialize(currentChar);
              log("storage.current(): Using serialized character '", currentChar, "'.");
            }
          }
          return currentChar;
        } else {
          const serialized = char.serialize();
          currentChar.unserialize(serialized);
          localStorage.setItem("mdm-current-character", serialized);
          log("storage.current({'" + char.name() + "'}) -> ", currentChar);
          return this;
        }
      };

      /**
       * Clear all storage data.
       */
      this.clear = function() {
        log("storage.clear() ..");
        currentChar = null;
        if(localStorage.getItem("mdm-current-character") !== undefined) {
          localStorage.removeItem("mdm-current-character");
        }
        if(localStorage.getItem("mdm-characters") !== undefined) {
          localStorage.removeItem("mdm-characters");
        }
      };

      /**
       * Save character
       * @param {type} char
       * @returns {CharacterStorage}
       */
      this.save = function(char) {
        if(!(char instanceof MdM.Character) || char.name() == "") {
          log("storage.save(): Argument is no or an unnamed character.");
          return this;
        } else {
          var all = localStorage.getItem("mdm-characters");
          if(typeof(all) !== "string") all = "{}";
          all = JSON.parse(all);
          if(!all) all = {};
          all[char.name()] = char.serialize();
          localStorage.setItem("mdm-characters", JSON.stringify(all));
          log("storage.save(): Saved '"+char.name()+"' -> ", char);
          return this;
        }
      };

      /**
       * Delete character from local storage
       * @param {String} name
       * @returns {CharacterStorage}
       */
      this.remove = function(name) {
        if(typeof(name) !== "string") return this;
        var all = localStorage.getItem("mdm-characters");
        if(typeof(all) !== "string") return this;
        all = JSON.parse(all);
        if(!all) return this;
        for(var it in all) {
          if((new MdM.Character()).unserialize(all[it]).name() === name) {
            delete all[it];
            log("storage.remove(): Removed '" + name + "'.");
            break;
          }
        }
        localStorage.setItem("mdm-characters", JSON.stringify(all));
        return this;
      };

      /**
       * Load character
       * @param {String} name
       * @returns {MdM.Character}
       */
      this.load = function(name) {
        var all = localStorage.getItem("mdm-characters");
        if(typeof(all) !== "string") return new MdM.Character();
        all = JSON.parse(all);
        if(!all) return new MdM.Character();
        if(all[name] === undefined) return new MdM.Character();
        const char = (new MdM.Character()).unserialize(all[name]);
        log("storage.load(", name, "): Loaded -> ", char);
        return char;
      };

      /**
       * List character keys.
       * @returns {Array}
       */
      this.list = function() {
        var all = localStorage.getItem("mdm-characters");
        if(typeof(all) !== "string") return [];
        all = JSON.parse(all);
        if(!all) return [];
        var ls = [];
        for(var it in all) {
          try {
            ls.push((new MdM.Character()).unserialize(all[it]).name());
          } catch(ex) {
            console.error("Failed to unserialise Character: " + ex);
          }
        }
        log("storage.list() -> ", ls);
        return ls;
      };

      /**
       * Character/system config.
       */
      this.config = function(text) {
        if(text===undefined) {
          try { text = JSON.parse(localStorage.getItem("mdm-config")); } catch { text = ""; }
          if(typeof(text) !== "string") text = "";
          log("storage: Loaded config.");
          return text;
        } else if(typeof(text) === "string") {
          text = JSON.stringify(text);
          localStorage.setItem("mdm-config", text);
          log("storage: Saved config.");
        } else {
          log("storage: Warn: no get/valid set.");
        }
      }
    }
  }

  //
  // Main
  //
  function main() {
    //
    // Initialise system and instantiate character.
    //
    var print_view = true;
    var char = new MdM.Character();
    const storage = new CharacterStorage(MdM.util.log2); // Local storage handling

    if(storage.enabled) {
      char = storage.current();
      function updateCharacterSelection() {
        const $characterSelection = $("#select-character");
        const ls = storage.list();
        $characterSelection.children("option").remove();
        for(var it in ls) $("<option>",{ val: ls[it], text: ls[it] }).appendTo($characterSelection);
        $characterSelection.val(storage.current().name());
      }
      updateCharacterSelection();
      $("#select-character").click(function(){
        char = storage.load($(this).val());
        char.recalculate();
        characterSheet.update(char);
      });
      $("#save-storage").click(function(){
        char.name($("input#character-name").val().replace(/^[\s]+/,"").replace(/[\s]+$/,""));
        storage.save(char);
        updateCharacterSelection();
      });
      $("#removefrom-storage").click(function(){
        storage.remove(char.name());
        updateCharacterSelection();
      });
      $("#clear-storage").click(function(){
        storage.clear();
      });
    } else {
      $("#clear-storage").hide();
      $("#save-storage").hide();
      $("#select-character").hide();
    }

    //
    // Progression page
    //
    const characterSheet = new MdMUI.CharacterSheet("#pm-progression", "#es-progression", "#at-progression", "#skill-progression", "#equipment-armor", "#equipment-weapons", "#current-values");

    characterSheet.progressionClicked = function(key, value, event) {
      print_view = false;
      char.progression.increaseTo(key, value);
      characterSheet.update(char);
    };

    characterSheet.skillEdited = function(slotno, key, name, event) {
      char.progression.skillText(slotno, name);
      characterSheet.update(char);
    };

    characterSheet.armorEdited = function(slotno, key, data, event) {
      char.armor(key, data);
      char.recalculate();
      characterSheet.update(char);
    };

    characterSheet.weaponEdited = function(slotno, key, data, event) {
      char.weapon(slotno, data);
      char.recalculate();
      characterSheet.update(char);
    };

    characterSheet.updated = function(char) {
      storage.current(char);
      if($("#statistics-view").is(":visible")) MdMUI.progressionTracingTable("#statistics-view", "#progression-tracing-table", char);
      MdM.util.log1("Character updated:", char.data);
      if($("input#character-name").val() === "") {
        $("#progression-page .sum").addClass("noprint");
        $(".progression-at-container .value").addClass("noprint");
        if($("#character-experience").text()==="0") {$("#character-experience").text("");}
      } else {
        $("#progression-page .sum").removeClass("noprint");
        $(".progression-at-container .value").removeClass("noprint");
      }
      if(print_view) {
        $(".progression-point-img").each(function(){
          if($(this).attr("src")==="res/skill_point_gray.svg") $(this).attr("src", "res/skill_point.svg");
        })
      }
      $("#character-copy-text").val(char.serialize());
    };

    characterSheet.configUpdate();
    characterSheet.update(char);

    //
    // UI items
    //
    (function(){
      $("input#character-name").change(function(ev){
        const name = $(this).val().replace(/^[\s]+/,"").replace(/[\s]+$/,"");
        char.name(name);
        characterSheet.update(char);
      });
      $("input#character-name").keypress(function(ev){
        if(ev.which === 13) $(this).change();
      });
      $("#character-race").change(function(){
        char.race($(this).val());
        char.recalculate();
        characterSheet.update(char);
      });

      $("#progression-add-xp-button").click(function() {
        char.progression.addExperience(1);
        char.recalculate();
        characterSheet.update(char);
      });
      $("#progression-withdraw-xp").click(function() {
        if(char.data.progression.length <= 1) {
          char.progression.resetCurrent();
        } else {
          char.data.progression.pop();
          char.recalculate();
        }
        characterSheet.update(char);
      });
      $("#progression-reset-modifications").click(function() {
        char.progression.resetCurrent();
        char.recalculate();
        characterSheet.update(char);
      });
      $("#show-config").click(function() {
        $("div#config-tuning").toggle();
        $("#statistics-view").hide();
        if($("div#config-tuning").is(':visible')) {
          $("html").css("height", ($(window).height())+"px");
          $("html").css("overflow", "hidden");
        } else {
          $("html").css("height", "");
          $("html").css("overflow", "");
        }

      });
      $("#show-stats").click(function(){
        $("#statistics-view").toggle();
        $("#config-tuning").hide();
        $("html").css("height", "");
        $("html").css("overflow", "");
        characterSheet.updated(char);
      });
      $("#character-copy-text").keypress(function(ev){
        if(ev.keyCode !== 13) return;
        const json = $("#character-copy-text").val().trim();
        if(json=="" || json.substr(0,1)!="{") return;
        characterSheet.update(new MdM.Character(JSON.parse(json)));
        $("#save-storage").click();
      });
      $("img").attr("draggable", false);
    }());

    // Config & statistics
    (function(){
      var $editor = $("textarea#config-input");
      const apply_config = function(code) {
        if(code != "") {
          var ret = {};
          try {
            code = code.replace(/[\s]+$/g, "").replace(/^[\n\r]+/, "").replace(/[\n\r]+$/, "") + "\n";
            ret = eval("(function(){return{" + code + "}})();");
            $editor.css("background-color", "#eeffee");
            $("html").css("background-color", ret["page-background"]||null);
          } catch(ex) {
            $editor.css("background-color", "#ffeeee");
            console.warn("Config Exception: ", ex);
            ret = {};
          }
          MdM.definitions.patch(ret);
          char.recalculate();
          characterSheet.configUpdate();
          characterSheet.update(char);
          return code;
        }
      };
      $("#load-config").click(function() {
        var text = storage.config();
        if(text.replace(/[\s]/g) != "") {
          text = apply_config(text);
          if(text!==undefined) $editor.val(text);
        }
      });
      $("#save-config").click(function() {
        text = apply_config($editor.val());
        if(text!==undefined) {
          $editor.val(text);
          storage.config(text);
        }
      });
      $("textarea#config-input").change(function(){
        $editor = $(this);
        if(window.update_timer === undefined) {
          window.update_timer = setTimeout(function(){ window.update_timer=undefined; apply_config($editor.val()); }, 250);
        }
      });
      $("#load-config").click();
      $("#config-tuning").hide();
      $("#statistics-view").hide();
    }());

    // Skill tooltips and autocomplete
    (function(){
      const skill_completion = (function(){
        const compl = [];
        Object.keys(MdM.definitions.get().skills).filter(function(key) {
          const name = MdM.lang.translate(key);
          compl.push({label:name, std:name});
          (MdM.lang.localizations().skillmatching[key]||[]).filter(alias=>{
            if(compl.find(e=>(e.label===alias))===undefined) compl.push({label:alias, std:name})
          });
        });
        return compl;
      })();

      $(".progression-skill-row input").each(function(){
        var $this=$(this);
        // Tooltips
        $this.tooltip({
          items: "input",
          show: { delay:1000, effect: "blind", duration:50 },
          hide: { effect: "blind", duration:50 },
          content: function() {
            const word = (""+$this.val());
            if((!word) || $this.is(":focus")) return "";
            const lemma = MdM.lang.translate(word);
            const stdterm = MdM.lang.localizedStandardLemma(word);
            const synonym = (stdterm == lemma) ? ("") : (" | &rarr; " + MdM.util.html(stdterm));
            var desc = MdM.util.html(MdM.lang.localizedDescription(lemma));
            if(lemma != "") desc = ('<span class="tooltip-caption">[' + MdM.util.html(lemma) + synonym + ']</span> <span class="tooltip-desc">' + desc + '</span>');
            return desc;
          }
        });
        // Autocomplete
        $this.autocomplete({
          minLength: 2,
          source: skill_completion,
          focus: function(ev, ui) { $this.val(ui.item.label); return false; },
          select: function(ev, ui) { $this.val(ui.item.std); return false; },
          close: function(ev, ui) { $("div.ui-helper-hidden-accessible[role=status]").children().remove(); },
        })
        .autocomplete("instance")._renderItem = function(ul, item) {
          let html = MdM.util.html(item.label);
          if(item.std!=item.label) html += ' &rarr; <span class="skill-autocomplete-stdname">' + MdM.util.html(item.std) + "</span>";
          return $("<li>").append('<span class="skill-autocomplete">' + html + '</span>').appendTo(ul);
        };
      });
    }());
  }

  $(function(){
    util.resource.load(["tabellary.md"])
    .then(function(resources) {
      MdM.initialize();
      MdM.tabellarium.apply(resources["tabellary.md"]);
      main(resources);
    });
  });

})();

/**
 * @file mdm.charactersheet.js
 * @author Stefan Wilhelm (cerbero s@atwillys.de)
 * @license CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)
 */
MdMUI = {};
MdMUI.prototype = {};

MdMUI.CharacterSheet = function(pmContainerSelector, esContainerSelector, atContainerSelector, skillContainerSelector,
                                armorSelector, weaponsSelector, currentValuesSelector, cssRootDir)
{
  const uiObject = this;
  var for_print_ = false;
  cssRootDir = cssRootDir || "res/";

  const updateFunctions = {
    "experience": function(char) {
      $("#character-experience").text(char.experience());
    },
    "race": function(char) {
      $("input#character-race").val( MdM.lang.translate(char.race()) );
      $("select#character-race").val( char.race() );
      $("span#character-race").text( MdM.lang.translate(char.race()) );
    },
    "name": function(char) {
      $("input#character-name").val(char.name());
      $("span#character-name").text(char.name());
    }
  };

  // Note: Some browsers don't print backgrounds, so CSS background-image. does not work --> images in td's.
  const img_default = cssRootDir+"skill_point.svg";
  const img_not_available = cssRootDir+"skill_point_gray.svg";
  const img_filled = cssRootDir+"skill_point_black.svg";
  const img_raceoffset_filled = cssRootDir+"skill_point_race.svg";
  const skillpoint_marker = "<img class=\"progression-point-img\" src=\""+img_default+"\"/>";

  //
  // Races
  //
  (function(){
    var $races = $("select#character-race");
    if($races.length === 0) return;
    $races.remove("option");
    var races = MdM.definitions.get().races;
    for(var it in races) {
      $("<option>",{
        val: it,
        text: MdM.lang.translate(it)
      }).appendTo($races);
    }
  })();

  //
  // PM / ES
  //
  (function(){
    const mkTable = function($container, roMin, roMax, progressionTable, indexObject) {
      $container.append("<table class=\"progression-table\"></table>");
      const $table = $container.children("table.progression-table");

      // Headers
      var s = "<tr class=\"progression-row\"><th class=\"name\"></th><th class=\"abbrev\"></th>";
      for(var i = roMax; i>0; --i) {
        s += "<th class=\"ro\"></th>";
      }
      for(var i=1; i < progressionTable.length; ++i) {
        const pg_spacing = "";//((i-1) % 5 == 0) ? " pg-spaced" : "";
        s += "<th class=\"pg"+pg_spacing+"\">" + progressionTable[i] + "</th>";
      }
      s += "</tr>";
      $table.append(s);

      // Data
      for(var it in indexObject) {
        var s = "<tr class=\"progression-row\" id=\"progression-val-"+it+"\">";
        s += "<td class=\"name\">" + MdM.lang.verbatim(it) + "</td>";
        s += "<td class=\"abbrev\">" + (it).toUpperCase() + "</td>";
        for(var i = roMax; i>0; --i) {
          s += "<td class=\"ro\" data-value=\"" + (i).toString() + "\">"+skillpoint_marker+"</td>";
        }
        for(var i=1; i < progressionTable.length; ++i) {
          const pg_spacing = ((i-1) % 5 == 0) ? " pg-spaced" : "";
          s += "<td class=\"pg"+pg_spacing+"\" data-value=\"" + (i).toString() + "\">"+skillpoint_marker+"</td>";
        }
        s += "<td class=\"sum\"></td>";
        s += "</tr>";
        $table.append(s);

        (function(it, $row){
          updateFunctions[it] = function(char) {
            var max = char.progression.currentlyReachableMaxima(it);
            var curr = char.progression.currentValues()[it];
            var offs = char.progression.raceOffsets()[it];
            $row.children("td.ro").each(function(){
              var $this = $(this);
              var val = parseInt($(this).get(0).getAttribute("data-value"));
              if(val > offs) {
                $this.removeClass("x").addClass("na");
                $this.children("img").prop("src", img_not_available);
              } else {
                $this.removeClass("na").addClass("x");
                $this.children("img").prop("src", img_raceoffset_filled);
              }
            });
            $row.children("td.pg").each(function(){
              var $this = $(this);
              var val = parseInt($(this).get(0).getAttribute("data-value"));
              if(isNaN(val) || val > max) {
                $this.removeClass("x").addClass("na");
                $this.children("img").prop("src", (!for_print_) ? img_not_available : img_default);
              } else if(val <= curr) {
                $this.removeClass("na").addClass("x");
                $this.children("img").prop("src", img_filled);
              } else {
                $this.removeClass("na").removeClass("x");
                $this.children("img").prop("src", img_default);
              }
            });
            $row.children("td.sum").text(""+(curr+offs));
          };
          $row.children("td.pg").click(function(ev){
            var $this = $(this);
            if($this.hasClass("na")) return;
            var key = it;
            var val = parseInt($this.get(0).getAttribute("data-value"));
            if(isNaN(val)) return;
            if(typeof(uiObject.progressionClicked) === "function") {
              try {
                uiObject.progressionClicked(key, val, ev);
              } catch(ex) {
                console.error("MdMUI::progressionClicked(): " + ex);
              }
            }
          });
        })(it, $table.find("#progression-val-"+it));
      }
    };
    mkTable(
      $(pmContainerSelector),
      MdM.definitions.get().progression.raceoffsets.pm.min,
      MdM.definitions.get().progression.raceoffsets.pm.max,
      MdM.definitions.get().progression.xptables.pm,
      MdM.definitions.get().features,
      MdM.lang.translate("features")
    );
    mkTable(
      $(esContainerSelector),
      MdM.definitions.get().progression.raceoffsets.es.min,
      MdM.definitions.get().progression.raceoffsets.es.max,
      MdM.definitions.get().progression.xptables.es,
      MdM.definitions.get().properties,
      MdM.lang.translate("properties")
    );
  })();

  //
  // Attributes
  //
  (function($container){
    for(var it in MdM.definitions.get().attributes) {
      const term = MdM.definitions.get().attributes[it];
      var s = "<div class=\"progression-at-container\" id=\"progression-val-" + it + "\" >";
      s += "<div class=\"name\">" + MdM.lang.verbatim(it) + "</div>";
      s += "<div class=\"plus\">+</div>";
      s += "<div class=\"offset\">0</div>";
      s += "<div class=\"equals\">=</div>";
      s += "<div class=\"value\"></div><br/>";
      s += "<div class=\"at-diceexpr\">" + term + "</div>";
      s += "<div class=\"plus-space\"></div>";
      s += "<div class=\"offset-space\"></div>";
      s += "<div class=\"equals-space\"></div>";
      s += "<div class=\"abbrev\">" + (it).toUpperCase() + "</div>";
      s += "</div>";
      $container.append(s);
      (function(it, $div){
        updateFunctions[it] = function(char) {
          $div.find("div.value").text(char.values()[it]);
          const ofs = (char.progression.raceOffsets()[it] || "");
          const $ofs = $div.find("div.offset");
          $ofs.text(ofs);
          if(!for_print_) {
            const hidden = (ofs=="")?("hidden"):("");
            $ofs.prev().css("visibility", hidden);
            $ofs.next().css("visibility", hidden);
            $ofs.parent().find(".offset-space").css("visibility", hidden);
          }
        };
      })(it, $container.children("#progression-val-" + it));
    }
  })($(atContainerSelector));

  //
  // Skills
  //
  (function($container, progressionTable, maxNumSkills){
    $container.append("<table class=\"progression-table\"></table>");
    const $table = $container.children("table.progression-table");
    // Headers
    {
      var s = "<tr><th class=\"name\"></th>";
      for(var i=1; i < progressionTable.length; ++i) {
        s += "<th class=\"pg\">" + progressionTable[i] + "</th>";
      }
      s += "</tr>";
      $table.append(s);
    }
    // Rows
    for(var skill_slot=0; skill_slot < maxNumSkills; ++skill_slot) {
      {
        var s = "<tr class=\"progression-skill-row\" id=\"progression-skill-row-"+skill_slot+"\">";
        s += "<td class=\"skill-name\"><input type=\"text\" value=\"\"/></td>";
        for(var i=1; i < progressionTable.length; ++i) {
          s += "<td class=\"pg\" data-value=\"" + (i).toString() + "\">"+skillpoint_marker+"</td>";
        }
        s += "<td class=\"sum\"></td>";
        s += "</tr>";
        $table.append(s);
      }
      (function(skill_slot, $row){
        updateFunctions["skill-"+skill_slot] = function(char) {
          const skill_text = $row.find("input").val().trim();
          const skills = char.skills();
          var skill_name="";
          var skill_key="";
          for(var it in skills) {
            if(skills[it].slot === skill_slot) {
              skill_key = it;
              skill_name = skills[it].name;
              break;
            }
          }
          var max=0, curr=0, offs=0;
          if(skill_name != "") {
            if(skill_text == "-") {
              skill_name = ""
              char.progression.removeSkill(skill_key);
            } else {
              skill_key = MdM.util.skillKey(skill_name);
              max = (char.progression.currentlyReachableMaxima(skill_key)) || 0;
              curr = (char.progression.currentValues()[skill_key]) || 0;
              offs = (char.progression.raceOffsets()[skill_key]) || 0;
            }
          }
          $row.find("input").val(skill_name);
          $row.children("td.pg").each(function(){
            var $this = $(this);
            var val = parseInt($(this).get(0).getAttribute("data-value"));
            if(isNaN(val) || (val > max)) {
              $this.removeClass("x").addClass("na");
              $this.children("img").prop("src", (!for_print_) ? img_not_available : img_default);
            } else if(val <= offs) {
              $this.removeClass("na").addClass("x");
              $this.children("img").prop("src", img_raceoffset_filled);
            } else if(val <= curr) {
              $this.removeClass("na").addClass("x");
              $this.children("img").prop("src", img_filled);
            } else {
              $this.removeClass("na").removeClass("x");
              $this.children("img").prop("src", img_default);
            }
          });
          $row.children("td.sum").text(""+(curr+offs));
        };

        var getSkillName = function(){
          return $row.find("input").val().trim();
        }
        $row.children("td.pg").click(function(ev){
          const $this = $(this);
          const skill_name = getSkillName();
          const skill_key = MdM.util.skillKey(skill_name);
          if($this.hasClass("na")) return;
          var key = skill_key;
          var val = parseInt($this.get(0).getAttribute("data-value"));
          if(isNaN(val)) return;
          if(typeof(uiObject.progressionClicked) === "function") {
            try {
              uiObject.progressionClicked(key, val, ev);
            } catch(ex) {
              console.error("MdMUI::progressionClicked(): " + ex);
            }
          }
        });
        $row.find("input").change(function(ev){
          const skill_name = getSkillName();
          const skill_key = MdM.util.skillKey(skill_name);
          if(typeof(uiObject.skillEdited) === "function") {
            try {
              uiObject.skillEdited(skill_slot, skill_key, skill_name, ev);
            } catch(ex) {
              console.error("MdMUI::skillEdited(): " + ex);
            }
          }
        });
      })(skill_slot, $table.find("#progression-skill-row-"+skill_slot));
    }
  })(
    $(skillContainerSelector),
    MdM.definitions.get().progression.xptables.skills,
    16
  );

  //
  // Armors
  //
  (function($container){
    const armor = MdM.definitions.get().armors;
    const armor_slots = Object.keys(armor);
    const armor_data = ["name"].concat(Object.keys(armor[armor_slots[0]]));

    armor_slots.filter(function(key) {
      const $row = $container.find("#armor-" + key);
      const armor_key = key;
      const armor_slot = armor_slots.indexOf(armor_key);
      var $fields = $("");
      armor_data.map((k)=>{ $fields = $fields.add($row.find(".armor-" + k)); });
      $fields.change(function(ev) {
        const armor_data = {}
        $fields.each(function(){
          const stat_key = $(this).attr("class").substr("armor-".length).toLowerCase();
          armor_data[stat_key] = $(this).val();
        });
        if(typeof(uiObject.armorEdited) === "function") {
          try {
            uiObject.armorEdited(armor_slot, armor_key, armor_data, ev);
          } catch(ex) {
            console.error("MdMUI::armorEdited(): " + ex.message, ex);
          }
        }
      });
      updateFunctions["armor-" + armor_key] = function(char) {
        const armor = char.armor(armor_key);
        if(!armor.name) {
          $fields.each(function(){ $(this).val(""); });
        } else {
          for(var key in armor) {
            const val = (armor[key]===0) ? ("") : (""+armor[key]);
            $fields.filter(".armor-" + key).val(val);
          }
        }
      }
    });

    updateFunctions["armor-total"] = function(char) {
      {
        const rs = char.values()["rs"];
        $container.find("#armor-total-rs").val((!rs) ? ("") : (rs));
      }
      {
        const be = char.values()["be"];
        $container.find("#armor-total-be").val((!be) ? ("") : (be));
      }
      {
        let rs_mod = 0;
        let rs_mods = (char.modifiers["rs"] || []).map((mod)=>{
          let val = char.calculate(mod.term, true);
          rs_mod += val;
          val = (val < 0) ? (""+val) : ("+"+val);
          return MdM.util.html(MdM.lang.translate(mod.from))+"&rarr;RS"+MdM.util.html(val)
        });
        $container.find("#armor-mods-rs").val(rs_mod||"")
        let be_mod = 0;
        let be_mods = (char.modifiers["be"] || []).map((mod)=>{
          let val = char.calculate(mod.term, true);
          be_mod += val;
          val = (val < 0) ? (""+val) : ("+"+val);
          return MdM.util.html(MdM.lang.translate(mod.from))+"&rarr;BE"+MdM.util.html(val)
        });
        $container.find("#armor-mods-be").val(be_mod||"")
        $container.find("#armor-mods-hints").html(be_mods.concat(rs_mods).join(", "));
      }
    }

  })($(armorSelector));

  //
  // Weapons
  //
  (function($container, weapon_slots){
    const $template = $container.find(".weapon").remove();
    for(var slot_no=0; slot_no<weapon_slots.length; ++slot_no) {
      (function(slot_no, $block){
        const weapon_slot = weapon_slots[slot_no];
        $block.attr("id", weapon_slot);
        $block.appendTo($container);
        const $weapon = $container.find("#"+weapon_slot);
        const $fieldSelector = $weapon.find("input,select");
        const fields = [];
        $fieldSelector.each(function(){
          fields.push([
            $(this).parent().attr("class").replace(/^weapon-/,""),
            $(this)
          ]);
        });
        $fieldSelector.change(function(ev){
          const weapon_data = Object.fromEntries(fields.map(field=>[ field[0], field[1].val() ]));
          if(typeof(uiObject.weaponEdited) === "function") {
            try {
              uiObject.weaponEdited(slot_no, weapon_slot, weapon_data, ev);
            } catch(ex) {
              console.error("MdMUI::weaponEdited(): " + ex.message, ex);
            }
          }
        });
        updateFunctions["w-"+weapon_slot] = function(char) {
          const weapon = char.weapon(slot_no);
          fields.map(field=>{
            const key = field[0];
            const val = (weapon[key]===undefined) ? ("") : (weapon[key]);
            field[1].val(""+val);
          });
        }
      })(
        slot_no, $template.clone()
      );
    }
  })($(weaponsSelector), ["weapon-1","weapon-2","weapon-3"]);

  //
  // Current values
  //
  (function($container){
  })($(currentValuesSelector));

  //
  // Misc data representations
  //
  (function(){
    updateFunctions["xp"] = function(char) {
      $("#progression-val-xp").text(char.values()["xp"]);
    };
    updateFunctions["pm-left"] = function(char) {
      $("#progression-val-pm-left").text(char.progression.featurePointsLeft());
    };
    updateFunctions["es-left"] = function(char) {
      $("#progression-val-es-left").text(char.progression.propertyPointsLeft());
    };
    updateFunctions["skills-left"] = function(char) {
      $("#progression-val-skills-left").text(char.progression.skillPointsLeft());
    };
    updateFunctions["pm-spent"] = function(char) {
      $("#progression-val-pm-spent").text(char.progression.featurePointsExpended());
    };
    updateFunctions["es-spent"] = function(char) {
      $("#progression-val-es-spent").text(char.progression.propertyPointsExpended());
    };
    updateFunctions["skills-spent"] = function(char) {
      $("#progression-val-skills-spent").text(char.progression.skillPointsExpended());
    };
  })();

  /**
   * Print view setter/getter. The printing view
   * modifies some elements and CSS classes to
   * improve printouts.
   * @param {boolean|undefined} is_print
   * @returns {boolean}
   */
  this.printView = function(is_print) {
    for_print_ = (is_print===true);
    if(for_print_)
    return for_print_;
  }

  /**
   * Updates the progression page.
   * @param {MdM.Character} char
   * @param {String} what
   * @returns {undefined}
   */
  this.update = function(char, what) {
    if(updateFunctions[what] !== undefined) {
      if(!Array.isArray(updateFunctions[what])) {
        updateFunctions[what](char);
      } else {
        updateFunctions[what].filter(fn=>fn(char));
      }
    } else {
      for(var it in updateFunctions) {
        if(!Array.isArray(updateFunctions[it])) {
          updateFunctions[it](char);
        } else {
          updateFunctions[it].filter(fn=>fn(char));
        }
      }
    }
    if(typeof(this.updated) === "function") {
      try {
        this.updated(char, what);
      } catch(ex) {
        console.error("MdMUI::updated(char) exception: " + ex.message, ex);
      }
    }
  };

  /**
   * Update the page according to settings.
   */
  this.configUpdate = function() {
    for(var it in MdM.definitions.get().attributes) {
      const diceexpr = MdM.definitions.get().attributes[it];
      $(atContainerSelector).find("#progression-val-" + it).find(".at-diceexpr").text(diceexpr);
    }
    (function(){
      const localization_keys = Object.keys(MdM.lang.localizations().translations);
      const skill_keys = Object.keys(MdM.definitions.get().skills)
    }());
  }

  /**
   * Callback for PM / ES progrssion point clicks.
   * @param {String} key
   * @param {Number} value
   * @param {HTMLEvent} event
   * @returns {undefined}
   */
  this.progressionClicked = function(key, value, event) {
  };

  /**
   * Callback for Skill text changes.
   */
  this.skillEdited = function(slotno, key, name, event) {
  };

  /**
   * Callback for Armor element changes.
   */
  this.armorEdited = function(slotno, key, data, event) {
  };

  /**
   * Callback, invoked when this character view was updated.
   * @param {MdM.Character} char
   * @param {String} what
   * @returns {undefined}
   */
  this.updated = function(char, what) {
  };

};

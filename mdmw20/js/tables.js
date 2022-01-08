/**
 * @file tables.js
 * @author Stefan Wilhelm (cerbero s@atwillys.de)
 * @license CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)
 */
(function(){

  const tr = (text)=>MdM.util.html(MdM.lang.translate(text));

  const markdown_options = {
    with_tables:true
  };

  const fill_in = (html, kv_repl) => html.replace(/[^\\][\$][\w-]+/g, m=>{
    const key = m.substr(2);
    if(kv_repl[key]===undefined) return m[0];
    if(key==="desc") return m[0] + util.mdconverter.convert(kv_repl[key], markdown_options);
    return m[0] + MdM.util.html(kv_repl[key]);
  });

  const add_table_page = function(table_key, header_text) {
    table_key = (table_key || (header_text.toLowerCase())).replace(/[^\w]/g,"");
    const key = ""+table_key;
    const html = ''
      + '<div class="page infinite-page"><div class="page-frame">\n'
      + '<h2><a name="'+key+'">'+MdM.util.html(header_text)+'</a></h2>\n'
      + '<section><div id="'+key+'"></div></section>\n'
      + '</div></div>\n';
    $("body").append(html);
    return $("body").find("div#"+key);
  }

  const add_table_section = function($container, prefix, section, section_prefix) {
    section_prefix = section_prefix || "";
    let section_key = MdM.lang.findLocalizationKey(section);
    if(section_key == "") section_key = section.toLowerCase().replace(/[^\w-]/g,"").replace(/--/g,"-").replace(/[-]+$/,"");
    const key = prefix + "-table-" + section_key
    const html = ''
      + '<section>\n'
      + ' <h3><a name="'+key+'">'+MdM.util.html(section_prefix+section)+'</a></h3>\n'
      + ' <div id="'+key+'"></div>\n'
      + '</section>\n';
    $container.append(html);
    return $container.find("#"+key);
  }

  const scroll_to = function($element) {
    //{ $([document.documentElement, document.body]).animate({scrollTop: $element.first().offset().top}, 10); };
  };

  const generic_table = function($container, prefix, head_data_keys, body_data_keys, data) {
    if(data===undefined) return {};
    try {
      const head_data_template = head_data_keys.map((k)=>(
        '<span class="'+prefix+'-entry-'+k+'">$'+k+'</span> '
      )).join("");
      const body_data_template = body_data_keys.map((k)=>(
        '<tr><td class="'+prefix+'-entry-'+k+'-key">'+MdM.lang.translate(prefix+"-"+k)+':</td><td class="'+prefix+'-entry-'+k+'">$'+k+'</td></tr>'
      )).join("");
      const entries = data.map((entry)=>fill_in(""
        +'<div class="entry '+prefix+'-entry">'
        + '<div class="entry-head '+prefix+'-entry-head">'
        +  '<span class="entry-name '+prefix+'-entry-name">$name</span> ' + head_data_template
        + '</div>'
        + '<table class="entry-data '+prefix+'-entry-data">' + body_data_template + '</table>'
        + '<div class="entry-desc '+prefix+'-entry-desc">$desc</div>'
        +'</div>',
        entry
      ));
      $container.append(entries.join(""));
    } catch(ex) {
      MdM.util.error("Failed to generate table '"+prefix+"', error: " + ex.message, ex);
    }
    $container.find("span:empty").remove();
    $container.find("td:empty").parent().remove();
    $container.find(":empty").remove();
  }

  const sectioned_table = function($container, prefix, head_data_keys, body_data_keys, data, section_prefix) {
    section_prefix = section_prefix || "";
    const sections = [];
    data.filter(e=>{ if((e.section) && (sections.indexOf(e.section)<0)) sections.push(e.section); });
    if(sections.length==0) {
      generic_table($container, prefix, head_data_keys, body_data_keys, data);
    } else {
      sections.filter((section)=>{
        const $section_container = add_table_section($container, prefix, section, section_prefix);
        const section_data = data.filter(e=>(e.section===section));
        generic_table($section_container, prefix, head_data_keys, body_data_keys, section_data);
      });
    }
  }

  const preprocessors = {

    "spells": function(data) {
      if(data===undefined) return;
      const spell_levels = ["0","I","II","III","IV","V","VI","VII","VIII","IX","X"];
      const spells = data
        .sort((spell1,spell2)=>((spell1.level||0)-(spell2.level||0)))
        .map((spell)=>{
          spell = MdM.util.clone(spell);
          spell.level = spell_levels[Math.min(9, Math.max(0, spell.level||0))];
          return spell;
        });
      return spells;
    },

    "playable-races": function(descriptions, sort) {
      if(descriptions===undefined) return;
      sort = sort || false;
      const defs = MdM.definitions.get()
      let races = Object.entries(defs.races).map(race=>{
        let ro = race[1];
        race = {key:race[0]};
        race.name = MdM.lang.translate(race.key);
        race.stdname = MdM.lang.localizedStandardLemma(race.key);
        race.desc = (()=>{
          let desc = descriptions.find((e)=>(race.name.toLowerCase()===e.name.toLowerCase()));
          if(desc!==undefined) return desc.desc;
          desc = MdM.lang.localizedDescription(race.key);
          if(desc!="" && desc!=race.key) return desc;
          return undefined;
        })();
        race.pm = ["k","m","b","g","i","c"].map((pm)=>(pm.toUpperCase()+":"+ro[pm])).join(" ");
        race.es = ["kr","gw","gs","re","wa","in","ma","ke","wi","mn","wk","au"].map((es)=>(es.toUpperCase()+":"+ro[es])).join(" ");
        race.at = ["lp","mp","ap","rf","mr","ns","nm","nl","nw","rlp","rmp",/*"hn","ab",*/"mu","ff","pa"].map((at)=>(at.toUpperCase()+":"+ro[at])).join(" ");
        Object.keys(defs.values).filter(k=>{delete ro[k]});
        race.fk = Object.keys(ro).map((fk)=>(tr(fk)+":"+ro[fk])).join(" ");
        return race;
      }).filter((race)=>{
        return (race.key != "no-race");
      });
      if(sort) {
        races = races.sort((rc1, rc2)=>(rc1.name.localeCompare(rc2.name)));
      }
      return races;
    }
  };

  $(function(){
    util.resource.load(["tabellary.md"])
    .then(function(resources) {
      MdM.initialize();
      $("#editor-box").text(resources["tabellary.md"].replace(/\t/g,"  ").replace(/\s+$/g,"").replace(/^\s*<!--/,"").replace(/-->\s*$/,"").replace(/[\r]+[\n]/,"\n").replace(/^\n+/,"\n"));
      const all_tables = MdM.tabellarium.fromMarkdown($("#editor-box").text());
      const tabellary_specs = MdM.definitions.get().tabellarium;
      Object.keys(all_tables).filter(function(table_key) {
        const table = all_tables[table_key];
        const table_spec = tabellary_specs.find((spec)=>(spec.table===table_key)) || {};
        const $container = add_table_page(table_key+"-table", table.header);
        if(preprocessors[table_key] !== undefined) table.entries = preprocessors[table_key](table.entries);
        sectioned_table($container, table_spec.prefix||table_key, table_spec.head_keys||[], table_spec.data_keys||[], table.entries, table_spec.section_prefix||"");
      });
      // Search filter, section selection
      (function(){
        const $filter_textbox = $("#table-filter-text");
        const $filter_select = $("#table-filter-section");
        const $pages = $("div.page");
        const $entries = $pages.find(".entry");
        const $sections = $pages.find("section");
        const $section_headers = $pages.find("h2");
        const $table_headers = $pages.find("h3");

        const update_filter = function() {
          $(".page").unhighlight();
          $entries.show();
          $sections.show();
          $section_headers.show();
          $pages.show();
          const filter_text = $filter_textbox.val();
          const search_text = filter_text.replace(/[^\w\d\s_-]/ig,".").replace(/\s+/g," ").trim();
          if(search_text.length > 2) {
            const search_re = new RegExp(search_text, "i");
            $entries.filter(function() { return $(this).text().search(search_re) < 0; }).hide();
            $sections.filter(function() { return $(this).find(".entry:visible").length < 1 }).hide();
            $pages.filter(function(){ return ($(this).text().search(search_re) < 1) && !$(this).next("section").is(":visible")}).hide();
            $(".page").highlight($filter_textbox.val());
          }
          const section_selection = $filter_select.val();
          if(section_selection != "") {
            const $section_match = $section_headers.filter(function(){ return $(this).text()===section_selection; }).parents("div.page");
            if($section_match.length > 0) {
              $section_match.siblings("div.page").hide();
              scroll_to($section_match);
            } else {
              const $table_match = $table_headers.filter(function(){ return $(this).text()===section_selection; }).parents("section");
              if($table_match.length > 0) {
                $table_match.siblings("section").hide();
                $table_match.parents("div.page").siblings("div.page").hide();
                scroll_to($section_match);
              }
            }
          }
        };

        // Init
        (function(){
          {
            // Section range
            $filter_select.children("option").remove();
            $("<option>",{ val:"", text:"Alle Tabellen" }).appendTo($filter_select);
            $("h2,h3").each(function(){ const text = $(this).text().trim(); $("<option>",{ val:text, text:text }).appendTo($filter_select); });
            $filter_select.val("");
            $filter_select.change(update_filter);
          }
          {
            // Search text box
            $filter_textbox.change(update_filter);
            $filter_textbox.keyup(update_filter);
            $filter_textbox.keydown(function(ev){
              if(ev.keyCode==27) { $filter_textbox.val(""); update_filter(); }
              if(ev.keyCode==13) { update_filter(); }
            });
            $filter_textbox.focus();
            $(document).bind('keydown', function(ev) { if(ev.ctrlKey && ev.key=="f") { ev.preventDefault(); $filter_textbox.focus(); } });
          }
        })();
      })();
    });
  })
})();

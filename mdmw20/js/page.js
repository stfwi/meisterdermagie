/**
 * @file page.js
 * @author Stefan Wilhelm (cerbero s@atwillys.de)
 * @license CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)
 */
$(function(){
  MdM.initialize();
  const path = $("#content-location").val();
  util.resource.load([path])
  .then(function(resources) {
    const markdown_options = { with_tables:true };
    let pages = resources[path]
      .replace(/\s+$/g,"").replace(/^\s*<!--/,"").replace(/-->\s*$/,"").replace(/\r\n/g,"\n")
      .split(/(\n#\s[^\n]+)/mg)
      .map(page=>page.replace(/[\n\s]+$/,"").replace(/^[\n]+/,""))
      .filter(page=>(page!==""))
      ;
    for(var i=1; i<pages.length; ++i) {
      if(pages[i].search(/^#\s/)!==0) {
        pages[i] = pages[i-1] + "\n" + pages[i];
        pages[i-1] = "";
      }
    }
    pages = pages
      .filter(page=>(page!==""))
      .map(page=>(""
          + '<div class="page infinite-page"><div class="page-frame">'
          +  util.mdconverter.convert(page, markdown_options)
          + '</div></div>')
      );

    $("body").append(pages);

    // Search filter, section selection
    (function(){
      const $filter_textbox = $("#table-filter-text");
      const $filter_select = $("#table-filter-section");
      const $pages = $("div.page");
      const $headers = $pages.find("h1,h2");
      const $contents = $("div.page-frame").children();
      const $all = $pages.add($headers).add($contents);
      const $none = $([]);

      const logical_parents = function($elements) {
        let $parents = $([]);
        $elements.each(function(){
          let $element = $(this);
          $parents = $parents.add($element.parents());
          if($element.length == 0) return $parents;
          if(!$element.is(":header")) {
            $element = $element.prevAll(":header").first();
            $parents = $parents.add($element);
            if($element.length == 0) return $parents;
          }
          let h_index = parseInt($element.prop("tagName").toLowerCase()[1]);
          while((--h_index) > 0) {
            const $e = $element.prevAll("h"+h_index).first();
            if($e.length == 0) continue;
            $element = $e;
            $parents = $parents.add($element);
          }
        })
        return $parents;
      };

      const update_filter = function() {
        $(".page").unhighlight();
        const filter_text = $filter_textbox.val();
        const $section_shown = (function() {
          const section_selection = $filter_select.val().replace(/^[\s-]+/, "");
          if(section_selection == "") return $all;
          const $match = $headers.filter(function(){ return ($(this).text() == section_selection); });
          if($match.length == 0) return $all;
          const tag = $match.prop("tagName").toLowerCase();
          let $show = $match;
          if(tag == "h1") {
            return $show.add($match.parents()).add($match.nextUntil("h1"));
          } else if(tag == "h2") {
            return $show.add($match.parents()).add($match.nextUntil("h2")).add($match.prevAll("h1").first());
          } else {
            MdM.util.warn("Unknown selection tag '"+tag+"', showing all.");
            return $all; // error -> no filter, show all.
          }
        })();
        const $filter_shown = (function(){
          const search_text = filter_text.replace(/[^\w\d\s_-]/ig,".").replace(/\s+/g," ").trim();
          if(search_text.length < 3) return $section_shown;
          const search_re = new RegExp(search_text, "i");
          const $match = $section_shown.filter(function(){ return ($(this).text().search(search_re) >= 0); });
          if($match.length == 0) return $none;
          let $show = $match.add(logical_parents($match));
          $match.each(function(){
            const $e = $(this);
            const tag = $e.prop("tagName").toLowerCase();
            if(tag[0] == "h") {
              const tags = [];
              for(let i=parseInt(tag[1]); i>0; --i) tags.push("h"+i);
              $show = $show.add($e.nextUntil(tags.join(",")));
            }
          })
          return $show;
        })();
        if($filter_shown.length > 0) {
          $all.hide();
          $filter_shown.show();
          if(filter_text.length>2) $(".page").highlight($filter_textbox.val());
        } else {
          $all.hide();
        }
      };

      // Init
      {
        // Section range
        $filter_select.children("option").remove();
        $("<option>",{ val:"", text:"Alle Abschnitte" }).appendTo($filter_select);
        $headers.each(function(){
          let text = $(this).text().trim();
          if($(this).is("h2")) text = "- " + text;
          $("<option>",{ val:text, text:text }).appendTo($filter_select);
        });
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
      }
      {
        // Document tuning.
        $("img").attr("draggable", false);
        $(document).bind('keydown', function(ev) { if(ev.ctrlKey && ev.key=="f") { ev.preventDefault(); $filter_textbox.focus(); } });
      }
    })();

    // Word definition hints
    (function(){
      $("div.page").annotate({ data: MdM.util.clone(MdM.lang.abbreviations(true)) });
      //$("div.page abbr").tooltip({ show: { effect: "blind", duration: 100 }, hide: { duration: 50 } });
    })();

  });
});

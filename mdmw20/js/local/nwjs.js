;"use strict";
(function(){
  if((window.nw===undefined) || window.nw.App===undefined) return;

  // Force App close on window close.
  {
    const win = nw.Window.get();
    win.on('close', function() {
      try {nw.App.clearCache();} catch{};
      nw.App.quit();
    });
  }

  // Context menu
  {
    const menu = new nw.Menu();
    menu.append(new nw.MenuItem({ label: 'Reload', click: function(){
      nw.Window.get().reloadIgnoringCache();
    }}));
    //menu.append(new nw.MenuItem({ type: 'separator' }));
    if($("#character-copy-text").length > 0) {
      menu.append(new nw.MenuItem({ label: 'Character to Clipboard', click: function(){
        const json = $("#character-copy-text").val();
        console.log(json)
        nw.Clipboard.get().set(json, "text");
      }}));
    }
    document.body.addEventListener('contextmenu', function(ev) { ev.preventDefault(); menu.popup(ev.x, ev.y); return false; }, false);
  }

  // Keybinds
  {
    const win = nw.Window.get();
    $(document).bind('keydown', function(ev) {
      if(ev.code=="F5") {
        ev.preventDefault();
        win.reloadIgnoringCache();
        return;
      }
      if(ev.code=="F12") {
        ev.preventDefault();
        (win.showDevTools!==undefined) && win.showDevTools();
        return;
      }
      if(ev.ctrlKey) {
        if(ev.key=="p") {
          ev.preventDefault();
          console.log("Print ...");
          win.print({
            autoprint: false,
            silent: false,
            landscape: false,
            headerFooterEnabled: false,
            shouldPrintBackgrounds: true,
            mediaSize: { name:"A4"},
            marginsType: 0, // default
            copies:1,
            headerString:"",
            footerString:"",
          });
          return;
        }
      }
    });
  }

  // Unified resource loading override.
  {
    if(window.util===undefined) window.util = {};
    window.util.resource = {
      load: function(paths) {
        if(!Array.isArray(paths)) paths = [paths];
        const responses = {};
        paths.map((path)=>{
          try {
            const localpath = (nw.App.startPath + "/content/") + (path.replace(/[^\w\-\.\/_]/ig,"").replace(/^[\/]+/,"").replace(/\.\./g,"").replace(/^content\//,""));
            responses[path] = nw.require('fs').readFileSync(localpath, {encoding:'utf8'});
          } catch(ex) {
            console.error("Resource load exception: ", ex);
          }
        });
        return $.when().pipe(function(){ return responses; });
      },
      save: function(path, content) {
        console.info("resource.save() not available for remotes.");
        return $.when().pipe(function(){ return ""; });
      },
      commit: function(path, content) {
        console.info("resource.commit() not available for remotes.");
        return $.when().pipe(function(){ return ""; });
      },
      list: function(path) {
        return $.when().pipe(function(){ return []; });
      }
    }
    Object.freeze(window.util.resource);
  }

  // Zoom
  {
    const win = nw.Window.get();
    window.addEventListener('wheel', function (evt) {
      if(!evt.ctrlKey) return;
      win.zoomLevel = Math.min(2.5, Math.max(-3.0, win.zoomLevel + ((evt.deltaY<0) ? 0.5 : (-0.5))));
      localStorage.window_zoom_level = win.zoomLevel;
    });
    if(localStorage.window_zoom_level) {
      win.zoomLevel = parseFloat(localStorage.window_zoom_level);
    }
  }

})();

/**
 * @file mdm.development.js
 * @author Stefan Wilhelm (cerbero s@atwillys.de)
 * @license CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)
 */
if(window.MdMUI===undefined) MdMUI={};

MdMUI.progressionTracingTable = function(containerSelector, tableId, char, keyList)
{
  const $container = $(containerSelector);
  char = new MdM.Character(char.data);
  var $table = $container.find(tableId);
  if($table.length == 0) {
    $container.append("<table id=\""+(tableId.replace(/^#/,""))+"\"></table>");
    $table = $container.find(tableId);
  }
  $table.children().remove();
  const progression_history = char.data.progression;
  char.data.progression = [];

  var keys = [];
  if(keyList) {
    keys = keys.concat(keyList);
  } else {
    keys = keys.concat(["xp","pm+","es+","sk+", ""])
               .concat(Object.keys(MdM.definitions.get().features))
               .concat([""])
               .concat(Object.keys(MdM.definitions.get().properties))
               .concat([""])
               .concat(Object.keys(MdM.definitions.get().attributes))
               ;
  }
  var prev = {};
  var s = "<tr>" + keys.map((key)=>"<th"+((!key)?(' class="spacing"'):(""))+">"+(key.toUpperCase())+"</th>") + "</tr>";
  const row = function() {
    char.progression.addExperience(0);
    s += "<tr>" + keys.map((key)=>{
      var val = ""+(Number.isInteger(char.values()[key]) ? (char.values()[key]) : ("?"));
      if(val=="?") {
        if(key=="pm+") val = "" + char.progression.featurePointsLeft();
        if(key=="es+") val = "" + char.progression.propertyPointsLeft();
        if(key=="sk+") val = "" + char.progression.skillPointsLeft();
      } else if(key=="xp") {
        const dat = Object.fromEntries(
          Object.entries(MdM.util.clone(char.values()))
            .map((e)=>[ e[0].toLowerCase().replace(/[^a-z]/g,""), e[1]])
            .filter((e)=>(e[0]!=""))
        );
        const ued = JSON.stringify(dat).replace(/[\{\}"]/g,"");
        val='<a target="_blank" rel="noopener noreferrer" href="histogram.html?data='+encodeURI(ued)+'">'+val+'</a>';
      }
      var cls = "";
      if(key==="") {
        cls = "spacing";
        val = "";
      } else if(prev[key]===undefined) {
        prev[key] = val;
      } else if(prev[key]!=val) {
        cls = "changed";
        prev[key] = val;
      } else {
        cls = "unchanged";
      }
      if(cls != "") cls=' class="' + cls + '"';
      if(val=="0") val="";
      return "<td"+cls+">"+val+"</td>";
    }) + "</tr>";
  }
  while(progression_history.length > 0) {
    char.data.progression.push(progression_history.shift());
    row();
  }
  $table.append(s);
};

MdMUI.LiveHistogram = function(graphSelector, countSelector, errorSelector) {
  const $graph = $(graphSelector);
  const $count = $(countSelector);
  const $error = $(errorSelector);
  const colormap = [ "darkgreen", "darkgreen", "orange", "darkred" ];
  const me = this;
  var timer_ = null;
  var accumulated_ = true;
  var threshold_ = 0;
  var deviation_ = 0;
  var plot_ = null;

  $graph.bind("plotclick", (event, pos, item)=>{if(plot_!=null) me.click(plot_, item, pos.pageX, pos.pageY)});
  $graph.bind("plothover", (event, pos, item)=>{if(plot_!=null) me.hover(plot_, item, pos.pageX, pos.pageY)});

  const plot = function(data){
    if(data===undefined) data={};
    const opts = {
      series: { bars: { show: true, barWidth: 0.9, align: "center" } },
      xaxis: { mode: "categories", tickLength: 0 },
      yaxis: { tickLength: 0, tickFormatter: (v, axis)=>(v+"%"), min:0 },
      grid: { clickable: true, hoverable:true, autoHighlight:true, markings:[] }
    }
    if(threshold_ > 0) {
      opts.grid.markings.push({ yaxis: { from: -1, to:threshold_ }, color: "rgba(255,100,100,0.2)" });
    }
    if(deviation_ > 0) {
      let ab = Object.entries(data);
      for(let i=0; i<ab.length; ++i) ab[i].push(i);
      ab = ab.sort((kv1,kv2)=>(kv2[1]-kv1[1]));
      let acc = 0;
      let min_probability = 0;
      for(let i=0; i<ab.length && acc<deviation_; ++i) { acc += ab[i][1]; min_probability = Math.round(ab[i][1]); }
      ab = ab.map(kv=>[kv[0],Math.round(kv[1]),kv[2]]).filter(kv=>(kv[1]>=min_probability));
      if(ab.length > 0) {
        ab = ab.sort((v1,v2)=>v1[2]-v2[2]).map(kv=>kv[2]);
        const ranges = [{min:ab[0], max:ab[0]}];
        while(ab.length > 0) {
          const abi = ab.shift();
          if(abi <= ranges[ranges.length-1].max) {
            ranges[ranges.length-1].max = abi;
          } else {
            ranges.push({min:abi, max:abi});
          }
        }
        ab = undefined;
        ranges.filter(range=>{
          opts.grid.markings.push({ xaxis: { from: range.min-0.5, to:range.max+0.5 }, color: "rgba(100,255,100,0.2)" });
        });
      }
    }

    const xy = Object.entries(data);
    var maxyy = (!xy.length) ? (0) : (xy[xy.length-1][1]);
    var maxyx = 0;
    for(let i=xy.length-2; i>=0; --i) {
      if(xy[i][1] > maxyy) {
        maxyy = xy[i][1];
        maxyx = i;
      }
      if(accumulated_) xy[i][1] += xy[i+1][1];
    }
    if(accumulated_) opts.yaxis.max = 100;
    opts.grid.markings.push({ xaxis: { from: maxyx, to:maxyx }, color: "rgba(100,255,100,0.4)" });
    plot_= $.plot(graphSelector, [xy], opts);
  };

  const onerror = (text)=>{
    $error.text(text);
    me.stop();
    $graph.hide();
  }

  const stats = new MdM.calc.DiceStatistics(plot, undefined, undefined, undefined, undefined, onerror);

  const updateCallback = function() {
    if($error.text() != "") return;
    const r = stats.refine();
    $count.text(stats.nCalculated);
    $count.css("color", colormap[Math.max(0, Math.min(3, Math.floor(stats.error / (stats.breakCondition||1))))]);
    if(!r) { MdM.util.log1(stats); plot(stats.stats[0]); return; }
    if(timer_) timer_ = setTimeout(updateCallback, 0);
  };

  this.substitutions = function(sub) {
    if(sub===undefined) return stats.propertyObject;
    if(typeof(sub)==="object") sub = JSON.stringify(sub);
    if((typeof(sub)!=="string")) throw new Error(MdM.util.error("Invalid diceexpr parameter substitution no string nor object."));
    sub = sub.trim();
    stats.propertyObject = (sub=="") ? {} : Object.fromEntries((sub)
      .replace(/[\n\r]/g, " ")
      .replace(/[\s]/g, ",")
      .replace(/[:=]+/g, ":")
      .replace(/[;,]+/g, ",")
      .replace(/[,]+$/g, "")
      .replace(/[^\d\w:,]/g, "")
      .split(/,/)
      .map(s=>{
        const m = s.match(/^([\w]+)[:]([\d]+[\.]?[\d]*)$/);
        if(!m) throw new Error("Invalid diceexpr parameter substitution: '"+s+"'");
        const v = parseFloat(m[2]);
        if(isNaN(v)) throw new Error("Invalid diceexpr parameter substitution (value is NaN): '"+s+"'");
        return [ m[1], v ];
      })
    );
    return this;
  }

  this.stats = function() {
    return stats;
  }

  this.clear = function() {
    this.stop();
    stats.reset();
    plot_ = null;
  }

  this.stop = function() {
    if(timer_) clearTimeout(timer_);
    timer_ = null;
  }

  this.start = function(diceexpr, accumulated, threshold, deviation) {
    deviation_ = Math.max(0, Math.min(99, (deviation||0)));
    threshold_ = Math.max(0, Math.min(99, (threshold||0)));
    accumulated_ = !!accumulated;
    if(diceexpr===undefined) diceexpr = "";
    this.stop();
    stats.diceexpr = diceexpr;
    $count.text("0");
    $error.text("");
    $graph.show();
    $count.show();
    try {
      stats.reset();
      timer_ = setTimeout(updateCallback, 0);
    } catch(ex) {
      $error.text(""+ex);
    }
  };

  this.click = function(x, y, item) {
  }

  this.hover = function(plot, item, x, y) {
    var $label = plot.getPlaceholder().find("#tracklabel");
    if($label.length==0) {
      plot.getPlaceholder().append('<div id="tracklabel"></div');
      $label = plot.getPlaceholder().find("#tracklabel");
      $label.css({ position: 'absolute', display: 'block', left: 0, top: 0, width:50, height:20 });
    }
    if(!item) {
      $label.html("");
      $label.hide();
    } else {
      const ofs = plot.pointOffset({x:item.datapoint[0], y:item.datapoint[1]});
      ofs.top -= 22;
      ofs.left -= 25;
      if(ofs.top < 10) ofs.top += 25;
      $label.text(""+ item.datapoint[1].toFixed(1) + "%");
      $label.css({ left: ofs.left, top: ofs.top });
      $label.show();
    }
  }
}

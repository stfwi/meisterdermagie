/**
 * @file histogram.js
 * @author Stefan Wilhelm (cerbero s@atwillys.de)
 * @license CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/)
 */
$(document).ready(function() {
  const $term = $("#live-histogram-diceexpr");
  const $substitutions = $("#live-histogram-substitutions");
  const $accumulate = $("#live-histogram-accumulated");
  const $threshold = $("#live-histogram-threshold");
  const $deviation = $("#live-histogram-deviation");
  const $error = $("#error");

  MdM.initialize();
  const hist = new MdMUI.LiveHistogram("#live-histogram", "#count", "#error");
  const run = function(ev) {
    if((ev!==undefined) && (ev.keyCode!==undefined) && (ev.keyCode !== 13)) return;
    try {
      const data = {
        diceexpr:$term.val(),
        accumulate:$accumulate.is(':checked'),
        substitutions:$substitutions.val(),
        threshold:(parseInt($threshold.val())||0),
        deviation:(parseInt($deviation.val())||0)
      };
      $threshold.val( (data.threshold = Math.max(0, Math.min(99, data.threshold))) );
      $deviation.val( (data.deviation = Math.max(0, Math.min(99, data.deviation))) );
      hist.substitutions(data.substitutions);
      hist.start(data.diceexpr, data.accumulate, data.threshold, data.deviation);
      localStorage.setItem("mdm-stat-diceexpr", JSON.stringify(data));
      $substitutions.val(JSON.stringify(hist.substitutions()).replace(/[\s{}"]/g,""));
      $substitutions.css("background-color", "");
    } catch(ex) {
      $error.text(ex.message);
      $substitutions.css("background-color", "#ffdddd");
    }
  }
  $term.keydown(run);
  $substitutions.keydown(run);
  $threshold.keydown(run);
  $deviation.keydown(run);
  $accumulate.change(run);

  // Help/trace
  (function(){
    $("#help-link").click(()=>{ $("#help-section").show(); $("#help-link").remove(); });
    $("#tracelevel").change(()=>{ util.traceLevel(parseInt($("#tracelevel").val())); })
    $("#tracelevel").val(util.traceLevel());
  })();

  // Arguments
  (function(){
    const params = (()=>{
      try {
        const uri_params = util.uriArguments();
        if(uri_params.expression!==undefined) uri_params.expression = (""+uri_params.expression).trim();
        if(uri_params.accumulate!==undefined) uri_params.accumulate = ((""+parseInt(uri_params.accumulate).trim())!=0);
        if(uri_params.substitutions!==undefined) uri_params.substitutions = (""+uri_params.substitutions).trim();
        if(uri_params.constants!==undefined) uri_params.substitutions = (""+uri_params.constants).trim();
        if(uri_params.data!==undefined) uri_params.substitutions = (""+uri_params.data).trim();
        if(uri_params.threshold!==undefined) uri_params.threshold = parseInt(uri_params.threshold)||0;
        if(uri_params.deviation!==undefined) uri_params.deviation = parseInt(uri_params.deviation)||0;
        uri_params.ok = true;
        return uri_params
      } catch(ex) {
        $error.text("Applying URL query string failed: " + ex.message);
        return {ok:false};
      }
    })();
    // Defaults, or last used from browser db.
    let data={}
    try { data = JSON.parse(localStorage.getItem("mdm-stat-diceexpr")); } catch{};
    if(typeof(data)!=='object') data={};
    if(data.diceexpr===undefined) data.diceexpr = "1w6+4";
    if(data.accumulate===undefined) data.accumulate = false;
    if(data.substitutions===undefined) data.substitutions = "K=7,M:9;B:10,G:5,I:5;C:7,KR:11"
    try { if(data.threshold===undefined || isNaN(parseInt(data.threshold))) data.threshold = 0;  } catch { data.threshold = 0; }
    try { if(data.deviation===undefined || isNaN(parseInt(data.deviation))) data.deviation = 68; } catch { data.deviation = 68; }
    // URL arguments
    if(params.expression!==undefined) data.diceexpr = params.expression;
    if(params.substitutions!==undefined) data.substitutions = params.substitutions;
    if(params.accumulate!==undefined) data.accumulate = (params.accumulate!=0);
    if(params.threshold!==undefined) data.threshold = params.threshold;
    if(params.deviation!==undefined) data.deviation = params.deviation;
    $term.val(data.diceexpr);
    $substitutions.val(data.substitutions);
    $accumulate.attr('checked', (data.accumulate===true)?"checked":null);
    $threshold.val(data.threshold);
    $deviation.val(data.deviation);
  })();
  run();
});

/* Betslip reader: offline OCR (Tesseract, bundled) + parser that turns slip text into bet fields. */
(function(){
"use strict";
var OCR={api:null,mod:null,loading:null};

function loadScript(src){
  return new Promise(function(res,rej){
    var s=document.createElement("script");s.src=src;s.onload=res;
    s.onerror=function(){rej(new Error("Couldn't load "+src));};
    document.head.appendChild(s);
  });
}
function b64ToBytes(b64){
  var bin=atob(b64),n=bin.length,out=new Uint8Array(n);
  for(var i=0;i<n;i++)out[i]=bin.charCodeAt(i);
  return out;
}
function gunzip(bytes){
  if(typeof DecompressionStream==="undefined")return Promise.reject(new Error("This phone's WebView is too old to unpack the reader. Update 'Android System WebView' in the Play Store."));
  var stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer().then(function(b){return new Uint8Array(b);});
}
function init(){
  if(OCR.api)return Promise.resolve();
  if(OCR.loading)return OCR.loading;
  OCR.loading=loadScript("vendor/ocr-core.js")
    .then(function(){return loadScript("vendor/eng-data.js");})
    .then(function(){return window.TesseractCore();})
    .then(function(mod){
      OCR.mod=mod;
      var gz=b64ToBytes(window.ENG_GZ_B64);window.ENG_GZ_B64=null;
      return gunzip(gz);
    })
    .then(function(data){
      OCR.mod.FS.writeFile("./eng.traineddata",data);
      var api=new OCR.mod.TessBaseAPI();
      var st=api.Init(null,"eng",1);
      if(st!==0)throw new Error("Reader failed to start ("+st+")");
      OCR.api=api;
    });
  OCR.loading.catch(function(){OCR.loading=null;});
  return OCR.loading;
}

/* Prepare image: grayscale, invert dark-mode screenshots, upscale small ones. */
function prep(file){
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file),img=new Image();
    img.onload=function(){
      var scale=img.width<1000?Math.min(2.5,1300/img.width):(img.width>2000?2000/img.width:1);
      var w=Math.round(img.width*scale),h=Math.round(img.height*scale);
      var c=document.createElement("canvas");c.width=w;c.height=h;
      var x=c.getContext("2d");x.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
      var d=x.getImageData(0,0,w,h),p=d.data,sum=0,i,g;
      for(i=0;i<p.length;i+=4){g=0.299*p[i]+0.587*p[i+1]+0.114*p[i+2];p[i]=p[i+1]=p[i+2]=g;sum+=g;}
      var dark=sum/(p.length/4)<115;
      if(dark)for(i=0;i<p.length;i+=4){p[i]=p[i+1]=p[i+2]=255-p[i];}
      x.putImageData(d,0,0);
      c.toBlob(function(b){b.arrayBuffer().then(function(ab){res(new Uint8Array(ab));});},"image/png");
    };
    img.onerror=function(){rej(new Error("Couldn't open that image."));};
    img.src=url;
  });
}
function read(file,onStatus){
  onStatus=onStatus||function(){};
  onStatus("Loading the slip reader… (first time takes a few seconds)");
  return init().then(function(){onStatus("Reading your slip…");return prep(file);})
  .then(function(bytes){
    return new Promise(function(res){setTimeout(function(){ // let the status paint first
      OCR.mod.FS.writeFile("/input",bytes);
      OCR.api.SetImageFile(1,0);
      OCR.api.Recognize(null);
      var t=OCR.api.GetUTF8Text();
      try{OCR.api.Clear();}catch(e){}
      res(t);
    },60);});
  });
}

/* ---------------- parser ----------------
   index: [{name, sport, league}] of known teams. books: list of bookmaker names. */
var IDX=[];
var GENERIC={city:1,united:1,county:1,town:1,athletic:1,rovers:1,fc:1,sc:1,afc:1,club:1,stars:1,kings:1,giants:1,heat:1,magic:1,jazz:1,wild:1,stars2:1};
function buildAliases(index){
  var last={};index.forEach(function(t){var w=t.name.toLowerCase().split(" ").pop();last[w]=(last[w]||0)+1;});
  IDX=index.map(function(t){var n=t.name.toLowerCase(),al=[n],w=n.split(" ").pop();
    if(n.indexOf(" ")>0&&last[w]===1&&w.length>3&&!GENERIC[w])al.push(w);
    if(n==="miami heat")al.push("heat");if(n==="utah jazz")al.push("jazz");if(n==="orlando magic")al.push("magic");if(n==="sacramento kings")al.push("kings");
    return {t:t,al:al};});
}
function teamsIn(s){
  var low=" "+s.toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ")+" ",hits=[];
  IDX.forEach(function(x){x.al.forEach(function(a){var from=0,i;while((i=low.indexOf(" "+a+" ",from))>=0){hits.push({t:x.t,pos:i,end:i+a.length+1});from=i+1;}});});
  // a match inside a longer match ("Melbourne" inside "Melbourne Victory") doesn't count
  hits=hits.filter(function(h){return !hits.some(function(o){return o!==h&&o.pos<=h.pos&&o.end>=h.end&&(o.end-o.pos)>(h.end-h.pos);});});
  var out=[];hits.sort(function(a,b){return a.pos-b.pos;}).forEach(function(h){if(!out.some(function(o){return o.t.name===h.t.name;}))out.push(h);});
  return out;
}
function num(s){return parseFloat(String(s).replace(/,/g,""));}
function moneyAfter(text,re){var m=text.match(re);return m?num(m[m.length-1]):null;}
var PROP=/(points|pts|rebounds|reb|assists|ast|threes|3-?pointers|disposals|goals|tries|marks|tackles|runs|wickets|sixes|fours|shots|aces|strikeouts|hits|yards|touchdowns|saves)\b/i;

function parse(text,index,books){
  buildAliases(index||[]);
  var raw=text||"",t=raw.replace(/[|]/g," ").replace(/[ \t]+/g," ");
  var lines=t.split(/\n/).map(function(l){return l.trim();}).filter(Boolean);
  var low=t.toLowerCase(),r={};

  // bookmaker
  (books||[]).forEach(function(b){if(b==="Stake"){if(!r.book&&/stake\.com|stake\s+(sportsbook|sports)/i.test(t))r.book=b;return;}if(!r.book&&new RegExp("(^|[^a-z])"+b.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|[^a-z])").test(low))r.book=b;});

  // stake / return / odds
  r.stake=moneyAfter(t,/(?:stake|bet amount|wager|risk(?:ed)?|total stake|amount)\s*:?\s*(?:[$£€]|a\$|aud|usd)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  var ret=moneyAfter(t,/(?:est(?:imated)?\.?\s*return|potential\s*(?:return|payout|win)|returns?|payout|to\s*(?:win|collect)|collect(?:ed)?|paid(?:\s*out)?)\s*:?\s*(?:[$£€]|a\$|aud|usd)?\s*([\d,]+\.\d{2})/i);
  var om=t.match(/(?:odds|price)\s*:?\s*@?\s*(\d{1,3}\.\d{2})/i)||t.match(/@\s*(\d{1,3}\.\d{2})\b/);
  var am=t.match(/(?:^|\s)([+-]\d{3,4})(?=\s|$)/m);
  if(om)r.odds=num(om[1]);
  else if(am){var a=num(am[1]);r.odds=a>0?1+a/100:1+100/Math.abs(a);}
  else{var c=[];lines.forEach(function(l){var re=/(^|[^$£€\d.,])(\d{1,3}\.\d{2})(?![\d%])/g,m;while((m=re.exec(l))){var v=num(m[2]);if(v>=1.01&&v<=100)c.push(v);}});
    if(r.stake)c=c.filter(function(v){return Math.abs(v-r.stake)>0.001;});if(ret)c=c.filter(function(v){return Math.abs(v-ret)>0.001;});if(c.length)r.odds=c[0];}
  if(r.stake&&ret&&ret>r.stake){var imp=Math.round(ret/r.stake*1000)/1000;if(!r.odds||(Math.abs(imp-r.odds)>0.03&&!om&&!am))r.odds=imp;}

  // result
  if(/\b(lost|loss|unsuccessful|lose)\b/i.test(t))r.res="L";
  else if(/\b(void|refund(?:ed)?|cancell?ed|scratched|push)\b/i.test(t))r.res="V";
  else if(/\bcash(?:ed)?\s*out\b/i.test(t)&&/\b(cashed|paid)\b/i.test(t))r.res="C";
  else if(/\b(won|winner|paid out|settled\s*win|result:?\s*win|collected)\b/i.test(t))r.res="W";
  else r.res="P";

  // teams
  var match=null;lines.forEach(function(l){var ts=teamsIn(l);if(!match&&ts.length>=2)match={l:l,ts:ts};});
  var all=teamsIn(t);
  if(match){r.away=match.ts[0].t.name;r.home=match.ts[1].t.name;}
  else if(all.length>=2){r.away=all[0].t.name;r.home=all[1].t.name;}
  else if(all.length===1)r.away=all[0].t.name;
  var anchor=match?match.ts[0].t:(all[0]&&all[0].t);
  if(anchor&&anchor.sport){r.sport=anchor.sport;r.league=anchor.league;}
  for(var i=0;i<lines.length&&!r.team;i++){if(match&&lines[i]===match.l)continue;var ts=teamsIn(lines[i]);if(ts.length===1)r.team=ts[0].t.name;}

  // market
  var ou=low.match(/\b(over|under)\s*(\d{1,4}(?:\.\d)?)/),plus=t.match(/(\d{1,3})\s*\+\s*([a-z-]+)/i);
  var legsM=t.match(/(\d{1,2})\s*(?:-|\s)?legs?\b/i)||t.match(/(\d{1,2})\s*(?:-|\s)?fold\b/i);
  if(/same game multi|\bsgm\b|same game parlay|\bsgp\b/i.test(t)){r.market="sgm";if(legsM)r.legs=parseInt(legsM[1],10);}
  else if(/\b(multi|parlay|accumulator|acca|\d+\s*-?\s*fold)\b/i.test(t)){r.market="multi";if(legsM)r.legs=parseInt(legsM[1],10);}
  else if(/double chance/i.test(t))r.market="dc";
  else if(/both teams to score|\bbtts\b/i.test(t))r.market="btts";
  else if(/corners?/i.test(t)&&ou)r.market="corners";
  else if(/cards?|bookings?/i.test(t)&&ou)r.market="cards";
  else if(/\bgoals?\b/i.test(t)&&ou&&!/disposals|player/i.test(t))r.market="goals";
  else if(/(anytime|first|last)\s*(goal\s*)?scorer|to score/i.test(t)&&!plus)r.market="scorer";
  else if(PROP.test(t)&&(ou||plus)&&!/total\s*(match\s*)?(points|runs|goals)/i.test(t))r.market="prop";
  else if(/team total/i.test(t)&&ou)r.market="tt";
  else if(ou)r.market="total";
  else if(/margin/i.test(t))r.market="margin";
  else if(/\b(line|handicap|spread)\b/i.test(t)||(r.team&&new RegExp(r.team.split(" ").pop()+"[^\\n]*?[+-]\\d{1,2}\\.5","i").test(t)))r.market="line";
  else if(/match result|1x2|full time result/i.test(t))r.market="x12";
  else if(/(head to head|h2h|money\s*line|to win|match winner|winner)/i.test(t)||r.team)r.market="h2h";
  else r.market="other";

  if(r.market==="line"){var lm=t.match(/(?:line|handicap|spread)[^\n]*?([+-]\d{1,2}(?:\.\d)?)/i)||(r.team?t.match(new RegExp(r.team.split(" ").pop()+"[^\\n]*?([+-]\\d{1,2}(?:\\.\\d)?)","i")):null);if(lm)r.line=lm[1];}
  if(["total","goals","corners","cards","tt","prop"].indexOf(r.market)>=0){
    if(ou){r.ou=ou[1]==="under"?"Under":"Over";r.line=ou[2];}else if(plus){r.ou="Over";r.line=String(num(plus[1])-0.5);}
  }
  if(r.market==="prop"){
    var st=(t.match(PROP)||[""])[0];r.desc=st.toLowerCase();
    var pl=lines.filter(function(l){return /(over|under|\d\s*\+)/i.test(l)&&PROP.test(l);})[0]||"";
    var name=pl.split(/\b(over|under|to score|to get|to record|\d)/i)[0].replace(/[-–:]+\s*$/,"").trim();
    if(name&&teamsIn(name).length===0&&name.split(" ").length<=4)r.player=name;
    else{var idx=lines.indexOf(pl);if(idx>0&&/^[A-Za-z.'\- ]{4,30}$/.test(lines[idx-1])&&teamsIn(lines[idx-1]).length===0)r.player=lines[idx-1].trim();}
  }
  if(r.market==="scorer"){var sl=lines.filter(function(l){return /scorer|to score/i.test(l);})[0]||"";var nm=sl.split(/\b(anytime|first|last|to score)/i)[0].trim();if(nm&&teamsIn(nm).length===0)r.player=nm;r.desc=(sl.match(/anytime|first|last/i)||["Anytime"])[0];}
  if(r.market==="btts")r.desc=/\bno\b/i.test(t)?"No":"Yes";
  if(r.market==="dc"){var dl=lines.filter(function(l){return /\bor\s+draw\b|\bdraw\s+or\b|\b(1x|x2|12)\b/i.test(l);})[0]||lines.filter(function(l){return /double chance\s*:?\s*\S/i.test(l);})[0];r.desc=(dl||"").replace(/double chance:?/i,"").replace(/@\s*\d+\.\d+/,"").trim()||"Double chance";}
  if(r.market==="margin"){var mm=t.match(/(\d{1,2}\s*[-–]\s*\d{1,2}|\d{1,2}\s*\+)/);if(mm)r.desc=mm[1].replace(/\s+/g,"");}
  if(r.market==="sgm"||r.market==="multi"){r.desc=lines.filter(function(l){return /(over|under|win|head|\+\d|points|line|score|goals|disposals)/i.test(l)&&!/(stake|return|odds|payout)/i.test(l);}).slice(0,5).join(" + ").slice(0,150);}
  return r;
}

window.Slip={read:read,parse:parse,warm:init};
})();

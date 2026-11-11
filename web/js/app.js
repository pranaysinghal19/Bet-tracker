/* Bet Tracker — app logic.
   Plain JavaScript, no frameworks, no network. All data lives in this device's localStorage.
   Licensed under Apache-2.0. */
(function(){
"use strict";
var VERSION="1.0.1";
var KEY="bettracker_v1";
var D=window.BT_DATA, MARKETS=D.MARKETS, SPORTS=D.SPORTS, PRESETS=D.PRESETS;
var RES={P:"Active",W:"Won",L:"Lost",C:"Cashed out",V:"Void"};
var BOOKS=["Sportsbet","TAB","Ladbrokes","Neds","PointsBet","bet365","Unibet","Betfair","BlueBet","Palmerbet","Betr","Dabble","DraftKings","FanDuel","BetMGM","Caesars","ESPN BET","Fanatics","Hard Rock Bet","BetRivers","William Hill","Paddy Power","Sky Bet","Betway","Pinnacle","Stake"];

/* ============ helpers ============ */
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function pad(n){return (n<10?"0":"")+n;}
function iso(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
function parse(s){var p=String(s).split("-");return new Date(+p[0],+p[1]-1,+p[2]);}
function addDays(s,n){var d=parse(s);d.setDate(d.getDate()+n);return iso(d);}
function todayIso(){return iso(new Date());}
function daysBetween(a,b){return Math.round((parse(b)-parse(a))/864e5);}
function nice(s,o){return parse(s).toLocaleDateString("en-AU",o||{day:"numeric",month:"short"});}
function toast(m){var t=$("toast");t.textContent=m;t.style.display="block";clearTimeout(toast._t);toast._t=setTimeout(function(){t.style.display="none";},3200);}
function sportOf(k){for(var i=0;i<SPORTS.length;i++)if(SPORTS[i].k===k)return SPORTS[i];return SPORTS[SPORTS.length-1];}
function leagueOf(s,k){var sp=sportOf(s);for(var i=0;i<sp.leagues.length;i++)if(sp.leagues[i].k===k)return sp.leagues[i];return sp.leagues[0];}
function marketOf(k){return MARKETS[k]||MARKETS.other;}
function nick(t){if(!t)return "";var p=String(t).split(" ");return p.length>1&&p[p.length-1].length>2?p[p.length-1]:t;}
function cur(){return S.display.cur||"$";}
function money(n){var neg=n<0;n=Math.abs(n);var s=n>=1000?n.toLocaleString("en-AU",{maximumFractionDigits:0}):n.toFixed(2);return (neg?"-":"")+cur()+s;}
function km(n){var a=Math.abs(n),s=a>=1e6?(a/1e6).toFixed(1)+"m":a>=1000?(a/1000).toFixed(a>=10000?0:1)+"k":Math.round(a)+"";return (n<0?"-":"")+cur()+s;}
function units(n){var u=S.display.unit;return u>0?" ("+(Math.round(n/u*100)/100)+"u)":"";}
function sign(n){return (n>=0?"+":"")+money(n);}

/* ============ odds formats ============ */
function parseOdds(v){
  v=String(v==null?"":v).trim();if(!v)return NaN;
  var f=S.display.odds;
  if(f==="us"||/^[+-]\d/.test(v)&&f!=="frac"){var n=parseFloat(v);if(!isFinite(n)||Math.abs(n)<100)return f==="us"?NaN:parseFloat(v);return n>0?1+n/100:1+100/Math.abs(n);}
  if(f==="frac"||/^\d+\s*\/\s*\d+$/.test(v)){var m=v.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);if(m)return 1+parseFloat(m[1])/parseFloat(m[2]);if(f==="frac")return NaN;}
  return parseFloat(v);
}
function gcd(a,b){return b?gcd(b,a%b):a;}
function fmtOdds(d){
  if(!(d>1))return "–";var f=S.display.odds;
  if(f==="us"){return d>=2?"+"+Math.round((d-1)*100):"-"+Math.round(100/(d-1));}
  if(f==="frac"){var n=Math.round((d-1)*100),g=gcd(n,100);return (n/g)+"/"+(100/g);}
  return (Math.round(d*100)/100).toFixed(2);
}

/* ============ storage & validation ============ */
function num(v,min,max){v=Number(v);return isFinite(v)&&v>=min&&v<=max?v:null;}
function vdate(v){return typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(parse(v))?v:null;}
function str(v,n){return typeof v==="string"?v.replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n):"";}
function strList(a,n,each){return (Array.isArray(a)?a:[]).map(function(x){return str(x,each||60);}).filter(Boolean).slice(0,n);}
var _used={};
function uid(v){var i=num(v,1,9e15);i=i?Math.floor(i):0;while(!i||_used[i])i=Date.now()+Math.floor(Math.random()*1e6);_used[i]=1;return i;}
function presetCopy(k){return JSON.parse(JSON.stringify(PRESETS[k]||PRESETS.pro));}
function cleanRules(r){
  var base=presetCopy("open");if(!r||typeof r!=="object")return presetCopy("pro");
  var o={name:str(r.name,40)||"Custom",preset:PRESETS[r.preset]?r.preset:"custom",
    maxOdds:num(r.maxOdds,0,1000)||0,maxBetsPerDay:Math.floor(num(r.maxBetsPerDay,0,100)||0),
    maxStakePct:num(r.maxStakePct,0,100)||0,maxLegs:Math.floor(num(r.maxLegs,0,50)||0),requireChecklist:!!r.requireChecklist,
    leagues:{},bannedTeams:strList(r.bannedTeams,200),bannedPlayers:strList(r.bannedPlayers,200),
    bannedMarkets:(Array.isArray(r.bannedMarkets)?r.bannedMarkets:[]).filter(function(k){return MARKETS[k];}),checklists:{}};
  var L=r.leagues&&typeof r.leagues==="object"?r.leagues:base.leagues;
  SPORTS.forEach(function(sp){
    if(!(sp.k in L))return;var v=L[sp.k];
    if(v===null)o.leagues[sp.k]=null;
    else if(Array.isArray(v)){var ok=v.filter(function(k){return sp.leagues.some(function(l){return l.k===k;});});if(ok.length)o.leagues[sp.k]=ok.length===sp.leagues.length?null:ok;}
  });
  if(!Object.keys(o.leagues).length)o.leagues=base.leagues;
  var C=r.checklists&&typeof r.checklists==="object"?r.checklists:{};
  ["general"].concat(SPORTS.map(function(s){return s.k;})).forEach(function(k){if(C[k])o.checklists[k]=strList(C[k],20,140);});
  if(!o.checklists.general)o.checklists.general=D.CHECKS.general.slice();
  return o;
}
function cleanBet(b){
  if(!b||typeof b!=="object")return null;
  var dt=vdate(b.date),od=num(b.odds,1.0001,10000),st=num(b.stake,0,1e9);if(!dt||!od||st===null)return null;
  var sp=sportOf(b.sport).k,lg=leagueOf(sp,b.league).k,res=RES[b.res]?b.res:"P";
  return {id:uid(b.id),date:dt,sport:sp,league:lg,away:str(b.away,60),home:str(b.home,60),event:str(b.event,80),
    market:MARKETS[b.market]?b.market:"other",sel:str(b.sel,60),ou:b.ou==="Under"?"Under":"Over",line:str(String(b.line==null?"":b.line),12),
    player:str(b.player,60),desc:str(b.desc,160),legs:Math.floor(num(b.legs,0,50)||0),pick:str(b.pick,200),
    odds:od,stake:st,res:res,cash:res==="C"?(num(b.cash,0,1e12)||0):0,book:str(b.book,40),tipster:str(b.tipster,40),note:str(b.note,300)};
}
function cleanProfile(p,i){
  p=p&&typeof p==="object"?p:{};
  var o={id:uid(p.id),name:str(p.name,40)||("Bankroll "+(i+1)),plan:{start:100,goal:1000,from:todayIso(),to:addDays(todayIso(),30)},
    rules:cleanRules(p.rules),bets:[],moves:[],closes:[],custom:{teams:strList(p.custom&&p.custom.teams,500),players:strList(p.custom&&p.custom.players,500),
    books:strList(p.custom&&p.custom.books,100,40),tipsters:strList(p.custom&&p.custom.tipsters,100,40)}};
  var pl=p.plan||{},s=num(pl.start,0.01,1e9),g=num(pl.goal,0.01,1e12),f=vdate(pl.from),t=vdate(pl.to);
  if(s)o.plan.start=s;if(g&&g>o.plan.start)o.plan.goal=g;else o.plan.goal=Math.max(o.plan.goal,o.plan.start*2);if(f)o.plan.from=f;if(t&&t>=o.plan.from)o.plan.to=t;else if(o.plan.to<o.plan.from)o.plan.to=addDays(o.plan.from,30);
  (Array.isArray(p.bets)?p.bets:[]).slice(0,20000).forEach(function(b){b=cleanBet(b);if(b)o.bets.push(b);});
  (Array.isArray(p.moves)?p.moves:[]).slice(0,5000).forEach(function(m){if(!m||typeof m!=="object")return;var dt=vdate(m.date),a=num(m.amount,-1e9,1e9);if(dt&&a)o.moves.push({id:uid(m.id),date:dt,amount:a,note:str(m.note,200)});});
  var seen={};(Array.isArray(p.closes)?p.closes:[]).slice(0,5000).forEach(function(c){if(!c||typeof c!=="object")return;var dt=vdate(c.date),b=num(c.balance,0,1e12);if(!dt||b===null||seen[dt])return;seen[dt]=1;o.closes.push({id:uid(c.id),date:dt,balance:b,kind:c.kind==="money"?"money":"bet",note:str(c.note,200)});});
  return o;
}
function clean(d){
  _used={};d=d&&typeof d==="object"?d:{};
  var o={v:1,setup:!!d.setup,adult:!!d.adult,profiles:[],active:0,
    safer:{dep:0,depP:null,loss:0,lossP:null,coolUntil:0},display:{cur:"$",odds:"dec",unit:0}};
  (Array.isArray(d.profiles)?d.profiles:[]).slice(0,30).forEach(function(p,i){o.profiles.push(cleanProfile(p,i));});
  if(!o.profiles.length)o.profiles.push(cleanProfile({name:"Main bankroll"},0));
  o.active=o.profiles.some(function(p){return p.id===d.active;})?d.active:o.profiles[0].id;
  var sf=d.safer||{};
  o.safer.dep=num(sf.dep,0,1e9)||0;o.safer.loss=num(sf.loss,0,1e9)||0;o.safer.coolUntil=num(sf.coolUntil,0,9e15)||0;
  ["depP","lossP"].forEach(function(k){var p=sf[k];if(p&&typeof p==="object"&&num(p.v,0,1e9)!==null&&num(p.at,0,9e15))o.safer[k]={v:+p.v,at:+p.at};});
  var ds=d.display||{};o.display.cur=str(ds.cur,3)||"$";o.display.odds=["dec","us","frac"].indexOf(ds.odds)>=0?ds.odds:"dec";o.display.unit=num(ds.unit,0,1e9)||0;
  return o;
}
function load(){var d=null;try{d=JSON.parse(localStorage.getItem(KEY));}catch(e){}if(!d){try{d=JSON.parse(localStorage.getItem(KEY+"_prev"));}catch(e){}}return clean(d);}
var S=load();
function save(){try{var j=JSON.stringify(S);localStorage.setItem(KEY,j);localStorage.setItem(KEY+"_prev",j);}catch(e){toast("Couldn't save on this device");}}
function P(){for(var i=0;i<S.profiles.length;i++)if(S.profiles[i].id===S.active)return S.profiles[i];return S.profiles[0];}

/* ============ money maths (per bankroll) ============ */
function profitOf(b){return b.res==="W"?b.stake*(b.odds-1):b.res==="L"?-b.stake:b.res==="C"?b.cash-b.stake:0;}
function sorted(p){return (p||P()).bets.slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:a.id-b.id;});}
function betsOn(d,ex){return sorted().filter(function(b){return b.date===d&&b.id!==ex;});}
function plan(){return P().plan;}
function totalDays(){return daysBetween(plan().from,plan().to)+1;}
function dailyR(){return Math.pow(plan().goal/plan().start,1/totalDays());}
function targetFor(d){var i=daysBetween(plan().from,d)+1;i=Math.max(0,Math.min(totalDays(),i));return plan().start*Math.pow(dailyR(),i);}
function closeOn(d){var c=P().closes;for(var i=0;i<c.length;i++)if(c[i].date===d)return c[i];return null;}
function ledger(before,p){
  p=p||P();var bank=p.plan.start,rows=[],days={},w=0,l=0,staked=0,pl=0,streak=0,st="",dep=0;
  function day(d){return days[d]||(days[d]={n:0,w:0,l:0,p:0,v:0,profit:0,close:0,dep:0,eod:null});}
  var ev=p.moves.map(function(m){return {d:m.date,k:0,id:m.id,m:m};})
    .concat(sorted(p).map(function(b){return {d:b.date,k:1,id:b.id,b:b};}))
    .concat(p.closes.map(function(c){return {d:c.date,k:2,id:c.id,c:c};}));
  if(before)ev=ev.filter(function(e){return e.d<before;});
  ev.sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:a.k-b.k||a.id-b.id;});
  ev.forEach(function(e){
    var Dd=day(e.d);
    if(e.c){var adj=Math.round((e.c.balance-bank)*100)/100;Dd.eod={balance:e.c.balance,adj:adj,kind:e.c.kind};
      if(e.c.kind==="money"){dep+=adj;Dd.dep+=adj;}else{pl+=adj;Dd.profit+=adj;if(!Dd.n&&adj){if(adj>0){w++;streak=st==="W"?streak+1:1;st="W";}else{l++;streak=st==="L"?streak+1:1;st="L";}}}
      bank=e.c.balance;Dd.close=bank;return;}
    if(e.m){bank+=e.m.amount;dep+=e.m.amount;Dd.dep+=e.m.amount;Dd.close=bank;return;}
    var b=e.b,pr=profitOf(b);
    if(b.res==="W"||(b.res==="C"&&pr>0)){w++;streak=st==="W"?streak+1:1;st="W";Dd.w++;}
    if(b.res==="L"||(b.res==="C"&&pr<0)){l++;streak=st==="L"?streak+1:1;st="L";Dd.l++;}
    if(b.res==="P")Dd.p++;if(b.res==="V")Dd.v++;
    if(b.res!=="P"&&b.res!=="V"){staked+=b.stake;pl+=pr;}
    bank+=pr;rows.push({b:b,after:bank,profit:pr});Dd.n++;Dd.profit+=pr;Dd.close=bank;
  });
  return {bank:bank,dep:dep,rows:rows,days:days,w:w,l:l,staked:staked,pl:pl,streak:streak,st:st};
}
function bankAtStart(d){var bank=ledger(d).bank;P().moves.forEach(function(m){if(m.date===d)bank+=m.amount;});return bank;}
function dayState(d,ex){var o={n:0,profit:0,pendStake:0,pendWin:0};betsOn(d,ex).forEach(function(b){o.n++;if(b.res==="P"){o.pendStake+=b.stake;o.pendWin+=b.stake*(b.odds-1);}else o.profit+=profitOf(b);});return o;}
function quotaFor(d,bs){var n=daysBetween(d<plan().from?plan().from:d,plan().to)+1;if(n<1||bs<=0)return null;if(bs>=plan().goal)return {n:n,g:0,win:0,done:true};var g=Math.pow(plan().goal/bs,1/n)-1;return {n:n,g:g,win:bs*g,done:false};}
function maxPerDay(){return P().rules.maxBetsPerDay||0;}
function dayDone(d){
  if(closeOn(d))return true;var bs=betsOn(d);if(!bs.length)return false;
  var ds=dayState(d),q=quotaFor(d,bankAtStart(d));if(ds.pendStake>0)return false;
  return (maxPerDay()&&bs.length>=maxPerDay())||(q&&ds.profit>=q.win-0.005);
}
function betDaysLeft(){var t=todayIso(),s=t<plan().from?plan().from:t;if(s>plan().to)return 0;var n=daysBetween(s,plan().to)+1;if(dayDone(s))n--;return Math.max(0,n);}
function planRef(){
  var t=todayIso(),d=t<plan().from?plan().from:t;if(d>plan().to)return null;var base;
  if(dayDone(d)){base=ledger().bank;d=addDays(d,1);if(d>plan().to)return null;}else base=bankAtStart(d);
  var n=daysBetween(d,plan().to)+1,g=base>=plan().goal||base<=0?0:Math.pow(plan().goal/base,1/n)-1,i=daysBetween(plan().from,d);
  return {d:d,base:base,g:g,n:n,orig:plan().start*Math.pow(dailyR(),i),ahead:base>0?Math.log(base/plan().start)/Math.log(dailyR())-i:-i};
}
function adjTarget(d,R){R=R||planRef();if(!R)return targetFor(d);return Math.min(plan().goal,R.base*Math.pow(1+R.g,daysBetween(R.d,d)+1));}
function shownTarget(d,R){R=R===undefined?planRef():R;return R&&d>=R.d?adjTarget(d,R):targetFor(d);}

/* ============ safer-betting limits (shared by all bankrolls) ============ */
function limit(k){var p=S.safer[k+"P"];if(p&&Date.now()>=p.at){S.safer[k]=p.v;S.safer[k+"P"]=null;save();}return S.safer[k];}
function cooling(){return S.safer.coolUntil>Date.now();}
function depositsLast7(extraDate){var since=addDays(extraDate||todayIso(),-6),s=0;S.profiles.forEach(function(p){p.moves.forEach(function(m){if(m.amount>0&&m.date>=since&&m.date<=(extraDate||todayIso()))s+=m.amount;});});return s;}
function lossOn(d,exId){var s=0;S.profiles.forEach(function(p){p.bets.forEach(function(b){if(b.date===d&&b.id!==exId&&b.res!=="P")s+=profitOf(b);});});return s;}

/* ============ rules engine ============ */
function sportAllowed(sp,lg){var L=P().rules.leagues;if(!(sp in L))return "no-sport";if(L[sp]===null)return "";return L[sp].indexOf(lg)>=0?"":"no-league";}
function wordIn(text,w){if(!w)return false;var re=new RegExp("(^|[^a-z0-9])"+w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|[^a-z0-9])");return re.test(text);}
function bannedHits(fields){
  var r=P().rules,text=fields.join(" ").toLowerCase(),hits=[];
  r.bannedTeams.forEach(function(t){var tl=t.toLowerCase();if(fields.some(function(f){return f.toLowerCase()===tl;})||wordIn(text,tl)||(tl.split(" ").length>1&&wordIn(text,tl.split(" ").pop())&&tl.split(" ").pop().length>4))hits.push(t);});
  r.bannedPlayers.forEach(function(p){var pl=p.toLowerCase(),last=pl.split(" ").pop();if(wordIn(text,pl)||(last.length>=3&&wordIn(text,last)))hits.push(p);});
  return hits;
}
function checklistFor(sp){var c=P().rules.checklists;return c[sp]&&c[sp].length?c[sp]:(c.general||[]);}

/* ============ HOME ============ */
function renderHeader(){
  var L=ledger();$("hdrBal").textContent=money(L.bank);
  $("hdrSub").innerHTML='<b>'+esc(P().name)+'</b> · '+money(plan().start)+' → '+money(plan().goal)+' by '+nice(plan().to)+(S.profiles.length>1?' · <a href="#" id="switchBk">switch ▾</a>':'');
  var sw=$("switchBk");if(sw)sw.onclick=function(e){e.preventDefault();openProfiles();};
  $("coolBanner").innerHTML=cooling()?'<div class="banner">⏸️ You\'re on a break until <b>'+new Date(S.safer.coolUntil).toLocaleString("en-AU",{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})+'</b>. Bets and deposits are paused. <a href="#" id="bnHelp">Get support</a></div>':"";
  var bh=$("bnHelp");if(bh)bh.onclick=function(e){e.preventDefault();openHelp();};
}
function renderHome(){
  var L=ledger(),bank=L.bank,t=todayIso(),pl=plan();
  $("bank").textContent=money(bank);
  var p=bank<=pl.start?0:Math.min(1,Math.log(bank/pl.start)/Math.log(pl.goal/pl.start));
  $("prog").style.width=(p*100).toFixed(1)+"%";
  $("progTxt").textContent=(p*100).toFixed(1)+"% of the compounding journey · "+Math.min(100,bank/pl.goal*100).toFixed(2)+"% of the goal";
  $("depTxt").innerHTML=L.dep?'<span class="D">💰 Includes '+(L.dep>=0?money(L.dep)+" you added":money(-L.dep)+" net withdrawn")+'</span> · betting profit '+sign(L.pl):"";
  $("sPL").textContent=sign(L.pl);$("sPL").className=L.pl>=0?"W":"L";
  $("sROI").textContent=L.staked?((L.pl/L.staked)*100).toFixed(1)+"%":"0%";
  var tot=L.w+L.l;$("sWR").textContent=tot?Math.round(L.w/tot*100)+"%":"–";
  $("sWL").textContent=L.w+"–"+L.l;$("sStreak").textContent=L.st?L.st+L.streak:"–";
  var dl=betDaysLeft();$("sDays").textContent=dl;
  var ref=t<pl.from?pl.from:(t>pl.to?pl.to:t),cmp=dayDone(ref)?targetFor(ref):targetFor(addDays(ref,-1)),r=bank/cmp,st;
  if(bank>=pl.goal||r>=1.15)st="Cruising";else if(r>=0.97)st="On track";else if(r>=0.8)st="Tight";else if(r>=0.5)st="Behind";else st="Critical";
  $("status").textContent=st+" · original target today "+money(targetFor(ref));$("status").className="pill s-"+st.split(" ")[0];
  var R=planRef(),pc="";
  if(R&&bank<pl.goal){
    var gap=R.base-R.orig,dd=Math.abs(R.ahead),og=dailyR()-1,dtxt=dd>=0.95?" (≈"+Math.round(dd)+" day"+(Math.round(dd)===1?"":"s")+" "+(gap>0?"ahead":"behind")+")":"";
    if(Math.abs(gap)<0.01*R.orig)pc="📍 Right on the original plan. Need <b>+"+(R.g*100).toFixed(1)+"%</b> a day.";
    else pc=(gap>0?"📈 <b class='W'>"+money(gap)+" ahead</b>":"📉 <b class='L'>"+money(-gap)+" behind</b>")+" of the original plan"+dtxt+".<br>Plan adjusted: you now need <b>+"+(R.g*100).toFixed(1)+"%</b> a day instead of +"+(og*100).toFixed(1)+"%.";
    pc+="<br>New target for "+(R.d===t?"today":nice(R.d))+": close at <b>"+money(adjTarget(R.d,R))+"</b>.";
  }
  $("planCheck").innerHTML=pc;
  // quota
  var need="",warn="",mo=P().rules.maxOdds||0;
  if(bank>=pl.goal)need="🎉 Goal reached. Time to protect it — consider withdrawing some profit.";
  else if(t>pl.to)need="The plan's deadline has passed. Final balance: <b>"+money(bank)+"</b>. Set a new plan under Rules.";
  else{
    var d=t<pl.from?pl.from:t,bs=bankAtStart(d),q=quotaFor(d,bs),ds=dayState(d),left=q?q.win-ds.profit:0,label=d===t?"Today":nice(d),mx=maxPerDay();
    if(dayDone(d)){var nd=addDays(d,1),q2=quotaFor(nd,bank),dp=L.days[d]?L.days[d].profit:ds.profit;
      need="✅ "+label+" is done ("+sign(dp)+(closeOn(d)?", end-of-day balance "+money(closeOn(d).balance):"")+")."+(q2?"<br><b>Tomorrow's quota: win "+money(q2.win)+"</b> (+"+(q2.g*100).toFixed(1)+"%) · "+q2.n+" bet days left.":"<br>That was the last day of the plan.");}
    else if(q){
      need="<b>"+label+": win "+money(q.win)+"</b>"+units(q.win)+" (+"+(q.g*100).toFixed(1)+"% on "+money(bs)+")<br>Won so far today: <b>"+sign(ds.profit)+"</b>"+(ds.pendStake?" · active "+money(ds.pendStake):"")+
        (left-ds.pendWin<=0.005?"<br>✅ Quota covered"+(ds.pendStake?" if your active bets win.":"."):"<br>Still to win: <b>"+money(left-ds.pendWin)+"</b>"+(mx?" · bets used "+ds.n+"/"+mx:"")+(mo?"<br>At "+fmtOdds(mo)+" that needs a <b>"+money((left-ds.pendWin)/(mo-1))+"</b> stake.":""));
    }
    var gNow=Math.pow(pl.goal/Math.max(bank,0.01),1/Math.max(1,dl))-1;
    if(mo&&dl>0&&gNow>mo-1)warn='<div class="alertbox bad">Even staking everything at your max odds every day can\'t reach the goal in '+dl+' days. Consider a later deadline or a smaller goal.</div>';
    else if(mo&&dl>0&&gNow>0)warn='<div class="alertbox">All-in from here needs about <b>'+Math.ceil(Math.log(pl.goal/Math.max(bank,0.01))/Math.log(mo))+' winning days in a row</b> at '+fmtOdds(mo)+'. One loss at a big stake wipes out most of the bankroll.</div>';
  }
  $("need").innerHTML=need;$("needWarn").innerHTML=warn;
  var bySp={};L.rows.forEach(function(r){if(r.b.res==="P"||r.b.res==="V")return;var k=r.b.sport;bySp[k]=(bySp[k]||0)+r.profit;});
  $("bySport").innerHTML=Object.keys(bySp).length?"By sport: "+Object.keys(bySp).map(function(k){return sportOf(k).icon+" <span class='"+(bySp[k]>=0?"W":"L")+"'>"+sign(bySp[k])+"</span>";}).join(" · "):"";
  var g=dailyR()-1;
  $("planOut").innerHTML="<b>"+totalDays()+"</b> bet days · need <b>+"+(g*100).toFixed(1)+"%</b> a day · day 1 quota <b>"+money(pl.start*g)+"</b>"+(mo?"<br>At "+fmtOdds(mo)+" odds that's a "+(g/(mo-1)*100).toFixed(0)+"% stake each day.":"");
  drawPlanChart(L);
}
function drawPlanChart(L){
  var c=$("chart"),x=c.getContext("2d"),W=c.width,H=c.height,pl=70,pr=14,pt=14,pb=34,PL=plan();x.clearRect(0,0,W,H);
  var n=totalDays(),lo=Math.log(Math.max(1,Math.min(PL.start,Math.max(L.bank,1))*0.8)),hi=Math.log(PL.goal*1.1);
  function X(i){return pl+(W-pl-pr)*i/n;}function Y(v){return pt+(H-pt-pb)*(1-(Math.log(Math.max(v,1))-lo)/(hi-lo));}
  x.font="20px sans-serif";x.fillStyle="#8b949e";x.strokeStyle="#2a313c";x.lineWidth=1;
  [1,3,10,30,100,300,1e3,3e3,1e4,3e4,1e5,3e5,1e6].forEach(function(v){if(Math.log(v)<lo||Math.log(v)>hi)return;var y=Y(v);x.beginPath();x.moveTo(pl,y);x.lineTo(W-pr,y);x.stroke();x.fillText(km(v),4,y+6);});
  x.fillText(nice(PL.from),pl,H-6);var e=nice(PL.to);x.fillText(e,W-pr-x.measureText(e).width,H-6);
  x.save();x.beginPath();x.rect(pl,pt-4,W-pl-pr,H-pt-pb+8);x.clip();
  function line(fn,col,dash){x.beginPath();x.setLineDash(dash||[]);x.strokeStyle=col;x.lineWidth=3;for(var i=0;i<=n;i++){var y=Y(fn(i));i?x.lineTo(X(i),y):x.moveTo(X(i),y);}x.stroke();x.setLineDash([]);}
  line(function(i){return PL.start*Math.pow(dailyR(),i);},"#8b949e",[8,6]);
  var mo=P().rules.maxOdds;if(mo)line(function(i){return PL.start*Math.pow(mo,i);},"#388bfd",[3,5]);
  var R=planRef();if(R&&R.base<PL.goal&&R.base>0){var i0=daysBetween(PL.from,R.d);x.beginPath();x.setLineDash([10,5]);x.strokeStyle="#56d364";x.lineWidth=3;for(var k=0;k<=R.n;k++){var v=R.base*Math.pow(1+R.g,k);k?x.lineTo(X(i0+k),Y(v)):x.moveTo(X(i0),Y(v));}x.stroke();x.setLineDash([]);}
  var pts=[[0,PL.start]];Object.keys(L.days).sort().forEach(function(d){var i=daysBetween(PL.from,d)+1;if(i>=0&&i<=n)pts.push([i,L.days[d].close]);});
  x.strokeStyle="#f58426";x.lineWidth=4;x.beginPath();pts.forEach(function(p,k){k?x.lineTo(X(p[0]),Y(p[1])):x.moveTo(X(p[0]),Y(p[1]));});x.stroke();
  x.fillStyle="#f58426";pts.forEach(function(p){x.beginPath();x.arc(X(p[0]),Y(p[1]),5,0,7);x.fill();});x.restore();
}

/* ============ BETS (open / settled / calendar) ============ */
var betTab="open",calM=null;
function betRow(b,pr){
  var sp=sportOf(b.sport),meta=[sp.icon+" "+esc(leagueOf(b.sport,b.league).n)];
  if(b.away||b.home)meta.push(esc(nick(b.away))+" @ "+esc(nick(b.home)));else if(b.event)meta.push(esc(b.event));
  if(b.book)meta.push(esc(b.book));if(b.tipster)meta.push("tip: "+esc(b.tipster));
  var right=b.res==="P"?"Payout "+money(b.stake*b.odds):sign(pr);
  return '<div class="item" data-d="'+b.date+'"><div>'+esc(b.pick)+' @ '+fmtOdds(b.odds)+'<br><span class="sub">'+meta.join(" · ")+' · '+money(b.stake)+units(b.stake)+'</span></div><div class="'+(b.res==="C"?(pr>=0?"W":"L"):b.res)+'" style="text-align:right;white-space:nowrap"><span class="badge '+(b.res==="C"?"V":b.res)+'">'+RES[b.res].toUpperCase()+'</span><br><b>'+right+'</b></div></div>';
}
function renderBets(){
  [].forEach.call(document.querySelectorAll("#betTabs button"),function(b){b.classList.toggle("on",b.getAttribute("data-t")===betTab);});
  $("calCard").style.display=betTab==="cal"?"":"none";
  var L=ledger(),h="";
  if(betTab==="open"){
    var open=L.rows.filter(function(r){return r.b.res==="P";});
    var stake=open.reduce(function(s,r){return s+r.b.stake;},0),pay=open.reduce(function(s,r){return s+r.b.stake*r.b.odds;},0);
    h='<div class="slipsum"><span>Open bets</span><b>'+open.length+'</b></div><div class="slipsum"><span>Total at stake</span><b>'+money(stake)+'</b></div><div class="slipsum"><span>Potential payout</span><b class="W">'+money(pay)+'</b></div>';
    open.slice().reverse().forEach(function(r){h+=betRow(r.b,r.profit);});
    if(!open.length)h+='<div class="note">No open bets.</div>';
  } else {
    var months={};
    Object.keys(L.days).sort().reverse().forEach(function(d){var m=d.slice(0,7);(months[m]=months[m]||[]).push(d);});
    Object.keys(months).forEach(function(m){
      var mp=months[m].reduce(function(s,d){return s+L.days[d].profit;},0),mw=0,ml=0;months[m].forEach(function(d){mw+=L.days[d].w;ml+=L.days[d].l;});
      h+='<div class="dh" style="font-size:15px;margin-top:18px"><span>'+parse(m+"-01").toLocaleDateString("en-AU",{month:"long",year:"numeric"})+' <span class="sub">'+mw+'–'+ml+'</span></span><span class="'+(mp>=0?"W":"L")+'">'+sign(mp)+'</span></div>';
      if(betTab==="settled")months[m].forEach(function(dd){
        var Dd=L.days[dd],rows=L.rows.filter(function(r){return r.b.date===dd&&r.b.res!=="P";});
        var moves=P().moves.filter(function(x){return x.date===dd;});
        if(!rows.length&&!moves.length&&!Dd.eod)return;
        h+='<div class="dh"><span>'+nice(dd,{weekday:"short",day:"numeric",month:"short"})+'</span><span class="'+(Dd.profit>=0?"W":"L")+'">'+sign(Dd.profit)+' → '+money(Dd.close)+'</span></div>';
        moves.forEach(function(x){h+='<div class="item" data-d="'+dd+'"><div>💰 '+(x.amount>=0?"Money added":"Money withdrawn")+(x.note?'<br><span class="sub">'+esc(x.note)+'</span>':'')+'</div><div class="D"><b>'+sign(x.amount)+'</b></div></div>';});
        rows.forEach(function(r){h+=betRow(r.b,r.profit);});
        if(Dd.eod)h+='<div class="item" data-d="'+dd+'"><div>🌙 End-of-day balance <b>'+money(Dd.eod.balance)+'</b><br><span class="sub">'+(Dd.eod.kind==="money"?"Gap logged as money in/out":"Gap logged as betting result")+'</span></div><div class="'+(Dd.eod.adj>=0?"W":"L")+'"><b>'+sign(Dd.eod.adj)+'</b></div></div>';
      });
    });
    if(!Object.keys(months).length)h='<div class="note">Nothing settled yet.</div>';
  }
  $("betList").innerHTML=h;
  if(betTab==="cal")renderCal(L);
}
function renderCal(L){
  var PL=plan();
  if(!calM){var t=new Date(),f=parse(PL.from);calM=(t<f||t>parse(PL.to))?new Date(f.getFullYear(),f.getMonth(),1):new Date(t.getFullYear(),t.getMonth(),1);}
  $("calTitle").textContent=calM.toLocaleDateString("en-AU",{month:"long",year:"numeric"});
  var h="",t=todayIso(),R=planRef();
  ["M","T","W","T","F","S","S"].forEach(function(d){h+='<div class="dow">'+d+'</div>';});
  var first=new Date(calM.getFullYear(),calM.getMonth(),1),off=(first.getDay()+6)%7,dim=new Date(calM.getFullYear(),calM.getMonth()+1,0).getDate();
  for(var i=0;i<off;i++)h+='<div></div>';
  for(var d=1;d<=dim;d++){
    var di=iso(new Date(calM.getFullYear(),calM.getMonth(),d)),inW=di>=PL.from&&di<=PL.to,Dd=L.days[di],cls="day"+(inW?" window":" out");
    if(Dd){var hasRes=Dd.n||(Dd.eod&&Dd.eod.kind!=="money");cls+=!hasRes?" dep":(Dd.p&&!Dd.eod)?" pend":Dd.profit>0?" win":Dd.profit<0?" loss":" void";}
    if(di===t)cls+=" today";
    h+='<div class="'+cls+'" data-d="'+di+'"><span class="n">'+d+'</span>'+(Dd?'<span class="c">'+(Dd.eod?"🌙":"")+(Dd.dep?"💰":"")+(Dd.w+Dd.l?Dd.w+"-"+Dd.l:"")+'</span>':'');
    if(Dd)h+='<span class="v">'+(Dd.n&&Dd.p===Dd.n&&!Dd.eod?"⏳":km(Dd.close))+'</span>';
    if(inW)h+='<span class="t">🎯'+km(shownTarget(di,R))+'</span>';
    h+='</div>';
  }
  $("calGrid").innerHTML=h;
}

/* ============ BET SLIP ============ */
var editingId=null,stakeTouched=false,F;
function freshF(){var sp=firstAllowedSport();return {sport:sp,league:firstAllowedLeague(sp),market:sportOf(sp).markets[0],sel:"",ou:"Over",res:"P"};}
function firstAllowedSport(){var L=P().rules.leagues;for(var i=0;i<SPORTS.length;i++)if(SPORTS[i].k in L)return SPORTS[i].k;return SPORTS[0].k;}
function firstAllowedLeague(sp){var L=P().rules.leagues[sp],ls=sportOf(sp).leagues;if(Array.isArray(L)&&L.length)return L[0];return ls[0].k;}
function seg(id,items,cur,cb){
  var el=$(id),html=items.map(function(it){return '<button type="button" data-v="'+esc(it[0])+'" class="'+(it[0]===cur?"on":"")+(it[2]?" dis":"")+'">'+esc(it[1])+'</button>';}).join("");
  if(el._html!==html){el.innerHTML=html;el._html=html;}   // only redraw when something changed, so taps aren't lost mid-redraw
  el.onclick=function(e){var b=e.target.closest("button");if(!b)return;cb(b.getAttribute("data-v"));};
}
function sideLabels(sp){return sp==="tennis"||sp==="mma"?["Player / fighter 1","Player / fighter 2"]:["Away team","Home team"];}
function renderForm(){
  var sp=sportOf(F.sport),R=P().rules;
  seg("fSport",SPORTS.map(function(s){return [s.k,s.icon+" "+s.n,!(s.k in R.leagues)];}),F.sport,function(v){F.sport=v;F.league=firstAllowedLeague(v);F.market=sportOf(v).markets[0];F.sel="";renderForm();});
  var lh="";sp.leagues.forEach(function(l){var ok=sportAllowed(sp.k,l.k)==="";lh+='<option value="'+l.k+'"'+(l.k===F.league?" selected":"")+'>'+esc(l.n)+(ok?"":" — not in your rules")+'</option>';});
  $("fLeague").innerHTML=lh;
  var lg=leagueOf(sp.k,F.league),teams=(lg.teams||[]).concat(P().custom.teams);
  $("dlTeams").innerHTML=teams.filter(function(t,i,a){return a.indexOf(t)===i;}).map(function(t){return '<option value="'+esc(t)+'">';}).join("");
  $("dlPlayers").innerHTML=P().custom.players.map(function(t){return '<option value="'+esc(t)+'">';}).join("");
  $("dlBooks").innerHTML=BOOKS.concat(P().custom.books).filter(function(t,i,a){return a.indexOf(t)===i;}).map(function(t){return '<option value="'+esc(t)+'">';}).join("");
  $("dlTipsters").innerHTML=P().custom.tipsters.map(function(t){return '<option value="'+esc(t)+'">';}).join("");
  var lb=sideLabels(sp.k);$("lblA").textContent=lb[0];$("lblB").textContent=lb[1];
  var field=sp.kind==="field";$("optTeams").style.display=field?"none":"";$("optEvent").style.display=field?"":"none";
  if(sp.markets.indexOf(F.market)<0)F.market=sp.markets[0];
  seg("fMarket",sp.markets.map(function(k){return [k,marketOf(k).n,R.bannedMarkets.indexOf(k)>=0];}),F.market,function(v){F.market=v;renderForm();});
  var m=marketOf(F.market),a=$("fAway").value.trim(),h=$("fHome").value.trim(),opts=[];
  if(a)opts.push([a,nick(a)]);if(h)opts.push([h,nick(h)]);if(F.market==="x12")opts.push(["Draw","Draw"]);
  if(F.sel&&!opts.some(function(o){return o[0]===F.sel;}))F.sel="";
  seg("fSel",opts.length?opts:[["","Enter both sides first"]],F.sel,function(v){if(v){F.sel=v;renderForm();}});
  seg("fOU",[["Over","Over"],["Under","Under"]],F.ou,function(v){F.ou=v;renderForm();});
  seg("fRes",[["P","Active"],["W","Won"],["L","Lost"],["C","Cash out"],["V","Void"]],F.res,function(v){F.res=v;renderForm();});
  $("optCash").style.display=F.res==="C"?"":"none";
  ["sel","ou","player","desc","line","legs"].forEach(function(k){$("opt"+{sel:"Sel",ou:"OU",player:"Player",desc:"Desc",line:"Line",legs:"Legs"}[k]).style.display=m.f.indexOf(k)>=0?"":"none";});
  $("lblLine").textContent=m.lbl||"Line";$("fDesc").placeholder=m.ph||"Details";
  $("lblPlayer").textContent=sp.k==="racing"?"Runner":sp.k==="f1"?"Driver":sp.k==="golf"?"Golfer":sp.k==="tennis"?"Player":"Player / selection";
  $("lblDesc").textContent=F.market==="prop"||F.market==="runs"?"Stat":"Details";
  var fo=S.display.odds;$("fOdds").setAttribute("inputmode",fo==="dec"?"decimal":"text");$("fOdds").placeholder=fo==="us"?"-400 or +150":fo==="frac"?"1/4":"1.25";
  $("oddsCap").textContent=R.maxOdds?"(max "+fmtOdds(R.maxOdds)+")":"";$("curSym").textContent=cur();
  var cl=checklistFor(sp.k);
  var prev=[].map.call(document.querySelectorAll("#checks input"),function(c){return c.checked;});
  $("checks").innerHTML=cl.map(function(t,i){return '<label class="chk"><input type="checkbox"'+(prev[i]&&$("checks").getAttribute("data-sp")===sp.k?" checked":"")+'> '+esc(t)+'</label>';}).join("");
  $("checks").setAttribute("data-sp",sp.k);
  $("checkWrap").style.display=cl.length?"":"none";
  validate();
}
function signed(v){v=String(v).trim();return v&&!/^[-+]/.test(v)?"+"+v:v;}
function buildPick(){
  var m=F.market,ln=$("fLine").value.trim(),pl=$("fPlayer").value.trim(),ds=$("fDesc").value.trim(),sel=F.sel==="Draw"?"Draw":nick(F.sel),lg=$("fLegs").value.trim();
  var totLbl={total:"total",goals:"goals",corners:"corners",cards:"cards",totruns:"runs",games:"games"}[m];
  switch(m){
    case "h2h":case "winner":return sel?sel+" to win":"";
    case "x12":return F.sel?(F.sel==="Draw"?"Draw (1X2)":sel+" to win (1X2)"):"";
    case "line":case "ah":case "sets":return sel&&ln?sel+" "+signed(ln):"";
    case "total":case "goals":case "corners":case "cards":case "totruns":case "games":return ln?F.ou+" "+ln+" "+totLbl:"";
    case "tt":return sel&&ln?sel+" "+F.ou+" "+ln:"";
    case "margin":return sel&&ds?sel+" by "+ds:"";
    case "prop":case "runs":return pl&&ln?pl+" "+F.ou+" "+ln+(ds?" "+ds:""):"";
    case "outright":return pl?pl+" to win":"";
    case "scorer":case "topbat":case "podium":case "matchup":case "method":case "place":return pl?pl+(ds?" — "+ds:""):"";
    case "btts":return ds?"BTTS: "+ds:"";
    case "sgm":case "multi":return ds?(lg?lg+"-leg ":"")+(m==="sgm"?"SGM":"Multi")+": "+ds:"";
    default:return ds;
  }
}
function validate(){
  var errs=[],date=$("fDate").value,sp=sportOf(F.sport),R=P().rules,away=$("fAway").value.trim(),home=$("fHome").value.trim();
  var odds=parseOdds($("fOdds").value),pick=buildPick(),m=F.market;
  var bs=date?bankAtStart(date):plan().start,ds=date?dayState(date,editingId):{n:0,profit:0,pendStake:0,pendWin:0};
  var avail=bs+ds.profit-ds.pendStake,q=date?quotaFor(date,bs):null,left=q&&!q.done?q.win-ds.profit-ds.pendWin:0;
  if(!stakeTouched&&odds>1&&(!R.maxOdds||odds<=R.maxOdds)&&q&&!q.done&&left>0){
    var qs=Math.min(avail,Math.ceil(left/(odds-1)*100)/100);if(R.maxStakePct)qs=Math.min(qs,Math.floor(avail*R.maxStakePct)/100);$("fStake").value=qs>0?qs.toFixed(2):"";}
  var stake=parseFloat($("fStake").value);
  $("pickPrev").innerHTML=pick?'<div class="selname">'+esc(pick)+'</div><div class="selmatch">'+sp.icon+' '+esc(leagueOf(sp.k,F.league).n)+(away||home?' · '+esc(nick(away)||"?")+' @ '+esc(nick(home)||"?"):'')+' · '+esc(marketOf(m).n)+'</div><span class="oddsb'+(R.maxOdds&&odds>R.maxOdds?" over":"")+'">'+(odds>1?fmtOdds(odds):"–")+'</span>':'<div class="sub">Fill in the bet — your selection shows here.</div>';
  var mx=maxPerDay();
  $("dayCount").textContent=date?("Bets on this day: "+ds.n+(mx?" of "+mx:"")+(editingId?" (not counting this one)":"")+(closeOn(date)?" · this day has an end-of-day balance":"")):"";
  $("stakeHint").innerHTML=date?"Balance at start of day <b>"+money(bs)+"</b> · available now <b>"+money(avail)+"</b>"+(R.maxStakePct?" · max stake "+R.maxStakePct+"% = <b>"+money(avail*R.maxStakePct/100)+"</b>":""):"";
  var qh;
  if(!q)qh="This date is outside your plan ("+nice(plan().from)+" – "+nice(plan().to)+").";
  else if(q.done)qh="🎉 Goal already reached.";
  else{qh="🎯 Quota for "+nice(date)+": <b>win "+money(q.win)+"</b> (+"+(q.g*100).toFixed(1)+"%) · "+q.n+" bet days left";
    if(ds.n)qh+="<br>Other bets that day cover "+money(ds.profit+ds.pendWin)+(ds.pendWin?" (incl. active)":"");
    if(left<=0)qh+="<br>✅ Quota already covered by your other bets that day.";
    else{qh+="<br>Still needed from this bet: <b>"+money(left)+"</b>";if(odds>1){var nd=left/(odds-1);qh+="<br>At "+fmtOdds(odds)+" that's a <b>"+money(nd)+"</b> stake"+(nd>avail?" — more than you have.":"");}else qh+="<br>Enter the odds and the stake fills in automatically.";}}
  $("quota").innerHTML=qh;

  // checks
  if(cooling())errs.push("You're on a break until "+new Date(S.safer.coolUntil).toLocaleString("en-AU",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})+".");
  if(!date)errs.push("Pick a date.");
  if(mx&&ds.n>=mx)errs.push("Already "+mx+" bets on "+nice(date)+" — your daily max.");
  var sa=sportAllowed(sp.k,F.league);
  if(sa==="no-sport")errs.push(sp.n+" isn't in your allowed sports.");else if(sa==="no-league")errs.push(leagueOf(sp.k,F.league).n+" isn't in your allowed leagues.");
  if(R.bannedMarkets.indexOf(m)>=0)errs.push(marketOf(m).n+" is a banned market in your rules.");
  if(sp.kind!=="field"&&m!=="multi"){if(!away||!home)errs.push("Enter both sides.");else if(away.toLowerCase()===home.toLowerCase())errs.push("The two sides can't be the same.");}
  if(!pick)errs.push("Fill in the bet details.");
  bannedHits([away,home,pick,$("fPlayer").value,$("fDesc").value,$("fNote").value,$("fEvent").value]).forEach(function(hh){errs.push("Banned in your rules: "+hh);});
  if(!(odds>1))errs.push(S.display.odds==="dec"?"Enter the odds (e.g. 1.25).":S.display.odds==="us"?"Enter American odds (e.g. -400 or +150).":"Enter fractional odds (e.g. 1/4).");
  else if(R.maxOdds&&odds>R.maxOdds+1e-9)errs.push("Odds "+fmtOdds(odds)+" are over your max of "+fmtOdds(R.maxOdds)+".");
  var legs=parseInt($("fLegs").value,10);if((m==="sgm"||m==="multi")&&R.maxLegs&&legs>R.maxLegs)errs.push(legs+" legs is over your max of "+R.maxLegs+".");
  if(!(stake>0))errs.push("Enter a stake.");
  else{if(stake>avail+0.005)errs.push("Stake "+money(stake)+" is more than you have available ("+money(avail)+").");
    if(R.maxStakePct&&stake>avail*R.maxStakePct/100+0.005)errs.push("Stake is over your "+R.maxStakePct+"% max ("+money(avail*R.maxStakePct/100)+").");
    var ll=limit("loss");if(ll&&date){var lost=-Math.min(0,lossOn(date,editingId));if(lost>=ll)errs.push("You've hit your daily loss limit ("+money(ll)+").");else if(F.res==="P"&&stake>ll-lost+0.005)errs.push("This stake could take you past your daily loss limit — "+money(ll-lost)+" left today.");}}
  if(F.res==="C"&&!(parseFloat($("fCash").value)>=0))errs.push("Enter the cash-out amount you got back.");
  var ev="";
  if(stake>0&&odds>1){var win=stake*(odds-1);
    ev='<div class="slipsum"><span>Odds</span><b>'+fmtOdds(odds)+'</b></div><div class="slipsum"><span>Stake</span><b>'+money(stake)+units(stake)+'</b></div><div class="slipsum"><span>Est. Payout</span><b class="W">'+money(stake*odds)+'</b></div><div class="slipsum"><span>Profit</span><b class="W">+'+money(win)+(q&&!q.done&&left>0&&win+0.005>=left?" ✅ quota":"")+'</b></div>'+
      (q&&!q.done&&left>0&&win+0.005<left?'<div class="slipsum"><span>Short of quota</span><b class="L">'+money(left-win)+'</b></div>':'')+'<div class="slipsum"><span>If lost, balance</span><b>'+money(bs+ds.profit-stake)+'</b></div>';}
  $("evOut").innerHTML=ev;
  if(R.requireChecklist){var un=[].filter.call(document.querySelectorAll("#checks input"),function(c){return !c.checked;}).length;if(un)errs.push(un+" checklist step"+(un>1?"s":"")+" not ticked.");}
  $("gate").innerHTML=errs.length?'<div class="alertbox bad">'+errs.map(esc).join("<br>")+'</div>':'<div class="alertbox good">All your rules pass. Good to place.</div>';
  $("saveBet").disabled=!!errs.length;$("saveBet").style.opacity=errs.length?.45:1;
  return !errs.length;
}
function remember(list,v,max){v=String(v||"").trim();if(!v)return;var i=list.indexOf(v);if(i>=0)list.splice(i,1);list.unshift(v);if(list.length>max)list.length=max;}
function saveBet(){
  if(!validate())return;
  var b=cleanBet({id:editingId||Date.now(),date:$("fDate").value,sport:F.sport,league:F.league,away:$("fAway").value,home:$("fHome").value,event:$("fEvent").value,
    market:F.market,sel:F.sel,ou:F.ou,line:$("fLine").value,player:$("fPlayer").value,desc:$("fDesc").value,legs:$("fLegs").value,pick:buildPick(),
    odds:parseOdds($("fOdds").value),stake:parseFloat($("fStake").value),res:F.res,cash:parseFloat($("fCash").value),book:$("fBook").value,tipster:$("fTipster").value,note:$("fNote").value});
  if(!b){toast("Something's not right with that bet.");return;}
  var p=P();if(editingId)p.bets=p.bets.map(function(x){return x.id===editingId?b:x;});else p.bets.push(b);
  var lg=leagueOf(b.sport,b.league);[b.away,b.home].forEach(function(t){if(t&&(lg.teams||[]).indexOf(t)<0)remember(p.custom.teams,t,500);});
  remember(p.custom.players,b.player,500);if(b.book&&BOOKS.indexOf(b.book)<0)remember(p.custom.books,b.book,100);remember(p.custom.tipsters,b.tipster,100);
  save();toast(b.res==="W"?"Bet logged — Won":b.res==="L"?"Bet logged — Lost. Don't chase.":"Bet placed ✅");
  var d=b.date;resetForm(d);renderAll();go("bets");openDay(d);
}
function resetForm(date){
  editingId=null;stakeTouched=false;F=freshF();$("fDate").value=date||todayIso();
  ["fAway","fHome","fEvent","fOdds","fStake","fNote","fLine","fPlayer","fDesc","fLegs","fCash","fBook","fTipster"].forEach(function(i){$(i).value="";});
  $("checks").innerHTML="";
  $("saveBet").textContent="Place Bet";$("logTitle").innerHTML='🧾 Bet Slip <span class="tag" style="margin-left:auto">SINGLE</span>';$("cancelEdit").style.display="none";
  renderForm();
}
function loadForm(b){
  resetForm(b.date);editingId=b.id;stakeTouched=true;
  F={sport:b.sport,league:b.league,market:b.market,sel:b.sel,ou:b.ou,res:b.res};
  $("fAway").value=b.away;$("fHome").value=b.home;$("fEvent").value=b.event;$("fLine").value=b.line;$("fPlayer").value=b.player;$("fDesc").value=b.desc;$("fLegs").value=b.legs||"";
  $("fOdds").value=fmtOdds(b.odds);$("fStake").value=b.stake;$("fCash").value=b.res==="C"?b.cash:"";$("fBook").value=b.book;$("fTipster").value=b.tipster;$("fNote").value=b.note;
  renderForm();[].forEach.call(document.querySelectorAll("#checks input"),function(c){c.checked=true;});
  $("saveBet").textContent="Update Bet";$("logTitle").innerHTML="✏️ Edit Bet";$("cancelEdit").style.display="";validate();
}

/* ============ day sheet ============ */
function openDay(di){
  var bs=betsOn(di),start=bankAtStart(di),q=quotaFor(di,start),ds=dayState(di),mx=maxPerDay();
  var h='<h2 style="margin:0 0 4px">'+nice(di,{weekday:"long",day:"numeric",month:"long"})+'</h2><div class="sub">Start '+money(start)+(q&&!q.done?' · quota win '+money(q.win):'')+' · target close '+money(shownTarget(di))+'</div>';
  if(bs.length)h+='<div class="sub">Day so far: <b class="'+(ds.profit>=0?"W":"L")+'">'+sign(ds.profit)+'</b> → '+money(start+ds.profit)+'</div>';
  bs.forEach(function(b){
    var pr=profitOf(b);
    h+='<div class="bet"><b>'+esc(b.pick)+'</b> @ <b>'+fmtOdds(b.odds)+'</b><br><span class="sub">'+sportOf(b.sport).icon+' '+esc(leagueOf(b.sport,b.league).n)+((b.away||b.home)?' · '+esc(nick(b.away))+' @ '+esc(nick(b.home)):'')+' · '+esc(marketOf(b.market).n)+(b.book?' · '+esc(b.book):'')+'</span><br>Stake '+money(b.stake)+' · <span class="badge '+(b.res==="C"?"V":b.res)+'">'+RES[b.res].toUpperCase()+'</span> '+(b.res==="P"||b.res==="V"?"":'<b class="'+(pr>=0?"W":"L")+'">'+sign(pr)+'</b>')+(b.note?'<br><span class="sub">'+esc(b.note)+'</span>':'');
    if(b.res==="P")h+='<div class="row"><button data-a="W" data-id="'+b.id+'">Won</button><button data-a="L" data-id="'+b.id+'" style="background:#da3633;color:#fff">Lost</button><button class="sec" data-a="V" data-id="'+b.id+'">Void</button></div>';
    h+='<div class="row"><button class="sec" data-a="edit" data-id="'+b.id+'">Edit</button><button class="sec" data-a="del" data-id="'+b.id+'" style="color:#ff7b72">Delete</button></div></div>';
  });
  P().moves.filter(function(m){return m.date===di;}).forEach(function(m){h+='<div class="bet"><b class="D">💰 '+(m.amount>=0?"Added "+money(m.amount):"Withdrew "+money(-m.amount))+'</b>'+(m.note?'<br><span class="sub">'+esc(m.note)+'</span>':'')+'<div class="row"><button class="sec" data-a="mdel" data-id="'+m.id+'" style="color:#ff7b72">Delete</button></div></div>';});
  var ce=closeOn(di),LD=ledger().days[di];
  if(ce&&LD&&LD.eod)h+='<div class="bet"><b>🌙 End-of-day balance '+money(ce.balance)+'</b><br>'+(LD.eod.kind==="money"?"Money in/out":"Day's betting result")+': <b class="'+(LD.eod.adj>=0?"W":"L")+'">'+sign(LD.eod.adj)+'</b>'+(ce.note?'<br><span class="sub">'+esc(ce.note)+'</span>':'')+'<div class="row"><button class="sec" data-a="eod">Change</button><button class="sec" data-a="cdel" style="color:#ff7b72">Delete</button></div></div>';
  if(!bs.length)h+='<div class="note">No bets'+(di<todayIso()?' — a sit-out day.':' yet.')+'</div>';
  if(!mx||bs.length<mx)h+='<button data-a="new">➕ Add a bet'+(mx?' ('+bs.length+'/'+mx+')':'')+'</button>';else h+='<div class="note">Daily max of '+mx+' bets reached.</div>';
  if(!ce)h+='<button class="sec" data-a="eod">🌙 Set end-of-day balance</button>';
  h+='<button class="sec" data-a="money">💰 Add or withdraw money</button><button class="sec" data-a="close">Close</button>';
  $("sheet").innerHTML=h;$("modal").classList.add("on");
  $("sheet").onclick=function(e){
    var el=e.target.closest("button");if(!el)return;var a=el.getAttribute("data-a"),id=+el.getAttribute("data-id"),p=P(),b=null;
    p.bets.forEach(function(x){if(x.id===id)b=x;});
    function twice(fn){if(el.getAttribute("data-sure"))fn();else{el.setAttribute("data-sure","1");el.textContent="Tap again";}}
    if(a==="close")closeModal();
    else if(a==="new"){closeModal();resetForm(di);go("log");}
    else if(a==="edit"){closeModal();loadForm(b);go("log");}
    else if(a==="del")twice(function(){p.bets=p.bets.filter(function(x){return x.id!==id;});save();renderAll();openDay(di);toast("Bet deleted.");});
    else if(a==="mdel")twice(function(){p.moves=p.moves.filter(function(x){return x.id!==id;});save();renderAll();openDay(di);toast("Entry deleted.");});
    else if(a==="cdel")twice(function(){p.closes=p.closes.filter(function(x){return x.date!==di;});save();renderAll();openDay(di);toast("End-of-day balance removed.");});
    else if(a==="eod")openClose(di);
    else if(a==="money")openMoney(di);
    else if(a==="W"||a==="L"||a==="V"){b.res=a;save();renderAll();openDay(di);toast(a==="W"?"Win logged":a==="L"?"Loss logged. Don't chase.":"Void logged.");}
  };
}
function closeModal(){$("modal").classList.remove("on");}

/* ============ money in / out ============ */
function openMoney(di){
  if(cooling()){toast("Deposits are paused during your break.");return;}
  var kind="add";
  function draw(v){
    $("sheet").innerHTML='<h2 style="margin:0 0 4px">💰 Add or withdraw money</h2><div class="sub">Changes your balance in <b>'+esc(P().name)+'</b>. Not counted as betting profit.</div>'+
      '<label>Type</label><div class="seg" id="mKind"><button type="button" data-k="add" class="'+(kind==="add"?"on":"")+'">➕ Add money</button><button type="button" data-k="out" class="'+(kind==="out"?"on":"")+'">➖ Withdraw</button></div>'+
      '<label>Date</label><input type="date" id="mDate"><label>Amount</label><input type="number" id="mAmt" step="0.01" inputmode="decimal"><label>Note (optional)</label><input id="mNote" maxlength="200">'+
      '<div class="note" id="mLim"></div><div id="mMsg"></div><button id="mSave">Save</button><button class="sec" id="mCancel">Cancel</button>';
    $("modal").classList.add("on");$("mDate").value=v?v[0]:(di||todayIso());if(v){$("mAmt").value=v[1];$("mNote").value=v[2];}
    var dl=limit("dep");if(dl&&kind==="add")$("mLim").textContent="Weekly deposit limit "+money(dl)+" · used "+money(depositsLast7($("mDate").value))+" in the last 7 days.";
    $("sheet").onclick=function(e){
      var k=e.target.getAttribute("data-k");if(k){kind=k;draw([$("mDate").value,$("mAmt").value,$("mNote").value]);return;}
      if(e.target.id==="mCancel")closeModal();
      if(e.target.id==="mSave"){
        var d=$("mDate").value,amt=parseFloat($("mAmt").value),err="";
        if(!vdate(d)||!(amt>0))err="Enter a date and an amount above 0.";
        else if(kind==="out"){var have=bankAtStart(d)+dayState(d).profit;if(amt>have+0.005)err="You only have "+money(have)+" on that day.";}
        else{var dl=limit("dep");if(dl&&depositsLast7(d)+amt>dl+0.005)err="That would go over your weekly deposit limit of "+money(dl)+" ("+money(Math.max(0,dl-depositsLast7(d)))+" left).";}
        if(err){$("mMsg").innerHTML='<div class="alertbox bad">'+esc(err)+'</div>';return;}
        P().moves.push({id:uid(),date:d,amount:+(kind==="out"?-amt:amt).toFixed(2),note:str($("mNote").value,200)});
        save();renderAll();validate();closeModal();toast(kind==="out"?"Withdrawal logged.":money(amt)+" added. Quota recalculated.");
      }
    };
  }
  draw();
}

/* ============ end-of-day balance ============ */
function appCloseFor(d){var p=P(),keep=p.closes;p.closes=keep.filter(function(c){return c.date!==d;});var b=ledger(addDays(d,1)).bank;p.closes=keep;return b;}
function openClose(di){
  var ex=closeOn(di||todayIso()),kind=ex?ex.kind:"bet";
  function draw(v){
    $("sheet").innerHTML='<h2 style="margin:0 0 4px">🌙 End-of-day balance</h2><div class="sub">Type the balance your bookie account shows at the end of the day. The app matches it and logs the difference.</div>'+
      '<label>Date</label><input type="date" id="cDate"><label>Balance at end of day</label><input type="number" id="cBal" step="0.01" inputmode="decimal"><div class="ev" id="cDiff" style="margin-top:8px"></div>'+
      '<label>Count the difference as</label><div class="seg" id="cKind"><button type="button" data-k="bet" class="'+(kind==="bet"?"on":"")+'">🎯 Betting result</button><button type="button" data-k="money" class="'+(kind==="money"?"on":"")+'">💰 Money in/out</button></div>'+
      '<label>Note (optional)</label><input id="cNote" maxlength="200"><div id="cMsg"></div><button id="cSave">Save balance</button><button class="sec" id="cCancel">Cancel</button>';
    $("modal").classList.add("on");$("cDate").value=v?v[0]:(di||todayIso());
    if(v){$("cBal").value=v[1];$("cNote").value=v[2];}else if(ex){$("cBal").value=ex.balance;$("cNote").value=ex.note;}
    function diff(){var dd=$("cDate").value,bal=parseFloat($("cBal").value);if(!vdate(dd)){$("cDiff").innerHTML="";return;}var app=appCloseFor(dd),t="App's balance for end of "+nice(dd)+": <b>"+money(app)+"</b>";if(bal>=0){var g=bal-app;t+="<br>Difference: <b class='"+(g>=0?"W":"L")+"'>"+sign(g)+"</b>"+(Math.abs(g)<0.005?" — matches ✅":"");}$("cDiff").innerHTML=t;}
    diff();$("cDate").oninput=diff;$("cBal").oninput=diff;
    $("sheet").onclick=function(e){
      var k=e.target.getAttribute("data-k");if(k){kind=k;draw([$("cDate").value,$("cBal").value,$("cNote").value]);return;}
      if(e.target.id==="cCancel")closeModal();
      if(e.target.id==="cSave"){var dd=$("cDate").value,bal=parseFloat($("cBal").value);if(!vdate(dd)||!(bal>=0)){$("cMsg").innerHTML='<div class="alertbox bad">Enter a date and your balance.</div>';return;}
        var p=P();p.closes=p.closes.filter(function(c){return c.date!==dd;});p.closes.push({id:uid(),date:dd,balance:+bal.toFixed(2),kind:kind,note:str($("cNote").value,200)});
        save();renderAll();validate();closeModal();toast("Balance set to "+money(bal)+".");}
    };
  }
  draw();
}

/* ============ STATS ============ */
var statPeriod="all",statDim="sport";
function periodRange(){var t=todayIso(),f;switch(statPeriod){case "7d":f=addDays(t,-6);break;case "30d":f=addDays(t,-29);break;case "month":f=t.slice(0,8)+"01";break;case "year":f=t.slice(0,5)+"01-01";break;default:f="0000-01-01";}return [f,"9999-12-31"];}
function oddsBand(o){return o<1.2?"1.01–1.19":o<1.4?"1.20–1.39":o<1.7?"1.40–1.69":o<2.2?"1.70–2.19":o<3.5?"2.20–3.49":"3.50+";}
var DIMS={sport:["Sport",function(b){return sportOf(b.sport).icon+" "+sportOf(b.sport).n;}],league:["League",function(b){return leagueOf(b.sport,b.league).n;}],
  market:["Market",function(b){return marketOf(b.market).n;}],book:["Bookmaker",function(b){return b.book||"(none)";}],tipster:["Tipster",function(b){return b.tipster||"(none)";}],
  odds:["Odds",function(b){return oddsBand(b.odds);}],type:["Bet type",function(b){return b.market==="sgm"?"Same game multi":b.market==="multi"?"Multi":"Single";}],
  weekday:["Weekday",function(b){return parse(b.date).toLocaleDateString("en-AU",{weekday:"long"});}]};
function summarize(list){var o={n:list.length,w:0,l:0,staked:0,profit:0,odds:0};list.forEach(function(b){var p=profitOf(b);o.staked+=b.stake;o.profit+=p;o.odds+=b.odds;if(p>0)o.w++;else if(p<0)o.l++;});o.roi=o.staked?o.profit/o.staked*100:0;o.wr=o.w+o.l?o.w/(o.w+o.l)*100:0;o.avgOdds=o.n?o.odds/o.n:0;o.avgStake=o.n?o.staked/o.n:0;return o;}
function renderStats(){
  [].forEach.call(document.querySelectorAll("#statPeriod button"),function(b){b.classList.toggle("on",b.getAttribute("data-v")===statPeriod);});
  var r=periodRange(),all=P().bets.filter(function(b){return b.date>=r[0]&&b.date<=r[1];});
  var settled=all.filter(function(b){return b.res!=="P"&&b.res!=="V";}),s=summarize(settled);
  var best=settled.reduce(function(m,b){return Math.max(m,profitOf(b));},0),worst=settled.reduce(function(m,b){return Math.min(m,profitOf(b));},0);
  $("stTiles").innerHTML=[["Bets",all.length],["Profit",'<span class="'+(s.profit>=0?"W":"L")+'">'+sign(s.profit)+'</span>'+units(s.profit)],["ROI",'<span class="'+(s.roi>=0?"W":"L")+'">'+s.roi.toFixed(1)+'%</span>'],
    ["Progression",'<span class="'+(s.profit>=0?"W":"L")+'">'+(s.profit/plan().start*100).toFixed(1)+'%</span>'],["Win rate",s.w+s.l?s.wr.toFixed(0)+"%":"–"],["Record",s.w+"–"+s.l],
    ["Avg odds",s.n?fmtOdds(s.avgOdds):"–"],["Avg stake",s.n?money(s.avgStake):"–"],["Best / worst",'<span class="W">'+sign(best)+'</span> / <span class="L">'+sign(worst)+'</span>']]
    .map(function(t){return '<div class="stat"><b>'+t[1]+'</b><span>'+t[0]+'</span></div>';}).join("");
  // states
  var st={P:[],W:[],L:[],C:[],V:[]};all.forEach(function(b){st[b.res].push(b);});
  drawDonut([["Won",st.W.length,"#1fd65f"],["Lost",st.L.length,"#ff4d5e"],["Active",st.P.length,"#3d8cff"],["Cashed out",st.C.length,"#ffb534"],["Void",st.V.length,"#6e7f91"]]);
  $("stStates").innerHTML='<div class="slipsum" style="color:var(--txt)"><span><b>State</b></span><span><b>Total stake · Avg</b></span></div>'+["W","L","P","C","V"].map(function(k){var t=st[k].reduce(function(a,b){return a+b.stake;},0);return '<div class="slipsum"><span class="'+(k==="C"?"":k)+'">'+RES[k]+' ('+st[k].length+')</span><b>'+money(t)+' · '+(st[k].length?money(t/st[k].length):"–")+'</b></div>';}).join("");
  // breakdown
  seg("statDim",Object.keys(DIMS).map(function(k){return [k,DIMS[k][0]];}),statDim,function(v){statDim=v;renderStats();});
  var groups={};settled.forEach(function(b){var k=DIMS[statDim][1](b);(groups[k]=groups[k]||[]).push(b);});
  var rows=Object.keys(groups).map(function(k){var g=summarize(groups[k]);g.k=k;return g;}).sort(function(a,b){return b.profit-a.profit;});
  var mxp=rows.reduce(function(m,r){return Math.max(m,Math.abs(r.profit));},0)||1;
  $("stBreak").innerHTML=rows.length?rows.map(function(r){var w=Math.max(2,Math.abs(r.profit)/mxp*100);return '<div style="margin-top:10px"><div class="slipsum" style="margin:0"><span style="color:var(--txt)">'+esc(r.k)+' <span class="sub">'+r.w+'–'+r.l+' · ROI '+r.roi.toFixed(0)+'%</span></span><b class="'+(r.profit>=0?"W":"L")+'">'+sign(r.profit)+'</b></div><div style="height:6px;background:var(--bg);border-radius:4px;margin-top:4px"><div style="height:6px;width:'+w+'%;border-radius:4px;background:'+(r.profit>=0?"var(--win)":"var(--loss)")+'"></div></div></div>';}).join(""):'<div class="note">No settled bets in this period.</div>';
  renderOptimizer(settled,s);
  drawBalanceChart(r);
}
function drawDonut(parts){
  var c=$("stDonut"),x=c.getContext("2d"),W=c.width,H=c.height,cx=W/2,cy=H/2,R=Math.min(W,H)/2-10,tot=parts.reduce(function(s,p){return s+p[1];},0);x.clearRect(0,0,W,H);
  var a=-Math.PI/2;if(!tot){x.strokeStyle="#2c4757";x.lineWidth=34;x.beginPath();x.arc(cx,cy,R-17,0,7);x.stroke();}
  parts.forEach(function(p){if(!p[1])return;var e=a+p[1]/tot*Math.PI*2;x.strokeStyle=p[2];x.lineWidth=34;x.beginPath();x.arc(cx,cy,R-17,a,e);x.stroke();a=e;});
  x.fillStyle="#fff";x.font="bold 34px sans-serif";x.textAlign="center";x.fillText(tot,cx,cy+6);x.font="18px sans-serif";x.fillStyle="#9fb0c3";x.fillText("bets",cx,cy+30);
  $("stLegend").innerHTML=parts.map(function(p){return '<span><i style="background:'+p[2]+'"></i>'+p[0]+' '+p[1]+'</span>';}).join("");
}
function renderOptimizer(settled,s){
  var bad=[],dims=["sport","league","market","book","tipster","odds"];
  dims.forEach(function(dk){var g={};settled.forEach(function(b){var k=DIMS[dk][1](b);(g[k]=g[k]||[]).push(b);});
    Object.keys(g).forEach(function(k){var sm=summarize(g[k]);if(sm.n>=3&&sm.profit<0&&k!=="(none)")bad.push({dim:dk,k:k,s:sm});});});
  if(settled.length<10){$("stOpt").innerHTML='<div class="note">The optimizer needs at least 10 settled bets in this period.</div>';return;}
  if(!bad.length){$("stOpt").innerHTML='<div class="alertbox good">No losing segments with 3+ bets. Nothing to cut.</div>';return;}
  bad.sort(function(a,b){return a.s.profit-b.s.profit;});
  var seenSets={};bad=bad.filter(function(x){var ids=settled.filter(function(b){return DIMS[x.dim][1](b)===x.k;}).map(function(b){return b.id;}).join(",");if(seenSets[ids])return false;seenSets[ids]=1;return true;}).slice(0,4);
  var kept=settled.filter(function(b){return !bad.some(function(x){return DIMS[x.dim][1](b)===x.k;});}),o=summarize(kept);
  function row(l,a,b){return '<div class="slipsum"><span>'+l+'</span><b>'+a+' → <span class="W">'+b+'</span></b></div>';}
  $("stOpt").innerHTML='<div class="sub">If you had skipped these losing segments:</div>'+bad.map(function(x){return '<div class="item"><div>'+esc(DIMS[x.dim][0])+': <b>'+esc(x.k)+'</b><br><span class="sub">'+x.s.n+' bets · ROI '+x.s.roi.toFixed(0)+'%</span></div><div class="L"><b>'+sign(x.s.profit)+'</b></div></div>';}).join("")+
    row("Bets",s.n,o.n)+row("Profit",sign(s.profit),sign(o.profit))+row("ROI",s.roi.toFixed(1)+"%",o.roi.toFixed(1)+"%")+row("Win rate",s.wr.toFixed(0)+"%",o.wr.toFixed(0)+"%")+
    '<div class="note">Based on past results only — small samples can mislead. You can ban a market, league or team in Rules if the pattern holds.</div>';
}
function drawBalanceChart(r){
  var L=ledger(),c=$("stChart"),x=c.getContext("2d"),W=c.width,H=c.height,pl=70,pr=14,pt=14,pb=34;x.clearRect(0,0,W,H);
  var pts=[],days=Object.keys(L.days).sort();var startBal=plan().start;
  days.forEach(function(d){if(d<r[0])startBal=L.days[d].close;});
  pts.push({d:r[0]<plan().from?plan().from:r[0],v:startBal});days.forEach(function(d){if(d>=r[0]&&d<=r[1])pts.push({d:d,v:L.days[d].close});});
  if(pts.length<2){x.fillStyle="#9fb0c3";x.font="22px sans-serif";x.fillText("Not enough history in this period yet.",pl,H/2);return;}
  var d0=pts[0].d,d1=pts[pts.length-1].d,span=Math.max(1,daysBetween(d0,d1));
  var lo=Math.min.apply(null,pts.map(function(p){return p.v;})),hi=Math.max.apply(null,pts.map(function(p){return p.v;}));if(hi-lo<1){hi+=1;lo-=1;}var padv=(hi-lo)*0.1;lo-=padv;hi+=padv;
  function X(d){return pl+(W-pl-pr)*daysBetween(d0,d)/span;}function Y(v){return pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));}
  x.font="20px sans-serif";x.fillStyle="#8b949e";x.strokeStyle="#2a313c";x.lineWidth=1;
  for(var i=0;i<=3;i++){var v=lo+(hi-lo)*i/3,y=Y(v);x.beginPath();x.moveTo(pl,y);x.lineTo(W-pr,y);x.stroke();x.fillText(km(v),4,y+6);}
  x.fillText(nice(d0),pl,H-6);var e=nice(d1);x.fillText(e,W-pr-x.measureText(e).width,H-6);
  var up=pts[pts.length-1].v>=pts[0].v,col=up?"#1fd65f":"#ff4d5e";
  x.beginPath();pts.forEach(function(p,k){k?x.lineTo(X(p.d),Y(p.v)):x.moveTo(X(p.d),Y(p.v));});x.lineTo(X(d1),H-pb);x.lineTo(X(d0),H-pb);x.closePath();x.fillStyle=up?"rgba(31,214,95,.15)":"rgba(255,77,94,.15)";x.fill();
  x.beginPath();pts.forEach(function(p,k){k?x.lineTo(X(p.d),Y(p.v)):x.moveTo(X(p.d),Y(p.v));});x.strokeStyle=col;x.lineWidth=4;x.stroke();
}

/* ============ SETTINGS ============ */
var presetPick="pro",rulesSport="general";
function fillSettings(){
  var pl=plan();$("gStart").value=pl.start;$("gGoal").value=pl.goal;$("gFrom").value=pl.from;$("gTo").value=pl.to;
  $("gCur").value=S.display.cur;$("gUnit").value=S.display.unit||"";
  seg("gOdds",[["dec","Decimal 1.25"],["us","American -400"],["frac","Fractional 1/4"]],S.display.odds,function(v){S.display.odds=v;save();fillSettings();renderAll();renderForm();});
  renderProfiles();fillRules();fillSafer();$("ver").textContent="v"+VERSION;
}
function renderProfiles(){
  $("bkList").innerHTML=S.profiles.map(function(p){var b=ledger(null,p).bank;return '<div class="item"><div>'+(p.id===S.active?"✅ ":"")+'<b>'+esc(p.name)+'</b><br><span class="sub">'+money(b)+' · '+esc(p.rules.name)+' · '+p.bets.length+' bets</span></div><div style="display:flex;gap:6px">'+
    (p.id===S.active?'':'<button class="small" data-bk="use" data-id="'+p.id+'">Use</button>')+'<button class="small sec" data-bk="ren" data-id="'+p.id+'">Rename</button>'+(S.profiles.length>1?'<button class="small sec" data-bk="del" data-id="'+p.id+'" style="color:#ff7b72">✕</button>':'')+'</div></div>';}).join("");
}
$("bkList").onclick=function(e){
  var b=e.target.closest("button");if(!b)return;var id=+b.getAttribute("data-id"),a=b.getAttribute("data-bk"),p=S.profiles.filter(function(x){return x.id===id;})[0];if(!p)return;
  if(a==="use"){S.active=id;save();calM=null;resetForm();fillSettings();renderAll();toast("Switched to "+p.name+".");}
  if(a==="ren")openNamePrompt("Rename bankroll",p.name,function(n){p.name=n;save();fillSettings();renderAll();});
  if(a==="del"){if(b.getAttribute("data-sure")){S.profiles=S.profiles.filter(function(x){return x.id!==id;});if(S.active===id)S.active=S.profiles[0].id;save();calM=null;resetForm();fillSettings();renderAll();toast("Bankroll deleted.");}else{b.setAttribute("data-sure","1");b.textContent="Sure?";}}
};
function openProfiles(){
  $("sheet").innerHTML='<h2 style="margin:0 0 8px">Switch bankroll</h2>'+S.profiles.map(function(p){return '<button class="'+(p.id===S.active?"":"sec")+'" data-id="'+p.id+'">'+esc(p.name)+' · '+money(ledger(null,p).bank)+'</button>';}).join("")+'<button class="sec" id="pNew">➕ New bankroll</button><button class="sec" id="pClose">Close</button>';
  $("modal").classList.add("on");
  $("sheet").onclick=function(e){var b=e.target.closest("button");if(!b)return;if(b.id==="pClose")return closeModal();if(b.id==="pNew")return openSetup(true);var id=+b.getAttribute("data-id");if(id){S.active=id;save();calM=null;resetForm();fillSettings();renderAll();closeModal();}};
}
function openNamePrompt(title,val,cb){
  $("sheet").innerHTML='<h2 style="margin:0 0 8px">'+esc(title)+'</h2><input id="npVal" maxlength="40"><button id="npOk">Save</button><button class="sec" id="npCancel">Cancel</button>';
  $("modal").classList.add("on");$("npVal").value=val;
  $("sheet").onclick=function(e){if(e.target.id==="npCancel")closeModal();if(e.target.id==="npOk"){var n=str($("npVal").value,40);if(n){cb(n);closeModal();}}};
}
function fillRules(){
  var R=P().rules;
  seg("presetSeg",Object.keys(PRESETS).map(function(k){return [k,PRESETS[k].name];}),presetPick,function(v){presetPick=v;fillRules();});
  $("presetAbout").innerHTML="Current: <b>"+esc(R.name)+"</b>"+(PRESETS[presetPick]?"<br>"+esc(PRESETS[presetPick].about):"");
  $("rOdds").value=R.maxOdds?fmtOdds(R.maxOdds):"0";$("rPerDay").value=R.maxBetsPerDay;$("rStake").value=R.maxStakePct;$("rLegs").value=R.maxLegs;$("rCheck").checked=R.requireChecklist;
  $("rOdds").setAttribute("inputmode",S.display.odds==="dec"?"decimal":"text");
  $("rSports").innerHTML=SPORTS.map(function(sp){var on=sp.k in R.leagues,L=R.leagues[sp.k];
    return '<div class="sportrow" data-sp="'+sp.k+'"><div class="hd"><b>'+sp.icon+' '+esc(sp.n)+'</b><label class="switch"><input type="checkbox" data-sport="'+sp.k+'"'+(on?" checked":"")+'><span></span></label></div>'+
      (on?'<div class="chips">'+sp.leagues.map(function(l){var lon=L===null||L.indexOf(l.k)>=0;return '<button type="button" class="chip'+(lon?" on":"")+'" data-lg="'+l.k+'">'+esc(l.n)+'</button>';}).join("")+'</div>':'')+'</div>';}).join("");
  $("rTeams").value=R.bannedTeams.join("\n");$("rPlayers").value=R.bannedPlayers.join("\n");
  $("rMarkets").innerHTML=Object.keys(MARKETS).map(function(k){return '<button type="button" class="chip'+(R.bannedMarkets.indexOf(k)>=0?" ban":"")+'" data-mk="'+k+'">'+(R.bannedMarkets.indexOf(k)>=0?"🚫 ":"")+esc(MARKETS[k].n)+'</button>';}).join("");
  $("rCheckSport").innerHTML=[["general","General (all sports)"]].concat(SPORTS.map(function(s){return [s.k,s.icon+" "+s.n];})).map(function(o){return '<option value="'+o[0]+'"'+(o[0]===rulesSport?" selected":"")+'>'+esc(o[1])+'</option>';}).join("");
  $("rChecklist").value=(R.checklists[rulesSport]||[]).join("\n");
}
/* rule edits are kept in a draft until Save */
var draft=null;
function draftRules(){if(!draft)draft=JSON.parse(JSON.stringify(P().rules));return draft;}
$("rSports").onclick=function(e){
  var t=e.target,R=draftRules();
  if(t.getAttribute("data-sport")){var k=t.getAttribute("data-sport");if(t.checked)R.leagues[k]=null;else delete R.leagues[k];var keep=P().rules;P().rules=R;fillRules();P().rules=keep;return;}
  var lg=t.getAttribute("data-lg");if(lg){var sp=t.closest(".sportrow").getAttribute("data-sp"),cur=R.leagues[sp],all=sportOf(sp).leagues.map(function(l){return l.k;});
    if(cur===null)cur=all.slice();var i=cur.indexOf(lg);if(i>=0)cur.splice(i,1);else cur.push(lg);R.leagues[sp]=cur.length===all.length?null:cur;t.classList.toggle("on");}
};
$("rMarkets").onclick=function(e){var k=e.target.getAttribute("data-mk");if(!k)return;var R=draftRules(),i=R.bannedMarkets.indexOf(k);if(i>=0)R.bannedMarkets.splice(i,1);else R.bannedMarkets.push(k);e.target.classList.toggle("ban");e.target.textContent=(i>=0?"":"🚫 ")+MARKETS[k].n;};
$("rCheckSport").onchange=function(){var R=draftRules();R.checklists[rulesSport]=$("rChecklist").value.split("\n").map(function(s){return s.trim();}).filter(Boolean);rulesSport=this.value;$("rChecklist").value=(R.checklists[rulesSport]||[]).join("\n");};
$("applyPreset").onclick=function(){
  if(!this.getAttribute("data-sure")){this.setAttribute("data-sure","1");this.textContent="Tap again to replace this bankroll's rules with "+PRESETS[presetPick].name;return;}
  this.removeAttribute("data-sure");this.textContent="Apply preset";var r=presetCopy(presetPick);r.preset=presetPick;P().rules=cleanRules(r);draft=null;save();fillRules();renderAll();renderForm();toast(PRESETS[presetPick].name+" rules applied.");
};
$("saveRules").onclick=function(){
  var R=draftRules(),mo=$("rOdds").value.trim();
  R.maxOdds=mo===""||mo==="0"?0:parseOdds(mo);if(mo&&mo!=="0"&&!(R.maxOdds>1)){$("rMsg").innerHTML='<div class="alertbox bad">Max odds doesn\'t look right.</div>';return;}
  R.maxBetsPerDay=parseInt($("rPerDay").value,10)||0;R.maxStakePct=parseFloat($("rStake").value)||0;R.maxLegs=parseInt($("rLegs").value,10)||0;R.requireChecklist=$("rCheck").checked;
  R.bannedTeams=$("rTeams").value.split("\n");R.bannedPlayers=$("rPlayers").value.split("\n");
  R.checklists[rulesSport]=$("rChecklist").value.split("\n").map(function(s){return s.trim();}).filter(Boolean);
  if(!Object.keys(R.leagues).length){$("rMsg").innerHTML='<div class="alertbox bad">Allow at least one sport.</div>';return;}
  R.preset="custom";if(R.name.indexOf("(edited)")<0)R.name=(R.name||"Custom").replace(" (default)","")+" (edited)";
  P().rules=cleanRules(R);draft=null;save();$("rMsg").innerHTML='<div class="alertbox good">Rules saved.</div>';fillRules();renderAll();renderForm();
};
$("rulesExp").onclick=function(){$("rulesText").value=JSON.stringify({betTrackerRules:1,rules:P().rules});$("rulesText").select();try{document.execCommand("copy");toast("Rules copied — share them with anyone.");}catch(e){}};
$("rulesImp").onclick=function(){try{var raw=$("rulesText").value;if(raw.length>200000)throw 0;var d=JSON.parse(raw);if(!d||!d.rules)throw 0;P().rules=cleanRules(d.rules);P().rules.preset="custom";draft=null;save();fillRules();renderAll();renderForm();toast("Rules imported.");}catch(e){toast("That doesn't look like a rule set.");}};

function fillSafer(){
  var dl=limit("dep"),ll=limit("loss");$("sDep").value=dl||0;$("sLoss").value=ll||0;
  var msg=[];["dep","loss"].forEach(function(k){var p=S.safer[k+"P"];if(p)msg.push((k==="dep"?"Deposit":"Loss")+" limit changes to "+(p.v?money(p.v):"off")+" on "+new Date(p.at).toLocaleString("en-AU",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})+".");});
  if(cooling())msg.push("On a break until "+new Date(S.safer.coolUntil).toLocaleString("en-AU",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})+".");
  $("saferStatus").textContent=msg.join(" ");
}
$("saveSafer").onclick=function(){
  [["dep","sDep"],["loss","sLoss"]].forEach(function(x){var k=x[0],v=Math.max(0,parseFloat($(x[1]).value)||0),c=limit(k);
    if(v===c){S.safer[k+"P"]=null;return;}
    if(v>0&&(c===0||v<c)){S.safer[k]=v;S.safer[k+"P"]=null;}            // stricter: now
    else S.safer[k+"P"]={v:v,at:Date.now()+864e5};                       // looser: in 24 hours
  });save();fillSafer();validate();toast("Limits saved.");
};
[].forEach.call(document.querySelectorAll("[data-cool]"),function(b){b.onclick=function(){
  var d=+b.getAttribute("data-cool");if(!b.getAttribute("data-sure")){b.setAttribute("data-sure","1");b.textContent="Tap to confirm";return;}
  S.safer.coolUntil=Math.max(S.safer.coolUntil,Date.now()+d*864e5);save();renderAll();fillSafer();validate();toast("Break started. Take care of yourself.");
  [].forEach.call(document.querySelectorAll("[data-cool]"),function(x){x.removeAttribute("data-sure");x.textContent=({1:"24 hours",7:"7 days",30:"30 days"})[x.getAttribute("data-cool")];});
};});
function openHelp(){
  $("sheet").innerHTML='<h2 style="margin:0 0 6px">📞 Support is free and confidential</h2><div class="sub">If betting stops being fun, talk to someone. These services are free.</div><div class="help">'+
    D.HELP.map(function(g){return '<label>'+esc(g.c)+'</label>'+g.items.map(function(it){return '<div class="it">'+esc(it[0])+'<br><a href="'+esc(it[1])+'">'+esc(it[2]||it[1].replace(/^https:\/\/(www\.)?/,""))+'</a></div>';}).join("");}).join("")+
    '</div><button class="sec" id="hClose">Close</button>';
  $("modal").classList.add("on");$("sheet").onclick=function(e){if(e.target.id==="hClose")closeModal();};
}
$("saveGoal").onclick=function(){
  var s=parseFloat($("gStart").value),g=parseFloat($("gGoal").value),f=$("gFrom").value,t=$("gTo").value;
  if(!(s>0)||!(g>s)||!vdate(f)||!vdate(t)||t<f){toast("Check the plan — goal above start, deadline after start date.");return;}
  P().plan={start:s,goal:g,from:f,to:t};S.display.cur=str($("gCur").value,3)||"$";S.display.unit=Math.max(0,parseFloat($("gUnit").value)||0);
  save();calM=null;fillSettings();renderAll();toast("Plan updated. Quotas recalculated.");
};
$("exp").onclick=function(){$("backup").value=JSON.stringify(S);$("backup").select();try{document.execCommand("copy");toast("Backup copied.");}catch(e){toast("Select the text and copy it.");}};
$("imp").onclick=function(){try{var raw=$("backup").value;if(raw.length>2e7)throw 0;var d=JSON.parse(raw);if(!d||!Array.isArray(d.profiles))throw 0;var keepSafer=S.safer;S=clean(d);
  // a restored backup can never loosen your current safer-betting limits
  ["dep","loss"].forEach(function(k){if(keepSafer[k]&&(!S.safer[k]||S.safer[k]>keepSafer[k]))S.safer[k]=keepSafer[k];});S.safer.coolUntil=Math.max(S.safer.coolUntil,keepSafer.coolUntil);
  S.setup=true;save();calM=null;resetForm();fillSettings();renderAll();toast("Backup restored.");}catch(e){toast("That doesn't look like a valid backup.");}};
$("reset").onclick=function(){if(this.getAttribute("data-sure")){var keep=S.safer;S=clean({});S.safer=keep;save();calM=null;resetForm();fillSettings();renderAll();openSetup();this.removeAttribute("data-sure");this.textContent="Reset everything";}else{this.setAttribute("data-sure","1");this.textContent="Tap again to wipe all bankrolls and bets";}};

/* ============ first run / new bankroll ============ */
function openSetup(isNew){
  var pk="pro";
  function draw(v){
    $("sheet").innerHTML='<h2 style="margin:0 0 4px">'+(isNew?"➕ New bankroll":"👋 Welcome to Bet Tracker")+'</h2><div class="sub">'+(isNew?"Each bankroll has its own plan, rules and bets.":"Track every bet, stick to your rules and see where your money really goes. Everything stays on this device.")+'</div>'+
      '<label>Bankroll name</label><input id="suName" maxlength="40" value="'+(isNew?"":"Main bankroll")+'">'+
      '<label>Rules to start with</label><div class="seg" id="suPreset">'+Object.keys(PRESETS).map(function(k){return '<button type="button" data-k="'+k+'" class="'+(k===pk?"on":"")+'">'+esc(PRESETS[k].name)+'</button>';}).join("")+'</div><div class="note">'+esc(PRESETS[pk].about)+' You can change any rule later.</div>'+
      '<div class="row"><div><label>Starting balance</label><input id="suStart" type="number" step="0.01" inputmode="decimal" value="100"></div><div><label>Goal</label><input id="suGoal" type="number" step="1" inputmode="decimal" value="1000"></div></div>'+
      '<div class="row"><div><label>Start date</label><input id="suFrom" type="date"></div><div><label>Deadline</label><input id="suTo" type="date"></div></div>'+
      (isNew?'':'<label class="chk" style="margin-top:14px"><input type="checkbox" id="suAdult"> I\'m 18 or older and betting is legal where I live.</label>')+
      '<div id="suMsg"></div><button id="suGo">'+(isNew?"Create bankroll":"Start tracking")+'</button>'+(isNew?'<button class="sec" id="suCancel">Cancel</button>':'');
    $("modal").classList.add("on");$("suFrom").value=v?v.f:todayIso();$("suTo").value=v?v.t:addDays(todayIso(),30);if(v){$("suName").value=v.n;$("suStart").value=v.s;$("suGoal").value=v.g;}
    $("sheet").onclick=function(e){
      var k=e.target.getAttribute("data-k");if(k){var keep={n:$("suName").value,s:$("suStart").value,g:$("suGoal").value,f:$("suFrom").value,t:$("suTo").value};pk=k;draw(keep);return;}
      if(e.target.id==="suCancel")closeModal();
      if(e.target.id==="suGo"){
        var s=parseFloat($("suStart").value),g=parseFloat($("suGoal").value),f=$("suFrom").value,t=$("suTo").value,err="";
        if(!(s>0)||!(g>s))err="The goal must be above your starting balance.";else if(!vdate(f)||!vdate(t)||t<f)err="The deadline must be after the start date.";else if(!isNew&&!$("suAdult").checked)err="Please confirm you're 18+ and betting is legal where you live.";
        if(err){$("suMsg").innerHTML='<div class="alertbox bad">'+esc(err)+'</div>';return;}
        var r=presetCopy(pk);r.preset=pk;var p=cleanProfile({name:$("suName").value||"Bankroll",plan:{start:s,goal:g,from:f,to:t},rules:r},S.profiles.length);
        if(isNew)S.profiles.push(p);else S.profiles=[p];S.active=p.id;S.setup=true;if(!isNew)S.adult=true;
        save();calM=null;closeModal();resetForm();fillSettings();renderAll();toast(isNew?"Bankroll created.":"You're set. Good luck — and stick to your rules.");
      }
    };
  }
  draw();
}

/* ============ betslip scan ============ */
function teamIndex(){var idx=[];SPORTS.forEach(function(sp){sp.leagues.forEach(function(l){(l.teams||[]).forEach(function(t){idx.push({name:t,sport:sp.k,league:l.k});});});});P().custom.teams.forEach(function(t){idx.push({name:t,sport:"",league:""});});return idx;}
$("scanBtn").onclick=function(){if(cooling()){toast("Paused during your break.");return;}$("slipFile").value="";$("slipFile").click();};
$("slipFile").addEventListener("change",function(){
  var f=this.files&&this.files[0];if(!f)return;var st=$("scanStatus"),btn=$("scanBtn");
  function say(m,c){st.innerHTML='<div class="alertbox '+(c||"")+'">'+m+'</div>';}
  if(!window.Slip){say("The slip reader is missing from this build.","bad");return;}
  btn.disabled=true;btn.style.opacity=.5;
  window.Slip.read(f,function(m){say("⏳ "+esc(m));}).then(function(text){
    $("scanText").textContent=text;$("scanRaw").style.display="";
    var r=window.Slip.parse(text,teamIndex(),BOOKS),miss=[];
    resetForm($("fDate").value||todayIso());
    if(r.sport){F.sport=r.sport;F.league=r.league||firstAllowedLeague(r.sport);}
    if(r.away)$("fAway").value=r.away;if(r.home)$("fHome").value=r.home;
    var mk=sportOf(F.sport).markets;F.market=mk.indexOf(r.market)>=0?r.market:(r.market==="h2h"&&mk.indexOf("winner")>=0?"winner":mk.indexOf(r.market)>=0?r.market:"other");
    F.sel=r.team||"";F.ou=r.ou||"Over";F.res=r.res||"P";
    if(r.line)$("fLine").value=r.line;if(r.player)$("fPlayer").value=r.player;if(r.desc)$("fDesc").value=r.desc;if(r.legs)$("fLegs").value=r.legs;
    if(r.odds)$("fOdds").value=fmtOdds(r.odds);if(r.stake){$("fStake").value=r.stake.toFixed(2);stakeTouched=true;}if(r.book)$("fBook").value=r.book;
    if(F.market==="other"&&!r.desc)$("fDesc").value=text.split("\n").filter(Boolean).slice(0,2).join(" ").slice(0,150);
    renderForm();
    if(!r.away||!r.home)miss.push("teams");if(!r.odds)miss.push("odds");if(!r.stake)miss.push("stake");if(F.market==="other")miss.push("bet type");
    say("✅ Filled from your slip"+(r.res!=="P"?" (marked "+RES[r.res]+")":"")+". Check every field, then place it."+(miss.length?"<br>Couldn't read: <b>"+miss.join(", ")+"</b>.":""),miss.length?"":"good");
  }).catch(function(e){say("Couldn't read that slip: "+esc(e&&e.message||e)+"<br>Try a clearer, cropped screenshot.","bad");}).then(function(){btn.disabled=false;btn.style.opacity=1;});
});

/* ============ nav & wiring ============ */
function go(p){
  [].forEach.call(document.querySelectorAll(".page"),function(s){s.classList.toggle("on",s.id==="p-"+p);});
  [].forEach.call(document.querySelectorAll("nav a"),function(a){a.classList.toggle("on",a.getAttribute("data-p")===p);});
  if(p==="stats")renderStats();if(p==="set")fillSettings();if(p==="bets")renderBets();
  window.scrollTo(0,0);
}
[].forEach.call(document.querySelectorAll("nav a"),function(a){a.onclick=function(e){e.preventDefault();var p=a.getAttribute("data-p");if(p==="log"&&!editingId){resetForm(todayIso());$("scanStatus").innerHTML="";$("scanRaw").style.display="none";}go(p);};});
$("betTabs").onclick=function(e){var b=e.target.closest("button");if(!b)return;betTab=b.getAttribute("data-t");renderBets();};
$("statPeriod").onclick=function(e){var b=e.target.closest("button");if(!b)return;statPeriod=b.getAttribute("data-v");renderStats();};
$("goLog").onclick=function(){resetForm(todayIso());go("log");};
$("goMoney").onclick=function(){openMoney(todayIso());};$("hdrWallet").onclick=function(){openMoney(todayIso());};
$("goClose").onclick=function(){openClose(todayIso());};
$("homeHelp").onclick=function(e){e.preventDefault();openHelp();};$("openHelp").onclick=openHelp;
$("newBk").onclick=function(){openSetup(true);};
$("cancelEdit").onclick=function(){resetForm(todayIso());go("bets");};
$("prevM").onclick=function(){calM=new Date(calM.getFullYear(),calM.getMonth()-1,1);renderBets();};
$("nextM").onclick=function(){calM=new Date(calM.getFullYear(),calM.getMonth()+1,1);renderBets();};
$("calGrid").onclick=function(e){var d=e.target.closest(".day");if(d)openDay(d.getAttribute("data-d"));};
$("betList").onclick=function(e){var it=e.target.closest(".item");if(it&&it.getAttribute("data-d"))openDay(it.getAttribute("data-d"));};
$("modal").addEventListener("click",function(e){if(e.target.id==="modal"&&S.setup)closeModal();});
$("fLeague").onchange=function(){F.league=this.value;renderForm();};
["fAway","fHome"].forEach(function(i){$(i).addEventListener("change",renderForm);});
["fDate","fOdds","fStake","fNote","fLine","fPlayer","fDesc","fLegs","fCash","fEvent","fBook","fTipster","fAway","fHome"].forEach(function(i){$(i).addEventListener("input",function(){if(i==="fStake")stakeTouched=true;validate();});});
$("checks").addEventListener("change",validate);
$("saveBet").onclick=saveBet;
$("useQuota").onclick=function(){stakeTouched=false;validate();};
$("swapTeams").onclick=function(){var a=$("fAway").value;$("fAway").value=$("fHome").value;$("fHome").value=a;renderForm();};

function renderAll(){renderHeader();renderHome();if($("p-bets").classList.contains("on"))renderBets();if($("p-stats").classList.contains("on"))renderStats();}
resetForm();renderAll();fillSettings();
if(!S.setup)openSetup(false);
window.BT_TEST={get S(){return S;},parseOdds:parseOdds,fmtOdds:fmtOdds};
})();

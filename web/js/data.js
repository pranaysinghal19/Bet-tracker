/* Bet Tracker — sports, leagues, teams, markets and rule presets.
   Everything here is plain data so contributors can add sports and leagues without touching app logic.
   Team lists are for suggestions only: users can always type any team or player. */
(function(){
"use strict";

/* ---------------- markets ----------------
   f = fields the bet slip shows: sel (pick home/away/draw), ou (over/under), line (number),
   player (name), desc (free text), legs (number of legs in a multi). */
var M={
  h2h:{n:"Head to head",f:["sel"]},
  line:{n:"Line / handicap",f:["sel","line"],lbl:"Line (e.g. -4.5 or +6.5)"},
  total:{n:"Total points",f:["ou","line"],lbl:"Total line"},
  tt:{n:"Team total",f:["sel","ou","line"],lbl:"Team total line"},
  margin:{n:"Winning margin",f:["sel","desc"],ph:"e.g. 1-10"},
  prop:{n:"Player prop",f:["player","desc","ou","line"],ph:"Stat, e.g. points, disposals, tries",lbl:"Line"},
  dc:{n:"Double chance",f:["desc"],ph:"e.g. Home or Draw (1X)"},
  x12:{n:"Match result (1X2)",f:["sel"]},
  btts:{n:"Both teams to score",f:["desc"],ph:"Yes or No"},
  goals:{n:"Total goals",f:["ou","line"],lbl:"Goals line"},
  corners:{n:"Corners",f:["ou","line"],lbl:"Corners line"},
  cards:{n:"Cards",f:["ou","line"],lbl:"Cards line"},
  ah:{n:"Asian handicap",f:["sel","line"],lbl:"Handicap"},
  scorer:{n:"Player to score",f:["player","desc"],ph:"Anytime, first, 2+"},
  halves:{n:"Halves / quarters",f:["desc"],ph:"e.g. 1st half Thunder -2.5"},
  winner:{n:"Winner / match winner",f:["sel"]},
  topbat:{n:"Top batter / bowler",f:["player","desc"],ph:"Top batter or top bowler"},
  runs:{n:"Player runs / wickets",f:["player","desc","ou","line"],ph:"Runs or wickets",lbl:"Line"},
  totruns:{n:"Total runs",f:["ou","line"],lbl:"Runs line"},
  sets:{n:"Set / game handicap",f:["sel","line"],lbl:"Handicap"},
  games:{n:"Total games",f:["ou","line"],lbl:"Games line"},
  outright:{n:"Outright winner",f:["player"]},
  podium:{n:"Podium / top N",f:["player","desc"],ph:"e.g. Top 3, Top 10"},
  matchup:{n:"Head-to-head matchup",f:["player","desc"],ph:"vs who"},
  method:{n:"Method of victory",f:["player","desc"],ph:"KO/TKO, submission, decision"},
  place:{n:"Win / place",f:["player","desc"],ph:"Win, place, each way"},
  sgm:{n:"Same game multi",f:["legs","desc"],ph:"e.g. Thunder H2H + SGA 25+ pts"},
  multi:{n:"Multi (parlay)",f:["legs","desc"],ph:"List the legs"},
  other:{n:"Other",f:["desc"],ph:"Describe the bet"}
};

var TEAM_MARKETS=["h2h","line","total","tt","margin","prop","halves","sgm","multi","other"];

/* ---------------- teams ---------------- */
var T={
 NBA:["Atlanta Hawks","Boston Celtics","Brooklyn Nets","Charlotte Hornets","Chicago Bulls","Cleveland Cavaliers","Dallas Mavericks","Denver Nuggets","Detroit Pistons","Golden State Warriors","Houston Rockets","Indiana Pacers","LA Clippers","Los Angeles Lakers","Memphis Grizzlies","Miami Heat","Milwaukee Bucks","Minnesota Timberwolves","New Orleans Pelicans","New York Knicks","Oklahoma City Thunder","Orlando Magic","Philadelphia 76ers","Phoenix Suns","Portland Trail Blazers","Sacramento Kings","San Antonio Spurs","Toronto Raptors","Utah Jazz","Washington Wizards"],
 NBL:["Adelaide 36ers","Brisbane Bullets","Cairns Taipans","Illawarra Hawks","Melbourne United","New Zealand Breakers","Perth Wildcats","South East Melbourne Phoenix","Sydney Kings","Tasmania JackJumpers"],
 NFL:["Arizona Cardinals","Atlanta Falcons","Baltimore Ravens","Buffalo Bills","Carolina Panthers","Chicago Bears","Cincinnati Bengals","Cleveland Browns","Dallas Cowboys","Denver Broncos","Detroit Lions","Green Bay Packers","Houston Texans","Indianapolis Colts","Jacksonville Jaguars","Kansas City Chiefs","Las Vegas Raiders","Los Angeles Chargers","Los Angeles Rams","Miami Dolphins","Minnesota Vikings","New England Patriots","New Orleans Saints","New York Giants","New York Jets","Philadelphia Eagles","Pittsburgh Steelers","San Francisco 49ers","Seattle Seahawks","Tampa Bay Buccaneers","Tennessee Titans","Washington Commanders"],
 MLB:["Arizona Diamondbacks","Athletics","Atlanta Braves","Baltimore Orioles","Boston Red Sox","Chicago Cubs","Chicago White Sox","Cincinnati Reds","Cleveland Guardians","Colorado Rockies","Detroit Tigers","Houston Astros","Kansas City Royals","Los Angeles Angels","Los Angeles Dodgers","Miami Marlins","Milwaukee Brewers","Minnesota Twins","New York Mets","New York Yankees","Philadelphia Phillies","Pittsburgh Pirates","San Diego Padres","San Francisco Giants","Seattle Mariners","St. Louis Cardinals","Tampa Bay Rays","Texas Rangers","Toronto Blue Jays","Washington Nationals"],
 NHL:["Anaheim Ducks","Boston Bruins","Buffalo Sabres","Calgary Flames","Carolina Hurricanes","Chicago Blackhawks","Colorado Avalanche","Columbus Blue Jackets","Dallas Stars","Detroit Red Wings","Edmonton Oilers","Florida Panthers","Los Angeles Kings","Minnesota Wild","Montreal Canadiens","Nashville Predators","New Jersey Devils","New York Islanders","New York Rangers","Ottawa Senators","Philadelphia Flyers","Pittsburgh Penguins","San Jose Sharks","Seattle Kraken","St. Louis Blues","Tampa Bay Lightning","Toronto Maple Leafs","Utah Mammoth","Vancouver Canucks","Vegas Golden Knights","Washington Capitals","Winnipeg Jets"],
 AFL:["Adelaide Crows","Brisbane Lions","Carlton","Collingwood","Essendon","Fremantle","Geelong Cats","Gold Coast Suns","GWS Giants","Hawthorn","Melbourne","North Melbourne","Port Adelaide","Richmond","St Kilda","Sydney Swans","West Coast Eagles","Western Bulldogs"],
 NRL:["Brisbane Broncos","Canberra Raiders","Canterbury-Bankstown Bulldogs","Cronulla-Sutherland Sharks","Dolphins","Gold Coast Titans","Manly Warringah Sea Eagles","Melbourne Storm","Newcastle Knights","New Zealand Warriors","North Queensland Cowboys","Parramatta Eels","Penrith Panthers","South Sydney Rabbitohs","St George Illawarra Dragons","Sydney Roosters","Wests Tigers"],
 IPL:["Chennai Super Kings","Delhi Capitals","Gujarat Titans","Kolkata Knight Riders","Lucknow Super Giants","Mumbai Indians","Punjab Kings","Rajasthan Royals","Royal Challengers Bengaluru","Sunrisers Hyderabad"],
 BBL:["Adelaide Strikers","Brisbane Heat","Hobart Hurricanes","Melbourne Renegades","Melbourne Stars","Perth Scorchers","Sydney Sixers","Sydney Thunder"],
 CRICKET_INTL:["Afghanistan","Australia","Bangladesh","England","India","Ireland","New Zealand","Pakistan","South Africa","Sri Lanka","West Indies","Zimbabwe"],
 ALEAGUE:["Adelaide United","Auckland FC","Brisbane Roar","Central Coast Mariners","Macarthur FC","Melbourne City","Melbourne Victory","Newcastle Jets","Perth Glory","Sydney FC","Wellington Phoenix","Western Sydney Wanderers"]
};

/* ---------------- sports ----------------
   kind: "teams" (two sides), "field" (one pick from a field: racing, golf, F1, outrights). */
var SPORTS=[
 {k:"basketball",n:"Basketball",icon:"🏀",kind:"teams",markets:TEAM_MARKETS,leagues:[
   {k:"NBA",n:"NBA",teams:T.NBA},{k:"NBL",n:"NBL",teams:T.NBL},{k:"WNBA",n:"WNBA"},{k:"EUROLEAGUE",n:"EuroLeague"},{k:"BB_OTHER",n:"Other basketball"}]},
 {k:"soccer",n:"Soccer",icon:"⚽",kind:"teams",markets:["dc","x12","btts","goals","corners","cards","ah","scorer","halves","sgm","multi","other"],leagues:[
   {k:"EPL",n:"Premier League",region:"Europe"},{k:"EFL",n:"EFL Championship",region:"Europe"},{k:"LALIGA",n:"La Liga",region:"Europe"},
   {k:"SERIEA",n:"Serie A",region:"Europe"},{k:"BUNDES",n:"Bundesliga",region:"Europe"},{k:"LIGUE1",n:"Ligue 1",region:"Europe"},
   {k:"ERED",n:"Eredivisie",region:"Europe"},{k:"PRIM",n:"Primeira Liga",region:"Europe"},{k:"SPL",n:"Scottish Premiership",region:"Europe"},
   {k:"UCL",n:"Champions League",region:"Europe"},{k:"UEL",n:"Europa League",region:"Europe"},{k:"EU_OTHER",n:"Other European league",region:"Europe"},
   {k:"SAUDI",n:"Saudi Pro League",region:"Asia"},{k:"ALEAGUE",n:"A-League",region:"Oceania",teams:T.ALEAGUE},{k:"MLS",n:"MLS",region:"North America"},
   {k:"FRIENDLY",n:"International friendlies",region:"International"},{k:"WCQ",n:"World Cup / qualifiers",region:"International"},
   {k:"SOUTHAM",n:"South American leagues",region:"South America"},{k:"AFRICA",n:"African leagues",region:"Africa"},{k:"ASIA",n:"Other Asian leagues",region:"Asia"},
   {k:"SOC_OTHER",n:"Other soccer",region:"Other"}]},
 {k:"afl",n:"AFL",icon:"🏉",kind:"teams",markets:TEAM_MARKETS,leagues:[{k:"AFL",n:"AFL",teams:T.AFL},{k:"AFLW",n:"AFLW",teams:T.AFL}]},
 {k:"rugbyleague",n:"Rugby league",icon:"🏉",kind:"teams",markets:TEAM_MARKETS,leagues:[{k:"NRL",n:"NRL",teams:T.NRL},{k:"ORIGIN",n:"State of Origin",teams:["New South Wales","Queensland"]},{k:"SUPERLEAGUE",n:"Super League"},{k:"RL_OTHER",n:"Other rugby league"}]},
 {k:"rugbyunion",n:"Rugby union",icon:"🏉",kind:"teams",markets:TEAM_MARKETS,leagues:[{k:"SUPERRUGBY",n:"Super Rugby"},{k:"TESTS",n:"Test rugby"},{k:"RU_OTHER",n:"Other rugby union"}]},
 {k:"cricket",n:"Cricket",icon:"🏏",kind:"teams",markets:["winner","topbat","runs","totruns","line","sgm","multi","other"],leagues:[
   {k:"IPL",n:"IPL",teams:T.IPL},{k:"BBL",n:"BBL",teams:T.BBL},{k:"INTL",n:"Internationals",teams:T.CRICKET_INTL},{k:"CR_OTHER",n:"Other cricket"}]},
 {k:"tennis",n:"Tennis",icon:"🎾",kind:"teams",markets:["winner","sets","games","multi","other"],leagues:[{k:"ATP",n:"ATP"},{k:"WTA",n:"WTA"},{k:"SLAM",n:"Grand Slams"},{k:"TEN_OTHER",n:"Other tennis"}]},
 {k:"nfl",n:"American football",icon:"🏈",kind:"teams",markets:TEAM_MARKETS,leagues:[{k:"NFL",n:"NFL",teams:T.NFL},{k:"NCAAF",n:"College football"}]},
 {k:"baseball",n:"Baseball",icon:"⚾",kind:"teams",markets:TEAM_MARKETS,leagues:[{k:"MLB",n:"MLB",teams:T.MLB},{k:"BASE_OTHER",n:"Other baseball"}]},
 {k:"hockey",n:"Ice hockey",icon:"🏒",kind:"teams",markets:TEAM_MARKETS,leagues:[{k:"NHL",n:"NHL",teams:T.NHL},{k:"HOCKEY_OTHER",n:"Other hockey"}]},
 {k:"mma",n:"MMA / boxing",icon:"🥊",kind:"teams",markets:["winner","method","total","multi","other"],leagues:[{k:"UFC",n:"UFC"},{k:"BOXING",n:"Boxing"},{k:"MMA_OTHER",n:"Other combat"}]},
 {k:"f1",n:"Motorsport",icon:"🏎️",kind:"field",markets:["outright","podium","matchup","multi","other"],leagues:[{k:"F1",n:"Formula 1"},{k:"MOTO_OTHER",n:"Other motorsport"}]},
 {k:"golf",n:"Golf",icon:"⛳",kind:"field",markets:["outright","podium","matchup","multi","other"],leagues:[{k:"PGA",n:"PGA Tour"},{k:"DPWT",n:"DP World Tour"},{k:"LIV",n:"LIV Golf"},{k:"MAJORS",n:"Majors"}]},
 {k:"racing",n:"Racing",icon:"🐎",kind:"field",markets:["place","multi","other"],leagues:[{k:"HORSES",n:"Horse racing"},{k:"HARNESS",n:"Harness"},{k:"GREYS",n:"Greyhounds"}]},
 {k:"other",n:"Other",icon:"🎯",kind:"teams",markets:["winner","line","total","multi","other"],leagues:[{k:"OTHER",n:"Other"}]}
];

/* ---------------- checklists ---------------- */
var CHECKS={
 general:["Form and head-to-head checked (last 5–10)","Injuries, suspensions and rotation checked","Late news and confirmed lineups checked","Ran my own numbers — ranked the likely outcomes","Odds rechecked right before placing — not drifting"],
 basketball:["Injury report checked (official report + late scratches)","Back-to-backs, rest days and travel checked for both teams","Home/away splits and recent form (last 5–7) checked","Pace and matchup checked","Late news on X / Twitter within 1–2 hours of tip-off","Odds rechecked right before placing — not drifting"],
 soccer:["Head-to-head checked, including at this venue","Form checked (last 5–7) and goals/corners per game","Injuries, suspensions and squad rotation checked (3 games in 7 days = flag)","Confirmed starting XI checked within 1 hour of kickoff","xG / underlying numbers checked","Odds rechecked right before placing — not drifting"],
 cricket:["Pitch report checked — pace, bounce, turn","Toss and dew factor checked","Venue dynamics checked — high or low scoring ground","Bowler vs batter matchups checked","Odds rechecked right before placing — not drifting"],
 afl:["Ins and outs checked","Interstate travel checked (Perth / Queensland trips)","Weather checked — wet favours contested-ball teams","Form and head-to-head checked","Odds rechecked right before placing — not drifting"],
 f1:["FP2 long-run pace checked","Weather forecast checked","Grid penalties checked","Odds rechecked right before placing — not drifting"]
};

/* ---------------- rule presets ----------------
   leagues: list of allowed league keys per sport (missing sport = sport not allowed).
   null for a sport means every league in it is allowed. */
function allLeagues(){var o={};SPORTS.forEach(function(s){o[s.k]=null;});return o;}
var PRESETS={
 pro:{
  name:"Pro Punter (default)",
  about:"The author's own system: short-priced, high-probability bets compounding a bankroll toward a goal.",
  maxOdds:1.25, maxBetsPerDay:3, maxStakePct:0, maxLegs:4, requireChecklist:true,
  leagues:{
    basketball:["NBA","NBL"],
    soccer:["EPL","EFL","LALIGA","SERIEA","BUNDES","LIGUE1","ERED","PRIM","SPL","UCL","UEL","EU_OTHER","SAUDI","ALEAGUE","MLS","FRIENDLY"],
    afl:["AFL"], cricket:null, f1:["F1"]
  },
  bannedTeams:["Cleveland Cavaliers","Arsenal"],
  bannedPlayers:["Cade Cunningham","De'Aaron Fox"],
  bannedMarkets:["x12","halves"],
  checklists:{basketball:CHECKS.basketball,soccer:CHECKS.soccer,cricket:CHECKS.cricket,afl:CHECKS.afl,f1:CHECKS.f1,general:CHECKS.general}
 },
 open:{
  name:"Open (no restrictions)",
  about:"Every sport and market allowed. Set your own limits.",
  maxOdds:0, maxBetsPerDay:0, maxStakePct:0, maxLegs:0, requireChecklist:false,
  leagues:allLeagues(), bannedTeams:[], bannedPlayers:[], bannedMarkets:[],
  checklists:{general:CHECKS.general}
 },
 careful:{
  name:"Careful bankroll",
  about:"Classic bankroll management: small stakes, sensible odds, few bets.",
  maxOdds:2.5, maxBetsPerDay:2, maxStakePct:5, maxLegs:3, requireChecklist:true,
  leagues:allLeagues(), bannedTeams:[], bannedPlayers:[], bannedMarkets:["halves"],
  checklists:{general:CHECKS.general,basketball:CHECKS.basketball,soccer:CHECKS.soccer,cricket:CHECKS.cricket,afl:CHECKS.afl,f1:CHECKS.f1}
 }
};

/* ---------------- safer gambling contacts (checked Nov 2026) ---------------- */
var HELP=[
 {c:"Australia",items:[["Gambling Help Online — 24/7 phone, chat, email","tel:1800858858","1800 858 858"],["gamblinghelponline.org.au","https://www.gamblinghelponline.org.au",""],["BetStop — national self-exclusion register","https://www.betstop.gov.au",""],["Lifeline — 24/7 crisis support","tel:131114","13 11 14"]]},
 {c:"New Zealand",items:[["Gambling Helpline — 24/7","tel:0800654655","0800 654 655"],["gamblinghelpline.co.nz","https://www.gamblinghelpline.co.nz",""]]},
 {c:"United Kingdom",items:[["National Gambling Helpline (GamCare) — 24/7","tel:08088020133","0808 8020 133"],["gamcare.org.uk","https://www.gamcare.org.uk",""]]},
 {c:"United States",items:[["National Problem Gambling Helpline — 1-800-GAMBLER","tel:18004262537","1-800-426-2537"],["ncpgambling.org","https://www.ncpgambling.org",""]]},
 {c:"Anywhere",items:[["Gambling Therapy — free multilingual support","https://www.gamblingtherapy.org",""]]}
];


/* ---------------- learn: short offline guides (original text) ---------------- */
var GUIDES=[
 {k:"bankroll",t:"Bankroll and units",b:["Your bankroll is money set aside only for betting — money you can afford to lose. Never top it up from bills or savings.","A unit is a fixed slice of it, often 1–2%. Thinking in units keeps stakes steady when you're on a hot or cold streak, and lets you compare results with anyone, whatever their bankroll size.","Set a unit size under Rules → Plan and the app shows stakes and profit in units too."]},
 {k:"odds",t:"Odds and implied probability",b:["Decimal odds of 1.25 mean a $10 bet returns $12.50 — $2.50 profit plus your stake.","Every price hides a probability: divide 1 by the decimal odds. 1.25 → 80%. 2.00 → 50%. 4.00 → 25%.","Add up the implied probabilities of every outcome in a market and you'll get more than 100%. The extra is the bookmaker's margin. The no-vig calculator strips it out to show the fair price."]},
 {k:"value",t:"Value and expected value (EV)",b:["A bet has value when your chance of it winning is higher than the chance implied by the odds.","Expected value is what a bet would earn on average if you placed it many times: EV = (win chance × profit) − (lose chance × stake).","Enter your win chance on the bet slip and the app shows the EV. Be honest — overrating your picks is the most common way punters lose."]},
 {k:"kelly",t:"Kelly staking",b:["The Kelly formula sizes a stake from your edge: stake % = (odds − 1) × chance − (1 − chance), all divided by (odds − 1).","Full Kelly swings wildly and assumes your win chance is exactly right. Most bettors use a fraction — quarter Kelly (0.25) is common.","No edge means Kelly says don't bet. That's a feature, not a bug."]},
 {k:"clv",t:"Closing line value (CLV)",b:["The closing line is the last price before the event starts — usually the most accurate price the market produces.","If you took 1.30 and the price closed at 1.22, you beat the close: CLV = 1.30 ÷ 1.22 − 1 = +6.6%.","Over hundreds of bets, consistently positive CLV is a strong sign of real skill, even through losing runs. Add closing odds under 'More' on the bet slip."]},
 {k:"ew",t:"Each-way bets",b:["An each-way bet is two equal bets: one to win and one to place. A $10 each-way bet costs $20.","If it wins, both parts pay. If it only places, the win part loses and the place part pays at a fraction of the odds — commonly 1/4 or 1/5.","Turn on Each-way in the slip's Extras and pick the place terms. The app works out the profit for a win and for a place."]},
 {k:"promos",t:"Free bets and odds boosts",b:["With most free bets, the stake isn't returned when you win and you lose nothing when it loses. Mark them as free bets so your real ROI isn't distorted.","Odds boosts are better prices on selected bets. Tag them so Stats can show whether promos actually add to your profit.","Promotions exist to keep you betting. Use them only on bets you'd have made anyway."]},
 {k:"variance",t:"Streaks and variance",b:["Even a 90% shot loses one time in ten — and sometimes two or three times in a row. Short runs tell you very little.","Judge your system on hundreds of bets, not a week. Use the Optimizer and CLV, not your gut, to decide what to change.","Chasing losses with bigger stakes is how bankrolls disappear. The daily loss limit and breaks exist for exactly this."]},
 {k:"safer",t:"Betting safely",b:["Set limits before you start, not after a loss: a weekly deposit limit and a daily loss limit.","If betting stops being fun, take a break — 24 hours, 7 days or 30 days. It can't be undone early, on purpose.","Free, confidential help is a tap away under Rules → Get support. In Australia you can also exclude yourself from every licensed bookmaker at betstop.gov.au."]}
];

window.BT_DATA={MARKETS:M,SPORTS:SPORTS,PRESETS:PRESETS,CHECKS:CHECKS,HELP:HELP,GUIDES:GUIDES};
})();

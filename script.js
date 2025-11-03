// HabitHero Level 3 + XP/Badges/Streaks (HTML/JS single-file implementation)

const input = document.getElementById("habit-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("habit-list");
const quoteEl = document.getElementById("quote");
const levelDisplay = document.getElementById("levelDisplay");
const progressBar = document.getElementById("progress-bar");
const statsSummary = document.getElementById("statsSummary");
const badgesEl = document.getElementById("badges");
const categorySelect = document.getElementById("categorySelect");

const chartCtx = document.getElementById("progressChart").getContext("2d");
let chart = null;


let state = JSON.parse(localStorage.getItem("habitHeroState")) || {
  habits: [], // habit  format: { id, name, category, history: [yyyy-mm-dd], createdAt }
  xp: 0,
  level: 1,
  badges: [],   
  streak: 0,
  lastActiveDate: null
};

// Constants
const QUOTES = [
  "Small steps lead to big changes.",
  "You’re building momentum—keep it up!",
  "Discipline beats motivation.",
  "You’re becoming your best self!",
  "Every day is a chance to improve.",
  "Keep going—consistency is your superpower!"
];

const BADGE_MILESTONES = [
  { xp: 10, name: "Bronze" },
  { xp: 25, name: "Silver" },
  { xp: 50, name: "Gold" },
  { xp: 100, name: "Platinum" }
];
const STREAK_BADGE = { days: 7, name: "Consistent Learner" };

// Helpers
function saveState(){ localStorage.setItem("habitHeroState", JSON.stringify(state)); }
function isoDate(d = new Date()){ return d.toISOString().slice(0,10); }
function yesterdayIso(){ const d=new Date(); d.setDate(d.getDate()-1); return isoDate(d); }
function genId(){ return 'h' + Date.now() + Math.floor(Math.random()*1000); }

// Initialize chart
function initChart(){
  const labels = last7Labels();
  const data = weeklyTotals();
  chart = new Chart(chartCtx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Habits Completed', data, borderRadius:6, backgroundColor: 'rgba(0,119,255,0.85)' }]},
    options: { plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,precision:0}} }
  });
}

// Last minute 7 day 
function last7Dates(){ const arr=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); arr.push(isoDate(d)); } return arr; }
function last7Labels(){ return last7Dates().map(d => new Date(d).toLocaleDateString(undefined,{weekday:'short'})); }
function weeklyTotals(){ const dates = last7Dates(); return dates.map(dt => state.habits.reduce((acc,h)=>acc + (h.history.includes(dt)?1:0),0)); }

// UI render
function render(){
 
  list.innerHTML = '';
  for(const h of state.habits){
    const li = document.createElement('li');
    li.className = 'habit-item';
    li.innerHTML = `
      <div class="habit-main">
        <div class="habit-name">${escapeHtml(h.name)} <small style="color:var(--muted)">[${escapeHtml(h.category)}]</small></div>
        <div class="habit-meta">Current streak: ${computeCurrentStreak(h)} • Longest: ${computeLongestStreak(h)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" ${isCompletedToday(h)?'checked':''} onchange="toggleHabit('${h.id}')">
        <button class="small-btn" onclick="showHistory('${h.id}')">View</button>
        <button class="remove-btn" onclick="removeHabit('${h.id}')">✕</button>
      </div>
    `;
    list.appendChild(li);
  }

  // Progress bar
  const total = state.habits.length;
  const completed = state.habits.filter(isCompletedToday).length;
  const pct = total === 0 ? 0 : Math.round((completed/total)*100);
  progressBar.style.width = `${pct}%`;

  // Stats summary
  const totalDone = state.habits.reduce((a,h)=>a + h.history.length,0);
  statsSummary.innerHTML = `
    <div>Total habits: <strong>${state.habits.length}</strong></div>
    <div>Completions (all time): <strong>${totalDone}</strong></div>
    <div>Today's completions: <strong>${completed}</strong></div>
    <div>Longest streak overall: <strong>${overallLongestStreak()}</strong></div>
  `;

  // Badges
  badgesEl.innerHTML = '';
  if(state.badges.length === 0) badgesEl.innerHTML = `<div class="badge">No badges yet — keep going!</div>`;
  else state.badges.forEach(b => {
    const d = document.createElement('div'); d.className='badge'; d.textContent = b; badgesEl.appendChild(d);
  });

  //graph
  if(chart) chart.destroy();
  initChart();

  // Level & XP & streak display
  levelDisplay.textContent = `Level ${state.level} (XP: ${state.xp})`;
  document.getElementById('streakDisplay').textContent = `Streak: ${state.streak} 🔥`;

  saveState();
}

// Habit functions
function addHabit(){
  const name = input.value.trim();
  const category = categorySelect.value || 'General';
  if(!name) return;
  state.habits.push({ id: genId(), name, category, history: [], createdAt: new Date().toISOString() });
  input.value = '';
  saveState(); render();
}

function removeHabit(id){
  const idx = state.habits.findIndex(h=>h.id===id);
  if(idx >= 0){ state.habits.splice(idx,1); saveState(); render(); }
}

function isCompletedToday(habit){
  return habit.history.includes(isoDate());
}

function toggleHabit(id){
  const habit = state.habits.find(h=>h.id===id);
  if(!habit) return;
  const today = isoDate();
  const idx = habit.history.indexOf(today);

  
  if(idx === -1){
    habit.history.push(today);
    
    const firstActivityToday = state.lastActiveDate !== today;
    if(firstActivityToday){
      handleDailyActive();
    }
    addXP(10); // XP per habit completion
  } else {
    
    habit.history.splice(idx,1);
  }
  saveState(); render();
}

// Streak logic + daily activity
function handleDailyActive(){
  const today = isoDate();
  const yesterday = yesterdayIso();


  if(state.lastActiveDate === today) return;

  
  if(state.lastActiveDate === yesterday){
    state.streak = (state.streak || 0) + 1;
  } else {
   
    const last = state.lastActiveDate;
    if(last && last < yesterday){
      state.streak = 0; 
    }
    state.streak = (state.streak || 0) + 1;
  }

  state.lastActiveDate = today;
  // small daily bonus XP 
  addXP(5);
  // check streak badge
  if(state.streak >= STREAK_BADGE.days && !state.badges.includes(STREAK_BADGE.name)){
    state.badges.push(STREAK_BADGE.name);
  }
}

// XP & leveling stuff
function addXP(amount){
  state.xp = Math.max(0, (state.xp || 0) + amount);
  const threshold = state.level * 50;
  if(state.xp >= threshold){
    state.level++;
    state.xp = state.xp - threshold;
    showTransientQuote(`🎉 Level Up! You're now Level ${state.level}`);
  } else {
    showRandomQuote();
  }
  checkBadges();
  saveState();
}

function updateLevelDisplay(){ levelDisplay.textContent = `Level ${state.level} (XP: ${state.xp})`; }

function checkBadges(){
  BADGE_MILESTONES.forEach(m => {
    if(state.xp >= m.xp && !state.badges.includes(m.name)){
      state.badges.push(m.name);
    }
  });
}

// Streak per habit logic
function computeCurrentStreak(habit){
  let streak = 0;
  let d = new Date();
  for(;;){
    const iso = isoDate(d);
    if(habit.history.includes(iso)){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}

function computeLongestStreak(habit){
  const days = Array.from(new Set(habit.history)).sort();
  let longest = 0, current = 0, prev = null;
  for(const day of days){
    if(prev === null) current = 1;
    else {
      const prevDate = new Date(prev), curDate = new Date(day);
      const diff = (curDate - prevDate) / (1000*60*60*24);
      if(diff === 1) current++; else current = 1;
    }
    longest = Math.max(longest, current);
    prev = day;
  }
  return longest;
}

function overallLongestStreak(){
  let best = 0;
  for(const h of state.habits) best = Math.max(best, computeLongestStreak(h));
  return best;
}

//view history
function showHistory(id){
  const h = state.habits.find(x=>x.id===id);
  if(!h) return;
  const lines = h.history.slice().sort().reverse().slice(0,30);
  alert(`${h.name}\n\nRecent completions:\n${lines.join('\n') || '(none)'}`);
}


function showRandomQuote(){ quoteEl.textContent = QUOTES[Math.floor(Math.random()*QUOTES.length)]; setTimeout(()=>fetchQuoteOfDay(),3000); }
function showTransientQuote(text){ quoteEl.textContent = text; setTimeout(()=>fetchQuoteOfDay(),3000); }
async function fetchQuoteOfDay(){
  try{
    const res = await fetch('https://zenquotes.io/api/today');
    if(!res.ok) throw new Error('no remote');
    const arr = await res.json();
    if(Array.isArray(arr) && arr[0] && arr[0].q){
      quoteEl.textContent = `${arr[0].q} — ${arr[0].a || ''}`;
      return;
    }
  }catch(e){
    // random quote generator
    quoteEl.textContent = QUOTES[Math.floor(Math.random()*QUOTES.length)];
  }
}

// Utility
function escapeHtml(s){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":"&#39;",'"':'&quot;'})[c]); }

// Init 
addBtn.addEventListener('click', addHabit);
input.addEventListener('keydown', e => { if(e.key === 'Enter') addHabit(); });


(function init(){
 
  const today = isoDate();
  const yesterday = yesterdayIso();
  if(state.lastActiveDate && state.lastActiveDate < yesterday){
    state.streak = 0;
  }
  // render once
  (async ()=>{ await fetchQuoteOfDay(); render(); })();
})();


window.toggleHabit = toggleHabit;
window.removeHabit = removeHabit;
window.showHistory = showHistory;

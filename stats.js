// stats.js - HabitHero Analytics Dashboard

document.addEventListener("DOMContentLoaded", () => {
  const analyticsContainer = document.getElementById("analytics");
  if (!analyticsContainer) return;

  function loadState() {
    return JSON.parse(localStorage.getItem("habitHeroState")) || { habits: [], xp: 0, level: 1 };
  }

  function avgCompletionsPerWeek() {
    const state = loadState();
    const today = new Date();
    const last7 = [...Array(7)].map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return d.toISOString().slice(0, 10);
    });
    const total = state.habits.reduce(
      (sum, h) => sum + h.history.filter(d => last7.includes(d)).length,
      0
    );
    return (total / 7).toFixed(1);
  }

  function bestHabit() {
    const state = loadState();
    if (state.habits.length === 0) return "No habits yet";
    return state.habits
      .map(h => ({ name: h.name, streak: h.history.length }))
      .sort((a, b) => b.streak - a.streak)[0].name;
  }

  function totalXP() {
    const state = loadState();
    return (state.level - 1) * 50 + state.xp;
  }

  function renderAnalytics() {
    const state = loadState();
    const totalHabits = state.habits.length;
    const completions = state.habits.reduce((a, h) => a + h.history.length, 0);

    analyticsContainer.innerHTML = `
      <h2 class="text-xl font-bold mb-2">📊 Stats Dashboard</h2>
      <div class="stats-grid">
        <div class="stat-card">Avg Completions/Week: <b>${avgCompletionsPerWeek()}</b></div>
        <div class="stat-card">Top Habit: <b>${bestHabit()}</b></div>
        <div class="stat-card">Total XP Earned: <b>${totalXP()}</b></div>
        <div class="stat-card">All-Time Completions: <b>${completions}</b></div>
        <div class="stat-card">Total Habits: <b>${totalHabits}</b></div>
      </div>
      <canvas id="xpTrendChart" height="120"></canvas>
    `;

    renderXPTrend();
  }

  function renderXPTrend() {
    const state = loadState();
    const ctx = document.getElementById("xpTrendChart").getContext("2d");

    // estimate XP gain over time based on history
    const dailyXP = {};
    state.habits.forEach(h => {
      h.history.forEach(date => {
        dailyXP[date] = (dailyXP[date] || 0) + 10;
      });
    });

    const sortedDates = Object.keys(dailyXP).sort();
    const cumulative = [];
    let sum = 0;
    sortedDates.forEach(d => {
      sum += dailyXP[d];
      cumulative.push(sum);
    });

    if (window.xpChart) window.xpChart.destroy();
    window.xpChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: sortedDates.map(d => new Date(d).toLocaleDateString()),
        datasets: [
          {
            label: "XP Progress Over Time",
            data: cumulative,
            borderColor: "rgba(0, 119, 255, 0.9)",
            borderWidth: 2,
            fill: false,
            tension: 0.3,
          },
        ],
      },
      options: {
        scales: {
          y: { beginAtZero: true },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  // render initially
  renderAnalytics();

  // re-render whenever habits change
  document.addEventListener("habitsUpdated", renderAnalytics);
});

document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("progressChart");

  // Only render if canvas is found
  if (!ctx) {
    console.error("Canvas element for chart not found");
    return;
  }

  // Example weekly data (replace with your app data later)
  const weeklyData = [3, 5, 4, 7, 6, 2, 5];

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{
        label: "Habits Completed",
        data: weeklyData,
        backgroundColor: "rgba(0, 119, 255, 0.6)",
        borderColor: "rgba(0, 119, 255, 1)",
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
});

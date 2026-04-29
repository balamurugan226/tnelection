const STORAGE_KEY = 'tn_election_voted_v2';

const PARTIES = [
  { id:'DMK',      label:'DMK',      tamil:'திமுக' },
  { id:'AIADMK',   label:'AIADMK',   tamil:'அதிமுக' },
  { id:'Congress', label:'Congress', tamil:'காங்கிரஸ்' },
  { id:'BJP',      label:'BJP',      tamil:'பாஜக' },
  { id:'CPIM',     label:'CPM(M)',   tamil:'மார்க்சிஸ்ட்' },
  { id:'CPI',      label:'CPI',      tamil:'இந்திய கம்யூனிஸ்ட்' },
  { id:'VCK',      label:'VCK',      tamil:'விடுதலை சிறுத்தைகள்' },
  { id:'MDMK',     label:'MDMK',     tamil:'மறுமலர்ச்சி திமுக' },
  { id:'DMDK',     label:'DMDK',     tamil:'தேசிய முன்னேற்றக் கழகம்' },
  { id:'PMK',      label:'PMK',      tamil:'பட்டாளி மக்கள் கட்சி' },
  { id:'TMK',      label:'TMK',      tamil:'தமிழக முன்னேற்றக் கழகம்' },
  { id:'NTK',      label:'NTK',      tamil:'நாம் தமிழர் கட்சி' },
  { id:'MNM',      label:'MNM',      tamil:'மக்கள் நீதி மையம்' },
  { id:'TVK',      label:'TVK',      tamil:'தமிழக வெற்றி கழகம்' },
  { id:'DP',       label:'DP',       tamil:'தேசிய பார்வை' }
];

let selectedParty = null;
let hasVoted = false;

document.addEventListener('DOMContentLoaded', () => {
  generateParticles();
  checkVoteStatus();
  fetchAndRender();
  setInterval(fetchAndRender, 5000);
});

function checkVoteStatus() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    hasVoted = true;
    hidePollShowResults(JSON.parse(saved).party);
  }
}

// Particles
function generateParticles() {
  const c = document.getElementById('particles');
  const colors = ['#FF9933','#CC0000','#008000','#1565C0','#FFD700','#FF6700','#880E4F','#4A148C'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const s = Math.random() * 10 + 4;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${Math.random()*14+10}s;animation-delay:${Math.random()*10}s`;
    c.appendChild(p);
  }
}

// Select party
function selectParty(id) {
  if (hasVoted) return;
  selectedParty = id;
  document.querySelectorAll('.party-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`card-${id}`).classList.add('selected');
  const btn = document.getElementById('voteBtn');
  btn.disabled = false;
  btn.style.background = 'linear-gradient(135deg,#FF6B1A,#E85000)';
}

// Submit vote
async function submitVote() {
  if (!selectedParty || hasVoted) return;
  const btn = document.getElementById('voteBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="vote-btn-icon">⏳</span><span>Submitting...</span>';
  try {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({party: selectedParty})
    });
    if (!res.ok) throw new Error();
    const result = await res.json();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({party: selectedParty, ts: new Date().toISOString()}));
    hasVoted = true;
    fireConfetti();
    renderResults(result.data);
    hidePollShowResults(selectedParty);
  } catch {
    btn.disabled = false;
    btn.innerHTML = '<span class="vote-btn-icon">🗳️</span><span>வாக்களிக்கவும் / Cast My Prediction</span>';
    alert('Vote failed. Please try again.');
  }
}

function hidePollShowResults(votedParty) {
  document.querySelectorAll('.party-card').forEach(c => {
    c.style.cursor = 'default';
    c.style.opacity = c.dataset.party === votedParty ? '1' : '0.6';
  });
  document.getElementById('voteBtn').style.display = 'none';
  const ty = document.getElementById('thankyouCard');
  ty.style.display = 'flex';
  document.getElementById('thankyouParty').textContent =
    PARTIES.find(p => p.id === votedParty)?.label || votedParty;
}

async function fetchAndRender() {
  try {
    const res = await fetch('/api/votes');
    const data = await res.json();
    renderResults(data);
  } catch {}
}

function renderResults(data) {
  const { votes, totalVotes } = data;
  const sorted = PARTIES.map(p => ({
    ...p,
    count: votes[p.id] || 0,
    pct: totalVotes > 0 ? ((votes[p.id]||0)/totalVotes*100).toFixed(1) : '0.0'
  })).sort((a,b) => b.count - a.count);

  animateNumber('totalVotesDisplay', totalVotes);

  if (totalVotes > 0) {
    const leader = sorted[0];
    document.getElementById('leadingPartyDisplay').textContent = leader.label;
    document.getElementById('leadingPctDisplay').textContent = leader.pct + '%';
    document.getElementById('victoryPartyName').textContent = leader.label;
    document.getElementById('victoryPartyPct').textContent = leader.pct + '%';
  }

  const grid = document.getElementById('resultsGrid');
  grid.innerHTML = '';
  sorted.forEach((p, i) => {
    const leading = i === 0 && totalVotes > 0;
    const row = document.createElement('div');
    row.className = `result-row${leading ? ' leading' : ''}`;
    row.innerHTML = `
      <div class="result-party-name">${p.label}</div>
      <div class="result-bar-wrap"><div class="result-bar bar-${p.id}" style="width:0%"></div></div>
      <div class="result-pct pct-${p.id}">${p.pct}%</div>
      <div class="result-count">${p.count.toLocaleString()} votes</div>`;
    grid.appendChild(row);
    setTimeout(() => { row.querySelector('.result-bar').style.width = p.pct + '%'; }, 60 + i * 70);
  });
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  const start = parseInt(el.textContent.replace(/,/g,'')) || 0;
  const end = parseInt(target) || 0;
  if (start === end) return;
  const t0 = performance.now();
  const dur = 600;
  const tick = now => {
    const p = Math.min((now-t0)/dur, 1);
    const e = 1 - Math.pow(1-p, 3);
    el.textContent = Math.round(start + (end-start)*e).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Share functionality
function shareLink() {
  const url = window.location.href;
  document.getElementById('shareUrlInput').value = url;
  document.getElementById('shareModal').style.display = 'flex';
}

function closeShareModal(e) {
  if (e.target.id === 'shareModal') document.getElementById('shareModal').style.display = 'none';
}

function copyLink() {
  const input = document.getElementById('shareUrlInput');
  input.select();
  try {
    navigator.clipboard.writeText(input.value).then(() => {
      const btn = document.getElementById('copyBtn');
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = '📋 Copy', 2000);
    });
  } catch {
    document.execCommand('copy');
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy', 2000);
  }
}

function shareWhatsApp() {
  const url = encodeURIComponent(window.location.href);
  const msg = encodeURIComponent('🗳️ தமிழ்நாடு 2026 Election Predictor! யார் வெல்வார்கள்? Vote here: ');
  window.open(`https://wa.me/?text=${msg}${url}`, '_blank');
}

function shareTwitter() {
  const url = encodeURIComponent(window.location.href);
  const msg = encodeURIComponent('🗳️ Who will win Tamil Nadu 2026? Cast your prediction! #TamilNaduElection2026 #TNElection ');
  window.open(`https://twitter.com/intent/tweet?text=${msg}&url=${url}`, '_blank');
}

// Confetti
function fireConfetti() {
  const colors = ['#FF9933','#CC0000','#008000','#1565C0','#FFD700','#fff','#FF6700','#9C27B0'];
  for (let i = 0; i < 70; i++) {
    setTimeout(() => {
      const d = document.createElement('div');
      d.className = 'confetti-piece';
      const s = Math.random()*10+5;
      d.style.cssText = `left:${Math.random()*100}vw;top:0;background:${colors[Math.floor(Math.random()*colors.length)]};width:${s}px;height:${s}px;border-radius:${Math.random()>.5?'50%':'2px'};animation-duration:${Math.random()*1.5+1.5}s;animation-delay:${Math.random()*0.4}s`;
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 3000);
    }, i * 25);
  }
}

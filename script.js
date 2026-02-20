const METHODS = {
  bkash: { label: "bKash", number: "01XXXXXXXXX", accentVar: "--bkash" },
  nagad: { label: "Nagad", number: "01YYYYYYYYY", accentVar: "--nagad" },
  upay:  { label: "Upay",  number: "01ZZZZZZZZZ", accentVar: "--upay"  }
};

const GOAL_TOTAL = 1000;

const tabs = Array.from(document.querySelectorAll(".tab"));
const indicator = document.querySelector(".tabIndicator");

const methodName = document.getElementById("methodName");
const donationNumber = document.getElementById("donationNumber");
const pillIcon = document.getElementById("pillIcon");
const pill = document.getElementById("pill");

const copyBtn = document.getElementById("copyBtn");
const shareBtn = document.getElementById("shareBtn");
const numberCard = document.getElementById("numberCard");
const toast = document.getElementById("toast");

const barFill = document.getElementById("barFill");
const goalStat = document.getElementById("goalStat");
const goalNote = document.getElementById("goalNote");

let currentMethod = localStorage.getItem("donate_method") || "bkash";

function svgIcon(type){
  if(type === "bkash"){
    return `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 16.7c3.3-1.2 7.3-4.3 9.4-7.6.5-.8-.3-1.6-1.1-1.1C11 10.1 7.9 14 6.7 17.3c-.2.6.7 1 .9.4Z" fill="currentColor"/>
        <path d="M10.4 17.8c2.7-.8 5.9-3.3 7.4-6 .4-.7-.3-1.4-1-1C14 12.4 11.5 15.6 10.6 18.3c-.2.6.6 1 .8.5Z" fill="currentColor" opacity=".9"/>
      </svg>`;
  }
  if(type === "nagad"){
    return `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="2"/>
        <path d="M9 14.5c2.7 0 6-2.3 6-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
  }
  return `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 12.5c0 3 2.1 5.5 5 5.5s5-2.5 5-5.5V8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M9 8v4.5c0 1.9 1.3 3.5 3 3.5s3-1.6 3-3.5V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".9"/>
    </svg>`;
}

function setTabIcons(){
  document.querySelectorAll(".tabIcon").forEach(el => {
    const key = el.getAttribute("data-icon");
    el.innerHTML = svgIcon(key);
  });
}

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1400);
}

function haptic(){
  if (navigator.vibrate) navigator.vibrate(18);
}

function setIndicatorByIndex(i){
  indicator.style.transform = `translateX(${i * 100}%)`;
}

function getAccent(methodKey){
  const v = METHODS[methodKey].accentVar;
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}

function paintAccent(methodKey){
  const accent = getAccent(methodKey);
  pill.style.boxShadow = `0 0 0 1px rgba(255,255,255,.12), 0 0 0 10px ${accent}18`;
  pillIcon.style.color = accent;
}

function applyMethod(methodKey){
  currentMethod = methodKey;
  const m = METHODS[methodKey];

  methodName.textContent = m.label;
  donationNumber.textContent = m.number;
  pillIcon.innerHTML = svgIcon(methodKey);

  tabs.forEach((t, idx) => {
    const active = t.dataset.method === methodKey;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
    if(active) setIndicatorByIndex(idx);
  });

  paintAccent(methodKey);
}

async function copyNumber(){
  const text = METHODS[currentMethod].number;
  try{
    await navigator.clipboard.writeText(text);
  }catch{
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  haptic();
  showToast("Copied");
}

async function sharePage(){
  const shareData = {
    title: "Project Iftar For All • Donate",
    text: `Donate via ${METHODS[currentMethod].label}: ${METHODS[currentMethod].number}`,
    url: window.location.href
  };

  if(navigator.share){
    try{ await navigator.share(shareData); } catch {}
  }else{
    try{
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied");
    }catch{
      showToast("Sharing not supported");
    }
  }
}

function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}

function renderGoal(mealsDone){
  const safe = clamp(Number(mealsDone) || 0, 0, GOAL_TOTAL);
  const pct = (safe / GOAL_TOTAL) * 100;

  barFill.style.width = `${pct}%`;
  goalStat.textContent = `${safe} / ${GOAL_TOTAL}`;

  const bar = document.querySelector(".bar");
  if(bar) bar.setAttribute("aria-valuenow", String(safe));

  if(safe >= GOAL_TOTAL){
    goalNote.textContent = "Alhamdulillah — goal completed. Thank you!";
  } else if(safe >= 750){
    goalNote.textContent = "Almost there — let’s finish strong this Ramadan.";
  } else if(safe >= 250){
    goalNote.textContent = "Making progress — every donation helps.";
  } else {
    goalNote.textContent = "Help us reach 1,000 meals this Ramadan.";
  }
}

/**
 * Reads progress from progress.json (same folder)
 * You only edit progress.json later — QR link stays unchanged.
 */
async function loadProgress(){
  try{
    const res = await fetch("progress.json", { cache: "no-store" });
    if(!res.ok) throw new Error("progress.json not found");
    const data = await res.json();

    // Expected: { "meals": 320 }
    renderGoal(data.meals);
  }catch(e){
    // If progress.json fails (e.g., local file open), fallback to 0
    renderGoal(0);
    goalNote.textContent = "Upload progress.json to enable live progress.";
  }
}

/* Events */
tabs.forEach(t => {
  t.addEventListener("click", () => {
    applyMethod(t.dataset.method);
    localStorage.setItem("donate_method", currentMethod);
    haptic();
  });
});

copyBtn.addEventListener("click", copyNumber);
numberCard.addEventListener("click", copyNumber);
shareBtn.addEventListener("click", sharePage);

/* Init */
setTabIcons();
applyMethod(currentMethod);
loadProgress();
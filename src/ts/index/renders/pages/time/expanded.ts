import { $ } from "../../../../utils/shared";

const WEEKDAYS_CN = ['日', '一', '二', '三', '四', '五', '六'] as const;
const CIRCUMFERENCE = 113; // 2π × r18

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function tick(): void {
  const now = new Date();
  (document.getElementById('cH') as HTMLElement).textContent = pad(now.getHours());
  (document.getElementById('cM') as HTMLElement).textContent = pad(now.getMinutes());
  (document.getElementById('cS') as HTMLElement).textContent = pad(now.getSeconds());
  (document.getElementById('cDate') as HTMLElement).textContent =
    `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
  (document.getElementById('cDay') as HTMLElement).textContent =
    '星期' + WEEKDAYS_CN[now.getDay()];

  const elapsed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const pct = Math.round((elapsed / 86400) * 100);
  (document.getElementById('dayRing') as unknown as SVGCircleElement)
    .setAttribute('stroke-dashoffset', String(CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE));
  (document.getElementById('ringTxt') as unknown as SVGTextElement).textContent = pct + '%';
}




const MONTHS_CN = ['1月','2月','3月','4月','5月','6月',
                   '7月','8月','9月','10月','11月','12月'] as const;

let calYear: number;
let calMonth: number;

function renderCalendar(): void {
  const now = new Date();
  if (calYear === undefined) { calYear = now.getFullYear(); calMonth = now.getMonth(); }

  (document.getElementById('calMonth') as HTMLElement).textContent =
    `${calYear} ${MONTHS_CN[calMonth]}`;

  const grid = document.getElementById('calGrid') as HTMLDivElement;
  grid.innerHTML = '';

  WEEKDAYS_CN.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-weekday';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstWeekday  = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth   = new Date(calYear, calMonth + 1, 0).getDate();
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

  for (let i = 0; i < firstWeekday; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day other-month';
    el.textContent = String(prevMonthDays - firstWeekday + 1 + i);
    grid.appendChild(el);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement('div');
    const isToday = d === now.getDate() && calYear === now.getFullYear() && calMonth === now.getMonth();
    el.className = 'cal-day' + (isToday ? ' today' : '');
    el.textContent = String(d);
    grid.appendChild(el);
  }
  const trailing = (firstWeekday + daysInMonth) % 7;
  for (let i = 1; i <= (trailing === 0 ? 0 : 7 - trailing); i++) {
    const el = document.createElement('div');
    el.className = 'cal-day other-month';
    el.textContent = String(i);
    grid.appendChild(el);
  }
}

function changeMonth(delta: number): void {
  calMonth += delta;
  if (calMonth > 11) { calMonth = 0;  calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

export function initClock(): void {
  //自动化渲染
  tick();
  setInterval(tick, 1000);
}

export function initCalendar(): void {
  //自动化渲染
  $<HTMLButtonElement>('calPrev')
    .addEventListener('click', () => changeMonth(-1));
  $<HTMLButtonElement>('calNext')
    .addEventListener('click', () => changeMonth(1));
  renderCalendar();
}


export function initTimeExpanded(): void {
  initCalendar();
  initClock();
}
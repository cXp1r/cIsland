// dashboard.ts — todo · clock · calendar

// ─── Types ───────────────────────────────────────────────────────────────────

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

// ─── Todo ─────────────────────────────────────────────────────────────────────

let todos: TodoItem[] = [
  { id: 1, text: '查看今日消息', done: false },
  { id: 2, text: '整理文件',     done: false },
  { id: 3, text: '喝水~',        done: true  },
];
let nextId = 4;

function addTodo(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.unshift({ id: nextId++, text: trimmed, done: false });
}

function toggleTodo(id: number): void {
  const item = todos.find(t => t.id === id);
  if (item) item.done = !item.done;
}

function deleteTodo(id: number): void {
  todos = todos.filter(t => t.id !== id);
}

function renderTodos(listEl: HTMLUListElement): void {
  listEl.innerHTML = '';
  todos.forEach(t => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (t.done ? ' done' : '');

    const check = document.createElement('span');
    check.className = 'todo-check';
    check.innerHTML = t.done ? '<i class="ti ti-check" aria-hidden="true"></i>' : '';

    const label = document.createElement('span');
    label.className = 'todo-text';
    label.textContent = t.text;

    const del = document.createElement('span');
    del.className = 'todo-del';
    del.title = '删除';
    del.innerHTML = '<i class="ti ti-x" aria-hidden="true"></i>';
    del.addEventListener('click', e => {
      e.stopPropagation();
      deleteTodo(t.id);
      renderTodos(listEl);
    });

    li.append(check, label, del);
    li.addEventListener('click', () => { toggleTodo(t.id); renderTodos(listEl); });
    listEl.appendChild(li);
  });
}

export function initTodo(): void {
  const input = document.getElementById('todoInput') as HTMLInputElement;
  const btn   = document.getElementById('todoAdd')   as HTMLButtonElement;
  const list  = document.getElementById('todoList')  as HTMLUListElement;

  const submit = () => { addTodo(input.value); input.value = ''; renderTodos(list); };
  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') submit(); });
  renderTodos(list);
}

// ─── Clock ────────────────────────────────────────────────────────────────────

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

export function initClock(): void {
  tick();
  setInterval(tick, 1000);
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

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

export function initCalendar(): void {
  (document.getElementById('calPrev') as HTMLButtonElement)
    .addEventListener('click', () => changeMonth(-1));
  (document.getElementById('calNext') as HTMLButtonElement)
    .addEventListener('click', () => changeMonth(1));
  renderCalendar();
}


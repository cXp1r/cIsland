export * from "../../../renderers/pages/time/expanded";
interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

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

export function initTimeComponents(): void {
  const input = document.getElementById('todoInput') as HTMLInputElement;
  const btn   = document.getElementById('todoAdd')   as HTMLButtonElement;
  const list  = document.getElementById('todoList')  as HTMLUListElement;

  const submit = () => { addTodo(input.value); input.value = ''; renderTodos(list); };
  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') submit(); });
  renderTodos(list);
}
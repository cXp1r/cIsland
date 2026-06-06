import { showStatus } from "./shared";

let logFilterTags: string[] = [];

export function getLogFilterTags(): string[] {
  return logFilterTags;
}

export function setLogFilterTags(tags: string[]) {
  logFilterTags = Array.isArray(tags) ? tags : [];
  renderLogFilterTags();
}

const logFilterTagInput = document.getElementById("log-filter-tag-input") as HTMLInputElement | null;
const logFilterTagAddBtn = document.getElementById("log-filter-tag-add-btn") as HTMLButtonElement | null;
const logFilterTagList = document.getElementById("log-filter-tag-list") as HTMLDivElement | null;

function renderLogFilterTags() {
  if (!logFilterTagList) return;
  logFilterTagList.innerHTML = "";

  if (logFilterTags.length === 0) {
    const empty = document.createElement("p");
    empty.style.color = "var(--text-muted)";
    empty.style.fontSize = "13px";
    empty.textContent = "过滤 Tag 为空。";
    logFilterTagList.appendChild(empty);
    return;
  }

  logFilterTags.forEach((tag, index) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--surface);border-radius:8px;gap:8px;";

    const label = document.createElement("span");
    label.textContent = tag;
    row.appendChild(label);

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-small";
    delBtn.style.color = "var(--danger, #ff6f7f)";
    delBtn.textContent = "删除";
    delBtn.addEventListener("click", () => {
      logFilterTags.splice(index, 1);
      renderLogFilterTags();
    });
    row.appendChild(delBtn);
    logFilterTagList.appendChild(row);
  });
}

function addLogFilterTag() {
  if (!logFilterTagInput) return;
  const val = logFilterTagInput.value.trim();
  if (!val) return;
  if (logFilterTags.includes(val)) {
    showStatus("该 Tag 已在过滤列表中", true);
    return;
  }
  logFilterTags.push(val);
  logFilterTagInput.value = "";
  renderLogFilterTags();
}

export function initLogFilter(): void {
  if (logFilterTagAddBtn) {
    logFilterTagAddBtn.addEventListener("click", () => addLogFilterTag());
  }
  if (logFilterTagInput) {
    logFilterTagInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addLogFilterTag();
    });
  }
}

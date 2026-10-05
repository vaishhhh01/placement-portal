async function api(path, body) {
  const opt = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const r = await fetch(path, opt);
  if (r.status === 401 && path !== "/api/login") { location.href = "/"; return null; }
  return r.json();
}
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
function note(msg, ok = true) {
  const n = $("#note");
  if (!n) return;
  n.hidden = !msg;
  n.className = "note" + (ok ? "" : " is-error");
  n.textContent = msg || "";
}
const badge = s => `<span class="status-badge">${esc(s)}</span>`;

function showSavedModal(message = "Your changes were saved successfully.") {
  const modal = $("#savedModal");
  if (!modal) return;
  $("#savedModalMessage").textContent = message;
  modal.hidden = false;
  $("#closeSavedModal").focus();
}

function closeSavedModal() {
  const modal = $("#savedModal");
  if (modal) modal.hidden = true;
}

$("#closeSavedModal")?.addEventListener("click", closeSavedModal);
$("#savedModal")?.addEventListener("click", e => {
  if (e.target.id === "savedModal") closeSavedModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeSavedModal();
});

function closeCustomSelects(except) {
  document.querySelectorAll(".custom-select.is-open").forEach(control => {
    if (control !== except) {
      control.classList.remove("is-open");
      control.querySelector(".custom-select__trigger")?.setAttribute("aria-expanded", "false");
    }
  });
}

function enhanceSelect(select) {
  if (!select || select.dataset.enhancedSelect) return;
  select.dataset.enhancedSelect = "true";

  const control = document.createElement("div");
  control.className = "custom-select";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select__trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const label = document.createElement("span");
  label.className = "custom-select__label";
  const chevron = document.createElement("span");
  chevron.className = "custom-select__chevron";
  chevron.setAttribute("aria-hidden", "true");
  trigger.append(label, chevron);
  const menu = document.createElement("div");
  menu.className = "custom-select__menu";
  menu.setAttribute("role", "listbox");

  select.parentNode.insertBefore(control, select);
  control.append(select, trigger, menu);
  select.classList.add("custom-select__native");

  const refresh = () => {
    const options = [...select.options];
    const selected = options.find(option => option.value === select.value) || options[0];
    label.textContent = selected?.textContent || "Select an option";
    trigger.disabled = select.disabled;
    control.classList.toggle("is-disabled", select.disabled);
    menu.replaceChildren(...options.map(option => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "custom-select__option";
      item.textContent = option.textContent;
      item.dataset.value = option.value;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.selected));
      item.disabled = option.disabled;
      item.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        refresh();
        closeCustomSelects();
        trigger.focus();
      });
      return item;
    }));
  };

  trigger.addEventListener("click", () => {
    if (select.disabled) return;
    const open = !control.classList.contains("is-open");
    closeCustomSelects(control);
    control.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
  });
  select.addEventListener("change", refresh);
  select.refreshCustomSelect = refresh;
  refresh();
}

function refreshCustomSelect(select) {
  select?.refreshCustomSelect?.();
}

document.addEventListener("click", event => {
  if (!event.target.closest(".custom-select")) closeCustomSelects();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeCustomSelects();
});

function initDashboardTabs() {
  document.querySelectorAll("[data-tabs]").forEach(tabList => {
    const tabs = [...tabList.querySelectorAll("[data-tab]")];
    const selectTab = tab => {
      const target = document.getElementById(tab.dataset.tab);
      if (!target) return;
      tabs.forEach(item => {
        const isSelected = item === tab;
        item.classList.toggle("is-active", isSelected);
        item.setAttribute("aria-selected", String(isSelected));
        const panel = document.getElementById(item.dataset.tab);
        if (!panel) return;
        panel.hidden = !isSelected;
        panel.classList.toggle("is-active", isSelected);
      });
    };
    tabs.forEach(tab => tab.addEventListener("click", () => selectTab(tab)));
  });
}

initDashboardTabs();
document.querySelectorAll("select").forEach(enhanceSelect);

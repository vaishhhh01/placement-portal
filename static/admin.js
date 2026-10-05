const buttons = (kind, id) => `<input placeholder="Reason"></td>
  <td><div class="row-actions"><button type="button" data-kind="${kind}" data-id="${id}" data-decision="approve">Approve</button>
  <button type="button" data-kind="${kind}" data-id="${id}" data-decision="reject">Reject</button></div>`;
async function loadPending() {
  const d = await api("/api/admin/pending"); if (!d) return;
  $("#companies").innerHTML = d.companies.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.description)}</td><td>${buttons("company", c.id)}</td></tr>`).join("") || `<tr><td colspan="4">Nothing pending.</td></tr>`;
  $("#jobs").innerHTML = d.jobs.map(j => `<tr><td>${esc(j.title)}</td><td>${esc(j.company)}</td><td>${j.min_cgpa}</td><td>${j.grad_year ?? "Any"}</td><td>${esc(j.branches)}</td><td>${buttons("job", j.id)}</td></tr>`).join("") || `<tr><td colspan="7">Nothing pending.</td></tr>`;
}
async function loadLogs() {
  const logs = await api("/api/admin/logs"); if (!logs) return;
  $("#logs").innerHTML = logs.map(l => `<tr><td>${l.when}</td><td>${l.admin_id}</td><td>${esc(l.action)}</td><td>${l.target}</td><td>${esc(l.reason)}</td></tr>`).join("") || `<tr><td colspan="5">No audit rows yet.</td></tr>`;
}
async function loadDirectory() {
  const data = await api("/api/admin/directory"); if (!data) return;
  $("#directoryCompanies").innerHTML = data.companies.map(company =>
    `<tr><td>${esc(company.name)}</td><td>${esc(company.email)}</td><td>${badge(company.status)}</td><td>${badge(company.hiring_status)}</td></tr>`
  ).join("") || `<tr><td colspan="4">No registered companies.</td></tr>`;
  $("#directoryStudents").innerHTML = data.students.map(student =>
    `<tr><td>${esc(student.name)}</td><td>${esc(student.email)}</td><td>${esc(student.branch)}</td><td>${badge(student.status)}</td></tr>`
  ).join("") || `<tr><td colspan="4">No registered students.</td></tr>`;
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-decision]"); if (!b) return;
  const reason = b.closest("tr").querySelector("input").value;
  const r = await api("/api/admin/moderate", { kind: b.dataset.kind, id: +b.dataset.id, decision: b.dataset.decision, reason });
  if (!r) return;
  if (r.ok) showSavedModal(r.message);
  else note(r.message, false);
  loadPending(); loadLogs(); loadDirectory();
});
loadPending(); loadLogs(); loadDirectory();

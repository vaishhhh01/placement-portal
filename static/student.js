async function loadProfile() {
  const p = await api("/api/student/me"); if (!p) return;
  $("#pname").textContent = p.name;
  $("#branch").value = p.branch; $("#cgpa").value = p.cgpa; $("#year").value = p.graduation_year; $("#resume").value = p.resume_link || "";
}
async function loadJobs() {
  const jobs = await api("/api/jobs"); if (!jobs) return;
  $("#jobs").innerHTML = jobs.map(j => `<tr><td>${esc(j.title)}</td><td>${esc(j.company)}</td><td>${j.min_cgpa}</td><td>${j.grad_year ?? "Any"}</td><td>${esc(j.branches)}</td>
    <td><button type="button" data-id="${j.id}">Apply</button></td></tr>`).join("") || `<tr><td colspan="6">No open jobs yet.</td></tr>`;
}
async function loadApps() {
  const apps = await api("/api/student/applications"); if (!apps) return;
  $("#apps").innerHTML = apps.map(a => `<tr><td>${esc(a.job)}</td><td>${badge(a.status)}</td><td>${a.changed}</td></tr>`).join("") || `<tr><td colspan="3">No applications yet.</td></tr>`;
}
$("#jobs").addEventListener("click", async e => {
  const id = e.target.dataset.id; if (!id) return;
  const r = await api("/api/student/apply/" + id, {});
  if (!r) return;
  if (r.ok) note(r.message, true);
  else showApplicationModal(r.message);
  loadApps();
});
function showApplicationModal(message) {
  $("#applicationModalMessage").textContent = message;
  $("#applicationModal").hidden = false;
  $("#closeApplicationModal").focus();
}
function closeApplicationModal() {
  $("#applicationModal").hidden = true;
}
$("#closeApplicationModal").addEventListener("click", closeApplicationModal);
$("#applicationModal").addEventListener("click", e => {
  if (e.target.id === "applicationModal") closeApplicationModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeApplicationModal();
});
$("#saveProfile").onclick = async () => {
  const r = await api("/api/student/profile", { resume_link: $("#resume").value });
  if (!r) return;
  if (r.ok) showSavedModal(r.message);
  else note(r.message, false);
};
loadProfile(); loadJobs(); loadApps();
setInterval(() => { loadJobs(); loadApps(); }, 5000);

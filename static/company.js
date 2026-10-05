let applicants = [], picked = new Set(), companyJobs = [];
async function loadMe() {
  const m = await api("/api/company/me"); if (!m) return;
  $("#cname").textContent = m.company_name + " details"; $("#desc").value = m.description;
  if (m.status !== "ACTIVE") note("Your company is " + m.status + " and waiting for admin approval.", false);
}
async function loadJobs() {
  const jobs = await api("/api/company/jobs"); if (!jobs) return;
  companyJobs = jobs;
  $("#jobs").innerHTML = jobs.map(j => `<tr><td>${esc(j.title)}</td><td>${badge(j.status)}</td></tr>`).join("") || `<tr><td colspan="2">No jobs yet.</td></tr>`;
  drawCloseJobOptions();
}
function drawCloseJobOptions() {
  const select = $("#closeJob");
  const button = $("#startCloseHiring");
  if (!select || !button) return;
  const openJobs = companyJobs.filter(job => job.status === "ACTIVE");
  select.innerHTML = openJobs.map(job => `<option value="${job.id}">${esc(job.title)}</option>`).join("") || `<option value="">No active jobs available to close</option>`;
  select.disabled = openJobs.length === 0;
  button.disabled = openJobs.length === 0;
  refreshCustomSelect(select);
}
function drawApplicants() {
  const q = $("#search").value.toLowerCase();
  $("#apps").innerHTML = applicants.filter(a => (a.student + " " + a.job).toLowerCase().includes(q)).map(a =>
    `<tr><td><input type="checkbox" aria-label="Select applicant ${esc(a.student)} for ${esc(a.job)}" data-id="${a.id}" ${picked.has(a.id) ? "checked" : ""}></td>
     <td>${esc(a.student)}</td><td>${esc(a.job)}</td><td>${a.cgpa}</td><td>${badge(a.status)}</td><td>${a.changed}</td></tr>`).join("") || `<tr><td colspan="6">No applicants yet.</td></tr>`;
  $("#updBtn").textContent = `Update selected (${picked.size})`;
}
async function loadApplicants() { applicants = (await api("/api/company/applicants")) || applicants; drawApplicants(); }
$("#apps").addEventListener("change", e => { const id = +e.target.dataset.id; e.target.checked ? picked.add(id) : picked.delete(id); drawApplicants(); });
$("#search").addEventListener("input", drawApplicants);
$("#updBtn").onclick = async () => {
  const r = await api("/api/company/update", { ids: [...picked], status: $("#newStatus").value });
  note(r.message, r.ok); picked.clear(); loadApplicants();
};
$("#saveCompany").onclick = async () => {
  const r = await api("/api/company/profile", { description: $("#desc").value });
  if (!r) return;
  if (r.ok) showSavedModal(r.message);
  else note(r.message, false);
};
$("#postJob").onclick = async () => {
  const r = await api("/api/company/jobs", { title: $("#title").value, description: $("#jdesc").value, min_cgpa: $("#mincgpa").value, grad_year: $("#gradyear").value, departments: $("#branches").value });
  if (!r) return;
  if (r.ok) showSavedModal(r.message);
  else note(r.message, false);
  if (r.ok) { ["title", "jdesc", "mincgpa", "gradyear", "branches"].forEach(i => $("#" + i).value = ""); loadJobs(); }
};
function closeHiringModal() { $("#closeHiringModal").hidden = true; }
$("#startCloseHiring").onclick = () => {
  const jobId = $("#closeJob").value;
  const job = companyJobs.find(item => String(item.id) === jobId);
  if (!job) return;
  $("#closeHiringMessage").textContent = `Close hiring for “${job.title}”? New student applications will no longer be accepted.`;
  $("#closeHiringModal").hidden = false;
  $("#confirmCloseHiring").focus();
};
$("#cancelCloseHiring").onclick = closeHiringModal;
$("#closeHiringModal").addEventListener("click", e => {
  if (e.target.id === "closeHiringModal") closeHiringModal();
});
$("#confirmCloseHiring").onclick = async () => {
  const jobId = $("#closeJob").value;
  const r = await api(`/api/company/jobs/${jobId}/close`, {});
  if (!r) return;
  closeHiringModal();
  if (r.ok) showSavedModal(r.message);
  else note(r.message, false);
  if (r.ok) loadJobs();
};
loadMe(); loadJobs(); loadApplicants();
setInterval(() => { loadJobs(); loadApplicants(); }, 5000);

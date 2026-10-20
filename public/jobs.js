// The jobs editor: name, hours and minutes, and a Must do today switch per job.

let nextId = 1;

export function createJobsEditor(listEl, addButton, initialJobs) {
  const jobs = initialJobs.map((j) => ({ id: nextId++, ...j }));

  function render(focusId) {
    listEl.innerHTML = "";
    for (const job of jobs) {
      const li = document.createElement("li");
      li.className = "job";
      li.dataset.id = job.id;
      li.innerHTML = `
        <input name="name" type="text" maxlength="60" placeholder="What needs power?" aria-label="Job name">
        <label class="num"><input name="hours" type="number" min="0" max="18" step="1" inputmode="numeric" aria-label="Hours"><span aria-hidden="true">h</span></label>
        <label class="num"><input name="minutes" type="number" min="0" max="59" step="5" inputmode="numeric" aria-label="Minutes"><span aria-hidden="true">min</span></label>
        <label class="switch"><input name="must" type="checkbox"><span></span>Must do today</label>
        <label class="switch"><input name="backup" type="checkbox"><span></span>Runs on backup</label>
        <button type="button" class="remove" aria-label="Remove job">×</button>`;
      li.querySelector("[name=name]").value = job.name;
      li.querySelector("[name=hours]").value = job.minutes ? Math.floor(job.minutes / 60) : "";
      li.querySelector("[name=minutes]").value = job.minutes ? job.minutes % 60 : "";
      li.querySelector("[name=must]").checked = Boolean(job.must);
      li.querySelector("[name=backup]").checked = Boolean(job.backup);
      li.querySelector(".remove").setAttribute("aria-label", `Remove ${job.name || "this job"}`);
      listEl.append(li);
    }
    if (focusId) listEl.querySelector(`li[data-id="${focusId}"] [name=name]`)?.focus();
  }

  listEl.addEventListener("input", (e) => {
    const li = e.target.closest("li.job");
    if (!li) return;
    const job = jobs.find((j) => j.id === Number(li.dataset.id));
    const hours = Number(li.querySelector("[name=hours]").value) || 0;
    const minutes = Number(li.querySelector("[name=minutes]").value) || 0;
    job.name = li.querySelector("[name=name]").value;
    job.minutes = hours * 60 + minutes;
    job.must = li.querySelector("[name=must]").checked;
    job.backup = li.querySelector("[name=backup]").checked;
  });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove");
    if (!btn) return;
    const id = Number(btn.closest("li.job").dataset.id);
    const index = jobs.findIndex((j) => j.id === id);
    if (index >= 0) jobs.splice(index, 1);
    render();
    addButton.focus();
  });

  addButton.addEventListener("click", () => {
    const job = { id: nextId++, name: "", minutes: 0, must: false, backup: false };
    jobs.push(job);
    render(job.id);
  });

  render();
  return { getJobs: () => jobs.map(({ name, minutes, must, backup }) => ({ name, minutes, must, backup })) };
}

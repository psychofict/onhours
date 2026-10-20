// The jobs editor: name, hours and minutes, Must do today and Runs on backup per job.
import { el, icon } from "./draw.js";

let nextId = 1;

export function createJobsEditor(listEl, { initialJobs = [], onChange = () => {} } = {}) {
  let jobs = initialJobs.map((j) => ({ id: nextId++, ...j }));

  function row(job) {
    const name = el("input", { type: "text", name: "name", maxlength: "60", placeholder: "What needs power?", "aria-label": "Job name" });
    const hours = el("input", { type: "number", name: "hours", min: "0", max: "18", step: "1", inputmode: "numeric", "aria-label": "Hours" });
    const minutes = el("input", { type: "number", name: "minutes", min: "0", max: "59", step: "5", inputmode: "numeric", "aria-label": "Minutes" });
    const must = el("input", { type: "checkbox", name: "must" });
    const backup = el("input", { type: "checkbox", name: "backup" });
    name.value = job.name;
    hours.value = job.minutes ? Math.floor(job.minutes / 60) : "";
    minutes.value = job.minutes ? job.minutes % 60 : "";
    must.checked = Boolean(job.must);
    backup.checked = Boolean(job.backup);
    const remove = el("button", { type: "button", class: "remove", "aria-label": `Remove ${job.name || "this job"}` }, icon("close"));
    return el("li", { class: "job", "data-id": job.id, role: "group", "aria-label": job.name || "New job" },
      el("div", { class: "job-top" }, name, remove),
      el("div", { class: "job-bottom" },
        el("div", { class: "duration" },
          el("label", { class: "num" }, hours, el("span", { "aria-hidden": "true", text: "h" })),
          el("label", { class: "num" }, minutes, el("span", { "aria-hidden": "true", text: "min" }))),
        el("label", { class: "toggle must" }, must, el("span", {}, icon("check"), "Must do today")),
        el("label", { class: "toggle backup" }, backup, el("span", {}, icon("check"), "Runs on backup"))));
  }

  function render(focusId) {
    listEl.replaceChildren(...jobs.map(row));
    if (focusId) listEl.querySelector(`li[data-id="${focusId}"] [name=name]`)?.focus();
  }

  listEl.addEventListener("input", (e) => {
    const li = e.target.closest("li.job");
    if (!li) return;
    const job = jobs.find((j) => j.id === Number(li.dataset.id));
    if (!job) return;
    const hours = Number(li.querySelector("[name=hours]").value) || 0;
    const minutes = Number(li.querySelector("[name=minutes]").value) || 0;
    job.name = li.querySelector("[name=name]").value;
    job.minutes = hours * 60 + minutes;
    job.must = li.querySelector("[name=must]").checked;
    job.backup = li.querySelector("[name=backup]").checked;
    li.setAttribute("aria-label", job.name || "New job");
    li.querySelector(".remove").setAttribute("aria-label", `Remove ${job.name || "this job"}`);
    onChange();
  });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove");
    if (!btn) return;
    const id = Number(btn.closest("li.job").dataset.id);
    jobs = jobs.filter((j) => j.id !== id);
    render();
    onChange();
    (listEl.querySelector("li.job [name=name]") || document.getElementById("add-job"))?.focus();
  });

  render();
  return {
    getJobs: () => jobs.map(({ name, minutes, must, backup }) => ({ name, minutes, must, backup })),
    setJobs(list) { jobs = list.map((j) => ({ id: nextId++, name: "", minutes: 0, must: false, backup: false, ...j })); render(); },
    addJobs(list, focus = false) {
      const added = list.map((j) => ({ id: nextId++, name: "", minutes: 0, must: false, backup: false, ...j }));
      jobs.push(...added);
      render(focus && added.length ? added[added.length - 1].id : undefined);
      onChange();
    },
    addEmpty() {
      const job = { id: nextId++, name: "", minutes: 0, must: false, backup: false };
      jobs.push(job);
      render(job.id);
      onChange();
    },
  };
}

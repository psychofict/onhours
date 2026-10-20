// Fictional sample data. The areas, groups and jobs are made up for the demo.

export const SAMPLE_NOTICE = `*POWER SUPPLY NOTICE*
Planned load management, daily schedule. Please plan accordingly.

Group 1 – Kopje Heights, Mbizi Park: 06:00 - 10:00 and 18:00 - 22:00
Group 2 – Riverside East, Siding Road: 05:00-09:00 / 13:00-15:00 / 20:00-23:00
Group 3 – Market Square: 10:00 to 14:00
Group 4 – Hillside Extension: off from 4 in the afternoon until 8pm, and again 2am to 6am

Supply will be restored as soon as works are complete. Forwarded as received.`;

export const SAMPLE_JOBS = [
  { name: "Pump water to the tank", minutes: 60, must: true, backup: false },
  { name: "Iron school uniforms", minutes: 45, must: true, backup: false },
  { name: "Sew the choir order", minutes: 120, must: true, backup: true },
  { name: "Charge phones and the power bank", minutes: 60, must: true, backup: true },
  { name: "Slow-cook the beans", minutes: 300, must: false, backup: true },
];

export const SAMPLE_AREA = "Riverside East";

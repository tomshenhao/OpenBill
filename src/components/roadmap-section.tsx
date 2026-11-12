import { roadmapMilestones, type MilestoneStatus } from "@/config/roadmap";
import { messages, type Locale } from "@/i18n";

const statuses: MilestoneStatus[] = ["completed", "in-progress", "planned"];

export function RoadmapSection({ locale }: { locale: Locale }) {
  const t = messages[locale].product;
  return (
    <section id="roadmap" aria-labelledby="roadmap-heading" className="roadmap-section section-anchor">
      <div className="page-width roadmap-layout">
        <div>
          <p className="eyebrow">{t.roadmapEyebrow}</p>
          <h2 id="roadmap-heading" className="section-title mt-4">{t.roadmapTitle}</h2>
          <p className="mt-5 text-sm leading-7 text-muted">{t.roadmapDescription}</p>
          <ul aria-label={t.milestoneStatusLabel} className="mt-6 flex flex-wrap gap-2">
            {statuses.map((status) => <li key={status} className={`status-label status-${status}`}>{t.milestoneStatus[status]}</li>)}
          </ul>
        </div>
        <ol className="roadmap-timeline">
          {roadmapMilestones.map((milestone) => (
            <li key={milestone.id} data-milestone={milestone.id} data-status={milestone.status}>
              <span className={`milestone-marker marker-${milestone.status}`} aria-hidden="true" />
              <span className={`status-label status-${milestone.status}`}>{t.milestoneStatus[milestone.status]}</span>
              <h3 className="mt-3 text-lg font-semibold">{t.milestones[milestone.id].title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{t.milestones[milestone.id].description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

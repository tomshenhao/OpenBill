import { communityFeedbackUrl, projectRepositoryUrl, projectRoadmapUrl } from "@/config/community";
import { messages, type Locale } from "@/i18n";

export function CommunitySection({ locale }: { locale: Locale }) {
  const t = messages[locale].product;
  return (
    <footer className="border-t border-line">
      <div id="community" className="page-width section-anchor py-7">
        <h2 className="text-lg font-semibold">{t.communityNav}</h2>
        <div className="flex flex-wrap items-center gap-x-6">
          <a href={projectRepositoryUrl} rel="noreferrer" className="text-action">{t.communityRepository}</a>
          <a href={projectRoadmapUrl} rel="noreferrer" className="text-action">{t.roadmapNav}</a>
          <a href={communityFeedbackUrl} rel="noreferrer" className="text-action" aria-describedby="feedback-public feedback-privacy">{t.communityAction}</a>
        </div>
        <div className="max-w-2xl space-y-1 text-sm leading-6 text-muted">
          <p id="feedback-public">{t.communityPublic}</p>
          <p id="feedback-privacy">{t.communityPrivacy}</p>
        </div>
      </div>
    </footer>
  );
}

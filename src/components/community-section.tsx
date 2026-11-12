import { communityFeedbackUrl } from "@/config/community";
import { messages, type Locale } from "@/i18n";
import { Icon } from "./icon";

export function CommunitySection({ locale }: { locale: Locale }) {
  const t = messages[locale].product;
  return (
    <section id="community" aria-labelledby="community-heading" className="page-width section-spacing section-anchor">
      <div className="community-panel">
        <div>
          <p className="eyebrow">{t.communityEyebrow}</p>
          <h2 id="community-heading" className="section-title mt-4">{t.communityTitle}</h2>
          <p className="mt-5 max-w-2xl leading-7 text-muted">{t.communityDescription}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href={communityFeedbackUrl} rel="noreferrer" className="button-primary" aria-describedby="feedback-public feedback-privacy">{t.communityAction}<Icon name="arrow" /></a>
            <a href="#roadmap" className="text-action">{t.communityRoadmap}</a>
          </div>
        </div>
        <aside className="community-privacy">
          <Icon name="shield" className="mb-4 size-7 text-green" />
          <p id="feedback-public" className="text-sm leading-7">{t.communityPublic}</p>
          <p id="feedback-privacy" className="mt-4 text-sm leading-7 text-muted">{t.communityPrivacy}</p>
        </aside>
      </div>
    </section>
  );
}

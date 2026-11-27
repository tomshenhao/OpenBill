import type { coreCategories } from "@/config/categories";
import { homeRoutes } from "@/config/routes";
import { languageTags, messages, type Locale } from "@/i18n";
import { Icon } from "./icon";

type Tool = Extract<(typeof coreCategories)[number], { status: "available" }>;

export function SiteHeader({ locale, tool }: { locale: Locale; tool?: { id: Tool["id"]; route: Record<Locale, string> } }) {
  const t = messages[locale];
  const alternate = locale === "en" ? "zh" : "en";
  const skipMain = { target: "#main", label: t.skip };
  const skipLinks = {
    electricity: skipMain,
    water: null,
    mortgage: { target: "#mortgage-calculator", label: t.mortgage.skip },
    insurance: skipMain,
  };
  const skip = tool ? skipLinks[tool.id] : skipMain;

  return (
    <>
      {skip && <a className="skip-link" href={skip.target}>{skip.label}</a>}
      <header className="site-header">
        <div className="page-width flex min-h-22 flex-wrap items-center justify-between gap-4 py-4 max-[374px]:gap-x-2">
          <a href={homeRoutes[locale]} className="brand" aria-label="OpenBill">
            <span className="brand-mark"><Icon name="leaf" /></span>OpenBill<span className="brand-period">.</span>
          </a>
          <nav aria-label={t.navigation} className="flex flex-wrap items-center gap-4 max-[374px]:gap-x-2 sm:gap-8">
            {tool ? (
              <a href={homeRoutes[locale]} className="nav-link inline-flex">{t.home}</a>
            ) : (
              <>
                <a href="#categories" className="nav-link hidden md:inline-flex">{t.product.categoriesNav}</a>
                <a href="#community" className="nav-link hidden lg:inline-flex">{t.product.communityNav}</a>
              </>
            )}
            <a href={(tool?.route ?? homeRoutes)[alternate]} hrefLang={languageTags[alternate]} lang={languageTags[alternate]} className="language-link">
              <Icon name="globe" className="size-4" />{t.otherLanguage}
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}

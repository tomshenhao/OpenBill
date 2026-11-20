import { coreCategories } from "@/config/categories";
import { messages, type Locale } from "@/i18n";
import { Icon } from "./icon";

export function CoreCategorySection({ locale }: { locale: Locale }) {
  const t = messages[locale].product;
  return (
    <section id="categories" aria-labelledby="categories-heading" className="page-width categories-section section-anchor">
      <h2 id="categories-heading" className="section-title">{t.coreTitle}</h2>
      <ul className="category-grid mt-5" role="list">
        {coreCategories.map((category) => {
          const title = t.categories[category.id].name;
          return (
            <li key={category.id} className={`category-card${category.route ? " category-available" : ""}`} data-category={category.id} data-status={category.status}>
              <div className="flex items-center gap-3">
                <span className="category-icon"><Icon name={category.icon} className="size-5" /></span>
                <h3 className="text-lg font-semibold">
                  {category.route ? (
                    <a className="category-link" href={category.route[locale]} aria-describedby={`category-${category.id}-status`}>
                      {title}<Icon name="arrow" className="size-4 shrink-0" />
                    </a>
                  ) : title}
                </h3>
              </div>
              {category.route ? (
                <p id={`category-${category.id}-status`} className="mt-3 text-sm leading-6 text-muted">{t.homeModuleStatus[category.id]}</p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted">{t.categoryStatus.planned}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

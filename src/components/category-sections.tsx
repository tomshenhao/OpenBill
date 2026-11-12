import { coreCategories, futureCategories } from "@/config/categories";
import { messages, type Locale } from "@/i18n";
import { Icon } from "./icon";

export function CoreCategorySection({ locale }: { locale: Locale }) {
  const t = messages[locale].product;
  return (
    <section id="categories" aria-labelledby="categories-heading" className="page-width section-spacing section-anchor categories-section">
      <p className="eyebrow">{t.coreEyebrow}</p>
      <h2 id="categories-heading" className="section-title mt-4">{t.coreTitle}</h2>
      <p className="mt-4 max-w-2xl leading-7 text-muted">{t.coreDescription}</p>
      <ul className="category-grid mt-9">
        {coreCategories.map((category) => {
          const copy = t.categories[category.id];
          return (
            <li key={category.id} className={`category-card${category.status === "available" ? " category-available" : ""}`} data-category={category.id} data-status={category.status}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="category-icon"><Icon name={category.icon} className="size-6" /></span>
                <span className={`status-label ${category.status === "available" ? "status-completed" : "status-planned"}`}>{t.categoryStatus[category.status]}</span>
              </div>
              <h3 className="mt-5 text-xl font-semibold">{copy.name}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{copy.description}</p>
              {category.route && (
                <div className="mt-auto pt-5">
                  <a href={category.route[locale]} className="text-action">{t.checkElectricity}<Icon name="arrow" className="size-4" /></a>
                  <p className="mt-2 text-xs leading-5 text-muted">{t.electricityLimit}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MoreWaysToSave({ locale }: { locale: Locale }) {
  const t = messages[locale].product;
  return (
    <section id="more-ways" aria-labelledby="more-ways-heading" className="page-width section-spacing section-anchor">
      <p className="eyebrow">{t.moreEyebrow}</p>
      <h2 id="more-ways-heading" className="section-title mt-4">{t.moreTitle}</h2>
      <p className="mt-4 max-w-2xl leading-7 text-muted">{t.moreDescription}</p>
      <details className="future-disclosure mt-7">
        <summary><span>{t.moreToggle}</span><Icon name="arrow" className="disclosure-arrow size-5 shrink-0" /></summary>
        <ul className="planned-category-grid">
          {futureCategories.map((category) => (
            <li key={category.id} data-category={category.id}>
              <Icon name={category.icon} className="mt-1 size-5 shrink-0 text-green" />
              <div>
                <h3 className="text-sm font-semibold">{t.categories[category.id].name}</h3>
                <p className="mt-1 text-xs font-medium text-muted">{t.categoryStatus[category.status]}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{t.categories[category.id].description}</p>
              </div>
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-6 max-w-3xl text-sm leading-7 text-muted">{t.alternativeGuidance}</p>
    </section>
  );
}

# Official electricity source research

Research completed **13 November 2026, New Zealand time**
(`2026-11-12T21:16:29.000Z` UTC). This is a source-availability assessment, not
independent tariff verification. No address, ICP, login or household bill was used.
No complete applicable numeric retail import tariff was obtained. Availability
can change; this is not a claim that public rate cards never exist.

| Retailer | Official source inspected | Finding and v0.2 decision |
| --- | --- | --- |
| Mercury | [Flex Rates](https://www.mercury.co.nz/electricity/flex-rates), [plan terms](https://www.mercury.co.nz/flex-rates-terms-and-conditions) | Public periods and smart-meter eligibility, but no complete numeric regional daily/import rate card in the inspected material. Manual adapter only; no prices imported. |
| Contact Energy | [Plans and pricing help](https://contact.co.nz/support/plans-and-pricing), [plans](https://contact.co.nz/personal/all-plans) | Public information explains region/meter-dependent rates and low/standard categories. No complete applicable nonpersonal rate card obtained; do not use personalised ICP URLs or quote inputs. |
| Genesis Energy | [Rate changes by property](https://www.genesisenergy.co.nz/help/faqs/will-my-rates-change-at-my-new-property), [electricity](https://www.genesisenergy.co.nz/for-home/products/electricity) | Official FAQ says region and meter affect rates. Product page had no readable pricing in the research tool. Record as not obtained, not as proof of universal unavailability. |
| Meridian Energy | [Home pricing](https://www.meridianenergy.co.nz/for-home/pricing-rates) | Public plan comparison directs readers to a quote flow. Solar export buy-back rates and promotional credits are not a complete household import tariff. |
| Electric Kiwi | [Prices](https://www.electrickiwi.co.nz/power/prices), [plans](https://www.electrickiwi.co.nz/power/plans) | Pricing page explicitly asks for an address. Plan marketing does not provide a complete applicable numeric rate card. No address was entered. |
| 2degrees | [Power](https://www.2degrees.nz/power) | Public page explains the broadband bundle and an address-based broadband signup. Discount marketing is not a complete tariff; no quote flow was used. |

Mercury's [website terms](https://www.mercury.co.nz/media/MCY00013%20-%20Terms-Website%20Terms%20Of%20Use-190623.pdf)
clause 3.4 prohibits scraping/mining and clause 3.1 restricts image reproduction.
Its [robots.txt](https://www.mercury.co.nz/robots.txt) allows access, which does not
override those terms. Automated collection is disabled. The manual adapter requires
a written permission reference before accepting a Mercury screenshot. No live
Mercury screenshot or tariff collection was performed by the implemented tools.

Electric Kiwi's [website terms](https://www.electrickiwi.co.nz/legal/website-terms-of-use/)
restrict public copying/redistribution. No content or screenshots from that site
were added to the repository. Terms and automation permission for other retailers
remain unreviewed; their collectors are disabled rather than implicitly allowed.

The initial, deliberately limited network registry uses the official
[Genesis outage directory](https://www.genesisenergy.co.nz/help/outages) to identify
Vector/Auckland and Orion/Canterbury. This is network reference metadata, not
pricing evidence or a claim that either network covers every property in a region.

`data/electricity/retailers.json` stores these availability findings and approved
source URLs. It contains no price, fake verification date or endorsement. Future
government/regulator datasets may be considered only if their actual applicability,
reuse terms and evidence are reviewed; no such tariff dataset is claimed here.

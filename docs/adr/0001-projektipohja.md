# 0001 – Projektipohja ja työkaluversiot

Päiväys: 18.10.2026  
Tila: hyväksytty; SDK-versio korvattu muistiolla [0005](0005-expo-sdk-57.md) (Expo SDK 57)  
Liittyy: toteutussuunnitelman vaihe 0, luvut 2.1, 3 ja 9

## Tausta

Vaiheessa 0 luotiin monorepo, Expo-sovellus, tietokantakerros ja tarkistusketju. Expon ajantasainen projektipohja poikkeaa osin suunnitelman oletuksista.

## Päätös

- **Node.js 22.13+ (kehityskoneella 24 LTS).** Expo SDK 58 ja React Native 0.88 eivät tue Node 20:tä. Juuren `package.json` määrittää `engines.node`.
- **Expo SDK 58**, Expo Router, React 19.3, TypeScript 6 `strict` + `noUncheckedIndexedAccess`.
- **Reitit ovat hakemistossa `app/src/app/`** eikä `app/app/`, koska SDK 58:n pohja ja Expo Routerin ohjeet käyttävät `src/app/`-juurta. Muu rakenne (`src/domain`, `src/db`, `src/services`, `src/integrations`, `src/ui`, `tests/`, `e2e/`) on suunnitelman mukainen.
- **Drizzle ORM 0.45 (vakaa) + drizzle-kit 0.31.** 1.0 on vielä beta. Migraatiot luodaan komennolla `npm run db:generate` hakemistoon `app/src/db/migrations/`. Sovellus ajaa ne käynnistyessä (`useMigrations`); `.sql`-tiedostot upotetaan bundleen `babel-plugin-inline-import`illa, ja Metro tuntee `.sql`-päätteen.
- **Tietokannan eheyssäännöt ovat myös SQLite-tasolla:** CHECK-rajoitteet (päivämäärämuoto, ei-negatiiviset energiat ja määrät, sallitut luettelo­arvot) ja vierasavaimet (`PRAGMA foreign_keys = ON`). `log_entry.fast_day_id` ei kaskadoi: paastopäivää, jolla on kirjauksia, ei voi poistaa ennen kuin palvelukerros on poistanut kirjaukset vahvistuksen jälkeen (PAI-06).
- **Testit:** Vitest 5 Node-ympäristössä. Tietokantatestit ajavat samat migraatiot better-sqlite3:een.
- **Lint:** ESLint 9 (`eslint-config-expo` flat + `eslint-config-prettier`). ESLint 10:tä ei vielä käytetä, koska `eslint-plugin-import` ei tue sitä. `src/domain/` on suojattu `no-restricted-imports`-säännöllä (ei Reactia, Expoa, Drizzlea eikä muita kerroksia).
- **Prettier** ei muotoile Markdown-tiedostoja, jotta suomenkieliset dokumentit eivät muutu tahattomasti.

## Seuraukset

- Kehittäjän on päivitettävä Node 22.13+ ennen kuin `npm install` ja `npx expo start` toimivat.
- Vaiheen 0 sovellus toimii Expo Go -sovelluksessa (SDK 58), koska se käyttää vain Expo Goon sisältyviä moduuleja (expo-sqlite, myöhemmin expo-camera). Development build tarvitaan, kun mukaan tulee natiivimoduuli, jota Expo Go ei sisällä.
- `npm audit` raportoi Expo-riippuvuuksien kautta tulevia haavoittuvuuksia kehitystyökaluissa. Niitä ei korjata `--force`-päivityksillä, koska se rikkoisi SDK-yhteensopivuuden; tilanne tarkistetaan SDK-päivitysten yhteydessä.

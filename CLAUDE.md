# Kevytpaasto – ohjeet Claudelle

5:2-paaston paastopäivien kalorikirjanpitosovellus puhelimelle. Ensisijainen käyttäjä on kehittäjä itse.

## Lähdedokumentit

- Vaatimukset: `5-2-paasto-vaatimusmaarittely.md`. Vaatimuksiin viitataan tunnuksilla (esim. KIR-08), hyväksymiskriteereihin numeroilla (luku 9).
- Tekninen suunnitelma ja vaiheet: `docs/toteutussuunnitelma.md`
- Päätösmuistiot: `docs/adr/`
- Hyväksymistestauksen seuranta: `docs/hyvaksymistestaus.md`

Lue toteutussuunnitelman asiaankuuluva osa ennen työn aloittamista. Jos tehtävä on ristiriidassa suunnitelman kanssa, kerro siitä ennen toteutusta äläkä muuta arkkitehtuuria hiljaa.

## Teknologiat

- Sovellus: React Native + Expo (managed), Expo Router, TypeScript `strict`
- Tietovarasto: SQLite (expo-sqlite) + Drizzle ORM, versioidut migraatiot
- Testit: Vitest (domain, tietokanta Node-ympäristössä better-sqlite3:lla), Maestro (käyttöpolut)
- Välityspalvelu OFF-julkaisuun: `proxy/` (serverless, TypeScript)
- Monorepo: npm workspaces (`app/`, `proxy/`, `scripts/`)

## Komennot

Vaatii Node.js 22.13+ (Expo SDK 57, ks. `docs/adr/0005-expo-sdk-57.md`). Riippuvuudet asennetaan juuressa: `npm install`.

Juuressa:

- `npm run check` – tyypit, lint, Prettier-tarkistus ja testit; ajetaan ennen kuin työ on valmis
- `npm run typecheck` – `tsc --noEmit` kaikissa työtiloissa
- `npm run lint` – ESLint (sis. `src/domain/`-kerroksen tuontirajoitukset)
- `npm run format` / `npm run format:check` – Prettier (ei muotoile Markdownia)
- `npm test` – Vitest kaikissa työtiloissa

Hakemistossa `app/`:

- `npx expo start` – kehityspalvelin; puhelimessa Expo Go (SDK 57) tai development build
- `npx expo install <paketti>` – Expo-riippuvuudet aina tällä, ei `npm install`
- `npm run db:generate` – uusi Drizzle-migraatio `src/db/schema.ts`:n muutoksista (`src/db/migrations/`)
- `npx vitest run tests/domain` – yksittäinen testihakemisto
- `npx expo-doctor` – riippuvuuksien ja konfiguraation tarkistus

Reitit ovat hakemistossa `app/src/app/` (Expo Router, ks. `docs/adr/0001-projektipohja.md`). Expo-kohtaiset ohjeet: `app/AGENTS.md`.

## Arkkitehtuurisäännöt

- `src/domain/` on puhdasta TypeScriptiä: ei Reactia, React Nativea, Expoa eikä tietokantaa. Kaikki laskenta ja validointi on täällä ja yksikkötestattu.
- UI kutsuu `src/services/`-kerrosta, ei kirjoita SQL:ää eikä kutsu ulkoisia rajapintoja suoraan.
- Tietokantaskeeman muutos tehdään aina uudella migraatiolla. Olemassa olevaa migraatiota ei muokata.

## Tietomallin invariantit (älä riko)

- **Kirjaus on tilannekuva** (KIR-08): `log_entry` tallentaa nimen, määrän, yksikön, energian ja perusteen kirjaushetken arvoina. `origin_id` on vain alkuperätieto; laskenta ei koskaan lue lähdetuotetta uudelleen.
- **Paastopäivän raja on tilannekuva** (KAY-03): `fast_day.limit_kcal` ei muutu, kun oletusraja muuttuu.
- **Päivämäärä on paikallinen `YYYY-MM-DD`-merkkijono** (PAI-05), ei aikaleima.
- **Puuttuva energia on `null`, ei 0** (HAK-04, LAS-04, LAS-07).
- **Energia tallennetaan kcal-arvona pyöristämättä**; pyöristys vain esitysvaiheessa (LAS-03). kJ → kcal: jaetaan luvulla 4,184.
- **g ja ml ovat eri perusteita**, eikä niitä muunneta toisikseen (LAS-02).
- **Pääavaimet ovat sovelluksessa luotuja UUID-tunnisteita**; kirjauksen UUID luodaan lomakkeen avautuessa (KIR-07).
- **Omat ruoat ja ateriat poistetaan pehmeästi** (`deleted_at`).

## Yksityisyys ja lähteet

- Päiväkirja, kaloriraja ja syödyt määrät eivät koskaan lähde laitteelta (OFF-04, TIE-02).
- OFF-julkaisuun menee vain käyttäjän hyväksymä `publish_job.payload_json`. Fineli- tai muusta lähteestä kopioitua tietoa ei esitäytetä julkaistavaksi (OFF-10).
- OFF-tunnukset ovat vain välityspalvelun salaisuuksissa, eivät koskaan sovelluskoodissa tai repossa.
- Kehityksessä ja testeissä OFF-kirjoitukset tehdään vain OFF:n testiympäristöön, ei tuotantoon.
- OFF-pyynnöissä lähetetään `User-Agent`-otsake sovelluksen nimellä ja versiolla.

## Ansainta

- `entitlements.has()` palauttaa v1:ssä aina `false`. P1-toimintoja ei koskaan kytketä käyttöoikeustarkistukseen (ANS-01, ANS-02).

## Käyttöliittymä

- Kaikki käyttäjälle näkyvä teksti on suomeksi ja kootaan tiedostoon `src/ui/strings.fi.ts`.
- Saavutettavuus: toiminnoilla on `accessibilityLabel`, ylitys tai virhe ei ilmene pelkästä väristä, ja asettelu kestää tekstin suurennuksen (LAA-06).
- Sävy on neutraali: ei syyllistäviä viestejä (LAA-08).
- Määräkentät hyväksyvät desimaalipilkun (LAS-05).

## Työtapa

- Yksi sessio vastaa yleensä yhtä toteutussuunnitelman vaiheen osaa. Mainitse toteutetut vaatimustunnukset commit-viestissä ja testien nimissä.
- Hyväksymiskriteereistä tehdään testit aina kun mahdollista. Päivitä `docs/hyvaksymistestaus.md`, kun kriteeri todennetaan.
- Työ on valmis, kun `npm run check` menee läpi. Kerro erikseen, mitä pitää kokeilla puhelimella (kamera, lentotila, tekstin suurennus), koska sitä ei voi todentaa tältä koneelta.
- Kun tekninen päätös muuttuu, kirjoita lyhyt päätösmuistio hakemistoon `docs/adr/` ja päivitä toteutussuunnitelma.
- Koodin tunnisteet, tiedostonimet ja koodikommentit ovat englanniksi. Dokumentaatio ja käyttöliittymätekstit ovat suomeksi.

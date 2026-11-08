# Kevytpaasto – ohjeet Claudelle

5:2-paaston paastopäivien kalorikirjanpitosovellus puhelimelle. Ensisijainen käyttäjä on kehittäjä itse.

## Lähdedokumentit

- Vaatimukset: `5-2-paasto-vaatimusmaarittely.md`. Vaatimuksiin viitataan tunnuksilla (esim. KIR-08), hyväksymiskriteereihin numeroilla (luku 9).
- Tekninen suunnitelma ja vaiheet: `docs/toteutussuunnitelma.md`
- Päätösmuistiot: `docs/adr/`
- Tulevaisuuden ideat: `docs/ideat.md`
- Hyväksymistestauksen seuranta: `docs/hyvaksymistestaus.md`

Lue toteutussuunnitelman asiaankuuluva osa ennen työn aloittamista. Jos tehtävä on ristiriidassa suunnitelman kanssa, kerro siitä ennen toteutusta äläkä muuta arkkitehtuuria hiljaa.

## Teknologiat

- Sovellus: React Native + Expo (managed), Expo Router, TypeScript `strict`
- Tietovarasto: SQLite (expo-sqlite) + Drizzle ORM, versioidut migraatiot
- Testit: Vitest (domain, tietokanta Node-ympäristössä better-sqlite3:lla), Maestro (käyttöpolut)
- Välityspalvelu OFF-julkaisuun: `proxy/` (serverless, TypeScript)
- Monorepo: npm workspaces (`app/`, `proxy/`, `scripts/`)

## Komennot

Vaatii Node.js 22.13+ (Expo SDK 58, ks. `docs/adr/0008-expo-sdk-58.md`). Riippuvuudet asennetaan juuressa: `npm install`.

Juuressa:

- `npm run check` – tyypit, lint, Prettier-tarkistus ja testit; ajetaan ennen kuin työ on valmis
- `npm run typecheck` – `tsc --noEmit` kaikissa työtiloissa
- `npm run lint` – ESLint (sis. `src/domain/`-kerroksen tuontirajoitukset)
- `npm run format` / `npm run format:check` – Prettier (ei muotoile Markdownia)
- `npm test` – Vitest kaikissa työtiloissa
- `npm run emulator` – käynnistää Android-emulaattorin ja odottaa käynnistymistä (ks. `docs/adr/0007-emulaattoritestaus.md`)
- `npm run e2e [-- <flow>]` – Maestro-testit (`app/e2e/`) emulaattorissa; Metron on oltava käynnissä
- `npm run device -- screenshot [nimi]` – kuvakaappaus tiedostoon `app/e2e/output/`; myös `font <koko|reset>`, `offline`, `online` ja `open`
- `npm run secrets` – gitleaks koko Git-historiaan; pre-push-koukku ajaa saman tarkistuksen pushattaville commiteille (ks. `docs/adr/0014-repo-julkiseksi-ennen-vaihetta-4.md`)

Hakemistossa `app/`:

- `npx expo start` – kehityspalvelin; puhelimessa Expo Go (SDK 58) tai development build
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
- **OFF-osoite:** kaikki OFF-kutsut, myös haut, kokeilut ja tarkistukset, tehdään vain testiympäristön osoitteeseen `https://world.openfoodfacts.net`. Muutos mihinkään muuhun Open Food Factsin palvelun osoitteeseen (esim. tuotanto `world.openfoodfacts.org` tai Search-a-licious) vaatii kehittäjän nimenomaisen päätöksen. Älä tee muutosta omalla päätökselläsi, vaikka vaihe, testi tai OFF:n ohje näyttäisi edellyttävän sitä, vaan kysy ensin (`docs/adr/0011-off-testiymparisto-ennen-julkaisua.md`). Kehityksessä saa käyttää myös kehitteillä olevaa backendiä varten tehtyä paikallista kopiota OFF:n datasta.
- OFF-pyynnöissä lähetetään `User-Agent`-otsake sovelluksen nimellä ja versiolla.

## Avoin lähdekoodi

- Projekti on avointa lähdekoodia, lisenssi GPL-3.0-or-later (`docs/adr/0006-avoin-lahdekoodi.md`). Repo avataan julkiseksi jo ennen vaihetta 4 (`docs/adr/0014-repo-julkiseksi-ennen-vaihetta-4.md`), joten kaikki pushattu on julkista: älä tallenna siihen tunnuksia, avaimia tai henkilökohtaisia yhteystietoja (AVO-03).
- Ulkopuolisia pull requesteja ei toistaiseksi oteta vastaan; virheilmoitukset ja ideat tulevat issueina (`CONTRIBUTING.md`). Haavoittuvuusilmoitukset käsitellään yksityisesti (`SECURITY.md`).
- Ei maksullisia ominaisuuksia, ostopolkuja, mainontaa eikä analytiikkaa tai muuta laitteelta tietoja lähettävää seurantaa (ANS-01, ANS-02, AVO-02).
- Uuden riippuvuuden lisenssin on oltava GPL-3.0:n kanssa yhteensopiva. Suosi avointa vaihtoehtoa, kun se on riittävän hyvä (AVO-04).

## Käyttöliittymä

- Kaikki käyttäjälle näkyvä teksti on suomeksi ja kootaan tiedostoon `src/ui/strings.fi.ts`.
- Käyttäjälle näkyvässä tekstissä, myös `accessibilityLabel`-teksteissä, kirjoitetaan aina ”Open Food Facts”, ei OFF (TIE-03). Lyhennettä OFF käytetään koodissa, dokumentaatiossa, vaatimustunnuksissa ja keskustelussa kehittäjän kanssa.
- Saavutettavuus: toiminnoilla on `accessibilityLabel`, ylitys tai virhe ei ilmene pelkästä väristä, ja asettelu kestää tekstin suurennuksen (LAA-06). Painettavien kohteiden kosketusalue on vähintään 48 × 48 dp; pelkkää tekstiä ei käytetä painikkeena tai linkkinä ilman riittävää aluetta (vaiheen 0 havainto: tekstilinkkiin oli vaikea osua).
- Sävy on neutraali: ei syyllistäviä viestejä (LAA-08).
- Määräkentät hyväksyvät desimaalipilkun (LAS-05).

## Työtapa

- Yksi sessio vastaa yleensä yhtä toteutussuunnitelman vaiheen osaa. Mainitse toteutetut vaatimustunnukset commit-viestissä ja testien nimissä.
- Commitit tehdään suoraan `main`-haaraan, ei erillisiin haaroihin.
- Commitit tehdään kysymättä erikseen lupaa, kun työ on valmis: `npm run check` menee läpi, ja käyttöliittymämuutokset on todennettu emulaattorissa. Keskeneräistä työtä ei commitoida.
- Yksi commit kattaa yhden kokonaisuuden. Commitiin otetaan vain tehtävän tiedostot nimeltä, ei `git add .`. Jos työhakemistossa on muita muutoksia, niistä kerrotaan kehittäjälle.
- Valmis commit pushataan `main`-haaraan kysymättä, myös kun repo on julkinen (päätösmuistio 0014). Ennen pushausta tarkistetaan, ettei muutoksissa ole tunnuksia, avaimia tai henkilökohtaisia yhteystietoja. Pre-push-koukku `.githooks/pre-push` ajaa gitleaksin pushattaville commiteille; koukku otetaan käyttöön kerran kloonia kohden komennolla `git config core.hooksPath .githooks`. Jos koukku pysäyttää pushauksen, kerro löydöksestä kehittäjälle: koukkua ei ohiteta (`--no-verify`), eikä löydöstä merkitä sallituksi ilman lupaa. Jos tunnus on jo pushattu, kerro heti, että tunnus on mitätöitävä ja vaihdettava; historian siivous ei riitä.
- Force push vaatii aina kehittäjän erillisen luvan, eikä historiaa muuteta ilman lupaa (`amend`, `rebase`, `reset`). Pushauslupa ei koske tuotantoon vaikuttavia toimia, kuten välityspalvelun deployta.
- Hyväksymiskriteereistä tehdään testit aina kun mahdollista. Päivitä `docs/hyvaksymistestaus.md`, kun kriteeri todennetaan.
- Työ on valmis, kun `npm run check` menee läpi. Jos muutos koskee käyttöliittymää, todenna se myös itse emulaattorissa: käynnistä emulaattori ja Metro taustalle (`npm run emulator`, `npx expo start` hakemistossa `app/`), aja `npm run e2e`, katso kuvakaappaukset ja tarkista tekstin suurennus (`font 1.3` ja `font 2.0`) sekä lentotila (`offline`). Kehittäjää ei pyydetä kokeilemaan sitä, minkä voit todentaa emulaattorissa.
- Puhelimella kokeiltavaksi jää vain kameralla luettava viivakoodi, tuntuma ja nopeus sekä TalkBack. Kerro ne erikseen vaiheen lopussa.
- Uudet käyttöpolut tehdään Maestro-testeiksi hakemistoon `app/e2e/` (tiedostonimet englanniksi, vaatimustunnukset kommenttiin).
- Kun tekninen päätös muuttuu, kirjoita lyhyt päätösmuistio hakemistoon `docs/adr/` ja päivitä toteutussuunnitelma.
- Koodin tunnisteet, tiedostonimet ja koodikommentit ovat englanniksi. Dokumentaatio ja käyttöliittymätekstit ovat suomeksi.

# 5:2-paastosovellus – toteutussuunnitelma

Versio: 1.9  
Päiväys: 8.11.2026  
Tila: luonnos  
Perustuu: [vaatimusmäärittely 0.3](../5-2-paasto-vaatimusmaarittely.md)

Tämä dokumentti tekee vaatimusmäärittelyn kohdassa 10 avoimiksi jätetyt tekniset päätökset ja jakaa toteutuksen vaiheisiin. Vaatimuksiin viitataan niiden tunnuksilla (esim. KIR-08). Merkintä **[tarkistettava]** tarkoittaa oletusta, joka varmistetaan ennen kyseisen osan toteutusta. Vaiheiden 0–7 ulkopuoliset tulevaisuuden ideat ovat dokumentissa [ideat.md](ideat.md).

## 1. Päätösten yhteenveto

| Aihe | Päätös | Vaatimukset |
| --- | --- | --- |
| Sovellustyyppi | Natiivisovellus: React Native + Expo (managed workflow), TypeScript | HAK-01, KIR-06 |
| Ensimmäinen alusta | Android. iOS myöhemmin samasta koodikannasta EAS Buildilla. | – |
| Jakelu kehitysvaiheessa | Expo development build omaan puhelimeen; myöhemmin Google Play (sisäinen testaus → tuotanto) | – |
| Paikallinen tietovarasto | SQLite (expo-sqlite) + Drizzle ORM, versioidut migraatiot | KIR-06, LAA-04 |
| Fineli | Avoin aineisto muunnetaan rakennusvaiheessa SQLite-tietokannaksi, joka toimitetaan sovelluksen mukana | HAK-02, LAA-04 |
| Open Food Facts -haku | Suorat kutsut OFF:n API:in sovelluksesta, paikallinen välimuisti | HAK-01, HAK-03 |
| OFF-julkaisu | Paikallinen lähetysjono → kevyt välityspalvelu (serverless), joka käyttää sovelluksen OFF-tunnuksia | OFF-01…OFF-10 |
| OFF-osoite | Kaikki OFF-kutsut vain testiympäristön osoitteeseen `https://world.openfoodfacts.net`. Muun OFF-palvelun osoitteen käyttö, myös tuotantoon siirtyminen, vaatii kehittäjän nimenomaisen päätöksen | HAK-01, OFF-01…OFF-10, kriteeri 5 |
| Käyttäjätilit | Ei käyttäjätilejä eikä pilvisynkronointia v1:ssä | KAY-02, TIE-02 |
| Vienti ja palautus | JSON-tiedosto, skeemaversio, UUID-pohjainen yhdistäminen | HIS-03, kriteeri 11 |
| Lisenssi ja ansainta | Avoin lähdekoodi, GPL-3.0-or-later koko monorepolle. Ei maksullisia ominaisuuksia, mainontaa eikä analytiikkaa; ei käyttöoikeusrajapintaa (docs/adr/0006). | ANS-01, ANS-02, AVO-01…AVO-04 |
| Testaus | Vitest ydinlogiikalle ja tietokantakerrokselle, Maestro keskeisille käyttöpoluille | Luku 9 |

### 1.1 Hylätyt vaihtoehdot

- **PWA / selainsovellus:** nopein aloittaa, mutta iOS voi tyhjentää selaimen tallennustilan (riski KIR-06:lle ja LAA-04:lle), ja viivakoodin luku vaihtelee selaimittain.
- **Flutter:** teknisesti yhtä hyvä. TypeScript valittiin, jotta sovellus, välityspalvelu ja aineistoskriptit jakavat kielen ja tyypit.
- **Pilvitietokanta (esim. Firebase, Supabase):** tarpeeton ilman tilejä ja synkronointia, ja toisi henkilötietojen käsittelyn palvelimelle.

## 2. Arkkitehtuuri

```
┌──────────────────────── Puhelin (Expo-sovellus) ────────────────────────┐
│                                                                          │
│  UI (Expo Router -näkymät, komponentit)                                  │
│        │                                                                 │
│  Sovelluspalvelut (use-caset: kirjaa, siirrä, kopioi, vie, palauta…)     │
│        │                    │                        │                   │
│  Domain (puhdas TS:        Tietokantakerros        Integraatiot          │
│  laskenta, validointi,     (Drizzle + SQLite)      - OFF-haku            │
│  tilakoneet)               - käyttäjän tiedot       - Fineli (paikallinen)│
│                            - fineli.db (vain luku)  - Julkaisujono        │
└──────────────────────────────────────────────────────────┬───────────────┘
                                                           │ HTTPS
                     ┌─────────────────────────────────────┴─────┐
                     │ Välityspalvelu (serverless)               │
                     │ - OFF-tuotteen tarkistus + kirjoitus      │
                     │ - kuvien lähetys                          │
                     │ - nopeusrajoitus, ei henkilötietoja       │
                     └─────────────────────┬─────────────────────┘
                                           │
                              Open Food Facts (API)
```

**Riippuvuussääntö:** `domain` ei tuo mitään muista kerroksista eikä React Nativesta. Tietokantakerros ja integraatiot tuovat vain domainin. UI kutsuu sovelluspalveluja eikä kirjoita SQL:ää suoraan.

### 2.1 Hakemistorakenne

```
app/                    Expo-sovellus
  src/
    app/                Expo Router -reitit (näkymät), ks. docs/adr/0001
    domain/             puhdas logiikka: energia, yksiköt, validointi, tilakoneet
    db/                 Drizzle-skeema, migraatiot, repositoriot
    services/           use-caset (kirjaus, suosikit, historia, vienti/palautus)
    integrations/
      off/              OFF-haku ja julkaisujonon asiakas
      fineli/           paikallisen Fineli-tietokannan haku
    ui/                 jaetut komponentit, teema, tekstit (fi)
  assets/fineli.db      rakennusvaiheessa tuotettu aineisto
  tests/                Vitest-testit (domain, db, services)
  e2e/                  Maestro-testit
proxy/                  välityspalvelu (OFF-julkaisu)
scripts/fineli/         Finelin avoimen aineiston muunnos SQLiteksi
docs/                   suunnitelmat ja päätösmuistiot (docs/adr/)
LICENSE                 GPL-3.0-lisenssin teksti
README.md               kuvaus, kääntöohje, lisenssi ja tietolähteet
```

Repositorio on yksi monorepo (npm workspaces). Jaettu tyyppimäärittely OFF-julkaisupyynnölle on `proxy`n ja `app`in yhteinen.

## 3. Tietomalli

Kaikki pääavaimet ovat sovelluksessa luotuja UUID-tunnisteita (KIR-07, HIS-03). Energia tallennetaan aina kcal-arvona liukulukuna pyöristämättä (LAS-01, LAS-03). Aikaleimat tallennetaan UTC ISO 8601 -muodossa, mutta **paastopäivän päivämäärä on paikallinen kalenteripäivä merkkijonona `YYYY-MM-DD`** (PAI-05).

### 3.1 Taulut

**settings** – yksi rivi
- `default_limit_kcal` – uusien paastopäivien oletusraja (KAY-01, KAY-03)
- `onboarding_done`, `schema_version`

**fast_day**
- `id`, `date` (UNIQUE, `YYYY-MM-DD`), `limit_kcal` (tilannekuva päivän luontihetkellä; muokattavissa erikseen, KAY-03, HIS-01), `created_at`
- Paastopäivämerkinnän poisto poistaa myös kirjaukset vain erillisen vahvistuksen jälkeen (PAI-06).

**food** – omat ja välimuistiin tallennetut tuotteet ja ruoat
- `id`, `source` (`user` | `off` | `fineli`), `source_ref` (OFF-viivakoodi tai Fineli-ID), `barcode`
- `name`, `brand`
- `energy_kcal` (nullable – puuttuva ≠ 0, HAK-04), `energy_basis` (`per_100g` | `per_100ml` | `per_serving`)
- `serving_amount`, `serving_unit` (`g` | `ml`), `serving_label` (esim. ”purkki, 200 g”, OMA-02)
- `preparation_state` (raaka/kypsä/valmistettu/valmistamaton, nullable, LAS-06)
- `is_favorite`, `deleted_at` (pehmeä poisto, jotta viittaukset säilyvät, OMA-06)
- `user_override_json` – käyttäjän oma korjaus lähdetietoon (HAK-08); julkinen lähdetieto ei muutu
- `fetched_at` – milloin ulkoinen tieto haettiin välimuistiin

**meal** ja **meal_item** – suosikkiateriat (OMA-04, OMA-05)
- `meal`: `id`, `name`, `is_favorite`, `deleted_at`
- `meal_item`: `id`, `meal_id`, `food_id`, `amount`, `unit`
- Aterian energia lasketaan aina osista; sitä ei tallenneta erikseen.

**log_entry** – kirjaus on **tilannekuva** (KIR-08)
- `id`, `fast_day_id`, `created_at`, `updated_at`
- `name` (vapaaehtoinen pikakirjauksessa, KIR-02)
- `amount`, `unit` (`g` | `ml` | `serving` | `kcal`)
- `energy_kcal_per_basis`, `energy_basis` – kirjaushetken arvot
- `serving_amount`, `serving_unit`, `serving_label` – annoksen koko ja nimi kirjaushetkellä, jotta annoksena kirjattu rivi voidaan selittää ja laskea uudelleen ilman lähdetuotetta (migraatio 0001)
- `kcal` – laskettu, pyöristämätön energia
- `origin_type` (`quick` | `food` | `meal`), `origin_id` (vain alkuperätieto, ei laskennan lähde)
- `meal_fraction` – osuus suosikkiateriasta (OMA-05)
- `includes_off_data` – kirjaushetkellä asetettu tieto, onko kirjauksen nimi tai energia peräisin Open Food Factsista; aterian kirjauksessa tosi, jos jokin osa on OFF-tuote. Käytetään vain lähdemaininnan näyttämiseen (TIE-03, vaihe 4, docs/adr/0012).

Aterian kirjaus tallennetaan yhtenä rivinä, jonka energia on laskettu osista kirjaushetkellä: `energy_kcal_per_basis` on koko aterian energia, `energy_basis = per_serving`, `unit = serving` ja `amount = meal_fraction`. Kopiointi toiseen päivään (HIS-02) luo uuden rivin uudella UUID:llä.

**publish_job** – OFF-julkaisujono (OFF-07, OFF-08)
- `id` (toimii myös idempotenssiavaimena välityspalvelulle), `food_id`, `barcode`
- `state`: `draft` → `awaiting_consent` → `queued` → `sending` → `published` | `failed` | `exists_already`
- `payload_json` – käyttäjän tarkistamat ja hyväksymät julkaistavat kentät
- `image_paths_json`, `attempts`, `last_error`, `consented_at`, `updated_at`
- `next_attempt_at` – seuraavan automaattisen lähetysyrityksen aikaisin ajankohta (kohta 6.4); lisätään vaiheen 6 migraatiolla

### 3.2 Fineli-tietokanta

Erillinen, vain luettava `fineli.db`, joka liitetään yhteyteen (`ATTACH`). Sisältää ruoan tunnisteen, suomenkielisen nimen, energian (kcal/100 g, muunnettuna kJ-arvosta tarvittaessa), valmistustavan sekä FTS5-hakuindeksin. Kun Fineli-tuote kirjataan, sen tiedot kopioidaan `food`-tauluun (`source = fineli`), jolloin myöhemmät aineistopäivitykset eivät vaikuta vanhoihin kirjauksiin.

Tiedosto on hakemistossa `app/assets/fineli/` ja kulkee sovelluksen mukana assetina. Käynnistyksessä se kopioidaan SQLite-hakemistoon ja liitetään nimellä `fineli`. Kopio korvataan, kun `fineli.json`:n muunnosaika muuttuu. Ruokamitat (esim. keskikokoinen annos, dl) tarjotaan annoksina grammamäärineen, ja kirjaus tallentaa valitun mitan tilannekuvana (päätösmuistio 0010).

## 4. Domain-logiikka

Puhtaina funktioina `src/domain/`-hakemistossa, kattavasti yksikkötestattuina:

- `kjToKcal(kj)` = kj / 4,184 (LAS-01)
- `computeKcal({ amount, unit, energyKcal, basis, serving })` – erottaa per 100 g, per 100 ml ja per annos. Grammoja ja millilitroja ei muunneta toisikseen (LAS-02). Palauttaa virheen, jos energia puuttuu (HAK-04, LAS-07).
- `parseAmount(text)` – hyväksyy desimaalipilkun ja -pisteen, hylkää negatiivisen ja tyhjän arvon (LAS-04, LAS-05)
- `daySummary(entries, limit)` – summa pyöristämättömistä arvoista, jäljellä tai ylitys (PAI-02, PAI-03, LAS-03)
- `formatKcal(value)` – pyöristys vain esitystä varten
- `mealKcal(items, fraction)` – suosikkiaterian energia (OMA-04, OMA-05)
- `publishJobTransition(state, event)` – julkaisujonon tilakone (OFF-07)
- `validatePublishPayload(payload)` – julkaisun vähimmäistiedot (OFF-02, OFF-05)
- `publishRetryDelay(attempts, random)` ja `classifyPublishError(response)` – kirjoitusten uusinnan viive ja virheen luokittelu uusittavaksi tai pysyväksi (kohta 6.4)
- `normalizeBarcode(raw, type)` – viivakoodin normalisointi OFF:n säännöllä (kohta 5.1, HAK-07)

## 5. Ulkoiset tietolähteet

### 5.1 Open Food Facts – haku

- Osoite: kaikki OFF-kutsut, myös haut, kokeilut ja tarkistukset, tehdään testiympäristön osoitteeseen `https://world.openfoodfacts.net`. Muutos mihinkään muuhun OFF-palvelun osoitteeseen, kuten tuotantoon (`https://world.openfoodfacts.org`) tai Search-a-licious-palveluun, vaatii kehittäjän nimenomaisen päätöksen. Vaiheen eteneminen, testitulos tai OFF:n ohje ei yksin riitä. Kehityksessä saa käyttää myös kehitteillä olevaa backendiä varten tehtyä paikallista kopiota OFF:n datasta (docs/adr/0011).
- Pyynnöissä lähetetään OFF:n ohjeen mukainen HTTP Basic -otsake (`off`/`off`, julkinen arvo, ei salaisuus). Osoite tulee käännösaikaisesta konfiguraatiosta, jonka oletus on `https://world.openfoodfacts.net`, ja testi varmistaa oletuksen sekä sen, ettei koodissa ole muita OFF-kutsujen osoitteita.
- Viivakoodihaku: tuotteen haku viivakoodilla API v3:lla (v2 on vanhentunut), pyydetään vain tarvittavat kentät (`fields=`). Lukuraja on 15 tuotehakua/min IP-osoitetta kohden (docs/adr/0004).
- API v3:n alaversio kiinnitetään osoitteeseen (esim. `/api/v3.4/product/<code>`), koska vastauksen rakenne riippuu pyydetystä alaversiosta. v3.5 muutti ravintoarvojen rakenteen, ja OFF:n muutoslokin mukaan se on vielä kehitteillä. Alaversio valitaan vaiheen 4 alussa testiympäristön vastausten perusteella ja kirjataan päätösmuistioon. Ehdokas on v3.4 **[tarkistettava]**. Vastauksen luku sietää uudet kentät, eikä dokumentoimattomiin kenttiin nojata. Alaversio nostetaan vain OFF:n muutoslokin perusteella. Automaattitestit käyttävät testiympäristöstä tallennettuja esimerkkivastauksia, myös nimihaun `/cgi/search.pl`-pisteestä, joka ei kuulu v3:een (docs/adr/0013).
- Viivakoodin normalisointi: OFF normalisoi koodin luku- ja kirjoituspyynnöissä. Etunollien poiston jälkeen enintään 7-numeroinen koodi täydennetään 8-numeroiseksi ja 9–12-numeroinen 13-numeroiseksi, eikä UPC-E-koodia laajenneta UPC-A:ksi. Sovellus käyttää OFF-kutsuissa ja `food.barcode`-avaimena samaa sääntöä, jotta tuote saa saman tunnisteen kuin OFF:ssa (HAK-07). UPC-E:n tarkistusnumero tarkistetaan laajennetusta muodosta, mutta tunnisteeksi jää 8-numeroinen koodi. Vaiheen 0 kokeilusta peräisin oleva `normalizeBarcode` laajentaa UPC-E:n 13-numeroiseksi, ja se muutetaan vaiheessa 4. OFF:n vastauksen `code` tallennetaan `source_ref`-kenttään (docs/adr/0013).
- Nimihaku: OFF:n hakurajapinta, suodatus maahan Suomi ensisijaisesti. Hakurajapinnan raja on 10 hakua/min IP-osoitetta kohden, eikä OFF salli sen käyttöä näppäilyn mukana päivittyvään hakuun (tarkistettu 18.10.2026, docs/adr/0004). Siksi omat ja Fineli-tulokset näytetään heti paikallisesti, ja OFF-haku lähetetään vain käyttäjän erillisellä toiminnolla (esim. ”Hae myös Open Food Factsista” tai näppäimistön hakupainike). Kirjoittaminen tai viive ei käynnistä OFF-hakua (docs/adr/0013). Vaiheessa 4 nimihaku tehdään hakupisteellä `/cgi/search.pl` osoitteessa `https://world.openfoodfacts.net`, koska v2-palvelinrajapinnassa ei ole tekstihakua. OFF merkitsee pisteen vanhaksi (legacy), joten sen poistuminen on riski (luku 12). Search-a-licious (`search.openfoodfacts.org`, `search.openfoodfacts.net`) on eri osoitteessa, joten sen käyttöönotto vaatii kehittäjän nimenomaisen päätöksen.
- Jokainen pyyntö lähettää `User-Agent`-otsakkeen muodossa `Kevytpaasto/<versio> (<yhteystieto>)` OFF:n ohjeiden mukaisesti. OFF:n ohje pyytää yhteystiedoksi sähköpostiosoitetta, ja OpenAPI v3 -kuvaus hyväksyy myös URL-osoitteen. Yhteystieto tulee käännösaikaisesta konfiguraatiosta (luku 10), ja sen julkinen oletusarvo päätetään vaiheessa 4 **[tarkistettava]**. Henkilökohtaisen sähköpostin sijaan yhteystiedoksi käy julkisen repon osoite (docs/adr/0014).
- Lähdemaininta (TIE-03): OFF:n suosituksen mukainen teksti `(c) Open Food Facts contributors` ja linkki osoitteeseen `https://world.openfoodfacts.org/terms-of-use` näytetään jokaisessa näkymässä, jossa näkyy OFF:sta peräisin olevia tietoja: hakutulokset, viivakoodihaun tulos, Määrä-näkymä OFF-tuotteelle (myös välimuistista ja käyttäjän korjaamana, HAK-08) sekä julkaisun `exists_already`-näkymä. Tänään-näkymässä ja historiasta avatussa päivässä kirjauslistan alla kerrotaan, että kirjausten nimi ja energia voivat olla peräisin Open Food Factsista, ja näytetään sama linkki, kun päivän kirjauksissa on OFF-tuotteesta tehty kirjaus, myös aterian osana. Tieto tallennetaan kirjaukseen kirjaushetkellä sarakkeeseen `includes_off_data`, jotta se pysyy oikeana, vaikka ateriaa myöhemmin muokattaisiin; se ei vaikuta laskentaan (KIR-08, docs/adr/0012). Tietolähteet-näkymässä on sama teksti ja linkki, lisenssit (ODbL, Database Contents License, kuvat CC BY-SA) sekä OFF:n vastuuvapauslauseke: tiedot ovat vapaaehtoisten lisäämiä, eikä niiden oikeellisuutta, täydellisyyttä tai luotettavuutta taata. Lauseke on neutraali kuten Finelin vastaava (LAA-08, docs/adr/0013). Linkin kosketusalue on vähintään 48 × 48 dp. Linkki osoittaa OFF:n tuotantosivustolle, mutta se ei ole OFF-kutsu, joten testiympäristösääntö ei koske sitä (docs/adr/0011).
- Haetut tuotteet tallennetaan `food`-tauluun välimuistiksi, jolloin ne toimivat jatkossa ilman verkkoa (LAA-04).
- Välimuisti ennen verkkoa: viivakoodihaku etsii tuotetta ensin `food`-taulusta. Jos tuote löytyy ja sen `fetched_at` on riittävän tuore, OFF:ltä ei kysytä uudelleen. Vanhentunut tuote näytetään heti välimuistista, ja tieto päivitetään taustalla, jos verkkoa on. Tuoreusraja päätetään vaiheessa 4.
- Kameran toistuvat lukemat: kamera voi lukea saman viivakoodin monta kertaa sekunnissa. Sama koodi lähettää pyynnön vain kerran, ja lukeminen keskeytetään, kunnes tulos on näytetty tai käyttäjä palaa lukunäkymään.
- Sovelluksen oma rajoitin: OFF-asiakas (`integrations/off/`, kohta 2.1) laskee OFF-pyynnöt liukuvassa minuutin ikkunassa erikseen tuote- ja hakupyynnöille ja jättää pelivaraa OFF:n rajoihin (esim. 12 tuotehakua ja 8 hakua minuutissa). Kun raja täyttyy, uutta pyyntöä ei lähetetä. Hakupainike on silloin hetken pois käytöstä, ja syy kerrotaan tekstinä. Uusi nimihaku peruu edellisen keskeneräisen pyynnön (`AbortController`). Rajoittimen laskenta on puhdas funktio aikaleimoista `src/domain/`-kerroksessa, ja se yksikkötestataan.
- Rajan ylitys ja palvelun ruuhka: kun OFF vastaa HTTP 429 tai 503 tai yhteys ei onnistu, automaattisia uusintayrityksiä ei tehdä. Paikalliset tulokset pysyvät näkyvissä, ja käyttäjälle näytetään neutraali viesti, esimerkiksi ”Open Food Facts -haku ei juuri nyt onnistu. Yritä hetken kuluttua uudelleen.” (LAA-08). Jos vastauksessa on `Retry-After`-otsake, rajoitin pitää OFF-pyynnöt tauolla ilmoitetun ajan. Julkaisujono sen sijaan uusii kirjoituspyynnöt automaattisesti (kohta 6.4). Ero on tarkoituksellinen: haku on vuorovaikutteinen, ja käyttäjä voi yrittää heti uudelleen.
- Hakutuloksessa näytetään nimi, merkki, energia perusteineen ja lähde (HAK-03). Puuttuva energia merkitään selvästi (HAK-04).

### 5.2 Fineli

- Lähde: THL:n ylläpitämän Finelin avoin data, lisenssi CC BY 4.0. Käytössä on Release 20.0 (2019). Lähteeksi mainitaan THL:n suosittelema viite: ”Terveyden ja hyvinvoinnin laitos (THL), Kansanterveyden edistäminen -yksikkö. Fineli. Elintarvikkeiden koostumustietokanta. Versio 20. Helsinki 2019.” Palvelua ei saa esittää THL:n tuottamana tai suosittelemana (docs/adr/0003, docs/adr/0010).
- Kehittäjä lataa peruspaketin (zip, puolipisteellä erotetut CSV-tiedostot) selaimella, ja `scripts/fineli/` muuntaa sen `fineli.db`:ksi ja tallentaa aineiston version. Energia on ravintotekijä `ENERC` (kJ/100 g syötävää osaa), joka muunnetaan kcal-arvoksi `kjToKcal`-funktiolla. Skripti ajetaan käsin, kun Fineli julkaisee uuden version; tulos päivittyy käyttäjille sovelluspäivityksen mukana.
- Lisenssimaininta näytetään sovelluksen Tietolähteet-näkymässä (Asetukset → Tietolähteet ja lisenssit) ja lyhyenä Fineli-hakutulosten alla (TIE-03).
- Haku on paikallinen eikä tarvitse verkkoa. Sanoja verrataan sanan alkuun FTS5-prefiksihaulla, ja vähintään kolmen merkin sanat löytyvät myös yhdyssanan keskeltä. Ensin näytetään nimet, joiden ensimmäinen sana on hakusana, ja raaka-aineet ennen koostettuja ruokia (docs/adr/0010).

### 5.3 Kesko

Ei käytetä v1:ssä (HAK-09). Selvitys tehdään erillisenä tehtävänä; arkkitehtuuri sallii uuden `integrations/`-lähteen lisäämisen.

## 6. OFF-julkaisu

### 6.1 Kulku

1. Käyttäjä lukee viivakoodin. Tuotetta ei löydy → siirrytään lisäyslomakkeeseen, viivakoodi säilyy (HAK-06).
2. Tuote tallennetaan heti omaksi tuotteeksi ja on kirjattavissa (OFF-06).
3. Käyttäjälle tarjotaan julkaisua. Näkymä kertoo, mitkä kentät ja kuvat julkaistaan avoimesti, ja käyttäjä tarkistaa ne (OFF-03, OFF-05). Näkymä kertoo myös, että tiedot julkaistaan Database Contents Licensella ja kuvat CC BY-SA -lisenssillä, että kuvien on oltava käyttäjän itse ottamia pakkauskuvia ja että julkaisuun liitetään sovelluksen nimi, versio ja asennuskohtainen tunniste (`app_uuid`, kohta 6.2, TIE-01). Hyväksyntä kattaa nämä ehdot. Ilman hyväksyntää työ jää tilaan `awaiting_consent`.
4. Hyväksynnän jälkeen työ siirtyy jonoon. Lähetys tehdään, kun verkko on käytettävissä. Työ poistuu jonosta (tila `published` tai `exists_already`) vasta, kun välityspalvelu on vahvistanut, että OFF on tallentanut tuotetiedot ja kuvat. Virheet käsitellään kohdan 6.4 mukaan.
5. Välityspalvelu tarkistaa vielä, onko tuote jo OFF:ssa (OFF-01). Jos on, palautetaan `exists_already` ja OFF:n tiedot näytetään käyttäjälle; uutta tuotetta ei luoda (OFF-08). Uusinnassa välityspalvelu tunnistaa idempotenssiavaimesta saman työn aiemmassa yrityksessä luodun tuotteen, joten sovelluksen omaa, osittain onnistunutta julkaisua ei tulkita olemassa olevaksi tuotteeksi.
6. Muussa tapauksessa välityspalvelu kirjoittaa tuotetiedot ja lähettää kuvat. Se tallentaa idempotenssiavaimelle jokaisen onnistuneen vaiheen, ja uusinta jatkaa ensimmäisestä keskeneräisestä vaiheesta.

### 6.2 Välityspalvelu

- Ympäristö: Cloudflare Workers (tai vastaava serverless-palvelu). Tila: avain–arvo-varasto idempotenssiavaimille.
- Säilyttää sovelluksen OFF-tunnukset salaisuuksina; tunnuksia ei ole sovelluspaketissa (OFF-09).
- Tunnistautuminen: sovellustilin käyttäjätunnus (ei sähköpostiosoite) ja salasana lähetetään kirjoituspyyntöjen parametreina. Istuntoevästettä ei käytetä, koska OFF edellyttää istunnon käyttöä aina samasta IP-osoitteesta, eikä serverless-ympäristön lähtevä osoite ole pysyvä. Tunnuksia ei lähetetä GET-pyynnöissä, kuten OFF-01-tarkistuksessa. Jokaisessa OFF-pyynnössä on `User-Agent`-otsake samoin kuin sovelluksessa (kohta 5.1, docs/adr/0013).
- Idempotenssi: `publish_job.id` lähetetään jokaisessa yrityksessä; jo käsitelty avain palauttaa aiemman tuloksen (OFF-08).
- Vastaanottaa vain julkaistavat tuotekentät ja kuvat. Ei vastaanota eikä tallenna päiväkirjaa, kalorirajaa tai laitetunnisteita (OFF-04, TIE-01). Kuvan on oltava vähintään OFF:n vähimmäiskokoa 640 × 160 px, joten sovellus ei pienennä kuvia tämän alle.
- Nopeusrajoitus asennuskohtaisen satunnaistunnisteen ja IP-osoitteen perusteella väärinkäytön estämiseksi.
- Omat OFF-pyynnöt: välityspalvelun lukupyynnöt (OFF-01-tarkistus) lähtevät sen omasta IP-osoitteesta, joten OFF:n raja 15 tuotehakua/min koskee kaikkien käyttäjien tarkistuksia yhteensä. Cloudflare Workersin lähtevä IP-osoite ei ole välityspalvelun oma eikä pysyvä. Välityspalvelu rajoittaa omat lukupyyntönsä pelivaralla (esim. 12/min) ja palauttaa sovellukselle uusittavan virheen, kun raja täyttyy tai OFF vastaa 429 tai 503. Mahdollinen `Retry-After` välitetään sovellukselle (kohta 6.4).
- Kirjoituspiste: ensisijaisesti API v3 (tuote `PATCH /api/v3.x/product/<code>`, kuvat `POST /api/v3.x/product/<code>/images`, alaversio vähintään v3.3), koska v2 on vanhentunut. OFF:n lähdekoodin mukaan v3 kirjoittaa energian vain uudella, vielä kehitteillä olevalla ravintoarvorakenteella, eikä se lue `app_*`-parametreja JSON-rungosta. Siksi vanhaa `product_jqm2.pl`-pistettä voidaan käyttää niihin osiin, joita v3 ei kokeilussa tue luotettavasti, ja syy kirjataan päätösmuistioon 0004.
- Merkitsee muokkaukset OFF:n ohjeiden mukaisesti parametreilla `app_name`, `app_version` ja `app_uuid` sekä `comment`-kentällä ilman henkilötietoja, ja välittää `cc=fi` ja `lc=fi`. `app_uuid` on OFF:n ohjeen mukainen käyttäjäkohtainen, suolattu tunniste: välityspalvelu johtaa sen asennuksen satunnaistunnisteesta salaisella suolalla (esim. HMAC-SHA-256, UUID-muodossa). Sama asennus saa aina saman tunnisteen, joten OFF:n moderaattorit voivat estää yksittäisen käyttäjän estämättä koko sovellusta, mutta tunnisteesta ei voi päätellä asennuksen tunnistetta. Suola on välityspalvelun salaisuus (OFF-09). Tuotemerkki lisätään nykyisten merkkien rinnalle (v3:ssa tag-kenttänä, esim. `brands_tags_add`, vanhassa pisteessä `add_brands`-kentällä), jotta olemassa olevaa tietoa ei korvata huomaamatta (OFF-08). Tiedot lisensoidaan Database Contents Licensella ja kuvat CC BY-SA -lisenssillä. OFF:n ehtojen mukaan tiedot otetaan pakkauksesta ja kuvat on otettava itse; muista tietokannoista kopiointi on kielletty (tarkistettu 18.10.2026, docs/adr/0004).
- Kehitys, testaus ja kriteerin 5 hallittu varmennus tehdään yksinomaan OFF:n testiympäristöä (`https://world.openfoodfacts.net`, HTTP Basic `off`/`off`, erillinen tilitietokanta) vastaan. Välityspalvelun OFF-osoite tulee sen konfiguraatiosta, jonka oletus on tämä osoite. Muun OFF-palvelun osoite ja tuotantotunnukset otetaan käyttöön vain kehittäjän nimenomaisella päätöksellä. Tuotantoon ei kirjoiteta testituotteita. Kehittäjä täyttää OFF:n API-käytön ilmoituslomakkeen ennen vaihetta 4, koska OFF pyytää lomaketta ennen rajapinnan käyttöä (docs/adr/0013).

### 6.3 Lähteiden erottelu

Julkaisulomakkeen kentät täytetään vain käyttäjän syöttämistä tai pakkauksesta tarkistamista tiedoista. Fineli- tai muista lähteistä kopioituja arvoja ei esitäytetä julkaistaviksi (OFF-10, TIE-04).

### 6.4 Virheet ja uusintayritykset

OFF:n ohjeen mukaan kirjoituspyynnöt jonotetaan, ja ohimenevät virheet uusitaan kasvavalla viiveellä (docs/adr/0013).

- **Uusittavat virheet:** verkkovirhe, aikakatkaisu sekä HTTP 429 ja 5xx, myös silloin, kun välityspalvelu välittää ne OFF:lta. Julkaisujono uusii lähetyksen automaattisesti. Ensimmäinen uusinta tehdään muutaman sekunnin kuluttua (esim. 5 s), minkä jälkeen viive kaksinkertaistuu joka yrityksellä. Viiveeseen lisätään satunnaisvaihtelu (esim. ±50 %), jotta käyttäjien uusinnat eivät osu samaan hetkeen. `Retry-After` pidentää viivettä tarvittaessa. Seuraavan yrityksen aika tallennetaan sarakkeeseen `next_attempt_at`.
- **Yläraja:** automaattisia yrityksiä on enintään esim. 6. Sen jälkeen työ siirtyy tilaan `failed`, ja käyttäjä voi yrittää uudelleen käsin (OFF-07).
- **Pysyvät virheet:** muita 4xx-vastauksia, kuten virheellistä kenttää tai tunnusta, ei uusita automaattisesti. Työ siirtyy tilaan `failed` syyn kanssa, ja käyttäjä voi korjata tiedot ennen uutta yritystä (OFF-05, OFF-07).
- **Valmis vasta vahvistuksesta:** työ poistuu jonosta vasta, kun välityspalvelu on vahvistanut OFF:n tallennuksen (kohta 6.1).
- **Välityspalvelu ei tee pitkiä uusintoja:** se luokittelee OFF:n vastauksen ja kertoo sovellukselle, onko virhe uusittava. Uusinnat ajoittaa sovelluksen julkaisujono.
- Viiveen laskenta ja virheiden luokittelu ovat puhtaita funktioita `src/domain/`-kerroksessa, ja ne yksikkötestataan (luku 4).
- Lukupyyntöjä ei uusita automaattisesti (kohta 5.1).

## 7. Käyttöliittymä

Suomenkielinen, puhelimelle suunniteltu. Tekstit kootaan yhteen tiedostoon (`src/ui/strings.fi.ts`), jotta myöhempi kielituki on mahdollinen.

### 7.1 Näkymät

| Näkymä | Sisältö | Vaatimukset |
| --- | --- | --- |
| Aloitus | Kalorirajan syöttö, ei muita kysymyksiä | KAY-01 |
| Tänään | Paastopäivä: yhteenveto (raja, syöty, jäljellä/ylitys), suosikkipikanapit, kirjauslista ja tarvittaessa OFF-lähdemaininta (kohta 5.1). Ei-paastopäivä: ”Aloita paastopäivä” ja pääsy historiaan. | PAI-02…04, LAA-01, LAA-02, TIE-03 |
| Lisää | Välilehdet tai osiot: Haku (OFF + Fineli + omat), Viivakoodi, Pikakirjaus (kcal), Suosikit | KIR-01, KIR-02 |
| Määrä | Määrä g/ml/annos, laskettu kcal ennen tallennusta, lähde ja peruste näkyvissä; OFF-tuotteelle lähdemaininta (kohta 5.1) | KIR-03, KIR-04, LAS-06, TIE-03 |
| Kirjauksen muokkaus | Nimi, määrä, kcal, poisto, siirto toiseen päivään | KIR-05 |
| Omat ruoat ja ateriat | Lista, lisäys, muokkaus, suosikkimerkintä, aterian kokoaminen | OMA-01…06 |
| Uusi tuote | Viivakoodi, nimi, merkki, energia ja peruste, kuvat, julkaisun hyväksyntä | OFF-01…07 |
| Historia | Kalenteri tai lista paastopäivistä, päivän avaus ja kopiointi | HIS-01, HIS-02 |
| Asetukset | Oletusraja (jos tänään on paastopäivä, kysytään, muutetaanko myös sen raja; tallennuksesta selvä vahvistus), vienti/palautus, tietojen poisto, julkaisujen tila, tietolähteet ja lisenssit (OFF:n osalta teksti `(c) Open Food Facts contributors`, linkki käyttöehtoihin ja vastuuvapauslauseke, kohta 5.1) | KAY-03, HIS-03, HIS-04, OFF-07, TIE-03 |

### 7.2 Periaatteet

- Suosikin oletusannos lisätään yhdellä napautuksella Tänään-näkymän pikanapista; kumoaminen tarjotaan lyhytaikaisella ilmoituksella (LAA-02).
- Ylitys esitetään luvulla ja tekstillä (”Ylitys 45 kcal”), ei pelkällä värillä eikä moittivalla sävyllä (PAI-03, LAA-06, LAA-08).
- Kaikilla toiminnoilla on saavutettavuusnimet, ja asettelu kestää järjestelmän tekstikoon suurennuksen (LAA-06).
- Tietolähteen nimi kirjoitetaan käyttäjälle aina kokonaan: ”Open Food Facts”, ei lyhennettä OFF (TIE-03). Sääntö koskee kaikkia `strings.fi.ts`-tekstejä, myös saavutettavuusnimiä, virheilmoituksia, julkaisun tiloja ja Tietolähteet-näkymää. Yksikkötesti varmistaa, ettei `strings.fi.ts` sisällä erillistä sanaa ”OFF”. Lyhennettä käytetään vain koodissa, dokumentaatiossa, vaatimustunnuksissa (esim. OFF-03) ja kehityskeskustelussa.
- Kameralupa pyydetään vasta, kun viivakoodinlukija avataan (KAY-04).
- Tallennuspainike lukitaan tallennuksen ajaksi, ja kirjauksen UUID luodaan lomakkeen avautuessa, jotta kaksoisnapautus ei luo kahta riviä (KIR-07).

Ennen vaihetta 1 tehdään kevyet rautalankaluonnokset Tänään- ja Lisää-näkymistä. Hienosäätö tehdään toimivassa sovelluksessa.

## 8. Vienti, palautus ja tietojen poisto

- Vientitiedosto: `kevytpaasto-vienti-YYYY-MM-DD.json`, sisältää `format`, `schemaVersion`, `exportedAt` sekä taulut `settings`, `fast_day`, `food` (vain `user`-lähteiset ja kirjauksiin/aterioihin liittyvät), `meal`, `meal_item`, `log_entry`. Julkaisujonoa ja kuvia ei viedä v1:ssä.
- Tiedosto jaetaan järjestelmän jakovalikolla (expo-sharing) ja palautetaan tiedostonvalitsimella.
- Palautus yhdistää UUID:n perusteella: olemassa oleva rivi jätetään ennalleen, uusi lisätään. Päivämäärätörmäys (sama `date`, eri UUID) yhdistää kirjaukset olemassa olevaan päivään ja säilyttää sen rajan. Ennen palautusta näytetään yhteenveto lisättävistä riveistä (kriteeri 11).
- Tietojen poisto tyhjentää käyttäjän taulut ja kertoo, ettei jo OFF:iin julkaistu tieto poistu (HIS-04).

## 9. Laatu ja testaus

- **Yksikkötestit (Vitest):** koko `domain`-kerros. Hyväksymiskriteerit 2, 3 ja 10 kirjoitetaan testeiksi sellaisinaan.
- **Tietokantatestit:** repositoriot ja palvelut ajetaan Node-ympäristön SQLitea vasten (better-sqlite3 samalla Drizzle-skeemalla). Kattaa vienti–palautus-kierroksen (kriteeri 11) ja migraatiot.
- **Välityspalvelun testit:** idempotenssi, ”tuote on jo olemassa” -tapaus, osittain onnistunut julkaisu ja sen uusinta, uusittavien ja pysyvien virheiden luokittelu, omien OFF-pyyntöjen rajoitin, mockattu OFF.
- **Käyttöliittymätestit (Maestro, Android-emulaattori):** aloitus, kirjaus suosikista kahdella painalluksella, ylitys, uudelleenkäynnistys (kriteerit 1, 8, 9, 12). Testit ovat hakemistossa `app/e2e/` ja ajetaan komennolla `npm run e2e` emulaattorin Expo Go:ssa. Claude ajaa ne ja tarkistaa kuvakaappaukset, tekstin suurennuksen ja lentotilan emulaattorissa aina, kun käyttöliittymä muuttuu (docs/adr/0007).
- **Manuaalinen testaus omalla puhelimella:** viivakoodin luku kameralla, tuntuma ja nopeus sekä ruudunlukija; kerran vaiheen lopussa.
- **Staattiset tarkistukset:** TypeScript `strict`, ESLint, Prettier. `npm run check` ajaa kaikki.
- **Hyväksymistestauksen seuranta:** `docs/hyvaksymistestaus.md` listaa kriteerit 1–13 ja kunkin todentavan testin tai manuaalisen tarkistuksen.

## 10. Avoin lähdekoodi ja maksuttomuus

- **Lisenssi:** GPL-3.0-or-later koko monorepolle (sovellus, välityspalvelu, skriptit). Juuressa on `LICENSE`, ja jokaisen `package.json`:n `license`-kenttä on `GPL-3.0-or-later` (AVO-01, docs/adr/0006).
- **Ei ansaintaa:** sovelluksessa ei ole maksullisia ominaisuuksia, ostopolkuja, mainontaa, kumppanilinkkejä eikä analytiikka- tai virheraportointipalvelua, joka lähettäisi tietoja laitteelta. Käyttöoikeusrajapintaa (`entitlements`) ei toteuteta (ANS-01, ANS-02, AVO-02).
- **Salaisuudet:** repo on julkinen, joten tunnuksia, avaimia tai henkilökohtaisia yhteystietoja ei tallenneta siihen. OFF-tunnukset ovat vain välityspalvelun salaisuuksissa; välityspalvelun osoite, OFF:n osoite ja `User-Agent`-otsakkeen yhteystieto tulevat käännösaikaisesta konfiguraatiosta, jolla on julkinen oletusarvo (AVO-03). `npm run secrets` skannaa koko Git-historian gitleaksilla, ja pre-push-koukku `.githooks/pre-push` pysäyttää pushauksen, jos pushattavissa commiteissa on mahdollinen tunnus (docs/adr/0014).
- **Itse kääntäminen:** README kertoo, miten sovellus käännetään ja ajetaan ilman kehittäjän tunnuksia. Ilman välityspalvelun osoitetta OFF-julkaisu näkyy käyttäjälle pois käytöstä, mutta kaikki muu toimii (AVO-03, OFF-06). Oletuskäännös käyttää OFF:n testiympäristöä. Oman käännöksen osoitteen voi asettaa konfiguraatiossa, mutta tämän projektin käännöksissä osoitteen muutos vaatii kehittäjän nimenomaisen päätöksen (docs/adr/0011).
- **Riippuvuuksien lisenssit:** uuden riippuvuuden lisenssin on oltava GPL-3.0:n kanssa yhteensopiva (esim. MIT, BSD, Apache-2.0, ISC). Tietolähteiden lisenssit (Fineli CC BY 4.0, OFF ODbL) koskevat aineistoa, eivät koodia, ja mainitaan READMEssa ja Tietolähteet-näkymässä (TIE-03).
- **Suljetut riippuvuudet (AVO-04):** nykyiset ratkaisut säilyvät: viivakoodin luku Google ML Kitillä (`expo-camera`, docs/adr/0002), jakelu Google Playssa ja välityspalvelu Cloudflare Workersissa. Välityspalvelu kirjoitetaan niin, ettei OFF-logiikka riipu Workers-rajapinnoista, jotta sen voi ajaa myös muualla. Avoimet vaihtoehdot arvioidaan vaiheen 7 jälkeen, ja ne on lueteltu dokumentissa [ideat.md](ideat.md).
- **Osallistuminen:** virheilmoitukset ja ideat otetaan vastaan issueina, mutta pull requesteja ei oteta vastaan ennen v1:tä ([CONTRIBUTING.md](../CONTRIBUTING.md), jossa on myös lyhyt käytösohje). Haavoittuvuuksista ilmoitetaan yksityisesti ([SECURITY.md](../SECURITY.md)). Laajempi käytösohje otetaan käyttöön, kun pull requesteja aletaan ottaa vastaan (docs/adr/0014).

## 11. Toteutusvaiheet

Jokainen vaihe on pystyviipale, joka jättää sovelluksen käyttökelpoiseen tilaan. Vaihe on valmis, kun sen vaatimukset täyttyvät, testit menevät läpi ja toiminta on kokeiltu puhelimella.

| Vaihe | Sisältö | Vaatimukset | Valmis, kun |
| --- | --- | --- | --- |
| 0. Pohja ja kokeilut | Monorepo, Expo-projekti, TypeScript strict, Vitest, Drizzle + migraatiot, `npm run check`, `LICENSE` ja README. Kokeilut: viivakoodin luku omalla puhelimella, Finelin aineiston muunnos, OFF-testiympäristöön kirjoittaminen. | AVO-01 | Tyhjä sovellus käynnistyy puhelimessa; kokeilujen tulokset kirjattu `docs/adr/`. |
| 1. Paastopäivä ja pikakirjaus | Domain-laskenta, aloitus, Tänään-näkymä, pikakirjaus, muokkaus, poisto, ylitys | KAY-01…03, PAI-01…06, KIR-02, KIR-05…07, LAS-*, LAA-01, LAA-03, LAA-07, LAA-08 | Kriteerit 1, 3 ja 12 |
| 2. Omat ruoat ja suosikit | Omat tuotteet, annokset, suosikit, suosikkiateriat, pikanapit | KIR-03, KIR-04, KIR-08, OMA-01…07, LAA-02 | Kriteerit 2, 7, 8, 10 |
| 3. Fineli | Aineistoskripti, paikallinen haku, kirjaus Fineli-tuotteesta | HAK-02, HAK-03, HAK-04, LAS-06, TIE-03 | Fineli-osa kriteeristä 4 |
| 4. OFF-haku ja viivakoodi | Ennen aloitusta API-käytön ilmoituslomake (kehittäjä) ja v3:n alaversion valinta (docs/adr/0013). Nimihaku, viivakoodihaku kameralla ja käsin, viivakoodin normalisointi OFF:n säännöllä, välimuisti, oma korjaus, OFF:n lähdemaininta ja vastuuvapauslauseke sekä migraatio `log_entry.includes_off_data` (docs/adr/0012) | HAK-01, HAK-03…08, KAY-04, LAA-04, LAA-05, TIE-03 | Kriteerit 4 ja 9 |
| 5. Historia ja tiedot | Historia, kopiointi, vienti, palautus, poisto | HIS-01…04 | Kriteeri 11 |
| 6. OFF-julkaisu | Uusi tuote -lomake, kuvat, julkaisujono, välityspalvelu, tilat, automaattinen ja käsin tehtävä uusinta (kohta 6.4) sekä migraatio `publish_job.next_attempt_at` | OFF-01…10, TIE-01, TIE-04 | Kriteerit 5 ja 6 |
| 7. Viimeistely ja v1 | Saavutettavuus, tekstit, tietolähdenäkymä, tietosuojaseloste, README:n ja osallistumisohjeen tarkistus (repo avataan julkiseksi jo ennen vaihetta 4, docs/adr/0014), siirtyminen OFF:n tuotantoon kehittäjän nimenomaisella päätöksellä (sovellustili tuotantoon ja ilmoituslomakkeen tietojen päivitys tarvittaessa, tuotanto-osoite julkaisukäännökseen ja välityspalveluun, haun tarkistus julkaisukäännöksellä), Google Play -julkaisu (kauppasivun kuvaukseen ja READMEen OFF:n lähdemaininta `(c) Open Food Facts contributors` linkkeineen, kohta 5.1) | LAA-06, TIE-03, TIE-05, ANS-01, ANS-02, AVO-01…03 | Kaikki P1-vaatimukset ja kriteeri 13 |

Vaiheen 1 jälkeen sovellus on jo omassa käytössä paastopäivinä.

## 12. Riskit ja avoimet kysymykset

| Riski / kysymys | Vaikutus | Toimenpide |
| --- | --- | --- |
| OFF:n kirjoitusrajapinnan ehdot sovellustunnuksella tehtäville muokkauksille | Vaihe 6 voi muuttua | Ohjeet tarkistettu (docs/adr/0004, täydennetty docs/adr/0013): globaali sovellustili ja `app_*`-parametrit ovat sallittuja. v3:n kirjoitusrajapinta ei lue `app_*`-parametreja JSON-rungosta, ja energian kirjoitus vaatii vielä kehitteillä olevan rakenteen. Testiympäristökokeilu on tekemättä. |
| OFF-haun nopeusrajat (15 tuotehakua ja 10 hakua/min/IP) | Haku tuntuu hitaalta tai estyy | Paikalliset tulokset ensin, OFF-haku vain käyttäjän toiminnolla, välimuisti ennen verkkoa, sovelluksen ja välityspalvelun omat pyyntörajoittimet, ei automaattisia uusintayrityksiä hauissa (kohdat 5.1 ja 6.2); Search-a-licious vain kehittäjän nimenomaisella päätöksellä; tarvittaessa välityspalvelun välimuisti. Suuren liikenteen varalle OFF suosittelee omaa Product Opener -instanssia, jota päivitetään päivittäisillä vientitiedostoilla. IP-osoitteen eston purkua pyydetään osoitteesta reuse@openfoodfacts.org. |
| OFF merkitsee nimihaun `/cgi/search.pl`-pisteen vanhaksi (legacy) | Nimihaku lakkaa toimimasta, jos piste poistuu | Nimihaku on eristetty OFF-asiakkaaseen, ja viivakoodihaku sekä paikalliset haut toimivat silti. Korvaava Search-a-licious otetaan käyttöön vain kehittäjän nimenomaisella päätöksellä (docs/adr/0011). |
| API v3 on OFF:n mukaan kehitteillä, ja tuoteskeema muuttuu | Energian luku tai kirjoitus voi rikkoutua | Kiinnitetty alaversio, uusia kenttiä sietävä luku, ei dokumentoimattomia kenttiä, alaversion nosto muutoslokin perusteella ja testit tallennetuilla esimerkkivastauksilla (kohta 5.1) |
| Suomalaisten tuotteiden kattavuus OFF:ssa | Käyttäjä joutuu lisäämään tuotteita usein | OFF-julkaisu on juuri tätä varten; pikakirjaus toimii aina |
| OFF:n testiympäristön tiedot poikkeavat tuotannosta | Haku voi ennen julkaisua löytää eri tuotteet ja tiedot kuin tuotanto | Automaattitestit käyttävät mockattua OFF:ia; tuotannon haku tarkistetaan julkaisukäännöksellä, kun kehittäjä on päättänyt siirtymisestä (docs/adr/0011) |
| Finelin aineiston rakenne ja lisenssimaininta | Vaihe 3 | Rakenne ja lisenssi selvitetty (docs/adr/0003). fineli.fi estää automaattiset lataukset, joten aineisto ladataan käsin. |
| Välityspalvelun väärinkäyttö | OFF:iin roskatuotteita sovelluksen nimissä | Nopeusrajoitus, palvelinpuolen validointi, mahdollisuus sulkea julkaisu etäkytkimellä; OFF voi estää yksittäisen asennuksen `app_uuid`:n perusteella (kohta 6.2) |
| iOS-tuki | Toissijainen kohderyhmä | Koodi pidetään alustariippumattomana; iOS-käännös EAS Buildilla vaiheen 7 jälkeen (selvitettävät asiat: [ideat.md](ideat.md)) |
| Tietosuoja Google Playssa | Julkaisu vaatii tietoturvaselosteen | Päiväkirja pysyy laitteella; välityspalvelu käsittelee vain julkaistavia tuotetietoja |
| Salaisuus päätyy julkiseen repoon | Tunnus vuotaa heti pushattaessa | Tunnukset vain välityspalvelun salaisuuksissa ja gitignoroidussa `proxy/.dev.vars`-tiedostossa. Historia tarkistettiin gitleaksilla ennen avaamista, pre-push-koukku tarkistaa uudet commitit, ja GitHubin push protection pysäyttää tunnettujen palvelujen tunnukset. Vuotanut tunnus mitätöidään ja vaihdetaan heti (docs/adr/0014). |
| Joku muu lataa julkisesta koodista käännetyn version Google Playhin ensin | Sovellustunnus `fi.kevytpaasto.app` on varattu, ja julkaisu vaatii uuden tunnuksen | Riski on pieni; tunnuksen voi varata lataamalla version sisäiseen testaukseen (docs/adr/0014) |
| Muiden käyttämä välityspalvelu | Itse käännetyt tai muutetut versiot julkaisevat OFF:iin sovelluksen tunnuksilla | Välityspalvelun osoite ei ole kovakoodattu; nopeusrajoitus ja palvelinpuolen validointi; muut kääntäjät käyttävät omaa välityspalveluaan |
| Suljetut riippuvuudet (ML Kit, Google Play, Cloudflare) | Sovellus ei kelpaa F-Droidiin | Hyväksytty v1:lle; avoimet vaihtoehdot arvioidaan vaiheen 7 jälkeen (AVO-04) |

## 13. Päätösmuistiot

Merkittävät tekniset päätökset ja niiden muutokset kirjataan lyhyinä muistioina hakemistoon `docs/adr/` (`NNNN-otsikko.md`: tausta, päätös, seuraukset). Tämän suunnitelman päätökset toimivat lähtötilanteena; muistio kirjoitetaan, kun päätös muuttuu tai vaiheen 0 kokeilu tuottaa uutta tietoa.

## 14. Muutoshistoria

- **1.9 / 8.11.2026:** Repo avataan julkiseksi jo ennen vaihetta 4 eikä vasta vaiheessa 7 (päätösmuistio 0014). Koko historia skannattiin gitleaksilla, ja jatkossa `npm run secrets` ja pre-push-koukku tarkistavat commitit. Issuet ovat auki, mutta pull requesteja ei oteta vastaan ennen v1:tä (`CONTRIBUTING.md`, `SECURITY.md`). Välityspalvelun lisenssi on edelleen GPL-3.0-or-later, ja AGPL:ää harkitaan ennen ensimmäistä ulkopuolista muutosta välityspalveluun. Repon avaaminen poistui vaiheesta 7, ja riskitaulukkoon lisättiin sovellustunnuksen varaaminen Google Playssa.
- **1.8 / 8.11.2026:** OFF:n API-ohjeen tarkistus ennen vaihetta 4 (päätösmuistio 0013). API v3:n alaversio kiinnitetään ja valitaan vaiheen 4 alussa (kohta 5.1). Nimihaku lähtee vain käyttäjän toiminnosta, Tietolähteet-näkymään tulee OFF:n vastuuvapauslauseke, ja viivakoodi normalisoidaan OFF:n säännöllä. Kehittäjä täyttää API-käytön ilmoituslomakkeen ennen vaihetta 4. Kirjoitukset uusitaan kasvavalla viiveellä (uusi kohta 6.4, `publish_job.next_attempt_at`). Kohtaan 6.2 lisättiin välityspalvelun omat OFF-pyynnöt, tunnistautuminen, `app_uuid`:n muodostus ja v3 ensisijaisena kirjoituspisteenä, ja hyväksyntänäkymä kertoo kuvien lisenssistä ja tunnisteesta (kohta 6.1). Otsakkeen versio ja päiväys korjattiin, ja kohta 5.1 sijoittaa OFF-asiakkaan samaan hakemistoon kuin kohta 2.1 (`integrations/off/`).
- **1.7 / 8.11.2026:** Käyttäjälle näkyvissä teksteissä tietolähteen nimi on aina ”Open Food Facts”, ei lyhenne OFF; yksikkötesti valvoo `strings.fi.ts`-tiedostoa (kohta 7.2, TIE-03). Lyhenne säilyy koodissa, dokumentaatiossa ja kehityskeskustelussa.
- **1.6 / 8.11.2026:** Kirjauksen OFF-alkuperä tallennetaan tilannekuvana `log_entry.includes_off_data`-sarakkeeseen vaiheen 4 migraatiolla, eikä sitä päätellä lukuhetkellä lähderuoasta tai ateriasta. Näin Tänään-näkymän lähdemaininta pysyy oikeana, vaikka ateriaa muokattaisiin (päätösmuistio 0012).
- **1.5 / 8.11.2026:** OFF:n lähdemaininta OFF:n suosituksen mukaiseksi (kohta 5.1, TIE-03): teksti `(c) Open Food Facts contributors` ja linkki käyttöehtoihin jokaisessa näkymässä, jossa näkyy OFF:n tietoja, myös Tänään-näkymän ja historian kirjauslistan alla, kun päivän kirjauksissa on OFF-tuotteesta tehty kirjaus. Sama maininta Tietolähteet-näkymään sekä vaiheessa 7 Google Playn kauppasivulle ja READMEen.
- **1.4 / 8.11.2026:** OFF:n nopeusrajojen käsittely tarkennettu kohdassa 5.1 ennen vaihetta 4: välimuisti ennen verkkoa viivakoodihaussa, kameran toistuvien lukemien suodatus, sovelluksen oma pyyntörajoitin sekä HTTP 429- ja 503-vastausten käsittely ilman automaattisia uusintayrityksiä.

- **1.3 / 1.11.2026:** Tulevaisuuden ideat koottu dokumenttiin `docs/ideat.md`. Sinne siirrettiin suljettujen riippuvuuksien avoimet vaihtoehdot, ja lisättiin iOS-version selvitettävät asiat, OFF:n SDK ja kielituki.
- **1.2 / 1.11.2026:** Kaikki OFF-kutsut, myös haut ja kriteerin 5 varmennus, tehdään osoitteeseen `https://world.openfoodfacts.net`, joka on myös konfiguraation oletus. Muutos muuhun OFF-palvelun osoitteeseen vaatii kehittäjän nimenomaisen päätöksen; tämä koskee myös Search-a-liciousta ja vaiheen 7 tuotantoon siirtymistä. Kehityksessä saa käyttää myös paikallista kopiota OFF:n datasta (päätösmuistio 0011).
- **1.1 / 25.10.2026:** Vaihe 3: Fineli Release 20.0 sovelluksen mukana (`app/assets/fineli/`), liitetään käynnistyksessä. Lisää-näkymässä on paikallinen haku omista ruoista ja Finelistä. Fineli-tuote kopioidaan `food`-tauluun ensimmäisellä kirjauksella, ja sen ruokamitat ovat valittavissa annoksina. Tietolähteet-näkymä näyttää THL:n suositteleman viitteen ja lisenssin. Skeema ei muuttunut (päätösmuistio 0010).
- **1.0 / 25.10.2026:** Vaihe 2b: Lisää-, Määrä- sekä Omat ruoat ja ateriat -näkymät, Tänään-näkymän suosikkipikanapit ja kumoamisilmoitus (noin 8 s, LAA-02). Ruoka- ja ateriakirjauksen nimeä voi korjata (KIR-05); nimeä ei voi tyhjentää. Määrä alkaa yhdestä annoksesta, jos ruoalla on annos, muuten perusteen yksiköstä. Metron välimuisti sidotaan migraatiotiedostoihin, ja uusi migraatio todennetaan emulaattorissa päivityksenä (päätösmuistio 0009).
- **0.9 / 25.10.2026:** Vaihe 2a: `log_entry` tallentaa annoksen koon, yksikön ja nimen tilannekuvana (migraatio 0001, KIR-08). Suosikkiruoan oletusannos on yksi annos; jos ruoalla ei ole annosta, pikanappi avaa Määrä-näkymän. Poistettu ruoka voi jäädä ateriaan, jossa se jo on, mutta sitä ei voi kirjata eikä lisätä uuteen ateriaan.

- **0.8 / 25.10.2026:** Oletusrajan muutos kysyy, muutetaanko myös tämän päivän paastopäivän raja; aiempien päivien rajat eivät muutu (KAY-03, kriteeri 10). Tallennuksesta näytetään selvä vahvistus.
- **0.7 / 25.10.2026:** Paluu Expo SDK 58:aan (React Native 0.88, React 19.3), koska kehittäjän puhelimen Expo Go on päivittynyt eikä enää avaa SDK 57 -projektia (päätösmuistio 0008).
- **0.6 / 25.10.2026:** Vaihe 1b: Asetukset-näkymästä toteutettiin vaiheessa 1 oletusraja (KAY-03), ja yksittäisen päivän rajaa voi muuttaa Tänään-näkymästä. Kirjauksen voi siirtää vain jo olemassa olevalle paastopäivälle; muiden päivien aloitus tulee historian myötä (vaihe 5). UUID-tunnisteet luodaan `expo-crypto`-paketilla, koska Expo SDK 57:n ajoympäristössä ei ole globaalia `crypto.randomUUID`-funktiota.
- **0.5 / 25.10.2026:** Käyttöliittymän todennus siirretty pääosin Android-emulaattoriin ja Maestroon (`npm run emulator`, `npm run e2e`, `npm run device`). Puhelimelle jää kamera, tuntuma ja ruudunlukija (päätösmuistio 0007).
- **0.4 / 25.10.2026:** Vaatimusmäärittelyn 0.3 mukaisesti luovuttu ansainnasta ja `entitlements`-rajapinnasta. Projekti on avointa lähdekoodia GPL-3.0-or-later-lisenssillä; lisätty luku 10 avoimuudesta, riskit julkisesta reposta ja suljetuista riippuvuuksista (päätösmuistio 0006).
- **0.3 / 18.10.2026:** Expo SDK 57 SDK 58:n sijaan, jotta sovellus avautuu kehittäjän puhelimen Expo Go -versiossa (päätösmuistio 0005).
- **0.2 / 18.10.2026:** Vaihe 0: [tarkistettava]-kohdat päivitetty OFF:n ja Finelin ajantasaisten ohjeiden mukaan (OFF-haun rajat ja nimihaun toteutus, API v3, sovellusmerkintä ja lisenssit, Finelin lisenssi ja lataustapa). Reitit ovat hakemistossa `app/src/app/` Expo SDK 58:n mukaisesti. Päätösmuistiot 0001–0004.
- **0.1 / 18.10.2026:** Ensimmäinen luonnos vaatimusmäärittelyn 0.2 pohjalta.

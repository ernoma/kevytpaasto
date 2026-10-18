# 0003 – Kokeilu: Finelin avoimen aineiston muunnos SQLiteksi

Päiväys: 18.10.2026  
Tila: suunniteltu (kokeilu tekemättä)  
Liittyy: HAK-02, HAK-03, HAK-07, LAS-01, LAS-06, TIE-03, vaihe 3

## Tausta

Fineli toimitetaan sovelluksen mukana vain luettavana `fineli.db`-tiedostona (suunnitelman luku 3.2). Aineiston rakenne, energian yksikkö ja lisenssimaininta on varmistettava ennen vaihetta 3.

## Ajantasainen tieto (tarkistettu 18.10.2026)

- **Ylläpitäjä on Terveyden ja hyvinvoinnin laitos (THL)**, ei Ruokavirasto.
- Avoimen datan sivu (https://fineli.fi/fineli/fi/avoin-data) tarjoaa kolme zip-pakettia CSV-muodossa: peruspaketti (verkkosivun sisältö, 4 232 elintarviketta, 55 ravintotekijää), toinen peruspaketti 74 ravintotekijällä sekä elintarviketeollisuuden raaka-ainepaketti (1 370 raaka-ainetta, 40 ravintotekijää). Hakutulosten ja kolmansien osapuolten mukaan nykyinen julkaisu on **Release 20**.
- Lisäksi on JSON-rajapinta, esimerkiksi `https://fineli.fi/fineli/api/v1/foods/11060` (yksittäinen elintarvike tunnisteella).
- **Lisenssi:** CC BY 4.0 (THL:n avoimen datan lisenssi). Lähteeksi mainitaan THL ja Fineli; tekijänoikeus tietokantaan on THL:llä.
- **Pakettirakenne** (aiempien julkaisujen `descript.txt`): puolipisteellä erotetut tiedostot, mm. `food.csv` (FOODID, FOODNAME, FOODTYPE, PROCESS, EDPORT, IGCLASS, FUCLASS…), `component_value.csv` (FOODID, EUFDNAME, BESTLOC, ACQTYPE, METHTYPE), `component.csv` (EUFDNAME, COMPUNIT…), `foodname_FI.csv`, `foodaddunit.csv` (FOODID, FOODUNIT, MASS) sekä luokitustiedostot (`process_FI.csv` ym.). Energia on ravintotekijä `ENERC`, jonka yksikkö on kJ / 100 g syötävää osaa; kolmannen osapuolen Release 20 -johdannainen vahvistaa yksikön kJ/100 g.
- **Automaattinen lataus estyy:** fineli.fi on Cloudflare-suojauksen takana ja palauttaa skripteille 403-vastauksen (todettu myös tässä selvityksessä). Sivua ei voitu lukea tältä koneelta, joten julkaisunumero ja tarkka lisenssiteksti on varmistettava selaimella käsin.

## Päätös

- `scripts/fineli/` ei lataa aineistoa itse. Kehittäjä lataa zip-paketin selaimella hakemistoon `scripts/fineli/data/` (gitignoressa), ja skripti muuntaa sen. Paketin nimi ja julkaisunumero tallennetaan `fineli.db`:n metatietotauluun ja näytetään Tietolähteet-näkymässä.
- Käytetään peruspakettia (55 ravintotekijää); siitä tarvitaan vain energia, nimi, valmistustapa ja annosyksiköt.
- Energia: `kcal_per_100g = kjToKcal(ENERC)`. Puuttuva ENERC tallennetaan `NULL`-arvona (HAK-04). Fineli ilmoittaa arvot per 100 g syötävää osaa, joten peruste on aina `per_100g` (LAS-02).
- Valmistustapa (`PROCESS`) kuvataan `preparation_state`-arvoksi, jotta raaka ja kypsä erottuvat (LAS-06).
- `foodaddunit.csv`:n annosyksiköt (esim. kpl, dl) otetaan mukaan annosvaihtoehdoiksi grammamäärineen.

## Kokeilusuunnitelma

1. Lataa peruspaketti selaimella ja tarkista sivulta julkaisunumero, päiväys ja vaadittu lisenssimaininta. Kirjaa ne tähän muistioon.
2. Tarkista merkistö (oletus: ISO-8859-1 tai UTF-8) ja erotin tutkimalla `foodname_FI.csv`:n ääkkösiä.
3. Kirjoita kertakäyttöinen muunnos `scripts/fineli/`: CSV → better-sqlite3 → `fineli.db`, jossa taulu `fineli_food` (id, name_fi, energy_kcal_per_100g, process, food_type) ja FTS5-indeksi nimelle.
4. Mittaa tiedoston koko ja hakuaika puhelimella (tavoite: haku ”kaurapuuro” alle 100 ms, tiedosto alle 5 MB).
5. Pistokokeet: 10 tavallista ruokaa verrataan fineli.fi-sivun arvoihin (kcal/100 g, pyöristys vain vertailussa).

## Tulokset

Täydennetään kokeilun jälkeen.

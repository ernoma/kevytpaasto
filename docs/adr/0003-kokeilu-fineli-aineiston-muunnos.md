# 0003 – Kokeilu: Finelin avoimen aineiston muunnos SQLiteksi

Päiväys: 18.10.2026  
Tila: hyväksytty (kokeilu tehty Release 18.0 -kopiolla 18.10.2026; virallinen Release 20 tarkistettava)  
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

## Tulokset (18.10.2026)

**Aineisto.** fineli.fi ei ollut kokeilupäivänä saavutettavissa selaimellakaan, joten kokeilu tehtiin epävirallisella GitHub-kopiolla [theel0ja/fineli-data](https://github.com/theel0ja/fineli-data), `basic-package-1`. Kopio on **Release 18.0** (commit 30.4.2017), ei nykyinen Release 20. Sitä ei käytetä sovelluksessa; virallinen paketti ladataan ennen vaihetta 3. Kopio on hakemistossa `scripts/fineli/data/` (gitignoressa).

**Rakenne (Release 18.0, varmistettu):**
- `descript.txt`: ”Copyright 2015 Terveyden ja hyvinvoinnin laitos (THL). Käyttöehdot: Creative Commons Nimeä 4.0 (CC-BY 4.0).” Paketissa on myös vastuunrajaus: THL ei vastaa tietojen virheistä, ja tietojen tulkinta on käyttäjän vastuulla. Tämä mainitaan Tietolähteet-näkymässä.
- Tiedostot ovat ISO-8859-1-merkistöä (ääkköset), CRLF-rivinvaihdot, puolipiste-erotin ja desimaalipilkku (`1698,30`). `descript.txt` väittää ”ASCII-tekstitiedostoja”, mikä ei pidä paikkaansa. Muunnos tunnistaa UTF-8:n ja Latin-1:n automaattisesti, joten myös mahdollinen UTF-8-muotoinen Release 20 toimii.
- `component.csv`: `ENERC;KJ` – energia on kJ/100 g syötävää osaa.
- Lisäksi tiedostot englanniksi ja ruotsiksi sekä `specdiet*.csv` (erityisruokavaliot), joita v1 ei tarvitse.

**Muunnos** (`npm run fineli:convert -w scripts -- <kansio|zip> [tulos.db] --release "…"`):
- 4 058 elintarviketta (2 621 koostettua ruokaa, 1 437 raaka-ainetta). Release 20:ssä on Finelin sivun mukaan 4 232.
- Energia puuttuu 7:ltä: Kaneli, Neilikka, Inkivääri (jauhettu), Kardemumma, parmankinkku, jalapeno-säilyke ja *Vesi, keitetty*. Fineli jättää ENERC-rivin pois myös vedeltä, joten sääntömme mukaan (HAK-04) se näkyy ”energia puuttuu” -tilassa eikä 0 kcal:na.
- 19 198 annosyksikköä. Lähes kaikilla on `PORTS`/`PORTM`/`PORTL` (pieni/keskikokoinen/iso annos), monilla lisäksi `DL`, `RKL`, `TL`, `KPL_S/M/L` ja `KPL_VALM` (valmistajan kpl). Esim. *Kananmuna, keitetty*: keskikokoinen kpl 55 g.
- Valmistustavat (`PROCESS`): BAK uunissa paistettu 1 023, IND teollinen 920, BOIL keitetty 738, MIX sekoitettu 408, RAW käsittelemätön tai tuore 349, FRIE paistettu 296, sekä DRIE, CANN, MASH, FROZ, GRIL, ROAS, SMOK, SALT, SOUR ja X (määrittelemätön).
- `fineli.db` on 1,55 Mt FTS5-indeksin kanssa (tavoite < 5 Mt).
- Haku Node.js:llä ja better-sqlite3:lla tällä koneella: 0,2–0,8 ms kymmenellä hakusanalla (tavoite < 100 ms).

**Pistokokeet** (kcal/100 g, pyöristetty vain tässä): Banaani, kuorittu 88; Omena, kotimainen, kuorittu 41 (id 11060, sama kuin Finelin rajapintaesimerkissä); Kananmuna, keitetty 134; Riisi, keitetty, suolaton 137; Kaurahiutale 382; Maito, kevytmaito 46; Kaurapuuro, vesi, suolaa 48. Arvot ovat uskottavia. Vertailu fineli.fi-sivuun jäi tekemättä, koska sivu ei ollut saavutettavissa.

**Havaintoja vaiheeseen 3:**
- **Hakutulosten järjestys:** pelkkä FTS5 `rank` nostaa yhdyssanat edelle: ”omena” → *Omenahillo*, *Omenalastu*, … ennen raakaa omenaa. Vaiheessa 3 järjestetään ensin nimet, joiden ensimmäinen sana on täsmälleen hakusana (”Omena, …”), sitten raaka-aineet (`FOODTYPE = FOOD`) ja lopuksi muut.
- **Punnittu kuorineen:** Finelissä on erikseen esim. *Banaani, kuorittu* (88) ja *Banaani, punnittu kuorineen* (58). Ero on näytettävä käyttäjälle selvästi (LAS-06).
- **Merkkituotteita:** Finelissä on myös joitakin merkkituotteita (esim. *Ruisleipä, oululainen reilu ruisleipä, fazer*). HAK-07:n mukaisesti niitä ei yhdistetä OFF-tuotteisiin nimen perusteella.
- **Valmistustavan kuvaus `preparation_state`-arvoksi:** RAW → `raw`; BOIL, BAK, FRIE, GRIL, ROAS, SMOK → `cooked`; IND, MIX, CANN, MASH, DRIE, FROZ, SALT, SOUR → `prepared`; X → `null`. Lisäksi näytetään Finelin oma suomenkielinen kuvaus.

**Puhelin (Expo Go, SDK 57, kehittäjän Android-puhelin).** Kehitystilan näkymä `src/app/kokeilu-fts.tsx` loi 4 200 synteettistä riviä samalla taulumäärittelyllä kuin muunnos:
- SQLite 3.50.3, käännösasetuksissa `ENABLE_FTS3`, `ENABLE_FTS4` ja `ENABLE_FTS5`. FTS5-taulu `unicode61 remove_diacritics 0` -tokenisoijalla ja `prefix='2 3'`-indeksillä toimii.
- 4 200 rivin lisäys 102 ms, FTS-indeksin rakennus 27 ms.
- Kuusi prefiksihakua (20 osumaa kukin): 14,6–18,4 ms. Tavoite (< 100 ms) täyttyy. Aika sisältää JavaScriptin ja natiivikoodin välisen viiveen.
- **Ongelma:** `closeAsync` epäonnistui virheellä ”unable to close due to unfinalized statements”, vaikka koodi käytti vain `execAsync`-, `getFirstAsync`- ja `getAllAsync`-kutsuja. Kun tiedosto sen jälkeen poistettiin auki olevana, Expo Go sulki sovelluksen. Ensimmäisellä ajolla sama virhe kaatoi sovelluksen käsittelemättömänä lupauksen hylkäyksenä. Syy jäi selvittämättä; ehdokkaita ovat FTS5-virtuaalitaulut tai expo-sqliten omat lausevälimuistit.
- **Vaikutus vaiheeseen 3:** `fineli.db` avataan kerran ja pidetään auki sovelluksen ajan, joten sulkemista ei tarvita. Jos sulkeminen tai tiedoston vaihto tarvitaan (esim. aineistopäivitys), selvitetään ensin, toistuuko virhe ilman FTS-taulua, ja suljetaan yhteys ennen tiedoston poistoa tai korvaamista.

**Avoimet kohdat ennen vaihetta 3:** virallisen Release 20 -paketin lataus, sen julkaisunumeron ja lisenssimaininnan tarkistus sivulta, muunnoksen ajo sillä ja vertailu fineli.fi-sivun arvoihin.

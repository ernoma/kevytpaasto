# 0010 Fineli-aineiston toimitus, haku ja kirjaus

Päiväys: 25.10.2026  
Tila: hyväksytty  
Liittyy: HAK-02, HAK-03, HAK-04, LAS-01, LAS-06, KIR-08, TIE-03, vaihe 3, päätösmuistio 0003

## Tausta

Vaiheessa 3 Fineli otetaan käyttöön suunnitelman luvun 3.2 mukaisesti: sovelluksen mukana tulee vain luettava `fineli.db`, joka liitetään sovelluksen tietokantayhteyteen. Kehittäjä latasi virallisen peruspaketin (Release 20.0, 2019) selaimella. Paketti poikkeaa kokeilussa käytetystä Release 18 -kopiosta.

## Havainnot Release 20:stä

- 4 238 elintarviketta ja 20 043 ruokamittariviä. Energia puuttuu kuudelta: kanelilta, neilikalta, jauhetulta inkivääriltä, kardemummalta, jalapeno-säilykkeeltä ja keitetyltä vedeltä.
- **Nimet ovat kokonaan isoilla kirjaimilla** (”OMENA, KUIVATTU”). Muunnos tallentaa ne virkekirjoitettuina (”Omena, kuivattu”) samaan tapaan kuin fineli.fi ne näyttää. Lyhenteet ja merkkien nimet kirjoitetaan pienillä (esim. ”elovena”).
- Merkistö vaihtelee tiedostoittain: osa on Latin-1-, osa UTF-8-muotoisia. Muunnos tunnistaa merkistön tiedostokohtaisesti.
- Uudet valmistustavat ovat BOILDR (keitetty, valutettu) → `cooked` ja SEMI (puolivalmiste) → `unprepared`. Muut kuvaukset ovat päätösmuistion 0003 mukaiset.
- `descript.txt` kertoo julkaisunumeron (”Release. 20.0”). Vuosi annetaan muunnokselle erikseen (`--year 2019`), koska se on vain THL:n suosittelemassa viitteessä.
- Valmis `fineli.db` on 1,83 Mt.

## Päätös

- **Muunnos.** `scripts/fineli/build.ts` on kirjasto ja `convert.ts` komentorivi. Tulos kirjoitetaan hakemistoon `app/assets/fineli/`: `fineli.db` ja `fineli.json` (julkaisu, vuosi, muunnosaika, elintarvikkeiden määrä). Molemmat commitoidaan. Lähdepaketti pysyy gitignoressa.
- **Taulut.** `fineli_food`-tauluun lisätään `search_text` ja `preparation_state`. `search_text` on pienikirjaiminen nimi, koska SQLiten `LIKE` muuttaa vain ASCII-kirjainten kokoa (Ä ≠ ä). Taulut `fineli_food_unit`, `meta` ja FTS5-indeksi pysyvät ennallaan.
- **Toimitus laitteelle.** Metro tunnistaa `.db`-päätteen assetiksi. Käynnistyksessä `importDatabaseFromAssetAsync` (expo-sqlite) kopioi tiedoston SQLite-hakemistoon, ja `ATTACH DATABASE … AS fineli` liittää sen pääyhteyteen. Liitetyn kannan `meta.converted_at` verrataan `fineli.json`:n arvoon. Jos ne eroavat, kopio korvataan. Kopio irrotetaan ennen korvausta, eikä yhteyttä suljeta (päätösmuistio 0003). Funktio on expo-sqlitessa merkitty sisäiseksi (`@hidden`), mutta se on viety julkisesti ja on sama, jota `SQLiteProvider` käyttää. SDK-päivityksessä tämä tarkistetaan.
- **Liittämisen epäonnistuminen** ei estä käynnistystä. Haku kertoo, ettei Fineli ole käytettävissä, ja omat ruoat löytyvät silti.
- **Haku.** Haku toimii paikallisesti eikä tarvitse verkkoa. Jokaista sanaa verrataan sanan alkuun FTS5-prefiksihaulla. Jos jokainen sana on vähintään kolmen merkin pituinen, osuma kelpaa myös yhdyssanan keskeltä (`search_text LIKE`), jolloin ”puuro” löytää ”Kaurapuuron”. Järjestys:
  1. nimet, joiden ensimmäinen sana on hakusana
  2. nimet, jotka alkavat hakusanalla
  3. muut.

  Jokaisessa ryhmässä raaka-aineet tulevat ennen koostettuja ruokia, lyhyemmät nimet ennen pidempiä ja lopuksi aakkosjärjestys. Tuloksia näytetään enintään 30. Omista ruoista haetaan nimen ja merkin alimerkkijonoilla.
- **Tulosrivi** näyttää energian perusteineen (kcal / 100 g), lähteen (Fineli) ja Finelin valmistustavan. Jos energia puuttuu, rivillä lukee ”Energiatieto puuttuu”, eikä tuotetta voi kirjata. Tulosten alla on lähdemaininta (THL, CC BY 4.0).
- **Ruokamitat.** Grammojen lisäksi tarjotaan Finelin kotitalousmitat: kpl S/M/L, valmistajan kpl, pieni, keskikokoinen ja iso annos, dl, rkl ja tl. Tekniset yksiköt (kg, l, 1000 kJ:n annos ym.) jätetään pois. Oletuksena on yksi keskikokoinen annos, jos tuotteella sellainen on.
- **Kirjaus.** Fineli-tuote kopioidaan `food`-tauluun (`source = fineli`, `source_ref` = Fineli-ID, oletusannoksena keskikokoinen annos) ensimmäisellä kirjauksella samassa transaktiossa kuin kirjaus. Myöhemmät kirjaukset käyttävät samaa kopiota. Jos kopion nimi, energia tai valmistustapa eroaa uudemmasta aineistosta, kopio päivitetään välimuistin tapaan (`fetched_at`). Kirjaus on tilannekuva, ja siihen tallennetaan valittu ruokamitta grammamäärineen (KIR-08). Skeema ei muutu.
- **Lisenssimaininta.** Tietolähteet-näkymä avataan Asetuksista. Siinä ovat THL:n suosittelema viite julkaisun mukaan, käyttöehdot (CC BY 4.0), tehdyt muutokset (kJ → kcal, nimet pienin kirjaimin, mukana vain osa tiedoista), THL:n vastuunrajaus sekä maininta, ettei sovellus ole THL:n tuottama tai suosittelema eikä osa Finelin verkkopalvelua ja että Fineli on THL:n rekisteröity tavaramerkki.
- **Testit.** Muunnosta testataan Noden omalla testiajurilla (`node --test`) keksityllä pienellä esimerkkipaketilla (`scripts/fineli/fixture/`), joten uutta riippuvuutta ei tarvita. Sovelluksen testit rakentavat samasta paketista `fineli.db`:n ja liittävät sen better-sqlite3-yhteyteen.

## Seuraukset

- Sovelluspaketti kasvaa noin 1,8 Mt. Ensimmäinen käynnistys kopioi tiedoston, myöhemmät vain tarkistavat version.
- Uusi Fineli-julkaisu: lataa paketti, aja `npm run fineli:convert -w scripts -- <zip> --year <vuosi>` ja commitoi `app/assets/fineli/`. Sovellus korvaa vanhan kopion seuraavassa käynnistyksessä, eivätkä aiemmat kirjaukset muutu.
- Fineli-kopioita ei vielä näytetä omissa ruoissa, eikä niitä voi merkitä suosikiksi tai lisätä aterioihin. Tämä arvioidaan, kun OFF-tuotteet tulevat samaan välimuistiin (vaihe 4).

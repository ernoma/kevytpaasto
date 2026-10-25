# 0007 – Testaus Android-emulaattorilla ja Maestrolla

Päiväys: 25.10.2026  
Tila: hyväksytty  
Liittyy: toteutussuunnitelman luku 9, kriteerit 1, 8, 9 ja 12, LAA-04…LAA-06

## Tausta

Vaiheessa 0 kaikki käyttöliittymän tarkistukset tehtiin kehittäjän puhelimessa Expo Go:lla. Se oli hidasta, koska jokainen muutos vaati kehittäjän kokeilun. Tavoitteena on, että Claude todentaa mahdollisimman paljon itse ja puhelimelle jää vain se, mitä emulaattorilla ei voi todentaa.

## Päätös

- **Android-emulaattori** (Android Studion virtuaalilaite, x86_64, kiihdytys Windows Hypervisor Platformilla) ajaa sovellusta Expo Go:ssa samalla tavalla kuin puhelin. Claude käynnistää sen, ottaa kuvakaappauksia, säätää tekstin kokoa ja lentotilaa sekä napauttaa näyttöä adb:n ja Maestron kautta.
- **Maestro** ajaa käyttöpolkujen testit hakemistosta `app/e2e/`. Testit avaavat sovelluksen Expo Go:ssa osoitteella `exp://10.0.2.2:8081` (emulaattorin alias isäntäkoneelle), joten development buildia ei tarvita. Osoite `10.0.2.2` ei vaadi adb reverseä. Ensimmäisessä kokeilussa `exp://127.0.0.1:8081` jäi lataamaan, todennäköisesti koska Windowsin palomuurin lupaikkuna Metrolle oli vielä kuittaamatta.
- **Komennot** (juuressa, toteutus `scripts/android/`):
  - `npm run emulator` käynnistää virtuaalilaitteen ja odottaa käynnistymistä.
  - `npm run e2e` ajaa Maestro-testit. Metron on oltava käynnissä (`npx expo start` hakemistossa `app/`).
  - `npm run device -- screenshot|font <koko>|offline|online|open` tekee kuvakaappauksen ja säätää laitteen asetuksia. `font` käynnistää Expo Go:n uudelleen, koska käynnissä oleva sovellus ei huomaa muuttunutta tekstikokoa.
- Maestro-testien yhteiset aliflow't ovat hakemistossa `app/e2e/subflows/`. Esimerkiksi `open-app.yaml` avaa sovelluksen ja sulkee Expo Go:n kehitysvalikon, jos se on auki.
- SDK:n sijainti luetaan `ANDROID_HOME`-muuttujasta ja Maestron sijainti `MAESTRO_BIN`-muuttujasta. Kummallekin on oletussijainti. Kehittäjän koneella `ANDROID_HOME=F:\Android\Sdk` ja Maestro 2.11.0 sijaitsee kansiossa `%LOCALAPPDATA%\maestro`. Skriptit kytkevät Maestron ja Expon telemetrian pois.
- Flow't, jotka tarvitsevat tyhjän tilan, alkavat aliflow'lla `subflows/fresh-start.yaml`. Se tyhjentää Expo Go:n tiedot (`clearState`), jolloin myös sovelluksen tietokanta tyhjenee.
- Maestro kirjoittaa `takeScreenshot`-kuvat ajokohtaiseen hakemistoon `<tuloshakemisto>/<flow>/takeScreenshot/`. `npm run e2e` ohjaa ajon lokit hakemistoon `app/e2e/output/last-run/` (korvataan joka ajossa) ja kopioi kuvat tiedostoiksi `app/e2e/output/<nimi>.png`, myös epäonnistuneesta ajosta. Flow't käyttävät pelkkää nimeä (`takeScreenshot: overage`).
- Paikalliset polut (`ANDROID_HOME`, `MAESTRO_BIN`) voi asettaa juuren `.env`-tiedostoon, jota ei viedä versionhallintaan (malli: `.env.example`). Komentotulkissa asetettu muuttuja voittaa.
- Expo Go:n kehitysvalikon kelluva painike peittää näkymän oikean yläkulman. Flow't napauttavat yläpalkin painikkeita niiden vasemmasta reunasta.
- `npm run check` ei aja Maestroa, koska se vaatii käynnissä olevan emulaattorin ja Metron. Claude ajaa `npm run e2e`:n aina, kun muutos koskee käyttöliittymää.

## Mitä puhelimella testataan edelleen

- Viivakoodin luku oikealla kameralla (emulaattorin kamera on virtuaalinen).
- Tuntuma, nopeus ja kosketusalueiden käytettävyys oikealla kädellä.
- TalkBack-ruudunlukija (emulaattorissa mahdollinen, mutta kömpelö).
- Vaiheen lopussa yksi kokeilu puhelimella ennen kuin vaihe merkitään valmiiksi.

## Seuraukset

- Emulaattori on hidas kehittäjän koneella (i5-4690K): käynnistys noin minuutin ja ensimmäinen latauskerta useita minuutteja. Emulaattori kannattaa pitää käynnissä koko session ajan.
- Maestro-testien tekstihaut käyttävät `strings.fi.ts`:n tekstejä. Kun teksti muuttuu, testi on päivitettävä.
- Kuvakaappaukset tallentuvat hakemistoon `app/e2e/output/`, jota ei viedä versionhallintaan.
- Vaihe 2b: Metro ei seuraa hakemistoa `app/e2e/output/` (`resolver.blockList`). Ilman rajausta Metro käytti joutoajallakin noin puolitoista ydintä. Emulaattorin järjestelmä alkoi silloin antaa ANR-ilmoituksia (”System UI isn't responding”), ja kerran emulaattori kaatui kesken ajon. Ilmoitus peittää sovelluksen, ja testi epäonnistuu syystä, joka ei liity sovellukseen.
- Expo Go voi avata kehitysvalikon vasta sovelluksen latauduttua. `subflows/fresh-start.yaml` sulkee valikon myös silloin. Omat ruoat ja ateriat avataan flow'issa Lisää-näkymän kautta, ei yläpalkin Asetukset-painikkeesta.

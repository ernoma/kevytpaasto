# 0006 – Avoin lähdekoodi, ei ansaintaa

Päiväys: 25.10.2026  
Tila: hyväksytty  
Liittyy: ANS-01, ANS-02, AVO-01…AVO-04, kriteeri 13  
Korvaa: toteutussuunnitelman 0.3 luvun 10 (ansaintavalmius, `entitlements`)

## Tausta

Vaatimusmäärittely 0.2 edellytti, että sovellukseen voidaan lisätä myöhemmin maksullisia ominaisuuksia tai muita tulonlähteitä (ANS-03–ANS-10). Suunnitelmassa tätä varten oli käyttöoikeusrajapinta `entitlements`, jota ei ollut vielä toteutettu. Kehittäjä päätti 25.10.2026, ettei maksullisia ominaisuuksia toteuteta ja että projektista tehdään avoimen lähdekoodin ja avoimen teknologian projekti. Vaatimusmäärittely päivitettiin versioon 0.3.

## Päätös

- **Lisenssi GPL-3.0-or-later** koko monorepolle (sovellus, välityspalvelu, skriptit). Copyleft pitää muutetut versiot avoimina ja on yhteensopiva F-Droidin kanssa. AGPL:ää välityspalvelulle ei valittu, koska palvelu on pieni eikä siinä ole muuta kuin OFF-välitystä; päätöstä voi tarkentaa ennen repon avaamista.
- **Ei ansaintaa:** ei maksullisia ominaisuuksia, ostopolkuja, mainontaa, kumppanilinkkejä eikä analytiikkaa. `entitlements`-rajapintaa ei toteuteta, ja sen tuontirajoitus poistettiin ESLint-asetuksista.
- **Nykyiset suljetut riippuvuudet säilyvät v1:ssä:** Google ML Kit viivakoodin luvussa (`expo-camera`, [0002](0002-kokeilu-viivakoodin-luku.md)), Google Play -jakelu ja Cloudflare Workers välityspalvelun alustana. Avoimet vaihtoehdot (ZXing-pohjainen lukija, F-Droid, käännös ilman EAS-pilveä, välityspalvelun ajo omalla palvelimella) arvioidaan vaiheen 7 jälkeen (AVO-04).

## Seuraukset

- Juureen lisätään `LICENSE` (GPL-3.0:n teksti) ja README, ja `package.json`-tiedostojen `license`-kenttä on `GPL-3.0-or-later`.
- Repo on tarkoitus avata julkiseksi viimeistään vaiheessa 7. Siksi siihen ei tallenneta tunnuksia, avaimia tai henkilökohtaisia yhteystietoja, ja Git-historia tarkistetaan salaisuuksien varalta ennen avaamista.
- Välityspalvelun osoite ja `User-Agent`-otsakkeen yhteystieto tulevat konfiguraatiosta, jotta itse kääntäjä voi käyttää omaa välityspalveluaan tai jättää OFF-julkaisun pois käytöstä.
- Uusien riippuvuuksien lisenssin on oltava GPL-3.0:n kanssa yhteensopiva.
- Hyväksymiskriteeri 13 todennetaan katselmoimalla riippuvuudet, skannaamalla salaisuudet ja kääntämällä sovellus READMEn ohjeella.

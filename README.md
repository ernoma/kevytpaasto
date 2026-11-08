# Kevytpaasto

Maksuton ja avoimen lähdekoodin puhelinsovellus 5:2-paaston paastopäivien kalorikirjanpitoon. Päiväkirja pysyy puhelimessa: sovelluksessa ei ole käyttäjätilejä, mainontaa, maksullisia ominaisuuksia eikä analytiikkaa.

Sovellus on kehitysvaiheessa. Vaatimukset ovat tiedostossa [5-2-paasto-vaatimusmaarittely.md](5-2-paasto-vaatimusmaarittely.md) ja tekninen suunnitelma tiedostossa [docs/toteutussuunnitelma.md](docs/toteutussuunnitelma.md).

## Kääntäminen ja ajaminen

Vaatii Node.js 22.13+.

```bash
npm install
npm run check
cd app && npx expo start
```

Sovellus avautuu puhelimen Expo Go -sovelluksessa (SDK 58) tai development buildissa. Käyttöliittymätestit ajetaan Android-emulaattorissa Maestrolla (`npm run emulator`, `npm run e2e`); komennot on kuvattu tiedostossa [docs/adr/0007-emulaattoritestaus.md](docs/adr/0007-emulaattoritestaus.md). Työkalujen asennus ja kehityksen siirto toiselle koneelle on kuvattu tiedostossa [docs/kehitysymparisto.md](docs/kehitysymparisto.md). Kehittäjän tunnuksia ei tarvita. Tuotteiden julkaisu Open Food Factsiin edellyttää erillistä välityspalvelua (`proxy/`) omine OFF-tunnuksineen. Kaikki Open Food Factsin kutsut tehdään testiympäristöön (`https://world.openfoodfacts.net`), ja muutos muuhun Open Food Factsin palvelun osoitteeseen vaatii projektin kehittäjän nimenomaisen päätöksen, ks. [docs/adr/0011-off-testiymparisto-ennen-julkaisua.md](docs/adr/0011-off-testiymparisto-ennen-julkaisua.md).

## Tietolähteet

- **Fineli**: Terveyden ja hyvinvoinnin laitos (THL), Kansanterveyden edistäminen -yksikkö. Fineli. Elintarvikkeiden koostumustietokanta. Versio 20. Helsinki 2019. https://www.fineli.fi. Käyttöehdot: [Creative Commons Nimeä 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.fi). Sovelluksen mukana oleva `app/assets/fineli/fineli.db` on muunnettu aineistosta: energia kJ → kcal, nimet pienin kirjaimin, mukana vain nimi, energia, valmistustapa ja ruokamitat. Muunnos: `npm run fineli:convert -w scripts -- <paketti.zip> --year 2019`, ks. [docs/adr/0010-fineli-aineisto-ja-haku.md](docs/adr/0010-fineli-aineisto-ja-haku.md). THL ei vastaa tiedoissa mahdollisesti esiintyvistä virheistä. Fineli on THL:n rekisteröity tavaramerkki.
- **Open Food Facts**: tietokanta ODbL, sisältö Database Contents License, kuvat CC BY-SA.

Sovellus ei ole THL:n eikä Open Food Factsin tuottama tai suosittelema palvelu.

## Osallistuminen

Virheilmoitukset ja ideat ovat tervetulleita GitHubin issueina. Pull requesteja ei toistaiseksi oteta vastaan, ks. [CONTRIBUTING.md](CONTRIBUTING.md). Haavoittuvuuksista ilmoitetaan yksityisesti, ks. [SECURITY.md](SECURITY.md).

## Lisenssi

GPL-3.0-or-later, ks. [LICENSE](LICENSE). Tietolähteiden aineistoihin sovelletaan niiden omia lisenssejä.

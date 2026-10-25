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

Sovellus avautuu puhelimen Expo Go -sovelluksessa (SDK 57) tai development buildissa. Kehittäjän tunnuksia ei tarvita. Tuotteiden julkaisu Open Food Factsiin edellyttää erillistä välityspalvelua (`proxy/`) omine OFF-tunnuksineen.

## Tietolähteet

- **Fineli**, Terveyden ja hyvinvoinnin laitos (THL): elintarvikkeiden koostumustietokanta, lisenssi CC BY 4.0.
- **Open Food Facts**: tietokanta ODbL, sisältö Database Contents License, kuvat CC BY-SA.

Sovellus ei ole THL:n eikä Open Food Factsin palvelu.

## Lisenssi

GPL-3.0-or-later, ks. [LICENSE](LICENSE). Tietolähteiden aineistoihin sovelletaan niiden omia lisenssejä.

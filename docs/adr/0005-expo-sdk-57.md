# 0005 – Expo SDK 57 SDK 58:n sijaan

Päiväys: 18.10.2026  
Tila: hyväksytty  
Korvaa osittain: [0001](0001-projektipohja.md) (SDK-versio)

## Tausta

Vaihe 0 tehtiin Expo SDK 58:lla. Kehittäjän Android-puhelimeen Play-kaupasta asentunut Expo Go ei tue SDK 58:aa (”Project is incompatible with this version of Expo Go”). Expon sivun mukaan Play-kaupan Expo Go on jo SDK 58 -versio, joten päivitys ei ollut vielä tullut kyseiseen puhelimeen. Kehittäjä päätti siirtyä SDK 57:ään sen sijaan, että Expo Go asennettaisiin USB:n kautta.

## Päätös

- **Expo SDK 57** (expo 57.0.x), React Native 0.86, React 19.2, `eslint-config-expo` 57. Versiot on kohdistettu komennolla `npx expo install --fix`.
- Muut vaiheen 0 ratkaisut pysyvät ennallaan: reitit hakemistossa `app/src/app/`, Drizzle 0.45, expo-sqlite, Vitest, Node 22.13+.
- Viivakoodikokeilun API on SDK 57:ssä sama (`CameraView`, `barcodeScannerSettings`, `onBarcodeScanned`, `useCameraPermissions`; EAN-13, EAN-8, UPC-A ja UPC-E), ja moduuli sisältyy Expo Goon.

## Seuraukset

- Sovellus avautuu Play-kaupan Expo Go -versiolla, joka tukee SDK 57:ää.
- SDK 58:aan päivitetään myöhemmin omana tehtävänään (`npx expo install expo@^58 --fix`), kun Expo Go tukee sitä kehittäjän puhelimessa tai kun siirrytään development buildiin. Päivitys tehdään viimeistään ennen Google Play -julkaisua (vaihe 7).
- Monorepossa React-versioita saa olla vain yksi; SDK-vaihdon jälkeen lukitustiedosto luodaan uudelleen ja tarkistetaan komennolla `npm ls react`.

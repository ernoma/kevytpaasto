# 0008 – Paluu Expo SDK 58:aan

Päiväys: 25.10.2026  
Tila: hyväksytty  
Korvaa: [0005](0005-expo-sdk-57.md) (SDK-versio)

## Tausta

Muistiossa 0005 siirryttiin SDK 57:ään, koska kehittäjän puhelimen Expo Go ei vielä tukenut SDK 58:aa. Nyt puhelimen Expo Go on päivittynyt SDK 58 -versioon, eikä se enää avaa SDK 57 -projektia (”Project is incompatible with this version of Expo Go … The installed version of Expo Go is for SDK 58”). Muistio 0005 edellytti päivitystä tässä tilanteessa.

## Päätös

- **Expo SDK 58** (expo 58.0.x), React Native 0.88, React 19.3, `eslint-config-expo` 58. Versiot on kohdistettu komennoilla `npx expo install expo@^58` ja `npx expo install --fix`.
- Lukitustiedosto luotiin uudelleen tyhjästä, ja React- ja React Native -versioita on puussa vain yksi (`npm ls react react-native`).
- Muut ratkaisut pysyvät ennallaan. Koodiin ei tarvittu muutoksia: `npm run check` ja `npx expo-doctor` menevät läpi.

## Seuraukset

- Emulaattorin Expo Go on oltava SDK 58 -versio. Komento `npx expo start --android` asentaa oikean version emulaattoriin.
- Expo Go 58 pyytää Android 17:ssä lähiverkon käyttöoikeuden (`ACCESS_LOCAL_NETWORK`). Ilman sitä yhteys Metroon (`10.0.2.2:8081` emulaattorissa, lähiverkon osoite puhelimessa) aikakatkaistaan, ja Expo Go näyttää virheen ”Failed to download remote update”. Adb-komentotulkki pääsee Metroon ilman oikeutta, joten `nc`-kokeilu ei paljasta ongelmaa.
- Maestron `clearState` peruu oikeuden. Siksi aliflow `subflows/fresh-start.yaml` tyhjentää tiedot `launchApp`-komennolla (`clearState: true`, `permissions: all: allow`), joka myöntää oikeudet uudelleen. Käsin oikeuden voi myöntää komennolla `adb shell pm grant host.exp.exponent android.permission.ACCESS_LOCAL_NETWORK`.
- Muistion 0005 kohta ”päivitetään viimeistään ennen Google Play -julkaisua” on hoidettu.

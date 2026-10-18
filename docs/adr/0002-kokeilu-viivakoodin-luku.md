# 0002 – Kokeilu: viivakoodin luku puhelimella

Päiväys: 18.10.2026  
Tila: suunniteltu (kokeilu tekemättä)  
Liittyy: HAK-01, HAK-05, HAK-07, KAY-04, vaihe 4

## Tausta

Viivakoodihaku on tuotehaun nopein polku. Ennen vaihetta 4 halutaan tietää, lukeeko kirjasto suomalaisten pakkausten EAN-koodit luotettavasti kehittäjän omalla Android-puhelimella ja miten kameralupa käyttäytyy.

## Ajantasainen tieto (tarkistettu 18.10.2026)

- Expo SDK 57:ssä ja 58:ssa viivakoodin luku tehdään `expo-camera`-paketin `CameraView`-komponentilla: `barcodeScannerSettings={{ barcodeTypes: [...] }}` ja `onBarcodeScanned`. Lupa pyydetään `useCameraPermissions`-koukulla.
- Tuetut tyypit sisältävät kauppatuotteiden koodit `ean13`, `ean8`, `upc_a` ja `upc_e`.
- Androidilla luku perustuu Google ML Kitiin. Moduuli sisältyy Expo Go -sovellukseen, joten kokeilu ei vaadi development buildia. Kamera toimii vain fyysisellä laitteella.
- Konfiguraatiolisäosan `barcodeScannerEnabled`-asetus vaikuttaa Androidilla vain, jos `expo-camera` käännetään lähdekoodista; oletuksena lukija on mukana.

Lähteet: https://docs.expo.dev/versions/v57.0.0/sdk/camera/ ja https://docs.expo.dev/versions/v58.0.0/sdk/camera/ (projekti käyttää SDK 57:ää, ks. [0005](0005-expo-sdk-57.md))

## Kokeilusuunnitelma

1. Lisää erilliseen kokeiluhaaraan `npx expo install expo-camera` ja väliaikainen reitti `src/app/kokeilu-viivakoodi.tsx`, joka näyttää luetun koodin ja tyypin. Tyypeiksi rajataan `ean13`, `ean8`, `upc_a`, `upc_e`.
2. Avaa sovellus Expo Go:ssa omalla puhelimella (`npx expo start`, QR-koodi).
3. Testaa vähintään 20 eri pakkausta (tölkki, kaareva pullo, kiiltävä muovi, pieni EAN-8, heikko valaistus). Kirjaa onnistumiset, lukuaika ja virheelliset luvut.
4. Testaa luvan epääminen ja ”älä kysy uudelleen”: sovelluksen on tarjottava käsin syöttö (HAK-05), eikä lupaa pyydetä ennen lukijan avaamista (KAY-04).
5. Tarkista, että sama koodi ei laukaise useita lukuja peräkkäin (lukija pysäytetään ensimmäiseen tulokseen).
6. Kokeile UPC-A/EAN-13-normalisointia: OFF tallentaa koodit pääsääntöisesti EAN-13-muodossa, joten 12-numeroinen UPC-A täydennetään etunollalla ennen hakua (HAK-07).

## Hyväksymisraja

Vähintään 95 % testipakkauksista luetaan alle 2 sekunnissa ilman virheellistä koodia. Jos raja ei täyty, arvioidaan vaihtoehtoinen kirjasto (esim. react-native-vision-camera + koodinlukija), mikä vaatii development buildin.

## Tulokset

Täydennetään kokeilun jälkeen.

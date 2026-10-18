# 0002 – Kokeilu: viivakoodin luku puhelimella

Päiväys: 18.10.2026  
Tila: hyväksytty (kokeilu tehty 18.10.2026, mittaustiedot jäivät saamatta)  
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

1. Lisää `npx expo install expo-camera` ja väliaikainen reitti `src/app/kokeilu-viivakoodi.tsx`, joka näyttää luetun koodin ja tyypin. Tyypeiksi rajataan `ean13`, `ean8`, `upc_a`, `upc_e`.
2. Avaa sovellus Expo Go:ssa omalla puhelimella (`npx expo start`, QR-koodi).
3. Testaa vähintään 20 eri pakkausta (tölkki, kaareva pullo, kiiltävä muovi, pieni EAN-8, heikko valaistus). Kirjaa onnistumiset, lukuaika ja virheelliset luvut.
4. Testaa luvan epääminen ja ”älä kysy uudelleen”: sovelluksen on tarjottava käsin syöttö (HAK-05), eikä lupaa pyydetä ennen lukijan avaamista (KAY-04).
5. Tarkista, että sama koodi ei laukaise useita lukuja peräkkäin (lukija pysäytetään ensimmäiseen tulokseen).
6. Kokeile UPC-A/EAN-13-normalisointia: OFF tallentaa koodit pääsääntöisesti EAN-13-muodossa, joten 12-numeroinen UPC-A täydennetään etunollalla ennen hakua (HAK-07).

## Hyväksymisraja

Vähintään 95 % testipakkauksista luetaan alle 2 sekunnissa ilman virheellistä koodia. Jos raja ei täyty, arvioidaan vaihtoehtoinen kirjasto (esim. react-native-vision-camera + koodinlukija), mikä vaatii development buildin.

## Tulokset (18.10.2026)

Kokeilu tehtiin kehittäjän Android-puhelimella Expo Go:ssa (SDK 57) kokeilunäkymällä `src/app/kokeilu-viivakoodi.tsx`. Koodi luettiin kokeilua varten päähaarassa, ja reitti näkyy vain kehitystilassa.

- **Luku:** noin 20 pakkausta luettiin kameralla. Kehittäjän arvion mukaan luku oli nopeaa ja luotettavaa, eikä virheellisiä koodeja havaittu. Talteen jäänyt rivi (`ean13` 4006000200088) normalisoitui oikein.
- **Mittaustulokset jäivät saamatta.** Kokeilunäkymä piti tuloksia vain muistissa, ja ne hävisivät kesken kokeilun. Todennäköinen syy on vaihe 4: kun kameralupa poistetaan järjestelmän asetuksista, Android lopettaa sovelluksen prosessin. Muita mahdollisia syitä ovat Expo Go:n lopettaminen taustalla tai sovelluksen sulkeminen.
- **Lukuaika-mittari oli virheellinen:** ajanotto alkoi kameran avaamisesta tai *Lue seuraava* -painalluksesta, joten se sisälsi tähtäämisen ja muun odotuksen. Ainoan säilyneen rivin 18,6 s ei kuvaa tunnistusnopeutta.
- Hyväksymisrajaa (95 % alle 2 s) ei siis voitu todentaa mittaamalla. Laadullinen tulos tukee rajan täyttymistä.

## Päätös

- Vaiheessa 4 käytetään `expo-camera`-lukijaa (`CameraView`, ML Kit). Vaihtoehtoista kirjastoa ei arvioida, ellei vaiheen 4 käyttö osoita ongelmia.
- **Opittua vaiheeseen 4:** sovelluksen prosessi voi päättyä kesken lukemisen (luvan muutos asetuksissa, muistin vapautus taustalla). Luettu viivakoodi ja keskeneräinen lomake on siksi tallennettava pysyvästi heti, jotta tieto ei katoa (HAK-06, LAA-05).
- Jos lukunopeus halutaan mitata, mittari aloitetaan vasta, kun koodi on kameran näkökentässä, tai mitataan aika ensimmäisestä havainnosta hyväksyttyyn lukuun. Tämä voidaan tehdä vaiheessa 4 tarvittaessa.
- Kokeilureitti poistetaan, kun vaihe 4 toteuttaa varsinaisen lukijan.

# 0009 Migraatiotiedostot ja Metron välimuisti

Päiväys: 25.10.2026  
Tila: hyväksytty

## Tausta

Drizzle-migraatiot ovat `.sql`-tiedostoja, jotka `babel-plugin-inline-import` kopioi merkkijonoina tiedostoon `src/db/migrations/migrations.js`. Metro tallentaa muunnoksen välimuistiin `migrations.js`-tiedoston oman sisällön perusteella. Siksi `.sql`-tiedoston muutos ei mitätöi välimuistia.

Vaiheessa 2a migraation 0001 generoitu `INSERT ... SELECT` korjattiin (drizzle-kitin uudelleenrakennusvirhe). Metro tarjosi silti emulaattorille korjausta edeltävää versiota. Vaiheen 2b päivitystesti paljasti tämän: emulaattorin kanta tasolla 0000 ei käynnistynyt, vaan näkyi virhe ”no such column”. Vitest lukee `.sql`-tiedostot suoraan, joten se ei havainnut ongelmaa.

## Päätös

- `app/metro.config.js` asettaa `cacheVersion`-arvoksi kaikkien `.sql`-migraatioiden tiivisteen. Kun migraatio muuttuu, Metron muunnosvälimuisti vanhenee seuraavassa käynnistyksessä.
- Kun migraatiota muutetaan, Metro käynnistetään uudelleen. Vanha välimuisti ei tyhjene, ennen kuin Metro käynnistetään uusilla asetuksilla. Ensimmäisellä kerralla tämän muutoksen jälkeen käytetään valintaa `npx expo start --clear`. Jo käynnissä oleva Metro ei lue asetuksia uudelleen.
- Uusi migraatio todennetaan emulaattorissa päivityksenä. Kanta rakennetaan edellisen commitin koodilla ilman tilan tyhjennystä, ja sen jälkeen sovellus avataan uudella koodilla. Tyhjästä kannasta ajettu e2e ei riitä.

## Seuraukset

- Välimuisti tyhjenee kokonaan aina, kun jokin migraatio muuttuu. Tämä on harvinaista, ja ensimmäinen käännös kestää noin minuutin.
- Epäonnistunut migraatio peruuntui kokonaan, eikä kanta jäänyt puolivalmiiseen tilaan. Sama kanta päivittyi virheittä, kun Metro tarjosi korjatun migraation. Jos puhelimen Expo Go on avannut sovelluksen vaiheen 2a jälkeen, se on saanut saman virheen, ja se korjautuu Metron uudelleenkäynnistyksellä.

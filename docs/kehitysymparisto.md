# Kehitysympäristö

Tämä ohje kertoo, mitä kehityskoneelle asennetaan ja miten kehitys siirretään toiselle koneelle. Projektia kehitetään x64-Windowsilla Claude Coden kanssa. Macissa ja Linuxissa skriptien oletuspolut ovat toiset (`scripts/android/tools.ts`), ja ARM-koneen emulaattori tarvitsee arm64-järjestelmäkuvan.

## Työkalut

Versiot ovat kehittäjän koneelta 8.11.2026.

| Työkalu | Versio | Huomiot |
| --- | --- | --- |
| Git for Windows | uusin | Claude Code käyttää sen Git Bashia. Ensimmäinen push avaa GitHub-kirjautumisen (Git Credential Manager). |
| Node.js | 24 (vähintään 22.13) | Päätösmuistio 0008. |
| Java | 17 tai uudempi | Maestro tarvitsee Javan. Aseta `JAVA_HOME`. |
| Android Studio ja Android SDK | – | SDK oletuspaikkaan `%LOCALAPPDATA%\Android\Sdk`. Paketit: Android SDK Platform-Tools, Android Emulator ja järjestelmäkuva API 37 (x86_64). |
| Maestro | 2.11.0 | Pura niin, että käynnistin on `%LOCALAPPDATA%\maestro\bin\maestro.bat`. |
| gitleaks | 8.30.1 | `winget install --id Gitleaks.Gitleaks -e` |
| Claude-sovellus | – | Kirjaudu samalla tilillä. `app/.claude/settings.json` ottaa Expo-pluginin käyttöön. |

Skriptit löytävät SDK:n, Maestron ja gitleaksin näistä oletuspaikoista. Muualle asennetun työkalun polku asetetaan juuren `.env`-tiedostoon (`ANDROID_HOME`, `MAESTRO_BIN`, `GITLEAKS_BIN`; malli `.env.example`), jota ei viedä versionhallintaan. Komentotulkissa asetettu muuttuja voittaa.

Asenna GitHubin julkaisuista ladattavat työkalut (Maestro, gitleaks) itse tavallisessa päätteessä, koska Clauden sandboxissa julkaisutiedostojen lataus epäonnistuu (HTTP 504). Käynnistä Claude-sovellus asennusten jälkeen uudelleen, jotta se näkee päivittyneen PATHin.

## Emulaattori

- Ota käyttöön virtualisointi koneen UEFI-asetuksista ja Windowsin ominaisuus Windows Hypervisor Platform (päätösmuistio 0007).
- Luo Android Studion Device Managerissa virtuaalilaite, esimerkiksi Medium Phone ja API 37 (x86_64). `npm run emulator` käynnistää ensimmäisen virtuaalilaitteen tai sen, jonka muuttuja `KEVYT_AVD` nimeää.
- Anna virtuaalilaitteelle vähintään 2 ydintä ja 2 Gt muistia, mieluiten enemmän. Ylikuormittunut emulaattori antaa ANR-ilmoituksia (”System UI isn't responding”), jotka kaatavat Maestro-ajoja.
- Valitse mieluiten järjestelmäkuva ilman Play Kauppaa (Google APIs). Play Kaupan taustapäivitykset sulkevat Expo Go:n kesken ajon. Expo Go asennetaan Expon palvelimelta eikä Play Kaupasta.
- Asenna Expo Go virtuaalilaitteeseen: käynnistä Metro hakemistossa `app/` (`npx expo start`) ja paina `a`.
- Kun Windowsin palomuuri kysyy lupaa ensimmäisellä `npx expo start` -kerralla, salli Node.js yksityisissä verkoissa. Muuten puhelin ja emulaattori eivät saa yhteyttä Metroon.

## Kloonin asetukset

```bash
git clone https://github.com/ernoma/kevytpaasto.git
cd kevytpaasto
```

Tee nämä heti, ennen ensimmäistä Claude-sessiota:

1. **Commitin sähköposti.** Repo on julkinen, joten commitin tekijän osoite on GitHubin noreply-osoite (`…@users.noreply.github.com`, AVO-03). Globaali Git-asetus voi olla henkilökohtainen osoite. Claude commitoi ja pushaa kysymättä, eikä gitleaks tarkista tekijätietoja. Ensimmäinen komento ottaa osoitteen viimeisimmästä commitista, ja toinen näyttää sen. Tarkista, että tulos on noreply-osoite:

   ```bash
   git config user.email "$(git log -1 --format=%ae)"
   git config user.email
   ```

   Lisäsuojaksi GitHubin asetus ”Block command line pushes that expose my email” (Settings → Emails) hylkää pushin, jos commitissa on yksityinen osoite.

2. **Pre-push-koukku**, joka ajaa gitleaksin pushattaville commiteille (päätösmuistio 0014):

   ```bash
   git config core.hooksPath .githooks
   ```

3. **Riippuvuudet ja tarkistukset:**

   ```bash
   npm install
   npm run check
   npm run secrets
   cd app && npx expo-doctor
   ```

## Siirto toiselta koneelta

Koodi ja dokumentaatio tulevat GitHubista. Tarkista vanhalla koneella juuri ennen siirtoa, että `git status` on puhdas, `git log origin/main..main` on tyhjä eikä `git stash list` näytä mitään. Pidä vanha kone käyttökunnossa, kunnes uusi on todennettu.

Näitä ei viedä versionhallintaan, joten ne siirretään käsin:

| Mitä | Missä | Miksi |
| --- | --- | --- |
| Clauden muisti | `%USERPROFILE%\.claude\projects\<polku>\memory\` | Claude Coden muistiinpanot tästä projektista. |
| Expon tunniste | `%USERPROFILE%\.expo\state.json` | Puhelimen Expo Go:ssa olevat tiedot pysyvät näkyvissä (ks. alla). |
| Finelin lähdepaketti | `scripts\fineli\data\` | Kehittäjän selaimella lataama peruspaketti `Fineli_Rel20.zip` (päätösmuistio 0010). Tarvitaan vain, jos muunnos ajetaan uudelleen. fineli.fi estää skriptien lataukset (päätösmuistio 0003). |

`<polku>` on repon polku niin, että kaikki muut merkit kuin kirjaimet ja numerot on korvattu viivalla: `F:\harrastus\kevytpaasto` → `F--harrastus-kevytpaasto`. Jos repo on uudella koneella samassa polussa, kansion nimi pysyy samana. Jos et ole varma nimestä, avaa projekti kerran Claude-sovelluksessa, jolloin kansio syntyy.

Kopioi tiedostot vanhalla koneella siirtokansioon (PowerShell, repon juuressa):

```powershell
$slug = (Get-Location).Path -replace '[^A-Za-z0-9]', '-'
$d = "$env:USERPROFILE\kevytpaasto-siirto"
New-Item -ItemType Directory -Force $d | Out-Null
Copy-Item -Recurse -Force "$env:USERPROFILE\.claude\projects\$slug\memory" $d
Copy-Item -Force "$env:USERPROFILE\.expo\state.json" $d
Copy-Item -Recurse -Force scripts\fineli\data "$d\fineli-data"
```

Kopioi siirtokansio uudelle koneelle samaan paikkaan ja palauta tiedostot uuden kloonin juuressa ennen ensimmäistä `npx expo start` -ajoa:

```powershell
$slug = (Get-Location).Path -replace '[^A-Za-z0-9]', '-'
$d = "$env:USERPROFILE\kevytpaasto-siirto"
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\projects\$slug", "$env:USERPROFILE\.expo" | Out-Null
Copy-Item -Recurse -Force "$d\memory" "$env:USERPROFILE\.claude\projects\$slug"
Copy-Item -Force "$d\state.json" "$env:USERPROFILE\.expo\state.json"
Copy-Item -Recurse -Force "$d\fineli-data" scripts\fineli\data
```

Näitä ei siirretä:

- `node_modules`, `app/.expo` ja `app/e2e/output`, jotka syntyvät uudelleen.
- Claude-sovelluksen keskusteluhistoria. Projektin tieto on repossa ja muistissa.
- `.env`, koska polut ovat koneen omia. Tiedosto tehdään uudelleen vain, jos jokin työkalu on muualla kuin oletuspaikassa.
- Kehittäjän paikallinen kopio OFF:n datasta (päätösmuistio 0011), joka ei ole tässä repossa. Jos sitä käytetään, se siirretään erikseen.

Claude-sovelluksen koneen omat asetukset, kuten ilmoitukset ja ”Keep computer awake while Claude works”, valitaan uudelleen. Tilin asetukset seuraavat kirjautumista.

### Puhelimen tiedot Expo Go:ssa

Expo Go tallentaa projektin tiedot, myös tietokannan, avaimen `@anonymous/kevytpaasto-<uuid>` alle. Kun projektia ei ole liitetty EAS-projektiin, Expo CLI lukee `uuid`:n kehityskoneen tiedostosta `%USERPROFILE%\.expo\state.json` (`ExpoGoManifestHandlerMiddleware`). Uusi kone luo uuden tunnisteen, jolloin sovellus avautuu puhelimessa tyhjänä. Vanhat tiedot säilyvät puhelimessa, mutta ne eivät näy.

- Kopioi `state.json` ennen ensimmäistä `npx expo start` -ajoa. Jos uudella koneella on jo kirjauduttu Expoon, kopioi vain `uuid`-kenttä, koska tiedostossa on silloin myös kirjautumistieto.
- Avaa sovellus puhelimessa uuden koneen QR-koodilla ja tarkista, että vanhat kirjaukset näkyvät, ennen kuin kirjaat mitään. Jos näkymä on tyhjä, kopioi vanha `state.json` paikalleen ja käynnistä Metro uudelleen.
- Avain voi vaihtua myös, jos projekti liitetään myöhemmin EAS-projektiin. Vaiheen 5 vienti ja palautus tekevät tietojen siirrosta riippumatonta kehityskoneesta.

## Todentaminen uudella koneella

1. `npm run check` ja `npm run secrets` menevät läpi.
2. Emulaattori ja Metro käynnistyvät, `npm run e2e` menee läpi, ja `npm run device` -komennot (`screenshot`, `font`, `offline`) toimivat.
3. Ensimmäisen commitin tekijän osoite on noreply-osoite, ja pushatessa pre-push-koukku ajaa gitleaksin.
4. Puhelimen vanhat kirjaukset näkyvät.
5. Clauden muistiinpanojen koneriippuvat tiedot (esim. SDK:n polku) ja päätösmuistion 0007 tiedot kehittäjän koneesta päivitetään.

## Muuta

- Älä sijoita repoa Dropbox- tai OneDrive-kansioon. Synkronointi hidastaa `node_modules`-hakemiston käsittelyä ja voi lukita tiedostoja, joita Metro käyttää.
- Windows 11:n Dev Drive nopeuttaa npm:ää ja Metroa.

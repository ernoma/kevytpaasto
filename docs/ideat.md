# Tulevaisuuden ideat

Tähän kootaan ideat, jotka eivät kuulu toteutussuunnitelman vaiheisiin 0–7. Idea ei ole päätös eikä vaatimus. Kun idea otetaan työn alle, siitä tehdään vaatimus, suunnitelman vaihe tai päätösmuistio, ja se poistetaan täältä.

Vaatimusmäärittelyn P2-vaatimukset pysyvät vaatimusmäärittelyssä: PAI-07 (viikkorytmi ja muistutukset) ja OFF-11 (pakkauskuvan tekstintunnistus).

Ajatukset, joita ei toteuteta lainkaan, eivät kuulu tänne. Esimerkiksi maksulliset ominaisuudet, mainonta ja analytiikka on rajattu pois (ANS-01, ANS-02, AVO-02).

## Alustat

### iOS-versio

Android on ensimmäinen alusta. iOS on tarkoitus kääntää samasta koodikannasta EAS Buildilla vaiheen 7 jälkeen, ja koodi pidetään siihen asti alustariippumattomana.

Selvitettävä ennen aloitusta:

- Miten iOS testataan. Nykyinen emulaattori- ja Maestro-testaus koskee vain Androidia (docs/adr/0007), ja iOS-simulaattori vaatii macOS:n.
- Apple Developer -tili, jota TestFlight ja App Store edellyttävät.
- Riittääkö Expo Go kokeiluun iPhonella, vai tarvitaanko development build.

## Open Food Facts

### OFF:n SDK oman asiakkaan tilalle

Sovellus käyttää OFF:n rajapintaa suoraan omalla ohuella asiakkaalla, koska kutsuja on vähän. SDK voi tulla perustelluksi, jos sovellusta kehitetään pidemmälle ja OFF-riippuvuuksia tulee enemmän. Luontevimmat ehdokkaat ovat [JavaScript-SDK](https://github.com/openfoodfacts/openfoodfacts-js) ja [React Native -SDK](https://github.com/openfoodfacts/openfoodfacts-react-native). SDK:ita ei ole vielä arvioitu.

Tarkistettava ennen käyttöönottoa:

- Osoitteen voi asettaa, ja kaikki kutsut pysyvät sallitussa osoitteessa (docs/adr/0011).
- Lisenssi on yhteensopiva GPL-3.0:n kanssa (AVO-04).
- SDK ei lähetä laitteelta muuta kuin pyydetyn kutsun tiedot (ANS-01, OFF-04).
- SDK on ylläpidetty ja tukee sovelluksen käyttämiä rajapinnan versioita.
- SDK toimii React Nativessa ja Expossa.

## Avoimuus

### Avoimet vaihtoehdot suljetuille riippuvuuksille

Suljetut riippuvuudet on hyväksytty v1:lle (docs/adr/0006). Nämä arvioidaan vaiheen 7 jälkeen (AVO-04):

- ZXing-pohjainen viivakoodin lukija Google ML Kitin tilalle
- F-Droid-jakelu
- käännös ilman EAS-pilveä
- välityspalvelun ajo omalla palvelimella

## Käyttöliittymä

### Kielituki

Sovellus on suomenkielinen. Tekstit on koottu tiedostoon `src/ui/strings.fi.ts`, joten muiden kielten lisääminen on mahdollista myöhemmin.

# 0013 OFF:n API-ohjeen tarkistus ennen vaihetta 4

Päiväys: 8.11.2026  
Tila: hyväksytty; v3:n alaversio ja User-Agentin yhteystiedon oletusarvo päätetään vaiheen 4 alussa  
Liittyy: HAK-01, HAK-07, OFF-01…OFF-10, TIE-01, TIE-03, vaiheet 4, 6 ja 7, päätösmuistiot 0004 ja 0011

## Tausta

OFF:n API-ohje (https://openfoodfacts.github.io/openfoodfacts-server/api/) pyytää lukemaan ohjeen kokonaan ennen rajapinnan käyttöä. Ohje käytiin 8.11.2026 läpi toteutussuunnitelmaa, päätösmuistioita ja koodia vasten. Lisäksi luettiin ohjeen alasivut viivakoodien normalisoinnista, rajapinnan ja tuoteskeeman muutoslokista, lisensseistä ja kuvien lataamisesta sekä v3:n OpenAPI-kuvaus ja kirjoitusrajapinnan lähdekoodi.

## Havainnot

- API v3 (uusin v3.6) on suositeltu, ja v2 on vanhentunut. Vastauksen rakenne riippuu pyydetystä alaversiosta: v3.2 muutti tuotemerkin taksonomiakentäksi, v3.3 kuvien rakenteen ja toi kuvien lähetyspisteen, v3.5 muutti ravintoarvojen rakenteen ja v3.6 tagien rakenteen. Muutoslokin mukaan v3.5:n rakenne on vielä kehitteillä. Uudet kentät on siedettävä, eikä dokumentoimattomiin kenttiin pidä nojata.
- Tekstihaku on vain vanhassa `/cgi/search.pl`-pisteessä (legacy). Hakurajapintaa ei saa käyttää kirjoitettaessa päivittyvään hakuun.
- OFF ei takaa tietojen oikeellisuutta, täydellisyyttä eikä luotettavuutta, ja tietojen käytön riski on käyttäjällä.
- API-käytön ilmoituslomake pyydetään täyttämään ennen rajapinnan käyttöä ja sovellustilin luonnin yhteydessä, jotta OFF tunnistaa käytön eikä estä sitä.
- Kirjoituspyynnöt jonotetaan, ja ne poistetaan jonosta vasta palvelimen vahvistuksen jälkeen. Verkkovirhe, aikakatkaisu, 429 ja 5xx uusitaan kasvavalla viiveellä ja satunnaisvaihtelulla. Uusintakertoja rajoitetaan, eikä muita 4xx-virheitä uusita.
- Lukurajat ovat IP-osoitekohtaisia. Mobiilisovelluksessa ne koskevat kutakin käyttäjää, mutta välityspalvelun omat lukupyynnöt jakavat saman rajan. Eston purkua voi pyytää osoitteesta reuse@openfoodfacts.org.
- Istuntoevästettä on käytettävä aina samasta IP-osoitteesta. Käyttäjätunnus ja salasana lähetetään kirjoituspyynnöissä, ei GET-pyynnöissä.
- `app_uuid` on käyttäjäkohtainen suolattu satunnainen UUID, jotta OFF:n moderaattorit voivat estää yksittäisen käyttäjän estämättä koko sovellusta.
- OFF:n lähdekoodin mukaan (8.11.2026) v3:n kirjoitusrajapinta lukee `comment`-kentän JSON-rungosta, mutta `app_name`, `app_version` ja `app_uuid` CGI-parametreista, joten JSON-rungossa ne eivät välity. Energian v3 kirjoittaa vain uudella `nutrition.input_sets`-rakenteella.
- OFF normalisoi viivakoodin luku- ja kirjoituspyynnöissä: etunollien poiston jälkeen enintään 7-numeroinen koodi täydennetään 8-numeroiseksi ja 9–12-numeroinen 13-numeroiseksi. UPC-E-koodia ei laajenneta UPC-A:ksi.
- Käyttäjän kuvia saa lähettää vain, jos käyttäjä hyväksyy niille CC BY-SA -lisenssin. Kuvan vähimmäiskoko on 640 × 160 px.
- User-Agent on muotoa `AppName/Version (ContactEmail)`. OpenAPI v3 -kuvaus hyväksyy yhteystiedoksi myös URL-osoitteen.

## Päätös

- **v3:n alaversio kiinnitetään.** Sovellus pyytää kiinnitettyä alaversiota eikä pelkkää `/api/v3/`-osoitetta. Alaversio valitaan vaiheen 4 alussa testiympäristön vastausten perusteella ja kirjataan päätösmuistioon. Ehdokas on v3.4, koska v3.5:n ravintoarvorakenne on vielä kehitteillä. Automaattitestit käyttävät testiympäristöstä tallennettuja esimerkkivastauksia, myös nimihaussa.
- **Nimihaku vain käyttäjän toiminnosta.** Kirjoittaminen tai viive ei käynnistä OFF-hakua.
- **Vastuuvapauslauseke.** Tietolähteet-näkymä kertoo, ettei OFF:n tietojen oikeellisuutta taata.
- **Ilmoituslomake ennen vaihetta 4.** Kehittäjä täyttää lomakkeen ennen kuin sovellus alkaa kutsua OFF:ia. Tiedot päivitetään tarvittaessa, kun sovelluksen tuotantotili luodaan vaiheessa 7. Tämä muuttaa päätösmuistion 0011 kohtaa, jossa lomake kuului tuotantoon siirtymiseen.
- **Kirjoitusten uusinta.** Julkaisujono uusii ohimenevät virheet automaattisesti kasvavalla viiveellä ja satunnaisvaihtelulla rajallisen määrän kertoja, mutta pysyviä virheitä se ei uusi. Työ valmistuu vasta vahvistuksesta, ja välityspalvelu jatkaa osittain onnistunutta julkaisua idempotenssiavaimen avulla. Seuraavan yrityksen aika tallennetaan sarakkeeseen `publish_job.next_attempt_at` vaiheen 6 migraatiolla. Lukupyyntöjä ei edelleenkään uusita automaattisesti.
- **Välityspalvelun omat OFF-pyynnöt.** Välityspalvelu rajoittaa omia lukupyyntöjään ja palauttaa 429:n ja 503:n sovellukselle uusittavina virheinä.
- **Tunnistautuminen.** Välityspalvelu lähettää sovellustilin käyttäjätunnuksen ja salasanan kirjoituspyyntöjen parametreina. Istuntoevästettä ei käytetä, eikä tunnuksia lähetetä GET-pyynnöissä.
- **`app_uuid`.** Välityspalvelu johtaa sen asennuksen satunnaistunnisteesta salaisella suolalla (esim. HMAC-SHA-256). Julkaisun hyväksyntänäkymä kertoo tunnisteesta (TIE-01).
- **Kirjoituspiste.** Ensisijaisesti v3, ja kuvat lähetetään vähintään v3.3:n pisteeseen. Vanhaa `product_jqm2.pl`-pistettä käytetään niihin osiin, joita v3 ei kokeilussa tue luotettavasti (energia, sovellusmerkintä), ja syy kirjataan päätösmuistioon 0004.
- **Viivakoodi.** Sovellus normalisoi viivakoodin vaiheessa 4 OFF:n säännöllä. UPC-E:n tarkistusnumero tarkistetaan laajennetusta muodosta, mutta tunnisteeksi jää 8-numeroinen koodi.
- **Kuvat.** Hyväksyntänäkymä kertoo lisensseistä (tiedot Database Contents License, kuvat CC BY-SA) ja siitä, että kuvien on oltava käyttäjän itse ottamia. Sovellus ei pienennä kuvia alle 640 × 160 px:n.
- **User-Agent.** Yhteystiedon julkinen oletusarvo päätetään vaiheessa 4.

## Seuraukset

- Toteutussuunnitelman versio 1.8 muuttaa kohtia 3.1, 4, 5.1, 6.1, 6.2, 7.1, 9, 11 ja 12 ja lisää kohdan 6.4.
- Päätösmuistion 0004 kokeilusuunnitelma ja kokeiluskripti `proxy/experiments/off-staging.ts` kirjoittavat ensisijaisesti v3:lla, vertaavat v3.4:n ja v3.6:n vastauksia ja tarkistavat, kirjautuuko sovellusmerkintä.
- Vaiheessa 4 `normalizeBarcode` ja sen testit muuttuvat UPC-E:n osalta.

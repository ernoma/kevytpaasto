# 0004 – Kokeilu: kirjoittaminen Open Food Factsin testiympäristöön

Päiväys: 18.10.2026  
Päivitetty: 8.11.2026 (täydennys ja kokeilusuunnitelma, päätösmuistio 0013)  
Tila: suunniteltu (kokeilu tekemättä)  
Liittyy: HAK-01, OFF-01…OFF-10, TIE-03, TIE-04, vaiheet 4 ja 6, hyväksymiskriteeri 5, päätösmuistio 0013

## Tausta

OFF-julkaisu tehdään välityspalvelun kautta sovelluksen yhteisellä OFF-tilillä (suunnitelman luku 6). Ennen vaihetta 6 on varmistettava kirjoitusrajapinnan kulku, tunnistautuminen, sovellusten merkintä ja ehdot testiympäristössä.

## Ajantasainen tieto (tarkistettu 18.10.2026)

Tätä kohtaa täydentää ja osin korjaa alla oleva täydennys 8.11.2026.

Lähteet: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/, …/api/tutorials/adding-missing-products/, …/api/tutorial-off-api/ ja https://world.openfoodfacts.org/terms-of-use

**Ympäristöt**
- Tuotanto: `https://world.openfoodfacts.org`. Testiympäristö (staging): `https://world.openfoodfacts.net`.
- Testiympäristössä on HTTP Basic -suojaus hakukoneindeksoinnin estämiseksi: käyttäjä `off`, salasana `off`.
- Tuotannolla ja testiympäristöllä on **erilliset käyttäjätietokannat**: testitili luodaan erikseen osoitteessa `world.openfoodfacts.net`.

**Lukurajat (per IP-osoite)**
- Tuotteen luku: 15 pyyntöä/min. Haku (`/api/v*/search`, `/cgi/search.pl`): 10 pyyntöä/min, eikä hakua saa käyttää kirjoitettaessa päivittyvään hakuun (search-as-you-type). Kirjoituksilla ei ole rajaa. Globaalit rajat palauttavat HTTP 503.
- Tekstihaku ei ole v2-palvelinrajapinnassa; OFF ohjaa käyttämään Search-a-licious-palvelua (`https://search.openfoodfacts.org`).
- API v3 (3.6) on suositeltu uusiin integraatioihin; v2 on vanhentunut mutta tuettu.

**Tunnistautuminen ja merkintä**
- Lukupyynnöt: vain `User-Agent` muodossa `AppName/Version (ContactEmail)`.
- Kirjoitukset: istuntoeväste kirjautumisrajapinnasta (sama IP-osoite, enintään 10 istuntoa käyttäjää kohden) tai `user_id` (käyttäjätunnus, ei sähköposti) ja `password` POST-parametreina.
- Sovellus voi käyttää yhteistä globaalia tiliä; kirjoituspyyntöihin lisätään `app_name`, `app_version` ja `app_uuid`. `comment`-kenttään sovellus + käyttäjätunniste ilman henkilötietoja.
- Maa ja kieli välitetään parametreina `cc=fi` ja `lc=fi` aliverkkotunnuksen sijaan. Tuotemerkki lisätään `add_brands`-kentällä, ellei kaikkia nykyisiä arvoja ole haettu ja näytetty.
- Kirjoituspiste: `POST /cgi/product_jqm2.pl` (`code` = viivakoodi). Kuvat ladataan erillisellä kuvarajapinnalla (`/cgi/product_image_upload.pl`, kuvakenttä esim. `front_fi`, `nutrition_fi`) – parametrit varmistetaan kokeilussa, koska kuvaohjeen sivu oli siirretty.
- Keycloak/OIDC-tunnistautuminen on tulossa; käyttäjätunnus–salasana säilyy yhteensopivuussyistä.

**Ehdot ja lisenssit**
- Tietokanta ODbL, yksittäinen sisältö Database Contents License, kuvat CC BY-SA. Tiedon uudelleenkäytössä mainitaan lisenssi ja Open Food Facts linkkeineen (TIE-03).
- Lisääjällä on oltava oikeudet lisäämäänsä aineistoon. Tietoa **ei saa kopioida muista tietokannoista tai verkkosivuilta**; tieto tulee suoraan pakkauksesta, ja kuvat on otettava itse. Tämä vahvistaa OFF-10:n ja suunnitelman luvun 6.3 erottelun.
- OFF pyytää täyttämään API-käytön ilmoituslomakkeen (linkki käyttöehdoissa) ennen tuotantokäyttöä.

## Täydennys (tarkistettu 8.11.2026)

Lähteet: API-ohje https://openfoodfacts.github.io/openfoodfacts-server/api/ ja sen alasivut (muutosloki, viivakoodien normalisointi, kuvien lataus, lisenssit), v3:n OpenAPI-kuvaus sekä OFF:n lähdekoodi (`APIProductWrite.pm`, `APIProductImagesUpload.pm`, `Products.pm`, `Nutrition.pm`). Päätökset ovat päätösmuistiossa 0013.

- **API v3:n alaversiot.** Vastauksen rakenne riippuu pyydetystä alaversiosta. Kuvien v3-lähetyspiste tuli alaversiossa 3.3 (`POST /api/v3.3/product/<code>/images`). v3.5 muutti ravintoarvojen rakenteen, joka on vielä kehitteillä.
- **v3:n kirjoitus.** `PATCH /api/v3/product/<code>` luo tai päivittää tuotteen. Energian v3 kirjoittaa vain rakenteella `product.nutrition.input_sets` (`source`, `preparation`, `per` sekä `nutrients.energy-kcal`, jossa `value_string` ja `unit`). Tuotemerkki on v3.2:sta alkaen taksonomiakenttä, joten v3:lla se lähetetään tag-kenttänä (esim. `brands_tags_add`); kokeilu varmistaa tämän. `comment` luetaan JSON-rungosta, mutta `app_name`, `app_version` ja `app_uuid` CGI-parametreista, joten JSON-rungossa ne eivät välity.
- **Kuvat.** v3:ssa runko on JSON: `image_data_base64` ja valinnainen `selected` (esim. `front` / `fi`). Kuvan vähimmäiskoko on 640 × 160 px. Käyttäjän kuvia saa lähettää vain, jos käyttäjä hyväksyy niille CC BY-SA -lisenssin. Vanhan pisteen `/cgi/product_image_upload.pl` ohje on osoitteessa https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-uploading-photo-to-a-product/.
- **Tunnistautuminen.** Tunnus ja salasana kuuluvat kirjoituspyyntöihin, eivät GET-pyyntöihin. Istuntoa on käytettävä aina samasta IP-osoitteesta, joten välityspalvelu ei käytä istuntoevästettä.
- **Kirjoitusvirheet.** Pyyntö poistetaan jonosta vasta vahvistuksen jälkeen. Verkkovirhe, aikakatkaisu, 429 ja 5xx uusitaan kasvavalla viiveellä ja satunnaisvaihtelulla, uusintoja rajoitetaan, eikä muita 4xx-virheitä uusita.
- **`app_uuid`** on käyttäjäkohtainen suolattu satunnainen UUID.
- **Ilmoituslomake** pyydetään täyttämään jo ennen rajapinnan käyttöä, ei vasta ennen tuotantokäyttöä.
- **Viivakoodi.** OFF normalisoi koodin itse luku- ja kirjoituspyynnöissä, mutta UPC-E-koodia se ei laajenna.

## Kokeilusuunnitelma

Päivitetty 8.11.2026 (päätösmuistio 0013).

1. Luo testitili `world.openfoodfacts.net`-ympäristöön (kehittäjä itse; tunnukset vain paikalliseen `proxy/.dev.vars`-tiedostoon, joka on gitignoressa).
2. Kertakäyttöinen skripti `proxy/experiments/off-staging.ts` tekee testiympäristössä seuraavat vaiheet:
   a. hakee keksityn viivakoodin (`GET /api/v3.4/product/<code>`) ja toteaa, ettei tuotetta ole (OFF-01); GET-pyynnöissä ei lähetetä tunnuksia,
   b. luo tuotteen v3:lla (`PATCH /api/v3.6/product/<code>`): nimi, merkki, energia `nutrition.input_sets`-rakenteella, `cc=fi`, `lc=fi` ja `comment` JSON-rungossa sekä `app_name`, `app_version` ja `app_uuid` osoiteparametreina,
   c. lukee tuotteen v3.4:llä ja v3.6:lla ja vertaa ravintoarvojen rakennetta alaversion valintaa varten (suunnitelman kohta 5.1); `data_sources_tags` näyttää, kirjautuiko sovellusmerkintä,
   d. lataa etukuvan v3:lla, valitsee sen (`front` / `fi`) ja lähettää saman kuvan uudelleen: miten kaksoiskappale ilmoitetaan,
   e. lähettää liian pienen kuvan (alle 640 × 160 px): millainen virhe tulee,
   f. lähettää saman v3-kirjoituksen uudelleen ja tarkistaa, ettei kaksoiskappaletta synny eikä tieto muutu (OFF-08),
   g. kirjoittaa energian vertailuksi `product_jqm2.pl`:llä lomakekenttinä, joissa `app_*`-parametrit välittyvät varmasti,
   h. kokeilee väärää salasanaa ja virheellistä viivakoodia v3:lla,
   i. lukee lopputilan molemmilla alaversioilla.
3. Kirjaa jokaisesta virheestä HTTP-tila ja virhekoodi, jotta välityspalvelu voi luokitella virheen uusittavaksi tai pysyväksi (suunnitelman kohta 6.4).
4. Tarkista testiympäristön tuotesivun muokkaushistoriasta, miten sovellusmerkintä näkyy v3- ja `product_jqm2.pl`-kirjoituksissa.
5. Valitse vaiheeseen 6 kirjoituspiste: v3, ellei kokeilu osoita, että energia tai sovellusmerkintä toimii luotettavasti vain `product_jqm2.pl`:llä. Kirjaa valinta ja syy Tulokset-kohtaan.
6. Tuotantoon ei kirjoiteta kokeilussa lainkaan (kriteeri 5).

## Vaikutukset suunnitelmaan

- Nimihaku käynnistetään vain käyttäjän erillisellä toiminnolla (päätösmuistio 0013), ja omat sekä Fineli-tulokset näytetään ensin; 10 hakua/min ei salli jokaisen näppäilyn hakua. Search-a-licious otetaan käyttöön vain kehittäjän nimenomaisella päätöksellä (päätösmuistio 0011).
- Uudet integraatiot tehdään API v3:lla kiinnitetyllä alaversiolla (päätösmuistio 0013).

## Tulokset

Täydennetään kokeilun jälkeen.

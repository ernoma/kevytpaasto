# 0004 – Kokeilu: kirjoittaminen Open Food Factsin testiympäristöön

Päiväys: 18.10.2026  
Tila: suunniteltu (kokeilu tekemättä)  
Liittyy: HAK-01, OFF-01…OFF-10, TIE-03, TIE-04, vaiheet 4 ja 6, hyväksymiskriteeri 5

## Tausta

OFF-julkaisu tehdään välityspalvelun kautta sovelluksen yhteisellä OFF-tilillä (suunnitelman luku 6). Ennen vaihetta 6 on varmistettava kirjoitusrajapinnan kulku, tunnistautuminen, sovellusten merkintä ja ehdot testiympäristössä.

## Ajantasainen tieto (tarkistettu 18.10.2026)

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

## Kokeilusuunnitelma

1. Luo testitili `world.openfoodfacts.net`-ympäristöön (kehittäjä itse; tunnukset vain paikalliseen `proxy/.dev.vars`-tiedostoon, joka on gitignoressa).
2. Kirjoita kertakäyttöinen skripti (curl tai Node), joka testiympäristössä
   a. hakee keksityn viivakoodin (v3 `GET /api/v3/product/<code>`) ja toteaa, ettei tuotetta ole (OFF-01),
   b. luo tuotteen: nimi, merkki, `nutrition_data_per=100g`, `nutriment_energy-kcal`, `nutriment_energy-kcal_unit=kcal`, `cc=fi`, `lc=fi`, `app_name`, `app_version`, `app_uuid`, `comment`,
   c. lataa etu- ja ravintoarvokuvan,
   d. lähettää saman pyynnön uudelleen ja tarkistaa, ettei kaksoiskappaletta synny ja että olemassa olevan tuotteen tunnistus toimii (OFF-08),
   e. tarkistaa tuotteen muokkaushistoriasta, miten sovellusmerkintä näkyy.
3. Selvitä, palauttaako kirjoituspiste yksiselitteisen virheen väärästä tunnuksesta, puuttuvasta kentästä ja liian suuresta kuvasta.
4. Kokeile v3:n kirjoitusrajapintaa (`PATCH /api/v3/product/<code>`) vaihtoehtona `product_jqm2.pl`:lle ja valitse vaiheeseen 6 se, jonka virhevastaukset ovat selkeämmät.
5. Tuotantoon ei kirjoiteta kokeilussa lainkaan (kriteeri 5).

## Vaikutukset suunnitelmaan

- Nimihaku käynnistetään käyttäjän erillisellä toiminnolla tai pitkällä viiveellä, ja omat sekä Fineli-tulokset näytetään ensin; 10 hakua/min ei salli jokaisen näppäilyn hakua. Search-a-licious arvioidaan vaiheessa 4.
- Uudet integraatiot tehdään API v3:lla.

## Tulokset

Täydennetään kokeilun jälkeen.

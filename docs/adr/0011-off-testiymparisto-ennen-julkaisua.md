# 0011 OFF:n testiympäristö ennen sovelluksen julkaisua

Päiväys: 1.11.2026  
Tila: hyväksytty  
Liittyy: HAK-01, OFF-01…OFF-10, TIE-03, AVO-03, vaiheet 4, 6 ja 7, hyväksymiskriteerit 4 ja 5, päätösmuistio 0004

## Tausta

Suunnitelma rajasi testiympäristön kehitykseen ja välityspalvelun kirjoituksiin. Luku 5.1 ei ottanut kantaa hakujen osoitteeseen, kriteerin 5 varmennus sai käyttää tuotantoa, eikä tuotantoon siirtymistä ollut vaiheissa. OFF:n ohje pyytää tekemään testattaessa kaikki API-pyynnöt testiympäristöön, ei vain kirjoituksia. Kehittäjä haluaa päättää itse, milloin osoite muuttuu.

## Havainnot (1.11.2026)

Tarkistus tehtiin pelkillä lukupyynnöillä ennen tämän päätöksen kirjaamista.

- `world.openfoodfacts.net` palautti tuotteet viivakoodeilla 3017620422003 (Nutella) ja 6411401015090 (Karl Fazer Milk Chocolate). Tiedot eivät ole täysin samat kuin tuotannossa: Nutellan merkki on testiympäristössä ”Nutella”, tuotannossa ”Nutella, Ferrero”.
- Ohjeen mukaan testiympäristö vaatii HTTP Basic -tunnistautumisen, mutta nämä tuotehaut onnistuivat myös ilman sitä.
- `/cgi/search.pl` toimi testiympäristössä. Tuotanto palautti samaan aikaan yhdellä pyynnöllä HTTP 503:n.
- Search-a-licious vastaa myös osoitteessa `search.openfoodfacts.net`, vaikka ohje mainitsee vain tuotanto-osoitteen. Indeksi on eri: ”nutella” 334 osumaa (tuotanto 631) ja ”ruisleipä” 7 osumaa (tuotanto 6).

## Päätös

- **Sallittu osoite.** Kaikki OFF-kutsut tehdään osoitteeseen `https://world.openfoodfacts.net`: nimihaut, viivakoodihaut, välityspalvelun tarkistukset ja kirjoitukset, kriteerin 5 varmennus sekä kehityksen aikaiset kokeilut ja tarkistukset. Kriteerin 5 varmennusta koskeva tuotantopoikkeus poistuu.
- **Muutos vaatii kehittäjän päätöksen.** Muutos mihinkään muuhun Open Food Factsin palvelun osoitteeseen vaatii kehittäjän nimenomaisen päätöksen. Tämä koskee tuotantoa (`world.openfoodfacts.org`), Search-a-liciousta (`search.openfoodfacts.org`, `search.openfoodfacts.net`) ja muita OFF:n palveluita. Vaiheen eteneminen, testitulos, OFF:n ohje tai hakuongelma ei yksin riitä, eikä Claude tee muutosta omalla päätöksellään. Päätös kirjataan päiväyksineen uuteen päätösmuistioon.
- **Rajaus.** Sääntö koskee verkkokutsuja. Käyttäjälle näytettävät lähdeviitteet ja lisenssilinkit (TIE-03) eivät ole kutsuja.
- **Paikallinen kopio.** Kehityksessä saa käyttää myös kehitteillä olevaa backendiä varten tehtyä paikallista kopiota OFF:n datasta, koska se ei ole OFF-palvelun osoite. Kopion päivittäminen OFF:lta on verkkokutsu, joten siihen pätee sama sääntö. Lupa ei muuta suunnitelman arkkitehtuuria: suunnitelmassa ei ole muuta backendiä kuin välityspalvelu, eikä kopio ole tässä repossa.
- **Konfiguraatio.** Sovelluksen ja välityspalvelun OFF-osoitteet tulevat konfiguraatiosta, jonka oletus on `https://world.openfoodfacts.net`. Testi varmistaa oletuksen ja sen, ettei koodissa ole muita OFF-kutsujen osoitteita.
- **HTTP Basic.** Pyynnöissä lähetetään aina otsake `off`/`off`, koska ohje vaatii sen. Arvo on julkinen eikä salaisuus (AVO-03).
- **Nimihaku.** Vaiheessa 4 nimihaku tehdään hakupisteellä `/cgi/search.pl`.
- **Tuotantoon siirtyminen.** Se kuuluu vaiheeseen 7, mutta alkaa vasta kehittäjän päätöksestä: asetetaan tuotanto-osoite julkaisukäännökseen ja välityspalveluun ja tarkistetaan haku julkaisukäännöksellä. Tuotantoon ei kirjoiteta testituotteita (kriteeri 5). API-käytön ilmoituslomake täytetään jo ennen vaihetta 4 (muutettu 8.11.2026, päätösmuistio 0013).

## Seuraukset

- Haku voi ennen siirtymistä löytää eri tuotteet ja tiedot kuin tuotanto. Kriteerin 4 OFF-osa todennetaan testiympäristön tuotteilla, ja automaattitestit käyttävät mockattua OFF:ia.
- Kehittäjän omassa käytössä julkaisut päätyvät ennen siirtymistä vain testiympäristöön, ja `food`-välimuistiin jää testiympäristön tietoja. Aiemmat kirjaukset ovat tilannekuvia, joten ne eivät muutu (KIR-08).
- Nimihakua rajoittaa hakupisteen 10 haun minuuttiraja, ellei Search-a-liciousin käyttöönotosta erikseen päätetä.
- Julkisesta koodista tehty oletuskäännös käyttää testiympäristöä, kunnes osoite asetetaan konfiguraatiossa.

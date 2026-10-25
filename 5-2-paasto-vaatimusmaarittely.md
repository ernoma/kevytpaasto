# 5:2-paastosovellus – vaatimusmäärittely

Versio: 0.3  
Päiväys: 25.10.2026  
Tila: keskustelun pohjalta laadittu luonnos

## 1. Tarkoitus

Sovelluksen tarkoitus on auttaa 5:2-paastoa noudattavaa käyttäjää pitämään mahdollisimman vaivattomasti kirjaa paastopäivien kaloreista. Sovellus keskittyy syötyjen ruokien nopeaan kirjaamiseen ja käyttäjän itse asettaman päiväkohtaisen kalorirajan seuraamiseen.

Tämä dokumentti määrittelee tavoitellun toiminnan ja hyväksymiskriteerit. Toteutuskieli, ohjelmistokirjastot, arkkitehtuuri, tietovarastot, jakelutapa ja muut tekniset ratkaisut valitaan erillisessä toteutussuunnitelmassa.

## 2. Lähtökohdat ja tavoitteet

Keskustelussa vahvistetut lähtökohdat:

- Sovellus on tarkoitettu erityisesti 5:2-paaston paastopäiville.
- Ei-paastopäivien kaloriseuranta ei kuulu sovellukseen.
- Käyttöönotossa ei ole pitkää kyselyä käyttäjän taustasta tai tavoitteista.
- Ruokien kirjaamisen on oltava mahdollisimman vaivatonta.
- Sovellus on kokonaan maksuton. Maksullisia ominaisuuksia, mainontaa tai muita tulonlähteitä ei toteuteta.
- Sovellus on avoimen lähdekoodin projekti, joka suosii avoimia tietolähteitä ja avointa teknologiaa.
- Omia tuotteita, ruokia ja suosikkiaterioita voi tallentaa.
- Puuttuvan kauppatuotteen tiedot on tarkoitus lisätä myös Open Food Factsiin.
- Open Food Facts ja Fineli ovat suunniteltuja tietolähteitä. Keskon tietojen hyödyntämismahdollisuus selvitetään.

Muut tässä dokumentissa esitetyt yksityiskohdat ovat ehdotuksia ensimmäisen version toiminnaksi. Avoimet päätökset on koottu loppuun; niitä ei pidä tulkita jo tehdyiksi teknisiksi valinnoiksi.

Tavoiteltu käyttökokemus: käyttäjä avaa sovelluksen, näkee päivän tilanteen ja kirjaa tutun ruoan muutamassa sekunnissa. Sovellus ei edellytä päivittäistä käyttöä paastopäivien ulkopuolella.

## 3. Kohderyhmä ja rajaus

Ensisijainen käyttäjä on sovelluksen kehittäjä itse. Toissijainen kohderyhmä ovat muut samanlaista yksinkertaista paastopäivän kalorikirjanpitoa tarvitsevat käyttäjät Suomessa.

Ensimmäisen version käyttöliittymä on suomenkielinen ja suunniteltu puhelimella käytettäväksi. Tuettavat puhelinalustat päätetään toteutussuunnitelmassa.

Ensimmäiseen versioon eivät kuulu:

- ei-paastopäivien ruokapäiväkirja tai viikoittainen kaloribudjetti;
- automaattinen, henkilötietoihin perustuva kalorisuositus;
- painon, liikunnan, unen tai vedenjuonnin seuranta;
- paastotuntien laskuri, muut paastomenetelmät tai ravintovalmennus;
- makroravinteiden tavoitteet tai ravitsemuksen kokonaisarviointi;
- sosiaaliset toiminnot, kilpailut tai käyttöputkien palkitseminen;
- ruoka-annoksen kalorien arviointi pelkän ateriakuvan perusteella;
- maksujen periminen, tilaukset, mainonta, kaupallinen yhteistyö tai muut tulonlähteet. Niitä ei toteuteta myöhemminkään (kohta 5.8).

## 4. Vaatimusten prioriteetit

- **P1 – ensimmäinen käyttökelpoinen versio:** vaaditaan ensimmäisen version hyväksymiseen.
- **P2 – myöhempi parannus:** hyödyllinen, mutta ei estä ensimmäisen version valmistumista.
- **Selvitettävä:** päätös tai ulkoinen edellytys, jonka toteutettavuus on tarkistettava ennen kyseisen ominaisuuden toteuttamista.

Vaatimusten tunnuksia käytetään myöhemmin toteutussuunnitelman ja hyväksymistestauksen viittauksina.

## 5. Toiminnalliset vaatimukset

### 5.1 Käyttöönotto ja asetukset

| Tunnus | Prioriteetti | Vaatimus |
| --- | --- | --- |
| KAY-01 | P1 | Käyttöönotto edellyttää vain käyttäjän oman kalorirajan asettamista. Ikää, painoa, pituutta, sukupuolta tai painotavoitetta ei kysytä. |
| KAY-02 | P1 | Perustoiminnot ovat käytettävissä ilman käyttäjätilin luomista tai kirjautumista. |
| KAY-03 | P1 | Kalorirajaa voi muuttaa myöhemmin. Muutos koskee uusia paastopäiviä; jo olemassa olevan päivän rajaa voi muuttaa erikseen. |
| KAY-04 | P1 | Kameraa tai julkista tuotetietojen jakamista koskevat valinnat esitetään vasta, kun käyttäjä käyttää niitä tarvitsevaa toimintoa. |

### 5.2 Paastopäivät ja päivän yhteenveto

| Tunnus | Prioriteetti | Vaatimus |
| --- | --- | --- |
| PAI-01 | P1 | Käyttäjä voi merkitä valitun kalenteripäivän paastopäiväksi. Sovellus ei pakota tiettyjä viikonpäiviä tai täsmälleen kahta paastopäivää viikossa. |
| PAI-02 | P1 | Aktiivisen paastopäivän näkymässä näkyvät päivämäärä, kaloriraja, kirjatut kalorit, jäljellä olevat kalorit ja päivän kirjaukset. |
| PAI-03 | P1 | Kalorirajan ylittyminen näytetään selvästi ja neutraalisti ylityksen määränä. Kirjaamista ei estetä. |
| PAI-04 | P1 | Ei-paastopäivänä sovellus ei pyydä ruokakirjauksia. Käyttäjä voi aloittaa paastopäivän tai avata aiemman paastopäivän. |
| PAI-05 | P1 | Päivä määräytyy käyttäjän paikallisen kalenterin mukaan. Sovellus ei siirrä vanhoja kirjauksia toiselle päivälle aikavyöhykkeen vaihtuessa. |
| PAI-06 | P1 | Paastopäivämerkinnän voi poistaa. Jos päivällä on kirjauksia, niiden poistaminen edellyttää erillistä vahvistusta eikä tapahdu huomaamatta. |
| PAI-07 | P2 | Käyttäjä voi asettaa vapaaehtoisen viikkorytmin ja muistutukset. |

### 5.3 Ruokakirjaukset

| Tunnus | Prioriteetti | Vaatimus |
| --- | --- | --- |
| KIR-01 | P1 | Ruoan voi lisätä tuotehaun, viivakoodin, oman ruoan, suosikin tai suoran kalorikirjauksen avulla. |
| KIR-02 | P1 | Pikakirjaukseen riittää kalorimäärä. Nimi on vapaaehtoinen. |
| KIR-03 | P1 | Tuotteesta voi kirjata määrän grammoina tai millilitroina tietojen perusteen mukaisesti, tai tallennettuna annoksena. |
| KIR-04 | P1 | Sovellus laskee kalorit määrän ja energiasisällön perusteella ja näyttää tuloksen ennen tallentamista. |
| KIR-05 | P1 | Kirjauksen nimeä, määrää ja kalorimäärää voi korjata. Kirjauksen voi poistaa tai siirtää toiselle paastopäivälle. |
| KIR-06 | P1 | Kirjaukset säilyvät sovelluksen sulkemisen ja uudelleen avaamisen jälkeen. |
| KIR-07 | P1 | Sama ruoka voidaan kirjata useita kertoja tarkoituksellisesti. Yksi tallennustoiminto ei saa aiheuttaa tahattomia kaksoiskirjauksia. |
| KIR-08 | P1 | Kirjaus säilyttää kirjaushetken määrän ja energiatiedon. Lähdetietojen, suosikin tai reseptin myöhempi muutos ei muuta vanhaa päiväkirjaa. |

### 5.4 Tuotehaku ja tietolähteet

| Tunnus | Prioriteetti | Vaatimus |
| --- | --- | --- |
| HAK-01 | P1 | Open Food Factsista voi hakea pakattuja tuotteita nimellä ja viivakoodilla. |
| HAK-02 | P1 | Finelin tietoja voi käyttää tavallisten raaka-aineiden ja ruokalajien hakemiseen. |
| HAK-03 | P1 | Hakutuloksissa näkyvät riittävät tunnistetiedot: nimi, tuotemerkki silloin kun se on saatavilla, energiasisältö perusteineen sekä tietolähde. |
| HAK-04 | P1 | Käyttäjä näkee ennen kirjaamista, jos energiatieto puuttuu. Puuttuvaa arvoa ei tulkita nollaksi. |
| HAK-05 | P1 | Viivakoodin voi syöttää käsin, jos kameran käyttö ei onnistu tai siihen ei anneta lupaa. |
| HAK-06 | P1 | Jos tuotetta ei löydy, käyttäjä voi siirtyä suoraan uuden tuotteen lisäämiseen. Jo luettu viivakoodi säilyy lomakkeessa. |
| HAK-07 | P1 | Sama viivakoodi käsitellään saman kauppatuotteen tunnisteena. Yleistä Fineli-ruokalajia ei yhdistetä tiettyyn merkkituotteeseen pelkän samankaltaisen nimen perusteella. |
| HAK-08 | P1 | Käyttäjä voi tehdä omassa käytössään korjauksen tuotetietoon. Korjaus ei automaattisesti muuta julkista lähdetietoa. |
| HAK-09 | Selvitettävä | Keskon tuotetiedon sisältö, saatavuus, käyttöehdot ja edelleenjulkaisun oikeudet selvitetään. Ensimmäinen versio ei ole Keskon saatavuudesta riippuvainen. |

### 5.5 Omat tuotteet, ruoat ja suosikkiateriat

| Tunnus | Prioriteetti | Vaatimus |
| --- | --- | --- |
| OMA-01 | P1 | Käyttäjä voi tallentaa oman tuotteen tai ruoan vähintään nimellä ja energiasisällöllä sekä sen perusteella, esimerkiksi kcal/100 g tai kcal/annos. |
| OMA-02 | P1 | Tuotteelle voi tallentaa oletusannoksen ja sitä kuvaavan nimen, esimerkiksi ”purkki, 200 g”. |
| OMA-03 | P1 | Tuotteen tai ruoan voi merkitä suosikiksi ja kirjata oletusannoksella yhdellä lisäystoiminnolla suosikkilistasta. Annoksen voi muuttaa tarvittaessa. |
| OMA-04 | P1 | Useista tuotteista tai ruoista voi muodostaa nimetyn suosikkiaterian. Sen energiasisältö lasketaan osien määristä. |
| OMA-05 | P1 | Suosikkiateriasta voi kirjata koko aterian tai käyttäjän määrittämän osuuden. |
| OMA-06 | P1 | Omia ruokia ja suosikkeja voi muokata ja poistaa vaikuttamatta vanhoihin kirjauksiin. |
| OMA-07 | P1 | Omat ruoat ja suosikkiateriat ovat yksityisiä. Niitä ei julkaista automaattisesti Open Food Factsissa. |

### 5.6 Puuttuvien kauppatuotteiden lisääminen Open Food Factsiin

Tavoite on, että käyttäjän lisäämä, Open Food Factsista puuttuva kauppatuote täydentää myös yhteistä tietokantaa. Tämä ei koske henkilökohtaisia reseptejä, aterioita tai pelkkiä kalorimerkintöjä.

| Tunnus | Prioriteetti | Vaatimus |
| --- | --- | --- |
| OFF-01 | P1 | Uutta kauppatuotetta lisättäessä tarkistetaan viivakoodilla, onko se jo Open Food Factsissa. Tarkistus uusitaan ennen julkaisua. |
| OFF-02 | P1 | Lisäämiseen kuuluvat viivakoodi, tuotteen nimi, tuotemerkki jos tiedossa, energiasisältö perusteineen sekä mahdollisuus liittää kuvia pakkauksesta ja ravintoarvotaulukosta. Julkaisun vähimmäistiedot tarkennetaan ajantasaisista OFF-ohjeista. |
| OFF-03 | P1 | Käyttäjälle kerrotaan selvästi, mitkä tuotetiedot ja kuvat julkaistaan avoimesti. Julkaisu edellyttää käyttäjän tietoista hyväksyntää; omaa kalorikirjausta voi jatkaa myös julkaisematta. |
| OFF-04 | P1 | Syötyä määrää, ruokapäiväkirjaa, kalorirajaa tai henkilökohtaisia muistiinpanoja ei lähetetä julkisiksi tuotetiedoiksi. |
| OFF-05 | P1 | Käyttäjä voi tarkistaa ja korjata julkaistavat tiedot. Pelkkää puutteellista omaa pikakirjausta ei lähetetä sellaisenaan julkiseksi tuotteeksi. |
| OFF-06 | P1 | Tuote on heti käytettävissä omassa kirjanpidossa riippumatta julkaisun onnistumisesta. |
| OFF-07 | P1 | Julkaisun tila näkyy käyttäjälle: odottaa hyväksyntää tai täydennystä, odottaa lähetystä, julkaistu tai lähetys epäonnistui. Epäonnistuneen lähetyksen voi yrittää uudelleen. |
| OFF-08 | P1 | Uudelleenlähetys ei luo tahattomia kaksoiskappaleita eikä korvaa jo olemassa olevia tuotetietoja huomaamatta. Jos tuote löytyy ennen julkaisua, se näytetään käyttäjälle ja uuden tuotteen luonti keskeytetään. |
| OFF-09 | P1 | Peruskäyttö ja julkaiseminen eivät edellytä käyttäjältä omaa Open Food Facts -tiliä. Julkaisujen tunnistaminen ja palvelun ehdot huomioidaan toteutussuunnitelmassa. |
| OFF-10 | P1 | Muista tietokannoista haettuja tietoja ei julkaista Open Food Factsissa ilman siihen soveltuvaa oikeutta. Pakkauskuvasta käyttäjän tarkistama tieto erotetaan muista lähteistä kopioidusta tiedosta. |
| OFF-11 | P2 | Pakkauskuvasta tunnistetaan tekstiä automaattisesti. Käyttäjä vahvistaa erityisesti energian, yksiköt ja vertailumäärän ennen käyttöä tai julkaisua. |

### 5.7 Historia ja tietojen hallinta

| Tunnus | Prioriteetti | Vaatimus |
| --- | --- | --- |
| HIS-01 | P1 | Aiemmat paastopäivät voi avata päivämäärän perusteella. Näkyvissä ovat kirjaukset, päivän summa ja tuolloin käytetty kaloriraja. |
| HIS-02 | P1 | Aiemman paastopäivän kirjauksen tai aterian voi kopioida valittuun paastopäivään ja muuttaa sen määrää. |
| HIS-03 | P1 | Käyttäjä voi viedä oman päiväkirjansa, omat ruoat, suosikit ja asetukset tiedostoon ja palauttaa ne myöhemmin. Tiedostomuoto valitaan toteutussuunnitelmassa. |
| HIS-04 | P1 | Käyttäjä voi poistaa omat tietonsa sovelluksesta. Poisto ei väitä poistavansa jo Open Food Factsissa julkaistua tuotetietoa. |

### 5.8 Maksuttomuus ja avoimuus

Sovellus on kokonaan maksuton, eikä siihen lisätä maksullisia ominaisuuksia, mainontaa tai muita tulonlähteitä. Lähdekoodi julkaistaan avoimena, jotta kuka tahansa voi tarkistaa, miten tietoja käsitellään, kääntää sovelluksen itse ja osallistua kehitykseen. Lisenssi ja julkaisutapa valitaan toteutussuunnitelmassa.

Versiossa 0.2 olleet ansaintaa koskevat vaatimukset ANS-03–ANS-10 on poistettu. Niiden tunnuksia ei käytetä uudelleen.

| Tunnus | Prioriteetti | Vaatimus |
| --- | --- | --- |
| ANS-01 | P1 | Sovelluksen käyttö ei edellytä maksukorttia, ostosta, tilausta tai maksullisen kokeilun aloittamista. |
| ANS-02 | P1 | Käyttöä ei rajoiteta määräaikaiseksi kokeiluksi eikä kirjattavien paastopäivien tai ruokakirjausten käyttökiintiöksi. |
| AVO-01 | P1 | Sovelluksen ja sen omien palvelinosien lähdekoodi on julkisesti saatavilla avoimen lähdekoodin lisenssillä. |
| AVO-02 | P1 | Sovellus ei sisällä mainontaa, maksullisia ominaisuuksia, kaupallista yhteistyötä eikä käyttäjän seurantaa tai analytiikkaa. |
| AVO-03 | P1 | Julkinen lähdekoodi ei sisällä salaisuuksia, kuten palvelutunnuksia. Sovelluksen voi kääntää ja ajaa julkisen ohjeen mukaan ilman kehittäjän tunnuksia; vain OFF-julkaisu edellyttää omaa välityspalvelua tunnuksineen. |
| AVO-04 | Selvitettävä | Suljettujen kirjastojen, palvelujen ja jakelukanavien käyttöä vähennetään, kun avoin vaihtoehto on riittävän hyvä. Jakelu avoimen lähdekoodin sovelluskaupassa (esim. F-Droid) selvitetään. |

## 6. Laskenta ja tietojen laatu

- **LAS-01 (P1):** Kalorien pääyksikkö on kcal. Lähtötiedon kJ-arvo muunnetaan tarvittaessa kcal-arvoksi käyttäen suhdetta 1 kcal = 4,184 kJ. Jos lähteessä on erillinen kcal-arvo, sitä voidaan käyttää suoraan.
- **LAS-02 (P1):** Laskenta erottaa arvot per 100 g, per 100 ml ja per annos. Grammoja ja millilitroja ei rinnasteta ilman tuotekohtaista muunnostietoa.
- **LAS-03 (P1):** Laskennassa säilytetään riittävä tarkkuus; pyöristys tehdään esitystä varten. Päivän summa lasketaan pyöristämättömistä kirjauksista. Pieni mahdollinen ero näkyvien rivien summaan selitetään tarvittaessa.
- **LAS-04 (P1):** Negatiivisia määriä tai energiasisältöjä ei hyväksytä. Nollaenergia voidaan tallentaa tarkoituksellisesti, mutta sitä ei päätellä puuttuvasta tiedosta. Tyhjä tai virheellinen määrä ei kelpaa ruokakirjaukseen.
- **LAS-05 (P1):** Suomessa tavallinen desimaalipilkku hyväksytään määrien syötössä.
- **LAS-06 (P1):** Raaka ja kypsennetty tuote sekä valmistettu ja valmistamaton tuote erotetaan silloin, kun lähdetiedot sen mahdollistavat. Käyttäjälle näytetään, mitä tietoa laskenta käyttää.
- **LAS-07 (P1):** Epäselvä tai ristiriitainen energiatieto näytetään tarkistettavana; sovellus ei keksi puuttuvaa arvoa.

## 7. Käytettävyys ja toimintavarmuus

- **LAA-01 (P1):** Päivän kaloriyhteenveto on luettavissa ilman vierittämistä tavanomaisella puhelinnäytöllä.
- **LAA-02 (P1):** Suosikin oletusannoksen lisääminen vaatii enintään kaksi painallusta avoimesta päivänäkymästä. Näppäimistöä ei tarvita.
- **LAA-03 (P1):** Syötön valmistuttua päivän summa päivittyy normaalitilanteessa yhden sekunnin kuluessa. Hitaasta ulkoisesta hausta näytetään eteneminen ja mahdollinen virhe.
- **LAA-04 (P1):** Omat tuotteet, aiemmin tallennetut tuotetiedot, suosikit, historia ja peruskirjaus toimivat ilman verkkoyhteyttä. Uuden ulkoisen tiedon hakeminen ja OFF-julkaisu voivat vaatia yhteyden.
- **LAA-05 (P1):** Verkkovirhe tai julkisen tietolähteen katkos ei estä pikakirjausta eikä hävitä jo syötettyjä tietoja.
- **LAA-06 (P1):** Käyttöliittymä tukee suurennettua tekstiä ja ruudunlukijan tarvitsemia toimintojen nimiä. Ylitys tai virhe ei ilmene pelkästään väristä.
- **LAA-07 (P1):** Kirjaaminen ei edellytä ruoan luokittelua aamiaiseksi, lounaaksi tai muuksi ateriaksi.
- **LAA-08 (P1):** Sovellus ei lähetä oletusarvoisia muistutuksia ei-paastopäivinä eikä käytä syyllistävää palautetta.

## 8. Yksityisyys ja ulkoisten tietojen käyttö

- **TIE-01 (P1):** Henkilökohtainen päiväkirja ja julkinen tuotetieto erotetaan toisistaan. Käyttäjälle kerrotaan ymmärrettävästi, mitä tietoja ulkoisiin palveluihin välitetään.
- **TIE-02 (P1):** Henkilökohtaista päiväkirjaa ei julkaista eikä käytetä muihin tarkoituksiin ilman erillistä perustetta ja käyttäjälle annettavaa tietoa. Pilvisynkronointi ei ole ensimmäisen version edellytys.
- **TIE-03 (P1):** Tietolähteiden nimet, alkuperät ja vaaditut lisenssimaininnat säilyvät ja ovat käyttäjän saatavilla. Ulkopuolista sovellusta ei esitetä lähdeorganisaatioiden omana tai suosittelemana palveluna.
- **TIE-04 (P1):** Toteutusta varten tarkistetaan lähteiden ajantasaiset käyttöehdot, julkaisuehdot ja käyttörajoitukset. Eri lähteiden tietoja ei käsitellä automaattisesti samoin oikeuksin julkaistavana yhtenä tietokantana.
- **TIE-05 (P1):** Sovellus ei esitä käyttäjän itse asettamaa kalorirajaa yksilöllisenä terveyssuosituksena.

## 9. Ensimmäisen version hyväksymiskriteerit

Kaikkien P1-vaatimusten tulee täyttyä. Seuraavat käyttötilanteet ovat vähimmäisnäyttö toimivuudesta:

1. **Aloitus:** uusi käyttäjä asettaa kalorirajan ja pääsee päivänäkymään ilman henkilötietokyselyä, tilin luontia, maksutietoja tai maksullista kokeilua.
2. **Laskenta:** tuotteesta, jonka energia on 80 kcal/100 g, kirjataan 150 g. Kirjauksen energia on 120 kcal. Esimerkkirajalla 600 kcal jäljellä on 480 kcal. Luvut ovat testiarvoja, eivät ravitsemussuositus.
3. **Korjaus ja ylitys:** määrän muuttaminen tai kirjauksen poistaminen päivittää summan oikein. Raja voidaan ylittää ilman kirjaamisen estoa.
4. **Tuotehaku:** käyttäjä löytää merkkituotteen OFF-hausta tai viivakoodilla sekä tavallisen raaka-aineen Fineli-hausta. Lähde ja energian peruste näkyvät.
5. **Puuttuva tuote:** käyttäjä lisää puuttuvan kauppatuotteen, kirjaa sitä heti ja hyväksyy tarkistetut tiedot julkaistaviksi OFF:iin. Todellinen julkaisu varmennetaan hallitusti OFF:n ajantasaisten testausohjeiden mukaisesti; testituotteilla ei täytetä tuotantotietokantaa.
6. **Julkaisun häiriö:** lähetyksen epäonnistuessa oma kirjaus säilyy, tila näkyy ja uudelleenlähetys onnistuu ilman tahattomia kaksoiskappaleita.
7. **Yksityinen ruoka:** oma resepti tai suosikkiateria voidaan tallentaa ja kirjata ilman sen julkaisemista OFF:iin.
8. **Toistuva ateria:** suosikkiaterian oletusannos voidaan lisätä päivänäkymästä enintään kahdella painalluksella.
9. **Ilman verkkoa:** aiemmin tallennettu suosikki ja pikakirjaus toimivat ilman yhteyttä; kirjaukset säilyvät sovelluksen uudelleenkäynnistyksessä.
10. **Historiallinen eheys:** tuotteen energiatiedon, suosikkiaterian tai yleisen kalorirajan muuttaminen ei muuta aiemman päivän kirjauksia tai rajaa.
11. **Tietojen palautus:** omien tietojen vienti ja palautus säilyttävät päivät, määrät, energiatiedot, suosikit ja asetukset. Palautus ei luo huomaamattomia kaksoiskirjauksia.
12. **Tavallinen päivä:** päivää ei merkitä epäonnistuneeksi tai puutteelliseksi siksi, ettei se ole paastopäivä eikä sisällä ruokakirjauksia.

13. **Maksuton ja avoin:** kaikki toiminnot ovat käytettävissä ilman ostosta, kiintiöitä tai kokeilujaksoa, eikä sovelluksessa ole mainontaa tai analytiikkaa. Lähdekoodi on julkisesti saatavilla avoimella lisenssillä, se ei sisällä salaisuuksia, ja sovelluksen voi kääntää julkisen ohjeen mukaan.

## 10. Myöhempään toteutussuunnitelmaan jäävät päätökset

- Ensimmäisenä tuettavat puhelinalustat ja sovelluksen jakelutapa.
- Teknologiat, arkkitehtuuri, tietojen säilytys, varmistaminen ja päivitysten jakelu.
- OFF-haun ja Fineli-aineiston käytännön toteutus sekä tietojen päivityskäytännöt.
- OFF-julkaisun tunnistautuminen, julkaisuun vaadittavat kentät, käyttäjälle näytettävät ehdot ja virheiden käsittely.
- Keskon tietojen mahdollinen käyttö ja käyttöoikeuksien selvitys.
- Tietojen vienti- ja palautusmuoto sekä palautuksen yhdistämis- tai korvaamiskäytäntö.
- Julkaisua odottavien tuotetietojen säilytys ja epäonnistuneiden lähetysten uudelleenyritykset.
- P2-ominaisuuksien, erityisesti pakkaustekstin tunnistuksen, muistutusten ja viikkorytmin, toteutusjärjestys.
- Mahdollisen myöhemmän monen laitteen käytön ja laajemman jakelun vaatimukset.
- Lähdekoodin lisenssi, julkinen repositorio ja osallistumisen käytännöt.
- Suljettujen riippuvuuksien ja jakelukanavien avoimet vaihtoehdot (AVO-04).

## 11. Tietolähteiden lähtöviitteet

Linkit ovat toteutussuunnittelun lähtökohtia. Tämä vaatimusmäärittely ei vahvista lähteiden tulevaa saatavuutta eikä korvaa käyttöehtojen tarkistamista.

- Open Food Facts, rajapinnan dokumentaatio: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- Open Food Facts, puuttuvien tuotteiden lisääminen: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/adding-missing-products/
- Open Food Facts, käyttöehdot: https://world.openfoodfacts.org/terms-of-use
- Fineli, avoin data: https://fineli.fi/fineli/fi/avoin-data
- Kesko Developer Portal: https://developer.kesko.fi/

## 12. Muutoshistoria

- **0.3 / 25.10.2026:** Luovuttu ansainnasta: sovellus on kokonaan maksuton avoimen lähdekoodin projekti. Poistettu ANS-03–ANS-10, lisätty AVO-01–AVO-04 ja muutettu hyväksymiskriteeri 13.
- **0.2 / 18.10.2026:** Lisätty maksuton peruskäyttö ja mahdollisuus myöhempiin maksullisiin lisäominaisuuksiin tai muihin tulonlähteisiin. Tarkennettu rajausta ja hyväksymiskriteerejä. Ansaintamallia, hinnoittelua tai maksullisten ominaisuuksien sisältöä ei ole valittu.
- **0.1 / 18.10.2026:** Ensimmäinen keskustelun pohjalta laadittu luonnos.

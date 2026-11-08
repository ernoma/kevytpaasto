# 0014 – Repo julkiseksi ennen vaihetta 4

Päiväys: 8.11.2026  
Tila: hyväksytty  
Liittyy: AVO-01, AVO-03, hyväksymiskriteeri 13, päätösmuistiot 0004 ja 0013  
Täsmentää: [0006](0006-avoin-lahdekoodi.md) (avaamisen ajankohta ja välityspalvelun lisenssi)

## Tausta

Päätösmuistion 0006 mukaan repo avataan julkiseksi viimeistään vaiheessa 7, ja toteutussuunnitelma sijoitti avaamisen vaiheeseen 7. Vaiheen 3 jälkeen tarkistettiin 8.11.2026, estääkö jokin avaamisen jo nyt:

- Koko historia (28 committia) skannattiin gitleaksilla 8.30.1, eikä löydöksiä tullut. Myös hakulausekkeilla tehty haku kaikista tiedostoversioista oli puhdas.
- Commitien tekijän ja commitoijan osoite on GitHubin noreply-osoite, eikä repossa ole henkilökohtaisia yhteystietoja.
- `LICENSE`, `license`-kentät ja README lähdemainintoineen ovat valmiina.
- Välityspalvelu on tyhjä runko, jolla ei ole osoitetta, deployta eikä salaisuuksia. GitHub Actions -työnkulkuja ei ole.

Esteitä ei löytynyt, ja avaaminen on nyt helpompaa kuin vaiheessa 7:

- Historiaa on vähän, joten sen voi tarkistaa kerralla.
- OFF:n testitilin tunnukset tulevat käyttöön testiympäristökokeilussa (0004) ja vaiheessa 6. Julkisessa repossa GitHubin salaisuuksien skannaus ja push protection ovat maksuttomia, mutta henkilökohtaisen tilin yksityisessä repossa niitä ei ole.
- Vaiheessa 4 päätettäväksi User-Agentin yhteystiedoksi (0013) voidaan antaa julkisen repon osoite, jolloin henkilökohtaista sähköpostia ei tarvita koodissa.

## Päätös

- **Avaaminen:** repo avataan julkiseksi ennen vaihetta 4, kun tämän muistion valmistelut on tehty. Vaiheeseen 7 jäävät README:n ja osallistumisohjeen tarkistus sekä kriteerin 13 todennus.
- **Salaisuuksien tarkistus:** `npm run secrets` skannaa koko historian gitleaksilla. Pre-push-koukku `.githooks/pre-push` skannaa commitit, joita ei vielä ole etärepossa. Se pysäyttää pushauksen, jos gitleaks löytää jotain tai sitä ei voi ajaa. Koukku otetaan käyttöön kerran kloonia kohden komennolla `git config core.hooksPath .githooks`. Skripti `scripts/git/secrets.ts` etsii gitleaksin muuttujasta `GITLEAKS_BIN` (myös `.env`-tiedostosta), Windowsissa wingetin asennuskansiosta ja lopuksi PATHista.
- **GitHubin asetukset:** avaamisen jälkeen kytketään päälle salaisuuksien skannaus, push protection ja yksityinen haavoittuvuusilmoitus.
- **Pushaus:** valmis commit pushataan `main`-haaraan kysymättä myös julkiseen repoon, kun koukun tarkistus menee läpi. Koukkua ei ohiteta (`--no-verify`), eikä löydöstä merkitä sallituksi ilman kehittäjän lupaa.
- **Vuotanut tunnus:** jos tunnus päätyy pushattuun committiin, se mitätöidään ja vaihdetaan heti. Historian siivous ei riitä, koska julkisesta reposta on voitu jo tehdä klooneja ja forkkeja.
- **Osallistuminen:** virheilmoitukset ja ideat otetaan vastaan issueina, mutta pull requesteja ei oteta vastaan ennen v1:tä ([CONTRIBUTING.md](../../CONTRIBUTING.md)). Haavoittuvuuksista ilmoitetaan yksityisesti ([SECURITY.md](../../SECURITY.md)).
- **Välityspalvelun lisenssi:** välityspalvelun lisenssi on edelleen GPL-3.0-or-later. AGPL:ää harkitaan uudelleen ennen kuin välityspalveluun otetaan ensimmäinen ulkopuolinen muutos. Niin kauan kuin koodilla on yksi tekijä, tulevien versioiden lisenssin voi vaihtaa.
- **Sähköposti:** tämän kloonin commitit tehdään GitHubin noreply-osoitteella (`git config user.email`). Kehittäjän GitHub-tililtä kytketään päälle asetus *Block command line pushes that expose my email*, jotta henkilökohtainen osoite ei päädy pushattuihin commiteihin muistakaan klooneista.

## Seuraukset

- Kaikki pushattu on heti julkista. Tunnukset pidetään vain gitignoroiduissa paikallisissa tiedostoissa (esim. `proxy/.dev.vars`) ja välityspalvelun salaisuuksissa.
- `npm run check` ja README:n käännösohje eivät vaadi gitleaksia, joten sovelluksen voi kääntää ilman sitä (AVO-03). Gitleaksia tarvitaan vain, kun koukku on käytössä.
- `CONTRIBUTING.md` sisältää lyhyen käytösohjeen. Laajempi käytösohje (esim. Contributor Covenant) otetaan käyttöön, kun pull requesteja aletaan ottaa vastaan.
- Kriteerin 13 salaisuusskannaus on tehty ([hyvaksymistestaus.md](../hyvaksymistestaus.md)). Riippuvuuksien katselmointi ja puhdas käännös README:n mukaan tehdään vaiheessa 7.
- Google Play sitoo sovellustunnuksen `fi.kevytpaasto.app` kehittäjätiliin vasta ensimmäisestä ladatusta versiosta, joten joku muu voisi teoriassa ladata julkisesta koodista käännetyn version ensin. Riski on pieni, ja tunnuksen voi varata lataamalla version sisäiseen testaukseen.

## Toteutus

Repo avattiin julkiseksi 8.11.2026. Samalla GitHubissa kytkettiin päälle salaisuuksien skannaus, push protection, yksityinen haavoittuvuusilmoitus ja Dependabotin haavoittuvuushälytykset, ja repolle lisättiin kuvaus. Tilin sähköpostiasetukset kehittäjä kytkee itse.

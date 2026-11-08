# Tietoturva

## Haavoittuvuuden ilmoittaminen

Ilmoita haavoittuvuudesta yksityisesti GitHubin kautta: repon **Security**-välilehti → **Report a vulnerability**. Älä avaa julkista issueta äläkä kerro haavoittuvuudesta muualla ennen kuin se on korjattu.

Kerro ilmoituksessa, mitä osaa haavoittuvuus koskee (sovellus `app/`, välityspalvelu `proxy/` tai skriptit `scripts/`), miten sen voi toistaa ja mitä sillä voi tehdä.

Jos ilmoituspainiketta ei näy, avaa issue, jossa pyydät yhteydenottoa. Älä kerro siinä haavoittuvuuden yksityiskohtia.

## Mitä sovellus suojaa

Päiväkirja, kaloriraja ja syödyt määrät eivät lähde puhelimesta. Sovelluksessa ei ole käyttäjätilejä eikä analytiikkaa. Verkkoon lähtevät vain Open Food Factsin tuotehaut ja käyttäjän hyväksymät julkaistavat tuotetiedot, jotka välitetään Open Food Factsiin välityspalvelun kautta. Nämä toiminnot ovat vielä kehitteillä.

Erityisen tärkeitä ovat haavoittuvuudet, joiden kautta päiväkirjan tietoja voisi päätyä laitteelta tai joiden avulla välityspalvelua voisi käyttää väärin julkaisemiseen Open Food Factsiin.

## Tuetut versiot

Sovellus on kehitysvaiheessa. Korjaukset tehdään vain uusimpaan versioon (`main`-haara).

# 0012 Kirjauksen OFF-alkuperä tilannekuvana

Päiväys: 8.11.2026  
Tila: hyväksytty  
Liittyy: TIE-03, KIR-08, HIS-02, vaihe 4, toteutussuunnitelman kohta 5.1

## Tausta

Open Food Factsin ohje pyytää lähdemainintaa `(c) Open Food Facts contributors` jokaiseen näkymään, jossa näytetään OFF:n tietoja. Tänään-näkymässä ja historiasta avatussa päivässä kirjausten nimi ja energia voivat olla peräisin OFF:sta, joten kirjauslistan alla näytetään maininta, kun päivän kirjauksissa on OFF-tuotteesta tehty kirjaus.

`log_entry` ei tallenna lähdettä. Lähteen voisi päätellä lukuhetkellä `origin_id`:n kautta (`food.source`, ateriassa `meal_item` → `food.source`). Aterian koostumus voi kuitenkin muuttua kirjauksen jälkeen, jolloin vanha kirjaus tulkittaisiin aterian nykytilan perusteella. Tämä on ristiriidassa tilannekuvaperiaatteen kanssa (KIR-08).

## Päätös

- `log_entry`-tauluun lisätään vaiheessa 4 uudella migraatiolla sarake `includes_off_data` (totuusarvo, ei tyhjä, oletus epätosi).
- Arvo asetetaan kirjaushetkellä palvelukerroksessa:
  - ruoasta tehty kirjaus: tosi, jos ruoan `source` on `off`, myös silloin, kun käyttäjä on korjannut tuotteen tietoja (HAK-08)
  - aterian kirjaus: tosi, jos jonkin aterian osan ruoan `source` on `off`
  - pikakirjaus: epätosi.
- Arvo on osa tilannekuvaa. Sitä ei lasketa uudelleen, kun ruoka tai ateria muuttuu tai poistetaan. Kopiointi toiseen päivään (HIS-02) kopioi arvon, ja kirjauksen muokkaus (KIR-05) säilyttää sen.
- Sarake ei vaikuta energian laskentaan.
- Migraatio ei täytä vanhoja rivejä: OFF-haku tulee vasta vaiheessa 4, joten OFF-tuotteista tehtyjä kirjauksia ei ole ennen migraatiota.

## Seuraukset

- Lähdemaininnan näyttäminen on yksinkertainen kysely päivän kirjauksista, eikä se riipu lähderuoista tai aterioista.
- Maininta pysyy oikeana, vaikka ateriaa muokattaisiin tai ruoka poistettaisiin.
- Sarake kuuluu `log_entry`-tauluun, joten se sisältyy vientiin ja palautukseen (vaihe 5) ilman erillistä käsittelyä.
- Migraatio todennetaan emulaattorissa päivityksenä olemassa olevasta tietokannasta (päätösmuistio 0009).

# Hyväksymistestauksen seuranta

Perustuu: [vaatimusmäärittelyn luku 9](../5-2-paasto-vaatimusmaarittely.md#9-ensimmäisen-version-hyväksymiskriteerit) ja [toteutussuunnitelman luku 9](toteutussuunnitelma.md#9-laatu-ja-testaus)

Tila: **ei todennettu** | **osittain todennettu** | **todennettu**. Kun kriteeri todennetaan, merkitse todentava testi tai manuaalinen tarkistus, päiväys ja sovellusversio.

| # | Kriteeri | Vaihe | Todennustapa (suunniteltu) | Testi / tarkistus | Tila | Päiväys |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Aloitus: kaloriraja asetetaan ja päivänäkymä avautuu ilman henkilötietokyselyä, tiliä, maksutietoja tai kokeilua | 1 | Maestro + manuaalinen | Maestro: `app/e2e/onboarding.yaml` (KAY-01): vain rajakenttä, ei henkilötieto-, tili- tai maksukysymyksiä; virheellinen raja näkyy tekstinä; Jatka avaa päivänäkymän. Tekstikoot 1.3 ja 2.0 tarkistettu emulaattorissa. Kokeilu puhelimella vaiheen lopussa. | todennettu (emulaattori) | 25.10.2026, 0.1.0 |
| 2 | Laskenta: 80 kcal/100 g, 150 g → 120 kcal; raja 600 → jäljellä 480 | 2 | Vitest (domain) | – | ei todennettu | – |
| 3 | Korjaus ja ylitys: muutos ja poisto päivittävät summan, rajan voi ylittää | 1 | Vitest (domain, palvelut) + Maestro + manuaalinen | Vitest: `app/tests/services/logEntries.test.ts` › *Acceptance criterion 3* ja `app/tests/domain/daySummary.test.ts` (PAI-03). Maestro: `app/e2e/quick-entry-edit-overage.yaml`: pikakirjaus desimaalipilkulla, ylitys tekstinä (”Ylitys 21 kcal”), energian korjaus ja kirjauksen poisto päivittävät summan, päivän rajan muutos (KAY-03) ja paastopäivän poisto erillisellä kirjausten vahvistuksella (PAI-06). Pikakirjaus toimii lentotilassa (emulaattori). | todennettu (emulaattori) | 25.10.2026, 0.1.0 |
| 4 | Tuotehaku: merkkituote OFF-haulla tai viivakoodilla, raaka-aine Finelistä; lähde ja peruste näkyvät | 3–4 | Manuaalinen puhelimella + integraatiotestit (mockattu OFF) | – | ei todennettu | – |
| 5 | Puuttuva tuote: lisäys, heti kirjattavissa, hyväksyntä julkaisuun; todellinen julkaisu hallitusti OFF:n testiohjeiden mukaan | 6 | Välityspalvelun testit + manuaalinen OFF-testiympäristössä | – | ei todennettu | – |
| 6 | Julkaisun häiriö: oma kirjaus säilyy, tila näkyy, uudelleenlähetys ilman kaksoiskappaleita | 6 | Vitest (tilakone) + välityspalvelun idempotenssitesti | – | ei todennettu | – |
| 7 | Yksityinen ruoka: oma resepti tai suosikkiateria tallennetaan ja kirjataan julkaisematta | 2 | Vitest (palvelut) | – | ei todennettu | – |
| 8 | Toistuva ateria: suosikkiaterian oletusannos enintään kahdella painalluksella | 2 | Maestro | – | ei todennettu | – |
| 9 | Ilman verkkoa: suosikki ja pikakirjaus toimivat, kirjaukset säilyvät uudelleenkäynnistyksessä | 4 | Maestro + manuaalinen lentotilassa | – | ei todennettu | – |
| 10 | Historiallinen eheys: energiatiedon, aterian tai oletusrajan muutos ei muuta vanhoja kirjauksia tai rajaa | 2 | Vitest (tietokanta, palvelut) | – | ei todennettu | – |
| 11 | Tietojen palautus: vienti ja palautus säilyttävät tiedot ilman huomaamattomia kaksoiskirjauksia | 5 | Vitest (vienti–palautus-kierros) | – | ei todennettu | – |
| 12 | Tavallinen päivä: ei-paastopäivää ei merkitä epäonnistuneeksi tai puutteelliseksi | 1 | Manuaalinen + Maestro | Maestro: `app/e2e/non-fast-day.yaml` (PAI-04, LAA-08): ei-paastopäivänä näkyvät vain päivämäärä, ”Tavallinen päivä” ja ”Aloita paastopäivä”, ei kirjauspyyntöä eikä puutteellisuutta vihjaavaa tekstiä. Kuvakaappaus tarkistettu. | todennettu (emulaattori) | 25.10.2026, 0.1.0 |
| 13 | Maksuton ja avoin: ei ostoja, kiintiöitä, kokeilujaksoa, mainontaa eikä analytiikkaa; lähdekoodi julki avoimella lisenssillä ilman salaisuuksia, käännettävissä READMEn ohjeella | 7 | Katselmointi (riippuvuuslista: ei osto-, mainos- tai analytiikkakirjastoja) + salaisuusskannaus Git-historiasta + puhdas käännös READMEn mukaan | – | ei todennettu | – |

## Muutoshistoria

- **25.10.2026:** Kriteerit 1, 3 ja 12 todennettu vaiheessa 1b Maestro-testeillä emulaattorissa (tekstikoot 1.3 ja 2.0, lentotila). Tuntuma, nopeus ja TalkBack kokeillaan puhelimella vaiheen lopussa.
- **25.10.2026:** Kriteeri 3 osittain todennettu vaiheessa 1a (domain- ja palvelutestit).
- **25.10.2026:** Kriteeri 13 päivitetty vaatimusmäärittelyn 0.3 mukaiseksi (maksuton ja avoin).
- **18.10.2026:** Pohja luotu vaiheessa 0. Mitään kriteeriä ei ole vielä todennettu.

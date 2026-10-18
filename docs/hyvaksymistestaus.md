# Hyväksymistestauksen seuranta

Perustuu: [vaatimusmäärittelyn luku 9](../5-2-paasto-vaatimusmaarittely.md#9-ensimmäisen-version-hyväksymiskriteerit) ja [toteutussuunnitelman luku 9](toteutussuunnitelma.md#9-laatu-ja-testaus)

Tila: **ei todennettu** | **osittain todennettu** | **todennettu**. Kun kriteeri todennetaan, merkitse todentava testi tai manuaalinen tarkistus, päiväys ja sovellusversio.

| # | Kriteeri | Vaihe | Todennustapa (suunniteltu) | Testi / tarkistus | Tila | Päiväys |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Aloitus: kaloriraja asetetaan ja päivänäkymä avautuu ilman henkilötietokyselyä, tiliä, maksutietoja tai kokeilua | 1 | Maestro + manuaalinen | – | ei todennettu | – |
| 2 | Laskenta: 80 kcal/100 g, 150 g → 120 kcal; raja 600 → jäljellä 480 | 2 | Vitest (domain) | – | ei todennettu | – |
| 3 | Korjaus ja ylitys: muutos ja poisto päivittävät summan, rajan voi ylittää | 1 | Vitest (domain, palvelut) + manuaalinen | – | ei todennettu | – |
| 4 | Tuotehaku: merkkituote OFF-haulla tai viivakoodilla, raaka-aine Finelistä; lähde ja peruste näkyvät | 3–4 | Manuaalinen puhelimella + integraatiotestit (mockattu OFF) | – | ei todennettu | – |
| 5 | Puuttuva tuote: lisäys, heti kirjattavissa, hyväksyntä julkaisuun; todellinen julkaisu hallitusti OFF:n testiohjeiden mukaan | 6 | Välityspalvelun testit + manuaalinen OFF-testiympäristössä | – | ei todennettu | – |
| 6 | Julkaisun häiriö: oma kirjaus säilyy, tila näkyy, uudelleenlähetys ilman kaksoiskappaleita | 6 | Vitest (tilakone) + välityspalvelun idempotenssitesti | – | ei todennettu | – |
| 7 | Yksityinen ruoka: oma resepti tai suosikkiateria tallennetaan ja kirjataan julkaisematta | 2 | Vitest (palvelut) | – | ei todennettu | – |
| 8 | Toistuva ateria: suosikkiaterian oletusannos enintään kahdella painalluksella | 2 | Maestro | – | ei todennettu | – |
| 9 | Ilman verkkoa: suosikki ja pikakirjaus toimivat, kirjaukset säilyvät uudelleenkäynnistyksessä | 4 | Maestro + manuaalinen lentotilassa | – | ei todennettu | – |
| 10 | Historiallinen eheys: energiatiedon, aterian tai oletusrajan muutos ei muuta vanhoja kirjauksia tai rajaa | 2 | Vitest (tietokanta, palvelut) | – | ei todennettu | – |
| 11 | Tietojen palautus: vienti ja palautus säilyttävät tiedot ilman huomaamattomia kaksoiskirjauksia | 5 | Vitest (vienti–palautus-kierros) | – | ei todennettu | – |
| 12 | Tavallinen päivä: ei-paastopäivää ei merkitä epäonnistuneeksi tai puutteelliseksi | 1 | Manuaalinen + Maestro | – | ei todennettu | – |
| 13 | Maksuton peruskäyttö: P1-toiminnot ilman ostoa, ei kiintiöitä eikä kokeilujaksoa | 7 | Katselmointi (`entitlements.has()` aina `false`) + manuaalinen | – | ei todennettu | – |

## Muutoshistoria

- **18.10.2026:** Pohja luotu vaiheessa 0. Mitään kriteeriä ei ole vielä todennettu.

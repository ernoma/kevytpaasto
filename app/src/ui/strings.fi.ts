// All user-visible text in Finnish. Keep UI copy here so it can be localized later.
export const strings = {
  appName: 'Kevytpaasto',
  home: {
    title: 'Kevytpaasto',
    placeholder: 'Sovelluksen pohja toimii. Paastopäivän kirjanpito lisätään vaiheessa 1.',
    dbReady: 'Tietokanta on valmis.',
    dbMigrating: 'Tietokantaa valmistellaan…',
    dbError: 'Tietokannan valmistelu epäonnistui:',
    barcodeExperimentLink: 'Kokeilu: viivakoodin luku',
    ftsExperimentLink: 'Kokeilu: tekstihaku (FTS5)',
  },
  // Phase 0 experiment (docs/adr/0003). Shown only in development builds.
  ftsExperiment: {
    title: 'Tekstihakukokeilu',
    running: 'Tarkistetaan…',
    sqliteVersion: (version: string) => `SQLite-versio: ${version}`,
    ftsOk: (rows: number, insertMs: number) =>
      `FTS5 toimii. ${rows} riviä lisätty ${insertMs} ms:ssa.`,
    ftsFailed: 'FTS5 ei ole käytettävissä:',
    query: (term: string, hits: number, ms: string) => `”${term}”: ${hits} osumaa, ${ms} ms`,
    rerun: 'Aja uudelleen',
  },
  // Phase 0 experiment (docs/adr/0002). Shown only in development builds.
  barcodeExperiment: {
    title: 'Viivakoodikokeilu',
    intro:
      'Lue pakkausten viivakoodeja ja vertaa tulosta pakkaukseen painettuun numeroon. Merkitse väärin luetut rivit.',
    openCamera: 'Avaa kamera',
    closeCamera: 'Sulje kamera',
    scanNext: 'Lue seuraava',
    permissionNeeded: 'Viivakoodin lukeminen kameralla vaatii kameraluvan.',
    permissionDenied:
      'Kameralupaa ei ole annettu. Voit sallia sen puhelimen asetuksista tai syöttää viivakoodin käsin.',
    openSettings: 'Avaa asetukset',
    manualLabel: 'Syötä viivakoodi käsin',
    manualPlaceholder: 'Esim. 6410000000000',
    manualSubmit: 'Tarkista',
    resultsTitle: 'Tulokset',
    noResults: 'Ei vielä luettuja koodeja.',
    markWrong: 'Merkitse väärin luetuksi',
    unmarkWrong: 'Poista väärin-merkintä',
    wrongTag: 'Väärin luettu',
    manualTag: 'Käsin',
    share: 'Jaa tulokset',
    clear: 'Tyhjennä tulokset',
    summary: (total: number, wrong: number, fast: number, scanned: number, median: string) =>
      `Luettu ${total}, väärin ${wrong}. Kameralla luetuista ${fast}/${scanned} alle 2 s, mediaani ${median}.`,
    invalid: {
      empty: 'Tyhjä',
      not_digits: 'Sisältää muita merkkejä kuin numeroita',
      bad_length: 'Väärä pituus',
      bad_check_digit: 'Tarkistenumero ei täsmää',
    },
  },
} as const;

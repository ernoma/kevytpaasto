// All user-visible text in Finnish. Keep UI copy here so it can be localized later.
export const strings = {
  appName: 'Kevytpaasto',
  kcal: (value: string) => `${value} kcal`,
  cancel: 'Peruuta',
  startup: {
    migrating: 'Tietokantaa valmistellaan…',
    dbError: 'Tietokannan valmistelu epäonnistui:',
  },
  // Validation messages for typed amounts (LAS-05) and limits (KAY-01).
  amountError: {
    empty: 'Syötä luku.',
    invalid: 'Syötä luku, esimerkiksi 120 tai 12,5.',
    negative: 'Luku ei voi olla negatiivinen.',
    zero: 'Rajan on oltava suurempi kuin nolla.',
  },
  saveFailed: 'Tallennus ei onnistunut. Yritä uudelleen.',
  onboarding: {
    title: 'Tervetuloa',
    intro: 'Aseta paastopäivän kaloriraja. Voit muuttaa sitä myöhemmin asetuksista.',
    limitLabel: 'Paastopäivän kaloriraja (kcal)',
    limitPlaceholder: 'Esimerkiksi 500',
    submit: 'Jatka',
  },
  today: {
    title: 'Tänään',
    limit: 'Raja',
    consumed: 'Syöty',
    remaining: (value: string) => `Jäljellä ${value} kcal`,
    over: (value: string) => `Ylitys ${value} kcal`,
    summaryLabel: (date: string, limit: string, consumed: string, status: string) =>
      `${date}. Raja ${limit} kcal, syöty ${consumed} kcal. ${status}.`,
    addEntry: 'Lisää kirjaus',
    entriesTitle: 'Kirjaukset',
    noEntries: 'Ei vielä kirjauksia.',
    unnamedEntry: 'Pikakirjaus',
    entryLabel: (name: string, kcal: string) => `${name}, ${kcal} kcal. Muokkaa kirjausta`,
    changeLimit: 'Muuta päivän rajaa',
    deleteDay: 'Poista paastopäivä',
    // A non-fast day is an ordinary day, not a missed or incomplete one (PAI-04, criterion 12).
    ordinaryDay: 'Tavallinen päivä',
    startFastDay: 'Aloita paastopäivä',
    settings: 'Asetukset',
  },
  deleteDay: {
    title: 'Poistetaanko paastopäivä?',
    message: 'Päivän paastopäivämerkintä poistetaan.',
    confirm: 'Poista',
    entriesTitle: 'Poistetaanko myös kirjaukset?',
    entriesMessage: (count: number) =>
      count === 1
        ? 'Päivällä on 1 kirjaus. Se poistetaan pysyvästi päivän mukana.'
        : `Päivällä on ${count} kirjausta. Ne poistetaan pysyvästi päivän mukana.`,
    entriesConfirm: 'Poista päivä ja kirjaukset',
  },
  entry: {
    newTitle: 'Pikakirjaus',
    editTitle: 'Muokkaa kirjausta',
    kcalLabel: 'Energia (kcal)',
    kcalPlaceholder: 'Esimerkiksi 120',
    nameLabel: 'Nimi (vapaaehtoinen)',
    namePlaceholder: 'Esimerkiksi omena',
    save: 'Tallenna',
    saving: 'Tallennetaan…',
    delete: 'Poista kirjaus',
    deleteTitle: 'Poistetaanko kirjaus?',
    deleteConfirm: 'Poista',
    moveTitle: 'Siirrä toiseen paastopäivään',
    moveTo: (date: string) => `Siirrä päivälle ${date}`,
    noOtherDays: 'Muita paastopäiviä ei ole.',
    notFound: 'Kirjausta ei löytynyt.',
    notQuickEntry: 'Tätä kirjausta ei voi vielä muokata.',
  },
  dayLimit: {
    title: 'Päivän raja',
    label: 'Tämän päivän kaloriraja (kcal)',
    hint: 'Muutos koskee vain tätä päivää. Oletusrajan voit muuttaa asetuksista.',
    save: 'Tallenna',
  },
  settings: {
    title: 'Asetukset',
    defaultLimitLabel: 'Uusien paastopäivien kaloriraja (kcal)',
    defaultLimitHint: 'Muutos koskee uusia paastopäiviä. Jo aloitettujen päivien raja ei muutu.',
    save: 'Tallenna',
    saved: 'Tallennettu.',
    devTitle: 'Kehitys',
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
    done: 'Valmis.',
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

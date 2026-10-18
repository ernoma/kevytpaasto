// Phase 0 experiment: barcode scanning on a real phone (docs/adr/0002).
// Remove this route when phase 4 implements the real scanner.
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Stack, useTheme } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { normalizeBarcode, type BarcodeResult, type RetailBarcodeType } from '@/domain/barcode';
import { strings } from '@/ui/strings.fi';

const t = strings.barcodeExperiment;
const BARCODE_TYPES: RetailBarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e'];

type ScanRow = {
  id: number;
  source: 'camera' | 'manual';
  type: string;
  raw: string;
  result: BarcodeResult;
  elapsedMs: number | null;
  wrong: boolean;
};

function isRetailType(type: string): type is RetailBarcodeType {
  return (BARCODE_TYPES as string[]).includes(type);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function formatSeconds(ms: number | null): string {
  return ms === null ? '–' : `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}

function describeResult(result: BarcodeResult): string {
  return result.ok ? result.code : t.invalid[result.reason];
}

export default function BarcodeExperimentScreen() {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualText, setManualText] = useState('');
  const [rows, setRows] = useState<ScanRow[]>([]);
  const startedAt = useRef(0);
  const locked = useRef(false);
  const nextId = useRef(1);

  const textStyle = { color: colors.text };

  function startScanning() {
    locked.current = false;
    startedAt.current = Date.now();
    setScanning(true);
  }

  async function openCamera() {
    // Permission is requested only when the user opens the scanner (KAY-04).
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) return;
    }
    setCameraOpen(true);
    startScanning();
  }

  function addRow(row: Omit<ScanRow, 'id' | 'wrong'>) {
    const id = nextId.current++;
    setRows((current) => [{ ...row, id, wrong: false }, ...current]);
  }

  function onBarcodeScanned(scan: BarcodeScanningResult) {
    // The callback can fire several times before state updates; accept only the first code.
    if (locked.current) return;
    locked.current = true;
    setScanning(false);
    addRow({
      source: 'camera',
      type: scan.type,
      raw: scan.data,
      result: normalizeBarcode(scan.data, isRetailType(scan.type) ? scan.type : undefined),
      elapsedMs: Date.now() - startedAt.current,
    });
  }

  function submitManual() {
    addRow({
      source: 'manual',
      type: 'manual',
      raw: manualText,
      result: normalizeBarcode(manualText),
      elapsedMs: null,
    });
    setManualText('');
  }

  function toggleWrong(id: number) {
    setRows((current) => current.map((r) => (r.id === id ? { ...r, wrong: !r.wrong } : r)));
  }

  const cameraRows = rows.filter((r) => r.source === 'camera');
  const times = cameraRows.map((r) => r.elapsedMs ?? 0);
  const summary = t.summary(
    rows.length,
    rows.filter((r) => r.wrong || !r.result.ok).length,
    times.filter((ms) => ms < 2000).length,
    cameraRows.length,
    formatSeconds(median(times)),
  );

  function shareResults() {
    const lines = rows
      .slice()
      .reverse()
      .map((r) =>
        [
          r.source,
          r.type,
          r.raw,
          describeResult(r.result),
          r.elapsedMs ?? '',
          r.wrong ? 'VÄÄRIN' : '',
        ].join(';'),
      );
    void Share.share({
      message: [summary, 'lähde;tyyppi;raaka;normalisoitu;ms;merkintä', ...lines].join('\n'),
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t.title }} />
      <Text style={[styles.body, textStyle]}>{t.intro}</Text>

      {cameraOpen && permission?.granted ? (
        <View style={styles.cameraBox}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
            onBarcodeScanned={scanning ? onBarcodeScanned : undefined}
          />
        </View>
      ) : null}

      <View style={styles.row}>
        {cameraOpen ? (
          <>
            <Button label={t.scanNext} onPress={startScanning} disabled={scanning} />
            <Button label={t.closeCamera} onPress={() => setCameraOpen(false)} />
          </>
        ) : (
          <Button label={t.openCamera} onPress={openCamera} />
        )}
      </View>

      {permission && !permission.granted ? (
        <View style={styles.section}>
          <Text style={[styles.body, textStyle]}>
            {permission.canAskAgain ? t.permissionNeeded : t.permissionDenied}
          </Text>
          {!permission.canAskAgain ? (
            <Button label={t.openSettings} onPress={() => void Linking.openSettings()} />
          ) : null}
        </View>
      ) : null}

      {/* Manual entry is always available (HAK-05). */}
      <View style={styles.section}>
        <Text style={[styles.label, textStyle]} nativeID="manualLabel">
          {t.manualLabel}
        </Text>
        <TextInput
          accessibilityLabelledBy="manualLabel"
          accessibilityLabel={t.manualLabel}
          value={manualText}
          onChangeText={setManualText}
          placeholder={t.manualPlaceholder}
          keyboardType="number-pad"
          onSubmitEditing={submitManual}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
        <Button label={t.manualSubmit} onPress={submitManual} />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, textStyle]}>
          {t.resultsTitle}
        </Text>
        <Text accessibilityLiveRegion="polite" style={[styles.body, textStyle]}>
          {rows.length === 0 ? t.noResults : summary}
        </Text>
        {rows.map((r) => (
          <View key={r.id} style={[styles.resultRow, { borderColor: colors.border }]}>
            <Text style={[styles.mono, textStyle]}>
              {r.source === 'manual' ? t.manualTag : r.type} · {r.raw}
            </Text>
            <Text style={[styles.body, textStyle]}>
              {describeResult(r.result)}
              {r.elapsedMs !== null ? ` · ${formatSeconds(r.elapsedMs)}` : ''}
              {r.wrong ? ` · ${t.wrongTag}` : ''}
            </Text>
            <Button
              label={r.wrong ? t.unmarkWrong : t.markWrong}
              onPress={() => toggleWrong(r.id)}
            />
          </View>
        ))}
        {rows.length > 0 ? (
          <View style={styles.row}>
            <Button label={t.share} onPress={shareResults} />
            <Button label={t.clear} onPress={() => setRows([])} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Button({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  section: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cameraBox: { height: 260, borderRadius: 12, overflow: 'hidden' },
  body: { fontSize: 16 },
  label: { fontSize: 16, fontWeight: '600' },
  heading: { fontSize: 20, fontWeight: '600' },
  mono: { fontSize: 15, fontFamily: 'monospace' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 18 },
  resultRow: { borderTopWidth: 1, paddingTop: 8, gap: 4 },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

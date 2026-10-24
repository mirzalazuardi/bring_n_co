import QRCode from 'qrcode';

/**
 * QR helpers (see openspec/changes/feat-questionnaire): build the fill URL
 * encoded into each questionnaire QR and render it as an SVG string — all
 * server-side, no external service.
 */

export function buildQuestionnaireFillUrl(baseUrl: string, questionnaireId: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/kuesioner/${questionnaireId}`;
}

/**
 * Resolve the public base URL for QR generation: NEXTAUTH_URL when set,
 * otherwise derived from the incoming request headers (x-forwarded-* or host).
 */
export function resolveBaseUrl(request: Request): string {
  const envUrl = process.env.NEXTAUTH_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return '';
  const proto = request.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** Render the questionnaire QR as an SVG string (server-side only). */
export async function renderQuestionnaireQrSvg(fillUrl: string): Promise<string> {
  return QRCode.toString(fillUrl, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}

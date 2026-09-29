import type { Context } from '../app/context';
import { trace } from '../app/diagnostics/trace';
import { icon } from '../ui/icons';
interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternative;
}
interface SpeechEvent {
  resultIndex: number;
  results: { readonly length: number; [index: number]: SpeechResult };
}
interface SpeechError {
  error: string;
  message?: string;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechError) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;
let permissionAcknowledged = false;

/** La captura de voz del navegador comienza únicamente al accionar el micrófono. */
export function bindDictation(root: HTMLElement, signal: AbortSignal, ctx?: Context): void {
  let recognition: Recognition | null = null;
  let inputId = '';
  let prefix = '',
    suffix = '',
    committed = '';
  const paint = (listening: boolean) => {
    const input = document.getElementById(inputId),
      mic = input?.closest('form')?.querySelector<HTMLButtonElement>('[data-action=dictate]');
    if (mic) {
      mic.classList.toggle('listening', listening);
      mic.setAttribute('aria-pressed', String(listening));
      mic.setAttribute('aria-label', listening ? 'Detener dictado' : 'Dictar');
      mic.dataset.tip = listening ? 'Detener dictado' : 'Dictar';
      mic.innerHTML = icon(listening ? 'stop' : 'mic', 17);
    }
  };
  const start = (form: HTMLFormElement) => {
    const input = form.querySelector<HTMLTextAreaElement>('textarea');
    if (!input) return;
    const browser = window as Window & {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    };
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) {
      ctx?.notice('Dictado no disponible en este navegador.', true);
      return;
    }
    inputId = input.id;
    prefix = input.value.slice(0, input.selectionStart);
    suffix = input.value.slice(input.selectionEnd);
    committed = '';
    if (prefix && !/\s$/.test(prefix)) prefix += ' ';
    const active = new Constructor();
    recognition = active;
    active.lang = ctx?.store.get().profile.language ?? 'es-AR';
    active.continuous = true;
    active.interimResults = true;
    active.onstart = () => {
      paint(true);
      trace.add('dictation.started', { composer: form.id });
    };
    active.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index],
          words = result?.[0]?.transcript ?? '';
        if (result?.isFinal) committed += words + ' ';
        else interim += words;
      }
      const current = document.getElementById(inputId);
      if (current instanceof HTMLTextAreaElement) {
        current.value = prefix + committed + interim + suffix;
        current.dispatchEvent(new Event('input', { bubbles: true }));
      }
      trace.add('dictation.result', {
        composer: form.id,
        characters: committed.length + interim.length,
      });
    };
    active.onerror = (event) => {
      const message =
        event.error === 'not-allowed'
          ? 'No se concedió acceso al micrófono.'
          : event.error === 'no-speech'
            ? 'No se detectó voz.'
            : 'El servicio de dictado no está disponible.';
      ctx?.notice(message, true);
      trace.add('dictation.unavailable', { code: event.error, composer: form.id });
      paint(false);
    };
    active.onend = () => {
      paint(false);
      recognition = null;
      trace.add('dictation.stopped', { composer: form.id });
    };
    try {
      active.start();
    } catch (error) {
      recognition = null;
      paint(false);
      ctx?.notice('No se pudo iniciar el dictado.', true);
      trace.add('dictation.start-unavailable', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  root.addEventListener(
    'click',
    (event) => {
      const target =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action]') : null;
      const form = target?.closest('form');
      if (!(form instanceof HTMLFormElement)) return;
      if (target?.dataset.action === 'dictation-cancel') {
        form.querySelector('.dictation-consent')?.remove();
        return;
      }
      if (target?.dataset.action === 'dictation-confirm') {
        permissionAcknowledged = true;
        form.querySelector('.dictation-consent')?.remove();
        start(form);
        return;
      }
      if (target?.dataset.action !== 'dictate') return;
      if (recognition) {
        recognition.stop();
        paint(false);
        return;
      }
      if (!permissionAcknowledged) {
        if (form.querySelector('.dictation-consent')) {
          form.querySelector('.dictation-consent')?.remove();
          return;
        }
        form.insertAdjacentHTML(
          'beforeend',
          '<div class="dictation-consent" role="dialog" aria-label="Permiso de dictado"><p>El navegador puede enviar el audio a su servicio de dictado.</p><div><button type="button" data-action="dictation-cancel">Cancelar</button><button type="button" data-action="dictation-confirm">Iniciar dictado</button></div></div>',
        );
        return;
      }
      start(form);
    },
    { signal },
  );
  signal.addEventListener(
    'abort',
    () => {
      recognition?.abort();
      recognition = null;
    },
    { once: true },
  );
}

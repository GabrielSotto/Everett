import type { Context, Slot } from '../app/context';
import { html, target, value } from './dom';
import { btn, icon } from './icons';
import { bindDismiss } from './popover';
import { trace } from '../app/diagnostics/trace';
export const slots: Slot[] = ['preview', 'files', 'images', 'browser', 'terminal'];
const slotNames: Record<Slot, string> = {
  preview: 'Preview',
  files: 'Archivos',
  images: 'Imágenes',
  browser: 'Browser',
  terminal: 'Terminal',
};
const slotIcons: Record<Slot, string> = {
  preview: 'expand',
  files: 'folder',
  images: 'image',
  browser: 'search',
  terminal: 'terminal',
};
interface SlotContent {
  terminal: string;
  image: string;
  url: string;
}
const sessions = new WeakMap<Context, Map<string, SlotContent>>();
function content(ctx: Context): SlotContent {
  let worlds = sessions.get(ctx);
  if (!worlds) {
    worlds = new Map();
    sessions.set(ctx, worlds);
  }
  let current = worlds.get(ctx.world().id);
  if (!current) {
    current = { terminal: '/worlds/' + ctx.world().id + '\n', image: '', url: '' };
    worlds.set(ctx.world().id, current);
  }
  return current;
}
export function slotToggle(ctx: Context): string {
  return btn(
    'slot-toggle',
    'panel-right',
    ctx.ui.auxiliary.slot ? 'Cerrar slot auxiliar' : 'Abrir slot auxiliar',
    `aria-expanded="${!!ctx.ui.auxiliary.slot}" aria-controls="aux-slot"`,
    !!ctx.ui.auxiliary.slot,
  );
}
export function tools(ctx: Context): string {
  return ctx.ui.auxiliary.tools
    ? `<div class="tools-pop" role="menu">${slots.map((s) => btn('slot', slotIcons[s], slotNames[s], `data-slot="${s}"`)).join('')}</div>`
    : '';
}
export function slot(ctx: Context, closeControl = true): string {
  const s = ctx.ui.auxiliary.slot;
  if (!s) return '';
  const w = ctx.world(),
    cache = content(ctx);
  let body = '';
  if (s === 'files')
    body = `<div class="slot-files">${w.files.map((f) => `<button data-action="slot-file" data-id="${f.id}">${icon('code', 16)}<span>${html(f.name)}</span></button>`).join('')}${w.docs.map((d) => `<button data-action="slot-doc" data-id="${d.id}">${icon('docs', 16)}<span>${html(d.title)}</span></button>`).join('')}</div>`;
  if (s === 'preview')
    body = `<div class="preview-page"><h2>${html(w.name)}</h2><p>${html(w.objective)}</p>${w.tasks
      .slice(0, 4)
      .map(
        (t) =>
          `<div class="preview-task"><span class="status-dot ${t.status}"></span>${html(t.title)}</div>`,
      )
      .join('')}</div>`;
  if (s === 'images')
    body = `<label class="image-drop">${icon('image', 28)}<input type="file" id="slot-image" accept="image/*" aria-label="Abrir imagen"></label><img id="slot-image-view" alt="Imagen de trabajo" ${cache.image ? `src="${cache.image}"` : 'hidden'}>`;
  if (s === 'browser')
    body = `<form id="browser-form" class="inline-search"><input id="browser-url" placeholder="https://" value="${html(cache.url)}" aria-label="Dirección web"><button class="icon-button" type="submit" aria-label="Abrir dirección">${icon('arrow')}</button></form>${cache.url ? `<article class="browser-link"><span>${icon('search', 22)}</span><h3>${html(new URL(cache.url).hostname)}</h3><a href="${html(cache.url)}" target="_blank" rel="noopener noreferrer">Abrir en navegador ${icon('arrow', 13)}</a></article>` : `<div class="browser-start">${icon('search', 32)}</div>`}`;
  if (s === 'terminal')
    body = `<pre class="terminal-log" id="terminal-log">${html(cache.terminal)}</pre><form id="terminal-form" class="terminal-prompt"><span>›</span><input id="terminal-input" aria-label="Comando" autocomplete="off" spellcheck="false"></form>`;
  return `<aside class="aux-slot" id="aux-slot" data-slot="${s}" aria-label="${slotNames[s]}"><div class="slot-head"><div class="slot-selector" role="toolbar" aria-label="Herramientas del slot">${slots.map((item) => btn('slot', slotIcons[item], slotNames[item], `data-slot="${item}"`, item === s)).join('')}</div>${closeControl ? btn('slot-close', 'panel-right', 'Cerrar slot auxiliar') : ''}</div><div class="slot-body">${body}</div></aside>`;
}
export function bindSlot(root: HTMLElement, ctx: Context, signal: AbortSignal): void {
  bindDismiss(
    signal,
    () => ctx.ui.auxiliary.tools,
    () => {
      ctx.ui.auxiliary.tools = false;
      ctx.render();
    },
    '.tools-pop,[data-action=tools]',
  );
  root.addEventListener(
    'click',
    (e) => {
      const t = target(e);
      if (!t) return;
      switch (t.dataset.action) {
        case 'slot-toggle':
          if (ctx.ui.auxiliary.slot) {
            ctx.ui.auxiliary.lastSlot = ctx.ui.auxiliary.slot;
            ctx.ui.auxiliary.slot = null;
          } else ctx.ui.auxiliary.slot = ctx.ui.auxiliary.lastSlot;
          ctx.ui.auxiliary.tools = false;
          ctx.render();
          trace.add('slot.toggle', {
            open: !!ctx.ui.auxiliary.slot,
            component: ctx.ui.auxiliary.slot,
          });
          break;
        case 'tools':
          ctx.ui.auxiliary.tools = !ctx.ui.auxiliary.tools;
          ctx.render();
          break;
        case 'slot': {
          const s = t.dataset.slot;
          if (slots.some((x) => x === s)) {
            ctx.ui.auxiliary.slot = s as Slot;
            ctx.ui.auxiliary.lastSlot = s as Slot;
            ctx.ui.auxiliary.tools = false;
            ctx.render();
            trace.add('slot.component', { component: s });
          }
          break;
        }
        case 'slot-close':
          if (ctx.ui.auxiliary.slot) ctx.ui.auxiliary.lastSlot = ctx.ui.auxiliary.slot;
          ctx.ui.auxiliary.slot = null;
          ctx.render();
          break;
        case 'slot-file':
          ctx.go({
            kind: 'surface',
            world: ctx.world().id,
            surface: 'code',
            entity: t.dataset.id ?? null,
          });
          break;
        case 'slot-doc':
          ctx.go({
            kind: 'surface',
            world: ctx.world().id,
            surface: 'docs',
            entity: t.dataset.id ?? null,
          });
          break;
      }
    },
    { signal },
  );
  root.addEventListener(
    'submit',
    (e) => {
      if (!(e.target instanceof HTMLFormElement)) return;
      if (e.target.id === 'terminal-form') {
        e.preventDefault();
        const command = value(root, '#terminal-input').trim(),
          cache = content(ctx),
          w = ctx.world();
        let response = '';
        if (command === 'clear') cache.terminal = '';
        else {
          if (command === 'help') response = 'pwd · ls · cat <archivo> · echo <texto> · clear';
          else if (command === 'pwd') response = '/worlds/' + w.id;
          else if (command === 'ls') response = w.files.map((f) => f.name).join('\n');
          else if (command.startsWith('cat '))
            response =
              w.files.find((f) => f.name === command.slice(4))?.text ?? 'Archivo no encontrado.';
          else if (command.startsWith('echo ')) response = command.slice(5);
          else if (command) response = 'Comando no disponible. Escribí help.';
          cache.terminal += '› ' + command + '\n' + response + '\n';
        }
        const log = root.querySelector('#terminal-log'),
          input = root.querySelector<HTMLInputElement>('#terminal-input');
        if (log) log.textContent = cache.terminal;
        if (input) input.value = '';
      }
      if (e.target.id === 'browser-form') {
        e.preventDefault();
        const input = value(root, '#browser-url').trim();
        try {
          const url = new URL(input.includes('://') ? input : 'https://' + input);
          if (!['https:', 'http:'].includes(url.protocol)) throw new Error('scheme');
          content(ctx).url = url.href;
          ctx.render();
        } catch {
          ctx.notice('Ingresá una dirección http o https válida.', true);
        }
      }
    },
    { signal },
  );
  root.addEventListener(
    'change',
    (e) => {
      if (!(e.target instanceof HTMLInputElement) || e.target.id !== 'slot-image') return;
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
        ctx.notice('Usá una imagen de hasta 10 MB.', true);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          content(ctx).image = reader.result;
          if (!signal.aborted) ctx.render();
        }
      };
      reader.onerror = () => ctx.notice('No se pudo abrir la imagen.', true);
      reader.readAsDataURL(file);
    },
    { signal },
  );
}

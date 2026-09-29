import { test, expect } from './fixtures';
import { enterWorld, openSurface } from './interaction-helpers';

test('UI-CODE-01: crear, editar, buscar y guardar conserva el archivo al cambiar de superficie', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Code');
  await page.getByRole('button', { name: 'Crear archivo', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nombre del archivo' }).fill('src/checked.ts');
  await page.getByRole('textbox', { name: 'Nombre del archivo' }).press('Enter');
  const editor = page.getByRole('textbox', { name: 'Editar src/checked.ts', exact: true });
  const text = 'export const verified = true;\n\n// Conserva las líneas vacías.\n';
  await editor.fill(text);
  await expect(editor).toBeFocused();
  await expect(page.locator('#save-status')).toHaveText('Sin guardar');
  await editor.press('Control+s');
  await expect(page.locator('#save-status')).toHaveText('Guardado');
  await page.getByRole('button', { name: 'Buscar en el archivo', exact: true }).click();
  await page.getByRole('textbox', { name: 'Buscar en código', exact: true }).fill('verified');
  await page.getByRole('textbox', { name: 'Buscar en código', exact: true }).press('Enter');
  await expect(editor).toBeFocused();
  expect(
    await editor.evaluate((element: HTMLTextAreaElement) =>
      element.value.slice(element.selectionStart, element.selectionEnd),
    ),
  ).toBe('verified');
  await openSurface(page, 'Docs');
  await openSurface(page, 'Code');
  await page.getByRole('button', { name: 'src/checked.ts', exact: true }).click();
  await expect(editor).toHaveValue(text);
  await expect(page.locator('#save-status')).toHaveText('Guardado');
});

test('UI-CODE-02: una propuesta mantiene el original hasta aceptar y muestra el cambio real', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Code');
  const editor = page.locator('#code-editor');
  const before = await editor.inputValue();
  await page.getByRole('button', { name: 'Hablar con Milo', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Pedile un cambio a Milo…', exact: true })
    .fill('Agregá una validación de texto vacío');
  await page.getByRole('textbox', { name: 'Pedile un cambio a Milo…', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'Revisar propuesta', exact: true })).toBeVisible();
  await expect(editor).toHaveValue(before);
  await page.getByRole('button', { name: 'Revisar propuesta', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Comparación de cambios' })).toContainText(
    'isNonEmpty',
  );
  await page.getByRole('button', { name: 'Aceptar cambios', exact: true }).click();
  await expect(editor).toHaveValue(
    before +
      '\nexport function isNonEmpty(value: unknown): value is string {\n  return typeof value === "string" && value.trim().length > 0;\n}\n',
  );
  await expect(page.locator('#save-status')).toHaveText('Sin guardar');
});

test('UI-DOCS-01: el texto multilínea y el título sobreviven a paneles y cambios de documento', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Docs');
  await page.getByRole('button', { name: 'Crear documento', exact: true }).click();
  const title = page.getByRole('heading', { name: 'Título del documento', exact: true });
  const body = page.getByRole('textbox', { name: 'Contenido del documento', exact: true });
  await title.fill('Documento de regresión');
  await body.fill('Primera línea\n\nTercera línea\nÚltima línea');
  await expect(body).toBeFocused();
  await page.getByRole('button', { name: 'Ocultar documentos', exact: true }).click();
  await page.getByRole('button', { name: 'Mostrar documentos', exact: true }).click();
  await openSurface(page, 'Code');
  await openSurface(page, 'Docs');
  await page.getByRole('button', { name: 'Documento de regresión', exact: true }).click();
  await expect(title).toHaveText('Documento de regresión');
  await expect(body).toHaveValue('Primera línea\n\nTercera línea\nÚltima línea');
  await body.press('Control+End');
  await body.press('Enter');
  await body.press('Enter');
  await body.pressSequentially('Línea nueva');
  await openSurface(page, 'Code');
  await openSurface(page, 'Docs');
  await page.getByRole('button', { name: 'Documento de regresión', exact: true }).click();
  await expect(body).toHaveValue('Primera línea\n\nTercera línea\nÚltima línea\n\nLínea nueva');
});

test('UI-DOCS-02: editar celdas conserva sus vecinas al volver a la hoja', async ({ page }) => {
  await enterWorld(page);
  await openSurface(page, 'Docs');
  await page.getByRole('button', { name: 'Crear hoja', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Título del documento', exact: true })
    .fill('Hoja de regresión');
  await page.getByRole('textbox', { name: 'Celda A1', exact: true }).fill('Origen');
  await page.getByRole('textbox', { name: 'Celda B1', exact: true }).fill('42');
  await page.getByRole('textbox', { name: 'Celda A2', exact: true }).fill('Segunda fila');
  await openSurface(page, 'Canvas');
  await openSurface(page, 'Docs');
  await page.getByRole('button', { name: 'Hoja de regresión', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Celda A1', exact: true })).toHaveValue('Origen');
  await expect(page.getByRole('textbox', { name: 'Celda B1', exact: true })).toHaveValue('42');
  await expect(page.getByRole('textbox', { name: 'Celda A2', exact: true })).toHaveValue(
    'Segunda fila',
  );
  await expect(page.getByRole('textbox', { name: 'Celda B2', exact: true })).toHaveValue('');
});

test('UI-BOARD-01: crear y mover una tarea conserva el estado en Kanban, tabla y calendario', async ({
  page,
}) => {
  await enterWorld(page);
  await openSurface(page, 'Board');
  await page
    .getByRole('textbox', { name: 'Nueva tarea', exact: true })
    .fill('Verificar continuidad');
  await page.getByRole('button', { name: 'Crear tarea', exact: true }).click();
  const card = page
    .locator('.task-card')
    .filter({ has: page.getByRole('button', { name: 'Verificar continuidad', exact: true }) });
  await card.dragTo(page.locator('[data-drop="progress"]'));
  await expect(page.locator('[data-drop="progress"]')).toContainText('Verificar continuidad');
  await page.getByRole('button', { name: 'Vista tabla', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Estado de Verificar continuidad', exact: true }),
  ).toHaveValue('progress');
  await page.getByLabel('Vencimiento de Verificar continuidad', { exact: true }).fill('2026-09-28');
  await page.getByLabel('Vencimiento de Verificar continuidad', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'Vista calendario', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Verificar continuidad', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Vista Kanban', exact: true }).click();
  await expect(page.locator('[data-drop="progress"]')).toContainText('Verificar continuidad');
});

test('UI-SESSION-01: activar Shipping por conversación se refleja en Board', async ({ page }) => {
  await enterWorld(page);
  await openSurface(page, 'Session');
  const composer = page.getByRole('textbox', {
    name: 'Escribí lo que tenés en mente…',
    exact: true,
  });
  await composer.fill('Activá Shipping');
  await composer.press('Enter');
  await expect(page.locator('.message.agent')).not.toHaveCount(0);
  await expect(composer).toHaveValue('');
  await openSurface(page, 'Board');
  await expect(page.getByRole('switch', { name: 'Shipping Mode' })).toBeChecked();
  await page.getByRole('switch', { name: 'Shipping Mode' }).click();
  await openSurface(page, 'Session');
  await expect(page.locator('.message.user')).toContainText('Activá Shipping');
  await composer.fill('¿Qué falta para lanzar?');
  await composer.press('Enter');
  await expect(page.locator('.message.agent').last()).toContainText('tareas listas');
  await expect(page.locator('.message.agent').last()).not.toContainText('Shipping activo');
  await openSurface(page, 'Board');
  await expect(page.getByRole('switch', { name: 'Shipping Mode' })).not.toBeChecked();
});

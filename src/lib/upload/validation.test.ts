import { describe, expect, it } from 'vitest';
import { MAX_FILES, MAX_UPLOAD_BYTES, validateFiles } from './validation';

const file = (name: string, size: number) => ({ name, size, type: 'application/octet-stream' });

describe('upload validation', () => {
  it('accepts ordinary files including unknown MIME types', () => {
    expect(validateFiles([file('archive.bin', 512)])).toEqual({ ok: true });
  });

  it('rejects an empty selection', () => {
    expect(validateFiles([])).toEqual({ ok: false, message: 'Pilih minimal satu file.' });
  });

  it('rejects files larger than 100 MiB', () => {
    expect(validateFiles([file('huge.zip', MAX_UPLOAD_BYTES + 1)])).toEqual({
      ok: false,
      message: 'huge.zip melebihi batas 100 MB.'
    });
  });

  it('limits one request to a bounded number of files', () => {
    expect(validateFiles(Array.from({ length: MAX_FILES + 1 }, (_, i) => file(`${i}.txt`, 1)))).toEqual({
      ok: false,
      message: `Maksimal ${MAX_FILES} file per unggahan.`
    });
  });

  it('rejects empty files', () => {
    expect(validateFiles([file('empty.txt', 0)])).toEqual({
      ok: false,
      message: 'empty.txt kosong dan tidak dapat diunggah.'
    });
  });
});

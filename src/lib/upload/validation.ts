export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_FILES = 10;

type FileLike = Pick<File, 'name' | 'size' | 'type'>;
export type ValidationResult = { ok: true } | { ok: false; message: string };

export function validateFiles(
	files: FileLike[],
	maxBytes = MAX_UPLOAD_BYTES,
	maxFiles = MAX_FILES
): ValidationResult {
	if (files.length === 0) return { ok: false, message: 'Pilih minimal satu file.' };
	if (files.length > maxFiles) {
		return { ok: false, message: `Maksimal ${maxFiles} file per unggahan.` };
	}
	for (const file of files) {
		if (file.size === 0) {
			return { ok: false, message: `${file.name} kosong dan tidak dapat diunggah.` };
		}
		if (file.size > maxBytes) {
			return {
				ok: false,
				message: `${file.name} melebihi batas ${Math.round(maxBytes / 1024 / 1024)} MB.`
			};
		}
	}
	return { ok: true };
}

from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent
dist = root / 'dist'
if not (dist / 'manifest.json').is_file():
    raise SystemExit('Run npm ci && npm run build first.')
target = root / 'NeoMask-0.2.0-Signing-Build.zip'
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for file in dist.iterdir():
        if file.is_file():
            archive.write(file, 'neomask-extension/' + file.name)
print(target)

from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent
names = ['manifest.json','policy.mjs','provider.js','content.js','background.mjs','popup.html','popup.css','popup.mjs']
target = root / 'neomask-extension-0.1.0.zip'
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for name in names:
        archive.write(root / name, 'neomask-extension/' + name)
print(target)

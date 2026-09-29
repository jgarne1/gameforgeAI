"""Promote the validated scene; archive source layout, never touch persistent saves."""
from pathlib import Path
import json,shutil
root=Path(__file__).resolve().parents[1];worlds=root/'public/assets/worlds';archive=root/'docs/design/archive/whisperwind_waterfront_v1.json';archive.parent.mkdir(parents=True,exist_ok=True)
if not archive.exists():shutil.copy2(worlds/'whisperwind_hd_waterfront.json',archive)
sc=json.loads((worlds/'whisperwind_hd_expanded.json').read_text());sc['id']='whisperwind_hd_waterfront';sc['name']='Whisperwind Hometown';sc['previewOnly']=False;(worlds/'whisperwind_hd_waterfront.json').write_text(json.dumps(sc,indent=2)+'\n')
print('Promoted expanded default; legacy source archived. Persistent town_scenes and home data unchanged.')

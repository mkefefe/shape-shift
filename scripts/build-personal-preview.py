"""Build an isolated localhost-only, fully unlocked personal preview.
Never used by the public release packagers or web-fix.sha256.
"""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent.parent
out = root.parent.parent / 'outputs' / 'Shape-Shift-Personal-Preview'
out.mkdir(parents=True, exist_ok=True)
shutil.copytree(root / '_site', out, dirs_exist_ok=True)

def change(name, old, new):
    p = out / name
    data = p.read_text(encoding='utf-8')
    assert old in data, f'Personal preview patch changed: {name}: {old}'
    p.write_text(data.replace(old, new), encoding='utf-8')

change('playables-bootstrap.js', 'const sdk = window.ytgame;', "if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw Error('Personal preview is localhost-only');\nconst sdk = window.ytgame;")
change('playables-bootstrap.js', 'shape-shift-playables-preview-v1', 'shape-shift-personal-unlocked-v1')
change('playables-bootstrap.js', 'await store.initialize();', """await store.initialize();
      store.storage.setItem('shape-shift-fresh-start-v34','done');
      store.storage.setItem('shape-shift-tutorial-v1','true');
      store.storage.setItem('shape-shift-first-endless-v1','done');
      store.storage.setItem('shape-shift-online-disabled','1');""")
change('game.js', 'const ownerCheck=ownerAccess().catch(()=>({owner:false,adminActive:false}));', 'const ownerCheck=Promise.resolve({owner:false,adminActive:false});')
change('game.js', 'let restorationUI=null,runWorldXp=0;', """// Isolated personal preview: inventory access, never server administrator access.
function personalPreviewProfile(p){return {...adminProfile(p),adminMode:false};}
profile=personalPreviewProfile(profile);
let restorationUI=null,runWorldXp=0;""")
change('game.js', 'if(profile.adminMode)profile.coins=ADMIN_COINS;', 'profile=personalPreviewProfile(profile);')
change('game.js', "profile.adminMode?'∞':Math.max(0,profile.coins-pendingWalletCoins)", "'∞'")
change('game.js', "$('shop-wallet').textContent=profile.coins;", "$('shop-wallet').textContent='∞';")
change('game.js', "$('wallet').textContent=profile.coins;", "$('wallet').textContent='∞';")
change('game.js', "if(!profile.adminMode)prepareRankedRun(endlessDifficulty);", "/* Personal preview does not prepare ranked runs. */")
change('game.js', "!openingCoach&&!profile.adminMode&&leaderboardAllowed()", "!openingCoach&&false&&leaderboardAllowed()")
change('game.js', 'admin:profile.adminMode===true}),sound:uiSound,onReward:', 'admin:true}),sound:uiSound,onReward:')
change('ability-guide.js', 'export const adventureAbilitiesAvailable=level=>Number(level)>5;', 'export const adventureAbilitiesAvailable=level=>true;')
change('difficulty-unlocks.js', "if(id==='easy')return true;", "if(['easy','normal','hard','extreme'].includes(id))return true;")
change('index.html', '<title>Shape Shift</title>', '<title>Shape Shift — Personal Preview</title>')
(out/'PERSONAL-PREVIEW.txt').write_text('Localhost-only personal preview. All cosmetics and abilities owned, unlimited wallet, all modes and Adventure levels available. Separate save slot; no ranked submissions. Do not upload this directory.\n',encoding='utf-8')
print(out)

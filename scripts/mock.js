// Local test double for the Claude artifact runtime (never published)
(function(){
  const store = new Map(); const subs = [];
  const segs = p => p.split('/').length;
  const clone = v => JSON.parse(JSON.stringify(v));
  function colSnap(col){ const n = segs(col) + 1; const docs=[...store.entries()].filter(([k])=>k.startsWith(col+'/')&&segs(k)===n).sort((a,b)=>a[0]<b[0]?-1:1).map(([k,v])=>({id:k.split('/').pop(),exists:true,data:()=>clone(v),metadata:{fromCache:false,hasPendingWrites:false}})); return {docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{}}; }
  function docSnap(path){ const v=store.get(path); return {id:path.split('/').pop(),exists:!!v,data:()=>v?clone(v):undefined,metadata:{}}; }
  function notify(){ for (const s of subs) s.kind==='col' ? s.fn(colSnap(s.path)) : s.fn(docSnap(s.path)); }
  const sizeOf = d => JSON.stringify(d).length;
  function docRef(path){ return {
    id: path.split('/').pop(), path,
    async set(d){ if (sizeOf(d) > 262144) throw {code:'invalid_argument', message:'document over 256 KiB'}; store.set(path, clone(d)); window.__writes=(window.__writes||0)+1; setTimeout(notify, 5); },
    async update(d){ if (!store.has(path)) throw {code:'invalid_argument'}; store.set(path, Object.assign(store.get(path), clone(d))); setTimeout(notify,5); },
    async delete(){ store.delete(path); setTimeout(notify,5); },
    async get(){ return docSnap(path); },
    onSnapshot(fn){ subs.push({kind:'doc',path,fn}); setTimeout(()=>fn(docSnap(path)),10); return ()=>{}; },
    collection(sub){ return colRef(path+'/'+sub); },
  }; }
  function colRef(col){ return {
    path: col,
    onSnapshot(fn){ subs.push({kind:'col',path:col,fn}); setTimeout(()=>fn(colSnap(col)),10); return ()=>{}; },
    async get(){ return colSnap(col); },
    doc(id){ return docRef(col+'/'+(id||Math.random().toString(36).slice(2,10))); },
    async add(d){ const r=this.doc(); await r.set(d); return r; },
    where(){ return this; }, orderBy(){ return this; }, limit(){ return this; },
  }; }
  const db = { collection: colRef, doc: docRef };
  window.__store = store;
  store.set('comments/u_other', {items:[{id:'a1',repo:'hackrf',board:'hackrf-one',text:'Measured VCC at 3.29 V on C113 after swapping U21. TX works again.',at:Date.now()-3600e3*5}]});
  store.set('stars/u_other', {repos:{hackrf:true}});
  const user = { async id(){return 'u_test';}, async can(){return true;}, async profiles(ids){ const o={}; for (const i of [].concat(ids)) o[i]={id:i,name:i==='u_test'?'Roberts':'Marta K.',avatarUrl:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="'+(i==='u_test'?'#0e7656':'#8a5cf6')+'"/></svg>'),color:'#888',isMe:i==='u_test'}; return o; } };
  async function sample(input, opts){
    window.__lastPrompt = input;
    const log = [];
    if (opts.tools) {
      for (const t of opts.tools) {
        const args = t.name==='get_part'?{ref:'U21'}:t.name==='get_net'?{name:'VCC'}:t.name==='search_board'?{query:'TPS'}:{refs:['U21','C113'],nets:['VCC']};
        try { const r = await t.execute(args,{signal:new AbortController().signal}); log.push(t.name+': '+JSON.stringify(r).slice(0,80)); } catch(e){ log.push(t.name+' threw '+e.message); }
        await new Promise(r=>setTimeout(r,150));
      }
    }
    window.__toolLog = log;
    const text = "**U21 (TPS62410)** is the dual buck that makes the digital rails. Its first output drives **VCC**, which feeds U23 (LPC4320) and the CPLD U24.\n\n- Probe VCC on C113 or any of the VCC vias near U23: expect about 3.3 V (inferred from the net name).\n- If VCC is low, check the enable pin of U21 and the input from VBUS.\n- GND reference: use the shield frame J2.";
    let acc='';
    for (const w of text.split(/(\s+)/)) { acc+=w; opts.onText && opts.onText({text:acc,delta:w}); await new Promise(r=>setTimeout(r,8)); }
    return {text, truncated:false, modelTierApplied:'default'};
  }
  sample.json = async function(input, opts){
    window.__lastJsonPrompt = input; window.__lastJsonOpts = opts && {images: opts.images ? opts.images.length : 0, tier: opts.modelTier};
    await new Promise(r=>setTimeout(r,300));
    if (/"causes"/.test(input)) return {causes:[{cause:'Output capacitor ESR outside the stable range', probability:0.35, why:'Oscillation at the output with a ceramic capacitor', check:'Scope the output with a 10x probe, then add 1 ohm in series with the output capacitor'},{cause:'Input near dropout', probability:0.2, why:'The input sags under load', check:'Measure VIN at the regulator pins under load'}], note:'Scope the output first.'};
    if (/"sim": <the complete sim section>/.test(input)) { const m = /Circuit \(components[\s\S]*?\):\n(\{[\s\S]*?\})\n\nCurrent simulation setup/.exec(input); let cur = {}; try { cur = JSON.parse(input.split('Current simulation setup (improve it; keep what is right):\n')[1].split('\n\nAnswer')[0]); } catch(e){} cur.loads = (cur.loads||[]); cur.tstop = cur.tstop || 0.004; return {sim: cur, notes:['Kept the regulator model; 3.3 V output assumed from the part number.']}; }
    if (/Arduino-style programs for a live circuit simulator/.test(input)) { const m = /\n"([^"]+)" \(/.exec(input); const pin = m ? m[1] : 'GPIO0'; return { code: 'void setup() {\n  Serial.begin(115200);\n  pinMode("' + pin + '", OUTPUT);\n}\nint level = 0;\nvoid loop() {\n  analogWrite("' + pin + '", level);\n  level = (level + 32) % 256;\n  Serial.print("level "); Serial.println(level);\n  delay(100);\n}\n', notes: ['Fades ' + pin + ' with PWM.'] }; }
    if (/You are Noeti, the firmware assistant/.test(input)) {
      if (/Task: explain the current program/.test(input)) return { reply: 'This program blinks the status LED every half second and prints a report once a second. The I2C scan at the start lists every part that answers on the bus.', code: '', summary: '' };
      const m = /\n"([^"]+)"[^\n]*: LED/.exec(input) || /\n"([^"]+)"/.exec(input); const pin = m ? m[1] : 'GPIO0';
      return { reply: 'Done: ' + pin + ' now breathes with PWM and the level is printed ten times a second.', code: 'void setup() {\n  Serial.begin(115200);\n  pinMode("' + pin + '", OUTPUT);\n}\nint level = 0;\nvoid loop() {\n  analogWrite("' + pin + '", level);\n  level = (level + 16) % 256;\n  Serial.print("level "); Serial.println(level);\n  delay(100);\n}\n', summary: 'PWM fade on ' + pin };
    }
    if (/live transient simulation of a whole PCB/.test(input)) return {chips: [], currents: [{ref:'U3', mA: 25}, {ref:'U1', mA: 4}], sources: [{net:'VBUS', value: 5.1}], notes: ['RP2040 draws about 25 mA running from flash.', 'VBUS set to 5.1 V.']};
    if (/Transcribe this reference design|second reading/.test(input)) return JSON.parse(JSON.stringify(window.DS2K_EXAMPLE));
    return {};
  };
  sample.limits = async ()=>({maxPromptBytes:262144, tools:{maxCount:8}, images:{maxCount:5, mediaTypes:['image/png','image/jpeg']}});
  const downloads = { async save(r){ window.__saved=(window.__saved||[]).concat(r.filename); window.__savedData = r.data; return {status:'saved'}; } };
  window.claude = { use: async (n)=> ({sample, db, user, downloads})[n] || null };
})();

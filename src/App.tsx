// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";

// @ts-nocheck
/**
 * Interactive mWHO 2.0 Flowchart (ESC 2025) — Zero‑dependency React version
 * -------------------------------------------------------------------------
 * • Now with **disambiguated questions** (no more Yes vs No/Unknown conflation).
 * • Explicit severities & presence checks to avoid hidden assumptions.
 * • Runs on StackBlitz/CodeSandbox with no UI libraries.
 * • If multiple criteria apply, the tool uses the HIGHEST mWHO class.
 */

// --------------------------- Lightweight styles ---------------------------
const css = `:root{--primary:#2563eb;--muted:#6b7280;--border:#e5e7eb;--bg:#ffffff;--chipI:#d1fae5;--chipIText:#064e3b;--chipII:#ecfccb;--chipIIText:#365314;--chipIImIII:#fef3c7;--chipIImIIIText:#78350f;--chipIII:#ffedd5;--chipIIIText:#7c2d12;--chipIV:#ffe4e6;--chipIVText:#881337}
*{box-sizing:border-box} body{margin:0}
.app{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial;max-width:1000px;margin:0 auto;padding:16px}
.header h1{margin:0 0 6px;font-size:clamp(20px,3vw,28px)}
.header p{margin:0;color:var(--muted);font-size:14px}
.section{margin:18px 0}
.badge{display:inline-block;border:1px solid #c7d2fe;background:#eef2ff;color:#3730a3;border-radius:9999px;padding:2px 8px;font-size:12px}
.grid{display:grid;gap:12px}
@media (min-width:640px){.grid.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (min-width:1024px){.grid.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}}
.card{background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:12px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.button{appearance:none;border:1px solid var(--border);background:#f8fafc;border-radius:10px;padding:8px 12px;font-size:14px;cursor:pointer}
.button:hover{box-shadow:0 1px 6px rgba(0,0,0,.06)}
.button.secondary{background:#eef2ff;border-color:#c7d2fe}
.button.outline{background:#fff}
.btnrow{display:flex;flex-wrap:wrap;gap:8px}
.cardtitle{font-weight:600;margin:0 0 6px}
.subtitle{color:var(--muted);font-size:12px;margin-top:4px}
.pill{border-radius:14px;border:1px solid var(--border);padding:8px}
.option{display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:10px;padding:8px}
.label{font-weight:600;font-size:14px;margin-bottom:6px}
.mwho{display:inline-flex;align-items:center;border-radius:9999px;font-weight:700;font-size:14px;padding:6px 12px}
.i{background:var(--chipI);color:var(--chipIText)}
.ii{background:var(--chipII);color:var(--chipIIText)}
.iimiii{background:var(--chipIImIII);color:var(--chipIImIIIText)}
.iii{background:var(--chipIII);color:var(--chipIIIText)}
.iv{background:var(--chipIV);color:var(--chipIVText)}
.note{color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;padding:6px 10px;border-radius:10px;display:inline-flex;gap:6px;align-items:center}
.warn{color:#7c2d12;background:#fff7ed;border:1px solid #fed7aa;padding:6px 10px;border-radius:10px;display:inline-flex;gap:6px;align-items:center}
.small{color:var(--muted);font-size:12px}
`;

function useInjectCSS() {
  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-mwho', '1');
    style.innerHTML = css;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);
}

// --------------------------- Utilities & Data ---------------------------
function highestClass(a, b){
  if (!a) return b; if (!b) return a;
  const order = ["I","II","II–III","III","IV"]; return order[Math.max(order.indexOf(a), order.indexOf(b))]||a;
}

const meaningByMWHO = {
  "I": {
    maternal: "No detectable ↑ mortality; no/mild ↑ morbidity vs general population.",
    fetal: "Baseline obstetric/fetal risk.",
    care: "Routine antenatal care; cardiology as needed.",
    delivery: "Vaginal birth usually appropriate; neuraxial anesthesia as per obstetric plan.",
  },
  "II": {
    maternal: "Small ↑ maternal mortality or moderate ↑ morbidity.",
    fetal: "Slight ↑ preterm/low‑birth‑weight/perinatal complications.",
    care: "Shared care with cardiology; define follow‑up plan.",
    delivery: "Vaginal birth preferred; consider assisted 2nd stage if hemodynamics warrant.",
  },
  "II–III": {
    maternal: "Intermediate between II and III; morbidity can be important depending on lesion severity.",
    fetal: "Moderate ↑ fetal complications (preterm, growth restriction) depending on condition.",
    care: "Shared care with a Pregnancy Heart Team; deliver in hospital with cardiology & anesthesia on site.",
    delivery: "Vaginal birth usually preferred; individualized plan; early anesthesia review.",
  },
  "III": {
    maternal: "Significantly ↑ maternal mortality or severe morbidity.",
    fetal: "High ↑ fetal complications (preterm, growth, neonatal ICU).",
    care: "Care led by a Pregnancy Heart Team at an expert centre; close surveillance; multidisciplinary birth plan.",
    delivery: "Vaginal birth often preferred with assisted 2nd stage; Caesarean for specific cardiac/obstetric indications.",
  },
  "IV": {
    maternal: "Extremely high risk; pregnancy is not recommended (contraindicated).",
    fetal: "Very high fetal/neonatal risk given maternal instability/therapy constraints.",
    care: "Pre‑pregnancy counselling to avoid pregnancy. If pregnant and continuing, manage in expert centre.",
    delivery: "Mode individualized by expert team; Caesarean may be preferred in select scenarios (e.g., severe PH).",
  },
};

function MWHOChip({ mwho }){
  if (!mwho) return null;
  const cls = mwho === 'I' ? 'mwho i' : mwho === 'II' ? 'mwho ii' : mwho === 'II–III' ? 'mwho iimiii' : mwho === 'III' ? 'mwho iii' : 'mwho iv';
  return <span className={cls}>mWHO {mwho}</span>;
}

// --------------------------- Decision Logic by Group ---------------------------
function computeVentricularPH(a){
  const notes = [];
  if (a.PAH === 'yes') { notes.push('Pulmonary arterial hypertension'); return { mwho:'IV', notes }; }
  if (a.LVEF === '<30%' || a.NYHA === 'III/IV') return { mwho:'IV', notes };
  if (a.LVEF === '30–45%') return { mwho:'III', notes };
  if (a.LVEF === '>45%'){
    if (a.RVfunction === 'significant') return { mwho:'II–III', notes };
    if (a.PPCM === '> mild residual'){ notes.push('PPCM with > mild residual LV impairment'); return { mwho:'IV', notes }; }
    if (a.PPCM === '≤ mild residual'){ notes.push('PPCM with ≤ mild residual LV impairment'); return { mwho:'III', notes }; }
    return { mwho:'II–III', notes };
  }
  return { mwho:null, notes };
}

function computeCardiomyopathy(a){
  const picks = [];
  if (a.HCMgenoPheno === '+/−') picks.push('I');
  if (a.HCMcomp === 'arrhythmic/moderate-hemodynamic') picks.push('III');
  if (a.HCMcomp === 'severe-LVOT>=50-or-EF<50%') picks.push('IV');
  if (a.DCM_EF === '>45%') picks.push('II–III');
  if (a.DCM_EF === '30–45%') picks.push('III');
  if (a.DCM_EF === '<30%/NYHAIII-IV') picks.push('IV');
  if (a.ARVC === 'low-risk') picks.push('II–III');
  if (a.ARVC === 'moderate/severe') picks.push('III');
  return { mwho: picks.reduce((acc,cur)=>highestClass(acc,cur), null), notes:[] };
}

function computeValvular(a){
  let m = null; const notes = [];
  // Pulmonary stenosis explicit severities
  if (a.PS_sev === 'mild') m = highestClass(m,'I');
  if (a.PS_sev === 'moderate/severe') { m = highestClass(m,'II–III'); notes.push('Moderate/severe PS — confirm gradients & RV pressure'); }

  // Mitral stenosis
  if (a.MS === 'moderate') m = highestClass(m,'III');
  if (a.MS === 'severe') m = highestClass(m,'IV');

  // Aortic stenosis
  if (a.AS === 'severe-asymptomatic') m = highestClass(m,'III');
  if (a.AS === 'severe-symptomatic') m = highestClass(m,'IV');

  // Regurgitation severities (independent of MVP)
  if (a.MR_sev === 'severe' || a.AR_sev === 'severe') m = highestClass(m,'III');
  if (a.MR_sev === 'moderate' || a.AR_sev === 'moderate') m = highestClass(m,'II–III');

  // MVP presence with NO significant MR qualifies for mWHO I
  if (a.MVP_present === 'yes'){
    if (a.MR_sev === 'none/trace' || a.MR_sev === 'mild') {
      m = highestClass(m,'I');
    } else if (!a.MR_sev || a.MR_sev === 'unknown') {
      notes.push('MVP present but MR severity unknown — cannot assume class I');
    }
  }

  // Mechanical valve
  if (a.MechanicalValve === 'well-controlled'){ notes.push('Mechanical valve on stable anticoagulation'); m = highestClass(m,'III'); }
  if (a.MechanicalValve === 'unstable/complicated'){ notes.push('Mechanical valve with complications/unstable anticoagulation'); m = highestClass(m,'III'); }

  return { mwho:m, notes };
}

function computeCongenital(a){
  let m = null; const notes = [];
  if (a.SimpleRepaired === 'yes') m = highestClass(m,'I');
  if (a.ASDVSDunoperated === 'yes') m = highestClass(m,'II');
  if (a.ToFgood === 'yes') m = highestClass(m,'II');
  if (a.TGAarterialSwitchGood === 'yes') m = highestClass(m,'II');
  if (a.AVSDrepairedGood === 'yes') m = highestClass(m,'II–III');
  if (a.Ebstein === 'uncomplicated') m = highestClass(m,'II–III');
  if (a.Ebstein === 'complicated') m = highestClass(m,'III');
  if (a.SystemicRV === 'good/mildly↓') m = highestClass(m,'III');
  if (a.SystemicRV === 'moderate/severely↓') m = highestClass(m,'IV');
  if (a.Fontan === 'uncomplicated') m = highestClass(m,'III');
  if (a.Fontan === 'complicated') m = highestClass(m,'IV');
  if (a.Cyanotic === 'unrepaired-non-eisenmenger') m = highestClass(m,'III');
  if (a.Cyanotic === 'eisenmenger') m = highestClass(m,'IV');
  return { mwho:m, notes };
}

function computeAortopathy(a){
  let m = null; const notes = [];
  if (a.NonHTADlt40 === 'yes') m = highestClass(m,'I');
  if (a.TurnerNoCVfeatures === 'yes') m = highestClass(m,'II');
  if (a.HTADnoDilation_or_BAVlt45_or_repairedCoA === 'yes') m = highestClass(m,'II–III');
  if (a.Marfan40to45 === 'yes') m = highestClass(m,'III');
  if (a.BAV45to50 === 'yes') m = highestClass(m,'III');
  if (a.TurnerASI20to25 === 'yes') m = highestClass(m,'III');
  if (a.OtherAortaLt50 === 'yes') m = highestClass(m,'III');
  if (a.MarfanGt45 === 'yes'){ m = highestClass(m,'IV'); notes.push('Severe Marfan/HTAD aortic dilation >45 mm'); }
  if (a.BAVGt50 === 'yes'){ m = highestClass(m,'IV'); notes.push('Severe BAV aortic dilation >50 mm'); }
  if (a.TurnerASIgt25 === 'yes'){ m = highestClass(m,'IV'); notes.push('Turner ASI >25 mm²/m'); }
  if (a.SevereRecoA_or_vEDS_or_PriorDissectionGrowing === 'yes'){ m = highestClass(m,'IV'); notes.push('Severe (re)CoA / vascular EDS / prior dissection with growth'); }
  if (a.PriorDissectionStable === 'yes') m = highestClass(m,'III');
  return { mwho:m, notes };
}

function computeArrhythmia(a){
  let m = null; const notes = [];
  if (a.IsolatedEctopy === 'yes') m = highestClass(m,'I');
  if (a.SVTorPacemaker === 'yes') m = highestClass(m,'II');
  if (a.InheritedLowRisk === 'yes') m = highestClass(m,'II–III');
  if (a.InheritedHighRisk === 'yes') m = highestClass(m,'III');
  if (a.SustainedVT === 'yes') m = highestClass(m,'III');
  return { mwho:m, notes };
}

function computeCoronaryOther(a){
  let m = null; const notes = [];
  if (a.SCAD === 'yes') m = highestClass(m,'III');
  if (a.PriorIschaemia === 'yes') m = highestClass(m,'III');
  if (a.PriorAPOhosp === 'yes') m = highestClass(m,'III');
  if (a.CancerTherapyCVtox === 'yes') m = highestClass(m,'III');
  return { mwho:m, notes };
}

const GROUPS = [
  "Ventricular/PH/PPCM",
  "Cardiomyopathy",
  "Valvular",
  "Congenital",
  "Aortopathy",
  "Arrhythmia",
  "Coronary/Other",
];

// --------------------------- Questions UI ---------------------------
function Q({ label, name, value, onChange, options }){
  return (
    <div className="pill">
      <div className="label">{label}</div>
      <div className="grid">
        {options.map(o => (
          <label key={o.value} className="option">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={(e)=>onChange(name, e.target.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function GroupQuestions({ group, answers, set }){
  if (!group) return null;
  const Row = ({ children }) => <div className="grid">{children}</div>;

  switch(group){
    case "Ventricular/PH/PPCM":
      return (
        <div className="grid">
          <Row>
            <Q label="Pulmonary arterial hypertension (PAH)?" name="PAH" value={answers.PAH||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Left ventricular EF" name="LVEF" value={answers.LVEF||""} onChange={set} options={[{label:"< 30%", value:"<30%"},{label:"30–45%", value:"30–45%"},{label:"> 45%", value:">45%"},{label:"Unknown", value:"unknown"}]} />
            <Q label="NYHA class" name="NYHA" value={answers.NYHA||""} onChange={set} options={[{label:"I/II", value:"I/II"},{label:"III/IV", value:"III/IV"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Right ventricle (sub‑pulmonary) function" name="RVfunction" value={answers.RVfunction||""} onChange={set} options={[{label:"Normal/mild impairment", value:"none/mild"},{label:"Significantly impaired", value:"significant"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Peripartum cardiomyopathy (history)" name="PPCM" value={answers.PPCM||""} onChange={set} options={[{label:"No", value:"no"},{label:"≤ mild residual LV impairment", value:"≤ mild residual"},{label:"> mild residual LV impairment", value:"> mild residual"},{label:"Unknown", value:"unknown"}]} />
          </Row>
        </div>
      );
    case "Cardiomyopathy":
      return (
        <div className="grid">
          <Row>
            <Q label="HCM genotype+/phenotype− present?" name="HCMgenoPheno" value={answers.HCMgenoPheno||""} onChange={set} options={[{label:"Yes", value:"+/−"},{label:"No", value:"other"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="HCM complications" name="HCMcomp" value={answers.HCMcomp||""} onChange={set} options={[
              {label:"None of the below", value:"none"},
              {label:"Arrhythmic and/or moderate haemodynamic complications", value:"arrhythmic/moderate-hemodynamic"},
              {label:"Severe LVOT obstruction (≥50 mmHg) or EF <50% with symptoms", value:"severe-LVOT>=50-or-EF<50%"},
              {label:"Unknown", value:"unknown"},
            ]} />
          </Row>
          <Row>
            <Q label="DCM/NDLVC — LV function" name="DCM_EF" value={answers.DCM_EF||""} onChange={set} options={[
              {label:"> 45% (normal/mild impairment)", value:">45%"},
              {label:"30–45% (moderate)", value:"30–45%"},
              {label:"< 30% or NYHA III/IV", value:"<30%/NYHAIII-IV"},
              {label:"Unknown", value:"unknown"},
            ]} />
          </Row>
          <Row>
            <Q label="ARVC severity" name="ARVC" value={answers.ARVC||""} onChange={set} options={[{label:"Genotype+ with no/mild phenotype (low risk)", value:"low-risk"},{label:"Moderate/severe disease", value:"moderate/severe"},{label:"Not applicable", value:"na"},{label:"Unknown", value:"unknown"}]} />
          </Row>
        </div>
      );
    case "Valvular":
      return (
        <div className="grid">
          <Row>
            <Q label="Pulmonary stenosis severity" name="PS_sev" value={answers.PS_sev||""} onChange={set} options={[{label:"None", value:"none"},{label:"Mild", value:"mild"},{label:"Moderate/Severe", value:"moderate/severe"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Mitral valve prolapse present?" name="MVP_present" value={answers.MVP_present||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Mitral regurgitation severity" name="MR_sev" value={answers.MR_sev||""} onChange={set} options={[{label:"None/Trace", value:"none/trace"},{label:"Mild", value:"mild"},{label:"Moderate", value:"moderate"},{label:"Severe", value:"severe"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Aortic regurgitation severity" name="AR_sev" value={answers.AR_sev||""} onChange={set} options={[{label:"None/Trace", value:"none/trace"},{label:"Mild", value:"mild"},{label:"Moderate", value:"moderate"},{label:"Severe", value:"severe"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Mitral stenosis severity" name="MS" value={answers.MS||""} onChange={set} options={[{label:"None/Mild", value:"none/mild"},{label:"Moderate", value:"moderate"},{label:"Severe", value:"severe"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Aortic stenosis severity" name="AS" value={answers.AS||""} onChange={set} options={[{label:"None/Mild/Moderate", value:"none/mild/moderate"},{label:"Severe asymptomatic", value:"severe-asymptomatic"},{label:"Severe symptomatic", value:"severe-symptomatic"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Mechanical valve" name="MechanicalValve" value={answers.MechanicalValve||""} onChange={set} options={[{label:"Uncomplicated & well‑controlled anticoagulation", value:"well-controlled"},{label:"Complicated/unstable", value:"unstable/complicated"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <div className="small subtitle">Tip: If MVP is present and MR is none/trace or mild, this maps to mWHO I. If MR is moderate/severe, the regurgitation severity drives the class.</div>
        </div>
      );
    case "Congenital":
      return (
        <div className="grid">
          <Row>
            <Q label="Repaired simple lesions (ASD/VSD/PDA/APVD) without significant residual" name="SimpleRepaired" value={answers.SimpleRepaired||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Unoperated uncomplicated ASD/VSD" name="ASDVSDunoperated" value={answers.ASDVSDunoperated||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Repaired Tetralogy of Fallot — no significant residual/arrhythmias" name="ToFgood" value={answers.ToFgood||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
            <Q label="TGA with arterial switch — no significant residual" name="TGAarterialSwitchGood" value={answers.TGAarterialSwitchGood||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Repaired AVSD without significant residual" name="AVSDrepairedGood" value={answers.AVSDrepairedGood||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Ebstein anomaly" name="Ebstein" value={answers.Ebstein||""} onChange={set} options={[{label:"Uncomplicated (mild–moderate TR; no TS/AP)", value:"uncomplicated"},{label:"Any complication", value:"complicated"},{label:"Not applicable", value:"na"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Systemic RV function" name="SystemicRV" value={answers.SystemicRV||""} onChange={set} options={[{label:"Good/mildly decreased", value:"good/mildly↓"},{label:"Moderate/severely decreased", value:"moderate/severely↓"},{label:"Not applicable", value:"na"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Fontan circulation" name="Fontan" value={answers.Fontan||""} onChange={set} options={[{label:"Uncomplicated", value:"uncomplicated"},{label:"Any complication", value:"complicated"},{label:"Not applicable", value:"na"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Cyanotic CHD" name="Cyanotic" value={answers.Cyanotic||""} onChange={set} options={[{label:"Unrepaired (not Eisenmenger)", value:"unrepaired-non-eisenmenger"},{label:"Eisenmenger", value:"eisenmenger"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
        </div>
      );
    case "Aortopathy":
      return (
        <div className="grid">
          <Row>
            <Q label="Non‑HTAD mild aortic dilation < 40 mm" name="NonHTADlt40" value={answers.NonHTADlt40||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Turner syndrome without CV features (BAV/CoA/HTN/dilation)" name="TurnerNoCVfeatures" value={answers.TurnerNoCVfeatures||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="HTAD no dilation OR BAV <45 mm OR repaired CoA" name="HTADnoDilation_or_BAVlt45_or_repairedCoA" value={answers.HTADnoDilation_or_BAVlt45_or_repairedCoA||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Marfan/HTAD 40–45 mm" name="Marfan40to45" value={answers.Marfan40to45||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="BAV 45–50 mm" name="BAV45to50" value={answers.BAV45to50||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Turner ASI 20–25 mm²/m" name="TurnerASI20to25" value={answers.TurnerASI20to25||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Other aortic dilation < 50 mm" name="OtherAortaLt50" value={answers.OtherAortaLt50||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <div className="pill">
            <div className="label">Severe/high‑risk features</div>
            <div className="grid cols-2">
              <Q label="> 45 mm in Marfan/HTAD" name="MarfanGt45" value={answers.MarfanGt45||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
              <Q label="> 50 mm in BAV" name="BAVGt50" value={answers.BAVGt50||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
              <Q label="Turner ASI > 25 mm²/m" name="TurnerASIgt25" value={answers.TurnerASIgt25||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
              <Q label="Severe (re)CoA / vEDS / prior dissection with growing diameter" name="SevereRecoA_or_vEDS_or_PriorDissectionGrowing" value={answers.SevereRecoA_or_vEDS_or_PriorDissectionGrowing||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
              <Q label="Prior dissection with stable diameter" name="PriorDissectionStable" value={answers.PriorDissectionStable||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
            </div>
          </div>
        </div>
      );
    case "Arrhythmia":
      return (
        <div className="grid">
          <Row>
            <Q label="Isolated atrial/ventricular ectopy" name="IsolatedEctopy" value={answers.IsolatedEctopy||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
            <Q label="SVT or bradycardia requiring pacemaker" name="SVTorPacemaker" value={answers.SVTorPacemaker||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Inherited arrhythmia — low risk (e.g., LQTS no prior events on full‑dose β‑blocker; well‑controlled CPVT; Brugada no events)" name="InheritedLowRisk" value={answers.InheritedLowRisk||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Inherited arrhythmia — high risk (e.g., LQT2 postpartum; symptomatic CPVT/LQTS not controlled; Brugada/prior events)" name="InheritedHighRisk" value={answers.InheritedHighRisk||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Sustained VT of any aetiology" name="SustainedVT" value={answers.SustainedVT||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
        </div>
      );
    case "Coronary/Other":
      return (
        <div className="grid">
          <Row>
            <Q label="Prior SCAD" name="SCAD" value={answers.SCAD||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Prior ischaemic cardiac event (STEMI/NSTE‑ACS)" name="PriorIschaemia" value={answers.PriorIschaemia||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
          <Row>
            <Q label="Prior adverse pregnancy outcome requiring hospitalization" name="PriorAPOhosp" value={answers.PriorAPOhosp||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
            <Q label="Prior adverse cardiovascular effects of cancer therapy" name="CancerTherapyCVtox" value={answers.CancerTherapyCVtox||""} onChange={set} options={[{label:"Yes", value:"yes"},{label:"No", value:"no"},{label:"Unknown", value:"unknown"}]} />
          </Row>
        </div>
      );
    default:
      return null;
  }
}

// --------------------------- Main Component ---------------------------
export default function App(){
  useInjectCSS();
  const [group, setGroup] = useState(null);
  const [answers, setAnswers] = useState({});

  const set = (k, v) => setAnswers(a => ({ ...a, [k]: v }));

  const computed = useMemo(() => {
    if (!group) return { mwho:null, notes:[] };
    switch(group){
      case 'Ventricular/PH/PPCM': return computeVentricularPH(answers);
      case 'Cardiomyopathy': return computeCardiomyopathy(answers);
      case 'Valvular': return computeValvular(answers);
      case 'Congenital': return computeCongenital(answers);
      case 'Aortopathy': return computeAortopathy(answers);
      case 'Arrhythmia': return computeArrhythmia(answers);
      case 'Coronary/Other': return computeCoronaryOther(answers);
      default: return { mwho:null, notes:[] };
    }
  }, [group, answers]);

  const summary = useMemo(() => {
    const mh = computed.mwho ? `mWHO ${computed.mwho}` : '–';
    const care = computed.mwho ? meaningByMWHO[computed.mwho].care : '';
    const del = computed.mwho ? meaningByMWHO[computed.mwho].delivery : '';
    const maternal = computed.mwho ? meaningByMWHO[computed.mwho].maternal : '';
    const fetal = computed.mwho ? meaningByMWHO[computed.mwho].fetal : '';
    const flags = computed.notes.length ? `
Flags: ${computed.notes.join('; ')}` : '';
    return `Group: ${group ?? '–'}
Result: ${mh}
Maternal risk: ${maternal}
Fetal risk: ${fetal}
Care level: ${care}
Delivery guidance: ${del}${flags}`.trim();
  }, [group, computed]);

  const onCopy = async () => { try { await navigator.clipboard.writeText(summary); } catch {} };
  const onReset = () => { setGroup(null); setAnswers({}); };
  const onPrint = () => { window.print(); };

  return (
    <div className="app">
      <header className="header">
        <h1>Interactive mWHO 2.0 Flowchart (ESC 2025)</h1>
        <p>Pick a disease group, answer the prompts, and get the mWHO class with risk meaning & management. If multiple criteria apply, the highest class prevails.</p>
      </header>

      {/* Step 1 */}
      <section className="section">
        <div className="badge">Step 1</div>
        <h2 className="cardtitle" style={{marginTop:6}}>Choose disease group</h2>
        <div className="grid cols-3">
          {GROUPS.map(g => (
            <button key={g} className="card" onClick={()=>setGroup(g)} style={{textAlign:'left', cursor:'pointer'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontWeight:600}}>
                <span>{g}</span>
                <span style={{color: 'var(--primary)'}}>›</span>
              </div>
              <div className="subtitle">
                {g==='Ventricular/PH/PPCM' && 'LV/RV, PAH, PPCM'}
                {g==='Cardiomyopathy' && 'HCM, DCM/NDLVC, ARVC'}
                {g==='Valvular' && 'Stenosis/regurgitation, MVP, mechanical valve'}
                {g==='Congenital' && 'Repaired/unrepaired, Fontan, systemic RV'}
                {g==='Aortopathy' && 'Marfan/HTAD, BAV, Turner'}
                {g==='Arrhythmia' && 'SVT, LQTS/CPVT, VT'}
                {g==='Coronary/Other' && 'SCAD, prior MI, APO, cardiotox'}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Step 2 */}
      {group && (
        <section className="section">
          <div className="badge">Step 2</div>
          <h2 className="cardtitle" style={{marginTop:6}}>Answer {group} questions</h2>
          <div className="card">
            <GroupQuestions group={group} answers={answers} set={set} />
          </div>
        </section>
      )}

      {/* Step 3 */}
      {group && (
        <section className="section">
          <div className="badge">Step 3</div>
          <h2 className="cardtitle" style={{marginTop:6}}>Result</h2>
          <div className="card" style={{display:'grid',gap:12}}>
            <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
              <MWHOChip mwho={computed.mwho} />
              {computed.mwho ? (
                <span className="note">✓ Computed from your inputs</span>
              ) : (
                <span className="warn">⚠ Insufficient inputs</span>
              )}
            </div>

            {computed.mwho && (
              <div className="grid cols-2">
                <div className="pill">
                  <div className="cardtitle">Maternal risk meaning</div>
                  <div className="subtitle">{meaningByMWHO[computed.mwho].maternal}</div>
                </div>
                <div className="pill">
                  <div className="cardtitle">Fetal/obstetric risk</div>
                  <div className="subtitle">{meaningByMWHO[computed.mwho].fetal}</div>
                </div>
                <div className="pill">
                  <div className="cardtitle">Care level / management</div>
                  <div className="subtitle">{meaningByMWHO[computed.mwho].care}</div>
                </div>
                <div className="pill">
                  <div className="cardtitle">Mode of delivery — guidance</div>
                  <div className="subtitle">{meaningByMWHO[computed.mwho].delivery}</div>
                </div>
              </div>
            )}

            {computed.notes.length > 0 && (
              <div className="pill">
                <div className="cardtitle">Important flags</div>
                <ul className="subtitle" style={{paddingLeft:18, margin:0}}>
                  {computed.notes.map((n,i)=>(<li key={i}>{n}</li>))}
                </ul>
              </div>
            )}

            <div className="btnrow">
              <button className="button secondary" onClick={onCopy}>Copy summary</button>
              <button className="button secondary" onClick={onPrint}>Print</button>
              <button className="button outline" onClick={onReset}>Reset</button>
            </div>
          </div>
        </section>
      )}

      <footer className="section small">
        ℹ This decision aid summarizes the ESC 2025 pregnancy & CVD guideline (mWHO 2.0 examples). It is not a substitute for clinical judgement. Thresholds and special situations (e.g., anticoagulation for mechanical valves, severe aortopathy sizes, pulmonary hypertension phenotypes) require guideline consultation and expert input. If multiple criteria apply, the highest class should be used.
      </footer>
    </div>
  );
}

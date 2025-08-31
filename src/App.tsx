// @ts-nocheck
import React, { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, RefreshCw, Copy, Printer, Info, AlertTriangle } from "lucide-react";
// If your project has shadcn/ui installed, these imports work. Otherwise replace with your own minimal components.
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/**
 * Interactive mWHO 2.0 Flowchart (ESC 2025) — Single-file React component
 * ------------------------------------------------------------------------
 * How to use:
 *  - Step 1: Choose a disease group.
 *  - Step 2: Answer the adaptive questions.
 *  - The app computes the mWHO class and provides maternal/fetal risk meaning + management guidance.
 *
 * Notes:
 *  - Built as a pragmatic decision aid mirroring the ESC 2025 "mWHO 2.0" examples.
 *  - If multiple conditions apply, the tool takes the highest class.
 *  - Always verify nuances/thresholds in the full guideline and local protocols.
 */

// --------------------------- Types ---------------------------

type MWHOClass = "I" | "II" | "II–III" | "III" | "IV";

type DiseaseGroup =
  | "Ventricular/PH/PPCM"
  | "Cardiomyopathy"
  | "Valvular"
  | "Congenital"
  | "Aortopathy"
  | "Arrhythmia"
  | "Coronary/Other";

interface Assessment {
  group: DiseaseGroup | null;
  // Sub-answers vary by group
  answers: Record<string, string>;
  // Derived output
  mwho: MWHOClass | null;
  notes: string[]; // flags that might affect management wording
}

// --------------------------- Helpers ---------------------------

const meaningByMWHO: Record<MWHOClass, { maternal: string; fetal: string; care: string; delivery: string }> = {
  I: {
    maternal: "No detectable ↑ mortality; no/mild ↑ morbidity vs general population.",
    fetal: "Baseline obstetric/fetal risk.",
    care: "Routine antenatal care; cardiology as needed.",
    delivery: "Vaginal birth usually appropriate; neuraxial anesthesia as per obstetric plan.",
  },
  II: {
    maternal: "Small ↑ maternal mortality or moderate ↑ morbidity.",
    fetal: "Slight ↑ preterm/low-birth-weight/perinatal complications.",
    care: "Shared care with cardiology; define follow‑up plan.",
    delivery: "Vaginal birth preferred; consider assisted 2nd stage if hemodynamics warrant.",
  },
  "II–III": {
    maternal: "Intermediate risk between II and III; morbidity can be important depending on lesion severity.",
    fetal: "Moderate ↑ fetal complications (preterm, growth restriction) depending on condition.",
    care: "Shared care with a Pregnancy Heart Team; deliver in hospital with cardiology & anesthesia on site.",
    delivery: "Vaginal birth usually preferred; individualized plan; early anesthesia review.",
  },
  III: {
    maternal: "Significantly ↑ maternal mortality or severe morbidity.",
    fetal: "High ↑ fetal complications (preterm, growth, neonatal ICU).",
    care: "Care led by a Pregnancy Heart Team at an expert centre; close surveillance; multidisciplinary birth plan.",
    delivery: "Vaginal birth often preferred with assisted 2nd stage; Caesarean for specific cardiac/obstetric indications.",
  },
  IV: {
    maternal: "Extremely high risk of maternal mortality or severe morbidity; pregnancy is not recommended (contraindicated).",
    fetal: "Very high fetal/neonatal risk given maternal instability/therapy constraints.",
    care: "Pre‑pregnancy counselling to avoid pregnancy. If pregnant and continuing, manage in expert centre with intensive surveillance.",
    delivery: "Mode individualized by expert team. In some scenarios (e.g., large aortic aneurysm, severe PH), Caesarean may be preferred.",
  },
};

function highestClass(a: MWHOClass | null, b: MWHOClass | null): MWHOClass | null {
  if (!a) return b;
  if (!b) return a;
  const order: MWHOClass[] = ["I", "II", "II–III", "III", "IV"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))] as MWHOClass;
}

// Utility to render a chip for mWHO
function MWHOChip({ mwho }: { mwho: MWHOClass | null }) {
  if (!mwho) return null;
  const color =
    mwho === "I" ? "bg-emerald-100 text-emerald-900" :
    mwho === "II" ? "bg-lime-100 text-lime-900" :
    mwho === "II–III" ? "bg-amber-100 text-amber-900" :
    mwho === "III" ? "bg-orange-100 text-orange-900" :
    "bg-rose-100 text-rose-900";
  return (
    <span className={⁠ inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${color} ⁠}>
      mWHO {mwho}
    </span>
  );
}

// --------------------------- Decision Logic by Group ---------------------------

function computeVentricularPH(answers: Record<string, string>) {
  // Inputs: PAH, LVEF, NYHA, RVfunction, PPCM
  const notes: string[] = [];
  if (answers.PAH === "yes") {
    notes.push("Pulmonary arterial hypertension");
    return { mwho: "IV" as MWHOClass, notes };
  }
  if (answers.LVEF === "<30%" || answers.NYHA === "III/IV") {
    return { mwho: "IV" as MWHOClass, notes };
  }
  if (answers.LVEF === "30–45%") {
    return { mwho: "III" as MWHOClass, notes };
  }
  if (answers.LVEF === ">45%") {
    if (answers.RVfunction === "significant") {
      return { mwho: "II–III" as MWHOClass, notes };
    }
    // PPCM path
    if (answers.PPCM === "> mild residual") {
      notes.push("PPCM with > mild residual LV impairment");
      return { mwho: "IV" as MWHOClass, notes };
    }
    if (answers.PPCM === "≤ mild residual") {
      notes.push("PPCM with ≤ mild residual LV impairment");
      return { mwho: "III" as MWHOClass, notes };
    }
    // no PPCM
    return { mwho: "II–III" as MWHOClass, notes };
  }
  return { mwho: null as MWHOClass | null, notes };
}

function computeCardiomyopathy(answers: Record<string, string>) {
  const scores: (MWHOClass | null)[] = [];
  const notes: string[] = [];
  // HCM genotype+ / phenotype− → I
  if (answers.HCMgenoPheno === "+/−") scores.push("I");
  // HCM complications
  if (answers.HCMcomp === "arrhythmic/moderate-hemodynamic") scores.push("III");
  if (answers.HCMcomp === "severe-LVOT>=50-or-EF<50%") scores.push("IV");
  // DCM/NDLVC
  if (answers.DCM_EF === ">45%") scores.push("II–III");
  if (answers.DCM_EF === "30–45%") scores.push("III");
  if (answers.DCM_EF === "<30%/NYHAIII-IV") scores.push("IV");
  // ARVC
  if (answers.ARVC === "low-risk") scores.push("II–III");
  if (answers.ARVC === "moderate/severe") scores.push("III");

  const mwho = scores.reduce<MWHOClass | null>((acc, cur) => highestClass(acc, cur), null);
  return { mwho, notes };
}

function computeValvular(answers: Record<string, string>) {
  const notes: string[] = [];
  let mwho: MWHOClass | null = null;
  if (answers.PS === "small/mild") mwho = highestClass(mwho, "I");
  if (answers.MVP === "no-sig-MR") mwho = highestClass(mwho, "I");

  if (answers.MS === "moderate") mwho = highestClass(mwho, "III");
  if (answers.MS === "severe") mwho = highestClass(mwho, "IV");

  if (answers.AS === "severe-asymptomatic") mwho = highestClass(mwho, "III");
  if (answers.AS === "severe-symptomatic") mwho = highestClass(mwho, "IV");

  if (answers.LeftRegurg === "severe") mwho = highestClass(mwho, "III");

  if (answers.NativeTissue === "mild-MS/mod-AS/mod-regurg") mwho = highestClass(mwho, "II–III");

  if (answers.MechanicalValve === "well-controlled") {
    notes.push("Mechanical valve on stable anticoagulation");
    mwho = highestClass(mwho, "III");
  }
  if (answers.MechanicalValve === "unstable/complicated") {
    notes.push("Mechanical valve with complications/unstable anticoagulation");
    // keep highest by lesion; often functionally ≥ III, but highlight flag
    mwho = highestClass(mwho, "III");
  }

  return { mwho, notes };
}

function computeCongenital(answers: Record<string, string>) {
  let mwho: MWHOClass | null = null;
  const notes: string[] = [];
  if (answers.SimpleRepaired === "yes") mwho = highestClass(mwho, "I");
  if (answers.ASDVSDunoperated === "yes") mwho = highestClass(mwho, "II");
  if (answers.ToFgood === "yes") mwho = highestClass(mwho, "II");
  if (answers.TGAarterialSwitchGood === "yes") mwho = highestClass(mwho, "II");
  if (answers.AVSDrepairedGood === "yes") mwho = highestClass(mwho, "II–III");

  if (answers.Ebstein === "uncomplicated") mwho = highestClass(mwho, "II–III");
  if (answers.Ebstein === "complicated") mwho = highestClass(mwho, "III");

  if (answers.SystemicRV === "good/mildly↓") mwho = highestClass(mwho, "III");
  if (answers.SystemicRV === "moderate/severely↓") mwho = highestClass(mwho, "IV");

  if (answers.Fontan === "uncomplicated") mwho = highestClass(mwho, "III");
  if (answers.Fontan === "complicated") mwho = highestClass(mwho, "IV");

  if (answers.Cyanotic === "unrepaired-non-eisenmenger") mwho = highestClass(mwho, "III");
  if (answers.Cyanotic === "eisenmenger") mwho = highestClass(mwho, "IV");

  return { mwho, notes };
}

function computeAortopathy(answers: Record<string, string>) {
  let mwho: MWHOClass | null = null;
  const notes: string[] = [];

  if (answers.NonHTADlt40 === "yes") mwho = highestClass(mwho, "I");
  if (answers.TurnerNoCVfeatures === "yes") mwho = highestClass(mwho, "II");
  if (answers.HTADnoDilation_or_BAVlt45_or_repairedCoA === "yes") mwho = highestClass(mwho, "II–III");

  if (answers.Marfan40to45 === "yes") mwho = highestClass(mwho, "III");
  if (answers.BAV45to50 === "yes") mwho = highestClass(mwho, "III");
  if (answers.TurnerASI20to25 === "yes") mwho = highestClass(mwho, "III");
  if (answers.OtherAortaLt50 === "yes") mwho = highestClass(mwho, "III");

  if (answers.MarfanGt45 === "yes") { mwho = highestClass(mwho, "IV"); notes.push("Severe Marfan/HTAD aortic dilation >45 mm"); }
  if (answers.BAVGt50 === "yes") { mwho = highestClass(mwho, "IV"); notes.push("Severe BAV aortic dilation >50 mm"); }
  if (answers.TurnerASIgt25 === "yes") { mwho = highestClass(mwho, "IV"); notes.push("Turner ASI >25 mm²/m"); }
  if (answers.SevereRecoA_or_vEDS_or_PriorDissectionGrowing === "yes") { mwho = highestClass(mwho, "IV"); notes.push("Severe (re)CoA / vascular EDS / prior dissection with growth"); }
  if (answers.PriorDissectionStable === "yes") mwho = highestClass(mwho, "III");

  return { mwho, notes };
}

function computeArrhythmia(answers: Record<string, string>) {
  let mwho: MWHOClass | null = null;
  const notes: string[] = [];
  if (answers.IsolatedEctopy === "yes") mwho = highestClass(mwho, "I");
  if (answers.SVTorPacemaker === "yes") mwho = highestClass(mwho, "II");

  if (answers.InheritedLowRisk === "yes") mwho = highestClass(mwho, "II–III");
  if (answers.InheritedHighRisk === "yes") mwho = highestClass(mwho, "III");
  if (answers.SustainedVT === "yes") mwho = highestClass(mwho, "III");

  return { mwho, notes };
}

function computeCoronaryOther(answers: Record<string, string>) {
  let mwho: MWHOClass | null = null;
  const notes: string[] = [];
  if (answers.SCAD === "yes") mwho = highestClass(mwho, "III");
  if (answers.PriorIschaemia === "yes") mwho = highestClass(mwho, "III");
  if (answers.PriorAPOhosp === "yes") mwho = highestClass(mwho, "III");
  if (answers.CancerTherapyCVtox === "yes") mwho = highestClass(mwho, "III");
  return { mwho, notes };
}

// --------------------------- UI Blocks per Group ---------------------------

function GroupQuestions({ group, answers, set }: { group: DiseaseGroup; answers: Record<string,string>; set: (k:string,v:string)=>void }) {
  const Row = ({children}:{children:React.ReactNode}) => <div className="grid grid-cols-1 gap-2 rounded-xl border p-3">{children}</div>;
  const Q = ({label, name, options}:{label:string; name:string; options:{label:string; value:string}[]}) => (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <RadioGroup value={answers[name]||""} onValueChange={(v)=>set(name,v)} className="mt-2">
        {options.map(o=> (
          <div key={o.value} className="flex items-center space-x-3 rounded-md border p-2">
            <RadioGroupItem id={⁠ ${name}-${o.value} ⁠} value={o.value} />
            <Label htmlFor={⁠ ${name}-${o.value} ⁠} className="text-sm">{o.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

  switch(group){
    case "Ventricular/PH/PPCM":
      return (
        <div className="space-y-3">
          <Row>
            <Q label="Pulmonary arterial hypertension (PAH)?" name="PAH" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
          <Row>
            <Q label="Left ventricular EF" name="LVEF" options={[{label:"< 30%", value:"<30%"},{label:"30–45%", value:"30–45%"},{label:"> 45%", value:">45%"}]} />
            <Q label="NYHA class" name="NYHA" options={[{label:"I/II", value:"I/II"},{label:"III/IV", value:"III/IV"}]} />
          </Row>
          <Row>
            <Q label="Right ventricle (sub‑pulmonary) function" name="RVfunction" options={[{label:"Normal/mild impairment", value:"none/mild"},{label:"Significantly impaired", value:"significant"}]} />
          </Row>
          <Row>
            <Q label="Peripartum cardiomyopathy (history)" name="PPCM" options={[{label:"No", value:"no"},{label:"≤ mild residual LV impairment", value:"≤ mild residual"},{label:"> mild residual LV impairment", value:"> mild residual"}]} />
          </Row>
        </div>
      );
    case "Cardiomyopathy":
      return (
        <div className="space-y-3">
          <Row>
            <Q label="HCM genotype+/phenotype−" name="HCMgenoPheno" options={[{label:"Yes", value:"+/−"},{label:"No", value:"other"}]} />
          </Row>
          <Row>
            <Q label="HCM complications" name="HCMcomp" options={[
              {label:"None of the below", value:"none"},
              {label:"Arrhythmic and/or moderate haemodynamic complications", value:"arrhythmic/moderate-hemodynamic"},
              {label:"Severe LVOT obstruction (≥50 mmHg) or EF <50% with symptoms", value:"severe-LVOT>=50-or-EF<50%"},
            ]} />
          </Row>
          <Row>
            <Q label="DCM/NDLVC — LV function" name="DCM_EF" options={[
              {label:"> 45% (normal/mild impairment)", value:">45%"},
              {label:"30–45% (moderate)", value:"30–45%"},
              {label:"< 30% or NYHA III/IV", value:"<30%/NYHAIII-IV"},
            ]} />
          </Row>
          <Row>
            <Q label="ARVC severity" name="ARVC" options={[{label:"Genotype+ with no/mild phenotype (low risk)", value:"low-risk"},{label:"Moderate/severe disease", value:"moderate/severe"},{label:"Not applicable", value:"na"}]} />
          </Row>
        </div>
      );
    case "Valvular":
      return (
        <div className="space-y-3">
          <Row>
            <Q label="Pulmonary stenosis" name="PS" options={[{label:"Small/mild", value:"small/mild"},{label:"Other/unknown", value:"other"}]} />
            <Q label="Mitral valve prolapse without significant regurgitation" name="MVP" options={[{label:"Yes", value:"no-sig-MR"},{label:"No/unknown", value:"other"}]} />
          </Row>
          <Row>
            <Q label="Mitral stenosis severity" name="MS" options={[{label:"None/mild", value:"none/mild"},{label:"Moderate", value:"moderate"},{label:"Severe", value:"severe"}]} />
            <Q label="Aortic stenosis severity" name="AS" options={[{label:"None/mild/moderate", value:"none/mild/moderate"},{label:"Severe asymptomatic", value:"severe-asymptomatic"},{label:"Severe symptomatic", value:"severe-symptomatic"}]} />
          </Row>
          <Row>
            <Q label="Left‑sided regurgitation (AR/MR)" name="LeftRegurg" options={[{label:"None/mild/moderate", value:"none/mild/moderate"},{label:"Severe", value:"severe"}]} />
          </Row>
          <Row>
            <Q label="Native/tissue valve (if not captured above)" name="NativeTissue" options={[{label:"Mild MS / Moderate AS / Moderate regurgitation", value:"mild-MS/mod-AS/mod-regurg"},{label:"Not applicable", value:"na"}]} />
            <Q label="Mechanical valve" name="MechanicalValve" options={[{label:"Uncomplicated & well‑controlled anticoagulation", value:"well-controlled"},{label:"Complicated/unstable", value:"unstable/complicated"},{label:"No", value:"no"}]} />
          </Row>
        </div>
      );
    case "Congenital":
      return (
        <div className="space-y-3">
          <Row>
            <Q label="Repaired simple lesions (ASD/VSD/PDA/APVD) without significant residual" name="SimpleRepaired" options={[{label:"Yes", value:"yes"},{label:"No/unknown", value:"no"}]} />
            <Q label="Unoperated uncomplicated ASD/VSD" name="ASDVSDunoperated" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
          <Row>
            <Q label="Repaired Tetralogy of Fallot — no significant residual/arrhythmias" name="ToFgood" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
            <Q label="TGA with arterial switch — no significant residual" name="TGAarterialSwitchGood" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
          <Row>
            <Q label="Repaired AVSD without significant residual" name="AVSDrepairedGood" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
            <Q label="Ebstein anomaly" name="Ebstein" options={[{label:"Uncomplicated (mild–moderate TR; no TS/AP)", value:"uncomplicated"},{label:"Any complication", value:"complicated"},{label:"Not applicable", value:"na"}]} />
          </Row>
          <Row>
            <Q label="Systemic RV function" name="SystemicRV" options={[{label:"Good/mildly decreased", value:"good/mildly↓"},{label:"Moderate/severely decreased", value:"moderate/severely↓"},{label:"Not applicable", value:"na"}]} />
            <Q label="Fontan circulation" name="Fontan" options={[{label:"Uncomplicated", value:"uncomplicated"},{label:"Any complication", value:"complicated"},{label:"Not applicable", value:"na"}]} />
          </Row>
          <Row>
            <Q label="Cyanotic CHD" name="Cyanotic" options={[{label:"Unrepaired (not Eisenmenger)", value:"unrepaired-non-eisenmenger"},{label:"Eisenmenger", value:"eisenmenger"},{label:"No", value:"no"}]} />
          </Row>
        </div>
      );
    case "Aortopathy":
      return (
        <div className="space-y-3">
          <Row>
            <Q label="Non‑HTAD mild aortic dilation < 40 mm" name="NonHTADlt40" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
            <Q label="Turner syndrome without CV features (BAV/CoA/HTN/dilation)" name="TurnerNoCVfeatures" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
          <Row>
            <Q label="HTAD no dilation OR BAV <45 mm OR repaired CoA" name="HTADnoDilation_or_BAVlt45_or_repairedCoA" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
            <Q label="Marfan/HTAD 40–45 mm" name="Marfan40to45" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
          <Row>
            <Q label="BAV 45–50 mm" name="BAV45to50" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
            <Q label="Turner ASI 20–25 mm²/m" name="TurnerASI20to25" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
          <Row>
            <Q label="Other aortic dilation < 50 mm" name="OtherAortaLt50" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
          <div className="grid grid-cols-1 gap-2 rounded-xl border p-3">
            <Label className="text-sm font-medium">Severe/high‑risk features</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Q label="> 45 mm in Marfan/HTAD" name="MarfanGt45" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
              <Q label="> 50 mm in BAV" name="BAVGt50" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
              <Q label="Turner ASI > 25 mm²/m" name="TurnerASIgt25" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
              <Q label="Severe (re)CoA / vEDS / prior dissection with growing diameter" name="SevereRecoA_or_vEDS_or_PriorDissectionGrowing" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
              <Q label="Prior dissection with stable diameter" name="PriorDissectionStable" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
            </div>
          </div>
        </div>
      );
    case "Arrhythmia":
      return (
        <div className="space-y-3">
          <Row>
            <Q label="Isolated atrial/ventricular ectopy" name="IsolatedEctopy" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
            <Q label="SVT or bradycardia requiring pacemaker" name="SVTorPacemaker" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
          <Row>
            <Q label="Inherited arrhythmia — low risk (e.g., LQTS with no prior events on full‑dose β‑blocker; well‑controlled CPVT; Brugada with no events)" name="InheritedLowRisk" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
            <Q label="Inherited arrhythmia — high risk (e.g., LQT2 postpartum; symptomatic CPVT/LQTS not controlled; Brugada/prior events)" name="InheritedHighRisk" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
          <Row>
            <Q label="Sustained VT of any aetiology" name="SustainedVT" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
        </div>
      );
    case "Coronary/Other":
      return (
        <div className="space-y-3">
          <Row>
            <Q label="Prior SCAD" name="SCAD" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
            <Q label="Prior ischaemic cardiac event (STEMI/NSTE‑ACS)" name="PriorIschaemia" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
          <Row>
            <Q label="Prior adverse pregnancy outcome requiring hospitalization" name="PriorAPOhosp" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
            <Q label="Prior adverse cardiovascular effects of cancer therapy" name="CancerTherapyCVtox" options={[{label:"Yes", value:"yes"},{label:"No", value:"no"}]} />
          </Row>
        </div>
      );
  }
}

// --------------------------- Main Component ---------------------------

export default function App() {
  const [group, setGroup] = useState<DiseaseGroup | null>(null);
  const [answers, setAnswers] = useState<Record<string,string>>({});

  const set = (k:string, v:string) => setAnswers(a=>({...a, [k]: v }));

  const computed = useMemo(()=>{
    if (!group) return { mwho: null as MWHOClass | null, notes: [] as string[] };
    switch(group){
      case "Ventricular/PH/PPCM": return computeVentricularPH(answers);
      case "Cardiomyopathy": return computeCardiomyopathy(answers);
      case "Valvular": return computeValvular(answers);
      case "Congenital": return computeCongenital(answers);
      case "Aortopathy": return computeAortopathy(answers);
      case "Arrhythmia": return computeArrhythmia(answers);
      case "Coronary/Other": return computeCoronaryOther(answers);
    }
  }, [group, answers]);

  const summary = useMemo(()=>{
    const mh = computed.mwho ? ⁠ mWHO ${computed.mwho} ⁠ : "–";
    const care = computed.mwho ? meaningByMWHO[computed.mwho].care : "";
    const del = computed.mwho ? meaningByMWHO[computed.mwho].delivery : "";
    const maternal = computed.mwho ? meaningByMWHO[computed.mwho].maternal : "";
    const fetal = computed.mwho ? meaningByMWHO[computed.mwho].fetal : "";
    const flags = computed.notes.length ? ⁠ Flags: ${computed.notes.join("; ")} ⁠ : "";
    return ⁠ Group: ${group ?? "–"}\nResult: ${mh}\nMaternal risk: ${maternal}\nFetal risk: ${fetal}\nCare level: ${care}\nDelivery guidance: ${del}\n${flags} ⁠.trim();
  }, [group, computed]);

  const onCopy = async () => {
    try { await navigator.clipboard.writeText(summary); } catch {}
  };

  const onReset = () => { setGroup(null); setAnswers({}); };

  const onPrint = () => { window.print(); };

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Interactive mWHO 2.0 Flowchart (ESC 2025)</h1>
        <p className="text-sm text-muted-foreground">Pick a disease group, answer the prompts, and get the mWHO class with risk meaning and management notes. If multiple criteria apply, the highest class prevails.</p>
      </header>

      {/* Step 1: Group selection */}
      <section className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="secondary">Step 1</Badge>
          <h2 className="font-semibold">Choose disease group</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(["Ventricular/PH/PPCM","Cardiomyopathy","Valvular","Congenital","Aortopathy","Arrhythmia","Coronary/Other"] as DiseaseGroup[]).map(g => (
            <button
              key={g}
              onClick={()=> setGroup(g)}
              className={⁠ rounded-2xl border p-4 text-left transition hover:shadow ${group===g?"border-primary ring-2 ring-primary/30":""} ⁠}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{g}</span>
                <ChevronRight className="h-5 w-5" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{g==="Ventricular/PH/PPCM"?"LV/RV, PAH, PPCM":""}{g==="Cardiomyopathy"?"HCM, DCM/NDLVC, ARVC":""}{g==="Valvular"?"Stenosis/regurgitation, mechanical valve":""}{g==="Congenital"?"Repaired/unrepaired, Fontan, systemic RV":""}{g==="Aortopathy"?"Marfan/HTAD, BAV, Turner":""}{g==="Arrhythmia"?"SVT, LQTS/CPVT, VT":""}{g==="Coronary/Other"?"SCAD, prior MI, APO, cardiotox":""}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: Group questions */}
      {group && (
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">Step 2</Badge>
            <h2 className="font-semibold">Answer {group} questions</h2>
          </div>
          <Card className="rounded-2xl">
            <CardContent className="p-4 md:p-6">
              <GroupQuestions group={group} answers={answers} set={set} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Step 3: Result */}
      {group && (
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">Step 3</Badge>
            <h2 className="font-semibold">Result</h2>
          </div>
          <Card className="rounded-2xl">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <MWHOChip mwho={computed.mwho} />
                {computed.mwho ? (
                  <div className="inline-flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4"/> Computed from your inputs</div>
                ) : (
                  <div className="inline-flex items-center gap-2 text-amber-700"><AlertTriangle className="h-4 w-4"/> Insufficient inputs</div>
                )}
              </div>

              {computed.mwho && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border p-3">
                    <h3 className="font-semibold mb-1">Maternal risk meaning</h3>
                    <p className="text-sm text-muted-foreground">{meaningByMWHO[computed.mwho].maternal}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <h3 className="font-semibold mb-1">Fetal/obstetric risk</h3>
                    <p className="text-sm text-muted-foreground">{meaningByMWHO[computed.mwho].fetal}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <h3 className="font-semibold mb-1">Care level / management</h3>
                    <p className="text-sm text-muted-foreground">{meaningByMWHO[computed.mwho].care}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <h3 className="font-semibold mb-1">Mode of delivery — guidance</h3>
                    <p className="text-sm text-muted-foreground">{meaningByMWHO[computed.mwho].delivery}</p>
                  </div>
                </div>
              )}

              {computed.notes.length > 0 && (
                <div className="rounded-xl border p-3">
                  <h3 className="font-semibold mb-1">Important flags</h3>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {computed.notes.map((n,i)=>(<li key={i}>{n}</li>))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={onCopy}><Copy className="mr-2 h-4 w-4"/>Copy summary</Button>
                <Button variant="secondary" onClick={onPrint}><Printer className="mr-2 h-4 w-4"/>Print</Button>
                <Button variant="outline" onClick={onReset}><RefreshCw className="mr-2 h-4 w-4"/>Reset</Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-8 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4"/>
          <p>
            This decision aid summarizes the ESC 2025 pregnancy & CVD guideline (mWHO 2.0 examples). It is not a substitute for clinical judgement. Thresholds and special situations (e.g., anticoagulation for mechanical valves, severe aortopathy sizes, pulmonary hypertension phenotypes) require guideline consultation and expert input. If multiple criteria apply, the highest class should be used.
          </p>
        </div>
      </footer>
    </div>
  );
}
